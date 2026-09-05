import test from 'node:test';
import assert from 'node:assert/strict';
import { romulanTorpedoFixture as fixture, w } from './support/romulan-torpedo-fixture.ts';
import { romulanDistance, romulanStar, RomulanStarLocals, DistanceMemory } from '../src/game/romulan-target.ts';

function run(f: ReturnType<typeof fixture>) { const ip = w(0n), np = w(0n), num = w(0n); f.io.dist(ip, np, num); return [ip.value, np.value, num.value]; }

test('DIST selects nearest per squared distance but returns Chebyshev PDIST, preserving physical memory columns', () => {
  const f = fixture(); assert.deepEqual(run(f), [6n, 2n, 2n]); assert.equal(f.memory.field(3, 2n).value, 4n);
  assert.deepEqual(f.memory.words.slice(0, 4), [50n, 12n, 77n, 77n]); assert.equal(f.memory.field(2, 2n).value, 6n);
});

test('DIST squared-distance selection differs from minimizing returned PDIST', () => {
  const f = fixture(); Object.assign(f.players[1].ship, { v: 13, h: 23 }); f.board.setdsp(13, 23, 101);
  f.target.v = 14; f.board.setdsp(12, 20, 0); f.board.setdsp(14, 20, 206); assert.deepEqual(run(f), [6n, 2n, 4n]);
});

test('DIST Federation ALIVE gate differs from Klingon nonzero-position gate', () => {
  const f = fixture(); f.players[1].alive = 0n; f.players[6].alive = 0n; assert.deepEqual(run(f), [6n, 2n, 2n]);
  assert.equal(f.memory.field(3, 1n).value, 5626n); f.target.v = 0; f.integers.push(2n, 2n, 2n); run(f); assert.equal(f.memory.field(3, 2n).value, 5626n);
});

test('DIST accepts a negative base display sentinel but rejects it for a ship', () => {
  const f = fixture(); f.nbase[1] = 1n; Object.assign(f.bases[1][1], { v: 9, h: 20, strength: 1n });
  f.distanceIo.disp = (v, h) => v === 9n ? -1n : v === 12n ? -1n : 101n; assert.deepEqual(run(f), [1n, 3n, 1n]);
});

test('DIST within-class ties preserve the first physical slot without a random draw', () => {
  const f = fixture(); Object.assign(f.players[7].ship, { v: 10, h: 22 }); f.board.setdsp(10, 22, 207);
  assert.deepEqual(run(f), [6n, 2n, 2n]); assert.equal(f.events.filter(e => e.startsWith('iran')).length, 0);
});

test('DIST cross-class ties consume independent ordered IRAN draws and later classes may replace the earlier winner', () => {
  const f = fixture(); Object.assign(f.players[1].ship, { v: 8, h: 20 }); f.board.setdsp(8, 20, 101);
  f.nbase[1] = 1n; f.nbase[2] = 1n; Object.assign(f.bases[1][1], { v: 10, h: 18, strength: 1n }); Object.assign(f.bases[2][1], { v: 10, h: 22, strength: 1n });
  f.board.setdsp(10, 18, 301); f.board.setdsp(10, 22, 401); f.integers.push(1n, 2n, 1n); assert.deepEqual(run(f), [1n, 4n, 2n]); assert.equal(f.integers.length, 0);
});

test('DIST compiler eager boolean evaluation consumes three tie draws even when distances are unequal', () => {
  const f = fixture(); f.distanceIo.and = (...terms) => terms.map(t => t()).every(Boolean); f.distanceIo.or = (...terms) => terms.map(t => t()).some(Boolean);
  f.integers.push(1n, 1n, 1n); assert.deepEqual(run(f), [6n, 2n, 2n]); assert.equal(f.integers.length, 0);
});

test('DIST clears only Z and can return a stale previously selected target when all candidates disappear', () => {
  const f = fixture(); run(f); f.players[1].alive = 0n; f.target.v = 0; f.integers.push(1n, 2n, 2n);
  assert.deepEqual(run(f), [6n, 2n, 2n]); assert.deepEqual(f.memory.words.slice(12), [5626n, 5626n, 5626n, 5626n]);
});

test('DIST finite sentinel ignores an actual candidate farther than KGALV*KGALH squared units', () => {
  const f = fixture(); Object.assign(f.shared.locr, { v: 1, h: 1 }); Object.assign(f.players[1].ship, { v: 75, h: 75 }); f.board.setdsp(75, 75, 101); f.target.v = 0;
  f.integers.push(2n, 2n, 2n); assert.deepEqual(run(f), [77n, 1n, 76n]); assert.equal(f.memory.field(3, 1n).value, 5626n);
});

test('DIST aliases IP/NP and rereads the changed class before constructing PDIST arguments', () => {
  const f = fixture(); const both = w(0n), num = w(0n); f.players[6].ship.v = 0; Object.assign(f.players[3].ship, { v: 11, h: 20 });
  f.players[3].alive = -1n; f.board.setdsp(11, 20, 103); romulanDistance(both, both, num, f.shared.locr, f.memory, f.dl, f.distanceIo);
  assert.equal(both.value, 3n); assert.equal(num.value, 67n); // V(3)/H(3) still hold 77,77.
});

test('DISTLC preserves physical aliasing between columns and rejects unavailable surrounding memory', () => {
  const m = new DistanceMemory(0n); m.field(0, 5n).value = 77n; assert.equal(m.field(1, 1n).value, 77n);
  assert.throws(() => m.field(3, 5n), /surrounding/);
});

test('ROMSTR chooses the first row-major star, including the target cell, and captures bounds before overwriting arguments', () => {
  const f = fixture(); f.board.setdsp(11, 21, 900); f.board.setdsp(12, 20, 900); const v = w(12n), h = w(20n);
  f.io.romstr(v, h); assert.deepEqual([v.value, h.value], [11n, 21n]); assert.equal(f.sl.ivf, 11n); assert.equal(f.sl.ihl, 21n);
});

test('ROMSTR clamps to galaxy edges and leaves target coordinates unchanged without stars', () => {
  const local = new RomulanStarLocals(), v = w(1n), h = w(75n), visited: bigint[][] = [];
  romulanStar(v, h, local, { dispc(i, j) { visited.push([i, j]); return 0n; } });
  assert.deepEqual(visited, [[1n, 74n], [1n, 75n], [2n, 74n], [2n, 75n]]); assert.deepEqual([v.value, h.value], [1n, 75n]);
  assert.equal(local.i, 3n); assert.equal(local.j, 76n);
});

test('ROMSTR aliased output coordinates preserve V then H write order', () => {
  const f = fixture(); f.board.setdsp(11, 13, 900); const both = w(12n); f.io.romstr(both, both); assert.equal(both.value, 13n);
});

test('ROMSTR exceptional reversed bounds require an explicit compiler loop contract', () => {
  const local = new RomulanStarLocals(), v = w(100n), h = w(20n); assert.throws(() => romulanStar(v, h, local, { dispc: () => 0n }), /compiler contract/);
  romulanStar(v, h, local, { dispc: () => assert.fail(), reversedLoop: () => ({ iterations: [], after: 101n }) }); assert.equal(local.i, 101n);
});
