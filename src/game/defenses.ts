import { constants as K } from '../generated/source-data.ts';
import { add36, divide36, multiply36, signed36 } from '../compat/word36.ts';
import type { WordReference } from './lifecycle.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { Ship } from './ship.ts';

export type DefenseContext = { player: bigint; team: bigint;
  shared: { numply: bigint; rom: bigint; erom: bigint; locr: { v: number; h: number } } };
export type DefenseServices<W> = {
  logical(word: bigint): boolean; and(...terms: (() => boolean)[]): boolean; or(...terms: (() => boolean)[]): boolean;
  falseWord: bigint; iran(max: bigint): bigint;
  baseCount(team: bigint): bigint; planetCount(): bigint; sideCount(team: bigint): bigint;
  base(index: bigint, team: bigint): { v: number; h: number; strength: bigint };
  planet(index: bigint): { v: number; h: number; builds: bigint };
  ship(index: bigint): Ship; alive(index: bigint): bigint; bits(index: bigint): bigint;
  disp(v: bigint, h: bigint): bigint; dispc(v: bigint, h: bigint): bigint;
  ldis(v: bigint, h: bigint, pv: bigint, ph: bigint, limit: bigint): boolean;
  pdist(v: WordReference, h: WordReference, pv: WordReference, ph: WordReference): bigint;
  phadam(kind: WordReference, index: WordReference, distance: WordReference, size: WordReference, ship: WordReference): Generator<W, void, void>;
  pharom(size: WordReference, distance: WordReference): Generator<W, void, void>;
  teamScore(team: bigint, category: number): WordReference;
  pridis(v: WordReference, h: WordReference, limit: WordReference, flag: WordReference, zero: WordReference): void;
  makhit(): Generator<W, void, void>;
};
export class BaseAttackLocals { jb = 0n; je = 0n; i = 0n; j = 0n; k = 0n; id = 0n; }
export class PlanetAttackLocals { k = 0n; pcode = 0n; pteam = 0n; j = 0n; jtype = 0n; phit = 0n; id = 0n; }
export class BaseRebuildLocals { ib = 0n; ie = 0n; n = 0n; j = 0n; i = 0n; }
const w = (value: bigint): WordReference => ({ value });
function ref<T, P extends keyof T>(object: T, key: P): { value: T[P] } {
  return { get value() { return object[key]; }, set value(n) { object[key] = n; } };
}
function position(get: () => { v: number; h: number }, key: 'v' | 'h'): WordReference {
  return { get value() { return BigInt(get()[key]); }, set value(n) { get()[key] = Number(n); } };
}
function addScore<W>(io: DefenseServices<W>, team: bigint, category: number, amount: bigint) {
  const score = io.teamScore(team, category); score.value = add36(score.value, amount);
}
const quotient = (a: bigint, b: bigint) => divide36(a, b).quotient;

// BASPHA.FOR:27-87. Base teams, base slots, and opposing player slots retain
// physical traversal order. Damage receives .FALSE.; this driver scores TMSCOR.
export function* basePhasers<W>(ctx: DefenseContext, local: BaseAttackLocals, hit: HitRegisters,
  io: DefenseServices<W>): Generator<W, void, void> {
  const base = () => io.base(local.j, local.i), ship = () => io.ship(local.k), rom = () => ctx.shared.locr;
  const distance = () => io.pdist(ref(hit, 'vfrom'), ref(hit, 'hfrom'), ref(hit, 'vto'), ref(hit, 'hto'));
  local.jb = 1n; local.je = 2n;
  if (io.logical(ctx.player)) { local.jb = add36(3n, -ctx.team); local.je = local.jb; }
  const lastTeam = local.je;
  for (local.i = local.jb; local.i <= lastTeam; local.i = add36(local.i, 1n)) {
    if (io.baseCount(local.i) <= 0n) continue;
    for (local.j = 1n; local.j <= BigInt(K.KNBASE); local.j = add36(local.j, 1n)) {
      if (base().strength <= 0n) continue;
      const half = BigInt(K.KNPLAY / 2), lastShip = multiply36(half, add36(3n, -local.i));
      for (local.k = add36(multiply36(half, add36(2n, -local.i)), 1n); local.k <= lastShip; local.k = add36(local.k, 1n)) {
        if (!io.logical(io.alive(local.k))) continue;
        if (io.disp(BigInt(ship().v), BigInt(ship().h)) <= 0n) continue;
        if (!io.ldis(BigInt(ship().v), BigInt(ship().h), BigInt(base().v), BigInt(base().h), 4n)) continue;
        hit.vfrom = BigInt(base().v); hit.hfrom = BigInt(base().h); hit.vto = BigInt(ship().v); hit.hto = BigInt(ship().h);
        hit.dispto = add36(multiply36(add36(BigInt(K.DXFSHP + 2), -local.i), 100n), local.k); hit.iwhat = 1n;
        hit.dispfr = add36(multiply36(add36(BigInt(K.DXFBAS - 1), local.i), 100n), local.j); hit.shjump = 0n;
        local.id = distance();
        yield* io.phadam(w(add36(3n, -local.i)), ref(local, 'k'), ref(local, 'id'), w(quotient(200n, ctx.shared.numply)), w(io.falseWord));
        addScore(io, local.i, K.KPEDAM, hit.ihita); hit.shstfr = base().strength; hit.shcnfr = 1n;
        if (hit.klflg !== 0n) addScore(io, local.i, K.KPEKIL, 5000n);
        io.pridis(position(ship, 'v'), position(ship, 'h'), w(BigInt(K.KRANGE)), ref(ctx, 'team'), w(0n));
        io.pridis(position(ship, 'v'), position(ship, 'h'), w(4n), w(0n), w(1n));
        hit.dbits = signed36(hit.dbits | io.bits(local.k)); yield* io.makhit();
      }
      if (!io.logical(ctx.shared.rom)) continue;
      if (!io.ldis(BigInt(rom().v), BigInt(rom().h), BigInt(base().v), BigInt(base().h), 4n)) continue;
      hit.dispto = BigInt(K.DXROM * 100); hit.shjump = 0n;
      hit.dispfr = add36(multiply36(add36(BigInt(K.DXFBAS - 1), local.i), 100n), local.j); hit.iwhat = 1n;
      hit.vfrom = BigInt(base().v); hit.hfrom = BigInt(base().h); hit.vto = BigInt(rom().v); hit.hto = BigInt(rom().h);
      local.id = distance(); yield* io.pharom(w(quotient(200n, ctx.shared.numply)), ref(local, 'id'));
      hit.shstfr = base().strength; hit.shcnfr = 1n; hit.shstto = ctx.shared.erom; hit.shcnto = 1n;
      io.pridis(position(rom, 'v'), position(rom, 'h'), w(BigInt(K.KRANGE)), w(0n), w(0n));
      addScore(io, local.i, K.KPRKIL, hit.ihita);
      if (!io.logical(ctx.shared.rom)) addScore(io, local.i, K.KPRKIL, 5000n);
      yield* io.makhit();
    }
  }
}

// PLNATK.FOR:28-95. The fixed PHADAM kind=2, unscaled Romulan power,
// and PRIDIS-before-PHAROM order are deliberate source behavior.
export function* planetAttack<W>(ctx: DefenseContext, local: PlanetAttackLocals, hit: HitRegisters,
  io: DefenseServices<W>): Generator<W, void, void> {
  if (io.planetCount() <= 0n) return;
  const end = io.planetCount(), planet = () => io.planet(local.k), ship = () => io.ship(local.j), rom = () => ctx.shared.locr;
  const distance = () => io.pdist(ref(hit, 'vfrom'), ref(hit, 'hfrom'), ref(hit, 'vto'), ref(hit, 'hto'));
  const power = () => add36(50n, multiply36(30n, planet().builds));
  for (local.k = 1n; local.k <= end; local.k = add36(local.k, 1n)) {
    local.pcode = io.dispc(BigInt(planet().v), BigInt(planet().h)); local.pteam = add36(local.pcode, -BigInt(K.DXNPLN));
    if (io.and(() => local.pcode === BigInt(K.DXNPLN), () => io.iran(2n) === 1n)) continue;
    if (io.and(() => io.logical(ctx.player), () => local.pteam === ctx.team)) continue;
    for (local.j = 1n; local.j <= BigInt(K.KNPLAY); local.j = add36(local.j, 1n)) {
      local.jtype = BigInt(local.j > BigInt(K.KNPLAY / 2) ? K.DXEPLN : K.DXFPLN);
      if (io.or(() => local.pcode === local.jtype, () => !io.logical(io.alive(local.j)))) continue;
      if (io.disp(BigInt(ship().v), BigInt(ship().h)) <= 0n) continue;
      if (!io.ldis(BigInt(ship().v), BigInt(ship().h), BigInt(planet().v), BigInt(planet().h), 2n)) continue;
      hit.dispfr = io.disp(BigInt(planet().v), BigInt(planet().h)); hit.dispto = io.disp(BigInt(ship().v), BigInt(ship().h));
      hit.shstfr = planet().builds; hit.vfrom = BigInt(planet().v); hit.hfrom = BigInt(planet().h);
      hit.vto = BigInt(ship().v); hit.hto = BigInt(ship().h); hit.shjump = 0n; hit.iwhat = 1n;
      local.phit = quotient(power(), ctx.shared.numply); local.id = distance();
      yield* io.phadam(w(2n), ref(local, 'j'), ref(local, 'id'), ref(local, 'phit'), w(io.falseWord));
      if (local.pcode !== BigInt(K.DXNPLN)) addScore(io, local.pteam, K.KPEDAM, hit.ihita);
      if (io.and(() => hit.klflg !== 0n, () => local.pcode !== BigInt(K.DXNPLN))) addScore(io, local.pteam, K.KPEKIL, 5000n);
      io.pridis(position(ship, 'v'), position(ship, 'h'), w(BigInt(K.KRANGE)), ref(local, 'pteam'), w(0n));
      io.pridis(position(ship, 'v'), position(ship, 'h'), w(4n), w(0n), w(1n)); yield* io.makhit();
    }
    if (!io.logical(ctx.shared.rom)) continue;
    if (!io.ldis(BigInt(rom().v), BigInt(rom().h), BigInt(planet().v), BigInt(planet().h), 2n)) continue;
    hit.dispfr = io.disp(BigInt(planet().v), BigInt(planet().h)); hit.dispto = BigInt(K.DXROM * 100); hit.iwhat = 1n;
    hit.shstfr = planet().builds; hit.vfrom = BigInt(planet().v); hit.hfrom = BigInt(planet().h);
    hit.vto = BigInt(rom().v); hit.hto = BigInt(rom().h); hit.shjump = 0n;
    io.pridis(position(rom, 'v'), position(rom, 'h'), w(BigInt(K.KRANGE)), ref(local, 'pteam'), w(0n));
    io.pridis(position(rom, 'v'), position(rom, 'h'), w(4n), w(0n), w(1n));
    local.id = distance(); yield* io.pharom(w(power()), ref(local, 'id'));
    hit.shstto = ctx.shared.erom; hit.shcnto = 1n;
    if (local.pcode !== BigInt(K.DXNPLN)) addScore(io, local.pteam, K.KPRKIL, hit.ihita);
    if (io.and(() => !io.logical(ctx.shared.rom), () => local.pcode !== BigInt(K.DXNPLN))) addScore(io, local.pteam, K.KPRKIL, 5000n);
    yield* io.makhit();
  }
}

// BASBLD.FOR:27-45. Compute the initial division even for PLAYER calls that
// replace N. No NBASE guard, minimum increment, or lower clamp is inserted.
export function rebuildBases<W>(ctx: DefenseContext, local: BaseRebuildLocals,
  io: Pick<DefenseServices<W>, 'logical' | 'sideCount' | 'base'>): void {
  local.ib = 1n; local.ie = 2n; local.n = quotient(50n, add36(ctx.shared.numply, 1n));
  if (io.logical(ctx.player)) {
    if (ctx.team === 1n) local.ib = 2n;
    local.ie = local.ib; local.n = quotient(25n, io.sideCount(ctx.team));
  }
  const end = local.ie;
  for (local.j = local.ib; local.j <= end; local.j = add36(local.j, 1n)) {
    for (local.i = 1n; local.i <= BigInt(K.KNBASE); local.i = add36(local.i, 1n)) {
      const base = io.base(local.i, local.j); if (base.strength <= 0n) continue;
      const value = add36(base.strength, local.n); base.strength = value < 1000n ? value : 1000n;
    }
  }
}
