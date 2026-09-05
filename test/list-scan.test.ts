import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandInput } from '../src/compat/command-input.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { ListLocals } from '../src/game/list-state.ts';
import { scanListGroup, UnresolvedListExecution } from '../src/game/list-scan.ts';
import type { ListScanServices } from '../src/game/list-scan.ts';
import { list } from '../src/game/list.ts';
import { updateListSelection } from '../src/game/list-update.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';

const bits = (...values: number[]) => values.reduce((result, value) => result | BigInt(value), 0n);
function fixture(line = 'LIST', cmd: number = K.LSTCMD) {
  const input = new CommandInput(), out = new TerminalOutput(), s = new ListLocals();
  input.acceptLine(line); input.acquire(out); s.cmd = cmd; s.p = 1; s.team = 1;
  return { input, out, s, ctx: { who: 1, team: 1, password: false } };
}
function scan(f: ReturnType<typeof fixture>, io?: Partial<ListScanServices>) {
  return scanListGroup(f.ctx, f.input, f.s, f.out, io);
}

const defaults = [
  [K.LSTCMD, bits(K.SHPBIT, K.BASBIT, K.PLNBIT), bits(K.FEDBIT, K.EMPBIT, K.NEUBIT, K.ROMBIT), bits(K.LSTBIT), BigInt(K.MAXINT)],
  [K.SUMCMD, bits(K.SHPBIT, K.BASBIT, K.PLNBIT), bits(K.FEDBIT, K.EMPBIT, K.NEUBIT, K.ROMBIT), bits(K.SUMBIT), BigInt(K.MAXINT)],
  [K.BASCMD, bits(K.BASBIT), bits(K.FEDBIT), bits(K.LSTBIT, K.SUMBIT), BigInt(K.MAXINT)],
  [K.PLNCMD, bits(K.PLNBIT), bits(K.FEDBIT, K.EMPBIT, K.NEUBIT), bits(K.LSTBIT), BigInt(K.KRANGE)],
  [K.TARCMD, bits(K.SHPBIT, K.BASBIT, K.PLNBIT), bits(K.EMPBIT, K.ROMBIT), bits(K.LSTBIT), BigInt(K.KRANGE)],
] as const;
for (const [cmd, omask, smask, lmask, range] of defaults) test(`LSTSCN command ${cmd} uses source defaults with no automatic lone-command summary`, () => {
  const f = fixture('COMMAND', cmd); Object.assign(f.s, { imask: 999n, ships: 999n, vpos: 70, hpos: 70 });
  assert.equal(scan(f), false);
  assert.deepEqual([f.s.omask, f.s.smask, f.s.lmask, f.s.range], [omask, smask, lmask, range]);
  assert.deepEqual([f.s.imask, f.s.ships, f.s.vpos, f.s.hpos, f.s.p], [0n, 0n, 0, 0, 2]); assert.equal(f.out.drain(), '');
});

test('LSTSCN invalid computed-GOTO command falls through to LIST defaults', () => {
  const f = fixture('UNKNOWN', 7); assert.equal(scan(f), false);
  assert.equal(f.s.lmask, BigInt(K.LSTBIT)); assert.equal(f.s.range, BigInt(K.MAXINT));
});

test('LSTSCN AND prefixes and ampersands end a group and retain their token pointer', () => {
  const f = fixture('LIST SHIPS AN PLANETS & BASES');
  assert.equal(scan(f), false); assert.equal(f.s.p, 3); assert.equal(f.s.omask, BigInt(K.SHPBIT));
  assert.equal(scan(f), false); assert.equal(f.s.p, 5); assert.equal(f.s.omask, BigInt(K.PLNBIT));
  assert.equal(scan(f), false); assert.equal(f.s.p, 7); assert.equal(f.s.omask, BigInt(K.BASBIT));
});

test('LSTSCN allows a first empty group but reports subsequent empty/trailing groups', () => {
  for (const line of ['LIST AND', 'LIST & &']) {
    const f = fixture(line); assert.equal(scan(f), false); assert.equal(f.s.p, 2);
    assert.equal(scan(f), true); assert.equal(f.out.drain(), 'Null group illegal\r\n');
  }
});

test('LSTSCN distinguishes illegal keyword from syntax errors and OUTW emits only the stored five characters', () => {
  for (const [line, expected] of [
    ['LIST NONSENSE', 'Illegal keyword NONSE\r\n'],
    ['LIST SHIPS BASES', 'Syntax error near keyword BASES\r\n'],
    ['LIST +', 'Illegal keyword +\r\n'],
    ['SUMMARY CLOSEST', 'Illegal keyword CLOSE\r\n'],
  ]) {
    const f = fixture(line, line.startsWith('SUMMARY') ? K.SUMCMD : K.LSTCMD);
    assert.equal(scan(f), true); assert.equal(f.out.drain(), expected);
  }
});

test('LSTSCN keyword order picks ships before summary, planets before ports, and enemy before empire', () => {
  for (const [line, mask, side] of [
    ['LIST SH', K.SHPBIT, bits(K.FEDBIT, K.EMPBIT, K.ROMBIT)],
    ['LIST P', K.PLNBIT, bits(K.FEDBIT, K.EMPBIT, K.NEUBIT)],
    ['LIST E', K.SHPBIT | K.BASBIT | K.PLNBIT, bits(K.EMPBIT, K.ROMBIT)],
  ] as const) {
    const f = fixture(line); assert.equal(scan(f), false); assert.equal(f.s.omask, BigInt(mask)); assert.equal(f.s.smask, side);
  }
  const name = fixture('LIST S'); assert.equal(scan(name, { implicitShipWord: () => 0n }), false);
  assert.equal(name.s.ships, 4n); // Savannah is checked before SHIPS/SUMMARY.
});

test('LSTSCN named ships read implicit SHIP separately from accumulated SHIPS, retaining repeats', () => {
  const f = fixture('LIST L L WOLF'); let reads = 0;
  assert.equal(scan(f, { implicitShipWord() { reads++; return 0n; } }), false);
  assert.equal(reads, 3); assert.equal(f.s.ships, 513n); assert.equal(f.s.imask, BigInt(K.NAMBIT));
  const fail = fixture('LIST LEXINGTON');
  assert.equal(scan(fail, { implicitShipWord: () => 1n }), true);
  assert.equal(fail.s.imask, BigInt(K.NAMBIT)); assert.equal(fail.s.ships, 0n);
  assert.equal(fail.out.drain(), 'Syntax error near keyword LEXIN\r\n');
  const unresolved = fixture('LIST LEXINGTON');
  assert.throws(() => scan(unresolved), UnresolvedListExecution);
  assert.equal(unresolved.s.imask, BigInt(K.NAMBIT)); assert.equal(unresolved.out.drain(), '');
});

test('LSTSCN ship-name and modifier conflicts are asymmetric, and ROMULAN has its own repeat check', () => {
  for (const [line, result] of [['LIST LEXINGTON 9', false], ['LIST 9 LEXINGTON', true],
    ['LIST SHIPS ROMULAN', false], ['LIST ROMULAN SHIPS', true], ['LIST ROMULAN ROM', true]] as const) {
    const f = fixture(line); assert.equal(scan(f, { implicitShipWord: () => 0n }), result, line);
  }
});

test('LSTSCN range and coordinate disambiguation uses adjacent integer types and absolute coordinates', () => {
  const f = fixture('LIST 12 25'); f.s.svpos = 70; f.s.shpos = 70;
  assert.equal(scan(f), false); assert.equal(f.s.imask, BigInt(K.CRDBIT));
  assert.deepEqual([f.s.vpos, f.s.hpos, f.s.p], [12, 25, 4]);
  const range = fixture('LIST 12'); assert.equal(scan(range), false); assert.equal(range.s.range, 12n);
  assert.equal(range.s.imask, BigInt(K.RNGBIT));
  const bad = fixture('LIST 76 -2'); assert.equal(scan(bad), true);
  assert.equal(bad.out.drain(), 'Illegal coordinate 76--2\r\n'); assert.equal(bad.s.p, 3);
});

test('LSTSCN retains invalid range assignment and rejects coordinate conflicts before coordinate writes', () => {
  const f = fixture('LIST -2'); assert.equal(scan(f), true); assert.equal(f.s.range, -2n);
  assert.equal(f.s.imask, BigInt(K.RNGBIT)); assert.equal(f.out.drain(), 'Syntax error near keyword -2\r\n');
  for (const [line, cmd] of [['LIST ALL 2 3', K.LSTCMD], ['SUMMARY 2 3', K.SUMCMD]] as const) {
    const bad = fixture(line, cmd); assert.equal(scan(bad), true); assert.equal(bad.s.vpos, 0);
    assert.equal(bad.out.drain(), 'Syntax error near keyword 2\r\n');
  }
});

test('LSTSCN side aliases preserve ROMBIT and use team for friendly/enemy', () => {
  for (const team of [1, 2]) {
    for (const keyword of ['FRIENDLY', 'ENEMY', 'TARGETS', 'FEDERATION', 'HUMAN', 'EMPIRE', 'KLINGON']) {
      const f = fixture('LIST ' + keyword); f.ctx.team = team; assert.equal(scan(f), false);
      const side = keyword === 'FRIENDLY' ? team : keyword === 'ENEMY' || keyword === 'TARGETS' ? 3 - team
        : keyword === 'FEDERATION' || keyword === 'HUMAN' ? 1 : 2;
      assert.equal(f.s.smask, bits(side === 1 ? K.FEDBIT : K.EMPBIT, keyword === 'FRIENDLY' ? 0 : K.ROMBIT));
    }
  }
  const bad = fixture('LIST FEDERATION FRIENDLY'); assert.equal(scan(bad), true);
  assert.equal(bad.s.smask, BigInt(K.FEDBIT)); // Removed ROMBIT before detecting duplicate side.
});

test('LSTSCN neutral/captured/ports interactions preserve source object selection', () => {
  for (const [line, object, side] of [
    ['LIST PORTS', bits(K.BASBIT, K.PLNBIT), bits(K.FEDBIT, K.NEUBIT)],
    ['LIST NEUTRAL PORTS', bits(K.PLNBIT), bits(K.NEUBIT)],
    ['LIST PLANETS CAPTURED', bits(K.PLNBIT), bits(K.FEDBIT, K.EMPBIT)],
    ['LIST ENEMY PORTS', bits(K.BASBIT, K.PLNBIT), bits(K.EMPBIT)],
  ] as const) {
    const f = fixture(line); assert.equal(scan(f), false); assert.equal(f.s.omask, object); assert.equal(f.s.smask, side);
  }
  for (const line of ['LIST SHIPS NEUTRAL', 'LIST CAPTURED BASES']) assert.equal(scan(fixture(line)), true);
});

test('LSTSCN ALL expands the sides after object selection except for TARGETS, retaining explicit range', () => {
  const f = fixture('LIST SHIPS ALL 9'); assert.equal(scan(f), false);
  assert.equal(f.s.smask, bits(K.FEDBIT, K.EMPBIT, K.NEUBIT, K.ROMBIT)); assert.equal(f.s.range, 9n);
  const t = fixture('TARGETS ALL', K.TARCMD); assert.equal(scan(t), false);
  assert.equal(t.s.smask, bits(K.EMPBIT, K.ROMBIT)); assert.equal(t.s.range, BigInt(K.MAXINT));
  const explicit = fixture('LIST 9 ALL'); assert.equal(scan(explicit), false); assert.equal(explicit.s.range, 9n);
});

test('LSTSCN output modifiers use entry-specific legality and reject a second modifier', () => {
  for (const [line, cmd, lmask] of [
    ['LIST SUMMARY', K.LSTCMD, bits(K.LSTBIT, K.SUMBIT)],
    ['BASES LIST', K.BASCMD, bits(K.LSTBIT)],
    ['BASES SUMMARY', K.BASCMD, bits(K.SUMBIT)],
    ['PLANETS SUMMARY 8', K.PLNCMD, bits(K.SUMBIT)],
  ] as const) { const f = fixture(line, cmd); assert.equal(scan(f), false); assert.equal(f.s.lmask, lmask); }
  for (const [line, cmd] of [['LIST LIST', K.LSTCMD], ['SUMMARY SUMMARY', K.SUMCMD],
    ['BASES LIST SUMMARY', K.BASCMD], ['PLANETS CLOSEST SUMMARY', K.PLNCMD]] as const) {
    assert.equal(scan(fixture(line, cmd)), true, line);
  }
});

test('LSTSCN targets disallow side modifiers and bases disallow object/name/neutral modifiers', () => {
  for (const [line, cmd] of [['TARGETS FRIENDLY', K.TARCMD], ['TARGETS CAPTURED', K.TARCMD],
    ['BASES SHIPS', K.BASCMD], ['BASES LEXINGTON', K.BASCMD], ['BASES NEUTRAL', K.BASCMD]] as const) {
    const f = fixture(line, cmd); assert.equal(scan(f), true); assert.ok(f.out.drain().startsWith('Illegal keyword '));
  }
});

test('LSTSCN pre-game rejects relative selections but accepts absolute coordinates and explicit sides', () => {
  for (const line of ['LIST PORTS', 'LIST FRIENDLY', 'LIST ENEMY', 'LIST 9', 'LIST CLOSEST']) {
    const f = fixture(line); f.ctx.who = 0; assert.equal(scan(f), true, line);
  }
  for (const line of ['LIST 12 25', 'LIST FEDERATION']) {
    const f = fixture(line); f.ctx.who = 0; assert.equal(scan(f), false, line);
  }
});

test('LSTSCN CLOSEST controls listing/range without overriding an explicit numeric range', () => {
  for (const [line, range] of [['PLANETS CLOSEST', BigInt(K.MAXINT)], ['PLANETS 8 CLOSEST', 8n], ['PLANETS CLOSEST 8', 8n]] as const) {
    const f = fixture(line, K.PLNCMD); assert.equal(scan(f), false); assert.equal(f.s.range, range);
    assert.equal(f.s.lmask, BigInt(K.LSTBIT)); assert.ok((f.s.imask & BigInt(K.CLSBIT)) !== 0n);
  }
});

test('LSTSCN reads token storage beyond NTOK and bounds-checks P before reading a new token', () => {
  const f = fixture('LIST SHIPS'); f.input.ntok = 0; assert.equal(scan(f), false); assert.equal(f.s.omask, BigInt(K.SHPBIT));
  f.s.p = K.KMAXTK; assert.equal(scan(f), true); assert.equal(f.s.p, K.KMAXTK + 1); assert.equal(f.out.drain(), '');
});

test('LSTSCN last-slot lookahead is an explicit compiler dependency even for noninteger current tokens', () => {
  const f = fixture(); f.s.p = 14; Object.assign(f.input.tokens[14], { text: 'ALL', type: K.KALF });
  assert.throws(() => scan(f), UnresolvedListExecution); assert.equal(f.s.p, 15);
  f.s.p = 14;
  assert.equal(scan(f, { coordinateLookahead(type, slot) { assert.equal(type, K.KALF); assert.equal(slot, 16); return false; } }), true);
  assert.equal(f.s.p, 16); assert.equal(f.s.imask, BigInt(K.ALLBIT)); assert.equal(f.out.drain(), '');
});

test('LSTSCN last-slot coordinate reads VALLST beyond bounds before incrementing P and returning silently', () => {
  const f = fixture(); f.s.p = 14; Object.assign(f.input.tokens[14], { text: '12', type: K.KINT, value: 12n });
  assert.equal(scan(f, { coordinateLookahead: () => true, coordinateValue(slot) { assert.equal(slot, 16); return 25n; } }), true);
  assert.deepEqual([f.s.vpos, f.s.hpos, f.s.p], [12, 25, 16]); assert.equal(f.out.drain(), '');
});

test('LIST output storage follows LSTVAR column-major order, wraps writes and preserves references through reset', () => {
  const s = new ListLocals(); assert.equal(s.outputWords.length, 108);
  s.baslst[1][10].value = 55n; s.baslst[2][1].value = 66n;
  assert.deepEqual(s.outputWords.slice(29, 31), [55n, 66n]);
  s.pxf[0].value = 77n; assert.equal(s.outputWords[103], 77n);
  s.targetFlags.value = 1n << 36n; assert.equal(s.txf, 0n);
  s.txf = 88n; assert.equal(s.outputWords[106], 88n);
  const ref = s.shplst[1]; ref.value = 99n; s.cmd = K.TARCMD; s.xf = 123n;
  s.clearOutput(); assert.equal(ref.value, 0n); assert.equal(s.cmd, K.TARCMD); assert.equal(s.xf, 123n);
});

test('LIST driver resets markers and output before the required position read while preserving traversal locals', () => {
  const f = fixture(); f.ctx.who = 0; f.s.outputWords.fill(-1n); f.s.xf = 123n; let flagCalls = 0, outputs = 0;
  const count = list(f.ctx, K.BASCMD, f.input, f.s, f.out, {
    ownPosition(who) { assert.equal(who, 0); assert.ok(f.s.outputWords.every(w => w === 0n)); assert.equal(f.s.xf, 123n);
      assert.equal(f.s.cmd, K.BASCMD); return { v: 12, h: 25 }; },
    flagGroup(s) { flagCalls++; assert.deepEqual([s.svpos, s.shpos], [12, 25]); return false; },
    outputSelected() { outputs++; },
  });
  assert.equal(count, 1); assert.equal(flagCalls, 1); assert.equal(outputs, 1); assert.equal(f.out.drain(), '\r\n');
});

test('LIST driver LSTFLG alternate return continues with next group and does not count it', () => {
  const f = fixture('LIST SHIPS AND BASES'); const seen: bigint[] = []; let outputs = 0;
  assert.equal(list(f.ctx, K.LSTCMD, f.input, f.s, f.out, {
    ownPosition: () => ({ v: 1, h: 1 }), flagGroup(s) { seen.push(s.omask); return s.omask === BigInt(K.SHPBIT); },
    outputSelected() { outputs++; },
  }), 1);
  assert.deepEqual(seen, [BigInt(K.SHPBIT), BigInt(K.BASBIT)]); assert.equal(outputs, 1);
});

test('LIST driver syntax error after a selected group aborts final output and retains prior selection words', () => {
  const f = fixture('LIST SHIPS AND NOPE'); let groups = 0;
  const n = list(f.ctx, K.LSTCMD, f.input, f.s, f.out, {
    ownPosition: () => ({ v: 1, h: 1 }), flagGroup(s) { groups++; s.shplst[1].value = 55n; return false; },
    outputSelected() { assert.fail('No deferred output after scanner alternate return'); },
  });
  assert.equal(n, 1); assert.equal(groups, 1); assert.equal(f.s.shplst[1].value, 55n);
  assert.equal(f.out.drain(), '\r\nIllegal keyword NOPE\r\n');
});

test('LIST driver empty command and all failed groups never call LSTOUT', () => {
  for (const line of ['', 'LIST SHIPS AND BASES']) {
    const f = fixture(line);
    assert.equal(list(f.ctx, K.LSTCMD, f.input, f.s, f.out, {
      ownPosition: () => ({ v: 1, h: 1 }), flagGroup: () => true, outputSelected() { assert.fail(); },
    }), 0);
  }
});

test('LIST dispatch composes parser and actual LSTUPD across repeated groups without consuming a turn', () => {
  const f = fixture('LIST SHIPS AND SHIPS'); const ctx = { ...f.ctx, player: -1n, ptime: 42n, shared: { players: [] } };
  const command = dispatchCommand(ctx, 10, {
    *getcmd() { assert.fail(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
    *finishTurn() { assert.fail('LIST is informational'); }, movementContinuation() { assert.fail(); },
    *invoke(call) {
      assert.equal(call.routine, 'list');
      list(f.ctx, K.LSTCMD, f.input, f.s, f.out, {
        ownPosition: () => ({ v: 1, h: 1 }),
        flagGroup(s) { // Explicit one-object traversal fixture; LSTFLG is still pending.
          s.vpos = 2; s.hpos = 2; s.side = 1; s.gxf = s.lmask | BigInt(K.IGMBIT);
          updateListSelection(s, s.shplst[1], s.shpctr[1], { value: 0n }, s.sxf[1]); return false;
        },
        outputSelected(s) { assert.equal(s.shpctr[1].value, 2n); assert.equal(s.shplst[1].value, bits(K.LSTBIT, K.IGMBIT)); },
      });
    },
  });
  assert.equal(command.next().done, true); assert.equal(ctx.ptime, 42n);
});
