import type { Team } from './client.ts';
import { distance, fleetSymbols, positionKey, type Cell, type Devices, type ListedObject, type Position, type Scan, type ShipStatus } from './observations.ts';
import { neighbors, ObservedMap, route } from './navigation.ts';
import type { Decision } from './policy.ts';

const OBJECTIVE_WAYPOINT_TTL_MS = 30_000;

export type Observation = { status: ShipStatus; devices: Devices; scan: Scan; bases: Position[]; objects?: ListedObject[]; targets?: ListedObject[]; intel?: ListedObject[] };

// SNOVA recursively visits orthogonally and diagonally adjacent stars. A
// candidate is usable only when the whole observed star component and its
// one-sector blast rim are visible and contain no friendly, planet or shooter.
// Source: Austin DECWAR.FOR:3804-3852 and NOVA:2256-2391.
export function selectSafeNova(scan: Scan, status: ShipStatus, team: Team, targets: ListedObject[]): Cell | undefined {
  const byPosition = new Map(scan.cells.map(c => [positionKey(c), c]));
  const stars = scan.cells.filter(c => c.symbol === ' *' && distance(status.position, c) <= 6 && distance(status.position, c) > 1);
  const vmin = Math.min(...scan.cells.map(c => c.v)), vmax = Math.max(...scan.cells.map(c => c.v));
  const hmin = Math.min(...scan.cells.map(c => c.h)), hmax = Math.max(...scan.cells.map(c => c.h));
  const friendlyShips = team === 'FEDERATION' ? fleetSymbols.FEDERATION : fleetSymbols.EMPIRE;
  const friendlyBase = team === 'FEDERATION' ? '<>' : ')(';
  const opposing = team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
  const candidates: { star: Cell; score: number }[] = [];
  for (const star of stars) {
    const component: Cell[] = [], queue = [star], seen = new Set<string>();
    while (queue.length) {
      const next = queue.pop()!, key = positionKey(next); if (seen.has(key)) continue;
      seen.add(key); component.push(next);
      for (let dv = -1; dv <= 1; dv++) for (let dh = -1; dh <= 1; dh++) {
        if (!dv && !dh) continue;
        const adjacent = byPosition.get(`${next.v + dv},${next.h + dh}`);
        if (adjacent?.symbol === ' *' && !seen.has(positionKey(adjacent))) queue.push(adjacent);
      }
    }
    if (component.some(c => c.v === vmin || c.v === vmax || c.h === hmin || c.h === hmax)) continue;
    const rim = scan.cells.filter(c => component.some(s => distance(s, c) <= 1));
    if (rim.some(c => distance(c, status.position) === 0 || c.symbol.trim().startsWith('@') || c.symbol === friendlyBase || c.symbol === '  ' || friendlyShips.includes(c.symbol.trim()))) continue;
    const victims = targets.filter(t => t.faction === opposing && t.position && (t.kind === 'ship' || t.kind === 'base'))
      .filter(t => component.some(s => distance(s, t.position!) <= 1))
      .filter(t => rim.some(c => distance(c, t.position!) === 0));
    if (!victims.length) continue;
    candidates.push({ star, score: Math.max(...victims.map(v => v.kind === 'base' ? 2 : 1)) * 100 - distance(status.position, star) });
  }
  return candidates.sort((a, b) => b.score - a.score)[0]?.star;
}
export class Captain {
  readonly map = new ObservedMap();
  private previousMove: { from: Position; to: Position } | undefined;
  private goal: Position | undefined;
  // Objective captains retain a selected planet across ordinary resupply and
  // combat detours. The position is only a navigation objective; capture or
  // build still requires a fresh LIST row and matching SCAN symbol below.
  private objectiveTarget: { position: Position; kind: 'planet'; selectedAt: number } | undefined;
  private resupplying = false;
  private patrolIndex = 0;
  private lastFire = -Infinity;
  private lastTorpedo = -Infinity;
  private guardCycles = 0;
  private defenseSortieUntil = -Infinity;
  readonly team: Team;
  readonly mode: 'patrol' | 'resupply' | 'objective' | 'defense';
  readonly experimentalNovas: boolean;
  readonly torpedoesEnabled: boolean;
  constructor(team: Team, mode: 'patrol' | 'resupply' | 'objective' | 'defense' = 'patrol', experimentalNovas = false, torpedoesEnabled = true) {
    this.team = team; this.mode = mode; this.experimentalNovas = experimentalNovas; this.torpedoesEnabled = torpedoesEnabled;
  }

  choose(observation: Observation, now = Date.now()): Decision {
    const { status: s, devices: d, scan, bases } = observation;
    if (now - s.observedAt > 5000 || now - scan.observedAt > 5000) return { kind: 'blocked', reason: 'Need fresh status and scan before acting.' };
    this.map.ingest(scan, s.position);
    if (this.previousMove && distance(this.previousMove.from, s.position) === 0) this.map.block(this.previousMove.to, now);
    this.previousMove = undefined;
    const objects = (observation.objects ?? []).filter(o => now - o.observedAt <= 5000);
    const targets = (observation.targets ?? []).filter(o => now - o.observedAt <= 5000);
    const opposing = this.team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
    const sharedEnemies = (observation.intel ?? []).filter(o => o.kind === 'ship' && o.faction === opposing && o.position && now - o.observedAt <= 5000);
    const friendlyAssets = objects.filter(o => o.faction === this.team && o.position && (o.kind === 'base' || o.kind === 'planet'));
    const enemies = this.map.enemies(scan, this.team).sort((a, b) => {
      // LIST's shield reading ranks only the same fresh SCAN ship/position.
      const score = (c: Cell) => {
        const detail = objects.find(o => o.kind === 'ship' && o.faction === opposing && o.name[0] === c.symbol.trim() && o.position && distance(o.position, c) === 0);
        const defended = this.mode === 'defense' && friendlyAssets.length ? Math.min(...friendlyAssets.map(o => distance(o.position!, c))) : 0;
        return distance(s.position, c) * 3 + (detail?.shieldPercent ?? 100) / 10 + defended * 4;
      };
      return score(a) - score(b);
    });
    const threat = this.map.danger(s.position, this.team, now) > 0;
    const maxDamage = Math.max(...Object.values(d));
    // Combat admission and withdrawal share the same reserve threshold. The
    // previous 2400/2800 gap sent an unable-to-fire ship back into patrol.
    const hostileInstallations = scan.cells.filter(c => [opposing === 'EMPIRE' ? ')(' : '<>', opposing === 'EMPIRE' ? '@E' : '@F'].includes(c.symbol));
    const needSupplies = s.energy < 2400 || ((enemies.length > 0 || hostileInstallations.length > 0) && s.energy < 2800) || s.shieldPercent < 55 || s.hullDamage > 600 || maxDamage >= 200;
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
    const confirmedTargets = (kind: ListedObject['kind']) => targets.filter(o => o.kind === kind && o.position);
    // A star nova has an 80% initial trigger chance and costs 500 points, but
    // can punish an adjacent enemy. Require high reserves and a fully observed
    // blast component; ordinary targeting remains the fallback.
    const nova = this.experimentalNovas && observation.targets !== undefined && s.torpedoes > 7 && s.shieldPercent >= 75 && d.torpedoes < 300 && d.computer < 300
      ? selectSafeNova(scan, s, this.team, targets) : undefined;
    if (nova && now - this.lastTorpedo >= 3000) {
      this.lastTorpedo = now;
      return this.act(`TORPEDOES ABSOLUTE 1 ${nova.v} ${nova.h}`, 'Trigger a source-confirmed star nova beside an enemy with the complete observed blast area clear of friendlies and planets.', 'star', undefined, 'torpedoes');
    }
    const target: Cell | undefined = enemies.find(enemy => distance(s.position, enemy) <= 10 && (
      observation.targets === undefined || confirmedTargets('ship').some(o => distance(o.position!, enemy) === 0)
    ));
    if (target && s.energy >= 2800 && s.shieldPercent >= 55 && d.phasers < 300) {
      const detail = objects.find(o => o.kind === 'ship' && o.faction === opposing && o.name[0] === target.symbol.trim() && o.position && distance(o.position, target) === 0);
      // The supplied Austin help advises weakening 85-100% shields with
      // phasers before using torpedoes. One-torpedo bursts preserve ammunition
      // and reduce the time before another burst. TARGETS and SCAN must agree.
      // Recent ten-ship logs show range 9-10 torpedoes missing far more often
      // than closer shots (10 misses/17 attempts versus 3/38 at <=8). Keep
      // long-range attacks on phasers, then use a torpedo after closing.
      if (this.torpedoesEnabled && distance(s.position, target) <= 8 && detail && detail.shieldPercent !== undefined && detail.shieldPercent < 85 && s.torpedoes > 4 && d.torpedoes < 300 && d.computer < 300
          && now - this.lastTorpedo >= 3000) {
        this.lastTorpedo = now;
        return this.act(`TORPEDOES ABSOLUTE 1 ${target.v} ${target.h}`, `Use one torpedo against fresh TARGETS/SCAN agreement on weakened ${detail.name} shields.`, 'ship', undefined, 'torpedoes');
      }
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
        return this.act(`PHASERS ABSOLUTE 180 ${target.v} ${target.h}`, `Fire at freshly scanned enemy ${target.symbol.trim()}, preserving a resupply reserve.`, 'ship', undefined, 'phasers');
      }
      return this.act('STATUS', 'Observe while the weapon bank recovers.');
    }
    if (maxDamage > 0 && !enemies.length) return this.act('REPAIR 30', 'Repair devices between encounters.');
    // Teammate sightings provide a pursuit waypoint only. The local SCAN and
    // TARGETS checks above remain mandatory before any weapon command.
    if (this.mode !== 'objective' && !enemies.length && sharedEnemies.length && !threat && s.energy >= 2800 && s.shieldPercent >= 75) {
      const sighting = [...sharedEnemies].sort((a, b) => distance(s.position, a.position!) - distance(s.position, b.position!))[0];
      if (distance(s.position, sighting.position!) > 8) {
        const step = route(this.map, s.position, sighting.position!, this.team, now, true, true, 8);
        if (step && this.map.danger(step, this.team, now) === 0) return this.move(step, s, d, `Pursue teammate sighting of ${sighting.name}; confirm locally before firing.`);
      }
    }
    // A defense captain stays close enough to a known friendly installation
    // to scan approaching ships. Developed planets are guarded before bases;
    // this is a team policy over public LIST data, not hidden threat knowledge.
    if (this.mode === 'defense' && !enemies.length && now >= this.defenseSortieUntil) {
      const asset = friendlyAssets.sort((a, b) => {
        const aPlanet = a.kind === 'planet' && (a.builds ?? 0) > 0 ? 1 : 0;
        const bPlanet = b.kind === 'planet' && (b.builds ?? 0) > 0 ? 1 : 0;
        return bPlanet - aPlanet || (b.builds ?? 0) - (a.builds ?? 0) || distance(s.position, a.position!) - distance(s.position, b.position!);
      })[0];
      if (asset?.position && distance(s.position, asset.position) > 3) {
        this.guardCycles = 0;
        const step = route(this.map, s.position, asset.position, this.team, now, false, true, 3);
        if (step) return this.move(step, s, d, `Take station near the friendly ${asset.kind} at ${asset.position.v}-${asset.position.h}.`);
      }
      if (asset?.position && this.guardCycles++ < 2) return this.act('STATUS', `Guard the friendly ${asset.kind} at ${asset.position.v}-${asset.position.h} and refresh the local threat picture.`);
      if (asset?.position) {
        this.guardCycles = 0; this.defenseSortieUntil = now + 30000;
      }
    }
    // CAPTUR/BUILD, DECWAR.FOR:523-665. Objective captains enter orbit only
    // with strong reserves. Capture can cost 500 displayed energy per enemy
    // build and the planet immediately fires back; built hostile planets are
    // weakened by the installation path below before capture is attempted.
    if (this.mode === 'objective' && !enemies.length && s.energy >= 3500 && s.shieldPercent >= 75) {
      const planetSymbol = (faction: ListedObject['faction']) => faction === 'NEUTRAL' ? ' @' : faction === 'FEDERATION' ? '@F' : '@E';
      // Austin PARAM.FOR:6 KNBASE=10; a four-build planet cannot convert while
      // all ten friendly base slots are occupied, so do not repeat BUILD.
      const actionable = (o: ListedObject) => o.faction === this.team
        ? (o.builds ?? 0) < 4 || (o.builds ?? 0) === 4 && bases.length < 10
        : (o.builds ?? 0) === 0;
      const candidates = objects.filter(o => o.kind === 'planet' && o.position)
        .filter(actionable)
        .filter(o => scan.cells.some(c => distance(c, o.position!) === 0 && c.symbol === planetSymbol(o.faction)))
        .sort((a, b) => distance(s.position, a.position!) - distance(s.position, b.position!));
      const planet = candidates[0];
      if (planet?.position && (!this.objectiveTarget || this.objectiveTarget.position.v !== planet.position.v || this.objectiveTarget.position.h !== planet.position.h)) {
        this.objectiveTarget = { position: { ...planet.position }, kind: 'planet', selectedAt: now };
      }
      // Keep a navigation waypoint briefly when LIST no longer prints
      // the distant row. It is never a firing or CAPTURE/BUILD authorization.
      const remembered = this.objectiveTarget && now - this.objectiveTarget.selectedAt <= OBJECTIVE_WAYPOINT_TTL_MS ? this.objectiveTarget : undefined;
      if (!remembered) this.objectiveTarget = undefined;
      const targetPosition = planet?.position ?? remembered?.position;
      if (targetPosition) {
        if (planet?.position && distance(s.position, planet.position) <= 1) {
          if (planet.faction === this.team) return this.act(`BUILD ABSOLUTE ${planet.position.v} ${planet.position.h}`, `Develop the freshly observed captured planet (${planet.builds ?? 0}/5 builds).`, undefined, 'build');
          return this.act(`CAPTURE ABSOLUTE ${planet.position.v} ${planet.position.h}`, `Capture the freshly observed ${planet.faction === 'NEUTRAL' ? 'neutral' : 'unfortified enemy'} planet from orbit.`, undefined, 'capture');
        }
        const step = route(this.map, s.position, targetPosition, this.team, now, true, true, 1);
        if (step) return this.move(step, s, d, `Approach the known ${planet?.faction === this.team ? 'captured planet for development' : 'planet for capture'}.`);
      }
      // LIST can guide travel, but capture/build still requires a current SCAN.
      const known = objects.filter(o => o.kind === 'planet' && o.position)
        .filter(actionable)
        .sort((a, b) => distance(s.position, a.position!) - distance(s.position, b.position!))[0];
      if (known?.position) {
        this.objectiveTarget = { position: { ...known.position }, kind: 'planet', selectedAt: now };
        const step = route(this.map, s.position, known.position, this.team, now, true, true, 1);
        if (step) return this.move(step, s, d, 'Seek the planet reported by LIST; confirm ownership with SCAN before acting.');
      }
    }
    // Enemy bases defend within four sectors, planets within two (BASPHA,
    // PLNATK). Fight from outside those zones. PHACON:2687-2710 reduces
    // planet builds only if IRAN(100)*strength/(25*distance)>150; strength
    // 180 cannot reduce builds beyond four sectors. Prefer range three.
    if (!enemies.length && s.energy >= 2800 && s.shieldPercent >= 75 && d.phasers < 300) {
      const installation = hostileInstallations
        .filter(c => c.symbol === (opposing === 'EMPIRE' ? ')(' : '<>') || objects.some(o => o.kind === 'planet' && o.position && distance(o.position, c) === 0 && (o.builds ?? 0) > 0))
        .sort((a, b) => distance(s.position, a) - distance(s.position, b))[0];
      if (installation) {
        const planet = installation.symbol.startsWith('@'), wantedRange = planet ? 3 : 5;
        if (distance(s.position, installation) > wantedRange) {
          const step = route(this.map, s.position, installation, this.team, now, false, false, wantedRange);
          if (step && this.map.danger(step, this.team, now) === 0) return this.move(step, s, d, `Approach enemy ${planet ? 'planet' : 'base'} while staying outside its defense radius.`);
        }
        if (distance(s.position, installation) <= (planet ? 4 : 10)) {
          if (now - this.lastFire < 3000 + d.phasers * 10) return this.act('STATUS', 'Observe while the weapon bank recovers.');
          this.lastFire = now;
          return this.act(`PHASERS ABSOLUTE 180 ${installation.v} ${installation.h}`, `Attack freshly scanned enemy ${planet ? 'planet builds' : 'base shields'} from outside its defense radius.`, planet ? 'planet' : 'base', undefined, 'phasers');
        }
      }
      // A distant known installation from LIST is a navigation objective,
      // never a firing solution. SCAN must confirm it before firing.
      const objective = objects.filter(o => o.faction === opposing && o.position && (o.kind === 'base' || o.kind === 'planet' && (o.builds ?? 0) > 0))
        .sort((a, b) => distance(s.position, a.position!) - distance(s.position, b.position!))[0];
      if (objective) {
        const step = route(this.map, s.position, objective.position!, this.team, now, false, false, objective.kind === 'base' ? 5 : 3);
        if (step && this.map.danger(step, this.team, now) === 0) return this.move(step, s, d, 'Seek the known enemy installation reported by LIST; confirm it with SCAN.');
      }
    }
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

  private act(command: string, reason: string, targetKind?: 'ship' | 'base' | 'planet' | 'star', objectiveAction?: 'capture' | 'build', weapon?: 'phasers' | 'torpedoes'): Decision {
    return { kind: 'act', command, reason, ...(targetKind ? { targetKind } : {}), ...(objectiveAction ? { objectiveAction } : {}), ...(weapon ? { weapon } : {}) };
  }
  private move(to: Position, status: ShipStatus, devices: Devices, reason: string): Decision {
    if (status.energy <= (status.shieldsUp ? 8 : 4) + 100) return this.act('STATUS', 'Energy too low for movement; await help rather than exhaust engines.');
    this.previousMove = { from: status.position, to };
    return this.act(`${devices.warp >= 300 ? 'IMPULSE' : 'MOVE'} ABSOLUTE ${to.v} ${to.h}`, reason);
  }
}
