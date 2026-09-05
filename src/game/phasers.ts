import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { add36, multiply36, signed36 } from '../compat/word36.ts';
import type { RealArithmetic } from '../compat/real.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { Ship } from './ship.ts';
import type { WordReference } from './lifecycle.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { CommandReturn } from './maintenance.ts';

export class PhaserLocals { tem = 0n; bank = 0; iv = 0n; ih = 0n; nplc = 0n; ip = 0n; id = 0n; phit = 0n; }
export type PhaserContext = { who: number; team: number; oflg: number; nomsg: bigint; slowestTerminal: bigint;
  ship: Ship; phbank: bigint[]; tpoint: bigint[]; shared: { rom: bigint; erom: bigint; locr: { v: number; h: number } } };
export type PhaserServices<R, W> = {
  real: RealArithmetic<R>; logical(word: bigint): boolean; trueWord: bigint;
  and(left: () => boolean, right: () => boolean): boolean; or(left: () => boolean, right: () => boolean): boolean;
  alive(index: bigint): bigint; bits(index: number): bigint;
  dispc(v: bigint, h: bigint): bigint; dispx(v: bigint, h: bigint): bigint; disp(v: bigint, h: bigint): bigint;
  pdist(v: bigint, h: bigint, sv: bigint, sh: bigint): bigint;
  planetBuilds(index: bigint): WordReference; baseStrength(index: bigint, team: bigint): bigint;
  elapsed(): bigint; iran(max: bigint): bigint; pause(milliseconds: bigint): Generator<W, void, void>;
  locate(entry: 'locate' | 'reloc', n: WordReference): Generator<W, bigint, void>;
  pharom(phit: WordReference, id: WordReference): Generator<W, void, void>;
  phadam(nplc: WordReference, index: WordReference, id: WordReference, phit: WordReference, ship: WordReference): Generator<W, void, void>;
  pridis(v: WordReference, h: WordReference, limit: WordReference, flag: WordReference, zero: WordReference): void;
  makhit(): Generator<W, void, void>;
};

// PHACON.FOR:25-164. No PTIME assignment: normal completion instead sets the
// selected PHBANK ready time after damage, notifications and final energy cost.
export function* phasers<R, W>(ctx: PhaserContext, input: TokenMemory, local: PhaserLocals,
  hit: HitRegisters, out: TerminalOutput, io: PhaserServices<R, W>): Generator<W, CommandReturn, void> {
  const alt = (): CommandReturn => ({ alternateReturn: true });
  const fail = (message: string) => { out.out(message, 1); return alt(); };
  const ref = (key: 'iv' | 'ih' | 'nplc' | 'ip' | 'id' | 'phit'): WordReference => ({
    get value() { return local[key]; }, set value(n) { local[key] = n; },
  });
  const word = (value: bigint): WordReference => ({ value });
  const sender = () => add36(BigInt(ctx.who), multiply36(BigInt(ctx.team), 100n));
  const nearby = (limit: bigint, flag: bigint, zero: bigint) => io.pridis(ref('iv'), ref('ih'), word(limit), word(flag), word(zero));
  const announcement = () => io.pridis(word(30n), word(30n), word(100n), word(add36(local.nplc, -2n)), word(0n));
  if (ctx.ship.devices[K.KDPHAS] >= BigInt(K.KCRIT)) return fail(M.phacn0.text);
  local.tem = yield* io.locate('locate', word(-3n));
  for (;;) {
    if (local.tem === 1n) out.out(M.erloc1.text, 1);
    if (local.tem < 0n || local.tem === 1n) return alt();
    if (local.tem !== 0n) break;
    local.tem = yield* io.locate('reloc', word(-3n));
  }
  local.bank = 1; if (ctx.phbank[2] < ctx.phbank[1]) local.bank = 2;
  local.iv = input.tokens[Number(local.tem) - 2].value; local.ih = input.tokens[Number(local.tem) - 1].value;
  local.nplc = io.dispc(local.iv, local.ih); local.ip = io.dispx(local.iv, local.ih);
  if (local.nplc < BigInt(K.DXFSHP) || local.nplc > BigInt(K.DXEPLN)) return fail(M.phacn7.text);
  if (io.and(() => local.nplc < BigInt(K.DXFBAS), () => !io.logical(io.alive(local.ip)))) return fail(M.phacn7.text);
  local.id = io.pdist(local.iv, local.ih, BigInt(ctx.ship.v), BigInt(ctx.ship.h));
  if (local.id === 0n) return fail(ctx.oflg <= 0 ? M.error2.text : M.error1.text);
  if (local.nplc === BigInt(ctx.team) || local.nplc === BigInt(ctx.team + 2) || local.nplc === BigInt(ctx.team + K.DXNPLN)) return fail(M.phacn9.text);
  if (local.id > BigInt(K.KRANGE)) return fail(M.phacn1.text);
  yield* io.pause(add36(ctx.phbank[local.bank], -io.elapsed()));
  local.phit = 200n;
  if (local.tem !== 2n) {
    if (input.tokens[0].value > 500n || input.tokens[0].value < 50n) return fail(M.phacn8.text);
    local.phit = input.tokens[0].value;
  }
  if (ctx.ship.shieldCondition >= 0n) {
    if (ctx.oflg !== K.SHORT) out.out(M.phacn2.text, 1);
    ctx.ship.energy = add36(ctx.ship.energy, -2000n);
  }
  if (multiply36(io.iran(100n), local.phit) > 18900n) {
    out.out(M.phacn4.text, 1); if (ctx.oflg === K.LONG) out.out(M.phacn5.text, 1);
    const real = io.real;
    // Integer product before *7.5; damage+750 stays integer until mixed addition.
    const prior = add36(ctx.ship.devices[K.KDPHAS], 750n);
    const extra = real.divide(real.multiply(real.fromInteger(multiply36(io.iran(100n), local.phit)), real.literal('7.5')), real.fromInteger(100n));
    ctx.ship.devices[K.KDPHAS] = real.toInteger(real.add(real.fromInteger(prior), extra));
  }
  if (local.nplc >= BigInt(K.DXNPLN) && local.nplc <= BigInt(K.DXEPLN)) {
    hit.vfrom = BigInt(ctx.ship.v); hit.hfrom = BigInt(ctx.ship.h);
    hit.shstfr = ctx.ship.shieldStrength; hit.shcnfr = ctx.ship.shieldCondition;
    hit.vto = local.iv; hit.hto = local.ih; hit.shjump = 0n;
    hit.dispfr = sender(); hit.dispto = io.disp(local.iv, local.ih); hit.iwhat = 1n;
    nearby(BigInt(K.KRANGE), 0n, 0n);
    if (multiply36(io.iran(100n), local.phit) / multiply36(25n, local.id) > 150n) {
      const builds = io.planetBuilds(local.ip); const reduced = add36(builds.value, -1n); builds.value = reduced > 0n ? reduced : 0n;
    }
    hit.shstto = io.planetBuilds(local.ip).value; yield* io.makhit();
  } else if (local.nplc === BigInt(K.DXROM)) {
    hit.vfrom = BigInt(ctx.ship.v); hit.hfrom = BigInt(ctx.ship.h);
    hit.vto = BigInt(ctx.shared.locr.v); hit.hto = BigInt(ctx.shared.locr.h); hit.shjump = 0n;
    yield* io.pharom(ref('phit'), ref('id'));
    ctx.tpoint[K.KPRKIL] = add36(ctx.tpoint[K.KPRKIL], hit.ihita);
    if (!io.logical(ctx.shared.rom)) ctx.tpoint[K.KPRKIL] = add36(ctx.tpoint[K.KPRKIL], 5000n);
    hit.shstfr = ctx.ship.shieldStrength; hit.shcnfr = ctx.ship.shieldCondition;
    hit.shstto = ctx.shared.erom; hit.shcnto = 1n;
    hit.dispfr = sender(); hit.dispto = BigInt(K.DXROM * 100); hit.iwhat = 1n;
    nearby(BigInt(K.KRANGE), 0n, 0n); yield* io.makhit();
  } else {
    if (local.nplc >= BigInt(K.DXFBAS) && io.baseStrength(local.ip, add36(local.nplc, -2n)) === 1000n) {
      hit.vto = local.iv; hit.hto = local.ih; hit.iwhat = 9n;
      hit.dispto = io.disp(local.iv, local.ih); hit.dispfr = sender();
      announcement(); hit.dbits = signed36(hit.dbits & ~ctx.nomsg); yield* io.makhit();
    }
    yield* io.phadam(ref('nplc'), ref('ip'), ref('id'), ref('phit'), word(io.trueWord));
    hit.shstfr = ctx.ship.shieldStrength; hit.shcnfr = ctx.ship.shieldCondition;
    hit.vfrom = BigInt(ctx.ship.v); hit.hfrom = BigInt(ctx.ship.h);
    hit.vto = local.iv; hit.hto = local.ih; hit.shjump = 0n;
    hit.dispfr = sender(); hit.dispto = add36(multiply36(local.nplc, 100n), local.ip); hit.iwhat = 1n;
    if (local.nplc >= BigInt(K.DXFBAS)) nearby(BigInt(K.KRANGE), add36(local.nplc, -2n), 0n);
    if (local.nplc < BigInt(K.DXFBAS)) nearby(BigInt(K.KRANGE), local.nplc, 0n);
    nearby(4n, 0n, 1n); hit.dbits = signed36(hit.dbits | io.bits(ctx.who)); yield* io.makhit();
    if (!io.or(() => local.nplc < BigInt(K.DXFBAS), () => io.disp(local.iv, local.ih) !== 0n)) {
      hit.iwhat = 10n; hit.dispto = add36(multiply36(local.nplc, 100n), local.ip); hit.dispfr = sender();
      hit.vto = local.iv; hit.hto = local.ih;
      announcement(); hit.dbits = signed36(hit.dbits & ~ctx.nomsg); yield* io.makhit();
    }
  }
  ctx.ship.energy = add36(ctx.ship.energy, -multiply36(local.phit, 10n)); ctx.ship.condition = K.RED;
  ctx.phbank[local.bank] = add36(add36(io.elapsed(), multiply36(add36(ctx.slowestTerminal, 1n), 1500n)), ctx.ship.devices[K.KDPHAS]);
  return { alternateReturn: false };
}
