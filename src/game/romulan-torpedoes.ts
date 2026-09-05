import { constants as K } from '../generated/source-data.ts';
import { add36, multiply36, signed36 } from '../compat/word36.ts';
import type { WordReference } from './lifecycle.ts';
import type { RealArithmetic } from '../compat/real.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { CheckOutput } from './check.ts';

export class RomulanTorpedoLocals<R> {
  misfir = 0n; tpaus = 0n; id = 0n; idis = 0n; aran = 0n; nplc = 0n; j = 0n; iob = 0n; num99 = 0n; iv2 = 0n; ih2 = 0n; i = 0n; pteam = 0n;
  d: { value: R }; idum: WordReference;
  constructor(priorReal: R, priorWord: bigint) { this.d = { value: priorReal }; this.idum = { value: priorWord }; }
}
export type RomulanTorpedoContext = { rtpaus: bigint; slowestTerminal: bigint; nomsg: bigint; rsr: bigint[];
  shared: { rom: bigint; erom: bigint; locr: { v: number; h: number } } };
export type RomulanTorpedoServices<R, W> = {
  real: RealArithmetic<R>; ran(zero: 0): R; iran(max: bigint): bigint; logical(word: bigint): boolean; trueWord: bigint;
  and(...terms: (() => boolean)[]): boolean; or(...terms: (() => boolean)[]): boolean; elapsed(): bigint;
  check(v: WordReference, h: WordReference, iv: WordReference, ih: WordReference, distance: WordReference, d: { value: R }): void;
  base(index: bigint, team: bigint): { v: number; h: number; strength: bigint }; ship(index: bigint): { v: number; h: number };
  planet(index: bigint): { builds: bigint }; tractor(index: bigint): bigint;
  disp(v: bigint, h: bigint): bigint; setdsp(v: bigint, h: bigint, code: bigint): void;
  tordam(kind: WordReference, index: WordReference, distance: WordReference, size: WordReference, ship: WordReference): Generator<W, void, void>;
  trcoff(index: WordReference): Generator<W, void, void>; snova(): Generator<W, void, void>;
  dist(index: WordReference, kind: WordReference, distance: WordReference): void; romstr(v: WordReference, h: WordReference): void;
  lockPlanet(caller: 'ROMTOR'): Generator<W, boolean, void>; unlockPlanet(): void; plnrmv(index: WordReference, team: WordReference): Generator<W, void, void>;
  pridis(v: WordReference, h: WordReference, limit: WordReference, flag: WordReference, zero: WordReference): void; makhit(): Generator<W, void, void>;
};
// ROMTOR.FOR:25-139. IV1/IH1 may alias CHECK's first two words through ROMDRV.
// Keep those references through CHECK; a copied direction vector changes shots.
export function* romulanTorpedoes<R, W>(iv1: WordReference, ih1: WordReference, ctx: RomulanTorpedoContext, local: RomulanTorpedoLocals<R>,
  path: CheckOutput<R>, hit: HitRegisters, io: RomulanTorpedoServices<R, W>): Generator<W, void, void> {
  const r = io.real, w = (value: bigint) => ({ value });
  const ref = (key: 'idis' | 'nplc' | 'j' | 'iob' | 'num99' | 'iv2' | 'ih2' | 'i' | 'pteam'): WordReference => ({ get value() { return local[key]; }, set value(n) { local[key] = n; } });
  const coord = (key: 'h2' | 'v2'): WordReference => ({ get value() { return path[key]; }, set value(n) { path[key] = n; } });
  const rom = (key: 'v' | 'h'): WordReference => ({ get value() { return BigInt(ctx.shared.locr[key]); }, set value(n) { ctx.shared.locr[key] = Number(n); } });
  const nearby = () => io.pridis(coord('h2'), coord('v2'), w(BigInt(K.KRANGE)), w(0n), w(0n));
  const announce = () => { io.pridis(w(30n), w(30n), w(100n), w(add36(local.nplc, -2n)), w(0n)); hit.dbits = signed36(hit.dbits & ~ctx.nomsg); };
  const finish = () => { ctx.rtpaus = add36(io.elapsed(), local.tpaus); };
  local.misfir = 0n; local.tpaus = 0n;
  for (local.id = 1n; local.id <= 3n; local.id++) {
    local.d.value = r.divide(r.subtract(io.ran(0), r.literal('0.5')), r.literal('2.5'));
    if (local.misfir < 0n) { finish(); return; }
    if (io.iran(100n) > 96n) local.misfir = -1n;
    if (local.misfir < 0n) local.d.value = r.add(local.d.value, r.divide(r.subtract(io.ran(0), r.literal('0.5')), r.literal('5.0')));
    local.idis = add36(BigInt(K.KRANGE - 2), r.toInteger(r.add(r.multiply(r.subtract(io.ran(0), r.literal('0.5')), r.literal('4.0')), r.literal('0.5'))));
    local.tpaus = add36(local.tpaus, multiply36(add36(ctx.slowestTerminal, 1n), 1000n));
    io.check(rom('v'), rom('h'), iv1, ih1, ref('idis'), local.d);
    if (path.dcode === 0n) continue;
    local.aran = io.iran(100n);
    if (path.dcode === BigInt(K.DXSTAR * 100)) {
      if (local.aran <= 80n) {
        hit.iwhat = 7n; hit.dispfr = BigInt(K.DXSTAR * 100); hit.vfrom = path.h2; hit.hfrom = path.v2;
        nearby(); yield* io.makhit(); ctx.rsr[K.KNSDES] = add36(ctx.rsr[K.KNSDES], -500n); yield* io.snova();
        if (!io.logical(ctx.shared.rom)) return;
      }
    } else {
      local.nplc = path.dcode / 100n; local.j = path.dcode % 100n;
      if (io.and(() => local.nplc >= BigInt(K.DXNPLN), () => local.nplc <= BigInt(K.DXEPLN))) {
        hit.dispto = path.dcode; hit.iwhat = 2n; hit.dispfr = BigInt(K.DXROM * 100); hit.vfrom = BigInt(ctx.shared.locr.v); hit.hfrom = BigInt(ctx.shared.locr.h);
        hit.vto = path.h2; hit.hto = path.v2; hit.shjump = 0n; hit.shstfr = ctx.shared.erom; hit.shcnfr = 1n;
        if (!(yield* io.lockPlanet('ROMTOR'))) continue;
        local.i = path.dcode % 100n; const planet = () => io.planet(local.i);
        if (local.aran >= 75n) planet().builds = add36(planet().builds, -1n);
        hit.shstto = planet().builds > 0n ? planet().builds : 0n; if (planet().builds < 0n) hit.klflg = 2n;
        if (hit.klflg !== 0n) {
          local.pteam = add36(path.dcode / 100n, -BigInt(K.DXNPLN)); io.setdsp(path.h2, path.v2, 0n);
          ctx.rsr[K.KNPDES] = add36(ctx.rsr[K.KNPDES], -1000n); yield* io.plnrmv(ref('i'), ref('pteam'));
        }
        io.unlockPlanet(); nearby(); yield* io.makhit();
      } else if (local.nplc !== BigInt(K.DXBHOL)) {
        if (local.nplc >= BigInt(K.DXFBAS)) {
          const base = io.base(local.j, add36(local.nplc, -2n));
          if (base.strength === 1000n) { hit.iwhat = 9n; hit.dispto = path.dcode; hit.vto = BigInt(base.v); hit.hto = BigInt(base.h); announce(); yield* io.makhit(); }
        }
        hit.vto = path.h2; hit.hto = path.v2;
        yield* io.tordam(ref('nplc'), ref('j'), local.idum, local.idum, w(io.trueWord));
        hit.vfrom = BigInt(ctx.shared.locr.v); hit.hfrom = BigInt(ctx.shared.locr.h); hit.shstfr = ctx.shared.erom; hit.shcnfr = 1n;
        hit.dispto = path.dcode; hit.dispfr = BigInt(K.DXROM * 100); hit.iwhat = 2n; nearby(); yield* io.makhit();
        if (io.and(() => local.nplc < BigInt(K.DXFBAS), () => io.tractor(local.j) !== 0n)) yield* io.trcoff(ref('j'));
        if (!io.or(() => local.nplc < BigInt(K.DXFBAS), () => io.disp(path.h2, path.v2) !== 0n)) {
          hit.dispto = path.dcode; hit.iwhat = 10n; announce(); hit.vto = path.h2; hit.hto = path.v2; yield* io.makhit();
        }
      }
    }
    io.dist(ref('iob'), ref('nplc'), ref('num99'));
    if (local.num99 > BigInt(K.KRANGE)) { finish(); return; }
    const target = local.nplc < BigInt(K.DXFBAS) ? io.ship(local.iob) : io.base(local.iob, add36(local.nplc, -2n));
    local.iv2 = BigInt(target.v); local.ih2 = BigInt(target.h); io.romstr(ref('iv2'), ref('ih2'));
    iv1.value = add36(local.iv2, -BigInt(ctx.shared.locr.v)); ih1.value = add36(local.ih2, -BigInt(ctx.shared.locr.h));
  }
  finish();
}
