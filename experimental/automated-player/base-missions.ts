import type { Team } from './client.ts';
import { distance, positionKey, type ListedObject, type Position } from './observations.ts';
import type { Observation } from './captain.ts';

// Fleet-local public assignment of enemy installations. Each base is leased
// to one captain so a siege group converges instead of independently choosing
// whichever base happens to be nearest on each observation.
export class BaseMissions {
  private claims = new Map<string, { captain: string; position: Position; until: number }>();

  assign(team: Team, captain: string, observation: Observation, now: number): Position | null {
    const opposing = team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
    const candidates = (observation.objects ?? []).filter((o): o is ListedObject & { position: Position } =>
      o.kind === 'base' && o.faction === opposing && !!o.position && now - o.observedAt <= 5000);
    for (const [key, claim] of this.claims) {
      if (claim.until < now) { this.claims.delete(key); continue; }
      if (!key.startsWith(`${team}:`)) continue;
      const listed = candidates.find(o => positionKey(o.position) === positionKey(claim.position));
      const cell = observation.scan.cells.find(c => positionKey(c) === positionKey(claim.position));
      if (!listed || cell && cell.symbol !== (opposing === 'EMPIRE' ? ')(' : '<>')) this.claims.delete(key);
    }
    const own = [...this.claims.entries()].find(([key, claim]) => key.startsWith(`${team}:`) && claim.captain === captain);
    if (own) { own[1].until = now + 30000; return { ...own[1].position }; }
    const target = candidates.sort((a, b) => distance(observation.status.position, a.position) - distance(observation.status.position, b.position))
      .find(o => !this.claims.has(`${team}:${positionKey(o.position)}`));
    if (!target) return null;
    const position = { ...target.position };
    this.claims.set(`${team}:${positionKey(position)}`, { captain, position, until: now + 30000 });
    return position;
  }
}
