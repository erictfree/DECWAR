import { constants as K } from '../generated/source-data.ts';
import { add36, multiply36, signed36 } from '../compat/word36.ts';
import type { RealArithmetic } from '../compat/real.ts';
import type { WordReference } from './lifecycle.ts';
import type { CheckOutput } from './check.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { Ship } from './ship.ts';

export class NovaLocals { d = 0n; i = 0n; jbase = 0n; pteam = 0n; }
export type NovaContext = { player: bigint; team: bigint; nomsg: bigint; tpoint: bigint[]; rsr: bigint[];
  shared: { rom: bigint; erom: bigint; locr: { v: number; h: number } } };
export type NovaServices<R, W> = {
  real: RealArithmetic<R>; ran(zero: 0): R; iran(max: bigint): bigint; logical(word: bigint): boolean;
  and(...terms: (() => boolean)[]): boolean;
  ship(index: bigint): Ship; device(index: bigint, device: bigint): WordReference; alive(index: bigint): WordReference;
  base(index: bigint, team: bigint): { v: number; h: number; strength: bigint }; baseCount(team: bigint): WordReference;
  planet(index: bigint): { v: number; h: number; builds: bigint }; teamScore(team: bigint, category: number): WordReference;
  setdsp(v: bigint, h: bigint, code: bigint): void; dispc(v: bigint, h: bigint): bigint;
  jump(kind: WordReference, index: WordReference): Generator<W, void, void>; trcoff(index: WordReference): Generator<W, void, void>;
  baskil(team: WordReference): Generator<W, void, void>; plnrmv(index: WordReference, team: WordReference): Generator<W, void, void>;
  lockPlanet(caller: 'NOVA'): Generator<W, boolean, void>; unlockPlanet(): void;
  pridis(v: WordReference, h: WordReference, limit: WordReference, flag: WordReference, zero: WordReference): void;
  makhit(): Generator<W, void, void>;
};
// NOVA.FOR:25-179. Unlike weapon damage, nova ship kill scores update TMSCOR
// directly. MAKHIT clearing and JUMP's old-coordinate death state are retained.
export function* nova<R, W>(kind: WordReference, index: WordReference, ctx: NovaContext, path: CheckOutput<R>,
  hit: HitRegisters, local: NovaLocals, io: NovaServices<R, W>): Generator<W, void, void> {
  const w = (value: bigint) => ({ value }), r = io.real;
  const player = () => io.logical(ctx.player), rom = () => io.logical(ctx.shared.rom);
  const ship = () => io.ship(index.value), isBase = () => kind.value >= BigInt(K.DXFBAS);
  const base = (team = add36(kind.value, -2n)) => io.base(index.value, team), planet = () => io.planet(index.value);
  const dispto = () => add36(multiply36(kind.value, 100n), index.value);
  const score = (a: bigint[], k: number, n: bigint) => { a[k] = add36(a[k], n); };
  const around = (v: WordReference, h: WordReference) => io.pridis(v, h, w(BigInt(K.KRANGE)), w(0n), w(0n));
  const hitRef = (key: 'vto' | 'hto'): WordReference => ({ get value() { return hit[key]; }, set value(n) { hit[key] = n; } });
  const position = (get: () => { v: number; h: number }, key: 'v' | 'h'): WordReference => ({
    get value() { return BigInt(get()[key]); }, set value(n) { get()[key] = Number(n); },
  });
  const announcement = () => { io.pridis(w(30n), w(30n), w(100n), w(local.jbase), w(0n)); hit.dbits = signed36(hit.dbits & ~ctx.nomsg); };
  hit.vfrom = path.h2; hit.hfrom = path.v2; hit.vto = path.h1; hit.hto = path.v1;
  if (kind.value === BigInt(K.DXROM)) {
    if (rom()) yield* io.jump(w(BigInt(K.DXROM)), w(1n));
    if (rom()) ctx.shared.erom /= 2n;
    if (!player()) score(ctx.rsr, K.KPRKIL, -ctx.shared.erom);
    if (player()) score(ctx.tpoint, K.KPRKIL, ctx.shared.erom);
    hit.dispfr = BigInt(K.DXSTAR * 100); hit.dispto = BigInt(K.DXROM * 100); hit.iwhat = 8n;
    hit.shstto = ctx.shared.erom; hit.shcnto = 1n; hit.vto = BigInt(ctx.shared.locr.v); hit.hto = BigInt(ctx.shared.locr.h);
    around(hitRef('vto'), hitRef('hto')); yield* io.makhit();
    if (rom()) return;
    if (!player()) score(ctx.rsr, K.KPRKIL, -5000n);
    if (player()) score(ctx.tpoint, K.KPRKIL, 5000n);
    return;
  }
  if (io.and(() => kind.value >= BigInt(K.DXNPLN), () => kind.value <= BigInt(K.DXEPLN))) {
    hit.dispfr = BigInt(K.DXSTAR * 100); hit.dispto = dispto(); hit.iwhat = 8n;
    if (!(yield* io.lockPlanet('NOVA'))) return;
    hit.vto = BigInt(planet().v); hit.hto = BigInt(planet().h);
    planet().builds = add36(planet().builds, -3n); if (planet().builds < 0n) hit.klflg = 2n;
    hit.shstto = planet().builds > 0n ? planet().builds : 0n;
    around(hitRef('vto'), hitRef('hto')); yield* io.makhit();
    if (planet().builds < 0n) {
      if (player()) score(ctx.tpoint, K.KNPDES, -1000n);
      if (!player()) score(ctx.rsr, K.KNPDES, -1000n);
      local.pteam = add36(io.dispc(BigInt(planet().v), BigInt(planet().h)), -BigInt(K.DXNPLN));
      io.setdsp(BigInt(planet().v), BigInt(planet().h), 0n);
      yield* io.plnrmv(index, { get value() { return local.pteam; }, set value(n) { local.pteam = n; } });
    }
    io.unlockPlanet(); return;
  }
  local.d = 1000n;
  if (isBase()) local.d = add36(local.d, -base().strength);
  if (io.and(() => !isBase(), () => ship().shieldCondition > 0n)) local.d = add36(local.d, -ship().shieldStrength);
  if (local.d < 200n) local.d = 250n;
  if (!isBase()) {
    for (local.i = 1n; local.i <= BigInt(K.KNDEV); local.i++) {
      const device = io.device(index.value, local.i);
      device.value = add36(device.value, r.toInteger(r.multiply(r.multiply(io.ran(0), r.fromInteger(local.d)), r.literal('4.0'))));
    }
    if (ship().devices[K.KDSHLD] >= BigInt(K.KCRIT)) ship().shieldCondition = -1n;
  }
  hit.ihita = add36(multiply36(local.d, 8n), io.iran(1000n));
  if (io.and(player, () => add36(5n, -ctx.team) === kind.value)) score(ctx.tpoint, K.KPBDAM, hit.ihita);
  if (io.and(() => !player(), isBase)) score(ctx.rsr, K.KPBDAM, hit.ihita);
  if (io.and(player, () => add36(3n, -ctx.team) === kind.value)) score(ctx.tpoint, K.KPEDAM, hit.ihita);
  if (io.and(() => !player(), () => !isBase())) score(ctx.rsr, K.KPEDAM, hit.ihita);
  if (io.and(player, () => add36(ctx.team, 2n) === kind.value)) score(ctx.tpoint, K.KPBDAM, -hit.ihita);
  if (io.and(player, () => ctx.team === kind.value)) score(ctx.tpoint, K.KPEDAM, -hit.ihita);
  if (!isBase()) {
    ship().damage = add36(ship().damage, hit.ihita);
    ship().energy = r.toInteger(r.subtract(r.fromInteger(ship().energy), r.multiply(r.fromInteger(hit.ihita), io.ran(0))));
    if (ship().shieldCondition > 0n) { const value = add36(add36(ship().shieldStrength, -300n), io.iran(100n)); ship().shieldStrength = value > 0n ? value : 0n; }
    if (ship().shieldStrength <= 0n) ship().shieldCondition = -1n;
    if (io.and(() => ship().damage < BigInt(K.KENDAM), () => ship().energy > 0n)) yield* io.jump(kind, index);
    else { io.setdsp(BigInt(ship().v), BigInt(ship().h), 0n); io.alive(index.value).value = 0n; hit.klflg = 2n; }
    hit.dispfr = BigInt(K.DXSTAR * 100); hit.dispto = dispto(); hit.iwhat = 8n;
    hit.vto = BigInt(ship().v); hit.hto = BigInt(ship().h); hit.shstto = ship().shieldStrength; hit.shcnto = ship().shieldCondition;
    if (io.and(() => hit.klflg !== 0n, player, () => ctx.team === kind.value)) { const s = io.teamScore(ctx.team, K.KPEKIL); s.value = add36(s.value, -5000n); }
    if (io.and(() => hit.klflg !== 0n, player, () => ctx.team !== kind.value)) { const s = io.teamScore(ctx.team, K.KPEKIL); s.value = add36(s.value, 5000n); }
    if (io.and(() => hit.klflg !== 0n, () => !player())) score(ctx.rsr, K.KPEKIL, 5000n);
    around(position(ship, 'v'), position(ship, 'h')); yield* io.makhit();
    if (ship().tractor !== 0) yield* io.trcoff(index);
    return;
  }
  local.jbase = add36(kind.value, -2n);
  if (base(local.jbase).strength === 1000n) {
    hit.dispfr = BigInt(K.DXSTAR * 100); hit.dispto = dispto(); hit.iwhat = 9n; announcement(); yield* io.makhit();
  }
  { const value = add36(add36(base(local.jbase).strength, -300n), io.iran(100n)); base(local.jbase).strength = value > 0n ? value : 0n; }
  if (base(local.jbase).strength > 0n) yield* io.jump(kind, index);
  hit.dispfr = BigInt(K.DXSTAR * 100); hit.dispto = dispto(); hit.iwhat = 8n; hit.vfrom = path.h2; hit.hfrom = path.v2;
  hit.vto = BigInt(base(local.jbase).v); hit.hto = BigInt(base(local.jbase).h); hit.shstto = base(local.jbase).strength; hit.shcnto = 1n;
  if (base(local.jbase).strength <= 0n) {
    if (!player()) score(ctx.rsr, K.KPBDAM, 10000n);
    if (io.and(player, () => ctx.team === local.jbase)) score(ctx.tpoint, K.KPBDAM, -10000n);
    if (io.and(player, () => ctx.team !== local.jbase)) score(ctx.tpoint, K.KPBDAM, 10000n);
    const count = io.baseCount(local.jbase); count.value = add36(count.value, -1n);
    yield* io.baskil({ get value() { return local.jbase; }, set value(n) { local.jbase = n; } }); hit.klflg = 2n;
  }
  around(position(() => base(local.jbase), 'v'), position(() => base(local.jbase), 'h')); yield* io.makhit();
  if (base(local.jbase).strength > 0n) return;
  io.setdsp(BigInt(base(local.jbase).v), BigInt(base(local.jbase).h), 0n);
  hit.iwhat = 10n; hit.dispfr = BigInt(K.DXSTAR * 100); hit.dispto = dispto(); announcement();
  hit.vto = BigInt(base(local.jbase).v); hit.hto = BigInt(base(local.jbase).h); yield* io.makhit();
}
