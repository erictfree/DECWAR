import test from 'node:test';
import assert from 'node:assert/strict';
import { priorityDistance, PriorityDistanceLocals } from '../src/game/priority-distance.ts';
import { damageRomulan } from '../src/game/romulan-damage.ts';
import { emptyHit } from '../src/game/hit-queue.ts';
import { ldis, PackedBoard } from '../src/compat/board.ts';
import { playerSlots } from '../src/game/player.ts';
import { messageBits } from '../src/game/message-memory.ts';
const w = (value: bigint) => ({ value });

function recipients() {
  const players = playerSlots(), hit = { dbits: 0n }, local = new PriorityDistanceLocals();
  for (let i = 1; i <= 10; i++) { players[i].alive = -1n; Object.assign(players[i].ship, { v: 30, h: 30 }); }
  const seen: number[] = [];
  const io = {
    alive: (i: number) => players[i].alive,
    position: (i: number) => { seen.push(i); return { v: BigInt(players[i].ship.v), h: BigInt(players[i].ship.h) }; },
    bits: (i: number) => messageBits(i, () => { assert.fail(); }),
    ldis: (v: bigint, h: bigint, pv: bigint, ph: bigint, limit: bigint) => ldis(Number(v), Number(h), Number(pv), Number(ph), Number(limit)),
  };
  const run = (flag = 0n, zero = 0n, limit = 4n) => priorityDistance(w(30n), w(30n), w(limit), w(flag), w(zero), hit, local, io);
  return { players, hit, local, seen, io, run };
}

test('PRIDIS numeric ALIVE gate includes zero and negatives, skipping positive words before position reads', () => {
  const f = recipients(); for (let i = 1; i <= 10; i++) f.players[i].alive = 1n;
  f.players[1].alive = 0n; f.players[2].alive = -1n; f.players[3].alive = -2n; f.run();
  assert.equal(f.hit.dbits, 7n); assert.deepEqual(f.seen, [1, 2, 3]); assert.equal(f.local.i, 11);
});

test('PRIDIS selects physical team halves, with all ships for other flag values', () => {
  for (const flag of [-1n, 0n, 1n, 2n, 3n]) {
    const f = recipients(); f.run(flag); assert.equal(f.hit.dbits, flag === 1n ? 31n : flag === 2n ? 992n : 1023n);
    assert.equal(f.local.i, flag === 1n ? 6 : 11);
  }
});

test('PRIDIS clears only for ZERO=0 and preserves unrelated high bits when accumulating', () => {
  for (const zero of [-1n, 0n, 1n]) {
    const f = recipients(); f.hit.dbits = 1n << 34n; f.run(1n, zero); assert.equal(f.hit.dbits, 31n | (zero === 0n ? 0n : 1n << 34n));
  }
});

test('PRIDIS uses inclusive diagonal range without board occupancy or shield tests', () => {
  const f = recipients(); for (let i = 2; i <= 10; i++) f.players[i].alive = 1n;
  Object.assign(f.players[1].ship, { v: 34, h: 34, energy: 0n, shieldCondition: 1n }); f.run(); assert.equal(f.hit.dbits, 1n);
  f.players[1].ship.h = 35; f.run(); assert.equal(f.hit.dbits, 0n); f.run(0n, 0n, -1n); assert.equal(f.hit.dbits, 0n);
});

test('PRIDIS captures team bounds but rereads coordinate and limit references during traversal', () => {
  const f = recipients(), flag = w(1n), v = w(30n), limit = w(0n); let count = 0;
  const original = f.io.ldis;
  f.io.ldis = (a, b, c, d, n) => { const result = original(a, b, c, d, n); if (++count === 1) { flag.value = 2n; v.value = 31n; limit.value = 0n; } return result; };
  priorityDistance(v, w(30n), limit, flag, w(0n), f.hit, f.local, f.io);
  assert.deepEqual(f.seen, [1, 2, 3, 4, 5]); assert.equal(f.hit.dbits, 1n);
});

function romulan() {
  const world = { rom: -1n, erom: 1000n, locr: { v: 12, h: 25 } }, hit = { ...emptyHit(), dbits: 19n };
  const board = new PackedBoard(); board.setdsp(12, 25, 500); const draws: bigint[] = [], writes: string[] = [];
  const io = { falseWord: 0n, iran(max: bigint) { draws.push(max); return 51n; },
    setdsp(v: bigint, h: bigint, code: bigint) { writes.push(`${v},${h},${code}`); board.setdsp(Number(v), Number(h), Number(code)); } };
  return { world, hit, board, draws, writes, io };
}

test('PHAROM preserves two integer division stages and only touches the source hit registers', () => {
  const f = romulan(); f.hit.critdv = 4n; f.hit.shjump = 1n;
  damageRomulan('pharom', w(201n), w(3n), f.world, f.hit, f.io);
  assert.deepEqual([f.hit.iwhat, f.hit.ihita, f.world.erom], [1n, 1011n, 899n]); assert.deepEqual(f.draws, [100n]);
  assert.equal(f.hit.critdv, 4n); assert.equal(f.hit.shjump, 1n); assert.equal(f.hit.dbits, 19n); assert.deepEqual(f.writes, []);
});

test('PHAROM death clears ROM and its board cell while retaining coordinates and negative energy', () => {
  const f = romulan(); f.world.erom = 1n; damageRomulan('pharom', w(200n), w(1n), f.world, f.hit, f.io);
  assert.equal(f.world.erom, -301n); assert.equal(f.world.rom, 0n); assert.equal(f.hit.klflg, 2n); assert.equal(f.board.disp(12, 25), 0);
  assert.deepEqual(f.world.locr, { v: 12, h: 25 });
});

test('TOROM caps the integer draw at 2000 and retains the downward tenths truncation', () => {
  for (const draw of [1n, 1999n, 2000n, 4000n]) {
    const f = romulan(); f.io.iran = max => { assert.equal(max, 4000n); return draw; };
    damageRomulan('torom', w(99n), w(0n), f.world, f.hit, f.io);
    const hit = draw < 2000n ? draw : 2000n; assert.equal(f.hit.ihita, hit); assert.equal(f.world.erom, 1000n - hit / 10n); assert.equal(f.hit.iwhat, 2n);
  }
});

test('TOROM exact-zero energy kills, and DEADRO ignores dummy arguments and retains old IWHAT/IHITA', () => {
  const f = romulan(); f.world.erom = 5n; damageRomulan('torom', w(0n), w(0n), f.world, f.hit, f.io); assert.equal(f.hit.klflg, 2n);
  const g = romulan(); g.hit.iwhat = 7n; g.hit.ihita = 811n; const missing = { get value(): bigint { return assert.fail('DEADRO does not read arguments'); } };
  damageRomulan('deadro', missing, missing, g.world, g.hit, g.io);
  assert.equal(g.hit.iwhat, 7n); assert.equal(g.hit.ihita, 811n); assert.equal(g.world.erom, 1000n); assert.deepEqual(g.draws, []);
});

test('PHAROM does not add an already-dead gate and exposes ID=0 arithmetic failure after setting IWHAT', () => {
  const f = romulan(); f.world.rom = 0n; damageRomulan('pharom', w(200n), w(1n), f.world, f.hit, f.io); assert.equal(f.world.erom, 698n);
  assert.throws(() => damageRomulan('pharom', w(200n), w(0n), f.world, f.hit, f.io), /divide by zero/); assert.equal(f.hit.iwhat, 1n);
  assert.equal(f.hit.ihita, 3020n); assert.equal(f.world.erom, 698n);
});
