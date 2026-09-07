import type { Position } from "./model.ts";

/**
 * Sector distance is the number of king-like steps between two sectors:
 * diagonal and orthogonal neighboring sectors are both one sector away.
 */
export function sectorDistance(a: Position, b: Position): number {
  return Math.max(
    Math.abs(a.vertical - b.vertical),
    Math.abs(a.horizontal - b.horizontal),
  );
}
export function isPosition(value: Position): boolean {
  return (
    Number.isInteger(value.vertical) &&
    Number.isInteger(value.horizontal) &&
    value.vertical >= 1 &&
    value.vertical <= 75 &&
    value.horizontal >= 1 &&
    value.horizontal <= 75
  );
}
