import type { Position } from "./model.ts";

export function pursuitPath(dv: number, dh: number) {
  const distance = Math.max(Math.abs(dv), Math.abs(dh));
  if (distance <= 1) return null;
  return { aim: { vertical: dv - Math.sign(dv), horizontal: dh - Math.sign(dh) },
    extent: Math.min(4, distance) };
}

export function pursuitFallback(last: Position, extent: number,
  occupied: (p: Position) => boolean): Position | null {
  for (let i = 1; i <= extent; i++) {
    for (const candidate of [
      { vertical: last.vertical - i, horizontal: last.horizontal },
      { vertical: last.vertical, horizontal: last.horizontal - i },
    ]) {
      if (candidate.vertical >= 1 && candidate.vertical <= 75 &&
        candidate.horizontal >= 1 && candidate.horizontal <= 75 && !occupied(candidate)) return candidate;
    }
  }
  return null;
}
