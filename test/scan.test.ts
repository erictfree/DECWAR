import test from 'node:test';
import assert from 'node:assert/strict';
import { constants as K, scanObjects } from '../src/generated/source-data.ts';
import { scanObjectTable, sourceFile } from '../tools/source.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { TerminalOutput, o2db } from '../src/compat/output.ts';
import { MIN_INTEGER, packAscii } from '../src/compat/word36.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { playerSlots } from '../src/game/player.ts';
import { ScanScreen, setScan, markScan, showScan, scanRelocate } from '../src/game/scan-screen.ts';
import { scan, ScanLocals } from '../src/game/scan.ts';
import type { ListWorld } from '../src/game/list-world.ts';
import { listCommand } from '../src/game/list.ts';
import { ListLocals } from '../src/game/list-state.ts';
import { listLiterals } from '../src/game/list-world.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';

function fixture(line = 'SCAN', shortRange = false) {
  const players = playerSlots(); players[1].alive = -1n; Object.assign(players[1].ship, { v: 35, h: 35 });
  const w: ListWorld = { players, board: new PackedBoard(),
    bases: Array.from({ length: 3 }, () => Array.from({ length: K.KNBASE + 1 }, () => ({ v: 0, h: 0, strength: 0n, scanned: 0n }))),
    planets: Array.from({ length: K.KNPLNT + 1 }, () => ({ v: 0, h: 0, builds: 0n, scanned: 0n })),
    nplnet: 0, rom: 0n, romopt: -1n, erom: 1000n, locr: { v: 1, h: 1 } };
  w.board.setdsp(35, 35, 101);
  const ctx = { who: 1, team: 1, terwid: 132n, scnflg: 1, ccflg: 0n }, local = new ScanLocals(), screen = new ScanScreen();
  const out = new TerminalOutput(), input = new CommandInput(); input.acceptLine(line); input.acquire(out);
  const io = { ownPosition: (who: number) => ({ v: players[who].ship.v, h: players[who].ship.h }) };
  const run = () => scan(ctx, input, w, local, screen, out, io, shortRange);
  const planet = (side: number, i: number, v: number, h: number) => {
    Object.assign(w.planets[i], { v, h }); w.nplnet = Math.max(w.nplnet, i); w.board.setdsp(v, h, (side + 6) * 100 + i);
  };
  const base = (side: number, i: number, v: number, h: number) => {
    Object.assign(w.bases[side][i], { v, h, strength: 900n }); w.board.setdsp(v, h, (side + 2) * 100 + i);
  };
  return { ctx, local, screen, out, input, io, w, run, planet, base };
}
function row(screen: ScanScreen, index: number): string {
  let text = ''; for (let byte = index * 45; ; byte++) { const c = screen.get(byte); if (c === 0) return text; text += String.fromCharCode(c); }
}

test('SCAN OBJTBL extraction includes warning, cloaking, black-hole and captured-planet symbols distinct from LIST', () => {
  assert.deepEqual(scanObjects, scanObjectTable());
  const f = fixture(); const codes = [-1, 0, 101, 206, 301, 401, 500, 601, 701, 801, 900, 1000];
  codes.forEach((code, i) => f.w.board.setdsp(1, i + 1, code));
  setScan(f.screen, f.w.board, f.ctx, 1, 12, 1, 1);
  assert.equal(row(f.screen, 0), ' . . L C<>)(?? @@F@E *  ');
  f.ctx.scnflg = -1; setScan(f.screen, f.w.board, f.ctx, 1, 12, 1, 1);
  assert.equal(row(f.screen, 0), '..LC>(?@FE* ');
});

test('SETSCN retains six-word metadata, nine-word row stride, low bits and unused bytes', () => {
  const f = fixture(); f.screen.words.fill(-1n); f.w.board.setdsp(2, 2, 101);
  setScan(f.screen, f.w.board, f.ctx, 1, 2, 1, 2);
  assert.deepEqual(f.screen.words.slice(0, 6), [1n, 2n, 1n, 2n, 2n, 2n]);
  assert.equal(f.screen.words[6], packAscii(' . .\0') | 1n);
  assert.equal(f.screen.words[15], packAscii(' . L\0') | 1n);
  assert.equal(f.screen.words[7], -1n); assert.equal(f.screen.words[16], -1n); assert.equal(f.screen.words[199], -1n);
});

test('SETSCN maximum command rectangle fits the original LOCAL storage and retains tail words', () => {
  assert.match(sourceFile('WARMAC.MAC'), /locsiz==200/);
  const f = fixture(); f.screen.words.fill(17n); f.run();
  assert.equal(f.screen.dv, 21); assert.equal(f.screen.dh, 21);
  assert.equal(row(f.screen, 20).length, 42); assert.deepEqual(f.screen.words.slice(195), [17n, 17n, 17n, 17n, 17n]);
});

test('SETSCN shorter replacement writes a terminator without clearing old row tails or rows', () => {
  const f = fixture(); setScan(f.screen, f.w.board, f.ctx, 1, 5, 1, 3);
  const last = f.screen.words[24]; setScan(f.screen, f.w.board, f.ctx, 1, 1, 1, 1);
  assert.equal(row(f.screen, 0), ' .'); assert.equal(f.screen.get(3), '.'.charCodeAt(0)); assert.equal(f.screen.words[24], last);
});

test('O2DB blank leading zero is distinct from field-width formatting and does not discard hundreds', () => {
  const out = new TerminalOutput();
  for (const [value, expected] of [[0n, ' 0'], [9n, ' 9'], [10n, '10'], [75n, '75'], [100n, ':0'], [-1n, ' /']] as const) {
    o2db(out, value); assert.equal(out.drain(), expected);
  }
});

for (const scnflg of [-1, 0, 1]) test(`SHWSCN exact three-row picture for scan flag ${scnflg}`, () => {
  const f = fixture(); f.ctx.scnflg = scnflg; f.w.board.setdsp(10, 10, 101);
  setScan(f.screen, f.w.board, f.ctx, 9, 11, 9, 11); showScan(f.screen, f.ctx, f.out);
  assert.equal(f.out.drain(), scnflg < 0 ? '\r\n   10\r\n11 ... 11\r\n10 .L. 10\r\n 9 ...  9\r\n   10\r\n'
    : '\r\n    9  11\r\n11  . . . 11\r\n10  . L . 10\r\n 9  . . .  9\r\n    9  11\r\n');
});

test('SHWSCN short single-column scan still labels the next horizontal sector outside its bounds', () => {
  const f = fixture(); f.ctx.scnflg = -1; setScan(f.screen, f.w.board, f.ctx, 75, 75, 75, 75);
  showScan(f.screen, f.ctx, f.out); assert.equal(f.out.drain(), '\r\n   76\r\n75 . 75\r\n   76\r\n');
});

test('SHWSCN preexisting Ctrl-C prints one row before clearing the flag and omitting remaining rows and footer', () => {
  const f = fixture(); f.ctx.ccflg = 1n; setScan(f.screen, f.w.board, f.ctx, 9, 9, 9, 11);
  showScan(f.screen, f.ctx, f.out); assert.equal(f.ctx.ccflg, 0n);
  assert.equal(f.out.drain(), '\r\n    9\r\n11  . 11\r\n');
});

test('SHWSCN Ctrl-C arriving during output is honored only after the complete current row', () => {
  const f = fixture(); setScan(f.screen, f.w.board, f.ctx, 9, 9, 9, 11);
  const char = f.out.character.bind(f.out); f.out.character = value => { char(value); if (value === 46n) f.ctx.ccflg = -1n; };
  showScan(f.screen, f.ctx, f.out); assert.equal(f.out.drain(), '\r\n    9\r\n11  . 11\r\n'); assert.equal(f.ctx.ccflg, 0n);
});

test('RELOC uses inclusive clipped spans and signed eighteen-bit distances for disjoint intervals', () => {
  for (const [center, radius, min, max, first, count] of [[1, 4, 1, 10, 1, 5], [10, 4, 1, 10, 6, 5],
    [15, 2, 1, 10, 13, -2], [1, 2, 10, 20, 10, -6], [5, 0, 1, 10, 5, 1]] as const) {
    assert.deepEqual(scanRelocate(BigInt(center), BigInt(radius), BigInt(min), BigInt(max)), { first: BigInt(first), count: BigInt(count) });
  }
});

test('MARK clips warning squares to the scan, marks empty/cloaked cells and preserves other symbols', () => {
  const f = fixture(); f.ctx.scnflg = -1;
  f.w.board.setdsp(1, 1, 900); f.w.board.setdsp(2, 2, -1); f.w.board.setdsp(3, 3, 1000);
  setScan(f.screen, f.w.board, f.ctx, 1, 5, 1, 5); markScan(f.screen, f.w.board, f.ctx, 1, 1, 2n);
  assert.equal(row(f.screen, 0), '*!!..'); assert.equal(row(f.screen, 1), '!!!..');
  assert.equal(row(f.screen, 2), '!! ..'); assert.equal(row(f.screen, 3), '.....');
});

test('MARK reconstructs cells from the live board and disjoint marks do not touch SCREEN', () => {
  const f = fixture(); setScan(f.screen, f.w.board, f.ctx, 1, 3, 1, 3);
  f.w.board.setdsp(2, 2, 401); markScan(f.screen, f.w.board, f.ctx, 2, 2, 0n);
  assert.equal(row(f.screen, 1), ' .)( .'); const before = [...f.screen.words];
  markScan(f.screen, f.w.board, f.ctx, 40, 40, 4n); assert.deepEqual(f.screen.words, before);
});

test('SCAN/SRSCAN width limit applies to defaults in both display formats', () => {
  for (const shortRange of [false, true]) for (const scnflg of [-1, 1]) {
    const f = fixture(shortRange ? 'SRSCAN' : 'SCAN', shortRange); f.ctx.scnflg = scnflg; f.ctx.terwid = 25n; f.run();
    assert.deepEqual(f.local.dist.slice(1), [4n, 4n, 4n, 4n]); assert.equal(f.screen.dh, 9); assert.equal(f.screen.dv, 9);
  }
  const sr = fixture('SRSCAN', true); sr.run(); assert.equal(sr.screen.dh, 15);
});

test('SCAN tiny terminal widths truncate signed division toward zero before clamping ranges', () => {
  for (const width of [0n, 8n, 9n]) {
    const f = fixture(); f.ctx.terwid = width; f.run(); assert.equal(f.screen.dh, 1); assert.equal(f.screen.dv, 1);
  }
});

test('SCAN explicit ranges bypass terminal-width restriction but remain clamped to KRANGE', () => {
  const f = fixture('SCAN 100 20'); f.ctx.terwid = 9n; f.run();
  assert.deepEqual(f.local.dist.slice(1), [10n, 10n, 10n, 10n]); assert.equal(f.screen.dh, 21);
  const negative = fixture('SCAN -5 3'); negative.run(); assert.equal(negative.screen.dv, 1); assert.equal(negative.screen.dh, 7);
});

test('SCAN directional modifiers trim opposite sides and positive vertical direction increases V', () => {
  for (const [word, expected] of [['UP', [2n, 0n, 3n, 3n]], ['DOWN', [0n, 2n, 3n, 3n]],
    ['RIGHT', [2n, 2n, 3n, 0n]], ['LEFT', [2n, 2n, 0n, 3n]]] as const) {
    const f = fixture('SCAN ' + word + ' 2 3'); f.run();
    assert.deepEqual(f.local.dist.slice(1), expected);
  }
});

test('SCAN CORNER interprets signs independently and minimum-word negation wraps before clamping', () => {
  for (const [v, h, expected] of [[2, 3, [2n, 0n, 3n, 0n]], [-2, 3, [0n, 2n, 3n, 0n]],
    [2, -3, [2n, 0n, 0n, 3n]], [-2, -3, [0n, 2n, 0n, 3n]]] as const) {
    const f = fixture(`SCAN CORNER ${v} ${h}`); f.run(); assert.deepEqual(f.local.dist.slice(1), expected);
  }
  const f = fixture('SCAN CORNER -1 0'); f.input.tokens[2].value = MIN_INTEGER; f.run(); assert.equal(f.screen.dv, 1);
});

test('SCAN clamps the requested rectangle to galaxy boundaries', () => {
  const f = fixture(); Object.assign(f.w.players[1].ship, { v: 1, h: 75 }); f.run();
  assert.deepEqual(f.screen.words.slice(0, 6), [65n, 75n, 1n, 11n, 11n, 11n]);
});

test('SCAN syntax errors preserve prior screen/knowledge and emit the source message', () => {
  for (const line of ['SCAN CORNER', 'SCAN CORNER 2', 'SCAN 1 2 3', 'SCAN 1 OOPS', 'SCAN OOPS', 'SCAN WARNING 2']) {
    const f = fixture(line); f.screen.words.fill(55n); f.planet(2, 1, 35, 36); f.run();
    assert.equal(f.out.drain(), '%Syntax error\r\n', line); assert.ok(f.screen.words.every(x => x === 55n)); assert.equal(f.w.planets[1].scanned, 0n);
  }
});

test('SCAN trailing WARNING mutates type and NTOK only, including an error after removing it', () => {
  for (const line of ['SCAN WARNING', 'SCAN CORNER WARNING']) {
    const f = fixture(line); const last = f.input.tokens[f.input.ntok - 1], prior = { ...last }, n = f.input.ntok; f.run();
    assert.equal(f.input.ntok, n - 1); assert.deepEqual(last, { ...prior, type: K.KEOL }); assert.equal(f.local.warn, true);
  }
});

test('SCAN NTOK=1 bypasses stale modifiers and retains parser locals not assigned on that source path', () => {
  const f = fixture('SCAN CORNER 2 3'); f.input.ntok = 1; f.local.modifier = 99; f.local.p = 12; f.run();
  assert.equal(f.local.modifier, 99); assert.equal(f.local.p, 12); assert.equal(f.screen.dv, 21);
});

test('SCAN knowledge radius is independent of the displayed rectangle and marks all planet sides but enemy bases only', () => {
  const f = fixture('SCAN UP 1 1'); f.planet(0, 1, 25, 25); f.planet(1, 2, 45, 45); f.planet(2, 3, 24, 35);
  f.base(2, 1, 25, 35); f.base(1, 1, 36, 35); f.base(2, 2, 24, 35); f.base(2, 3, 36, 36); f.w.bases[2][3].strength = 0n;
  f.w.planets[1].scanned = 2n; f.run();
  assert.equal(f.w.planets[1].scanned, 3n); assert.equal(f.w.planets[2].scanned, 1n); assert.equal(f.w.planets[3].scanned, 0n);
  assert.equal(f.w.bases[2][1].scanned, 1n); assert.equal(f.w.bases[1][1].scanned, 0n);
  assert.equal(f.w.bases[2][2].scanned, 0n); assert.equal(f.w.bases[2][3].scanned, 0n);
});

test('SCAN WARNING uses radius two for enemy planets and four for enemy bases, including centers outside the display', () => {
  const f = fixture('SCAN 1 WARNING'); f.ctx.scnflg = -1; f.planet(2, 1, 38, 35); f.base(2, 1, 35, 40); f.run();
  assert.equal(row(f.screen, 2), '!!!'); // Planet square starts at V=36.
  assert.equal(row(f.screen, 1), '.L!'); assert.equal(row(f.screen, 0), '..!'); // Base square starts H=36.
});

test('SCAN Ctrl-C stops output only after all knowledge and warning updates have happened', () => {
  const f = fixture('SCAN 1 WARNING'); f.planet(2, 1, 36, 36); f.base(2, 1, 36, 35); f.ctx.ccflg = -1n; f.run();
  assert.equal(f.w.planets[1].scanned, 1n); assert.equal(f.w.bases[2][1].scanned, 1n); assert.equal(f.ctx.ccflg, 0n);
  assert.equal(f.out.drain().split('\r\n').filter(Boolean).length, 2);
});

test('SCAN uses team two identity for both knowledge bits and opposite-team base lookup', () => {
  const f = fixture('SCAN 0'); f.ctx.team = 2; f.base(1, 1, 35, 36); f.base(2, 1, 36, 35); f.planet(0, 1, 36, 36); f.run();
  assert.equal(f.w.bases[1][1].scanned, 2n); assert.equal(f.w.bases[2][1].scanned, 0n); assert.equal(f.w.planets[1].scanned, 2n);
});

test('SCAN knowledge feeds actual LIST visibility in a later command', () => {
  const f = fixture('SCAN 0'); f.base(2, 1, 45, 45); f.run(); f.out.drain();
  Object.assign(f.w.players[1].ship, { v: 25, h: 25 }); f.input.acceptLine('LIST BASES ALL'); f.input.acquire(f.out);
  const s = new ListLocals();
  listCommand({ who: 1, team: 1, password: false, oflg: 0, ocflg: K.KABS }, K.LSTCMD, f.input, s, f.w, f.out,
    { ...f.io, logical: word => word < 0n, dummy: { value: 0n }, literal: key => listLiterals[key].text });
  assert.equal(f.w.bases[2][1].scanned, 1n); assert.equal(s.basctr[2].value, 1n); assert.ok(f.out.drain().includes('*)( @45-45'));
});

test('SCAN and SRSCAN execute through command dispatch with source ranges and no turn charge', () => {
  for (const [id, sr, size] of [[19, false, 21], [22, true, 15]] as const) {
    const f = fixture(sr ? 'SRSCAN' : 'SCAN', sr), ctx = { who: 1, player: -1n, ptime: 123n, shared: { players: [...f.w.players] } };
    const run = dispatchCommand(ctx, id, { *getcmd() { assert.fail(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
      *finishTurn() { assert.fail(); }, movementContinuation() { assert.fail(); }, *invoke(call) {
        assert.equal(call.routine, sr ? 'srscan' : 'scan'); f.run();
      } });
    assert.equal(run.next().done, true); assert.equal(f.screen.dh, size); assert.equal(ctx.ptime, 123n);
  }
});
