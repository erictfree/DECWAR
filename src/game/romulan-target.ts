import { constants as K } from '../runtime/variant-values.ts';
import { add36, multiply36 } from '../compat/word36.ts';
import type { WordReference } from './lifecycle.ts';

// DIST.FOR:29: /DISTLC/ V(4), H(4), IV(4), Z(4). DIST resets only Z.
export class DistanceMemory {
  words: bigint[];
  constructor(priorWord: bigint) { this.words = Array<bigint>(16).fill(priorWord); }
  field(column: 0 | 1 | 2 | 3, index: bigint): WordReference {
    const offset = BigInt(column * 4) + index - 1n;
    if (offset < 0n || offset >= 16n) throw new RangeError('DISTLC requires surrounding source memory');
    const words = this.words, i = Number(offset); return { get value() { return words[i]; }, set value(n) { words[i] = n; } };
  }
}
export class DistanceLocals { rv = 0n; rh = 0n; j = 0n; k = 0n; ztem = 0n; }
export type DistanceServices = {
  logical(word: bigint): boolean; and(...terms: (() => boolean)[]): boolean; or(...terms: (() => boolean)[]): boolean; iran(max: bigint): bigint;
  alive(index: bigint): bigint; ship(index: bigint): { v: number; h: number }; baseCount(team: bigint): bigint;
  base(index: bigint, team: bigint): { v: number; h: number; strength: bigint }; disp(v: bigint, h: bigint): bigint;
  pdist(v: WordReference, h: WordReference, rv: WordReference, rh: WordReference): bigint;
};
// DIST.FOR:24-86. No synthesized no-target result: stale V/H/IV survive when
// no candidate beats KGALV*KGALH+1. Within-class ties keep the earlier slot.
export function romulanDistance(ip: WordReference, np: WordReference, num: WordReference, locr: { v: number; h: number },
  memory: DistanceMemory, local: DistanceLocals, io: DistanceServices): void {
  const field = (c: 0 | 1 | 2 | 3, i: bigint) => memory.field(c, i), z = (i: bigint) => field(3, i).value;
  for (let i = 1n; i <= 4n; i++) field(3, i).value = BigInt(K.KGALV * K.KGALH + 1);
  local.rv = BigInt(locr.v); local.rh = BigInt(locr.h);
  const candidate = (kind: bigint, get: () => { v: number; h: number }) => {
    local.ztem = add36(multiply36(add36(local.rv, -BigInt(get().v)), add36(local.rv, -BigInt(get().v))),
      multiply36(add36(local.rh, -BigInt(get().h)), add36(local.rh, -BigInt(get().h))));
    if (local.ztem >= z(kind)) return;
    field(2, kind).value = local.j; field(3, kind).value = local.ztem;
    field(0, kind).value = BigInt(get().v); field(1, kind).value = BigInt(get().h);
  };
  const ship = () => io.ship(local.j), base = () => io.base(local.j, local.k);
  for (local.j = 1n; local.j <= BigInt(K.KNPLAY / 2); local.j++) {
    if (!io.logical(io.alive(local.j))) continue;
    if (io.disp(BigInt(ship().v), BigInt(ship().h)) <= 0n) continue; candidate(1n, ship);
  }
  for (local.j = BigInt(K.KNPLAY / 2 + 1); local.j <= BigInt(K.KNPLAY); local.j++) {
    if (ship().v === 0) continue;
    if (io.disp(BigInt(ship().v), BigInt(ship().h)) <= 0n) continue; candidate(2n, ship);
  }
  for (local.k = 1n; local.k <= 2n; local.k++) {
    if (io.baseCount(local.k) <= 0n) continue;
    for (local.j = 1n; local.j <= BigInt(K.KNBASE); local.j++) {
      if (base().strength <= 0n) continue;
      if (io.disp(BigInt(base().v), BigInt(base().h)) === 0n) continue; candidate(add36(2n, local.k), base);
    }
  }
  np.value = 1n;
  if (io.or(() => z(2n) < z(1n), () => io.and(() => z(1n) === z(2n), () => io.iran(2n) === 1n))) np.value = 2n;
  if (io.or(() => z(3n) < z(np.value), () => io.and(() => z(3n) === z(np.value), () => io.iran(2n) === 1n))) np.value = 3n;
  if (io.or(() => z(4n) < z(np.value), () => io.and(() => z(4n) === z(np.value), () => io.iran(2n) === 1n))) np.value = 4n;
  ip.value = field(2, np.value).value;
  num.value = io.pdist(field(0, np.value), field(1, np.value),
    { get value() { return local.rv; }, set value(n) { local.rv = n; } }, { get value() { return local.rh; }, set value(n) { local.rh = n; } });
}

export class RomulanStarLocals { ivf = 0n; ivl = 0n; ihf = 0n; ihl = 0n; i = 0n; j = 0n; }
export type RomulanStarServices = { dispc(v: bigint, h: bigint): bigint;
  reversedLoop?(first: bigint, last: bigint): { iterations: readonly bigint[]; after: bigint } };
// ROMSTR.FOR:24-39. First star in row-major order wins, including the center.
export function romulanStar(v: WordReference, h: WordReference, local: RomulanStarLocals, io: RomulanStarServices): void {
  const max = (a: bigint, b: bigint) => a > b ? a : b, min = (a: bigint, b: bigint) => a < b ? a : b;
  local.ivf = max(add36(v.value, -1n), 1n); local.ivl = min(add36(v.value, 1n), BigInt(K.KGALV));
  local.ihf = max(add36(h.value, -1n), 1n); local.ihl = min(add36(h.value, 1n), BigInt(K.KGALH));
  function loop(first: bigint, last: bigint) {
    if (last >= first) return { *iterations() { for (let i = first; i <= last; i++) yield i; }, after: add36(last, 1n) };
    const contract = io.reversedLoop?.(first, last); if (!contract) throw new Error('ROMSTR reversed DO bounds require the compiler contract');
    return { iterations: () => contract.iterations, after: contract.after };
  }
  const rows = loop(local.ivf, local.ivl);
  for (local.i of rows.iterations()) {
    const columns = loop(local.ihf, local.ihl);
    for (local.j of columns.iterations()) {
      if (io.dispc(local.i, local.j) !== BigInt(K.DXSTAR)) continue;
      v.value = local.i; h.value = local.j; return;
    }
    local.j = columns.after;
  }
  local.i = rows.after;
}
