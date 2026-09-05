import { add36 } from '../compat/word36.ts';
import type { WordReference } from './lifecycle.ts';

export class RemovePlanetLocals { j = 0n; }
export type RemovePlanetServices<W> = {
  planet(row: bigint, column: 1 | 2 | 3 | 4): WordReference;
  captured(team: bigint): WordReference;
  baskil(team: WordReference): Generator<W, void, void>;
  // BLKMOV is a forward word copy; exceptional counts/addressing require the
  // real memory/monitor service. Each column call reevaluates I and NPLNET.
  blkmov(fromRow: bigint, toRow: bigint, column: 1 | 2 | 3 | 4, count: bigint): void;
  disp(v: bigint, h: bigint): bigint; setdsp(v: bigint, h: bigint, code: bigint): void;
  endgam(): Generator<W, void, void>;
};
// PLNRMV.FOR:25-58. Leaves the final old row intact, does not clear the deleted
// cell or acquire a lock, and calls ENDGAM after a valid removal.
export function* removePlanet<W>(index: WordReference, team: WordReference, count: WordReference,
  local: RemovePlanetLocals, io: RemovePlanetServices<W>): Generator<W, void, void> {
  if (team.value < 0n) return; if (index.value > count.value) return; if (index.value <= 0n) return;
  if (team.value > 0n && team.value <= 2n) {
    const captured = io.captured(team.value); captured.value = add36(captured.value, -1n);
    yield* io.baskil(team);
  }
  if (index.value !== count.value) for (const column of [1, 2, 3, 4] as const)
    io.blkmov(add36(index.value, 1n), index.value, column, add36(count.value, -index.value));
  count.value = add36(count.value, -1n);
  if (count.value > 0n && index.value <= count.value) {
    const end = count.value;
    for (local.j = index.value; local.j <= end; local.j++) {
      const v = io.planet(local.j, 1).value, h = io.planet(local.j, 2).value;
      io.setdsp(v, h, add36(io.disp(v, h), -1n));
    }
  }
  yield* io.endgam();
}
