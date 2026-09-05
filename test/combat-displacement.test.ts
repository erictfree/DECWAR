import test from 'node:test';
import assert from 'node:assert/strict';
import { jump, baseKilled, JumpLocals, BaseKilledLocals } from '../src/game/combat-displacement.ts';
import type { JumpServices, BaseKilledServices } from '../src/game/combat-displacement.ts';
import { rational as real } from './support/rational-real.ts';
import type { Rational } from './support/rational-real.ts';
import { playerSlots } from '../src/game/player.ts';
import { PackedBoard, pdist, ldis, ingal } from '../src/compat/board.ts';
import { emptyHit } from '../src/game/hit-queue.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { check, CheckLocals } from '../src/game/check.ts';
const w = (value: bigint) => ({ value });

function fixture() {
  const players = playerSlots(), board = new PackedBoard(), world = { rom: -1n, locr: { v: 10, h: 20 } };
  const bases = Array.from({ length: 3 }, () => Array.from({ length: 11 }, () => ({ v: 10, h: 20, strength: 0n })));
  const ship = players[1].ship; Object.assign(ship, { v: 10, h: 20, docked: true, condition: K.GREEN }); players[1].alive = -1n;
  const path = { h1: 0n, v1: 0n, h2: 0n, v2: 0n, dcode: 0n, dhs: real.literal('1'), dvs: real.literal('.5') };
  const hit = { ...emptyHit(), dbits: 9n }, local = new JumpLocals(), events: string[] = [];
  const io: JumpServices<Rational> = { real, falseWord: 0n,
    player: i => players[Number(i)], base: (j, t) => bases[Number(t)][Number(j)],
    dispc(v, h) { events.push(`dispc:${v},${h}`); return BigInt(board.dispc(Number(v), Number(h))); },
    setdsp(v, h, code) { events.push(`set:${v},${h},${code}`); board.setdsp(Number(v), Number(h), Number(code)); },
    ingal: (v, h) => ingal(Number(v), Number(h)), pdist: (v, h, nv, nh) => BigInt(pdist(Number(v), Number(h), Number(nv), Number(nh))),
  };
  return { players, board, world, bases, ship, path, hit, local, events, io,
    run: (kind = 1n, index = 1n) => jump(w(kind), w(index), world, path, hit, local, io) };
}

test('JUMP uses integer assignment after adding displacement, moves without locks, and undocks only ships', () => {
  const f = fixture(); f.board.setdsp(10, 20, 101); f.hit.klflg = 2n; f.run();
  assert.deepEqual([f.ship.v, f.ship.h, f.ship.docked, f.ship.condition], [11, 20, false, K.RED]);
  assert.equal(f.board.disp(11, 20), 101); assert.equal(f.board.disp(10, 20), 0); assert.equal(f.hit.shjump, 1n); assert.equal(f.hit.klflg, 2n);
  assert.equal(f.hit.dbits, 9n); assert.deepEqual(f.events, ['dispc:11,20', 'set:10,20,0', 'set:11,20,101']);
});

test('JUMP requires exactly one sector after truncation, rejecting zero, distance two and out-of-galaxy positions before DISP', () => {
  for (const [dv, dh] of [['.1', '.1'], ['2', '0'], ['-20', '0']]) {
    const f = fixture(); f.path.dhs = real.literal(dv); f.path.dvs = real.literal(dh); f.hit.shjump = 1n; f.hit.vto = 70n;
    f.run(); assert.equal(f.hit.shjump, 0n); assert.equal(f.hit.vto, 70n); assert.deepEqual(f.events, []); assert.equal(f.ship.docked, true);
  }
});

test('JUMP negative fractional offsets can move an axis where the positive fraction does not', () => {
  const f = fixture(); f.path.dhs = real.literal('-.5'); f.path.dvs = real.literal('0'); f.run(); assert.deepEqual([f.ship.v, f.ship.h], [9, 20]);
});

test('JUMP occupied cells stop displacement, but a DISP=-1 sentinel has empty DISPC and is overwritten', () => {
  for (const code of [101, 301, 500, 601, 901, -1]) {
    const f = fixture(); f.board.setdsp(11, 20, code); f.run(); assert.equal(f.hit.shjump, code === -1 ? 1n : 0n);
    assert.equal(f.board.disp(11, 20), code === -1 ? 101 : code);
  }
});

test('JUMP base displacement preserves strength; Romulan displacement includes the dummy J in its board code', () => {
  const f = fixture(); f.bases[2][2].strength = 777n; f.run(4n, 2n);
  assert.deepEqual(f.bases[2][2], { v: 11, h: 20, strength: 777n }); assert.equal(f.board.disp(11, 20), 402); assert.equal(f.ship.docked, true);
  const g = fixture(); g.run(5n, 7n); assert.deepEqual(g.world.locr, { v: 11, h: 20 }); assert.equal(g.board.disp(11, 20), 507);
});

test('JUMP black-hole ship death retains stored position, energy and docked state, preserving the hole', () => {
  const f = fixture(); f.board.setdsp(10, 20, 101); f.board.setdsp(11, 20, 1000); const energy = f.ship.energy; f.run();
  assert.equal(f.ship.damage, BigInt(K.KENDAM)); assert.equal(f.players[1].alive, 0n); assert.equal(f.hit.klflg, 1n); assert.equal(f.hit.shjump, 1n);
  assert.deepEqual([f.ship.v, f.ship.h, f.hit.vto, f.hit.hto], [10, 20, 11n, 20n]); assert.equal(f.ship.docked, true); assert.equal(f.ship.condition, K.GREEN);
  assert.equal(f.ship.energy, energy); assert.equal(f.board.disp(11, 20), 1000); assert.equal(f.board.disp(10, 20), 0);
});

test('JUMP base and Romulan black-hole paths clear only the source-defined object state', () => {
  const f = fixture(); f.bases[2][2].strength = 900n; f.board.setdsp(11, 20, 1000); f.run(4n, 2n);
  assert.deepEqual(f.bases[2][2], { v: 10, h: 20, strength: 0n }); assert.equal(f.hit.klflg, 1n);
  const g = fixture(); g.board.setdsp(11, 20, 1000); g.run(5n, 0n); assert.equal(g.world.rom, 0n); assert.deepEqual(g.world.locr, { v: 10, h: 20 });
});

test('CHECK to JUMP composition shares physical COMMON increments when displacing its hit target', () => {
  const f = fixture(); f.ship.v = 12; f.ship.h = 21; f.board.setdsp(12, 21, 101);
  check(w(10n), w(20n), w(4n), w(2n), w(4n), { value: real.literal('0') }, f.path, new CheckLocals(real.literal('0')), {
    real, ran: () => real.literal('.75'), ingal: (v, h) => f.io.ingal(v, h), disp: (v, h) => BigInt(f.board.disp(Number(v), Number(h))),
  });
  assert.equal(f.path.dcode, 101n); f.run(); assert.deepEqual([f.ship.v, f.ship.h], [13, 21]); assert.equal(f.board.disp(13, 21), 101);
});

function dockedFixture() {
  const f = fixture(), numbase = [0n, 0n, 0n], numcap = [0n, 0n, 0n], planets = [{ v: 0, h: 0 }, { v: 50, h: 50 }];
  let planetCount = 1n; const local = new BaseKilledLocals();
  const io: BaseKilledServices = { player: f.io.player, base: f.io.base, dispc: f.io.dispc,
    docked: i => f.players[i].ship.docked, baseCount: team => numbase[Number(team)], capturedCount: team => numcap[Number(team)],
    planetCount: () => planetCount, planet: i => planets[Number(i)],
    ldis: (v, h, pv, ph, n) => ldis(Number(v), Number(h), Number(pv), Number(ph), Number(n)),
  };
  return { ...f, numbase, numcap, planets, local, io, setPlanetCount: (n: bigint) => { planetCount = n; },
    run: (team = 1n) => baseKilled(w(team), local, io) };
}

test('BASKIL NUMCAP<=0 retains docking despite no remaining bases, matching the source jump to 400', () => {
  for (const cap of [-1n, 0n]) {
    const f = dockedFixture(); f.numcap[1] = cap; f.run(); assert.equal(f.ship.docked, true); assert.equal(f.ship.condition, K.GREEN);
  }
});

test('BASKIL positive captured count with no nearby friendly planet undocks even a non-alive ship', () => {
  const f = dockedFixture(); f.numcap[1] = 1n; f.players[1].alive = 1n; f.run();
  assert.equal(f.ship.docked, false); assert.equal(f.ship.condition, K.RED); assert.equal(f.local.i, 6);
});

test('BASKIL scans all base slots only when NBASE>0 and requires positive strength with inclusive adjacency', () => {
  for (const strength of [0n, 1n]) for (const count of [0n, 1n]) {
    const f = dockedFixture(); f.numcap[1] = 1n; f.numbase[1] = count; Object.assign(f.bases[1][10], { v: 11, h: 21, strength }); f.run();
    assert.equal(f.ship.docked, count > 0n && strength > 0n);
  }
});

test('BASKIL friendly planets use current DISPC, diagonal adjacency and captured count rather than builds', () => {
  for (const code of [601, 701, 801]) {
    const f = dockedFixture(); f.numcap[1] = 1n; Object.assign(f.planets[1], { v: 11, h: 21 }); f.board.setdsp(11, 21, code); f.run();
    assert.equal(f.ship.docked, code === 701);
  }
});

test('BASKIL restricts physical team halves and skips undocked players before reading port counts', () => {
  const f = dockedFixture(); f.numcap[2] = 1n; Object.assign(f.players[6].ship, { docked: true, v: 10, h: 20 }); f.run(2n);
  assert.equal(f.players[6].ship.docked, false); assert.equal(f.ship.docked, true); assert.equal(f.local.i, 11);
  f.ship.docked = false; f.io.baseCount = () => { assert.fail('No docked Federation ships'); }; f.run(1n);
});

test('BASKIL zero planet count requires a compiler loop contract, preserving prior state until supplied', () => {
  const f = dockedFixture(); f.numcap[1] = 1n; f.setPlanetCount(0n); assert.throws(() => f.run(), /reversed DO/); assert.equal(f.ship.docked, true);
  f.io.reversedLoop = (first, last) => { assert.deepEqual([first, last], [1n, 0n]); return { iterations: [], after: 1n }; };
  f.run(); assert.equal(f.ship.docked, false); assert.equal(f.local.j, 1n);
});
