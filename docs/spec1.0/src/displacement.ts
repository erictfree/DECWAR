import type { Position } from "./model.ts";

export function flightStep(dv: number, dh: number, deflection: number): Position {
  if (dv === 0 && dh === 0) throw new RangeError("A flight aim must be nonzero");
  return Math.abs(dv) >= Math.abs(dh)
    ? { vertical: Math.sign(dv), horizontal: dh / Math.abs(dv) + deflection }
    : { vertical: dv / Math.abs(dh) + deflection, horizontal: Math.sign(dh) };
}

export function displacementCandidate(position: Position, step: Position): Position | null {
  const candidate = {
    vertical: Math.trunc(position.vertical + step.vertical),
    horizontal: Math.trunc(position.horizontal + step.horizontal),
  };
  if (candidate.vertical < 1 || candidate.vertical > 75 ||
      candidate.horizontal < 1 || candidate.horizontal > 75 ||
      Math.max(Math.abs(candidate.vertical - position.vertical),
        Math.abs(candidate.horizontal - position.horizontal)) !== 1) return null;
  return candidate;
}

export function displacementOutcome(position: Position, step: Position,
  contents: (candidate: Position) => "EMPTY" | "BLACK_HOLE" | "OTHER") {
  const candidate = displacementCandidate(position, step);
  if (candidate === null) return { kind: "UNCHANGED" as const, position };
  switch (contents(candidate)) {
    case "OTHER": return { kind: "UNCHANGED" as const, position };
    case "EMPTY": return { kind: "MOVED" as const, position: candidate };
    case "BLACK_HOLE": return { kind: "DESTROYED" as const, position: candidate };
  }
}
