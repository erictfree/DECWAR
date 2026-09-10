import { distance, fleetSymbols, positionKey, type Cell, type Position, type Scan } from './observations.ts';
import type { Team } from './client.ts';

// Observation memory, not a copy of the server map. Mobile sightings expire;
// terrain persists until seen again. A disappeared ship is never a fresh target.
export class ObservedMap {
  readonly cells = new Map<string, Cell>();
  readonly visits = new Map<string, number>();
  readonly blockedUntil = new Map<string, number>();
  ingest(scan: Scan, position: Position): void {
    for (const cell of scan.cells) this.cells.set(positionKey(cell), cell);
    const key = positionKey(position); this.visits.set(key, (this.visits.get(key) ?? 0) + 1);
  }
  block(position: Position, now: number): void { this.blockedUntil.set(positionKey(position), now + 30000); }
  cell(position: Position, now: number): Cell | undefined {
    const cell = this.cells.get(positionKey(position));
    if (cell && /^ [A-Z]$|^\?\?$/.test(cell.symbol) && now - cell.observedAt > 5000) return undefined;
    return cell;
  }
  passable(position: Position, now: number): boolean {
    if (position.v < 1 || position.v > 75 || position.h < 1 || position.h > 75 || (this.blockedUntil.get(positionKey(position)) ?? 0) > now) return false;
    const cell = this.cell(position, now);
    return !cell || cell.symbol === ' .' || cell.symbol === ' !';
  }
  danger(position: Position, team: Team, now: number, avoidShips = false): number {
    let result = this.cell(position, now)?.symbol === ' !' ? 60 : 0;
    for (const cell of this.cells.values()) {
      const radius = cell.symbol === (team === 'FEDERATION' ? ')(' : '<>') ? 4 : cell.symbol === (team === 'FEDERATION' ? '@E' : '@F') ? 2 : 0;
      if (radius && distance(position, cell) <= radius) result += 60;
      if (avoidShips && now - cell.observedAt <= 5000 && /^ [A-Z]$/.test(cell.symbol) && fleetSymbols[team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION'].includes(cell.symbol[1])) result += Math.max(0, 11 - distance(position, cell)) * 5;
    }
    return result;
  }
  enemies(scan: Scan, team: Team): Cell[] {
    const symbols = fleetSymbols[team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION'];
    return scan.cells.filter(cell => /^ [A-Z]$/.test(cell.symbol) && symbols.includes(cell.symbol[1]));
  }
}

export function neighbors(position: Position): Position[] {
  const result: Position[] = [];
  for (let dv = -1; dv <= 1; dv++) for (let dh = -1; dh <= 1; dh++) {
    const v = position.v + dv, h = position.h + dh;
    if ((dv || dh) && v >= 1 && v <= 75 && h >= 1 && h <= 75) result.push({ v, h });
  }
  return result;
}

// A bounded direct move is eligible only when every sector along the line is
// freshly observed, traversable and outside known danger. The caller still
// supplies the normal energy and movement command checks.
export function clearDirectRoute(map: ObservedMap, from: Position, to: Position, team: Team, now: number, maxDistance = 7): boolean {
  const length = distance(from, to);
  if (length < 2 || length > maxDistance) return false;
  for (let i = 1; i <= length; i++) {
    const p = { v: from.v + Math.round((to.v - from.v) * i / length), h: from.h + Math.round((to.h - from.h) * i / length) };
    const cell = map.cell(p, now);
    if (!cell || now - cell.observedAt > 5000 || !map.passable(p, now) || map.danger(p, team, now, true) > 0) return false;
  }
  return true;
}

type Entry = { p: Position; g: number; f: number; first?: Position };
class Frontier {
  private entries: Entry[] = [];
  push(entry: Entry): void {
    let i = this.entries.length; this.entries.push(entry);
    while (i > 0) { const parent = (i - 1) >> 1; if (this.entries[parent].f <= entry.f) break; this.entries[i] = this.entries[parent]; i = parent; }
    this.entries[i] = entry;
  }
  pop(): Entry | undefined {
    const first = this.entries[0], last = this.entries.pop();
    if (last && this.entries.length) {
      let i = 0;
      while (i * 2 + 1 < this.entries.length) {
        let next = i * 2 + 1;
        if (next + 1 < this.entries.length && this.entries[next + 1].f < this.entries[next].f) next++;
        if (last.f <= this.entries[next].f) break;
        this.entries[i] = this.entries[next]; i = next;
      }
      this.entries[i] = last;
    }
    return first;
  }
}

// A* on 8-neighbor sectors. Costs are bot preferences: avoid observed danger,
// prefer mapped routes, and discount repeated visits. Only the first step is
// executed, and that step MUST be freshly observed empty/warning space.
export function route(map: ObservedMap, start: Position, goal: Position, team: Team, now: number, adjacent = false, avoidShips = false, stopRange = adjacent ? 1 : 0): Position | undefined {
  return routePlan(map, start, goal, team, now, adjacent, avoidShips, stopRange)?.next;
}

// The cost is a navigation preference, not game energy or elapsed time.
export function routePlan(map: ObservedMap, start: Position, goal: Position, team: Team, now: number, adjacent = false, avoidShips = false, stopRange = adjacent ? 1 : 0): { next?: Position; cost: number } | undefined {
  const frontier = new Frontier(), costs = new Map<string, number>();
  frontier.push({ p: start, g: 0, f: distance(start, goal) }); costs.set(positionKey(start), 0);
  for (let count = 0; count < 30000; count++) {
    const current = frontier.pop(); if (!current) return undefined;
    if (current.g !== costs.get(positionKey(current.p))) continue;
    if (distance(current.p, goal) <= stopRange) return { next: current.first, cost: current.g };
    for (const next of neighbors(current.p)) {
      if (!map.passable(next, now)) continue;
      const cell = map.cell(next, now);
      if (!current.first && (!cell || now - cell.observedAt > 5000)) continue;
      const g = current.g + (cell ? 1 : 2) + map.danger(next, team, now, avoidShips) + Math.min(4, map.visits.get(positionKey(next)) ?? 0) * 0.2;
      if (g >= (costs.get(positionKey(next)) ?? Infinity)) continue;
      costs.set(positionKey(next), g);
      frontier.push({ p: next, g, f: g + Math.max(0, distance(next, goal) - stopRange), first: current.first ?? next });
    }
  }
  return undefined;
}
