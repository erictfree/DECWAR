import { distance, type Position, type ShipStatus } from './observations.ts';

export type Decision =
  | { kind: 'act'; command: string; reason: string; refuge?: { destination: Position; cost: number; reason: string }; releasePlanetMission?: boolean; targetKind?: 'ship' | 'base' | 'planet' | 'star'; weapon?: 'phasers' | 'torpedoes'; objectiveAction?: 'capture' | 'build' }
  | { kind: 'complete' | 'blocked'; command?: never; reason: string };
export type NavigationMemory = { previousPosition?: Position; failedMoves: number };

// Experimental policy, not a ported routine or a competitive claim. Only reads
// terminal observations. Thresholds are deliberately conservative bot choices.
// Source constraints: Austin MOVE:2141ff (distance/energy), DOCK:893-978
// (adjacency and replenishment). One-sector MOVE avoids long-warp overheating.
export function decide(status: ShipStatus, bases: Position[], memory: NavigationMemory, now = Date.now()): Decision {
  if (now < status.observedAt || now - status.observedAt > 5000) return { kind: 'blocked', reason: 'Status is stale; stop rather than act on old data.' };
  if (status.condition === 'Red' || status.hullDamage >= 1000) return { kind: 'blocked', reason: 'Danger requires a combat/escape planner beyond this baseline.' };
  if (memory.failedMoves >= 2) return { kind: 'blocked', reason: 'Repeated obstruction or movement failure; pathfinding is the next milestone.' };
  const nearest = [...bases].sort((a, b) => distance(status.position, a) - distance(status.position, b))[0];
  if (!nearest) return { kind: 'blocked', reason: 'No friendly base location parsed; no route can be justified.' };
  if (distance(status.position, nearest) <= 1) {
    if (!status.docked || status.energy < 5000 || status.torpedoes < 10 || status.shieldPercent < 100 || status.hullDamage > 0) {
      return { kind: 'act', command: 'DOCK', reason: 'Adjacent friendly base can replenish the ship.' };
    }
    return { kind: 'complete', reason: 'Reached a friendly base and replenished; baseline objective complete.' };
  }
  if (status.energy < 1200) return { kind: 'blocked', reason: 'Energy reserve too low for this incomplete navigation policy.' };
  const v = status.position.v + Math.sign(nearest.v - status.position.v);
  const h = status.position.h + Math.sign(nearest.h - status.position.h);
  return { kind: 'act', command: `MOVE ABSOLUTE ${v} ${h}`, reason: `One-sector approach toward observed friendly base ${nearest.v}-${nearest.h}.` };
}
