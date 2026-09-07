// Frozen captain v3 before LIST/objective combat changes. Shared infrastructure stays external.
import type { Team } from '../client.ts';
import { distance, positionKey, type Cell, type Devices, type Position, type Scan, type ShipStatus } from '../observations.ts';
import { neighbors, ObservedMap, route } from '../navigation.ts';
import type { Decision } from '../policy.ts';

export type Observation = { status: ShipStatus; devices: Devices; scan: Scan; bases: Position[] };
export class Captain {
  readonly map = new ObservedMap();
  private previousMove: { from: Position; to: Position } | undefined;
  private goal: Position | undefined;
  private resupplying = false;
  private patrolIndex = 0;
  private lastFire = -Infinity;
  readonly team: Team;
  readonly mode: 'patrol' | 'resupply';
  constructor(team: Team, mode: 'patrol' | 'resupply' = 'patrol') { this.team = team; this.mode = mode; }

  choose(observation: Observation, now = Date.now()): Decision {
    const { status: s, devices: d, scan, bases } = observation;
    if (now - s.observedAt > 5000 || now - scan.observedAt > 5000) return { kind: 'blocked', reason: 'Need fresh status and scan before acting.' };
    this.map.ingest(scan, s.position);
    if (this.previousMove && distance(this.previousMove.from, s.position) === 0) this.map.block(this.previousMove.to, now);
    this.previousMove = undefined;
    const enemies = this.map.enemies(scan, this.team).sort((a, b) => distance(s.position, a) - distance(s.position, b));
    const threat = this.map.danger(s.position, this.team, now) > 0;
    const maxDamage = Math.max(...Object.values(d));
    // Combat admission and withdrawal share the same reserve threshold. The
    // previous 2400/2800 gap sent an unable-to-fire ship back into patrol.
    const needSupplies = s.energy < 2400 || (enemies.length > 0 && s.energy < 2800) || s.shieldPercent < 55 || s.hullDamage > 600 || maxDamage >= 200;
    if (needSupplies || this.mode === 'resupply') this.resupplying = true;
    const adjacent = bases.find(base => distance(s.position, base) <= 1);
    const full = s.energy >= 4900 && s.shieldPercent >= 95 && s.hullDamage === 0 && s.torpedoes === 10 && maxDamage === 0;
    if (adjacent && (!full || !s.docked) && (this.resupplying || s.docked)) return this.act('DOCK', 'Replenish at the observed adjacent friendly base.');
    if (adjacent && full && this.resupplying) {
      this.resupplying = false; this.goal = undefined;
      if (this.mode === 'resupply') return { kind: 'complete', reason: 'Reached supplies, restored ship and repaired devices.' };
    }
    // SHIELD source: DECWAR.FOR:3739-3805. UP costs 100 displayed energy;
    // transfer costs 25 per displayed shield percent. Never transfer all energy.
    if (!s.shieldsUp && d.shields <= 300 && s.energy > 500) return this.act('SHIELDS UP', 'Raise shields before travel or combat.');
    if (s.shieldPercent < 45 && s.energy > 2400 && !adjacent) {
      const amount = Math.floor(Math.min((70 - s.shieldPercent) * 25, s.energy - 2000));
      if (amount >= 100) return this.act(`SHIELDS TRANSFER ${amount}`, 'Restore shield reserve while retaining engine energy to withdraw.');
    }
    // REPAIR mode 1 applies the entered amount to all devices; 30 units takes
    // about 2.4 seconds before normal automatic repair. No giant ALL wait.
    if (d.warp >= 300 && d.impulse >= 300 || d.computer >= 300 || d.life >= 300) return this.act('REPAIR 30', 'Restore critical mobility, computer or life-support devices.');
    if (this.resupplying || threat || s.hullDamage > 1000) {
      // A nearby base under enemy fire can be a worse refuge than a farther
      // one. Source-visible risk is part of destination selection too.
      const refugeCost = (p: Position) => distance(s.position, p) + this.map.danger(p, this.team, now, true) * 2;
      const destinations = [...bases].sort((a, b) => refugeCost(a) - refugeCost(b));
      for (const base of destinations) {
        const step = route(this.map, s.position, base, this.team, now, true, true);
        if (step) return this.move(step, s, d, threat ? 'Leave the installation danger zone and approach supplies.' : 'Route around obstacles toward supplies.');
      }
      const escape = neighbors(s.position).filter(p => this.map.passable(p, now) && this.map.cell(p, now))
        .sort((a, b) => this.map.danger(a, this.team, now, true) - this.map.danger(b, this.team, now, true))[0];
      if (escape) return this.move(escape, s, d, 'No base route available; seek a traversable escape sector.');
      return this.act('STATUS', 'Surrounded: observe again rather than repeat an obstructed move.');
    }
    // PHACON:2647ff: strength 180 cannot trigger IRAN(100)*strength >18900;
    // displayed energy cost is strength +200 with shields up. The server owns
    // two-bank readiness. Conservative three-second spacing avoids queueing.
    const target: Cell | undefined = enemies.find(enemy => distance(s.position, enemy) <= 10);
    if (target && s.energy >= 2800 && s.shieldPercent >= 55 && d.phasers < 300) {
      // PHADAM, DECWAR.FOR:4167-4195 attenuates hits with distance. Four
      // sectors is a policy choice, not a new rule or an arithmetic emulator.
      // Close on a single fresh opponent only with strong reserves and a
      // fresh, traversable step outside known installation danger. Multiple
      // enemies or depleted shields retain the conservative firing position.
      if (distance(s.position, target) > 4 && enemies.length === 1 && s.energy >= 3200 && s.shieldPercent >= 75) {
        const approach = route(this.map, s.position, target, this.team, now, true);
        if (approach && distance(approach, target) < distance(s.position, target) && this.map.danger(approach, this.team, now) === 0) {
          return this.move(approach, s, d, 'Close on the observed lone opponent to improve phaser effectiveness.');
        }
      }
      if (now - this.lastFire >= 3000 + d.phasers * 10) {
        this.lastFire = now;
        return this.act(`PHASERS ABSOLUTE 180 ${target.v} ${target.h}`, `Fire at freshly scanned enemy ${target.symbol.trim()}, preserving a resupply reserve.`);
      }
      return this.act('STATUS', 'Observe while the weapon bank recovers.');
    }
    if (maxDamage > 0 && !enemies.length) return this.act('REPAIR 30', 'Repair devices between encounters.');
    // Keep exploring instead of going idle when supplied. Rotate waypoints,
    // with scan-derived routes and replan after each actual movement result.
    if (!this.goal || distance(s.position, this.goal) <= 2) {
      const points = [{ v: 12, h: 12 }, { v: 12, h: 64 }, { v: 64, h: 64 }, { v: 64, h: 12 }, { v: 38, h: 38 }];
      if (!this.goal && this.patrolIndex === 0) this.patrolIndex = points.findIndex(p => distance(s.position, p) > 15);
      this.goal = points[this.patrolIndex++ % points.length];
    }
    let step = route(this.map, s.position, this.goal, this.team, now, true);
    if (!step) {
      this.goal = undefined;
      step = neighbors(s.position).filter(p => this.map.passable(p, now) && this.map.cell(p, now))
        .sort((a, b) => (this.map.visits.get(positionKey(a)) ?? 0) - (this.map.visits.get(positionKey(b)) ?? 0))[0];
    }
    return step ? this.move(step, s, d, 'Patrol through observed free space and look for opponents.') : this.act('STATUS', 'No traversable step; wait for a fresh scan.');
  }

  private act(command: string, reason: string): Decision { return { kind: 'act', command, reason }; }
  private move(to: Position, status: ShipStatus, devices: Devices, reason: string): Decision {
    if (status.energy <= (status.shieldsUp ? 8 : 4) + 100) return this.act('STATUS', 'Energy too low for movement; await help rather than exhaust engines.');
    this.previousMove = { from: status.position, to };
    return this.act(`${devices.warp >= 300 ? 'IMPULSE' : 'MOVE'} ABSOLUTE ${to.v} ${to.h}`, reason);
  }
}
