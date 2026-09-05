import { constants as K } from '../generated/source-data.ts';
import { add36 } from '../compat/word36.ts';
import type { RealArithmetic } from '../compat/real.ts';
import type { WordReference } from './lifecycle.ts';
import type { Ship } from './ship.ts';
import type { HitRegisters } from './hit-queue.ts';

export class WeaponDamageLocals<R> {
  rand: R; rana: R; hit: R; ranb: R; hita: R; powfac = 0n;
  constructor(priorReal: R) { this.rand = this.rana = this.hit = this.ranb = this.hita = priorReal; }
}
export type DamageReal<R> = RealArithmetic<R> & { compare(a: R, b: R): -1 | 0 | 1; amax1(a: R, b: R): R };
export type WeaponDamageContext = { who: bigint; team: bigint; player: bigint; tpoint: bigint[]; rsr: bigint[] };
export type WeaponDamageServices<R, W> = {
  real: DamageReal<R>; ran(zero: 0): R; iran(max: bigint): bigint; pwr(base: R, exponent: WordReference): R;
  logical(word: bigint): boolean; and(...terms: (() => boolean)[]): boolean; or(...terms: (() => boolean)[]): boolean;
  torpedoShieldBranch(test: boolean): 1000 | 300;
  ship(index: bigint): Ship; device(index: bigint, device: bigint): WordReference; alive(index: bigint): WordReference;
  base(index: bigint, team: bigint): { v: number; h: number; strength: bigint }; baseCount(team: bigint): WordReference;
  jump(kind: WordReference, index: WordReference): Generator<W, void, void>;
  baskil(team: WordReference): Generator<W, void, void>; setdsp(v: bigint, h: bigint, code: bigint): void;
};

// TORDAM.FOR:26-193, including PHADAM's separate entry. Label numbers retain
// the jumps that skip damage/scoring on deflection and immediate base criticals.
// Numeric services expose real rounding/comparison/AMAX1 and PWR instruction
// behavior; compiler services expose logical evaluation and the two-label IF.
export function* weaponDamage<R, W>(entry: 'tordam' | 'phadam', kind: WordReference, index: WordReference,
  distance: WordReference, phit: WordReference, shipFlag: WordReference, ctx: WeaponDamageContext,
  local: WeaponDamageLocals<R>, hit: HitRegisters, io: WeaponDamageServices<R, W>): Generator<W, void, void> {
  const r = io.real, c = (text: string) => r.literal(text), f = (n: bigint) => r.fromInteger(n), int = (v: R) => r.toInteger(v);
  const ship = () => io.ship(index.value), baseTeam = () => add36(kind.value, -2n), base = () => io.base(index.value, baseTeam());
  const isShip = () => kind.value < BigInt(K.DXFBAS), isBase = () => kind.value >= BigInt(K.DXFBAS);
  const player = () => io.logical(ctx.player), firingShip = () => io.logical(shipFlag.value);
  const less = (a: R, b: R) => r.compare(a, b) < 0;
  const addScore = (scores: bigint[], category: number, amount: R) => { scores[category] = int(r.add(f(scores[category]), amount)); };
  const absorb = (strength: bigint, magnitude: R): bigint => int(r.subtract(f(strength),
    r.multiply(r.add(r.multiply(magnitude, r.amax1(r.multiply(f(strength), c('0.001')), c('0.1'))), f(10n)), c('0.03'))));
  let pc: number;
  if (entry === 'tordam') {
    if (io.and(isShip, () => io.or(() => ship().damage >= BigInt(K.KENDAM), () => ship().energy <= 0n))) return;
    if (io.and(isBase, () => base().strength <= 0n)) return;
    hit.iwhat = 2n; local.rand = io.ran(0); local.rana = io.ran(0);
    local.hit = c('0.0'); local.hita = c('0.0'); local.ranb = r.subtract(local.rand, c('0.5'));
    local.hit = r.add(c('4000.0'), r.multiply(c('4000.0'), io.ran(0)));
    pc = isBase() ? 1100 : io.torpedoShieldBranch(ship().shieldCondition > 0n);
  } else {
    hit.iwhat = 1n; local.powfac = 80n; local.rana = io.ran(0); local.hit = c('0.0');
    if (io.and(isShip, () => ship().shieldCondition > 0n)) local.powfac /= 2n;
    if (isBase()) local.powfac /= 2n;
    local.hit = io.pwr(r.add(c('0.9'), r.multiply(c('0.02'), io.ran(0))), distance);
    if (io.and(player, firingShip, () => io.or(() => io.ship(ctx.who).devices[K.KDPHAS] > 0n, () => io.ship(ctx.who).devices[K.KDCOMP] > 0n)))
      local.hit = r.multiply(local.hit, c('0.8'));
    if (isBase()) pc = 900;
    else if (ship().shieldCondition < 0n) pc = 800;
    else {
      local.hita = local.hit;
      local.hit = r.multiply(r.multiply(f(add36(1000n, -ship().shieldStrength)), local.hita), c('0.001'));
      ship().shieldStrength = absorb(ship().shieldStrength, r.multiply(r.multiply(local.hita, f(local.powfac)), f(phit.value)));
      if (ship().shieldStrength < 0n) ship().shieldStrength = 0n;
      pc = 800;
    }
  }
  for (;;) switch (pc) {
    case 100:
      if (isBase()) { pc = 200; break; }
      local.hita = r.multiply(r.multiply(local.hit, r.subtract(c('1000.0'), f(ship().shieldStrength))), c('0.001'));
      ship().shieldStrength = absorb(ship().shieldStrength, local.hit);
      if (ship().shieldStrength < 0n) ship().shieldStrength = 0n;
      pc = 300; break;
    case 200:
      local.hita = r.multiply(r.multiply(local.hit, f(add36(1000n, -base().strength))), c('0.001'));
      base().strength = absorb(base().strength, local.hit); pc = 400; break;
    case 300:
      if (ship().shieldCondition < 0n) local.hita = local.hit;
      pc = 400; break;
    case 400:
      hit.ihita = int(local.hita);
      if (io.and(() => less(r.multiply(local.hita, r.add(local.rana, c('0.1'))), c('1700.0')), isShip)) { pc = 500; break; }
      if (io.and(() => less(r.multiply(local.hita, r.add(local.rana, c('0.1'))), c('1700.0')), isBase)) { pc = 600; break; }
      if (io.and(() => io.iran(5n) === 5n, isBase)) { pc = 1400; break; }
      if (isBase()) { pc = 600; break; }
      local.hita = r.divide(local.hita, c('2.0'));
      hit.critdv = int(r.add(r.multiply(f(BigInt(K.KNDEV)), io.ran(0)), c('1.0')));
      { const device = io.device(index.value, hit.critdv); device.value = int(r.add(f(device.value), local.hita)); }
      if (hit.critdv === BigInt(K.KDSHLD)) ship().shieldCondition = -1n;
      hit.critdm = int(local.hita);
      local.hita = r.add(local.hita, r.multiply(r.subtract(io.ran(0), c('0.5')), c('1000.0')));
      hit.ihita = int(local.hita); pc = 500; break;
    case 500:
      ship().damage = int(r.add(f(ship().damage), local.hita));
      ship().energy = int(r.subtract(f(ship().energy), local.hita));
      pc = 600; break;
    case 600:
      if (isBase()) { const value = int(r.subtract(f(base().strength), r.multiply(local.hita, c('0.01')))); base().strength = value > 0n ? value : 0n; }
      pc = 700; break;
    case 700:
      if (io.and(isShip, () => ship().shieldStrength <= 0n)) ship().shieldCondition = -1n;
      if (io.and(firingShip, player, () => add36(5n, -ctx.team) === kind.value)) addScore(ctx.tpoint, K.KPBDAM, local.hita);
      if (io.and(firingShip, () => !player(), isBase)) addScore(ctx.rsr, K.KPBDAM, local.hita);
      if (io.and(player, firingShip, () => add36(3n, -ctx.team) === kind.value)) addScore(ctx.tpoint, K.KPEDAM, local.hita);
      if (io.and(firingShip, () => !player(), isShip)) addScore(ctx.rsr, K.KPEDAM, local.hita);
      if (isBase()) { pc = 1300; break; }
      ship().condition = K.RED; hit.shstto = ship().shieldStrength; hit.shcnto = ship().shieldCondition;
      if (io.or(() => ship().damage >= BigInt(K.KENDAM), () => ship().energy <= 0n)) hit.klflg = 2n;
      if (hit.klflg !== 0n) { pc = 750; break; }
      if (hit.iwhat === 1n) return;
      yield* io.jump(kind, index);
      if (hit.klflg === 0n) return;
      pc = 750; break;
    case 750:
      io.setdsp(BigInt(ship().v), BigInt(ship().h), 0n); io.alive(index.value).value = 0n;
      if (io.and(player, firingShip)) ctx.tpoint[K.KPEKIL] = add36(ctx.tpoint[K.KPEKIL], 5000n);
      if (io.and(firingShip, () => !player())) ctx.rsr[K.KPEKIL] = add36(ctx.rsr[K.KPEKIL], 5000n);
      return;
    case 800:
      local.hita = r.multiply(r.multiply(local.hit, f(local.powfac)), f(phit.value)); pc = 400; break;
    case 900:
      local.hita = local.hit;
      local.hit = r.multiply(r.multiply(f(add36(1000n, -base().strength)), local.hita), c('0.001'));
      base().strength = absorb(base().strength, r.multiply(r.multiply(local.hita, f(local.powfac)), f(phit.value)));
      pc = 800; break;
    case 1000:
      local.rand = r.add(r.subtract(local.rana, r.multiply(r.multiply(f(ship().shieldStrength), c('0.001')), local.rand)), c('0.1'));
      pc = 1100; break;
    case 1100:
      if (isBase()) local.rand = r.add(r.subtract(local.rana, r.multiply(r.multiply(f(base().strength), c('0.001')), local.rand)), c('0.1'));
      if (r.compare(local.rand, c('0.0')) > 0) { pc = 100; break; }
      hit.iwhat = 3n; hit.ihita = 0n;
      if (isBase()) base().strength = int(r.amax1(r.subtract(f(base().strength), r.multiply(c('50.0'), local.rana)), c('0.0')));
      if (!isBase()) {
        ship().shieldStrength = int(r.amax1(r.subtract(f(ship().shieldStrength), r.multiply(c('50.'), local.rana)), c('0.')));
        if (ship().shieldStrength < 0n) ship().shieldStrength = 0n;
      }
      local.hita = c('0.0'); pc = 700; break;
    case 1300:
      hit.shstto = base().strength; hit.shcnto = 1n;
      if (base().strength > 0n) return;
      pc = 1400; break;
    case 1400:
      base().strength = add36(add36(base().strength, -50n), -int(r.multiply(c('100.0'), io.ran(0))));
      hit.critdm = 1n;
      if (io.or(() => io.iran(10n) === 10n, () => base().strength <= 0n)) hit.klflg = 2n;
      hit.shstto = base().strength; hit.shcnto = 1n;
      if (hit.klflg === 0n) return;
      yield* io.baskil({ value: baseTeam() });
      { const count = io.baseCount(baseTeam()); count.value = add36(count.value, -1n); }
      if (io.and(firingShip, () => !player())) ctx.rsr[K.KPBDAM] = add36(ctx.rsr[K.KPBDAM], 10000n);
      if (io.and(firingShip, player)) ctx.tpoint[K.KPBDAM] = add36(ctx.tpoint[K.KPBDAM], 10000n);
      io.setdsp(BigInt(base().v), BigInt(base().h), 0n); base().strength = 0n;
      return;
    default: throw new Error('Unreachable TORDAM source label');
  }
}
