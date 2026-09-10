import type { Team } from './client.ts';
import { distance, positionKey, type Position } from './observations.ts';
import type { Observation } from './captain.ts';

// Fleet-local leases from public observations only. Different factions never
// share missions. A captain renews its lease while travelling or resupplying.
export class PlanetMissions {
  private claims = new Map<string, { captain: string; position: Position; until: number }>();
  release(team: Team, captain: string, position?: Position): void {
    for (const [key, claim] of this.claims) if (key.startsWith(`${team}:`) && claim.captain === captain && (!position || positionKey(claim.position) === positionKey(position))) this.claims.delete(key);
  }
  assign(team: Team, captain: string, observation: Observation, now: number): Position | null {
    const candidates = (observation.objects ?? []).filter(o => o.kind === 'planet' && o.position && o.faction !== team && now - o.observedAt <= 5000);
    for (const [key, claim] of this.claims) {
      if (claim.until < now) { this.claims.delete(key); continue; }
      if (!key.startsWith(`${team}:`)) continue;
      const listed = (observation.objects ?? []).find(o => o.kind === 'planet' && o.position && positionKey(o.position) === positionKey(claim.position) && now - o.observedAt <= 5000);
      if (listed?.faction === team) { this.claims.delete(key); continue; }
      const cell = observation.scan.cells.find(c => positionKey(c) === positionKey(claim.position));
      if (cell && now - cell.observedAt <= 5000 && ![' @', team === 'FEDERATION' ? '@E' : '@F'].includes(cell.symbol)) this.claims.delete(key);
    }
    const own = [...this.claims.entries()].find(([key, c]) => key.startsWith(`${team}:`) && c.captain === captain);
    if (own) { own[1].until = now + 30000; return { ...own[1].position }; }
    const target = candidates.sort((a, b) => distance(observation.status.position, a.position!) - distance(observation.status.position, b.position!))
      .find(o => !this.claims.has(`${team}:${positionKey(o.position!)}`));
    if (!target?.position) return null;
    const position = { ...target.position };
    this.claims.set(`${team}:${positionKey(position)}`, { captain, position, until: now + 30000 });
    return position;
  }
}
