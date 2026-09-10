import { setTimeout as delay } from 'node:timers/promises';
import { PlayerClient, ReentryRequired, type RecordEvent, type Team } from './client.ts';
import { WarFinished, type WarWinner } from './war-result.ts';
import { classifyDestruction, classifyTorpedoOutcome, parseDevices, parseFriendlyBases, parseList, parseScan, parseStatus, parseTargets, parseTeamPoints, fleetSymbols, type ListedObject } from './observations.ts';
import { PlanetMissions } from './planet-missions.ts';
import { BaseMissions } from './base-missions.ts';
import { BaseDefense } from './base-defense.ts';
import type { Observation } from './captain.ts';
import type { StrategyDefinition } from '../player-library/types.ts';
import { createCaptainStrategy } from '../player-library/strategies/captain.ts';
import { extractRadioMessages, radioMessage } from './radio-coordination.ts';

export type PlayerOptions = {
  host: string; port: number; name: string; team: Team; ship: string;
  rounds: number; intervalMs: number; record: RecordEvent;
  submissionIntervalMs?: number;
  romulan?: boolean; blackHoles?: boolean; tournamentSeed?: number;
  stayConnected?: boolean;
  signal?: AbortSignal;
  mode?: 'patrol' | 'resupply' | 'objective' | 'defense' | 'siege';
  torpedoes?: boolean;
  torpedoCorridor?: boolean;
  coordinatedBases?: boolean;
  persistentResupply?: boolean;
  surveyHandoff?: boolean;
  systematicExploration?: boolean;
  longMoves?: boolean;
  preferClosePlanetFire?: boolean;
  aggressive?: boolean;
  radioCoordination?: boolean;
  explorationPriority?: boolean;
  lives?: number;
  sharedIntel?: SharedIntel;
  strategy?: StrategyDefinition;
};

export interface SharedIntel {
  assignPlanet?(team: Team, captain: string, observation: Observation, now: number): import('./observations.ts').Position | null;
  releasePlanet?(team: Team, captain: string, position?: import('./observations.ts').Position): void;
  assignBase?(team: Team, captain: string, observation: Observation, now: number): import('./observations.ts').Position | null;
  assignBaseDefense?(team: Team, captain: string, observation: Observation, now: number): import('./observations.ts').Position | null;
  publish(team: Team, targets: ListedObject[]): void;
  snapshot(team: Team, now: number): ListedObject[];
}

// Fleet-local coordination memory. It contains only public TARGETS/LIST
// observations and expires them after five seconds; it never exposes runtime state.
export class FleetIntel implements SharedIntel {
  private readonly missions = new PlanetMissions();
  private readonly bases = new BaseMissions();
  private readonly defense = new BaseDefense();
  assignPlanet(team: Team, captain: string, observation: Observation, now: number) { return this.missions.assign(team, captain, observation, now); }
  releasePlanet(team: Team, captain: string, position?: import('./observations.ts').Position) { this.missions.release(team, captain, position); }
  assignBase(team: Team, captain: string, observation: Observation, now: number) { return this.bases.assign(team, captain, observation, now); }
  assignBaseDefense(team: Team, captain: string, observation: Observation, now: number) { return this.defense.assign(team, captain, observation, now); }
  private readonly sightings = new Map<string, ListedObject>();
  publish(team: Team, targets: ListedObject[]): void {
    const now = Date.now();
    for (const target of targets) if (target.position) this.sightings.set(`${team}:${target.kind}:${target.name}:${target.position.v},${target.position.h}`, { ...target, observedAt: now });
  }
  snapshot(team: Team, now: number): ListedObject[] {
    const opposing = team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
    for (const [key, target] of this.sightings) if (now - target.observedAt > 5000) this.sightings.delete(key);
    return [...this.sightings.values()].filter(target => target.faction === opposing && now - target.observedAt <= 5000);
  }
}

export class ObservationReader {
  private bases: Observation['bases'] | undefined;
  private devices: Observation['devices'] | undefined;
  private basesAt = -Infinity;
  private devicesAt = -Infinity;
  private previousStatus: Observation['status'] | undefined;
  afterAction(command: string): void {
    if (/^(DOCK|CAPTURE|BUILD)\b/i.test(command)) this.basesAt = -Infinity;
    if (/^(DOCK|REPAIR|PHASERS|TORPEDOES)\b/i.test(command)) this.devicesAt = -Infinity;
  }
  async observe(client: Pick<PlayerClient, 'command'>, team: Team, onRadio?: (intent: import('./radio-coordination.ts').RadioIntent) => void): Promise<Observation> {
  const radio = [] as import('./radio-coordination.ts').RadioIntent[];
  const seenRadio = new Set<string>();
  const read = async (line: string) => {
    const response = await client.command(line);
    for (const intent of extractRadioMessages(response)) {
      const position = 'position' in intent && intent.position ? `${intent.position.v},${intent.position.h}` : '';
      const key = `${intent.kind}|${position}|${intent.text}`;
      if (seenRadio.has(key)) continue;
      seenRadio.add(key); radio.push(intent); onRadio?.(intent);
    }
    return response;
  };
  if (!this.bases || Date.now() - this.basesAt >= 15000) {
    this.bases = parseFriendlyBases(await read('BASES'), team); this.basesAt = Date.now();
  }
  const objects = parseList(await read('LIST'));
  const scan = parseScan(await read('SCAN 10 WARNING'));
  const hostileSymbols = fleetSymbols[team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION'];
  const contact = scan.cells.some(cell => cell.symbol === '??' || (cell.symbol.trim().length === 1 && hostileSymbols.includes(cell.symbol.trim())));
  const targets = contact ? parseTargets(await read('TARGETS')) : [];
  const status = parseStatus(await read('STATUS'));
  if (!this.devices || Date.now() - this.devicesAt >= 15000 || (this.previousStatus && (status.hullDamage > this.previousStatus.hullDamage || status.shieldPercent < this.previousStatus.shieldPercent || status.condition === 'Red'))) {
    this.devices = parseDevices(await read('DAMAGES')); this.devicesAt = Date.now();
  }
  this.previousStatus = status;
  return { bases: this.bases, devices: this.devices, scan, status, objects, targets, radio };
  }
}

// One-shot callers receive a complete first observation. The play loop retains
// one reader per life so static reports can be reused without aging sensor data.
export async function observe(client: Pick<PlayerClient, 'command'>, team: Team, onRadio?: (intent: import('./radio-coordination.ts').RadioIntent) => void): Promise<Observation> {
  return new ObservationReader().observe(client, team, onRadio);
}

export function objectiveConfirmation(previous: NonNullable<Observation['objects']>, current: NonNullable<Observation['objects']>, team: Team,
  pending?: { action: 'capture' | 'build'; position: { v: number; h: number } }): Record<string, unknown> | undefined {
  if (!pending) return undefined;
  const { position } = pending;
  const old = previous.find(o => o.kind === 'planet' && o.position?.v === position.v && o.position.h === position.h);
  const planet = current.find(o => o.kind === 'planet' && o.position?.v === position.v && o.position.h === position.h);
  const base = current.find(o => o.kind === 'base' && o.position?.v === position.v && o.position.h === position.h);
  if (pending.action === 'capture' && old && old.faction !== team && planet?.faction === team) return { event: 'planet-captured', position, previousFaction: old.faction };
  if (pending.action === 'build' && old?.faction === team && planet?.faction === team && (planet.builds ?? 0) > (old.builds ?? 0)) return { event: 'planet-built', position, from: old.builds ?? 0, to: planet.builds ?? 0 };
  if (pending.action === 'build' && old?.faction === team && !planet && base?.faction === team) return { event: 'base-created', position };
  return undefined;
}

export async function play(options: PlayerOptions): Promise<{ rounds: number; deaths: number; outcome: 'complete' | 'blocked' | 'limit' | 'interrupted' | 'dead' | 'war-over'; reason: string; winner?: WarWinner }> {
  const client = new PlayerClient(options);
  const strategyDefinition = options.strategy ?? createCaptainStrategy({ mode: options.mode, torpedoes: options.torpedoes, torpedoCorridor: options.torpedoCorridor, persistentResupply: options.persistentResupply, coordinatedBases: options.coordinatedBases, surveyHandoff: options.surveyHandoff, systematicExploration: options.systematicExploration, longMoves: options.longMoves, preferClosePlanetFire: options.preferClosePlanetFire, aggressive: options.aggressive, explorationPriority: options.explorationPriority });
  let strategy = strategyDefinition.create({ team: options.team, ship: options.ship });
  let observer = new ObservationReader();
  let rounds = 0, deaths = 0, reason = 'Configured round limit reached.';
  let lastRadio = { kind: '', at: -Infinity };
  const announce = async (kind: string, message: string, now: number) => {
    const cooldown = kind === 'resupply' ? 90000 : 60000;
    if (!(options.radioCoordination ?? options.aggressive) || (lastRadio.kind === kind && now - lastRadio.at < cooldown)) return;
    const recipient = options.team === 'FEDERATION' ? 'FEDERATION' : 'EMPIRE';
    const response = await client.command(`TELL ${recipient}; ${message}`);
    lastRadio = { kind, at: now };
    options.record({ event: 'radio-sent', recipient, kind, message, response });
  };
  let outcome: 'complete' | 'blocked' | 'limit' | 'interrupted' | 'dead' = 'limit';
  let previousObjects: Observation['objects'];
  let pendingObjective: { action: 'capture' | 'build'; position: { v: number; h: number } } | undefined;
  const pause = async (ms: number) => {
    try { await delay(ms, undefined, { signal: options.signal }); }
    catch (error) { if (!options.signal?.aborted) throw error; }
  };
  try {
    await client.join(options);
    options.record({ event: 'joined', name: options.name, team: options.team, ship: options.ship });
    for (; rounds < options.rounds && !options.signal?.aborted; rounds++) {
      try {
        // Keep navigation and combat reports fresh; reuse only bounded base/device caches.
        const observation = await observer.observe(client, options.team, intent => options.record({ event: 'radio-received', kind: intent.kind, text: intent.text, position: 'position' in intent ? intent.position : undefined }));
        if (options.sharedIntel) {
          options.sharedIntel.publish(options.team, [...(observation.targets ?? []), ...(observation.objects ?? [])]);
          observation.intel = options.sharedIntel.snapshot(options.team, Date.now());
          if (options.mode === 'siege' && options.torpedoes !== false && options.sharedIntel.assignPlanet) observation.planetMission = options.sharedIntel.assignPlanet(options.team, options.name, observation, Date.now());
          // Aggressive captains run the objective-mode loop so a fraction of
          // the fleet can keep capturing/building. They still need the siege
          // fleet's shared base assignment to concentrate fire on one
          // installation at a time; exploration-priority ships remain on the
          // objective path and do not consume base missions.
          const coordinatedSiege = options.mode === 'siege' || options.aggressive;
          if (coordinatedSiege && options.coordinatedBases && options.sharedIntel.assignBase) observation.baseMission = options.sharedIntel.assignBase(options.team, options.name, observation, Date.now());
          if (coordinatedSiege && options.coordinatedBases && options.sharedIntel.assignBaseDefense) observation.baseDefense = options.sharedIntel.assignBaseDefense(options.team, options.name, observation, Date.now());
        }
        if (previousObjects && pendingObjective) {
          const confirmation = objectiveConfirmation(previousObjects, observation.objects ?? [], options.team, pendingObjective);
          if (confirmation) options.record(confirmation);
          pendingObjective = undefined;
        }
        previousObjects = observation.objects;
        const decision = strategy.decide({ observation, now: Date.now() });
        const decisionNow = Date.now();
        if (decision.kind === 'act' && decision.targetKind === 'base') {
          const m = /ABSOLUTE (\d+) (\d+)$/.exec(decision.command);
          await announce('strike-base', radioMessage({ kind: 'strike-base', position: m ? { v: Number(m[1]), h: Number(m[2]) } : undefined, text: '' }), decisionNow);
        } else if (decision.kind === 'act' && decision.targetKind === 'planet') {
          const m = /ABSOLUTE (\d+) (\d+)$/.exec(decision.command);
          await announce('strike-planet', radioMessage({ kind: 'strike-planet', position: m ? { v: Number(m[1]), h: Number(m[2]) } : undefined, text: '' }), decisionNow);
        }
        if (decision.kind === 'act' && observation.status.energy < 2400 && /suppl|energy/i.test(decision.reason)) {
          await announce('resupply', radioMessage({ kind: 'resupply', text: '' }), decisionNow);
        }
        if (decision.kind === 'act' && decision.releasePlanetMission && options.sharedIntel?.releasePlanet && observation.planetMission) options.sharedIntel.releasePlanet(options.team, options.name, observation.planetMission);
        // Raw terminal frames already preserve the full scan without a second
        // copy of hundreds of parsed cells in long-running decision logs.
        const { scan, ...reports } = observation;
        options.record({ event: 'decision', round: rounds + 1, ...reports, scanObservedAt: scan.observedAt, ...decision });
        if (decision.kind === 'blocked') {
          // Freshness is a safety gate, not a terminal strategy result. Large
          // fleets can exceed the five-second observation window while other
          // captains are using the host; retry with a new STATUS/SCAN cycle.
          options.record({ event: 'observation-blocked', reason: decision.reason });
          await pause(Math.max(options.intervalMs, 250));
          continue;
        }
        if (decision.kind !== 'act') { reason = decision.reason; outcome = decision.kind; break; }
        const response = await client.command(decision.command);
        observer.afterAction(decision.command);
        options.record({ event: 'action-result', command: decision.command, response });
        for (const kind of classifyDestruction(response)) options.record({ event: 'destruction-confirmed', kind, command: decision.command });
        if (decision.weapon === 'torpedoes') options.record({ event: 'torpedo-result', command: decision.command, outcome: classifyTorpedoOutcome(response), response });
        if (decision.objectiveAction) {
          const location = / ABSOLUTE (\d+) (\d+)$/.exec(decision.command);
          if (location) pendingObjective = { action: decision.objectiveAction, position: { v: Number(location[1]), h: Number(location[2]) } };
        }
        await pause(options.intervalMs);
      } catch (error) {
        if (!(error instanceof ReentryRequired)) throw error;
        deaths++;
        options.record({ event: 'death', deaths });
        if (deaths >= (options.lives ?? 3)) { outcome = 'dead'; reason = 'Configured life limit reached.'; break; }
        if (options.signal?.aborted) break;
        await client.join(options);
        strategy = strategyDefinition.create({ team: options.team, ship: options.ship });
        observer = new ObservationReader();
        options.record({ event: 'rejoined', deaths, ship: options.ship });
      }
    }
    if (options.signal?.aborted) { outcome = 'interrupted'; reason = 'Stopped by user.'; }
    if (options.stayConnected && outcome !== 'dead' && !options.signal?.aborted) {
      options.record({ event: 'holding', rounds, outcome, reason });
      // Remain an ordinary visible captain after the bounded tactic stops.
      // STATUS has no main-loop turn/energy charge (Austin STATUS:3860ff).
      // This observes only; it does not resume unsafe tactics or prevent death.
      while (!options.signal?.aborted) {
        const status = parseStatus(await client.command('STATUS'));
        options.record({ event: 'holding-status', status });
        await pause(Math.max(5000, options.intervalMs));
      }
    }
    if (outcome !== 'dead') {
      try {
        const response = await client.command('POINTS FED EMPIRE');
        options.record({ event: 'final-points', points: parseTeamPoints(response) });
      } catch (error) {
        if (error instanceof WarFinished) throw error;
        options.record({ event: 'final-points-unavailable', error: error instanceof Error ? error.message : String(error) });
      }
    }
    await client.quit();
    const result = { rounds, deaths, outcome, reason };
    options.record({ event: 'completed', ...result });
    return result;
  } catch (error) {
    if (error instanceof WarFinished) {
      const result = { rounds, deaths, outcome: 'war-over' as const, winner: error.winner, reason: error.message };
      options.record({ event: 'war-ended', ...result, result: error.winner === 'NEITHER' ? 'mutual-loss' : error.winner === options.team ? 'victory' : 'defeat', text: error.text });
      options.record({ event: 'completed', ...result });
      return result;
    }
    options.record({ event: 'failed', error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally { client.close(); }
}
