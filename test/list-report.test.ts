import test from 'node:test';
import assert from 'node:assert/strict';
import { PackedBoard } from '../src/compat/board.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { playerSlots } from '../src/game/player.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { ListLocals } from '../src/game/list-state.ts';
import { flagListGroup } from '../src/game/list-flags.ts';
import { listObject, listSummary, outputList } from '../src/game/list-report.ts';
import { listCommand } from '../src/game/list.ts';
import { listLiterals } from '../src/game/list-world.ts';
import type { ListRuntime, ListWorld } from '../src/game/list-world.ts';
import { sourceFile } from '../tools/source.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { UnresolvedListExecution } from '../src/game/list-scan.ts';

const bits = (...values: number[]) => values.reduce((a, b) => a | BigInt(b), 0n);
function fixture(line = 'LIST', cmd: number = K.LSTCMD) {
  const players = playerSlots(); Object.assign(players[1].ship, { v: 10, h: 10 });
  const w: ListWorld = { players, board: new PackedBoard(),
    bases: Array.from({ length: 3 }, () => Array.from({ length: K.KNBASE + 1 }, () => ({ v: 0, h: 0, strength: 0n, scanned: 0n }))),
    planets: Array.from({ length: K.KNPLNT + 1 }, () => ({ v: 0, h: 0, builds: 0n, scanned: 0n })),
    nplnet: 0, rom: 0n, romopt: -1n, erom: 875n, locr: { v: 13, h: 13 } };
  const ctx = { who: 1, team: 1, password: false, oflg: 0, ocflg: K.KABS as number };
  const s = new ListLocals(), out = new TerminalOutput(), input = new CommandInput();
  Object.assign(s, { team: 1, svpos: 10, shpos: 10, cmd, omask: bits(K.SHPBIT, K.BASBIT, K.PLNBIT),
    smask: bits(K.FEDBIT, K.EMPBIT, K.ROMBIT, K.NEUBIT), lmask: BigInt(K.LSTBIT), range: BigInt(K.MAXINT) });
  const io: ListRuntime = { logical: word => word < 0n, ownPosition: who => ({ v: players[who].ship.v, h: players[who].ship.h }),
    literal: key => listLiterals[key].text, dummy: { value: 0n }, implicitShipWord: () => 0n };
  // Explicit compiler fixture: negative LOGICAL true, unassigned locals zero,
  // and unpadded, terminated literal bytes. No production compiler policy.
  input.acceptLine(line); input.acquire(out);
  const ship = (index: number, v: number, h: number) => {
    players[index].alive = -1n; Object.assign(players[index].ship, { v, h });
    w.board.setdsp(v, h, (index <= 5 ? 100 : 200) + index);
  };
  const base = (side: number, index: number, v: number, h: number, scanned = 0n) => {
    Object.assign(w.bases[side][index], { v, h, strength: 900n, scanned }); w.board.setdsp(v, h, (side + 2) * 100 + index);
  };
  const planet = (side: number, index: number, v: number, h: number, scanned = 0n) => {
    Object.assign(w.planets[index], { v, h, builds: 2n, scanned }); w.nplnet = Math.max(w.nplnet, index);
    w.board.setdsp(v, h, (side + 6) * 100 + index);
  };
  const run = () => listCommand(ctx, cmd, input, s, w, out, io);
  const flag = () => flagListGroup(ctx, w, s, out, io);
  return { ctx, w, s, out, input, io, ship, base, planet, run, flag };
}

test('LIST literal adapter keys retain exact literal spellings found in the supplied routines', () => {
  for (const { file, text } of Object.values(listLiterals)) assert.ok(sourceFile(file).includes("'" + text + "'"));
});

for (const oflg of [-1, 0, 1]) test(`LSTOBJ ship output at verbosity ${oflg} retains enemy marker, coordinate widths and signed shield percentage`, () => {
  const f = fixture(); f.ctx.oflg = oflg; f.ship(6, 12, 25); f.w.players[6].ship.shieldCondition = -1n;
  Object.assign(f.s, { side: 2, code: 206, object: 2, index: 6, vpos: 12, hpos: 25 });
  listObject(f.ctx, f.w, f.s, f.out, f.io);
  assert.equal(f.out.drain(), oflg < 0 ? '*C  12-25  -100\r\n'
    : oflg === 0 ? '*C  @12-25  -100.0%\r\n' : '*Cobra       @12-25  -100.0%\r\n');
});

test('LSTOBJ TARGETS suppresses the enemy marker and OSFLT preserves negative zero', () => {
  const f = fixture(); f.ship(6, 12, 25); f.w.players[6].ship.shieldStrength = 0n;
  Object.assign(f.s, { cmd: K.TARCMD, side: 2, code: 206, object: 2, index: 6, vpos: 12, hpos: 25 });
  listObject(f.ctx, f.w, f.s, f.out, f.io); assert.equal(f.out.drain(), ' C  @12-25    -0.0%\r\n');
});

test('LSTOBJ distant ship skips coordinates while distant base retains coordinates and suppresses percentage', () => {
  const f = fixture(); Object.assign(f.s, { side: 2, code: 206, object: 2, index: 6, vpos: 40, hpos: 40, xf: BigInt(K.ORNBIT) });
  f.io.ownPosition = () => { assert.fail('Distant ship has no PRLOC'); };
  listObject(f.ctx, f.w, f.s, f.out, f.io); assert.equal(f.out.drain(), '*C  out of range\r\n');
  f.io.ownPosition = () => ({ v: 10, h: 10 }); f.s.object = 4; f.s.code = 401; f.s.index = 1;
  listObject(f.ctx, f.w, f.s, f.out, f.io); assert.equal(f.out.drain(), '*)( @40-40\r\n');
});

test('LSTOBJ planets print build counts even when distant and choose singular/plural suffixes by verbosity', () => {
  const f = fixture(); f.planet(0, 1, 12, 25);
  Object.assign(f.s, { side: 0, code: 601, object: 6, index: 1, vpos: 12, hpos: 25, xf: BigInt(K.ORNBIT) });
  for (const [oflg, builds, expected] of [
    [-1, 2n, '  @ 12-25     2\r\n'], [0, 2n, '  @ @12-25     2 b\r\n'],
    [1, 2n, ' Neu planet  @12-25     2 builds\r\n'], [1, 1n, ' Neu planet  @12-25     1 build\r\n'],
    [0, 0n, '  @ @12-25\r\n'],
  ] as const) {
    f.ctx.oflg = oflg; f.w.planets[1].builds = builds; listObject(f.ctx, f.w, f.s, f.out, f.io); assert.equal(f.out.drain(), expected);
  }
});

test('LSTOBJ empty space, star, black hole and sentinel fall through to EROM formatting using stale XF', () => {
  const f = fixture(); Object.assign(f.s, { side: 0, vpos: 11, hpos: 12 });
  for (const [code, object, prefix] of [[0, 0, ' .  '], [900, 9, ' *  '], [1000, 10, ' BH '], [-1, 0, ' .  ']] as const) {
    f.s.code = code; f.s.object = object; listObject(f.ctx, f.w, f.s, f.out, f.io);
    assert.equal(f.out.drain(), prefix + '@11-12    87.5%\r\n');
  }
  f.s.xf = BigInt(K.ORNBIT); listObject(f.ctx, f.w, f.s, f.out, f.io); assert.equal(f.out.drain(), ' .  out of range\r\n');
});

test('LSTOBJ coordinate formatting reads current own position and base range flag after PRLOC output', () => {
  const f = fixture(); f.base(1, 1, 12, 25); f.ctx.ocflg = K.KREL;
  Object.assign(f.s, { side: 1, code: 301, object: 3, index: 1, vpos: 12, hpos: 25, svpos: 50, shpos: 50 });
  f.io.ownPosition = () => { f.s.xf = BigInt(K.ORNBIT); return { v: 11, h: 20 }; };
  listObject(f.ctx, f.w, f.s, f.out, f.io); assert.equal(f.out.drain(), ' <>  +1, +5\r\n');
});

test('LSTSUM formats count/known/range precedence, clears the referenced count, and suppresses zero without output', () => {
  for (const oflg of [-1, 0, 1]) {
    const out = new TerminalOutput(), n = { value: 2n }, flags = { value: bits(K.KNOBIT, K.ISRBIT, K.IGMBIT) };
    listSummary({ oflg }, n, () => 'base', flags, out);
    assert.equal(out.drain(), '  2 known bases' + (oflg < 0 ? '' : ' in game') + '\r\n'); assert.equal(n.value, 0n);
    listSummary({ oflg }, n, () => { assert.fail(); }, flags, out); assert.equal(out.drain(), '');
  }
});

test('LSTSUM reads N and flags after output, supports aliases and delays clearing until CRLF completes', () => {
  const out = new TerminalOutput(), n = { value: 1n };
  const write = out.write.bind(out);
  out.write = text => { write(text); if (text === '  1') n.value = bits(K.KNOBIT, K.IGMBIT); if (text === '\r\n') assert.notEqual(n.value, 0n); };
  listSummary({ oflg: 0 }, n, () => 'base', n, out);
  assert.equal(out.drain(), '  1 known bases in game\r\n'); assert.equal(n.value, 0n);
});

test('LSTSUM honors literal byte padding rather than trimming before pluralization', () => {
  const out = new TerminalOutput(); listSummary({ oflg: 0 }, { value: 2n }, () => 'Romulan   ', { value: 0n }, out);
  assert.equal(out.drain(), '  2 Romulan   s in range\r\n');
});

test('LSTFLG traverses live ships, positive-strength bases and planet sides in physical order', () => {
  const f = fixture(); f.ship(1, 10, 10); f.ship(6, 15, 15); f.ship(7, 16, 16); f.w.board.setdsp(16, 16, 0);
  f.base(1, 1, 12, 12); f.base(2, 2, 13, 13); f.planet(0, 1, 14, 14); f.planet(2, 2, 17, 17);
  assert.equal(f.flag(), false);
  assert.deepEqual(f.s.shpctr.slice(1).map(x => x.value), [1n, 1n]); assert.equal(f.s.shplst[7].value, 0n);
  assert.deepEqual(f.s.basctr.slice(1).map(x => x.value), [1n, 1n]); assert.equal(f.s.plnctr.value, 2n);
  assert.equal(f.s.pxf[0].value, bits(K.IGMBIT, K.LSTBIT)); assert.equal(f.out.drain(), '');
});

test('LSTFLG reads TEAM and PASFLG from current session inputs before calling LSTUPD', () => {
  for (const privileged of [false, true]) {
    const f = fixture(); f.base(2, 1, 40, 40); f.s.omask = BigInt(K.BASBIT);
    f.ctx.team = privileged ? 1 : 2; f.ctx.password = privileged;
    assert.equal(f.flag(), false); assert.equal(f.s.basctr[2].value, 1n);
    assert.equal(f.s.baslst[2][1].value & BigInt(K.PASBIT), privileged ? BigInt(K.PASBIT) : 0n);
  }
});

test('LSTFLG entire-game ships get synthetic scan bits, but closest distant enemies do not', () => {
  const f = fixture(); f.ship(6, 40, 40); f.s.omask = BigInt(K.SHPBIT); f.s.smask = bits(K.EMPBIT, K.ROMBIT);
  assert.equal(f.flag(), false); assert.equal(f.s.shpctr[2].value, 1n); assert.ok((f.s.shplst[6].value & BigInt(K.ORNBIT)) !== 0n);
  f.s.clearOutput(); f.s.imask = BigInt(K.CLSBIT); assert.equal(f.flag(), true);
  assert.equal(f.s.clsest, BigInt(K.MAXINT)); assert.equal(f.s.shpctr[2].value, 0n);
  assert.equal(f.out.drain(), 'No known enemy ships in game\r\n');
});

test('LSTFLG closest excludes self and later base/planet ties win before rereading the selected coordinate', () => {
  const f = fixture(); f.ship(1, 10, 10); f.ship(2, 12, 10); f.base(1, 1, 10, 12); f.planet(0, 1, 8, 10);
  f.s.imask = BigInt(K.CLSBIT); assert.equal(f.flag(), false);
  assert.deepEqual([f.s.vposc, f.s.hposc, f.s.clsest, f.s.code], [8, 10, 2n, 601]);
  assert.equal(f.s.imask & BigInt(K.CLSBIT), 0n); assert.equal(f.s.plnctr.value, 0n);
  assert.equal(f.out.drain(), '  @ @ 8-10     2 b\r\n');
});

test('LSTFLG coordinate base/planet mismatch reports LONG location regardless of verbosity', () => {
  const f = fixture(); f.planet(0, 1, 12, 12); f.ctx.oflg = K.SHORT; f.ctx.ocflg = K.KREL;
  Object.assign(f.s, { imask: BigInt(K.CRDBIT), cmd: K.BASCMD, omask: BigInt(K.BASBIT), vpos: 12, hpos: 12 });
  assert.equal(f.flag(), false); assert.equal(f.out.drain(), 'No base +2,+2\r\n');
});

test('LSTFLG coordinates can show ships even for BASES and never set persistent base/planet scan bits', () => {
  const f = fixture('BASES 12 12', K.BASCMD); f.ship(6, 12, 12); assert.equal(f.run(), 1);
  assert.equal(f.out.drain(), '\r\n*C  @12-12  +100.0%\r\n');
  const base = fixture('LIST 12 12'); base.base(2, 1, 12, 12); base.run();
  assert.equal(base.w.bases[2][1].scanned, 0n); assert.equal(base.s.basctr[2].value, 0n);
});

test('LSTFLG distant coordinates preserve source sensor error and ignore password for unrecognized object kinds', () => {
  const f = fixture('LIST 40 40'); f.ctx.password = true; f.w.board.setdsp(40, 40, 900);
  assert.equal(f.run(), 1); assert.equal(f.out.drain(), '\r\nCaptain, our sensors can\'t scan as far as 40-40\r\n');
});

test('LSTFLG named ships render even after range rejection, and inactive ships use the required literal bytes', () => {
  const f = fixture('LIST COBRA 2'); f.ship(6, 40, 40); assert.equal(f.run(), 1);
  assert.equal(f.out.drain(), '\r\n*C  out of range\r\n'); assert.equal(f.s.shpctr[2].value, 0n);
  const inactive = fixture('LIST COBRA'); inactive.io.literal = key => listLiterals[key].text + '  '; inactive.run();
  assert.equal(inactive.out.drain(), '\r\nC is not in the game  \r\n');
});

test('LSTFLG named Romulan checks ROMOPT then ROM; ordinary traversal only tests ROM', () => {
  const f = fixture('LIST ROMULAN'); f.w.romopt = 0n; f.w.rom = -1n; f.run();
  assert.equal(f.out.drain(), '\r\nRomulans are NOT in this game.\r\n');
  const dead = fixture('LIST ROMULAN'); dead.run(); assert.equal(dead.out.drain(), '\r\nThe Romulan is dead\r\n');
  f.s.clearOutput(); f.s.imask = 0n; f.s.omask = BigInt(K.SHPBIT); f.s.smask = BigInt(K.ROMBIT);
  assert.equal(f.flag(), false); assert.equal(f.s.romctr.value, 1n);
});

test('LSTFLG named selection keeps all three DUMMY arguments aliased and does not touch normal selection arrays', () => {
  const f = fixture('LIST LEXINGTON'); f.ship(1, 10, 10); f.io.dummy.value = 7n; f.run();
  assert.equal(f.io.dummy.value, 32780n); // (7 OR 32772) + 1, then OR 32772.
  assert.ok(f.s.outputWords.every(x => x === 0n));
});

test('LSTFLG no-object messages honor side/object labels, specified range and all verbosity modes', () => {
  for (const [oflg, expected] of [[-1, 'No known enemy ports\r\n'], [0, 'No known enemy ports in game\r\n'],
    [1, 'Captain, there are no known enemy ports in game\r\n']] as const) {
    const f = fixture(); f.ctx.oflg = oflg; f.s.omask = bits(K.BASBIT, K.PLNBIT); f.s.smask = bits(K.EMPBIT, K.ROMBIT);
    f.s.range = 20n; f.s.imask = BigInt(K.RNGBIT); assert.equal(f.flag(), true); assert.equal(f.out.drain(), expected);
  }
});

test('LSTOUT summary clears ROMCTR but counts physical flags once despite repeated group counters', () => {
  const f = fixture('SUMMARY ALL AND ALL', K.SUMCMD); f.ship(1, 10, 10); f.w.rom = -1n; f.run();
  assert.equal(f.s.romctr.value, 0n); assert.equal(f.s.shpctr[1].value, 2n);
  assert.equal(f.out.drain(), '\r\n  2 Romulans in game\r\n\r\n  1 Federation ship in game\r\n');
});

test('LSTOUT clears per-side summary counts between ship/base/planet categories', () => {
  const f = fixture('SUMMARY ALL', K.SUMCMD); f.ship(1, 10, 10); f.base(1, 1, 12, 12); f.planet(1, 1, 13, 13); f.run();
  assert.equal(f.out.drain(), '\r\n  1 Federation ship in game\r\n\r\n  1 Federation base in game\r\n\r\n  1 Federation planet in game\r\n');
});

test('LSTOUT listing updates base and planet scan bits after output, including preserving old bits', () => {
  const f = fixture('LIST ALL'); f.base(2, 1, 12, 12, 2n); f.planet(0, 1, 13, 13, 2n);
  const write = f.out.write.bind(f.out); f.out.write = text => {
    if (text === '*') assert.equal(f.w.bases[2][1].scanned, 2n);
    write(text);
  };
  f.run(); assert.equal(f.w.bases[2][1].scanned, 3n); assert.equal(f.w.planets[1].scanned, 3n);
});

test('LSTOUT summary-only and privilege-only distant listings do not grant scan knowledge', () => {
  for (const [line, cmd, privileged] of [['SUMMARY ALL', K.SUMCMD, false], ['LIST ALL', K.LSTCMD, true]] as const) {
    const f = fixture(line, cmd); f.ctx.password = privileged; f.base(2, 1, 40, 40); f.planet(2, 1, 41, 41); f.run();
    assert.equal(f.w.bases[2][1].scanned, 0n); assert.equal(f.w.planets[1].scanned, 0n);
  }
});

test('LSTOUT TARGETS accumulates only requested summary flags and counts the Romulan as one target', () => {
  const f = fixture('TARGETS SUMMARY', K.TARCMD); f.ship(6, 12, 12); f.base(2, 1, 14, 14); f.planet(2, 1, 15, 15); f.w.rom = -1n;
  f.run(); assert.equal(f.out.drain(), '\r\n  1 Romulan in game\r\n\r\n  4 targets in range\r\n');
  const noSummary = fixture('TARGETS', K.TARCMD); noSummary.ship(6, 12, 12); noSummary.run();
  assert.equal(noSummary.out.drain(), '\r\n C  @12-12  +100.0%\r\n');
});

test('LSTOUT rereads planet ownership at output time and renders flagged ships without ALIVE rechecks', () => {
  const f = fixture(); f.ship(6, 12, 12); f.planet(0, 1, 13, 13); f.flag();
  f.w.players[6].alive = 1n; f.w.board.setdsp(13, 13, 801);
  outputList(f.ctx, f.w, f.s, f.out, f.io);
  const text = f.out.drain(); assert.ok(text.includes('*C  @12-12')); assert.ok(text.includes('*-@ @13-13'));
  assert.equal(f.w.planets[1].scanned, 1n);
});

test('LSTFLG reversed base DO bounds require an explicit compiler adapter and retain completed setup', () => {
  const f = fixture(); f.s.omask = BigInt(K.BASBIT); f.s.smask = BigInt(K.NEUBIT);
  f.s.side = 7; assert.throws(f.flag, UnresolvedListExecution);
  assert.equal(f.s.gxf, bits(K.IGMBIT, K.LSTBIT)); assert.equal(f.out.drain(), '');
});

test('LSTFLG reversed base loop supports explicit zero-trip and one-trip fixtures without inventing side filtering', () => {
  for (const once of [false, true]) {
    const f = fixture(); f.base(2, 1, 12, 12); f.s.omask = BigInt(K.BASBIT); f.s.smask = BigInt(K.NEUBIT);
    f.io.reversedBaseLoop = (first, last) => {
      assert.deepEqual([first, last], [2, 1]); return { iterations: once ? [2] : [], after: once ? 3 : 2 };
    };
    assert.equal(f.flag(), !once); assert.equal(f.s.basctr[2].value, once ? 1n : 0n);
    assert.equal(f.s.side, once ? 3 : 2);
  }
});

test('LSTOUT retains selected planet flags when NPLNET becomes zero and requires the compiled loop policy', () => {
  for (const once of [undefined, false, true]) {
    const f = fixture(); f.planet(0, 1, 12, 12); f.flag(); f.w.nplnet = 0;
    if (once === undefined) {
      assert.throws(() => outputList(f.ctx, f.w, f.s, f.out, f.io), UnresolvedListExecution);
      assert.equal(f.s.plnctr.value, 1n); assert.equal(f.out.drain(), '\r\n'); continue;
    }
    f.io.reversedPlanetOutputLoop = (first, last) => {
      assert.deepEqual([first, last], [1, 0]); return { iterations: once ? [1] : [], after: once ? 2 : 1 };
    };
    outputList(f.ctx, f.w, f.s, f.out, f.io);
    assert.equal(f.w.planets[1].scanned, once ? 1n : 0n);
    assert.equal(f.s.index, once ? 2 : 1);
  }
});

test('LIST later group error retains direct coordinate output but suppresses deferred selected-object output', () => {
  const f = fixture('LIST 12 12 AND SHIPS AND NOPE'); f.ship(6, 12, 12); f.run();
  assert.equal(f.out.drain(), '\r\n*C  @12-12  +100.0%\r\nIllegal keyword NOPE\r\n');
  assert.equal(f.s.shpctr[2].value, 1n);
});

test('LIST scan knowledge persists across complete command calls and changes later distant visibility', () => {
  const f = fixture('LIST BASES 9'); f.base(2, 1, 12, 12); f.run(); assert.equal(f.w.bases[2][1].scanned, 1n); f.out.drain();
  Object.assign(f.w.players[1].ship, { v: 40, h: 40 }); f.input.acceptLine('LIST BASES 40'); f.input.acquire(f.out); f.run();
  assert.ok(f.out.drain().includes('*)( @12-12\r\n')); assert.equal(f.s.basctr[2].value, 1n);
});

test('all five dispatch slots execute actual LIST-family traversal and reports without charging a turn', () => {
  for (const [slot, cmd, line] of [[1, K.BASCMD, 'BASES'], [10, K.LSTCMD, 'LIST'], [14, K.PLNCMD, 'PLANETS'],
    [24, K.SUMCMD, 'SUMMARY'], [25, K.TARCMD, 'TARGETS']] as const) {
    const f = fixture(line, cmd); f.ship(6, 12, 12); f.base(1, 1, 11, 11); f.planet(0, 1, 13, 13);
    const ctx = { ...f.ctx, player: -1n, ptime: 77n, shared: { players: [...f.w.players] } };
    const run = dispatchCommand(ctx, slot, {
      *getcmd() { assert.fail(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn() { assert.fail(); },
      movementContinuation() { assert.fail(); }, *invoke() { f.run(); },
    });
    assert.equal(run.next().done, true); assert.equal(ctx.ptime, 77n); assert.ok(f.out.drain().length > 5);
  }
});
