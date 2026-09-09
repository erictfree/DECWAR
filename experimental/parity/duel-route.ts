import { distance, type Position, type Scan } from '../automated-player/observations.ts';
import { ObservedMap, route } from '../automated-player/navigation.ts';

// Setup policy only: avoid defended areas and source warp 5/6 overheating.
export function duelRoute(map: ObservedMap, scan: Scan, p: Position, goal: Position, now: number): Position | undefined {
  const safe = (q: Position) => scan.cells.some(c => distance(c, q) === 0 && c.symbol === ' .') && !map.danger(q, 'EMPIRE', now) && !scan.cells.some(c => [' @', '@F'].includes(c.symbol) && distance(c, q) <= 2);
  // Apply the same hazard exclusions during planning and execution. A route
  // that prefers a neutral planet's defense radius cannot be used here.
  for (const cell of map.cells.values()) {
    const radius = cell.symbol === '<>' ? 4 : [' @', '@F'].includes(cell.symbol) ? 2 : 0;
    if (radius) for (let v = Math.max(1, cell.v - radius); v <= Math.min(75, cell.v + radius); v++)
      for (let h = Math.max(1, cell.h - radius); h <= Math.min(75, cell.h + radius); h++) map.block({ v, h }, now);
  }
  let next = route(map, p, goal, 'EMPIRE', now);
  // Compress only a straight run of the planned route, at warp <=4.
  if (next && safe(next)) {
    const dv = next.v - p.v, dh = next.h - p.h;
    for (let n = 2; n <= 4 && distance(next, goal); n++) {
      const following = route(map, next, goal, 'EMPIRE', now);
      if (!following || following.v - next.v !== dv || following.h - next.h !== dh || !safe(following)) break;
      next = following;
    }
  }
  if (!next || !safe(next)) return undefined;
  return next;
}
