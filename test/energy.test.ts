import test from 'node:test';
import assert from 'node:assert/strict';
import { energy, EnergyLocals, UnresolvedEnergyArithmetic } from '../src/game/energy.ts';
import type { EnergyServices } from '../src/game/energy.ts';
import { playerSlots } from '../src/game/player.ts';
import { emptyHit, HitQueue } from '../src/game/hit-queue.ts';
import { outHit } from '../src/game/out-hit.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { MAX_INTEGER } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { gtkn } from '../src/compat/gtkn.ts';

function fixture(line = 'ENERGY NIMITZ 100') {
  const players = playerSlots(), out = new TerminalOutput(), input = new CommandInput(), local = new EnergyLocals();
  players[1].alive = players[2].alive = -1n;
  Object.assign(players[1].ship, { v: 10, h: 10 }); Object.assign(players[2].ship, { v: 11, h: 11, energy: 10000n });
  const ctx = { who: 1, team: 1, oflg: 0, players }, hit = { ...emptyHit(), dbits: 0n }, queue = new HitQueue();
  input.acceptLine(line); input.acquire(out);
  const io: EnergyServices<'input'> = {
    *gtkn() { yield 'input'; assert.ok(input.acquire(out)); }, logical: word => word < 0n,
    // Explicit mathematical fixture. This is NOT the PDP-10 float contract.
    intTimesPointNine: word => word * 9n / 10n,
    *makhit() { queue.make(ctx.who, hit, players, 0n, out); },
  };
  const run = () => energy(ctx, input, local, hit, out, io);
  return { players, out, input, local, ctx, hit, queue, io, run };
}
function done(run: Generator<unknown, void, void>) { assert.equal(run.next().done, true); }

test('ENERGY transfers scaled units and queues event 12 with the actual shared MAKHIT registers', () => {
  const f = fixture(); f.hit.critdm = 73n; f.hit.vfrom = 44n; done(f.run());
  assert.equal(f.players[1].ship.energy, 49000n); assert.equal(f.players[2].ship.energy, 10900n);
  assert.equal(f.out.drain(), '\r\nEnergy transferred, Captain.\r\n'); assert.equal(f.players[2].hitflg, 1n);
  assert.deepEqual(f.hit, { ...emptyHit(), dbits: 0n });
  f.queue.get(2, f.hit, f.players);
  assert.deepEqual([f.hit.iwhat, f.hit.ihita, f.hit.dispfr, f.hit.dispto, f.hit.critdm, f.hit.vfrom], [12n, 900n, 101n, 102n, 73n, 44n]);
});

test('ENERGY delivery composes with GETHIT/OUTHIT without changing unrelated ship state', () => {
  const f = fixture(); f.players[1].ship.condition = K.RED; f.players[2].ship.shieldStrength = 555n; done(f.run()); f.out.drain();
  done(outHit({ who: 2, team: 1, oflg: 0, ocflg: K.KABS, nomsg: 0n, ship: f.players[2].ship }, f.hit, f.players, f.out,
    function* (who) { f.queue.get(who, f.hit, f.players); }));
  assert.equal(f.out.drain(), 'L 90.0 > N \r\n'); assert.equal(f.players[1].ship.condition, K.RED);
  assert.equal(f.players[2].ship.shieldStrength, 555n); assert.equal(f.players[2].hitflg, 0n);
});

test('ENERGY floating conversion remains required and leaves the scaled IHITA plus prior output on unresolved execution', () => {
  const f = fixture(); delete f.io.intTimesPointNine;
  assert.throws(() => f.run().next(), UnresolvedEnergyArithmetic);
  assert.equal(f.hit.ihita, 1000n); assert.equal(f.players[1].ship.energy, 50000n); assert.equal(f.players[2].ship.energy, 10000n);
  assert.equal(f.out.drain(), '\r\n'); assert.equal(f.queue.serial, 0n);
});

test('ENERGY uses the supplied rounded INT result, then caps and integer-divides that delivered amount', () => {
  const f = fixture(); f.io.intTimesPointNine = word => { assert.equal(word, 1000n); return 899n; }; done(f.run());
  assert.equal(f.players[2].ship.energy, 10899n); assert.equal(f.players[1].ship.energy, 49002n); // 899 + trunc(899/9).
});

test('ENERGY receiver capacity caps the delivered amount before recomputing donor cost', () => {
  const f = fixture(); f.players[2].ship.energy = 49995n; done(f.run());
  assert.equal(f.players[1].ship.energy, 49995n); assert.equal(f.players[2].ship.energy, 50000n);
  f.queue.get(2, f.hit, f.players); assert.equal(f.hit.ihita, 5n);
});

test('ENERGY a full receiver still produces success and a zero-energy hit', () => {
  const f = fixture(); f.players[2].ship.energy = 50000n; done(f.run());
  assert.equal(f.players[1].ship.energy, 50000n); assert.equal(f.players[2].ship.energy, 50000n);
  assert.equal(f.players[2].hitflg, 1n); f.queue.get(2, f.hit, f.players); assert.equal(f.hit.ihita, 0n);
  assert.equal(f.out.drain(), '\r\nEnergy transferred, Captain.\r\n');
});

test('ENERGY over-cap receiver reverses the transfer and its negative hit amount is packed unsigned', () => {
  const f = fixture(); f.players[2].ship.energy = 50010n; done(f.run());
  assert.equal(f.players[1].ship.energy, 50011n); assert.equal(f.players[2].ship.energy, 50000n);
  f.queue.get(2, f.hit, f.players); assert.equal(f.hit.ihita, 262134n);
});

for (const oflg of [-1, 0, 1]) test(`ENERGY rejects spending exactly all donor energy before conversion at verbosity ${oflg}`, () => {
  const f = fixture('ENERGY N 5000'); f.ctx.oflg = oflg; f.io.intTimesPointNine = () => { assert.fail(); };
  done(f.run()); assert.equal(f.hit.ihita, 50000n); assert.equal(f.queue.serial, 0n);
  assert.equal(f.out.drain(), '\r\n' + (oflg > 0 ? "Captain, our ship doesn't possess that much energy!" : 'Insufficient ship energy.') + '\r\n');
});

test('ENERGY compares the requested amount to donor energy before checking receiver capacity', () => {
  const f = fixture('ENERGY N 5000'); f.players[2].ship.energy = 50000n; done(f.run());
  assert.equal(f.out.drain(), '\r\nInsufficient ship energy.\r\n'); assert.equal(f.queue.serial, 0n);
});

test('ENERGY nonpositive requests use source verbosity and keep unrelated hit fields', () => {
  for (const oflg of [-1, 0, 1]) for (const amount of [-1, 0]) {
    const f = fixture('ENERGY N ' + amount); f.ctx.oflg = oflg; f.hit.iwhat = 9n; f.hit.dbits = 17n; done(f.run());
    assert.equal(f.out.drain(), '\r\n' + (oflg === 1 ? 'Illegal energy transfer.  ' : '') + 'Transfer aborted.\r\n');
    assert.equal(f.hit.ihita, BigInt(amount * 10)); assert.equal(f.hit.iwhat, 9n); assert.equal(f.hit.dbits, 17n);
  }
});

test('ENERGY word scaling happens before validation and zero donor energy reaches insufficient branch first', () => {
  const f = fixture('ENERGY N 1'); f.input.tokens[2].value = MAX_INTEGER; done(f.run());
  assert.equal(f.hit.ihita, -10n); assert.equal(f.out.drain(), '\r\nTransfer aborted.\r\n');
  const zero = fixture('ENERGY N 0'); zero.players[1].ship.energy = 0n; done(zero.run());
  assert.equal(zero.out.drain(), '\r\nInsufficient ship energy.\r\n');
});

test('ENERGY ship matching uses source prefix order, ignores extra tokens and does not consult NTOK', () => {
  const f = fixture('ENERGY N 100 EXTRA'); f.input.ntok = 1; done(f.run()); assert.equal(f.players[2].ship.energy, 10900n);
  const unknown = fixture('ENERGY UNKNOWN 5'); done(unknown.run());
  assert.equal(unknown.out.drain(), '\r\nUnknown ship name.\r\n');
});

test('ENERGY self rejection precedes ALIVE checks and uses exact long apology', () => {
  const f = fixture('ENERGY L 5'); f.ctx.oflg = 1; f.io.logical = () => { assert.fail(); }; done(f.run());
  assert.equal(f.out.drain(), '\r\nBeg your pardon, Captain?  Transfer energy to US!?!\r\n');
});

test('ENERGY raw ALIVE interpretation precedes enemy and adjacency checks without consulting board occupancy', () => {
  const f = fixture('ENERGY C 5'); done(f.run()); assert.equal(f.out.drain(), '\r\nPlayer not in game.\r\n');
  const enemy = fixture('ENERGY C 5'); enemy.io.logical = word => { assert.equal(word, 1n); return true; }; done(enemy.run());
  assert.equal(enemy.out.drain(), '\r\nCan not transfer energy to enemy ship.\r\n');
  const distant = fixture(); distant.players[2].ship.v = 12; done(distant.run());
  assert.equal(distant.out.drain(), '\r\nNot adjacent to destination ship.\r\n'); assert.equal(distant.hit.ihita, 0n);
});

test('ENERGY diagonal adjacency is inclusive and team two uses physical ship slots for destination metadata', () => {
  const f = fixture('ENERGY D 100'); f.ctx.who = 6; f.ctx.team = 2; f.players[7].alive = -1n;
  Object.assign(f.players[6].ship, { v: 10, h: 10 }); Object.assign(f.players[7].ship, { v: 9, h: 9, energy: 10000n });
  done(f.run()); f.queue.get(7, f.hit, f.players); assert.equal(f.hit.dispfr, 206n); assert.equal(f.hit.dispto, 207n);
});

test('ENERGY malformed input prompts repeatedly and empty response returns before destination checks', () => {
  const f = fixture('ENERGY 100 N'); const run = f.run();
  assert.deepEqual(run.next(), { value: 'input', done: false }); assert.equal(f.out.drain(), '\r\nShip, energy: ');
  f.input.acceptLine('N'); assert.deepEqual(run.next(), { value: 'input', done: false }); assert.equal(f.out.drain(), 'Ship, energy: ');
  f.input.acceptLine(''); assert.equal(run.next().done, true); assert.equal(f.local.index, 1); assert.equal(f.queue.serial, 0n);
});

test('ENERGY long prompt resumes at token one and shares actual GTKN command-tail handling', () => {
  const f = fixture('ENERGY / NIMITZ 100'); f.ctx.oflg = 1;
  const state = { locked: 0n, svlock: 0n, hungup: 0n, ccflgDot: 0n, iniflg: 0n, ccflg: 0n };
  f.io.gtkn = () => gtkn(state, f.input, f.out, {
    *inli() { assert.fail('Buffered tail needs no monitor read'); }, unlo() { assert.fail(); },
    *lock() { assert.fail(); }, daytime() { assert.fail(); }, hibernate() { assert.fail(); }, inputPending() { assert.fail(); },
  });
  done(f.run()); assert.equal(f.players[2].ship.energy, 10900n);
  assert.equal(f.out.drain(), '\r\nDestination ship name and energy to transfer: \r\nEnergy transferred, Captain.\r\n');
});

test('ENERGY updates balances and writes success before setting notification fields and calling MAKHIT', () => {
  const f = fixture(); f.hit.dispto = 999n;
  const write = f.out.write.bind(f.out); f.out.write = text => {
    if (text === 'Energy transferred, Captain.') {
      assert.equal(f.players[1].ship.energy, 49000n); assert.equal(f.players[2].ship.energy, 10900n); assert.equal(f.hit.dispto, 999n);
    }
    write(text);
  };
  f.io.makhit = function* () { assert.equal(f.hit.iwhat, 12n); assert.equal(f.hit.dbits, 2n); yield 'input'; };
  const run = f.run(); assert.deepEqual(run.next(), { value: 'input', done: false }); assert.equal(run.next().done, true);
});

test('ENERGY dispatch has no automatic repair, stardate or pause charge', () => {
  const f = fixture(), ctx = { who: 1, player: -1n, ptime: 91n, shared: { players: f.players } };
  done(dispatchCommand(ctx, 6, { *getcmd() { assert.fail(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
    *finishTurn() { assert.fail(); }, movementContinuation() { assert.fail(); }, *invoke(call) {
      assert.equal(call.routine, 'energy'); yield* f.run();
    } }));
  assert.equal(ctx.ptime, 91n); assert.equal(f.players[1].ship.turns, 0n); assert.equal(f.players[2].hitflg, 1n);
});
