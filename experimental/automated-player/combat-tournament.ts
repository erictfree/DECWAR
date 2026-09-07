// Runs independent Austin matches and swaps named strategies across factions.
// Every participant remains an external Telnet client.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildMatchReport, summarizeTournament, type FleetSummary, type Strategy, type TournamentAssignment } from './tournament-report.ts';

const { values } = parseArgs({ options: {
  matches: { type: 'string', default: '2' }, seconds: { type: 'string', default: '90' },
  ships: { type: 'string', default: '8' }, candidate: { type: 'string', default: 'objective' },
  baseline: { type: 'string', default: 'patrol' }, seed: { type: 'string', default: '1729' }, 'log-dir': { type: 'string' }, help: { type: 'boolean' },
} });
if (values.help) {
  console.log('Usage: node experimental/automated-player/combat-tournament.ts [--matches 2] [--seconds 90] [--ships 8] [--candidate objective] [--baseline patrol] [--seed 1729] [--log-dir path]\nRuns fresh isolated TOURNAMENT matches and alternates which faction receives each strategy. Adjacent swaps share a seed.');
  process.exit(0);
}
const integer = (value: string, min: number, max: number, label: string) => {
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw new Error(`Invalid ${label}: ${value}`);
  return Number(value);
};
const strategy = (value: string): Strategy => {
  if (value !== 'objective' && value !== 'patrol' && value !== 'balanced') throw new Error(`Invalid strategy: ${value}`);
  return value;
};
const matches = integer(values.matches, 1, 20, 'match count');
const seconds = integer(values.seconds, 30, 3600, 'duration');
const ships = integer(values.ships, 4, 10, 'ship count');
if (ships % 2) throw new Error('Ship count must be even');
const baseSeed = integer(values.seed, 0, Number.MAX_SAFE_INTEGER - Math.ceil(matches / 2), 'base seed');
const candidate = strategy(values.candidate), baseline = strategy(values.baseline);
if (candidate === baseline) throw new Error('Candidate and baseline strategies must differ');
const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = resolve(values['log-dir'] ?? join(root, 'logs', `automated-player-tournament-${Date.now()}`));
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'configuration.json'), JSON.stringify({ schemaVersion: 1, variant: 'austin', profile: 'playable', gameMode: 'tournament', captain: 'captain-v8', candidate, baseline, matches, seconds, ships, baseSeed, seedPairing: 'adjacent faction swaps', startedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });

const reports: ReturnType<typeof buildMatchReport>[] = [];
let active: ReturnType<typeof spawn> | undefined;
const stop = () => { if (active && active.exitCode === null && active.signalCode === null) active.kill('SIGTERM'); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
try {
  for (let index = 0; index < matches; index++) {
    const assignment: TournamentAssignment = index % 2 === 0
      ? { FEDERATION: candidate, EMPIRE: baseline }
      : { FEDERATION: baseline, EMPIRE: candidate };
    const matchDirectory = join(directory, `match-${String(index + 1).padStart(2, '0')}`);
    const tournamentSeed = baseSeed + Math.floor(index / 2);
    console.log(`Match ${index + 1}/${matches}: Federation ${assignment.FEDERATION}, Empire ${assignment.EMPIRE}, tournament seed ${tournamentSeed}`);
    active = spawn(process.execPath, ['experimental/automated-player/fresh-fleet.ts', '--seconds', String(seconds), '--ships', String(ships), '--federation-strategy', assignment.FEDERATION, '--empire-strategy', assignment.EMPIRE, '--tournament-seed', String(tournamentSeed), '--log-dir', matchDirectory], { cwd: root, stdio: 'inherit' });
    const [code] = await once(active, 'exit') as [number | null, NodeJS.Signals | null];
    let summary: FleetSummary;
    try { summary = JSON.parse(readFileSync(join(matchDirectory, 'fleet', 'summary.json'), 'utf8')) as FleetSummary; }
    catch (error) {
      process.exitCode = 1;
      writeFileSync(join(directory, 'summary.json'), JSON.stringify({ schemaVersion: 1, candidate, baseline, matchCount: reports.length, executionErrors: 1, matches: reports, incompleteMatch: index + 1, error: String(error) }, null, 2) + '\n');
      break;
    }
    const report = buildMatchReport(index + 1, matchDirectory, assignment, summary, code);
    reports.push(report);
    if (report.status === 'execution-error') process.exitCode = 1;
    writeFileSync(join(directory, 'summary.json'), JSON.stringify({ ...summarizeTournament(reports, candidate, baseline), configuredMatches: matches, seconds, ships, gameMode: 'tournament', baseSeed, updatedAt: new Date().toISOString() }, null, 2) + '\n');
  }
} finally {
  stop(); process.off('SIGINT', stop); process.off('SIGTERM', stop);
}
console.log(`Tournament report: ${join(directory, 'summary.json')}`);
