import type { Team } from './client.ts';
import { distance, positionKey, type Position } from './observations.ts';
import type { Observation } from './captain.ts';

// Public-information last-base defense. A single captain leases the only
// currently known friendly base when a fresh enemy ship is nearby.
export class BaseDefense {
  private claim?: { team: Team; captain: string; base: Position; until: number };

  assign(team: Team, captain: string, observation: Observation, now: number): Position | null {
    const friendlyBases = (observation.objects ?? []).filter(o => o.kind === 'base' && o.faction === team && o.position && now - o.observedAt <= 5000);
    if (friendlyBases.length !== 1) { if (this.claim?.team === team) this.claim = undefined; return null; }
    const base = friendlyBases[0].position!;
    const enemy = (observation.targets ?? []).some(o => o.kind === 'ship' && o.position && o.faction !== team && o.faction !== 'NEUTRAL' && now - o.observedAt <= 5000 && distance(o.position, base) <= 8);
    if (!enemy) { if (this.claim?.team === team && this.claim.captain === captain) this.claim = undefined; return null; }
    if (this.claim && this.claim.until >= now && this.claim.team === team && positionKey(this.claim.base) === positionKey(base)) {
      this.claim.until = now + 30000;
      return this.claim.captain === captain ? { ...base } : null;
    }
    this.claim = { team, captain, base: { ...base }, until: now + 30000 };
    return { ...base };
  }
}
