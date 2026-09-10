import type { Position } from "./model.ts";
import { flightStep } from "./displacement.ts";

export function minorCandidates(c: number): number[] {
  return Math.abs((Math.trunc(c * 100) % 100) - 50) < 10
    ? [Math.trunc(c), Math.trunc(c) + 1] : [Math.trunc(c + 0.5)];
}

export function sectorPath(start: Position, aim: Position, extent: number,
  deflection: number, occupied: (p: Position) => boolean, sample: () => number) {
  if (!Number.isInteger(extent) || extent < 1) throw new RangeError("Positive extent required");
  const step = flightStep(aim.vertical, aim.horizontal, deflection);
  const vertical = Math.abs(aim.vertical) >= Math.abs(aim.horizontal);
  let major = vertical ? start.vertical : start.horizontal;
  let minor = vertical ? start.horizontal : start.vertical;
  let last = start;
  const position = (m: number): Position => vertical
    ? { vertical: major, horizontal: m } : { vertical: m, horizontal: major };
  for (let i = 0; i < extent; i++) {
    major += vertical ? step.vertical : step.horizontal;
    if (major < 1 || major > 75) break;
    minor += vertical ? step.horizontal : step.vertical;
    const candidates = minorCandidates(minor);
    for (const c of candidates) {
      if (c < 1 || c > 75) return { last, obstruction: null };
      const p = position(c);
      if (occupied(p)) return { last, obstruction: p };
    }
    last = position(candidates.length === 1 ? candidates[0] : Math.trunc(minor + sample()));
  }
  return { last, obstruction: null };
}
