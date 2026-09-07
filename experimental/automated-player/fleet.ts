import { appendFileSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { supervise } from './supervisor.ts';
import { FleetIntel } from './player.ts';
import type { Team } from './client.ts';
import type { TeamPoints } from './observations.ts';

type Strategy = 'objective' | 'patrol' | 'balanced';

const { values } = parseArgs({ options: {
  host: { type: 'string', default: '127.0.0.1' }, port: { type: 'string', default: '2423' },
  seconds: { type: 'string', default: '3600' }, 'log-dir': { type: 'string' },
  rounds: { type: 'string', default: '10000' }, lives: { type: 'string', default: '10' },
  retries: { type: 'string', default: '20' }, help: { type: 'boolean' },
  ships: { type: 'string', default: '4' },
  'federation-strategy': { type: 'string', default: 'objective' },
  'empire-strategy': { type: 'string', default: 'objective' },
  'federation-weapons': { type: 'string', default: 'torpedoes' },
  'empire-weapons': { type: 'string', default: 'torpedoes' },
  'tournament-seed': { type: 'string' },
  'torpedo-corridor': { type: 'boolean', default: false },
} });
if (values.help) {
  console.log('Usage: node experimental/automated-player/fleet.ts [--port 2423] [--ships 4|6|8|10] [--seconds 3600] [--federation-strategy objective|patrol|balanced] [--empire-strategy objective|patrol|balanced] [--federation-weapons torpedoes|phasers] [--empire-weapons torpedoes|phasers] [--tournament-seed N] [--torpedo-corridor] [--rounds 10000] [--lives 10] [--retries 20] [--log-dir path]\nConnects equal teams to an existing Austin host. The seed selects source TOURNAMENT mode only for a new galaxy. Stops at duration, Ctrl-C, or budgets. Writes health.json, events.jsonl and summary.json.');
  process.exit(0);
}
function integer(value: string, min: number, max: number) {
  const n = Number(value); if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n < min || n > max) throw new Error(`Invalid numeric option: ${value}`); return n;
}
const port = integer(values.port, 1, 65535), seconds = integer(values.seconds, 1, 86400);
const rounds = integer(values.rounds, 1, 1000000), lives = integer(values.lives, 1, 1000), retries = integer(values.retries, 0, 100);
const tournamentSeed = values['tournament-seed'] === undefined ? undefined : integer(values['tournament-seed'], 0, Number.MAX_SAFE_INTEGER);
const ships = integer(values.ships, 4, 10); if (ships % 2) throw new Error('Fleet ship count must be even');
const strategy = (value: string): Strategy => {
  if (value !== 'objective' && value !== 'patrol' && value !== 'balanced') throw new Error(`Invalid strategy: ${value}`);
  return value;
};
const strategies = { FEDERATION: strategy(values['federation-strategy']), EMPIRE: strategy(values['empire-strategy']) };
const weapon = (value: string) => { if (value !== 'torpedoes' && value !== 'phasers') throw new Error(`Invalid weapon policy: ${value}`); return value; };
const weapons = { FEDERATION: weapon(values['federation-weapons']), EMPIRE: weapon(values['empire-weapons']) };
const directory = resolve(values['log-dir'] ?? `logs/automated-player-fleet-${Date.now()}`);
// Exclusive manifest prevents two runs writing into the same log directory.
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'configuration.json'), JSON.stringify({ ...values, strategies, weapons, policy: 'captain-v8', startedAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
const controller = new AbortController(), started = Date.now();
const sharedIntel = new FleetIntel();
const stop = () => controller.abort();
process.on('SIGINT', stop); process.on('SIGTERM', stop);
const end = setTimeout(stop, seconds * 1000);
const fullRoster: { name: string; team: Team; ship: string; mode: 'patrol' | 'objective' }[] = [
  { name: 'Scout', team: 'FEDERATION', ship: 'NIMITZ', mode: 'objective' },
  { name: 'Raven', team: 'EMPIRE', ship: 'WOLF', mode: 'objective' },
  { name: 'Wing', team: 'FEDERATION', ship: 'EXCALIBUR', mode: 'patrol' },
  { name: 'Shade', team: 'EMPIRE', ship: 'DEMON', mode: 'patrol' },
  { name: 'Lancer', team: 'FEDERATION', ship: 'FARRAGUT', mode: 'patrol' },
  { name: 'Fang', team: 'EMPIRE', ship: 'COBRA', mode: 'patrol' },
  { name: 'Ranger', team: 'FEDERATION', ship: 'INTREPID', mode: 'patrol' },
  { name: 'Wraith', team: 'EMPIRE', ship: 'GOBLIN', mode: 'patrol' },
  { name: 'Archer', team: 'FEDERATION', ship: 'LEXINGTON', mode: 'patrol' },
  { name: 'Talon', team: 'EMPIRE', ship: 'HAWK', mode: 'patrol' },
];
const roster = fullRoster.slice(0, ships).map(bot => {
  const selected = strategies[bot.team];
  const objective = bot.name === 'Scout' || bot.name === 'Raven';
  const defender = bot.name === 'Wing' || bot.name === 'Shade';
  const mode = selected !== 'patrol' && objective ? 'objective' as const : selected === 'balanced' && defender ? 'defense' as const : 'patrol' as const;
  return { ...bot, mode };
});
const stats = Object.fromEntries(roster.map(bot => [bot.name, {
  ...bot, state: 'starting', decisions: 0, moves: 0, shots: 0, docks: 0, repairs: 0, deaths: 0,
  retrySchedules: 0, retryAttempts: 0, reconnects: 0, graces: 0, lastProgress: started, stalls: 0, stalled: false, error: '',
  shipShots: 0, baseShots: 0, planetShots: 0, torpedoAttempts: 0, torpedoHits: 0,
  torpedoMisses: 0, torpedoDeflections: 0, torpedoMisfires: 0, torpedoNovas: 0,
  torpedoUnknown: 0, torpedoesRemaining: 10, captureAttempts: 0, buildAttempts: 0,
  capturesConfirmed: 0, buildsConfirmed: 0, basesCreated: 0, scans: 0, lists: 0, targets: 0,
  finalPoints: null as TeamPoints | null,
}]));
const record = (event: Record<string, unknown>) => appendFileSync(join(directory, 'events.jsonl'), JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n');
let lastTick = Date.now(), schedulingPauses = 0, missedMs = 0;
function snapshot() {
  const now = Date.now(), lagMs = now - lastTick - 5000; lastTick = now;
  if (lagMs > 2000) { schedulingPauses++; missedMs += lagMs; record({ event: 'scheduling-pause', lagMs }); }
  for (const s of Object.values(stats)) {
    const stalled = s.state === 'playing' && now - s.lastProgress > 30000;
    if (stalled && !s.stalled) { s.stalls++; record({ event: 'stalled', bot: s.name, since: s.lastProgress }); }
    if (!stalled && s.stalled && s.state === 'playing') record({ event: 'progress-resumed', bot: s.name });
    s.stalled = stalled;
  }
  const state = { schemaVersion: 2, checkedAt: new Date().toISOString(), elapsedMs: now - started, plannedSeconds: seconds, schedulingPauses, missedMs, bots: stats };
  writeFileSync(join(directory, 'health.tmp'), JSON.stringify(state, null, 2) + '\n'); renameSync(join(directory, 'health.tmp'), join(directory, 'health.json'));
  return state;
}
const monitor = setInterval(snapshot, 5000);
const tasks: Promise<unknown>[] = [];
console.log(`Fleet for ${seconds}s on ${values.host}:${port}; reports: ${directory}`);
try {
  for (const bot of roster) {
    if (controller.signal.aborted) break;
    // Only the first joined captain initializes a new galaxy. Release the
    // gate on terminal failure too, so a missing host cannot hang startup.
    let ready!: () => void;
    const joined = new Promise<void>(resolve => { ready = resolve; });
    const s = stats[bot.name];
    tasks.push(supervise({ ...bot, torpedoCorridor: values['torpedo-corridor'], torpedoes: weapons[bot.team] === 'torpedoes', tournamentSeed, sharedIntel, host: values.host, port, rounds, lives, retries, intervalMs: 500, signal: controller.signal,
      record(event) {
        appendFileSync(join(directory, `${bot.name}.jsonl`), JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n');
        if (event.event === 'joined' || event.event === 'rejoined') { s.state = 'playing'; s.lastProgress = Date.now(); ready(); }
        if (event.event === 'deadline-grace') s.graces++;
        if (event.event === 'sent' && event.line === 'LIST') s.lists++;
        if (event.event === 'sent' && event.line === 'SCAN 10 WARNING') s.scans++;
        if (event.event === 'sent' && event.line === 'TARGETS') s.targets = (s.targets ?? 0) + 1;
        if (event.event === 'reconnecting') { s.retrySchedules++; s.state = 'reconnecting'; record({ ...event, bot: bot.name }); }
        if (event.event === 'retry-started') s.retryAttempts++;
        if (event.event === 'reconnected') { s.reconnects++; record({ ...event, bot: bot.name }); }
        if (event.event === 'death') s.deaths++;
        if (event.event === 'decision') {
          s.decisions++; const command = String(event.command ?? '');
          if (/^(MOVE|IMPULSE) /.test(command)) s.moves++;
          if (command.startsWith('PHASERS ')) s.shots++;
          if (command.startsWith('TORPEDOES ')) { s.shots++; s.torpedoAttempts++; }
          const status = event.status as { torpedoes?: number } | undefined;
          if (status?.torpedoes !== undefined) s.torpedoesRemaining = status.torpedoes;
          if (event.targetKind === 'ship') s.shipShots++;
          if (event.targetKind === 'base') s.baseShots++;
          if (event.targetKind === 'planet') s.planetShots++;
          if (event.objectiveAction === 'capture') s.captureAttempts++;
          if (event.objectiveAction === 'build') s.buildAttempts++;
          if (command === 'DOCK') s.docks++;
          if (command.startsWith('REPAIR')) s.repairs++;
        }
        if (event.event === 'planet-captured') s.capturesConfirmed++;
        if (event.event === 'planet-built') s.buildsConfirmed++;
        if (event.event === 'base-created') s.basesCreated++;
        if (event.event === 'torpedo-result') {
          const outcome = String(event.outcome);
          if (outcome === 'hit') s.torpedoHits++;
          else if (outcome === 'deflected') s.torpedoDeflections++;
          else if (outcome === 'miss' || outcome === 'black-hole' || outcome === 'friendly-neutralized' || outcome === 'star-unaffected') s.torpedoMisses++;
          else if (outcome === 'misfire') s.torpedoMisfires++;
          else if (outcome === 'nova') s.torpedoNovas++;
          else s.torpedoUnknown++;
        }
        if (event.event === 'final-points') s.finalPoints = event.points as TeamPoints;
        if (event.event === 'action-result') s.lastProgress = Date.now();
      },
    }).then(result => { s.state = result.outcome; record({ event: 'bot-finished', bot: bot.name, result }); })
      .catch(error => { s.state = 'failed'; s.error = String(error); process.exitCode = 1; record({ event: 'bot-failed', bot: bot.name, error: String(error) }); })
      .finally(ready));
    await joined;
    if (!controller.signal.aborted) await delay(200);
  }
  await Promise.all(tasks);
} finally {
  clearTimeout(end); clearInterval(monitor); controller.abort();
  const summary = { ...snapshot(), finishedAt: new Date().toISOString(), durationReached: Date.now() - started >= seconds * 1000, strategies, weapons };
  writeFileSync(join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  record({ event: 'fleet-finished', summary });
  process.off('SIGINT', stop); process.off('SIGTERM', stop);
  console.log(`Fleet finished. ${join(directory, 'summary.json')}`);
}
