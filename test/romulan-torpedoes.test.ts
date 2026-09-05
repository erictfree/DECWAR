import test from 'node:test';
import assert from 'node:assert/strict';
import { romulanTorpedoFixture as fixture, done } from './support/romulan-torpedo-fixture.ts';
import { romulanTorpedoes } from '../src/game/romulan-torpedoes.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { outHit } from '../src/game/out-hit.ts';

function miss(f: ReturnType<typeof fixture>, count = 3) { f.draws.push(...Array(count * 2).fill('.5')); f.integers.push(...Array<bigint>(count).fill(1n)); }
function collision(f: ReturnType<typeof fixture>, draw = 1n) { miss(f, 1); f.integers.push(draw); }
function shipShots(f: ReturnType<typeof fixture>, count = 3) {
  for (let i = 0; i < count; i++) { f.draws.push('.5', '.5', '0', '0', '.5'); f.integers.push(1n, 1n); }
}

test('ROMTOR misses are silent, retain hit metadata and do not retarget; all three shots recharge', () => {
  const f = fixture(0); f.hit.iwhat = 9n; miss(f); done(f.run()); assert.equal(f.local.id, 4n); assert.equal(f.local.tpaus, 9000n);
  assert.equal(f.ctx.rtpaus, 10000n); assert.equal(f.hit.iwhat, 9n); assert.equal(f.queued.length, 0); assert.equal(f.out.drain(), '');
  assert.ok(!f.events.includes('dist')); assert.deepEqual([f.iv.value, f.ih.value], [2n, 0n]); assert.equal(f.draws.length, 0);
});

test('ROMTOR misfire still fires the current shot and consumes a normal deflection draw before aborting the next iteration', () => {
  const f = fixture(0); f.draws.push('.5', '.5', '.5', '.5'); f.integers.push(97n); done(f.run());
  assert.equal(f.local.id, 2n); assert.equal(f.local.misfir, -1n); assert.equal(f.ctx.rtpaus, 4000n); assert.equal(f.local.tpaus, 3000n);
  assert.deepEqual(f.events, ['ran', 'iran:100', 'ran', 'ran', 'check:8', 'ran', 'clock']);
});

test('ROMTOR strict misfire threshold and signed range truncation match the source', () => {
  const f = fixture(0); f.draws.push('.5', '0', '.5', '.625', '.5', '.999'); f.integers.push(96n, 96n, 96n); done(f.run());
  assert.equal(f.local.misfir, 0n); assert.deepEqual(f.events.filter(e => e.startsWith('check')), ['check:7', 'check:9', 'check:10']);
});

test('ROMTOR real three-shot burst retargets displaced ships through DIST/ROMSTR and credits RSR', () => {
  const f = fixture(); shipShots(f); done(f.run()); assert.equal(f.target.v, 15); assert.equal(f.target.damage, 18000n); assert.equal(f.target.energy, 32000n);
  assert.equal(f.ctx.rsr[K.KPEDAM], 18000n); assert.deepEqual(f.queued.map(h => [h.iwhat, h.vto, h.dispfr]), [[2n, 13n, 500n], [2n, 14n, 500n], [2n, 15n, 500n]]);
  assert.equal(f.events.filter(e => e === 'dist').length, 3); assert.equal(f.events.filter(e => e === 'romstr').length, 3);
  assert.deepEqual([f.iv.value, f.ih.value], [5n, 0n]); assert.equal(f.draws.length, 0); assert.equal(f.integers.length, 0);
});

test('ROMTOR killing its only nearby target stops after DIST returns a distant candidate', () => {
  const f = fixture(); f.target.energy = 1n; shipShots(f, 1); done(f.run());
  assert.equal(f.players[6].alive, 0n); assert.equal(f.ctx.rsr[K.KPEKIL], 5000n); assert.equal(f.ctx.rsr[K.KPEDAM], 6000n);
  assert.equal(f.local.id, 1n); assert.equal(f.ctx.rtpaus, 4000n); assert.equal(f.local.num99, 40n); assert.ok(!f.events.includes('romstr'));
});

test('ROMTOR releases an active tractor after the hit notification and preserves subsequent retargeting', () => {
  const f = fixture(); f.target.tractor = 1; f.players[1].ship.tractor = 6; shipShots(f); done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [2n, 14n, 2n, 2n]); assert.equal(f.target.tractor, 0); assert.equal(f.players[1].ship.tractor, 0);
});

test('ROMTOR forces IWHAT two after actual TORDAM deflects, retaining zero damage and shield loss', () => {
  const f = fixture(); f.target.shieldCondition = 1n; f.io.dist = (_i, _k, n) => { n.value = 99n; };
  f.draws.push('.5', '.5', '.9', '0', '.5'); f.integers.push(1n, 1n); done(f.run());
  assert.equal(f.queued[0].iwhat, 2n); assert.equal(f.queued[0].ihita, 0n); assert.equal(f.queued[0].shjump, 1n);
  assert.equal(f.target.damage, 0n); assert.equal(f.target.v, 13); assert.equal(f.ctx.rtpaus, 4000n);
});

test('ROMTOR TORDAM receives one IDUM reference twice and source fields are populated only after it returns', () => {
  const f = fixture(); collision(f); f.io.dist = (_i, _k, n) => { n.value = 99n; };
  f.hit.dispfr = 77n; f.io.tordam = function* (_k, _j, a, b, source) {
    assert.equal(a, b); assert.equal(source.value, -1n); assert.equal(f.hit.dispfr, 77n); a.value = 123n;
    yield 'damage'; f.shared.erom = 333n;
  };
  const g = f.run(); assert.equal(g.next().value, 'damage'); assert.equal(f.ctx.rtpaus, 77n); done(g);
  assert.equal(f.local.idum.value, 123n); assert.equal(f.queued[0].shstfr, 333n); assert.equal(f.queued[0].dispfr, 500n);
});

test('ROMTOR full-base distress and destruction retain separate register-clearing and score behavior', () => {
  const f = fixture(401); f.target.v = 0; f.io.dist = (_i, _k, n) => { n.value = 99n; }; shipShots(f, 1); done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [9n, 2n]); assert.equal(f.queued[0].dispfr, 0n); assert.equal(f.queued[1].dispfr, 500n);
  const g = fixture(401); g.bases[2][1].strength = 50n; g.target.v = 0; shipShots(g, 1); g.draws.push('.2'); g.integers.push(1n); done(g.run());
  assert.deepEqual(g.queued.map(h => h.iwhat), [2n, 10n]); assert.equal(g.queued[1].dispfr, 0n); assert.equal(g.ctx.rsr[K.KPBDAM], 15700n);
  assert.equal(g.nbase[2], -1n); // Deliberately inconsistent fixture count is decremented, not repaired.
});

test('ROMTOR black-hole collision consumes the collision draw, retargets, and emits no miss notice', () => {
  const f = fixture(1000); f.target.v = 0; collision(f); done(f.run()); assert.equal(f.queued.length, 0); assert.equal(f.ctx.rtpaus, 4000n);
  assert.equal(f.board.disp(12, 20), 1000); assert.ok(f.events.includes('dist')); assert.equal(f.integers.length, 0);
});

test('ROMTOR unaffected star silently retargets, without nova or star-score charge', () => {
  const f = fixture(900); f.target.v = 0; collision(f, 81n); done(f.run()); assert.equal(f.queued.length, 0);
  assert.equal(f.board.disp(12, 20), 900); assert.equal(f.ctx.rsr[K.KNSDES], 0n); assert.ok(!f.events.includes('snova'));
});

test('ROMTOR star hit composes actual SNOVA and charges the initial star to RSR', () => {
  const f = fixture(900); f.target.v = 0; collision(f, 80n); done(f.run()); assert.equal(f.queued[0].iwhat, 7n);
  assert.equal(f.ctx.rsr[K.KNSDES], -500n); assert.equal(f.board.disp(12, 20), 0); assert.equal(f.ctx.rtpaus, 4000n);
});

test('ROMTOR nova self-destruction returns before assigning RTPAUS, preserving earlier damage and score effects', () => {
  const f = fixture(0); f.target.v = 0; f.board.setdsp(11, 20, 900); f.board.setdsp(9, 20, 1000); collision(f, 80n); done(f.run());
  assert.equal(f.shared.rom, 0n); assert.equal(f.ctx.rtpaus, 77n); assert.equal(f.local.tpaus, 3000n); assert.equal(f.clocks.length, 1);
  assert.deepEqual(f.queued.map(h => h.iwhat), [7n, 8n]); assert.equal(f.ctx.rsr[K.KNSDES], -500n); assert.equal(f.board.disp(10, 20), 0);
});

test('ROMTOR planet threshold reuses collision ARAN with inclusive 75 and performs no IRAN(4)', () => {
  for (const draw of [74n, 75n]) {
    const f = fixture(601); f.target.v = 0; f.planets[1].builds = 1n; collision(f, draw); done(f.run());
    assert.equal(f.planets[1].builds, draw === 75n ? 0n : 1n); assert.equal(f.count.value, 3n);
    assert.equal(f.queued[0].shstto, draw === 75n ? 0n : 1n); assert.ok(!f.events.includes('iran:4')); assert.equal(f.integers.length, 0);
  }
});

test('ROMTOR actual planet removal precedes notification and awards the Romulan penalty', () => {
  const f = fixture(801); f.target.v = 0; f.planets[1].builds = 0n; f.numcap[2] = 1n; collision(f, 75n); done(f.run());
  assert.equal(f.count.value, 2n); assert.equal(f.numcap[2], 0n); assert.equal(f.ctx.rsr[K.KNPDES], -1000n);
  assert.equal(f.queued[0].klflg, 2n); assert.equal(f.queued[0].dispto, 801n); assert.ok(f.events.indexOf('plnrmv') < f.events.indexOf('unlock'));
});

test('ROMTOR planet lock failure consumes three shots without retargeting, messages or unlocking', () => {
  const f = fixture(601); for (let n = 0; n < 3; n++) collision(f, 75n); f.io.lockPlanet = function* () { return false; }; done(f.run());
  assert.equal(f.ctx.rtpaus, 10000n); assert.equal(f.queued.length, 0); assert.equal(f.planets[1].builds, 5n);
  assert.ok(!f.events.includes('dist')); assert.ok(!f.events.includes('unlock')); assert.equal(f.hit.iwhat, 2n);
});

test('ROMTOR reads current CHECK code and ARAN after the planet lock returns', () => {
  const f = fixture(601); f.target.v = 0; collision(f, 74n); f.io.lockPlanet = function* () { yield 'lock'; return true; };
  const g = f.run(); assert.equal(g.next().value, 'lock'); f.path.dcode = 802n; f.local.aran = 75n; f.planets[2].builds = 1n; done(g);
  assert.equal(f.planets[1].builds, 5n); assert.equal(f.planets[2].builds, 0n); assert.equal(f.queued[0].dispto, 601n);
});

test('ROMTOR stale KLFLG removes positive-build planets and nonreturning removal bypasses recharge/unlock', () => {
  const f = fixture(601); f.target.v = 0; f.hit.klflg = 1n; collision(f); f.removeIo.endgam = function* () { throw new Error('fixture monitor exit'); };
  assert.throws(() => done(f.run()), /monitor exit/); assert.equal(f.count.value, 2n); assert.equal(f.ctx.rsr[K.KNPDES], -1000n);
  assert.equal(f.ctx.rtpaus, 77n); assert.ok(!f.events.includes('unlock')); assert.equal(f.queued.length, 0);
});

test('ROMTOR retargets even after its third shot and ROMSTR can redirect the caller vector to a star', () => {
  const f = fixture(); shipShots(f); const original = f.io.dist;
  f.io.dist = (...args) => { original(...args); if (f.local.id === 3n) f.board.setdsp(14, 21, 900); };
  done(f.run()); assert.deepEqual([f.iv.value, f.ih.value], [4n, 1n]); assert.equal(f.local.id, 4n);
});

test('ROMTOR actual CHECK preserves ROMDRV direction aliases instead of copying their initial relative values', () => {
  const f = fixture(0); f.path.h1 = 2n; f.path.v1 = 0n; f.draws.push('.5', '.5', '.5', ...Array(4).fill('.5'), '.5'); f.integers.push(97n);
  const iv = { get value() { return f.path.h1; }, set value(n) { f.path.h1 = n; } }, ih = { get value() { return f.path.v1; }, set value(n) { f.path.v1 = n; } };
  done(romulanTorpedoes(iv, ih, f.ctx, f.local, f.path, f.hit, f.io));
  assert.deepEqual([f.path.h2, f.path.v2], [14n, 28n]); assert.deepEqual([iv.value, ih.value], [14n, 28n]); assert.equal(f.draws.length, 0);
});

test('ROMTOR packed hit delivery produces the source Romulan damage text', () => {
  const f = fixture(); shipShots(f, 1); f.io.dist = (_i, _k, n) => { n.value = 99n; }; done(f.run());
  done(outHit({ who: 6, team: 2, oflg: 0, ocflg: K.KABS, nomsg: 0n, ship: f.target }, f.hit, f.players, f.out,
    function* (who) { f.queue.get(who, f.hit, f.players); }));
  assert.equal(f.out.drain(), '?? @10-20 +100.1%  600.0 unit T  C -->13-20, -100.0%\r\n');
});
