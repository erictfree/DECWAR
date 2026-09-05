import { constants as K } from '../runtime/variant-values.ts';
import { add36 } from '../compat/word36.ts';
import type { WordReference } from './lifecycle.ts';
import type { RealArithmetic } from '../compat/real.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { CheckOutput } from './check.ts';

// /SNLOCL/: OBJSTK(8,4), STRSTK(80,2), in physical column-major word order.
// Construction fills a caller-selected prior state; SNOVA resets only pointers.
export class SupernovaMemory {
  words: bigint[];
  constructor(priorWord: bigint) { this.words = Array<bigint>(192).fill(priorWord); }
  at(offset: bigint): WordReference {
    if (offset < 0n || offset >= BigInt(this.words.length)) throw new RangeError('SNLOCL requires surrounding source memory');
    const words = this.words, i = Number(offset); return { get value() { return words[i]; }, set value(n) { words[i] = n; } };
  }
  object(row: bigint, col: bigint): WordReference { return this.at((col - 1n) * 8n + row - 1n); }
  star(row: bigint, col: bigint): WordReference { return this.at(32n + (col - 1n) * 80n + row - 1n); }
}
export class SupernovaLocals { objptr = 0n; strptr = 0n; v = 0n; h = 0n; object = 0n; thing = 0n; }
export type SupernovaServices<R, W> = {
  real: RealArithmetic<R>; logical(word: bigint): boolean; or(...terms: (() => boolean)[]): boolean; iran(max: bigint): bigint;
  disp(v: bigint, h: bigint): bigint; dispc(v: bigint, h: bigint): bigint; setdsp(v: bigint, h: bigint, code: bigint): void;
  nova(kind: WordReference, index: WordReference): Generator<W, void, void>;
  pridis(v: WordReference, h: WordReference, limit: WordReference, flag: WordReference, zero: WordReference): void;
  makhit(): Generator<W, void, void>;
  reversedLoop?(first: bigint, last: bigint): { iterations: readonly bigint[]; after: bigint };
};
// SNOVA.FOR:25-75. CHECK H2/V2 map to IVC/IHC here. Object identities are
// reread when popped, after earlier victims may have moved or planets shifted.
export function* supernova<R, W>(ctx: { player: bigint; tpoint: bigint[]; rsr: bigint[] }, path: CheckOutput<R>,
  hit: HitRegisters, local: SupernovaLocals, memory: Pick<SupernovaMemory, 'object' | 'star'>,
  io: SupernovaServices<R, W>): Generator<W, void, void> {
  const w = (value: bigint) => ({ value });
  const max = (a: bigint, b: bigint) => a > b ? a : b, min = (a: bigint, b: bigint) => a < b ? a : b;
  function loop(first: bigint, last: bigint) {
    if (last >= first) return { *iterations() { for (let i = first; i <= last; i++) yield i; }, after: add36(last, 1n) };
    const supplied = io.reversedLoop?.(first, last); if (!supplied) throw new Error('SNOVA reversed DO bounds require the compiler contract');
    return { iterations: () => supplied.iterations, after: supplied.after };
  }
  io.setdsp(path.h2, path.v2, 0n); local.objptr = 0n; local.strptr = 0n;
  for (;;) {
    const rows = loop(max(1n, add36(path.h2, -1n)), min(BigInt(K.KGALV), add36(path.h2, 1n)));
    for (local.v of rows.iterations()) {
      const columns = loop(max(1n, add36(path.v2, -1n)), min(BigInt(K.KGALH), add36(path.v2, 1n)));
      for (local.h of columns.iterations()) {
        local.object = io.dispc(local.v, local.h);
        if (local.object >= 1n && local.object <= BigInt(K.DXEPLN)) {
          local.objptr = add36(local.objptr, 1n);
          memory.object(local.objptr, 1n).value = local.v; memory.object(local.objptr, 2n).value = local.h;
          memory.object(local.objptr, 3n).value = add36(local.v, -path.h2); memory.object(local.objptr, 4n).value = add36(local.h, -path.v2);
        } else {
          if (io.or(() => local.object !== BigInt(K.DXSTAR), () => io.iran(5n) === 5n)) continue;
          if (local.strptr === 29n) continue;
          local.strptr = add36(local.strptr, 1n);
          memory.star(local.strptr, 1n).value = local.v; memory.star(local.strptr, 2n).value = local.h;
          io.setdsp(local.v, local.h, 0n);
        }
      }
      local.h = columns.after;
    }
    local.v = rows.after;
    while (local.objptr !== 0n) {
      path.h1 = memory.object(local.objptr, 1n).value; path.v1 = memory.object(local.objptr, 2n).value;
      path.dhs = io.real.fromInteger(memory.object(local.objptr, 3n).value); path.dvs = io.real.fromInteger(memory.object(local.objptr, 4n).value);
      local.objptr = add36(local.objptr, -1n);
      local.thing = io.disp(path.h1, path.v1);
      if (local.thing <= 0n || local.thing >= BigInt(100 * K.DXSTAR)) continue;
      yield* io.nova(w(local.thing / 100n), w(local.thing % 100n));
    }
    if (local.strptr === 0n) return;
    path.h2 = memory.star(local.strptr, 1n).value; path.v2 = memory.star(local.strptr, 2n).value; local.strptr = add36(local.strptr, -1n);
    hit.dispfr = BigInt(K.DXSTAR * 100); hit.iwhat = 7n; hit.vfrom = path.h2; hit.hfrom = path.v2;
    io.pridis({ get value() { return hit.vfrom; }, set value(n) { hit.vfrom = n; } },
      { get value() { return hit.hfrom; }, set value(n) { hit.hfrom = n; } }, w(BigInt(K.KRANGE)), w(0n), w(0n));
    yield* io.makhit();
    if (io.logical(ctx.player)) ctx.tpoint[K.KNSDES] = add36(ctx.tpoint[K.KNSDES], -500n);
    if (!io.logical(ctx.player)) ctx.rsr[K.KNSDES] = add36(ctx.rsr[K.KNSDES], -500n);
  }
}
