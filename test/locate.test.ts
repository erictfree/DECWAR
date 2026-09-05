import test from 'node:test';
import assert from 'node:assert/strict';
import { locate, LocateLocals } from '../src/game/locate.ts';
import type { LocateServices } from '../src/game/locate.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { playerSlots } from '../src/game/player.ts';
import { constants as K, messages as M } from '../src/generated/source-data.ts';
import { rational as real } from './support/rational-real.ts';
import type { Rational } from './support/rational-real.ts';
import { gtkn } from '../src/compat/gtkn.ts';

function done<T>(g: Generator<unknown, T, void>): T { const n = g.next(); assert.equal(n.done, true); return n.value; }
function fixture(line: string, count = 2n) {
  const players = playerSlots(), board = new PackedBoard(), input = new CommandInput(), out = new TerminalOutput();
  Object.assign(players[1].ship, { v: 10, h: 20 }); Object.assign(players[2].ship, { v: 30, h: 40 });
  players[2].alive = -1n; board.setdsp(30, 40, 102); players[1].job[K.KTTYSP] = 300n;
  const ctx = { who: 1, icflg: K.KABS as number, pasflg: 0n, shared: { players, board, rom: -1n, locr: { v: 50, h: 60 } } };
  input.acceptLine(line); input.acquire(out); out.drain();
  const events: string[] = [], local = new LocateLocals(real.literal('99.0'));
  const io: LocateServices<Rational, 'input' | 'pause'> = {
    real, logical: n => n < 0n, or: (a, b) => a() || b(),
    ownPosition(who) { events.push('position'); return { v: BigInt(players[who].ship.v), h: BigInt(players[who].ship.h) }; },
    *gtkn() { yield 'input'; assert.ok(input.acquire(out)); },
    *pause(n) { events.push('pause:' + n); yield 'pause'; },
  };
  const run = (entry: 'locate' | 'reloc' = 'locate') => locate(entry, { value: count }, ctx, input, local, out, io);
  const values = () => input.tokens.slice(0, Number(local.result)).map(t => t.value);
  return { players, board, input, out, ctx, events, local, io, run, values };
}

test('LOCATE absolute coordinates alter only VALLST, retaining original token count, types, text and offsets', () => {
  const f = fixture('MOVE 15 25'), before = f.input.tokens.map(t => ({ ...t }));
  assert.equal(done(f.run()), 2n); assert.deepEqual(f.values(), [15n, 25n]); assert.equal(f.input.ntok, 3);
  for (let i = 0; i < K.KMAXTK; i++) assert.deepEqual({ ...f.input.tokens[i], value: before[i].value }, before[i]);
  assert.equal(f.out.drain(), ''); assert.deepEqual(f.events, []);
});

test('LOCATE default relative mode, ABSOLUTE and RELATIVE prefixes preserve offset selection', () => {
  for (const [line, mode, values, reads] of [
    ['MOVE 1 -2', K.KREL, [11n, 18n], 1], ['MOVE A 1 2', K.KREL, [1n, 2n], 1],
    ['MOVE R 1 2', K.KABS, [11n, 22n], 1], ['MOVE R 1 2', K.KREL, [11n, 22n], 1],
    ['MOVE A 1 2', K.KABS, [1n, 2n], 0],
  ] as const) {
    const f = fixture(line); f.ctx.icflg = mode; assert.equal(done(f.run()), 2n);
    assert.deepEqual(f.values(), values); assert.equal(f.events.length, reads);
  }
});

test('LOCATE odd leading scalar is neither translated nor range-checked', () => {
  const f = fixture('TORPEDO -999 1 2', 3n); f.ctx.icflg = K.KREL;
  assert.equal(done(f.run()), 3n); assert.deepEqual(f.values(), [-999n, 11n, 22n]);
  const scalar = fixture('TORPEDO -999', 1n); assert.equal(done(scalar.run()), 1n); assert.deepEqual(scalar.values(), [-999n]);
});

test('LOCATE no coordinates returns zero before exact-count checks, while an EOL command aborts before offset reads', () => {
  for (const line of ['MOVE', 'MOVE ABSOLUTE', 'MOVE RELATIVE']) { const f = fixture(line); assert.equal(done(f.run()), 0n); assert.equal(f.out.drain(), ''); }
  const f = fixture(''); f.ctx.icflg = K.KREL; assert.equal(done(f.run()), -1n); assert.deepEqual(f.events, []);
});

test('LOCATE checks counts before numeric types and validates all types before changing values', () => {
  for (const [line, n, message] of [['MOVE X', 2n, M.erloc1], ['MOVE X 2 3', -2n, M.erloc2], ['MOVE 11 X', 2n, M.erloc7]] as const) {
    const f = fixture(line, n), before = f.input.tokens.map(t => t.value); assert.equal(done(f.run()), -1n);
    assert.equal(f.out.drain(), message.text + '\r\n'); assert.deepEqual(f.input.tokens.map(t => t.value), before);
  }
  const f = fixture('MOVE 1 2', -4n); assert.equal(done(f.run()), 2n);
});

test('LOCATE range errors leave assigned invalid and earlier coordinates in VALLST', () => {
  for (const [line, expected, message] of [['MOVE 0 22', [0n], M.erloc8], ['MOVE 12 76', [12n, 76n], M.erloc9]] as const) {
    const f = fixture(line); assert.equal(done(f.run()), -1n); assert.deepEqual(f.input.tokens.slice(0, expected.length).map(t => t.value), expected);
    assert.equal(f.out.drain(), message.text + '\r\n');
  }
  for (const n of [1, 75]) { const f = fixture(`MOVE ${n} ${n}`); assert.equal(done(f.run()), 2n); }
});

test('LOCATE numeric addition crosses explicit FLOAT and integer assignment boundaries even in absolute mode', () => {
  const f = fixture('MOVE 12 23'), events: string[] = [];
  f.io.real = { ...real, fromInteger(n) { events.push('float:' + n); return real.fromInteger(n); },
    add(a, b) { events.push('add'); return real.add(a, b); }, toInteger(a) { events.push('int'); return real.toInteger(a); } };
  done(f.run()); assert.deepEqual(events, ['float:12', 'add', 'int', 'float:23', 'add', 'int']);
});

test('LOCATE COMPUTED expands backwards without moving pointer offsets or writing a new EOL', () => {
  const f = fixture('MOVE COMPUTED NIMITZ ROMULAN', 4n), offsets = f.input.tokens.map(t => t.offset);
  assert.equal(done(f.run()), 4n); assert.deepEqual(f.values(), [30n, 40n, 50n, 60n]); assert.equal(f.input.ntok, 4);
  assert.deepEqual(f.input.tokens.slice(0, 4).map(t => t.text), ['NIMIT', 'ROMUL', 'NIMIT', 'ROMUL']);
  assert.deepEqual(f.input.tokens.map(t => t.offset), offsets); assert.deepEqual(f.input.tokens.slice(0, 4).map(t => t.type), [K.KINT, K.KINT, K.KINT, K.KINT]);
});

test('LOCATE COMPUTED preserves leading numeric scalar and stale text past expanded NTOK', () => {
  const f = fixture('TORPEDO COMPUTED 999 NIMITZ', 3n); assert.equal(done(f.run()), 3n);
  assert.deepEqual(f.values(), [999n, 30n, 40n]); assert.equal(f.input.ntok, 3); assert.equal(f.input.tokens[3].type, K.KALF);
});

test('LOCATE COMPUTED wrong count changes NTOK and shifts fields before reporting failure', () => {
  const f = fixture('MOVE COMPUTED NIMITZ ROMULAN'); assert.equal(done(f.run()), -1n);
  assert.equal(f.input.ntok, 4); assert.equal(f.input.tokens[0].text, 'NIMIT'); assert.equal(f.input.tokens[0].type, K.KALF);
  assert.equal(f.out.drain(), M.erloc1.text + '\r\n');
});

test('LOCATE COMPUTED backward expansion retains later coordinates when an earlier name fails', () => {
  const f = fixture('MOVE COMPUTED MISSING ROMULAN', 4n); assert.equal(done(f.run()), -1n);
  assert.deepEqual(f.input.tokens.slice(2, 4).map(t => t.value), [50n, 60n]); assert.equal(f.out.drain(), M.erloc4.text + '\r\n');
  const number = fixture('MOVE COMPUTED NIMITZ 123', 4n); assert.equal(done(number.run()), -1n); assert.equal(number.out.drain(), M.erloc3.text + '\r\n');
});

test('LOCATE COMPUTED ALIVE uses the compiler logical service and board occupancy must be strictly positive', () => {
  for (const alive of [-2n, -1n, 0n, 1n]) for (const cell of [-1, 0, 102]) {
    const f = fixture('MOVE COMPUTED N'); f.players[2].alive = alive; f.board.setdsp(30, 40, cell);
    assert.equal(done(f.run()), alive < 0n && cell > 0 ? 2n : -1n);
  }
  const f = fixture('MOVE COMPUTED ROMULAN'); f.ctx.shared.rom = 1n; assert.equal(done(f.run()), -1n); assert.equal(f.out.drain(), M.noship.text + '\r\n');
});

test('LOCATE COMPUTED damaged computer aborts before pause and token mutation', () => {
  const f = fixture('MOVE COMPUTED NIMITZ'); f.players[1].ship.devices[K.KDCOMP] = BigInt(K.KCRIT); f.players[1].job[K.KTTYSP] = 9600n;
  assert.equal(done(f.run()), -1n); assert.deepEqual(f.events, []); assert.equal(f.input.ntok, 3); assert.equal(f.out.drain(), M.damcom.text + '\r\n');
});

test('LOCATE COMPUTED pauses twice the baud value before shifting and resumes from live token storage', () => {
  const f = fixture('MOVE COMPUTED NIMITZ'); f.players[1].job[K.KTTYSP] = 9600n; const g = f.run();
  assert.equal(g.next().value, 'pause'); assert.deepEqual(f.events, ['pause:19200']); assert.equal(f.input.tokens[0].text, 'MOVE');
  f.input.tokens[2].text = 'ROMUL'; assert.equal(done(g), 2n); assert.deepEqual(f.values(), [50n, 60n]);
  const p = fixture('MOVE COMPUTED N'); p.ctx.pasflg = -1n; p.players[1].job[K.KTTYSP] = 9600n; done(p.run()); assert.deepEqual(p.events, []);
});

test('LOCATE COMPUTED zero-name and scalar-only DO bounds require a compiler adapter', () => {
  const empty = fixture('MOVE COMPUTED'); assert.throws(() => done(empty.run()), /reversed DO/);
  empty.io.reversedLoop = (first, last, step) => { assert.deepEqual([first, last, step], [1, 0, 1]); return { iterations: [], after: 1 }; };
  assert.equal(done(empty.run()), 0n); assert.equal(empty.input.ntok, 0);
  const scalar = fixture('MOVE COMPUTED 5', 1n); assert.throws(() => done(scalar.run()), /reversed DO/); assert.equal(scalar.input.ntok, 1);
});

test('RELOC prompts and runs GTKN before setting P and interpreting coordinates', () => {
  const f = fixture('MOVE'); f.local.p = 77; const g = f.run('reloc'); assert.equal(g.next().value, 'input'); assert.equal(f.local.p, 77);
  assert.equal(f.out.drain(), M.coord1.text); f.input.acceptLine('12 24'); assert.equal(done(g), 2n); assert.deepEqual(f.values(), [12n, 24n]);
});

test('RELOC composes real GTKN with slash-buffered input and preserves the following command', () => {
  const f = fixture('MOVE / 13 24 / TIME');
  f.io.gtkn = () => gtkn({ locked: 0n, svlock: 0n, iniflg: 0n, hungup: 0n, ccflg: 0n, ccflgDot: 0n }, f.input, f.out, {
    daytime() { assert.fail(); }, inputPending() { assert.fail(); }, unlo() { assert.fail(); },
    *lock() { assert.fail(); return false; }, *hibernate() { assert.fail(); }, *inli() { assert.fail(); },
  });
  assert.equal(done(f.run('reloc')), 2n); assert.deepEqual(f.values(), [13n, 24n]); assert.ok(f.input.acquire(f.out)); assert.equal(f.input.tokens[0].text, 'TIME');
});
