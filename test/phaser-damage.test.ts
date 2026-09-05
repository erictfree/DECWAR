import test from 'node:test';
import assert from 'node:assert/strict';
import { phaserFixture, finish } from './support/phaser-fixture.ts';
import { weaponFixture, done } from './support/weapon-damage-fixture.ts';
import { weaponDamage } from '../src/game/weapon-damage.ts';
import { constants as K, messages as M } from '../src/generated/source-data.ts';
import { outHit } from '../src/game/out-hit.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';

function fixture(line = 'PHASERS 12 20', code = 206) {
  const f = phaserFixture(line, code); Object.assign(f.bases[2][1], { v: 12, h: 20 });
  const d = weaponFixture({ players: f.players, board: f.board, hit: f.hit, bases: f.bases, world: f.world, tpoint: f.ctx.tpoint });
  f.io.phadam = function* (kind, index, distance, phit, ship) {
    const g = weaponDamage('phadam', kind, index, distance, phit, ship, d.ctx, d.local, f.hit, d.io);
    let next = g.next();
    while (!next.done) { yield 'damage'; next = g.next(); }
  };
  return { f, d };
}

test('PHACON→PHADAM→PWR→MAKHIT damages a shielded enemy and publishes actual remaining shields', () => {
  const { f, d } = fixture(); d.draws.push('0', '.5'); finish(f.run());
  assert.equal(f.players[6].ship.shieldStrength, 800n); assert.equal(f.queued[0].shstto, 800n); assert.equal(f.queued[0].ihita, 0n);
  assert.equal(f.ship.energy, 8000n); assert.equal(f.players[6].ship.condition, K.RED); assert.equal(f.ctx.phbank[1], 7000n);
  assert.deepEqual(d.events, ['ran', 'ran', 'pwr:2']); assert.equal(f.queued[0].dbits, 33n);
});

test('PHACON unshielded enemy damage and scoring survive queue packing, with source terminal bytes', () => {
  const { f, d } = fixture(); f.players[6].ship.shieldCondition = -1n; d.draws.push('0', '.5'); finish(f.run());
  assert.equal(f.players[6].ship.damage, 13249n); assert.equal(f.players[6].ship.energy, 36750n); assert.equal(f.ctx.tpoint[K.KPEDAM], 13249n);
  finish(outHit({ who: 1, team: 1, oflg: 0, ocflg: K.KABS, nomsg: 0n, ship: f.ship }, f.hit, f.players, f.out,
    function* (who) { f.queue.get(who, f.hit, f.players); }));
  assert.equal(f.out.drain(), 'L @10-20, -100.0%  1324.9 unit P  C @12-20, -100.0%\r\n');
});

test('PHACON critical ship hit preserves device damage and notifies the target through the actual queue', () => {
  const { f, d } = fixture('PHASERS 50 12 20'); f.players[6].ship.shieldCondition = -1n;
  d.draws.push('.9', '.5', '0', '.5'); d.integers.push(1n); finish(f.run());
  assert.equal(f.players[6].ship.devices[1], 1656n); assert.equal(f.queued[0].critdv, 1n); assert.equal(f.queued[0].critdm, 1656n);
  assert.equal(f.queued[0].ihita, 1656n); assert.equal(f.players[6].ship.energy, 48343n);
  f.queue.get(6, f.hit, f.players); assert.equal(f.hit.critdm, 1656n); assert.equal(f.hit.critdv, 1n);
});

test('PHACON real enemy destruction awards damage and kill points, clears board, and keeps killed tractor state', () => {
  const { f, d } = fixture(); f.players[6].ship.shieldCondition = -1n; f.players[6].ship.energy = 1n; f.players[6].ship.tractor = 1;
  d.draws.push('0', '.5'); finish(f.run());
  assert.equal(f.players[6].alive, 0n); assert.equal(f.board.disp(12, 20), 0); assert.equal(f.players[6].ship.tractor, 1);
  assert.equal(f.ctx.tpoint[K.KPEDAM], 13249n); assert.equal(f.ctx.tpoint[K.KPEKIL], 5000n); assert.equal(f.queued[0].klflg, 2n);
  assert.equal(f.queued[0].dbits, 33n); // PRIDIS numerically includes ALIVE=0.
});

test('PHACON real full-base hit produces attack announcement then damage report without destruction', () => {
  const { f, d } = fixture('PHASERS 12 20', 401); d.draws.push('0', '.5'); finish(f.run());
  assert.equal(f.bases[2][1].strength, 800n); assert.deepEqual(f.queued.map(h => h.iwhat), [9n, 1n]);
  assert.deepEqual(f.queued.map(h => h.dbits), [32n, 33n]); assert.equal(f.queued[1].shstto, 800n); assert.equal(d.nbase[2], 1n);
});

test('PHACON real base kill composes BASKIL, count/scoring mutation and separate destruction announcement', () => {
  const { f, d } = fixture('PHASERS 12 20', 401); f.bases[2][1].strength = 50n; f.players[6].ship.docked = true; d.numcap[2] = 1n;
  d.draws.push('0', '.5', '.2'); d.integers.push(1n); finish(f.run());
  assert.equal(d.nbase[2], 0n); assert.equal(f.bases[2][1].strength, 0n); assert.equal(f.players[6].ship.docked, false);
  assert.equal(f.ctx.tpoint[K.KPBDAM], 16293n); assert.equal(f.board.disp(12, 20), 0);
  assert.deepEqual(f.queued.map(h => h.iwhat), [1n, 10n]); assert.equal(f.queued[0].shstto, -70n);
  assert.equal(f.queued[0].klflg, 2n); assert.equal(f.queued[1].klflg, 0n); assert.equal(f.queued[1].ihita, 0n);
});

test('PHACON overheat damage reduces the same shot through PHADAM and extends that bank recharge', () => {
  const { f, d } = fixture('PHASERS 200 12 20'); f.players[6].ship.shieldCondition = -1n; f.draws.splice(0, 2, 100n, 1n);
  d.draws.push('0', '.5'); finish(f.run()); assert.equal(f.ship.devices[K.KDPHAS], 765n); assert.equal(f.queued[0].ihita, 10599n);
  assert.equal(f.ctx.phbank[1], 7765n); assert.equal(f.out.drain(), M.phacn4.text + '\r\n');
});

test('PHACON preserves its stale target classification across pause and PHADAM still hits an already-dead target', () => {
  const { f, d } = fixture(); f.players[6].ship.shieldCondition = -1n;
  f.io.pause = function* () { f.players[6].ship.energy = 0n; f.players[6].alive = 0n; f.board.setdsp(12, 20, 0); };
  d.draws.push('0', '.5'); finish(f.run()); assert.equal(f.players[6].ship.energy, -13249n); assert.equal(f.ctx.tpoint[K.KPEKIL], 5000n);
  assert.equal(f.queued[0].dispto, 206n); assert.equal(f.queued[0].klflg, 2n);
});

test('PHACON waits through damage BASKIL before final energy or queue writes', () => {
  const { f, d } = fixture('PHASERS 12 20', 401); f.bases[2][1].strength = 50n; d.draws.push('0', '.5', '.2'); d.integers.push(1n);
  const original = d.io.baskil; d.io.baskil = function* (team) { yield 'base'; yield* original(team); };
  const g = f.run(); assert.equal(g.next().value, 'damage'); assert.equal(f.ship.energy, 10000n); assert.equal(f.queue.serial, 0n);
  finish(g); assert.equal(f.ship.energy, 8000n); assert.equal(f.queue.serial, 2n);
});

test('PHACON composed real damage returns through weapon dispatch without assigning PTIME', () => {
  const { f, d } = fixture(); d.draws.push('0', '.5'); const ctx = { who: 1, player: -1n, ptime: 99n, shared: { players: f.players } };
  let turnCount = 0; finish(dispatchCommand<'input' | 'pause' | 'damage' | 'hit'>(ctx, 13, {
    *getcmd() { assert.fail(); }, *invoke() { return yield* f.run(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
    *finishTurn(movement) { assert.equal(movement, false); turnCount++; }, movementContinuation() { assert.fail(); },
  }));
  assert.equal(ctx.ptime, 99n); assert.equal(turnCount, 1); assert.equal(f.players[6].ship.shieldStrength, 800n);
});
