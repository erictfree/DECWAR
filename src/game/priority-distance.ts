import { constants as K } from '../generated/source-data.ts';
import { signed36 } from '../compat/word36.ts';
import type { WordReference } from './lifecycle.ts';

export class PriorityDistanceLocals { li = 0; lj = 0; i = 0; }
export type PriorityDistanceServices = {
  alive(index: number): bigint; position(index: number): { v: bigint; h: bigint }; bits(index: number): bigint;
  ldis(v: bigint, h: bigint, pv: bigint, ph: bigint, limit: bigint): boolean;
};
// PRIDIS.FOR:29-46. This tests ALIVE numerically, accepting zero as well as
// negative words. Coordinate/limit arguments are read for each eligible ship.
export function priorityDistance(v: WordReference, h: WordReference, limit: WordReference,
  flag: WordReference, zero: WordReference, hit: { dbits: bigint }, local: PriorityDistanceLocals, io: PriorityDistanceServices): void {
  local.li = 1; local.lj = K.KNPLAY;
  if (flag.value === 1n) local.lj = K.KNPLAY / 2;
  if (flag.value === 2n) local.li = K.KNPLAY / 2 + 1;
  if (zero.value === 0n) hit.dbits = 0n;
  const end = local.lj;
  for (local.i = local.li; local.i <= end; local.i++) {
    if (io.alive(local.i) > 0n) continue;
    const p = io.position(local.i);
    if (io.ldis(v.value, h.value, p.v, p.h, limit.value)) hit.dbits = signed36(hit.dbits | io.bits(local.i));
  }
}
