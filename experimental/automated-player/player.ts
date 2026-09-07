import { setTimeout as delay } from 'node:timers/promises';
import { PlayerClient, ReentryRequired, type RecordEvent, type Team } from './client.ts';
import { classifyTorpedoOutcome, parseDevices, parseFriendlyBases, parseList, parseScan, parseStatus, parseTargets, parseTeamPoints, type ListedObject } from './observations.ts';
import { Captain, type Observation } from './captain.ts';

export type PlayerOptions = {
  host: string; port: number; name: string; team: Team; ship: string;
  rounds: number; intervalMs: number; record: RecordEvent;
  romulan?: boolean; blackHoles?: boolean; tournamentSeed?: number;
  stayConnected?: boolean;
  signal?: AbortSignal;
  mode?: 'patrol' | 'resupply' | 'objective' | 'defense';
  torpedoes?: boolean;
  lives?: number;
  sharedIntel?: SharedIntel;
};

export interface SharedIntel {
  publish(team: Team, targets: ListedObject[]): void;
  snapshot(team: Team, now: number): ListedObject[];
}

// Fleet-local coordination memory. It contains only public TARGETS sightings
// and expires them after five seconds; it never exposes runtime state.
export class FleetIntel implements SharedIntel {
  private readonly sightings = new Map<string, ListedObject>();
  publish(team: Team, targets: ListedObject[]): void {
    const now = Date.now();
    for (const target of targets) if (target.kind === 'ship' && target.position) {
      this.sightings.set(`${team}:${target.name}`, { ...target, observedAt: now });
    }
  }
  snapshot(team: Team, now: number): ListedObject[] {
    const opposing = team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
    for (const [key, target] of this.sightings) if (now - target.observedAt > 5000) this.sightings.delete(key);
    return [...this.sightings.values()].filter(target => target.faction === opposing && now - target.observedAt <= 5000);
  }
}

export async function observe(client: PlayerClient, team: Team): Promise<Observation> {
  const bases = parseFriendlyBases(await client.command('BASES'), team);
  const devices = parseDevices(await client.command('DAMAGES'));
  const objects = parseList(await client.command('LIST'));
  const targets = parseTargets(await client.command('TARGETS'));
  const scan = parseScan(await client.command('SCAN 10 WARNING'));
  const status = parseStatus(await client.command('STATUS'));
  return { bases, devices, scan, status, objects, targets };
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

export async function play(options: PlayerOptions): Promise<{ rounds: number; deaths: number; outcome: 'complete' | 'blocked' | 'limit' | 'interrupted' | 'dead'; reason: string }> {
  const client = new PlayerClient(options);
  let captain = new Captain(options.team, options.mode ?? 'patrol', false, options.torpedoes ?? true);
  let rounds = 0, deaths = 0, reason = 'Configured round limit reached.';
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
        // STATUS comes last so the ship observation is fresh after reports.
        const observation = await observe(client, options.team);
        if (options.sharedIntel) {
          options.sharedIntel.publish(options.team, observation.targets ?? []);
          observation.intel = options.sharedIntel.snapshot(options.team, Date.now());
        }
        if (previousObjects && pendingObjective) {
          const confirmation = objectiveConfirmation(previousObjects, observation.objects ?? [], options.team, pendingObjective);
          if (confirmation) options.record(confirmation);
          pendingObjective = undefined;
        }
        previousObjects = observation.objects;
        const decision = captain.choose(observation);
        // Raw terminal frames already preserve the full scan without a second
        // copy of hundreds of parsed cells in long-running decision logs.
        const { scan, ...reports } = observation;
        options.record({ event: 'decision', round: rounds + 1, ...reports, scanObservedAt: scan.observedAt, ...decision });
        if (decision.kind !== 'act') { reason = decision.reason; outcome = decision.kind; break; }
        const response = await client.command(decision.command);
        options.record({ event: 'action-result', command: decision.command, response });
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
        captain = new Captain(options.team, options.mode ?? 'patrol', false, options.torpedoes ?? true);
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
        options.record({ event: 'final-points-unavailable', error: error instanceof Error ? error.message : String(error) });
      }
    }
    await client.quit();
    const result = { rounds, deaths, outcome, reason };
    options.record({ event: 'completed', ...result });
    return result;
  } catch (error) {
    options.record({ event: 'failed', error: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally { client.close(); }
}
