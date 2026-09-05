import { constants as K } from '../runtime/variant-values.ts';
import { add36, multiply36 } from '../compat/word36.ts';
import type { RealArithmetic } from '../compat/real.ts';
import type { WordReference } from './lifecycle.ts';
import type { Ship } from './ship.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { CheckOutput } from './check.ts';

export type CombatWorldAccess = {
  player(index: bigint): { ship: Ship; alive: bigint };
  base(index: bigint, team: bigint): { v: number; h: number; strength: bigint };
  dispc(v: bigint, h: bigint): bigint;
};
export class JumpLocals { iloc1 = 0n; jloc1 = 0n; ivv = 0n; ihh = 0n; l = 0n; }
export type JumpServices<R> = CombatWorldAccess & { real: RealArithmetic<R>; falseWord: bigint;
  ingal(v: bigint, h: bigint): boolean; pdist(v: bigint, h: bigint, nv: bigint, nh: bigint): bigint;
  setdsp(v: bigint, h: bigint, code: bigint): void };

// JUMP.FOR:25-82. CHECK's physical DHS/DVS correspond to DISV/DISH here.
// Black-hole displacement keeps the object's old stored coordinates.
export function jump<R>(kind: WordReference, index: WordReference, world: { rom: bigint; locr: { v: number; h: number } },
  path: CheckOutput<R>, hit: HitRegisters, local: JumpLocals, io: JumpServices<R>): void {
  const player = () => io.player(index.value), base = () => io.base(index.value, add36(kind.value, -2n));
  hit.shjump = 0n;
  if (kind.value <= BigInt(K.DXESHP)) { local.iloc1 = BigInt(player().ship.v); local.jloc1 = BigInt(player().ship.h); }
  else if (kind.value === BigInt(K.DXROM)) { local.iloc1 = BigInt(world.locr.v); local.jloc1 = BigInt(world.locr.h); }
  else { local.iloc1 = BigInt(base().v); local.jloc1 = BigInt(base().h); }
  local.ivv = io.real.toInteger(io.real.add(io.real.fromInteger(local.iloc1), path.dhs));
  local.ihh = io.real.toInteger(io.real.add(io.real.fromInteger(local.jloc1), path.dvs));
  if (!io.ingal(local.ivv, local.ihh)) return;
  if (io.pdist(local.iloc1, local.jloc1, local.ivv, local.ihh) !== 1n) return;
  local.l = io.dispc(local.ivv, local.ihh);
  if (local.l === BigInt(K.DXBHOL)) {
    io.setdsp(local.iloc1, local.jloc1, 0n); hit.shjump = 1n;
    hit.klflg = 1n; hit.vto = local.ivv; hit.hto = local.ihh;
    if (kind.value === BigInt(K.DXROM)) { world.rom = io.falseWord; return; }
    if (kind.value < BigInt(K.DXFBAS)) player().ship.damage = BigInt(K.KENDAM);
    if (kind.value < BigInt(K.DXFBAS)) player().alive = 0n;
    if (kind.value >= BigInt(K.DXFBAS)) base().strength = 0n;
    return;
  }
  if (local.l !== BigInt(K.DXMPTY)) return;
  io.setdsp(local.iloc1, local.jloc1, 0n);
  io.setdsp(local.ivv, local.ihh, add36(multiply36(kind.value, 100n), index.value));
  if (kind.value === BigInt(K.DXROM)) { world.locr.v = Number(local.ivv); world.locr.h = Number(local.ihh); }
  else {
    if (kind.value < BigInt(K.DXFBAS)) player().ship.v = Number(local.ivv);
    if (kind.value < BigInt(K.DXFBAS)) player().ship.h = Number(local.ihh);
    if (kind.value >= BigInt(K.DXFBAS)) base().v = Number(local.ivv);
    if (kind.value >= BigInt(K.DXFBAS)) base().h = Number(local.ihh);
  }
  hit.vto = local.ivv; hit.hto = local.ihh; hit.shjump = 1n;
  if (kind.value >= BigInt(K.DXFBAS)) return;
  player().ship.condition = K.RED; player().ship.docked = false;
}

export class BaseKilledLocals { ib = 0; ie = 0; i = 0; j = 0n; }
export type BaseKilledServices = CombatWorldAccess & {
  docked(index: number): boolean; baseCount(team: bigint): bigint; capturedCount(team: bigint): bigint;
  planetCount(): bigint; planet(index: bigint): { v: number; h: number };
  ldis(v: bigint, h: bigint, pv: bigint, ph: bigint, limit: bigint): boolean;
  reversedLoop?(first: bigint, last: bigint): { iterations: readonly bigint[]; after: bigint };
};
// BASKIL.FOR:27-64. NUMCAP<=0 jumps directly to the next ship, retaining its
// docked state even when no base is adjacent. Preserve that executable branch.
export function baseKilled(team: WordReference, local: BaseKilledLocals, io: BaseKilledServices): void {
  local.ib = 1; local.ie = K.KNPLAY;
  if (team.value === 1n) local.ie = K.KNPLAY / 2;
  if (team.value === 2n) local.ib = K.KNPLAY / 2 + 1;
  const end = local.ie;
  nextShip: for (local.i = local.ib; local.i <= end; local.i++) {
    if (!io.docked(local.i)) continue;
    const ship = () => io.player(BigInt(local.i)).ship;
    if (io.baseCount(team.value) > 0n) {
      for (local.j = 1n; local.j <= BigInt(K.KNBASE); local.j++) {
        const b = io.base(local.j, team.value); if (b.strength <= 0n) continue;
        if (io.ldis(BigInt(ship().v), BigInt(ship().h), BigInt(b.v), BigInt(b.h), 1n)) continue nextShip;
      }
    }
    if (io.capturedCount(team.value) <= 0n) continue;
    const count = io.planetCount(), reverse = count < 1n ? io.reversedLoop?.(1n, count) : undefined;
    if (count < 1n && !reverse) throw new Error('BASKIL reversed DO bounds require the compiler contract');
    function* planets() { if (reverse) yield* reverse.iterations; else for (let j = 1n; j <= count; j++) yield j; }
    for (local.j of planets()) {
      const p = io.planet(local.j);
      if (add36(team.value, BigInt(K.DXNPLN)) !== io.dispc(BigInt(p.v), BigInt(p.h))) continue;
      if (io.ldis(BigInt(ship().v), BigInt(ship().h), BigInt(p.v), BigInt(p.h), 1n)) continue nextShip;
    }
    local.j = reverse ? reverse.after : add36(count, 1n);
    ship().condition = K.RED; ship().docked = false;
  }
}
