import type { Team } from './client.ts';
import { distance, fleetSymbols, positionKey, type Cell, type Devices, type ListedObject, type Position, type Scan, type ShipStatus } from './observations.ts';
import { clearDirectRoute, neighbors, ObservedMap, route } from './navigation.ts';
import type { Decision } from './policy.ts';
import { planetFiringRoute, planetSurveyRoute } from './planet-firing-route.ts';
import { clearTorpedoCorridor, torpedoCorridor } from './torpedo-corridor.ts';
import { ResupplyRoute } from './resupply-route.ts';
import { unexploredFrontier } from './exploration.ts';
import type { RadioIntent } from './radio-coordination.ts';

const OBJECTIVE_WAYPOINT_TTL_MS = 30_000;

export type Observation = { planetMission?: Position | null; baseMission?: Position | null; baseDefense?: Position | null; radio?: RadioIntent[]; status: ShipStatus; devices: Devices; scan: Scan; bases: Position[]; objects?: ListedObject[]; targets?: ListedObject[]; intel?: ListedObject[] };

// SNOVA recursively visits orthogonally and diagonally adjacent stars. A
// candidate is usable only when the whole observed star component and its
// one-sector blast rim are visible and contain no friendly, neutral planet or
// shooter. Deliberate novas are an installation tactic: at least one confirmed
// enemy base or planet must lie on the blast rim.
// Source: Austin DECWAR.FOR:3804-3852 and NOVA:2256-2391.
export function selectSafeNova(scan: Scan, status: ShipStatus, team: Team, targets: ListedObject[], now = Math.max(scan.observedAt, status.observedAt)): Cell | undefined {
  const byPosition = new Map(scan.cells.map(c => [positionKey(c), c]));
  const stars = scan.cells.filter(c => c.symbol === ' *' && distance(status.position, c) <= 6 && distance(status.position, c) > 1);
  const vmin = Math.min(...scan.cells.map(c => c.v)), vmax = Math.max(...scan.cells.map(c => c.v));
  const hmin = Math.min(...scan.cells.map(c => c.h)), hmax = Math.max(...scan.cells.map(c => c.h));
  const friendlyShips = team === 'FEDERATION' ? fleetSymbols.FEDERATION : fleetSymbols.EMPIRE;
  const friendlyBase = team === 'FEDERATION' ? '<>' : ')(';
  const friendlyPlanet = team === 'FEDERATION' ? '@F' : '@E';
  const enemyBase = team === 'FEDERATION' ? ')(' : '<>';
  const enemyPlanet = team === 'FEDERATION' ? '@E' : '@F';
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
    if (rim.some(c => distance(c, status.position) === 0 || c.symbol === ' @' || c.symbol === friendlyPlanet || c.symbol === friendlyBase || c.symbol === '  ' || friendlyShips.includes(c.symbol.trim()))) continue;
    const componentKeys = new Set(component.map(positionKey));
    const launch = torpedoCorridor(status.position, star);
    if (!launch.length || launch.some(position => {
      const cell = byPosition.get(positionKey(position));
      if (!cell || now - cell.observedAt > 5000 || cell.observedAt > now) return true;
      return !componentKeys.has(positionKey(position)) && cell.symbol !== ' .' && cell.symbol !== ' !'
        && cell.symbol !== enemyBase && cell.symbol !== enemyPlanet
        && !(cell.symbol.trim().length === 1 && fleetSymbols[opposing].includes(cell.symbol.trim()));
    })) continue;
    const victims = targets.filter(t => t.faction === opposing && t.position && (t.kind === 'base' || t.kind === 'planet'))
      .filter(t => component.some(s => distance(s, t.position!) <= 1))
      .filter(t => rim.some(c => distance(c, t.position!) === 0 && c.symbol === (t.kind === 'base' ? enemyBase : enemyPlanet)));
    if (!victims.length) continue;
    const score = victims.reduce((total, victim) => total + (victim.kind === 'base' ? 500 : 300 + Math.max(0, 3 - (victim.builds ?? 0)) * 25), 0);
    candidates.push({ star, score: score - distance(status.position, star) });
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
  private siegeTarget: { position: Position; kind: 'base' | 'planet'; selectedAt: number } | undefined;
  private resupplying = false;
  private readonly refugeRoute = new ResupplyRoute();
  readonly persistentResupply: boolean;
  readonly surveyHandoff: boolean;
  readonly preferClosePlanetFire: boolean;
  readonly systematicExploration: boolean;
  readonly longMoves: boolean;
  readonly aggressive: boolean;
  readonly explorationPriority: boolean;
  private patrolIndex = 0;
  private surveyPosition?: Position;
  private surveyTarget?: Position;
  private surveyMoves = 0;
  private firingPosition?: Position;
  private lastFire = -Infinity;
  private lastTorpedo = -Infinity;
  private guardCycles = 0;
  private defenseSortieUntil = -Infinity;
  readonly team: Team;
  readonly mode: 'patrol' | 'resupply' | 'objective' | 'defense' | 'siege';
  readonly experimentalNovas: boolean;
  readonly torpedoesEnabled: boolean;
  readonly torpedoCorridorEnabled: boolean;
  constructor(team: Team, mode: 'patrol' | 'resupply' | 'objective' | 'defense' | 'siege' = 'patrol', experimentalNovas = false, torpedoesEnabled = true, torpedoCorridorEnabled = false, persistentResupply = false, surveyHandoff = false, preferClosePlanetFire = false, systematicExploration = false, longMoves = false, aggressive = false, explorationPriority = false) {
    this.persistentResupply = persistentResupply;
    this.surveyHandoff = surveyHandoff;
    this.preferClosePlanetFire = preferClosePlanetFire;
    this.systematicExploration = systematicExploration;
    this.longMoves = longMoves;
    this.aggressive = aggressive;
    this.explorationPriority = explorationPriority;
    this.team = team; this.mode = mode; this.experimentalNovas = experimentalNovas; this.torpedoesEnabled = torpedoesEnabled; this.torpedoCorridorEnabled = torpedoCorridorEnabled;
  }

  choose(observation: Observation, now = Date.now()): Decision {
    const { status: s, devices: d, scan, bases } = observation;
    if (now - s.observedAt > 5000 || now - scan.observedAt > 5000) return { kind: 'blocked', reason: 'Need fresh status and scan before acting.' };
    this.map.ingest(scan, s.position);
    if (this.previousMove && distance(this.previousMove.from, s.position) === 0) this.map.block(this.previousMove.to, now);
    this.previousMove = undefined;
    const opposing = this.team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
    const sharedIntel = (observation.intel ?? []).filter(o => o.position && now - o.observedAt <= 5000);
    const objects = [...(observation.objects ?? []), ...sharedIntel].filter(o => now - o.observedAt <= 5000);
    const targets = (observation.targets ?? []).filter(o => now - o.observedAt <= 5000);
    const sharedEnemies = sharedIntel.filter(o => o.kind === 'ship' && o.faction === opposing);
    const radioTargets = (observation.radio ?? []).filter(r => r.kind === 'strike-base' || r.kind === 'strike-planet').flatMap(r => 'position' in r && r.position ? [r.position] : []);
    const needyTeammate = (observation.radio ?? []).some(r => r.kind === 'resupply')
      ? objects.find(o => o.kind === 'ship' && o.faction === this.team && o.position && distance(o.position, s.position) > 0 && distance(o.position, s.position) <= 1)
      : undefined;
    if (needyTeammate && s.energy > 1500 && s.energy > 500) return this.act(`ENERGY ${needyTeammate.name} 500`, `Send energy to the adjacent teammate requesting resupply.`, 'ship');
    const friendlyAssets = objects.filter(o => o.faction === this.team && o.position && (o.kind === 'base' || o.kind === 'planet'));
    const hostileInstallation = objects.some(o => o.faction === opposing && o.position && (o.kind === 'base' || o.kind === 'planet' && (o.builds ?? 0) > 0));
    const strikeCall = (observation.radio ?? []).some(r => r.kind === 'strike-base' || r.kind === 'strike-planet');
    // Explorers keep their capture/build role until a teammate reports an
    // assault. A strike call can temporarily pull them into the attack when
    // the fleet has enough friendly assets to make the handoff worthwhile.
    const aggressiveStrike = this.aggressive && friendlyAssets.length >= 3 && hostileInstallation
      && (!this.explorationPriority || strikeCall);
    const enemies = this.map.enemies(scan, this.team).sort((a, b) => {
      // LIST's shield reading ranks only the same fresh SCAN ship/position.
      const score = (c: Cell) => {
        const detail = objects.find(o => o.kind === 'ship' && o.faction === opposing && o.name[0] === c.symbol.trim() && o.position && distance(o.position, c) === 0);
        const defended = this.mode === 'defense' && friendlyAssets.length ? Math.min(...friendlyAssets.map(o => distance(o.position!, c))) : 0;
        return distance(s.position, c) * 3 + (detail?.shieldPercent ?? 100) / 10 + defended * 4;
      };
      return score(a) - score(b);
    });
    // Aggressive fleet play treats ships as a defensive problem. Protect the
    // captain, friendly installations, and the assigned assault objective;
    // otherwise preserve ammunition and continue the installation mission.
    const protectedObjectives = [observation.baseMission, observation.planetMission, observation.baseDefense, ...radioTargets]
      .filter((position): position is Position => !!position);
    const combatEnemies = this.aggressive ? enemies.filter(enemy =>
      distance(s.position, enemy) <= 2
      || friendlyAssets.some(asset => asset.position && distance(asset.position, enemy) <= 4)
      || protectedObjectives.some(position => distance(position, enemy) <= 3 && distance(s.position, position) <= 6)
    ) : enemies;
    const threat = this.map.danger(s.position, this.team, now) > 0;
    if (observation.baseDefense && this.mode === 'siege' && !enemies.some(e => distance(s.position, e) <= 4) && distance(s.position, observation.baseDefense) > 2) {
      const guard = route(this.map, s.position, observation.baseDefense, this.team, now, false, true, 2);
      if (guard) return this.move(guard, s, d, 'Reinforce the only known friendly base threatened by a nearby enemy.');
    }
    const maxDamage = Math.max(...Object.values(d));
    // Combat admission and withdrawal share the same reserve threshold. The
    // previous 2400/2800 gap sent an unable-to-fire ship back into patrol.
    const hostileInstallations = scan.cells.filter(c => [opposing === 'EMPIRE' ? ')(' : '<>', opposing === 'EMPIRE' ? '@E' : '@F'].includes(c.symbol));
    const needSupplies = (this.mode === 'siege' && this.torpedoesEnabled && s.torpedoes <= 2) || s.energy < 2400 || ((enemies.length > 0 || hostileInstallations.length > 0) && s.energy < 2800) || s.shieldPercent < 55 || s.hullDamage > 600 || maxDamage >= 200;
    if (needSupplies || this.mode === 'resupply') this.resupplying = true;
    const adjacent = bases.find(base => distance(s.position, base) <= 1);
    const full = s.energy >= 4900 && s.shieldPercent >= 95 && s.hullDamage === 0 && s.torpedoes === 10 && maxDamage === 0;
    if (adjacent && (!full || !s.docked) && (this.resupplying || s.docked)) return this.act('DOCK', 'Replenish at the observed adjacent friendly base.');
    if (adjacent && full && this.resupplying) {
      this.resupplying = false; this.goal = undefined;
      this.refugeRoute.clear();
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
      if (this.persistentResupply) {
        const planned = this.refugeRoute.choose(this.map, s.position, bases, this.team, now);
        if (planned) return { ...this.move(planned.next, s, d, 'Route around obstacles toward supplies.'), refuge: { destination: planned.destination, cost: planned.cost, reason: planned.reason } };
      }
      const destinations = this.persistentResupply ? [] : [...bases].sort((a, b) => refugeCost(a) - refugeCost(b));
      for (const base of destinations) {
        const step = route(this.map, s.position, base, this.team, now, true, true);
        if (step) return this.move(step, s, d, threat ? 'Leave the installation danger zone and approach supplies.' : 'Route around obstacles toward supplies.');
      }
      const escape = neighbors(s.position).filter(p => this.map.passable(p, now) && this.map.cell(p, now))
        .sort((a, b) => this.map.danger(a, this.team, now, true) - this.map.danger(b, this.team, now, true))[0];
      if (escape) return this.move(escape, s, d, 'No base route available; seek a traversable escape sector.');
      return this.act('STATUS', 'Surrounded: observe again rather than repeat an obstructed move.');
    }
    this.refugeRoute.clear();
    // Deliberate novas precede direct siege fire because one blast can damage
    // several installations. SNOVA may chain through adjacent stars with an
    // independent 80% chance per star and costs 500 points per exploded star.
    const novaIntel = [...targets, ...objects].filter((target, index, all) =>
      target.position && all.findIndex(other => other.kind === target.kind && other.position
        && distance(other.position, target.position!) === 0) === index);
    const nova = this.experimentalNovas && s.torpedoes > 7 && s.shieldPercent >= 75 && d.torpedoes < 300 && d.computer < 300
      ? selectSafeNova(scan, s, this.team, novaIntel, now) : undefined;
    if (nova && now - this.lastTorpedo >= 3000) {
      this.lastTorpedo = now;
      return this.act(`TORPEDOES ABSOLUTE 1 ${nova.v} ${nova.h}`, 'Trigger an observed star nova against an enemy installation with the potential blast area clear of friendly and neutral assets.', 'star', undefined, 'torpedoes');
    }
    // Siege captains retain installation missions through resupply. Only a
    // defensive ship contact can displace a safe, observed installation goal.
    if ((this.mode === 'siege' || aggressiveStrike) && !(this.aggressive ? combatEnemies.length : enemies.some(enemy => distance(s.position, enemy) <= 4))) {
      const action = this.siege(observation, objects, opposing, now);
      if (action) return action;
    }
    // PHACON:2647ff: strength 180 cannot trigger IRAN(100)*strength >18900;
    // displayed energy cost is strength +200 with shields up. The server owns
    // two-bank readiness. Conservative three-second spacing avoids queueing.
    const confirmedTargets = (kind: ListedObject['kind']) => targets.filter(o => o.kind === kind && o.position);
    const target: Cell | undefined = combatEnemies.find(enemy => distance(s.position, enemy) <= 10 && (
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
          && now - this.lastTorpedo >= 3000 && (!this.torpedoCorridorEnabled || clearTorpedoCorridor(scan, s.position, target, this.team, now))) {
        this.lastTorpedo = now;
        return this.act(`TORPEDOES ABSOLUTE 1 ${target.v} ${target.h}`, `Use one torpedo against fresh TARGETS/SCAN agreement on weakened ${detail.name} shields.`, 'ship', undefined, 'torpedoes');
      }
      // PHADAM, DECWAR.FOR:4167-4195 attenuates hits with distance. Four
      // sectors is a policy choice, not a new rule or an arithmetic emulator.
      // Close on a single fresh opponent only with strong reserves and a
      // fresh, traversable step outside known installation danger. Multiple
      // enemies or depleted shields retain the conservative firing position.
      if (distance(s.position, target) > 4 && combatEnemies.length === 1 && s.energy >= 3200 && s.shieldPercent >= 75) {
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
    if (maxDamage > 0 && !combatEnemies.length) return this.act('REPAIR 30', 'Repair devices between encounters.');
    // Teammate sightings provide a pursuit waypoint only. The local SCAN and
    // TARGETS checks above remain mandatory before any weapon command.
    if (this.mode !== 'objective' && this.mode !== 'siege' && !enemies.length && sharedEnemies.length && !threat && s.energy >= 2800 && s.shieldPercent >= 75) {
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
    if (this.mode === 'objective' && !aggressiveStrike && !combatEnemies.length && s.energy >= 3500 && s.shieldPercent >= 75) {
      const planetSymbol = (faction: ListedObject['faction']) => faction === 'NEUTRAL' ? ' @' : faction === 'FEDERATION' ? '@F' : '@E';
      // Austin PARAM.FOR:6 KNBASE=10; a four-build planet cannot convert while
      // all ten friendly base slots are occupied, so do not repeat BUILD.
      const actionable = (o: ListedObject) => o.faction === this.team
        ? (o.builds ?? 0) < 4 || (o.builds ?? 0) === 4 && bases.length < 10
        : (o.builds ?? 0) === 0;
      // Enemy bases defend through four sectors (BASPHA). Do not send an
      // objective captain to a planet inside a known base's defense radius;
      // this prevents a fresh LIST target from turning into a predictable
      // approach through an installation kill zone.
      const safePlanet = (o: ListedObject) => !objects.some(enemy => enemy.kind === 'base' && enemy.faction === opposing && enemy.position && o.position && distance(enemy.position, o.position) <= 4);
      const candidates = objects.filter(o => o.kind === 'planet' && o.position)
        .filter(actionable)
        .filter(safePlanet)
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
        .filter(safePlanet)
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
    if (!combatEnemies.length && s.energy >= 2800 && s.shieldPercent >= 75 && d.phasers < 300) {
      const installation = hostileInstallations
        .filter(c => !this.explorationPriority || c.symbol.trim().startsWith('@'))
        .filter(c => c.symbol === (opposing === 'EMPIRE' ? ')(' : '<>') || objects.some(o => o.kind === 'planet' && o.position && distance(o.position, c) === 0 && (o.builds ?? 0) > 0))
        .sort((a, b) => (radioTargets.some(p => distance(p, a) === 0) ? -1 : 0) - (radioTargets.some(p => distance(p, b) === 0) ? -1 : 0) || distance(s.position, a) - distance(s.position, b))[0];
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
    if (this.systematicExploration) {
      const frontier = unexploredFrontier(this.map, s.position, this.team, now);
      if (frontier) {
        const frontierStep = route(this.map, s.position, frontier, this.team, now, true, true);
        if (frontierStep) return this.move(frontierStep, s, d, 'Push toward the least-visited mapped frontier to reveal new sectors.');
      }
    }
    if (!this.goal || distance(s.position, this.goal) <= 2) {
      const points = [{ v: 12, h: 12 }, { v: 12, h: 64 }, { v: 64, h: 64 }, { v: 64, h: 12 }, { v: 38, h: 38 }];
      if (!this.goal && this.patrolIndex === 0) this.patrolIndex = points.findIndex(p => distance(s.position, p) > 15);
      this.goal = points[this.patrolIndex++ % points.length];
    }
    if (this.longMoves && clearDirectRoute(this.map, s.position, this.goal, this.team, now)) {
      return this.move(this.goal, s, d, 'Use a bounded clear multi-sector move through freshly observed safe space.');
    }
    let step = route(this.map, s.position, this.goal, this.team, now, true);
    if (!step) {
      this.goal = undefined;
      step = neighbors(s.position).filter(p => this.map.passable(p, now) && this.map.cell(p, now))
        .sort((a, b) => (this.map.visits.get(positionKey(a)) ?? 0) - (this.map.visits.get(positionKey(b)) ?? 0))[0];
    }
    return step ? this.move(step, s, d, 'Patrol through observed free space and look for opponents.') : this.act('STATUS', 'No traversable step; wait for a fresh scan.');
  }

  private siege(observation: Observation, objects: ListedObject[], opposing: Team, now: number): Decision | undefined {
    const { status: s, scan, devices: d } = observation;
    const eligible = (o: ListedObject) => o.kind === 'base' ? o.faction === opposing
      : o.kind === 'planet' && (o.faction === opposing || this.torpedoesEnabled && o.faction === 'NEUTRAL') && (this.torpedoesEnabled || (o.builds ?? 0) > 0);
    const candidates = objects.filter(o => o.position && eligible(o)
      && (o.kind !== 'planet' || observation.planetMission === undefined || observation.planetMission !== null && distance(o.position, observation.planetMission) === 0)
      && (o.kind !== 'base' || observation.baseMission === undefined || observation.baseMission !== null && distance(o.position, observation.baseMission) === 0));
    if (observation.planetMission && (!this.siegeTarget || distance(this.siegeTarget.position, observation.planetMission) !== 0)) {
      this.siegeTarget = { kind: 'planet', position: observation.planetMission, selectedAt: now }; this.firingPosition = undefined;
    }
    if (observation.planetMission === null && this.siegeTarget?.kind === 'planet') { this.siegeTarget = undefined; this.firingPosition = undefined; }
    const symbol = (o: ListedObject) => o.kind === 'base' ? (opposing === 'EMPIRE' ? ')(' : '<>')
      : o.faction === 'NEUTRAL' ? ' @' : (opposing === 'EMPIRE' ? '@E' : '@F');
    const listedTarget = (target: { position: Position; kind: 'base' | 'planet' }) => objects.find(o => o.position && distance(o.position, target.position) === 0 && o.kind === target.kind);
    if (this.siegeTarget) {
      const target = this.siegeTarget, listed = listedTarget(target);
      const cell = scan.cells.find(c => distance(c, target.position) === 0);
      if (now - target.selectedAt > 300000 || listed && !eligible(listed) || cell && (!listed || cell.symbol !== symbol(listed))) this.siegeTarget = undefined;
    }
    if (!this.siegeTarget) {
      const target = candidates.sort((a, b) => distance(s.position, a.position!) - distance(s.position, b.position!))[0];
      if (target?.position) this.siegeTarget = { position: { ...target.position }, kind: target.kind as 'base' | 'planet', selectedAt: now };
    }
    const target = this.siegeTarget;
    if (!target || s.energy < 2800 || s.shieldPercent < 75) return undefined;
    const range = target.kind === 'base' ? 5 : 3;
    const listed = listedTarget(target);
    const confirmed = !!listed && eligible(listed) && scan.cells.some(c => distance(c, target.position) === 0 && c.symbol === symbol(listed));
    // Austin DECWAR.FOR:4383-4398: torpedoes reduce planet builds;
    // a negative build count removes the planet. Phasers cannot do that.
    if (target.kind === 'planet' && this.torpedoesEnabled) {
      if (s.torpedoes <= 2 || d.torpedoes >= 300 || d.computer >= 300) return undefined;
      const clear = (from: Position) => clearTorpedoCorridor(scan, from, target.position, this.team, now, true);
      if (confirmed && distance(s.position, target.position) >= 3 && distance(s.position, target.position) <= 8) {
        if (clear(s.position)) {
          if (now - this.lastTorpedo < 3000) return this.act('STATUS', 'Wait for the planetary torpedo launcher to recover.');
          this.lastTorpedo = now;
          return this.act(`TORPEDOES ABSOLUTE 1 ${target.position.v} ${target.position.h}`, 'Destroy the freshly scanned enemy or neutral planet with single torpedoes through a clear observed corridor.', 'planet', undefined, 'torpedoes');
        }
      }
      const approach = planetFiringRoute(this.map, s.position, target.position, this.team, now, this.firingPosition, this.preferClosePlanetFire);
      if (approach) {
        this.firingPosition = approach.destination;
        if (approach.next) return this.move(approach.next, s, d, 'Follow the retained route to a clear planetary firing position; recheck SCAN before shooting.');
        return this.act('SCAN 10', 'Refresh the corridor at the planned planetary firing position.');
      }
      if (!this.surveyTarget || distance(this.surveyTarget, target.position) !== 0) { this.surveyTarget = { ...target.position }; this.surveyPosition = undefined; }
      const survey = planetSurveyRoute(this.map, s.position, target.position, this.team, now, this.surveyPosition);
      if (survey) {
        this.surveyPosition = survey.destination; this.surveyMoves++;
        const release = this.surveyHandoff && this.surveyMoves >= 120;
        if (release) { this.surveyMoves = 0; return { ...this.move(survey.next, s, d, 'Release an unproductive planet survey after bounded coverage.'), releasePlanetMission: true }; }
        return this.move(survey.next, s, d, 'Survey another angle around the assigned planet instead of stopping at firing range.');
      }
      return this.act('SCAN 10', 'Retain the planet mission while no safe firing approach is observed.');
    }

    if (confirmed && distance(s.position, target.position) === range && d.phasers < 300 && !(target.kind === 'planet' && this.torpedoesEnabled)) {
      if (now - this.lastFire < 3000 + d.phasers * 10) return this.act('STATUS', 'Maintain siege station while the weapon bank recovers.');
      this.lastFire = now;
      return this.act(`PHASERS ABSOLUTE 180 ${target.position.v} ${target.position.h}`, 'Continue the installation siege from a fresh SCAN firing position.', target.kind, undefined, 'phasers');
    }
    const next = route(this.map, s.position, target.position, this.team, now, false, false, range);
    if (next && this.map.danger(next, this.team, now) === 0) return this.move(next, s, d, 'Resume the selected installation siege; confirm with SCAN before firing.');
    return undefined;
  }
  private act(command: string, reason: string, targetKind?: 'ship' | 'base' | 'planet' | 'star', objectiveAction?: 'capture' | 'build', weapon?: 'phasers' | 'torpedoes'): Extract<Decision, { kind: 'act' }> {
    return { kind: 'act', command, reason, ...(targetKind ? { targetKind } : {}), ...(objectiveAction ? { objectiveAction } : {}), ...(weapon ? { weapon } : {}) };
  }
  private move(to: Position, status: ShipStatus, devices: Devices, reason: string): Extract<Decision, { kind: 'act' }> {
    if (status.energy <= (status.shieldsUp ? 8 : 4) + 100) return this.act('STATUS', 'Energy too low for movement; await help rather than exhaust engines.');
    this.previousMove = { from: status.position, to };
    return this.act(`${devices.warp >= 300 ? 'IMPULSE' : 'MOVE'} ABSOLUTE ${to.v} ${to.h}`, reason);
  }
}
