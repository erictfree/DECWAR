import test from 'node:test';
import assert from 'node:assert/strict';
import { novaFixture as fixture, done } from './support/nova-fixture.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { orderedRational as real } from './support/rational-real.ts';

function shipDraws(f: ReturnType<typeof fixture>, device = '0', energy = '0', hit = 1n) { f.draws.push(...Array(9).fill(device), energy); f.integers.push(hit); }
function planet(f: ReturnType<typeof fixture>, builds: bigint, code = 601) { f.planets[1].builds = builds; f.board.setdsp(12, 20, code); }

test('NOVA ship damage visits all nine devices then uses a separate random energy fraction', () => {
  const f = fixture(); shipDraws(f, '.25', '.5', 100n); done(f.run());
  assert.deepEqual(f.target.devices.slice(1), Array(9).fill(1000n)); assert.equal(f.target.damage, 8100n); assert.equal(f.target.energy, 45950n);
  assert.equal(f.target.v, 13); assert.equal(f.queued[0].ihita, 8100n); assert.equal(f.queued[0].iwhat, 8n); assert.equal(f.ctx.tpoint[K.KPEDAM], 8100n);
  assert.deepEqual(f.events.slice(0, 11), [...Array(9).fill('ran'), 'iran:1000', 'ran']);
});

test('NOVA D floor is 250 only below 200, and positive shields lose 300 minus IRAN(100)', () => {
  for (const strength of [800n, 801n, 900n]) {
    const f = fixture(); f.target.shieldCondition = 1n; f.target.shieldStrength = strength; shipDraws(f); f.integers.push(50n); done(f.run());
    const d = strength === 800n ? 200n : 250n; assert.equal(f.local.d, d); assert.equal(f.target.damage, d * 8n + 1n);
    assert.equal(f.target.shieldStrength, strength - 250n); assert.equal(f.queued[0].shcnto, 1n);
  }
});

test('NOVA critical shield device drops shields before the later shield-loss draw', () => {
  const f = fixture(); f.target.shieldCondition = 1n; f.target.devices[K.KDSHLD] = BigInt(K.KCRIT); shipDraws(f); done(f.run());
  assert.equal(f.target.shieldCondition, -1n); assert.equal(f.target.shieldStrength, 1000n); assert.ok(!f.events.includes('iran:100'));
});

test('NOVA zero shield condition uses full D and does not take the positive-shield loss branch', () => {
  const f = fixture(); f.target.shieldCondition = 0n; shipDraws(f); done(f.run());
  assert.equal(f.local.d, 1000n); assert.equal(f.target.damage, 8001n); assert.equal(f.target.shieldStrength, 1000n); assert.equal(f.queued[0].shcnto, 0n);
});

test('NOVA damage/scoring does not require an alive target and kill bonus goes directly to team scores', () => {
  const f = fixture(); f.players[6].alive = 0n; f.target.damage = BigInt(K.KENDAM); shipDraws(f); done(f.run());
  assert.equal(f.target.damage, BigInt(K.KENDAM) + 8001n); assert.equal(f.queued[0].klflg, 2n); assert.equal(f.ctx.tpoint[K.KPEKIL], 0n);
  assert.equal(f.scores.team(1, K.KPEKIL), 5000n); assert.equal(f.board.disp(12, 20), 0);
});

test('NOVA allied ship damage and kill reduce player damage and direct team kill scores', () => {
  const f = fixture(); f.target.energy = 1n; shipDraws(f, '0', '1'); done(f.run(1n, 6n));
  assert.equal(f.ctx.tpoint[K.KPEDAM], -8001n); assert.equal(f.scores.team(1, K.KPEKIL), -5000n); assert.equal(f.ctx.tpoint[K.KPEKIL], 0n);
});

test('NOVA non-player ship destruction awards RSR damage and kills without changing TMSCOR', () => {
  const f = fixture(); f.ctx.player = 0n; f.target.energy = 1n; shipDraws(f, '0', '1'); done(f.run());
  assert.equal(f.ctx.rsr[K.KPEDAM], 8001n); assert.equal(f.ctx.rsr[K.KPEKIL], 5000n); assert.equal(f.scores.team(1, K.KPEKIL), 0n);
});

test('NOVA black-hole displacement overwrites JUMP destination with the dead ship’s old stored coordinates', () => {
  const f = fixture(); f.board.setdsp(13, 20, 1000); shipDraws(f); done(f.run());
  assert.equal(f.queued[0].shjump, 1n); assert.equal(f.queued[0].klflg, 1n); assert.equal(f.queued[0].vto, 12n); assert.equal(f.target.v, 12);
  assert.equal(f.scores.team(1, K.KPEKIL), 5000n); assert.equal(f.board.disp(13, 20), 1000);
});

test('NOVA damage notice is queued before actual TRCOFF paired release and its second notification', () => {
  const f = fixture(); f.target.tractor = 1; f.players[1].ship.tractor = 6; shipDraws(f); done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [8n, 14n]); assert.equal(f.target.tractor, 0); assert.equal(f.players[1].ship.tractor, 0);
  assert.equal(f.queued[1].dbits, 33n); assert.equal(f.queued[1].ihita, 0n);
});

test('NOVA intact-base distress clears computed IHITA before the later damage notice', () => {
  const f = fixture(); f.board.setdsp(12, 20, 401); f.integers.push(1n, 50n); done(f.run(4n, 1n));
  assert.equal(f.bases[2][1].strength, 750n); assert.deepEqual(f.queued.map(h => h.iwhat), [9n, 8n]);
  assert.equal(f.queued[0].ihita, 2001n); assert.equal(f.queued[1].ihita, 0n); assert.equal(f.ctx.tpoint[K.KPBDAM], 2001n);
  assert.equal(f.bases[2][1].v, 13); assert.equal(f.queued[1].vfrom, 11n);
});

test('NOVA base destruction decrements NBASE before BASKIL, then sends a hit before clearing the board', () => {
  const f = fixture(); f.bases[2][1].strength = 100n; f.board.setdsp(12, 20, 401); f.integers.push(1n, 1n);
  const original = f.io.baskil; f.io.baskil = function* (team) {
    assert.equal(f.nbase[2], 0n); assert.equal(f.board.disp(12, 20), 401); yield 'base'; yield* original(team);
  };
  const g = f.run(4n, 1n); assert.equal(g.next().value, 'base'); assert.equal(f.queued.length, 0); done(g);
  assert.deepEqual(f.queued.map(h => h.iwhat), [8n, 10n]); assert.equal(f.queued[0].ihita, 7201n); assert.equal(f.queued[0].klflg, 2n);
  assert.equal(f.ctx.tpoint[K.KPBDAM], 17201n); assert.equal(f.board.disp(12, 20), 0); assert.equal(f.queued[1].ihita, 0n);
});

test('NOVA allied-base and non-player penalties retain their distinct score directions', () => {
  const f = fixture(); f.bases[1][1].strength = 100n; f.integers.push(1n, 1n); done(f.run(3n, 1n)); assert.equal(f.ctx.tpoint[K.KPBDAM], -17201n);
  const g = fixture(); g.ctx.player = 0n; g.bases[2][1].strength = 100n; g.integers.push(1n, 1n); done(g.run(4n, 1n)); assert.equal(g.ctx.rsr[K.KPBDAM], 17201n);
});

test('NOVA Romulan survival halves EROM after JUMP and scores the remaining half without any random draw', () => {
  const f = fixture(); done(f.run(5n, 0n)); assert.equal(f.shared.erom, 500n); assert.equal(f.ctx.tpoint[K.KPRKIL], 500n);
  assert.equal(f.queued[0].dispto, 500n); assert.equal(f.queued[0].shstto, 500n); assert.equal(f.board.disp(21, 30), 501);
  assert.ok(!f.events.some(e => e.startsWith('iran') || e === 'ran'));
});

test('NOVA Romulan black-hole death skips halving and applies kill adjustment after notification', () => {
  for (const player of [-1n, 0n]) {
    const f = fixture(); f.ctx.player = player; f.board.setdsp(21, 30, 1000); done(f.run(5n, 1n));
    assert.equal(f.shared.rom, 0n); assert.equal(f.shared.erom, 1001n); assert.equal(f.queued[0].klflg, 1n); assert.equal(f.queued[0].vto, 20n);
    assert.equal(player < 0n ? f.ctx.tpoint[K.KPRKIL] : f.ctx.rsr[K.KPRKIL], player < 0n ? 6001n : -6001n);
  }
});

test('NOVA planet lock failure leaves initial hit fields and coordinates but no damage, message or unlock', () => {
  const f = fixture(); planet(f, 5n); f.io.lockPlanet = function* () { yield 'lock'; return false; };
  const g = f.run(6n, 1n); assert.equal(g.next().value, 'lock'); assert.equal(f.hit.iwhat, 8n); done(g);
  assert.equal(f.planets[1].builds, 5n); assert.equal(f.queued.length, 0); assert.ok(!f.events.includes('unlock'));
});

test('NOVA exactly-zero planet builds survive; negative builds send a kill before actual removal', () => {
  const f = fixture(); planet(f, 3n); done(f.run(6n, 1n)); assert.equal(f.count.value, 3n); assert.equal(f.planets[1].builds, 0n); assert.equal(f.queued[0].klflg, 0n);
  const g = fixture(); planet(g, 2n); g.board.setdsp(g.planets[2].v, g.planets[2].h, 602); g.board.setdsp(g.planets[3].v, g.planets[3].h, 603);
  done(g.run(6n, 1n)); assert.equal(g.count.value, 2n); assert.equal(g.queued[0].klflg, 2n); assert.equal(g.queued[0].shstto, 0n);
  assert.equal(g.ctx.tpoint[K.KNPDES], -1000n); assert.equal(g.board.disp(12, 20), 0); assert.equal(g.endCalls, 1);
  assert.ok(g.events.indexOf('makhit') < g.events.indexOf('plnrmv:1')); assert.equal(g.events.at(-1), 'unlock');
});

test('NOVA planet removal rereads actual ownership after the hit notification and applies RSR penalty for non-player', () => {
  const f = fixture(); planet(f, 2n); f.ctx.player = 0n; f.numcap[2] = 1n; const original = f.io.makhit;
  f.io.makhit = function* () { yield* original(); f.board.setdsp(12, 20, 801); };
  done(f.run(6n, 1n)); assert.equal(f.numcap[2], 0n); assert.equal(f.local.pteam, 2n); assert.equal(f.ctx.rsr[K.KNPDES], -1000n);
});

test('NOVA does not use cleared KLFLG to decide removal and rereads builds after MAKHIT yields', () => {
  const f = fixture(); planet(f, 2n); const original = f.io.makhit;
  f.io.makhit = function* () { yield 'hit'; yield* original(); f.planets[1].builds = 1n; };
  const g = f.run(6n, 1n); assert.equal(g.next().value, 'hit'); assert.equal(f.hit.klflg, 2n); done(g);
  assert.equal(f.count.value, 3n); assert.equal(f.ctx.tpoint[K.KNPDES], 0n); assert.equal(f.queued[0].klflg, 2n);
});

test('NOVA nonreturning PLNRMV/ENDGAM path does not invent a final unlock', () => {
  const f = fixture(); planet(f, 2n); f.removeIo.endgam = function* () { throw new Error('monitor exit'); };
  assert.throws(() => done(f.run(6n, 1n)), /monitor exit/); assert.equal(f.count.value, 2n); assert.ok(!f.events.includes('unlock'));
});

test('NOVA PRIDIS receives live hit-coordinate references for planet notifications', () => {
  const f = fixture(); planet(f, 5n); const original = f.io.pridis;
  f.io.pridis = (v, h, limit, flag, zero) => {
    assert.equal(v.value, 12n); f.hit.vto = 50n; assert.equal(v.value, 50n); f.hit.vto = 12n;
    original(v, h, limit, flag, zero);
  };
  done(f.run(6n, 1n)); assert.equal(f.queued[0].vto, 12n); assert.equal(f.planets[1].builds, 2n);
});
