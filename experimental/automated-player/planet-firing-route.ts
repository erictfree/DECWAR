import type { Team } from './client.ts';
import { distance, positionKey, type Position } from './observations.ts';
import { ObservedMap, route } from './navigation.ts';
import { clearTorpedoCorridor } from './torpedo-corridor.ts';

// Remembered terrain selects a destination, never authorizes a shot. The
// captain must recheck the entire firing corridor in a fresh SCAN on arrival.
export function planetFiringRoute(map: ObservedMap, from: Position, target: Position, team: Team, now: number, preferred?: Position, preferClose = false): { destination: Position; next?: Position } | undefined {
  const memory = { cells: [...map.cells.values()], observedAt: now };
  const viable = (p: Position) => distance(p, target) >= 3 && distance(p, target) <= 8
    && map.passable(p, now) && map.danger(p, team, now) === 0
    && clearTorpedoCorridor(memory, p, target, team, now, true, Infinity);
  const candidates = memory.cells.filter(viable).sort((a, b) => preferClose
    ? distance(a, target) - distance(b, target) || distance(from, a) - distance(from, b)
    : distance(from, a) - distance(from, b));
  if (preferred && viable(preferred)) candidates.unshift({ ...preferred, symbol: ' .', observedAt: now });
  for (const destination of candidates) {
    if (distance(from, destination) === 0) return { destination: { v: destination.v, h: destination.h } };
    const next = route(map, from, destination, team, now);
    if (next && map.danger(next, team, now) === 0) return { destination: { v: destination.v, h: destination.h }, next };
  }
  return undefined;
}

// No known shot is not arrival. Survey distinct positions around the target,
// retaining each waypoint until reached. Only fresh safe first steps execute.
export function planetSurveyRoute(map: ObservedMap, from: Position, target: Position, team: Team, now: number, preferred?: Position): { destination: Position; next: Position } | undefined {
  const viable = (p: Position) => distance(p, target) >= 3 && distance(p, target) <= 8
    && distance(from, p) > 0 && map.passable(p, now) && map.danger(p, team, now) === 0;
  const candidates: Position[] = [];
  for (let v = Math.max(1, target.v - 8); v <= Math.min(75, target.v + 8); v++)
    for (let h = Math.max(1, target.h - 8); h <= Math.min(75, target.h + 8); h++)
      if (viable({ v, h })) candidates.push({ v, h });
  candidates.sort((a, b) => (map.visits.get(positionKey(a)) ?? 0) - (map.visits.get(positionKey(b)) ?? 0)
    || distance(from, a) - distance(from, b));
  if (preferred && viable(preferred)) candidates.unshift(preferred);
  const currentRange = distance(from, target);
  for (const destination of candidates) {
    const next = route(map, from, destination, team, now);
    // An adjacent ship needs intermediate range-two space to reach the ring.
    // Inside it, require strictly outward progress; outside, stay outside.
    if (next && (currentRange < 3 ? distance(next, target) > currentRange : distance(next, target) >= 3)
      && map.danger(next, team, now) === 0) return { destination, next };
  }
  return undefined;
}
