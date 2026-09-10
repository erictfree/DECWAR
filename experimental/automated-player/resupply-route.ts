import type { Team } from './client.ts';
import { distance, type Position } from './observations.ts';
import { ObservedMap, routePlan } from './navigation.ts';

export type RefugeRoute = { destination: Position; next: Position; cost: number; reason: string };

// Optional bot policy over public observations. Keep a refuge while the route
// remains available and observed danger has not increased. A new threat permits
// choosing a safer alternative; distance fluctuations alone do not switch it.
export class ResupplyRoute {
  private refuge?: { position: Position; risk: number };
  clear(): void { this.refuge = undefined; }
  choose(map: ObservedMap, from: Position, bases: Position[], team: Team, now: number): RefugeRoute | undefined {
    const previous = this.refuge;
    const plan = (destination: Position) => {
      const path = routePlan(map, from, destination, team, now, true, true);
      if (!path?.next) return undefined;
      const risk = map.danger(destination, team, now, true) + map.danger(path.next, team, now, true);
      return { destination: { ...destination }, next: path.next, cost: path.cost + map.danger(destination, team, now, true) * 2, risk };
    };
    const current = previous && bases.some(b => distance(b, previous.position) === 0) ? plan(previous.position) : undefined;
    if (current && current.risk <= previous!.risk) {
      this.refuge = { position: current.destination, risk: current.risk };
      return { ...current, reason: 'retained' };
    }
    const candidates = bases.map(plan).filter(p => p !== undefined).sort((a, b) => a.cost - b.cost);
    const best = candidates[0];
    if (!best) { this.clear(); return undefined; }
    this.refuge = { position: best.destination, risk: best.risk };
    return { ...best, reason: !previous ? 'selected' : !current ? 'unavailable' : 'danger-reassessed' };
  }
}
