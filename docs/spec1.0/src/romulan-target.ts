import type { Position } from "./model.ts";

export function pursuitDistance(a: Position, b: Position): number {
  return (a.vertical - b.vertical) ** 2 + (a.horizontal - b.horizontal) ** 2;
}

// Candidates are already reduced to one eligible object per group, in group order.
export function selectPursuitGroup<T>(candidates: { value: T; distanceSquared: number }[],
  replaceTie: () => boolean): T | null {
  let best: { value: T; distanceSquared: number } | undefined;
  for (const candidate of candidates) {
    if (!best || candidate.distanceSquared < best.distanceSquared
      || (candidate.distanceSquared === best.distanceSquared && replaceTie())) best = candidate;
  }
  return best ? best.value : null;
}
