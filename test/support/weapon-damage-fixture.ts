import assert from 'node:assert/strict';
import { weaponDamage, WeaponDamageLocals } from '../../src/game/weapon-damage.ts';
import type { WeaponDamageServices } from '../../src/game/weapon-damage.ts';
import { orderedRational as real } from './rational-real.ts';
import type { Rational } from './rational-real.ts';
import { power } from '../../src/compat/power.ts';
import { playerSlots } from '../../src/game/player.ts';
import { emptyHit } from '../../src/game/hit-queue.ts';
import type { HitRegisters } from '../../src/game/hit-queue.ts';
import { PackedBoard, pdist, ldis, ingal } from '../../src/compat/board.ts';
import { jump, baseKilled, JumpLocals, BaseKilledLocals } from '../../src/game/combat-displacement.ts';
import { constants as K } from '../../src/generated/source-data.ts';

export const w = (value: bigint) => ({ value });
export function done<T>(g: Generator<unknown, T, void>): T { const n = g.next(); assert.equal(n.done, true); return n.value; }
type Shared = { players: ReturnType<typeof playerSlots>; board: PackedBoard; hit: HitRegisters;
  bases: { v: number; h: number; strength: bigint }[][]; world: { rom: bigint; locr: { v: number; h: number } }; tpoint: bigint[] };
export function weaponFixture(shared?: Shared) {
  const players = shared?.players ?? playerSlots(), board = shared?.board ?? new PackedBoard();
  const hit = shared?.hit ?? { ...emptyHit(), dbits: 19n };
  const bases = shared?.bases ?? Array.from({ length: 3 }, () => Array.from({ length: 11 }, () => ({ v: 12, h: 20, strength: 0n })));
  if (!shared) {
    Object.assign(players[1].ship, { v: 10, h: 20 }); players[1].alive = -1n;
    Object.assign(players[6].ship, { v: 12, h: 20, shieldCondition: -1n }); players[6].alive = -1n; board.setdsp(12, 20, 206);
    bases[2][1].strength = 1000n;
  }
  const world = shared?.world ?? { rom: -1n, locr: { v: 20, h: 30 } };
  const ctx = { who: 1n, team: 1n, player: -1n, tpoint: shared?.tpoint ?? Array<bigint>(K.KNPOIN + 1).fill(0n), rsr: Array<bigint>(K.KNPOIN + 1).fill(0n) };
  const local = new WeaponDamageLocals(real.literal('99')), jl = new JumpLocals(), bl = new BaseKilledLocals();
  const path = { h1: 0n, v1: 0n, h2: 0n, v2: 0n, dcode: 0n, dhs: real.literal('1'), dvs: real.literal('0') };
  const nbase = [0n, 0n, 1n], numcap = [0n, 0n, 0n];
  const events: string[] = [], draws: string[] = [], integers: bigint[] = [];
  const io: WeaponDamageServices<Rational, 'jump' | 'base'> = {
    real, ran(zero) { assert.equal(zero, 0); events.push('ran'); assert.ok(draws.length, 'Unscheduled RAN'); return real.literal(draws.shift()!); },
    iran(max) { events.push('iran:' + max); assert.ok(integers.length, 'Unscheduled IRAN'); return integers.shift()!; },
    pwr(base, n) { events.push('pwr:' + n.value); return power(base, n.value, { one: () => real.literal('1.0'), fmpr: real.multiply }); },
    logical: n => n < 0n, and: (...terms) => terms.every(t => t()), or: (...terms) => terms.some(t => t()),
    torpedoShieldBranch(test) { events.push('shield-if:' + test); return test ? 1000 : 300; },
    ship(i) { const p = players[Number(i)]; if (!p) throw new RangeError('SHPCON requires surrounding memory'); return p.ship; },
    device(i, d) { if (d < 1n || d > BigInt(K.KNDEV)) throw new RangeError('SHPDAM requires surrounding memory'); const ship = io.ship(i);
      return { get value() { return ship.devices[Number(d)]; }, set value(n) { ship.devices[Number(d)] = n; } }; },
    alive(i) { return { get value() { return players[Number(i)].alive; }, set value(n) { players[Number(i)].alive = n; } }; },
    base(i, t) { const b = bases[Number(t)]?.[Number(i)]; if (!b) throw new RangeError('BASE requires surrounding memory'); return b; },
    baseCount(team) { return { get value() { return nbase[Number(team)]; }, set value(n) { nbase[Number(team)] = n; } }; },
    setdsp(v, h, code) { events.push(`set:${v},${h},${code}`); board.setdsp(Number(v), Number(h), Number(code)); },
    *jump(kind, index) { events.push('jump'); jump(kind, index, world, path, hit, jl, {
      real, falseWord: 0n, player: i => players[Number(i)], base: io.base,
      dispc: (v, h) => BigInt(board.dispc(Number(v), Number(h))), setdsp: io.setdsp,
      ingal: (v, h) => ingal(Number(v), Number(h)), pdist: (v, h, nv, nh) => BigInt(pdist(Number(v), Number(h), Number(nv), Number(nh))),
    }); },
    *baskil(team) { events.push('baskil:' + team.value); baseKilled(team, bl, {
      player: i => players[Number(i)], base: io.base, dispc: (v, h) => BigInt(board.dispc(Number(v), Number(h))),
      docked: i => players[i].ship.docked, baseCount: t => nbase[Number(t)], capturedCount: t => numcap[Number(t)],
      planetCount: () => 1n, planet: () => ({ v: 50, h: 50 }),
      ldis: (v, h, pv, ph, n) => ldis(Number(v), Number(h), Number(pv), Number(ph), Number(n)),
    }); },
  };
  const args = { kind: w(2n), index: w(6n), distance: w(2n), phit: w(200n), ship: w(-1n) };
  return { players, board, hit, bases, world, ctx, local, path, nbase, numcap, events, draws, integers, io, args,
    target: players[6].ship, run: (entry: 'tordam' | 'phadam' = 'phadam') => weaponDamage(entry, args.kind, args.index, args.distance, args.phit, args.ship, ctx, local, hit, io) };
}
