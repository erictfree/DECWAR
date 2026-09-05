import test from 'node:test';
import assert from 'node:assert/strict';
import { weaponFixture as fixture, done } from './support/weapon-damage-fixture.ts';
import { orderedRational as real } from './support/rational-real.ts';
import { constants as K } from '../src/generated/source-data.ts';

function base(f: ReturnType<typeof fixture>, strength = 1000n) { f.args.kind.value = 4n; f.args.index.value = 1n; f.bases[2][1].strength = strength; f.board.setdsp(12, 20, 401); }
function fixedPower(f: ReturnType<typeof fixture>, value = '1') { f.io.pwr = () => real.literal(value); }

test('PHADAM unshielded fractional damage separately truncates hull, energy and scoring assignments', () => {
  const f = fixture(); f.draws.push('0', '.5'); done(f.run());
  assert.deepEqual([f.hit.iwhat, f.hit.ihita, f.target.damage, f.target.energy, f.ctx.tpoint[K.KPEDAM]], [1n, 13249n, 13249n, 36750n, 13249n]);
  assert.equal(f.target.condition, K.RED); assert.equal(f.target.shieldStrength, 1000n); assert.equal(f.hit.shcnto, -1n);
  assert.deepEqual(f.events, ['ran', 'ran', 'pwr:2']); assert.equal(real.toInteger(f.local.rand), 99n); assert.equal(real.toInteger(f.local.ranb), 99n);
});

test('TORDAM rejects already-destroyed ships before registers/RNG; PHADAM bypasses that entry guard', () => {
  for (const reason of ['damage', 'energy'] as const) {
    const f = fixture(); if (reason === 'damage') f.target.damage = BigInt(K.KENDAM); else f.target.energy = 0n;
    f.hit.iwhat = 14n; done(f.run('tordam')); assert.equal(f.hit.iwhat, 14n); assert.deepEqual(f.events, []);
    f.draws.push('0', '.5'); done(f.run('phadam')); assert.equal(f.hit.klflg, 2n); assert.equal(f.players[6].alive, 0n); assert.equal(f.ctx.tpoint[K.KPEKIL], 5000n);
  }
});

test('TORDAM base entry guard skips RNG while PHADAM still damages a zero-strength base', () => {
  const f = fixture(); base(f, 0n); f.hit.iwhat = 8n; done(f.run('tordam')); assert.equal(f.hit.iwhat, 8n); assert.deepEqual(f.events, []);
  f.draws.push('0', '.5', '.2'); f.integers.push(1n); done(f.run('phadam')); assert.equal(f.hit.klflg, 2n); assert.equal(f.nbase[2], 0n);
});

test('TORDAM eager guard evaluation exposes BASE indexing even on a live ship', () => {
  const f = fixture(); f.io.and = (...terms) => terms.map(t => t()).every(Boolean);
  const original = f.io.base; f.io.base = (i, t) => { assert.equal(t, 0n); throw new Error('explicit BASE team zero memory'); };
  assert.throws(() => done(f.run('tordam')), /team zero/); assert.deepEqual(f.events, []); assert.equal(f.hit.iwhat, 0n); f.io.base = original;
});

test('PHADAM shielded hit halves POWFAC and computes penetration using the old shield strength', () => {
  const f = fixture(); f.target.shieldCondition = 1n; f.draws.push('0', '.5'); done(f.run());
  assert.equal(f.local.powfac, 40n); assert.equal(f.target.shieldStrength, 800n); assert.equal(f.target.damage, 0n); assert.equal(f.target.energy, 50000n);
  assert.equal(f.hit.ihita, 0n); assert.equal(f.ctx.tpoint[K.KPEDAM], 0n); assert.equal(f.hit.shstto, 800n);
});

test('PHADAM shield condition zero runs absorption without halving POWFAC', () => {
  const f = fixture(); f.target.shieldCondition = 0n; f.draws.push('0', '.5'); done(f.run());
  assert.equal(f.local.powfac, 80n); assert.equal(f.target.shieldStrength, 602n); assert.equal(f.hit.shcnto, 0n); assert.equal(f.target.damage, 0n);
});

test('PHADAM damaged attacking phasers/computer reduce damage only for PLAYER and SHIP logical truth', () => {
  for (const player of [-1n, 0n, 1n]) for (const ship of [-1n, 0n]) {
    const f = fixture(); f.ctx.player = player; f.args.ship.value = ship; f.players[1].ship.devices[K.KDCOMP] = 1n;
    f.draws.push('0', '.5'); done(f.run()); assert.equal(f.hit.ihita, player < 0n && ship < 0n ? 10599n : 13249n);
  }
});

test('PHADAM base shield subtraction and secondary hull damage truncate at distinct stages', () => {
  const f = fixture(); base(f, 750n); f.draws.push('0', '.5'); done(f.run());
  assert.equal(f.bases[2][1].strength, 583n); assert.equal(f.hit.ihita, 1656n); assert.equal(f.ctx.tpoint[K.KPBDAM], 1656n);
  assert.equal(f.hit.shstto, 583n); assert.equal(f.hit.shcnto, 1n); assert.equal(f.nbase[2], 1n);
});

test('PHADAM does not cap overfull shields or reject negative resulting damage', () => {
  const f = fixture(); fixedPower(f); f.args.phit.value = 50n; f.target.shieldCondition = 1n; f.target.shieldStrength = 1500n;
  f.draws.push('0', '0'); done(f.run()); assert.equal(f.target.shieldStrength, 1409n);
  assert.equal(f.hit.ihita, -1000n); assert.equal(f.target.damage, -1000n); assert.equal(f.target.energy, 51000n); assert.equal(f.ctx.tpoint[K.KPEDAM], -1000n);
});

test('Critical threshold includes equality; ship branch still evaluates the preceding IRAN(5)', () => {
  const f = fixture(); fixedPower(f); f.args.phit.value = 50n; f.draws.push('.325', '0', '0', '.75'); f.integers.push(5n);
  done(f.run()); assert.equal(f.hit.critdv, 1n); assert.equal(f.hit.critdm, 2000n); assert.equal(f.target.devices[1], 2000n);
  assert.equal(f.hit.ihita, 2250n); assert.equal(f.target.damage, 2250n); assert.equal(f.target.energy, 47750n); assert.equal(f.ctx.tpoint[K.KPEDAM], 2250n);
  assert.deepEqual(f.events, ['ran', 'ran', 'iran:5', 'ran', 'ran']);
});

test('Subcritical hit leaves prior critical registers intact and consumes no critical random values', () => {
  const f = fixture(); fixedPower(f); f.args.phit.value = 50n; f.draws.push('.3249', '0'); f.hit.critdv = 8n; f.hit.critdm = 19n;
  done(f.run()); assert.equal(f.hit.critdv, 8n); assert.equal(f.hit.critdm, 19n); assert.equal(f.hit.ihita, 4000n); assert.equal(f.events.length, 2);
});

test('Critical shield-device damage drops shields before status capture', () => {
  const f = fixture(); fixedPower(f); f.args.phit.value = 100n; f.target.shieldCondition = 1n; f.target.shieldStrength = 100n;
  f.draws.push('.5', '0', '0', '.5'); f.integers.push(1n); done(f.run());
  assert.equal(f.hit.critdv, BigInt(K.KDSHLD)); assert.equal(f.target.shieldCondition, -1n); assert.equal(f.hit.shcnto, -1n); assert.equal(f.hit.critdm, 1800n);
});

test('Critical device address outside KNDEV remains explicit and preserves the earlier halving/register writes', () => {
  const f = fixture(); fixedPower(f); f.args.phit.value = 50n; f.draws.push('.5', '0', '1'); f.integers.push(1n);
  assert.throws(() => done(f.run()), /SHPDAM requires/); assert.equal(f.hit.ihita, 4000n); assert.equal(f.hit.critdv, 10n);
  assert.equal(real.toInteger(f.local.hita), 2000n); assert.equal(f.target.damage, 0n); assert.equal(f.hit.critdm, 0n);
});

test('TORDAM unshielded hit consumes three RANs, retains RANB, then composes actual JUMP', () => {
  const f = fixture(); f.draws.push('.2', '.1', '.5'); done(f.run('tordam'));
  assert.equal(f.hit.ihita, 6000n); assert.equal(f.target.damage, 6000n); assert.equal(f.target.energy, 44000n); assert.equal(f.hit.shjump, 1n);
  assert.deepEqual([f.target.v, f.target.h], [13, 20]); assert.equal(f.board.disp(12, 20), 0); assert.equal(f.board.disp(13, 20), 206);
  assert.equal(real.toInteger(real.multiply(f.local.ranb, real.literal('10'))), -3n);
  assert.deepEqual(f.events.slice(0, 5), ['ran', 'ran', 'ran', 'shield-if:false', 'jump']);
});

test('TORDAM source two-label shield IF is bound explicitly, with zero condition retaining zero HITA', () => {
  const f = fixture(); f.target.shieldCondition = 0n; f.draws.push('.2', '.1', '.5'); done(f.run('tordam'));
  assert.equal(f.hit.ihita, 0n); assert.equal(f.target.damage, 0n); assert.equal(f.target.shieldStrength, 1000n); assert.equal(f.hit.shcnto, 0n);
  const g = fixture(); g.target.shieldCondition = 1n; g.draws.push('.2', '.1', '.5'); g.io.torpedoShieldBranch = test => { assert.equal(test, true); return 300; };
  done(g.run('tordam')); assert.equal(g.target.shieldStrength, 1000n); assert.equal(g.hit.ihita, 0n);
});

test('TORDAM shield deflection changes IWHAT and strength but still displaces a surviving ship', () => {
  const f = fixture(); f.target.shieldCondition = 1n; f.draws.push('.9', '.1', '.5'); done(f.run('tordam'));
  assert.equal(f.hit.iwhat, 3n); assert.equal(f.hit.ihita, 0n); assert.equal(f.target.shieldStrength, 995n); assert.equal(f.target.damage, 0n);
  assert.equal(f.ctx.tpoint[K.KPEDAM], 0n); assert.equal(f.hit.shjump, 1n); assert.equal(f.target.v, 13);
});

test('TORDAM undeflected shields use old strength for penetration and floor absorption at .1', () => {
  const f = fixture(); f.target.shieldCondition = 1n; f.target.shieldStrength = 50n; f.draws.push('0', '0', '.5'); done(f.run('tordam'));
  assert.equal(f.hit.ihita, 5700n); assert.equal(f.target.shieldStrength, 31n); assert.equal(f.target.damage, 5700n); assert.equal(f.target.energy, 44300n);
});

test('TORDAM base deflection avoids JUMP, preserves zero HITA scoring and only reduces shields', () => {
  const f = fixture(); base(f); f.draws.push('.9', '.1', '.5'); done(f.run('tordam'));
  assert.equal(f.hit.iwhat, 3n); assert.equal(f.bases[2][1].strength, 995n); assert.equal(f.hit.shstto, 995n); assert.equal(f.ctx.tpoint[K.KPBDAM], 0n);
  assert.deepEqual(f.events, ['ran', 'ran', 'ran']);
});

test('TORDAM immediate critical base branch skips ordinary penetration subtraction and scoring', () => {
  const f = fixture(); base(f, 100n); f.draws.push('0', '.5', '.5', '.2'); f.integers.push(5n, 1n); done(f.run('tordam'));
  assert.equal(f.bases[2][1].strength, 11n); assert.equal(f.hit.ihita, 5400n); assert.equal(f.hit.critdm, 1n); assert.equal(f.hit.klflg, 0n);
  assert.equal(f.ctx.tpoint[K.KPBDAM], 0n); assert.equal(f.hit.shstto, 11n); assert.equal(f.nbase[2], 1n);
});

test('TORDAM unsuccessful base critical roll instead applies ordinary damage and scoring', () => {
  const f = fixture(); base(f, 100n); f.draws.push('0', '.5', '.5'); f.integers.push(4n); done(f.run('tordam'));
  assert.equal(f.bases[2][1].strength, 27n); assert.equal(f.ctx.tpoint[K.KPBDAM], 5400n); assert.equal(f.hit.critdm, 0n);
});

test('Base destruction calls BASKIL before decrement/count/board clearing and retains negative SHSTTO in hit registers', () => {
  const f = fixture(); base(f, 50n); f.draws.push('0', '0', '.5', '.2'); f.integers.push(1n); f.numcap[2] = 1n; f.target.docked = true;
  const original = f.io.baskil; f.io.baskil = function* (team) {
    assert.equal(f.nbase[2], 1n); assert.equal(f.board.disp(12, 20), 401); assert.equal(f.bases[2][1].strength, -70n);
    yield 'base'; yield* original(team);
  };
  const g = f.run('tordam'); assert.equal(g.next().value, 'base'); assert.equal(f.ctx.tpoint[K.KPBDAM], 5700n);
  done(g); assert.equal(f.nbase[2], 0n); assert.equal(f.bases[2][1].strength, 0n); assert.equal(f.hit.shstto, -70n); assert.equal(f.hit.klflg, 2n);
  assert.equal(f.ctx.tpoint[K.KPBDAM], 15700n); assert.equal(f.target.docked, false); assert.equal(f.board.disp(12, 20), 0);
});

test('A critical base can be killed while positive, and BASKIL still sees that positive-strength adjacent port', () => {
  const f = fixture(); base(f, 100n); f.draws.push('0', '.5', '.5', '.2'); f.integers.push(5n, 10n); f.numcap[2] = 1n; f.target.docked = true;
  done(f.run('tordam')); assert.equal(f.hit.shstto, 11n); assert.equal(f.bases[2][1].strength, 0n); assert.equal(f.target.docked, true);
  assert.equal(f.ctx.tpoint[K.KPBDAM], 10000n);
});

test('TORDAM black-hole JUMP death keeps KLFLG=1 and awards kill after the second source-cell clear', () => {
  const f = fixture(); f.board.setdsp(13, 20, 1000); f.draws.push('0', '0', '.5'); done(f.run('tordam'));
  assert.equal(f.hit.klflg, 1n); assert.equal(f.hit.shjump, 1n); assert.equal(f.players[6].alive, 0n); assert.equal(f.target.damage, BigInt(K.KENDAM));
  assert.equal(f.ctx.tpoint[K.KPEKIL], 5000n); assert.equal(f.ctx.tpoint[K.KPEDAM], 6000n); assert.equal(f.board.disp(13, 20), 1000);
  assert.deepEqual(f.events.filter(e => e.startsWith('set:')), ['set:12,20,0', 'set:12,20,0']);
});

test('Stale nonzero KLFLG kills even a surviving phaser target without resetting its value', () => {
  const f = fixture(); f.draws.push('0', '.5'); f.hit.klflg = 1n; done(f.run());
  assert.equal(f.target.damage, 13249n); assert.equal(f.players[6].alive, 0n); assert.equal(f.hit.klflg, 1n); assert.equal(f.ctx.tpoint[K.KPEKIL], 5000n);
});

test('Damage scoring distinguishes enemy class and PLAYER/SHIP, while player kill bonus has no team predicate', () => {
  for (const player of [-1n, 0n]) for (const ship of [-1n, 0n]) {
    const f = fixture(); f.ctx.player = player; f.args.ship.value = ship; f.draws.push('0', '.5'); done(f.run());
    assert.equal(f.ctx.tpoint[K.KPEDAM], player < 0n && ship < 0n ? 13249n : 0n);
    assert.equal(f.ctx.rsr[K.KPEDAM], player >= 0n && ship < 0n ? 13249n : 0n);
  }
  const g = fixture(); g.args.kind.value = 1n; g.hit.klflg = 2n; g.draws.push('0', '.5'); done(g.run());
  assert.equal(g.ctx.tpoint[K.KPEDAM], 0n); assert.equal(g.ctx.tpoint[K.KPEKIL], 5000n);
});

test('Romulan base kills use RSR KPBDAM and non-ship attackers receive no damage or kill score', () => {
  for (const ship of [-1n, 0n]) {
    const f = fixture(); base(f, 50n); f.ctx.player = 0n; f.args.ship.value = ship; f.draws.push('0', '0', '.5', '.2'); f.integers.push(1n); done(f.run('tordam'));
    assert.equal(f.ctx.rsr[K.KPBDAM], ship < 0n ? 15700n : 0n); assert.equal(f.ctx.tpoint[K.KPBDAM], 0n);
  }
});

test('TORDAM does not release tractor, undock or decrement player population when directly killing a ship', () => {
  const f = fixture(); f.target.energy = 1n; f.target.docked = true; f.target.tractor = 1; f.draws.push('0', '0', '.5'); done(f.run('tordam'));
  assert.equal(f.players[6].alive, 0n); assert.equal(f.target.tractor, 1); assert.equal(f.target.docked, true); assert.equal(f.hit.klflg, 2n); assert.ok(!f.events.includes('jump'));
});

test('TORDAM clamps depleted ship shields before common shield-down logic without recomputing penetration', () => {
  const f = fixture(); f.target.shieldCondition = 1n; f.target.shieldStrength = 1n; f.draws.push('0', '0', '.5'); done(f.run('tordam'));
  assert.equal(f.target.shieldStrength, 0n); assert.equal(f.target.shieldCondition, -1n); assert.equal(f.hit.ihita, 5994n); assert.equal(f.target.damage, 5994n);
});

test('Compiler evaluation policy can skip ship-critical IRAN(5) by testing the base predicate first', () => {
  const f = fixture(); fixedPower(f); f.args.phit.value = 50n; f.draws.push('.5', '0', '0', '.5');
  f.io.and = (...terms) => [...terms].reverse().every(t => t()); done(f.run());
  assert.equal(f.hit.critdv, 1n); assert.ok(!f.events.includes('iran:5')); assert.equal(f.hit.ihita, 2000n);
});

test('PHADAM eager compound evaluation exposes the non-ship SHPCON read after its first RAN and entry writes', () => {
  const f = fixture(); f.args.kind.value = 4n; f.args.index.value = 60n; f.draws.push('0'); f.io.and = (...terms) => terms.map(t => t()).every(Boolean);
  assert.throws(() => done(f.run()), /SHPCON requires/); assert.equal(f.hit.iwhat, 1n); assert.equal(f.local.powfac, 80n); assert.deepEqual(f.events, ['ran']);
});

test('Surviving base returns at label 1300 even when KLFLG was already nonzero', () => {
  const f = fixture(); base(f); f.hit.klflg = 2n; f.draws.push('0', '.5'); done(f.run());
  assert.equal(f.bases[2][1].strength, 800n); assert.equal(f.nbase[2], 1n); assert.equal(f.hit.klflg, 2n); assert.equal(f.ctx.tpoint[K.KPBDAM], 0n);
});

test('Shared JUMP arguments remain writable and cleanup rereads the target index after a yielded call', () => {
  const f = fixture(); f.draws.push('0', '0', '.5'); Object.assign(f.players[7].ship, { v: 15, h: 20 }); f.players[7].alive = -1n; f.board.setdsp(15, 20, 207);
  f.io.jump = function* (kind, index) { assert.equal(index.value, 6n); yield 'jump'; index.value = 7n; f.hit.klflg = 1n; };
  const g = f.run('tordam'); assert.equal(g.next().value, 'jump'); assert.equal(f.ctx.tpoint[K.KPEDAM], 6000n); done(g);
  assert.equal(f.players[6].alive, -1n); assert.equal(f.players[7].alive, 0n); assert.equal(f.board.disp(15, 20), 0); assert.equal(f.ctx.tpoint[K.KPEKIL], 5000n);
});
