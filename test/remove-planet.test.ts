import test from 'node:test';
import assert from 'node:assert/strict';
import { novaFixture as fixture, done, w } from './support/nova-fixture.ts';
import { removePlanet } from '../src/game/remove-planet.ts';
import { endGame } from '../src/game/endgame.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { KilledQueue } from '../src/game/lifecycle.ts';

test('PLNRMV guard failures leave all storage unchanged and do not call ENDGAM', () => {
  for (const [i, team] of [[1n, -1n], [4n, 1n], [0n, 1n], [-1n, 1n]]) {
    const f = fixture(); const before = structuredClone(f.planets); done(f.runRemove(i, team));
    assert.deepEqual(f.planets, before); assert.equal(f.count.value, 3n); assert.deepEqual(f.events, []);
  }
});

test('PLNRMV moves four columns forward independently, keeps the old final row and decrements current board codes', () => {
  const f = fixture(); f.planets[2].builds = 7n; f.planets[3].builds = 8n;
  for (let i = 1; i <= 3; i++) f.board.setdsp(f.planets[i].v, f.planets[i].h, 600 + i);
  const last = { ...f.planets[3] }, second = { ...f.planets[2] }; done(f.runRemove());
  assert.deepEqual(f.planets[1], second); assert.deepEqual(f.planets[2], last); assert.deepEqual(f.planets[3], last); assert.equal(f.count.value, 2n);
  assert.equal(f.board.disp(second.v, second.h), 601); assert.equal(f.board.disp(last.v, last.h), 602); assert.equal(f.board.disp(12, 20), 601);
  assert.deepEqual(f.events.slice(0, 4), ['blkmov:2,1,1,2', 'blkmov:2,1,2,2', 'blkmov:2,1,3,2', 'blkmov:2,1,4,2']); assert.equal(f.endCalls, 1);
});

test('PLNRMV captured count and BASKIL occur before column moves; no-planet docking quirk remains', () => {
  const f = fixture(); f.numcap[2] = 1n; f.target.docked = true; const original = f.removeIo.baskil;
  f.removeIo.baskil = function* (team) { assert.equal(f.numcap[2], 0n); assert.equal(f.count.value, 3n); yield 'base'; yield* original(team); };
  const g = f.runRemove(1n, 2n); assert.equal(g.next().value, 'base'); assert.ok(!f.events.some(e => e.startsWith('blkmov')));
  done(g); assert.equal(f.target.docked, true); assert.equal(f.count.value, 2n);
});

test('PLNRMV neutral and out-of-team-range codes still remove planets without touching captured counts', () => {
  for (const team of [0n, 3n, 100n]) { const f = fixture(); done(f.runRemove(1n, team)); assert.equal(f.count.value, 2n); assert.deepEqual(f.numcap, [0n, 0n, 0n]); }
});

test('PLNRMV final-row removal leaves that row and board untouched but always reaches ENDGAM', () => {
  const f = fixture(); const p = { ...f.planets[3] }; f.board.setdsp(p.v, p.h, 703); done(f.runRemove(3n, 1n));
  assert.deepEqual(f.planets[3], p); assert.equal(f.board.disp(p.v, p.h), 703); assert.equal(f.count.value, 2n); assert.equal(f.endCalls, 1);
  assert.ok(!f.events.some(e => e.startsWith('blkmov')));
});

test('PLNRMV does not regenerate object classes when updating shifted display codes', () => {
  const f = fixture(); f.board.setdsp(f.planets[2].v, f.planets[2].h, 0); f.board.setdsp(f.planets[3].v, f.planets[3].h, -1); done(f.runRemove());
  assert.equal(f.board.disp(f.planets[1].v, f.planets[1].h), -1); assert.equal(f.board.disp(f.planets[2].v, f.planets[2].h), 4094);
});

test('PLNRMV reads aliased I again after BASKIL and can consequently remove a different final row', () => {
  const f = fixture(), index = w(1n); f.removeIo.baskil = function* () { index.value = 3n; };
  done(removePlanet(index, w(1n), f.count, f.removeLocal, f.removeIo)); assert.equal(f.count.value, 2n); assert.ok(!f.events.some(e => e.startsWith('blkmov')));
});

test('PLNRMV composes actual ENDGAM and preserves nonreturning exit after removing the last planet', () => {
  const f = fixture(); f.count.value = 1n; f.nbase[1] = 0n; f.nbase[2] = 1n;
  const world = { players: f.players, board: f.board, killed: new KilledQueue(), numply: 0n, numsid: [0n, 0n, 0n], endflg: 0n, hitime: 0n,
    get nplnet() { return f.count.value; }, nbase: f.nbase };
  f.removeIo.endgam = () => endGame({ who: 0, team: 1, shared: world }, f.out, {
    *kilhgh() { f.events.push('kilhgh'); }, daytime: () => 0n, *points() { return assert.fail(); }, *updsta() { assert.fail(); }, *free() { assert.fail(); },
    exit(): never { throw new Error('monitor exit'); },
  });
  assert.throws(() => done(f.runRemove()), /monitor exit/); assert.equal(f.count.value, 0n); assert.equal(world.endflg, -1n); assert.ok(f.events.includes('kilhgh'));
});
