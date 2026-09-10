import { distance, positionKey, type Position } from './observations.ts';
import { neighbors, ObservedMap, routePlan } from './navigation.ts';
import type { Team } from './client.ts';

// Pick a mapped, traversable frontier sector that borders at least one
// unobserved sector. This makes exploration purposeful while keeping the
// first executed step subject to the normal fresh-scan safety rule.
export function unexploredFrontier(map: ObservedMap, from: Position, team: Team, now: number): Position | undefined {
  const candidates = [...map.cells.values()]
    .filter(cell => cell.symbol === ' .' || cell.symbol === ' !')
    .map(cell => ({ v: cell.v, h: cell.h }))
    .filter(p => distance(from, p) > 2 && map.passable(p, now) && map.danger(p, team, now, true) === 0)
    .filter(p => neighbors(p).some(n => !map.cells.has(positionKey(n))))
    .map(p => ({ p, plan: routePlan(map, from, p, team, now, true, true) }))
    .filter(candidate => candidate.plan?.next)
    .sort((a, b) => {
      const aVisits = map.visits.get(positionKey(a.p)) ?? 0;
      const bVisits = map.visits.get(positionKey(b.p)) ?? 0;
      return aVisits - bVisits || (a.plan?.cost ?? Infinity) - (b.plan?.cost ?? Infinity);
    });
  return candidates[0]?.p;
}
