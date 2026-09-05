import test from 'node:test';
import assert from 'node:assert/strict';
import { novaFixture as fixture, done } from './support/nova-fixture.ts';
import { SupernovaMemory } from '../src/game/supernova.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { orderedRational as real } from './support/rational-real.ts';

function empty() { const f = fixture(); f.board.setdsp(12, 20, 0); return f; }

test('SNOVA removes the initial star, resets only pointers and leaves old stack storage intact', () => {
  const f = empty(); f.board.setdsp(11, 20, 900); f.stackLocal.objptr = 5n; f.stackLocal.strptr = 8n; done(f.runStack());
  assert.equal(f.board.disp(11, 20), 0); assert.equal(f.stackLocal.objptr, 0n); assert.equal(f.stackLocal.strptr, 0n);
  assert.ok(f.memory.words.every(v => v === 99n)); assert.equal(f.ctx.tpoint[K.KNSDES], 0n); assert.equal(f.queued.length, 0);
});

test('SNOVA visits physical rows/columns then damages victims in reverse order with stored displacement', () => {
  const f = empty(); f.board.setdsp(10, 19, 101); f.board.setdsp(10, 21, 206); f.board.setdsp(12, 21, 601);
  const calls: bigint[][] = []; f.stackIo.nova = function* (kind, index) { calls.push([kind.value, index.value, f.path.h1, f.path.v1, real.toInteger(f.path.dhs), real.toInteger(f.path.dvs)]); };
  done(f.runStack()); assert.deepEqual(calls, [[6n, 1n, 12n, 21n, 1n, 1n], [2n, 6n, 10n, 21n, -1n, 1n], [1n, 1n, 10n, 19n, -1n, -1n]]);
});

test('SNOVA rereads each victim display after earlier NOVA calls mutate identity or remove it', () => {
  const f = empty(); f.board.setdsp(10, 19, 601); f.board.setdsp(10, 21, 602); f.board.setdsp(12, 21, 603);
  const ids: bigint[] = []; f.stackIo.nova = function* (_, i) { ids.push(i.value); f.board.setdsp(10, 21, 601); f.board.setdsp(10, 19, -1); };
  done(f.runStack()); assert.deepEqual(ids, [3n, 1n]);
});

test('SNOVA clears queued stars immediately and processes them LIFO, scoring only chained stars', () => {
  const f = empty(); f.board.setdsp(10, 20, 900); f.board.setdsp(11, 21, 900); f.integers.push(1n, 1n);
  done(f.runStack()); assert.deepEqual(f.queued.map(h => [h.iwhat, h.vfrom, h.hfrom]), [[7n, 11n, 21n], [7n, 10n, 20n]]);
  assert.equal(f.ctx.tpoint[K.KNSDES], -1000n); assert.equal(f.ctx.rsr[K.KNSDES], 0n); assert.deepEqual([f.path.h2, f.path.v2], [10n, 20n]);
});

test('SNOVA IRAN(5)=5 leaves a neighboring star and consumes no draw for empty cells under the selected OR policy', () => {
  const f = empty(); f.board.setdsp(10, 20, 900); f.integers.push(5n); done(f.runStack()); assert.equal(f.board.disp(10, 20), 900); assert.equal(f.queued.length, 0);
  assert.equal(f.events.filter(e => e === 'iran:5').length, 1);
});

test('SNOVA eager OR evaluates random exclusion on empty and black-hole cells too', () => {
  const f = empty(); f.stackIo.or = (...terms) => terms.map(t => t()).some(Boolean); f.stackIo.iran = () => { f.events.push('eager-ran'); return 1n; };
  done(f.runStack()); assert.equal(f.events.filter(e => e === 'eager-ran').length, 9);
});

test('SNOVA pending star cap is 29 despite 80-row storage and still draws before the capacity check', () => {
  const f = empty(); Object.assign(f.path, { h2: 15n, v2: 15n });
  for (let v = 8; v <= 23; v++) for (let h = 8; h <= 23; h++) f.board.setdsp(v, h, 900);
  let peak = 0n, drawsAtCapacity = 0;
  f.stackIo.iran = () => { peak = f.stackLocal.strptr > peak ? f.stackLocal.strptr : peak; if (f.stackLocal.strptr === 29n) drawsAtCapacity++; return 1n; };
  done(f.runStack()); assert.equal(peak, 29n); assert.ok(drawsAtCapacity > 0); assert.equal(f.memory.star(30n, 1n).value, 99n); assert.equal(f.memory.star(30n, 2n).value, 99n);
});

test('SNLOCL matrix indexing preserves out-of-row aliases rather than inventing separate dynamic stacks', () => {
  const m = new SupernovaMemory(0n); m.object(9n, 1n).value = 77n; assert.equal(m.object(1n, 2n).value, 77n);
  m.object(9n, 4n).value = 88n; assert.equal(m.star(1n, 1n).value, 88n); assert.throws(() => m.star(81n, 2n), /surrounding/);
});

test('SNOVA clamps the neighborhood at galaxy corners and retains loop post-values', () => {
  const f = empty(); Object.assign(f.path, { h2: 1n, v2: 1n }); let reads = 0; const original = f.stackIo.dispc;
  f.stackIo.dispc = (v, h) => { assert.ok(v >= 1n && h >= 1n); reads++; return original(v, h); }; done(f.runStack());
  assert.equal(reads, 4); assert.equal(f.stackLocal.v, 3n); assert.equal(f.stackLocal.h, 3n);
});

test('SNOVA scores chained stars after MAKHIT returns using the then-current PLAYER word', () => {
  const f = empty(); f.board.setdsp(10, 20, 900); f.integers.push(1n); const original = f.stackIo.makhit;
  f.stackIo.makhit = function* () { yield 'hit'; yield* original(); }; const g = f.runStack(); assert.equal(g.next().value, 'hit');
  assert.equal(f.ctx.tpoint[K.KNSDES], 0n); f.ctx.player = 0n; done(g); assert.equal(f.ctx.rsr[K.KNSDES], -500n);
});

test('SNOVA composes actual NOVA device damage, displacement and hit queue delivery for a nearby ship', () => {
  const f = fixture(); f.draws.push(...Array(10).fill('0')); f.integers.push(1n); done(f.runStack());
  assert.equal(f.target.damage, 8001n); assert.equal(f.target.v, 13); assert.equal(f.queue.serial, 1n); assert.equal(f.queued[0].iwhat, 8n);
  assert.equal(f.queued[0].vfrom, 11n); assert.equal(f.queued[0].vto, 13n); assert.equal(f.ctx.tpoint[K.KPEDAM], 8001n);
});
