import type { Position } from "./model.ts";

// Section 6.7 neighborhood order. Damage and selection are separate operations.
export function novaNeighbors(center: Position): Position[] {
  const positions: Position[] = [];
  for (let vertical = Math.max(1, center.vertical - 1);
    vertical <= Math.min(75, center.vertical + 1); vertical++) {
    for (let horizontal = Math.max(1, center.horizontal - 1);
      horizontal <= Math.min(75, center.horizontal + 1); horizontal++) {
      if (vertical !== center.vertical || horizontal !== center.horizontal)
        positions.push({ vertical, horizontal });
    }
  }
  return positions;
}

// Ordered explosion selection only; caller supplies effects and new selections.
// This companion deliberately refuses the unresolved C-019 boundary.
export function novaOrder<T>(initial: T, process: (center: T) => T[]): T[] {
  const pending: T[] = [];
  const order: T[] = [];
  let current: T | undefined = initial;
  while (current !== undefined) {
    order.push(current);
    const selected = process(current);
    if (pending.length + selected.length >= 29)
      throw new RangeError("C-019 pending-explosion boundary is unresolved");
    pending.push(...selected);
    current = pending.pop();
  }
  return order;
}
