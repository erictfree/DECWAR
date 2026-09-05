import test from 'node:test';
import assert from 'node:assert/strict';
import { move, MoveLocals } from '../src/game/move.ts';
import type { MoveServices } from '../src/game/move.ts';
import { locate, LocateLocals } from '../src/game/locate.ts';
import { check, CheckLocals } from '../src/game/check.ts';
import type { CheckOutput } from '../src/game/check.ts';
import { playerSlots } from '../src/game/player.ts';
import { PackedBoard, ingal } from '../src/compat/board.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { constants as K, messages as M } from '../src/generated/source-data.ts';
import { rational as real } from './support/rational-real.ts';
import type { Rational } from './support/rational-real.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';

function done<T>(g: Generator<unknown, T, void>): T { const n = g.next(); assert.equal(n.done, true); return n.value; }
function fixture(line = 'MOVE 12 20') {
  const players = playerSlots(), board = new PackedBoard(), input = new CommandInput(), out = new TerminalOutput();
  const ship = players[1].ship; Object.assign(ship, { v: 10, h: 20, energy: 10000n, shieldCondition: -1n, docked: true, condition: K.RED });
  board.setdsp(10, 20, 101); input.acceptLine(line); input.acquire(out); out.drain();
  const ctx = { who: 1, team: 1, oflg: 0, slowestTerminal: 2n, players };
  const local = new MoveLocals(real.literal('99')), ll = new LocateLocals(real.literal('99')), cl = new CheckLocals(real.literal('99'));
  const path: CheckOutput<Rational> = { h1: 0n, v1: 0n, h2: 0n, v2: 0n, dcode: 0n, dhs: real.literal('99'), dvs: real.literal('99') };
  const events: string[] = [], integers = [1234n, 1n], clock = [100n, 500n];
  const lc = { who: 1, icflg: K.KABS as number, pasflg: 0n, shared: { players, board, rom: 0n, locr: { v: 0, h: 0 } } };
  const io: MoveServices<Rational, 'input' | 'lock'> = {
    real, elapsed() { events.push('clock'); assert.ok(clock.length); return clock.shift()!; },
    iran(max) { events.push('iran:' + max); assert.ok(integers.length); return integers.shift()!; },
    ran(zero) { assert.equal(zero, 0); events.push('ran'); return real.literal('.75'); },
    locate(entry, count) {
      events.push(entry); return locate<Rational, 'input' | 'lock'>(entry, count, lc, input, ll, out, {
        real, logical: n => n < 0n, or: (a, b) => a() || b(), ownPosition: () => ({ v: BigInt(ship.v), h: BigInt(ship.h) }),
        *gtkn() { yield 'input'; assert.ok(input.acquire(out)); }, *pause() { assert.fail(); },
      });
    },
    check(v, h, iv, ih, ia, d) {
      events.push('check'); check(v, h, iv, ih, ia, d, path, cl, {
        real, ran: zero => io.ran(zero), ingal: (a, b) => ingal(Number(a), Number(b)), disp: (a, b) => io.disp(a, b),
      });
    },
    *lock(index) { events.push('lock:' + index); return true; }, unlock(index) { events.push('unlock:' + index); },
    disp(v, h) { events.push(`disp:${v},${h}`); return BigInt(board.disp(Number(v), Number(h))); },
    setdsp(v, h, code) { events.push(`set:${v},${h},${code}`); board.setdsp(Number(v), Number(h), Number(code)); },
  };
  const run = (entry: 'move' | 'impuls' = 'move') => move(entry, ctx, input, local, path, out, io);
  return { players, board, input, out, ship, ctx, local, ll, cl, path, events, integers, clock, lc, io, run };
}

test('MOVE composes LOCATE and CHECK, charges squared requested distance, moves under two locks and computes pause', () => {
  const f = fixture(); assert.deepEqual(done(f.run()), { alternateReturn: false, pause: 2600n });
  assert.deepEqual([f.ship.v, f.ship.h, f.ship.energy, f.ship.condition, f.ship.docked], [12, 20, 9840n, K.GREEN, false]);
  assert.equal(f.board.disp(10, 20), 0); assert.equal(f.board.disp(12, 20), 101); assert.equal(f.out.drain(), '');
  assert.deepEqual(f.events, ['clock', 'iran:4000', 'locate', 'check', 'disp:11,20', 'disp:12,20',
    'lock:282', 'lock:232', 'set:10,20,0', 'set:12,20,101', 'unlock:232', 'unlock:282', 'clock']);
});

test('MOVE and IMPULS critical engine damage returns before clock, RNG, input and state changes', () => {
  for (const entry of ['move', 'impuls'] as const) {
    const f = fixture(); f.ship.devices[entry === 'move' ? K.KDWARP : K.KDIMP] = BigInt(K.KCRIT);
    assert.deepEqual(done(f.run(entry)), { alternateReturn: true }); assert.deepEqual(f.events, []); assert.equal(f.ship.docked, true);
    assert.equal(f.out.drain(), (entry === 'move' ? M.wrpdam.text : M.impdam.text) + '\r\n');
  }
});

test('MOVE consumes IRAN(4000) before invalid coordinates and leaves condition/docking on input errors', () => {
  const f = fixture('MOVE WRONG'); assert.deepEqual(done(f.run()), { alternateReturn: true });
  assert.deepEqual(f.events, ['clock', 'iran:4000', 'locate']); assert.equal(f.ship.docked, true); assert.equal(f.ship.energy, 10000n);
});

test('MOVE repeats zero-count RELOC results before movement and charges input time against its original deadline', () => {
  const f = fixture('MOVE'), g = f.run(); assert.equal(g.next().value, 'input'); f.input.acceptLine('ABSOLUTE');
  assert.equal(g.next().value, 'input'); f.input.acceptLine('12 20'); f.clock[0] = 5000n;
  assert.deepEqual(done(g), { alternateReturn: false, pause: -1900n }); assert.equal(f.ship.v, 12);
  assert.equal(f.events.filter(e => e === 'iran:4000').length, 1);
});

test('MOVE no-op coordinates prompt using source verbosity and RELOC at label 600 does not assign TEM', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture('MOVE 10 20'); f.ctx.oflg = oflg; const g = f.run(); assert.equal(g.next().value, 'input');
    assert.equal(f.out.drain(), (oflg <= 0 ? M.error2.text : M.error1.text) + '\r\n' + M.coord1.text);
    f.input.acceptLine('12 20'); done(g); assert.equal(f.local.tem, 2n); assert.equal(f.ship.v, 12);
  }
});

test('MOVE label 600 uses VALLST after zero RELOC instead of adding a zero-count retry', () => {
  const f = fixture('MOVE 10 20'), original = f.io.locate; let call = 0;
  f.io.locate = function* (entry, n) {
    if (++call === 1) return yield* original(entry, n);
    f.input.tokens[0].value = 12n; f.input.tokens[1].value = 20n; return 0n;
  };
  assert.equal(done(f.run()).alternateReturn, false); assert.equal(call, 2); assert.equal(f.ship.v, 12); assert.equal(f.local.tem, 2n);
});

test('IMPULS accepts exactly one Chebyshev sector and ignores warp damage', () => {
  const f = fixture('IMPULSE 11 21'); f.ship.devices[K.KDWARP] = 99999n;
  assert.equal(done(f.run('impuls')).alternateReturn, false); assert.equal(f.ship.energy, 9960n); assert.deepEqual([f.ship.v, f.ship.h], [11, 21]);
});

test('IMPULS excessive distance changes condition/docking and takes damaged-computer RAN before rejecting', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture('IMPULSE 12 20'); f.ctx.oflg = oflg; f.ship.devices[K.KDCOMP] = BigInt(K.KCRIT);
    assert.equal(done(f.run('impuls')).alternateReturn, true); assert.equal(f.ship.docked, false); assert.equal(f.ship.condition, K.GREEN);
    assert.deepEqual(f.events, ['clock', 'iran:4000', 'locate', 'ran']); assert.equal(f.ship.energy, 10000n);
    assert.equal(f.out.drain(), (oflg === K.LONG ? M.move1a.text : '') + M.move1b.text + '\r\n');
  }
});

test('MOVE warp-damage limit and maximum-speed errors preserve verbosity and lack of final newline', () => {
  for (const oflg of [-1, 0, 1]) for (const damage of [-1n, 0n, 1n]) {
    const f = fixture('MOVE 17 20'); f.ctx.oflg = oflg; f.ship.devices[K.KDWARP] = damage;
    assert.equal(done(f.run()).alternateReturn, true); assert.equal(f.out.drain(), (oflg <= 0 ? M.move3s.text : M.move3l.text) + (damage > 0n ? '3.' : damage === 0n ? '6.' : ''));
    assert.equal(f.ship.docked, false);
    if (damage === 1n) {
      const g = fixture('MOVE 14 20'); g.ctx.oflg = oflg; g.ship.devices[K.KDWARP] = 1n; done(g.run());
      assert.equal(g.out.drain(), (oflg <= 0 ? M.move2s.text : M.move2l.text) + '\r\n'); assert.ok(!g.events.includes('check'));
    }
  }
});

test('MOVE warp 5/6 heat thresholds are strict and damage does not stop the accepted move', () => {
  for (const distance of [5, 6]) for (const roll of [80n, 81n, 90n, 91n]) {
    const f = fixture(`MOVE ${10 + distance} 20`); f.integers[1] = roll; const result = done(f.run());
    const damaged = distance === 5 ? roll > 90n : roll > 80n;
    assert.equal(f.ship.devices[K.KDWARP], damaged ? 1234n : 0n); assert.equal(result.alternateReturn, false);
    assert.equal(f.ship.v, 10 + distance); assert.equal(f.ship.energy, 10000n - 40n * BigInt(distance * distance));
    assert.deepEqual(f.events.filter(e => e.startsWith('iran')), ['iran:4000', 'iran:100']);
  }
});

test('MOVE speeding output uses scaled OFLT and truncated RANDAM/30 repair time at every verbosity', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture('MOVE 16 20'); f.ctx.oflg = oflg; f.integers[1] = 100n; done(f.run());
    assert.equal(f.out.drain(), (oflg === K.LONG ? M.engoff.text : '') + (oflg === K.SHORT ? M.move5s.text : M.move5l.text) + '\r\n'
      + M.move06.text + (oflg === K.SHORT ? '123' : '123.4') + M.move08.text + '\r\n'
      + (oflg === K.SHORT ? '' : M.move09.text + ' 4.1' + M.strdat.text + '\r\n'));
    assert.equal(f.local.time, 41n);
  }
});

test('MOVE energy uses full requested range even when CHECK stops at the first cell; shields multiply only when positive', () => {
  for (const shields of [-1n, 0n, 1n]) {
    const f = fixture('MOVE 14 20'); f.ship.shieldCondition = shields; f.board.setdsp(11, 20, 301);
    assert.equal(done(f.run()).alternateReturn, false); assert.equal(f.ship.energy, 10000n - 640n * (shields > 0n ? 2n : 1n));
    assert.equal(f.ship.v, 10); assert.ok(!f.events.some(e => e.startsWith('lock'))); assert.equal(f.out.drain(), M.move10.text + '\r\n');
  }
});

test('MOVE accepts negative energy and the inclusive galaxy boundary', () => {
  const f = fixture('MOVE 75 20'); f.ship.v = 74; f.ship.energy = 0n; f.board.setdsp(10, 20, 0); f.board.setdsp(74, 20, 101);
  assert.equal(done(f.run()).alternateReturn, false); assert.equal(f.ship.energy, -40n); assert.equal(f.ship.v, 75);
});

test('MOVE destination-lock failure retains energy and earlier state changes but skips board, final output and clock', () => {
  const f = fixture(); f.io.lock = function* () { assert.equal(f.ship.energy, 9840n); yield 'lock'; return false; };
  const g = f.run(); assert.equal(g.next().value, 'lock'); assert.equal(f.ship.docked, false);
  assert.deepEqual(done(g), { alternateReturn: true }); assert.equal(f.ship.v, 10); assert.equal(f.board.disp(10, 20), 101);
  assert.equal(f.clock.length, 1); assert.ok(!f.events.some(e => e.startsWith('unlock')));
});

test('MOVE source-lock failure releases the destination lock and preserves the energy charge', () => {
  const f = fixture(); let locks = 0; f.io.lock = function* () { return ++locks === 1; };
  assert.deepEqual(done(f.run()), { alternateReturn: true }); assert.equal(f.ship.energy, 9840n); assert.equal(f.ship.v, 10);
  assert.deepEqual(f.events.filter(e => e.startsWith('unlock')), ['unlock:282']);
});

test('MOVE same packed board word acquires and releases only one lock', () => {
  const f = fixture('MOVE 10 21'); done(f.run());
  assert.deepEqual(f.events.filter(e => e.startsWith('lock') || e.startsWith('unlock')), ['lock:232', 'unlock:232']);
});

test('MOVE does not recheck CHECK destination after lock wait and uses live source coordinates for SETDSP', () => {
  const f = fixture(); let first = true; f.io.lock = function* () { if (first) { first = false; yield 'lock'; } return true; };
  const g = f.run(); assert.equal(g.next().value, 'lock'); f.board.setdsp(12, 20, 301); f.ship.v = 9; f.board.setdsp(9, 20, 101);
  done(g); assert.equal(f.board.disp(12, 20), 101); assert.equal(f.board.disp(9, 20), 0); assert.equal(f.board.disp(10, 20), 101);
  assert.deepEqual(f.events.filter(e => e.startsWith('unlock')), ['unlock:232', 'unlock:282']);
});

test('MOVE towing charges triple energy, unlocks before towing and preserves fractional board/storage mismatch', () => {
  const f = fixture('MOVE 12 21'); f.ship.tractor = 2; const tow = f.players[2].ship; Object.assign(tow, { v: 9, h: 20 }); f.board.setdsp(9, 20, 102);
  done(f.run()); assert.equal(f.ship.energy, 9520n); assert.deepEqual([f.ship.v, f.ship.h], [12, 21]);
  assert.equal(f.board.disp(11, 21), 102); assert.deepEqual([tow.v, tow.h], [11, 20]); assert.equal(f.board.disp(tow.v, tow.h), 0);
  assert.deepEqual(f.events.slice(-6), ['unlock:232', 'unlock:282', 'disp:9,20', 'set:11,21,102', 'set:9,20,0', 'clock']);
});

test('MOVE towing writes the new cell before clearing the old cell, even when those cells coincide', () => {
  const f = fixture('MOVE 12 20'); f.ship.tractor = 2; Object.assign(f.players[2].ship, { v: 11, h: 20 }); f.board.setdsp(11, 20, 102);
  // A supplied CHECK output isolates the source tow-write alias; the real path would hit the tow first.
  f.io.check = () => { Object.assign(f.path, { h1: 12n, v1: 20n, dcode: 0n, dhs: real.literal('1'), dvs: real.literal('0') }); };
  done(f.run()); assert.equal(f.board.disp(11, 20), 0); assert.deepEqual([f.players[2].ship.v, f.players[2].ship.h], [11, 20]);
});

test('MOVE CHECK receives writable references and energy uses IA after the call', () => {
  const f = fixture(); f.io.check = (v, h, iv, ih, ia) => {
    assert.deepEqual([v.value, h.value, iv.value, ih.value, ia.value], [10n, 20n, 2n, 0n, 2n]);
    ia.value = 3n; Object.assign(f.path, { h1: 10n, v1: 20n, dcode: 0n });
  };
  done(f.run()); assert.equal(f.ship.energy, 9640n);
});

test('MOVE dispatch propagates PTIME then follows the compiler movement continuation into turn accounting', () => {
  const f = fixture(), ctx = { who: 1, player: -1n, ptime: 99n, shared: { players: f.players } }; let turns = 0;
  done(dispatchCommand<'input' | 'lock'>(ctx, 11, {
    *getcmd() { assert.fail(); }, *invoke(call) { assert.equal(call.routine, 'move'); return yield* f.run(); },
    *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn(value) { assert.equal(value, true); turns++; },
    movementContinuation() { return 'repair'; },
  }));
  assert.equal(ctx.ptime, 2600n); assert.equal(turns, 1); assert.equal(f.ship.v, 12);
});

test('MOVE damaged-computer deflection uses (RAN-.5)/2 before path draws and can clip against the galaxy edge', () => {
  const f = fixture('MOVE 14 75'); f.ship.h = 75; f.board.setdsp(10, 20, 0); f.board.setdsp(10, 75, 101);
  f.ship.devices[K.KDCOMP] = BigInt(K.KCRIT); f.io.ran = () => { f.events.push('ran'); return real.literal('.99'); };
  done(f.run()); assert.deepEqual([f.ship.v, f.ship.h], [11, 75]); assert.equal(f.ship.energy, 9360n);
  assert.equal(f.path.dcode, 0n); assert.equal(f.out.drain(), ''); assert.equal(f.events.filter(e => e === 'ran').length, 1);
  assert.equal(real.toInteger(real.multiply(f.local.d.value, real.literal('1000'))), 245n);
});

test('MOVE blocked towing with shields charges sixfold without moving or inspecting the partner', () => {
  const f = fixture('MOVE 14 20'); f.ship.tractor = 2; f.ship.shieldCondition = 1n; f.board.setdsp(11, 20, 102);
  done(f.run()); assert.equal(f.ship.energy, 6160n); assert.equal(f.ship.v, 10); assert.ok(!f.events.some(e => e.startsWith('set:')));
});

test('MOVE actual COMPUTED target stops before its occupied cell and charges full requested distance', () => {
  const f = fixture('MOVE COMPUTED NIMITZ'); Object.assign(f.players[2].ship, { v: 13, h: 20 });
  f.players[2].alive = -1n; f.players[1].job[K.KTTYSP] = 300n; f.board.setdsp(13, 20, 102);
  done(f.run()); assert.deepEqual([f.ship.v, f.ship.h], [12, 20]); assert.equal(f.ship.energy, 9640n);
  assert.equal(f.path.dcode, 102n); assert.equal(f.input.ntok, 2); assert.equal(f.out.drain(), M.move10.text + '\r\n');
});

test('MOVE dispatch alternate return leaves PTIME and turn accounting untouched after lock-failure energy loss', () => {
  const f = fixture(), ctx = { who: 1, player: -1n, ptime: 99n, shared: { players: f.players } };
  f.io.lock = function* () { return false; };
  done(dispatchCommand<'input' | 'lock'>(ctx, 11, {
    *getcmd() { assert.fail(); }, *invoke() { return yield* f.run(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
    *finishTurn() { assert.fail(); }, movementContinuation() { assert.fail(); },
  }));
  assert.equal(ctx.ptime, 99n); assert.equal(f.ship.energy, 9840n); assert.equal(f.ship.turns, 0n);
});
