import { constants as K } from '../runtime/variant-values.ts';
import { ldis, PackedBoard } from '../compat/board.ts';
import type { WordReference } from './lifecycle.ts';

export type PlacementWorld = {
  board: PackedBoard;
  nbase: readonly bigint[]; numcap: readonly bigint[]; nplnet: number;
  bases: readonly (readonly { v: number; h: number }[])[];
  planets: readonly { v: number; h: number }[];
};
export class PlacementLocals { k = 0; i = 0; pteam = 0; }
export type PlacementServices = {
  iran(n: bigint): bigint;
  // The source enters DO 1,N without checking N. No zero-trip default.
  reversedLoop?(first: number, last: number): { iterations: readonly number[]; after: number };
};

// PLACE.FOR:26-59. All four arguments are live references. Coordinates change
// even on rejected draws; N's DO limit is captured on entry. Object codes are
// not incremented: the statement that once did so is commented out.
export function place(world: PlacementWorld, object: WordReference, count: WordReference,
  v: WordReference, h: WordReference, local: PlacementLocals, io: PlacementServices): void {
  const end = Number(count.value);
  const reversed = end < 1 ? io.reversedLoop?.(1, end) : undefined;
  if (end < 1 && !reversed) throw new Error('PLACE reversed DO bounds require the compiler contract');
  const iterations = reversed?.iterations ?? { *[Symbol.iterator]() { for (let k = 1; k <= end; k++) yield k; } };
  for (local.k of iterations) {
    retry: for (;;) {
      v.value = io.iran(BigInt(K.KGALV)); h.value = io.iran(BigInt(K.KGALH));
      if (world.board.disp(Number(v.value), Number(h.value)) !== 0) continue;
      if (object.value / 100n <= BigInt(K.DXESHP)) {
        local.pteam = Number(3n - object.value / 100n);
        if (world.nbase[local.pteam] === undefined) throw new RangeError('PLACE NBASE requires source memory');
        if (world.nbase[local.pteam] > 0n) {
          for (local.i = 1; local.i <= K.KNBASE; local.i++) {
            const b = world.bases[local.pteam]?.[local.i];
            if (!b) throw new RangeError('PLACE BASE requires source memory');
            if (ldis(Number(v.value), Number(h.value), b.v, b.h, 4)) continue retry;
          }
        }
        if (world.numcap[local.pteam] === undefined) throw new RangeError('PLACE NUMCAP requires source memory');
        if (world.nplnet > 0 && world.numcap[local.pteam] > 0n) {
          const limit = world.nplnet;
          for (local.i = 1; local.i <= limit; local.i++) {
            const p = world.planets[local.i];
            if (!p) throw new RangeError('PLACE LOCPLN requires source memory');
            // The source compares raw DISPC to PTEAM, not a decoded planet owner.
            if (local.pteam !== world.board.dispc(p.v, p.h)) continue;
            if (ldis(Number(v.value), Number(h.value), p.v, p.h, 2)) continue retry;
          }
        }
      }
      world.board.setdsp(Number(v.value), Number(h.value), Number(object.value)); break;
    }
  }
  local.k = reversed?.after ?? end + 1;
}
