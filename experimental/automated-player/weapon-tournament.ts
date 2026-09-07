// Compare captain-v8 direct torpedoes against the identical phaser-only policy.
// Fresh worlds are independent, and weapon assignments alternate by faction.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildMatchReport, summarizeTournament, type FleetSummary, type Strategy, type TournamentAssignment } from './tournament-report.ts';

const { values } = parseArgs({ options: {
  matches: { type: 'string', default: '4' }, seconds: { type: 'string', default: '90' }, ships: { type: 'string', default: '10' },
  strategy: { type: 'string', default: 'objective' }, seed: { type: 'string', default: '1729' }, 'log-dir': { type: 'string' }, help: { type: 'boolean' },
} });
if (values.help) {
  console.log('Usage: node experimental/automated-player/weapon-tournament.ts [--matches 4] [--seconds 90] [--ships 10] [--strategy objective|patrol|balanced] [--seed 1729] [--log-dir path]\nAlternates captain-v8 torpedoes and phaser-only controls across factions in fresh Austin TOURNAMENT games. Adjacent faction swaps share a seed.');
  process.exit(0);
}
const integer = (value: string, min: number, max: number, label: string) => {
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw new Error(`Invalid ${label}: ${value}`); return Number(value);
};
const strategy = values.strategy as Strategy;
if (!['objective', 'patrol', 'balanced'].includes(strategy)) throw new Error(`Invalid strategy: ${strategy}`);
const matches = integer(values.matches, 2, 20, 'match count'), seconds = integer(values.seconds, 30, 3600, 'duration');
const ships = integer(values.ships, 4, 10, 'ship count'); if (ships % 2) throw new Error('Ship count must be even');
const baseSeed = integer(values.seed, 0, Number.MAX_SAFE_INTEGER - Math.ceil(matches / 2), 'base seed');
const candidate = 'captain-v8-torpedoes', baseline = 'captain-v8-phasers';
const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = resolve(values['log-dir'] ?? join(root, 'logs', `automated-player-weapon-tournament-${Date.now()}`));
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'configuration.json'), JSON.stringify({ schemaVersion: 1, variant: 'austin', profile: 'playable', gameMode: 'tournament', candidate, baseline, strategy, matches, seconds, ships, baseSeed, seedPairing: 'adjacent faction swaps', startedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });
const reports: ReturnType<typeof buildMatchReport>[] = []; let active: ReturnType<typeof spawn> | undefined;
const stop = () => { if (active && active.exitCode === null && active.signalCode === null) active.kill('SIGTERM'); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
try {
  for (let index = 0; index < matches; index++) {
    const torpedoTeam = index % 2 === 0 ? 'FEDERATION' : 'EMPIRE';
    const assignment: TournamentAssignment = torpedoTeam === 'FEDERATION'
      ? { FEDERATION: candidate, EMPIRE: baseline } : { FEDERATION: baseline, EMPIRE: candidate };
    const weapons = torpedoTeam === 'FEDERATION' ? ['torpedoes', 'phasers'] : ['phasers', 'torpedoes'];
    const tournamentSeed = baseSeed + Math.floor(index / 2);
    const matchDirectory = join(directory, `match-${String(index + 1).padStart(2, '0')}`);
    console.log(`Match ${index + 1}/${matches}: Federation ${weapons[0]}, Empire ${weapons[1]}, tournament seed ${tournamentSeed}`);
    active = spawn(process.execPath, ['experimental/automated-player/fresh-fleet.ts', '--seconds', String(seconds), '--ships', String(ships),
      '--federation-strategy', strategy, '--empire-strategy', strategy, '--federation-weapons', weapons[0], '--empire-weapons', weapons[1], '--tournament-seed', String(tournamentSeed), '--log-dir', matchDirectory],
      { cwd: root, stdio: 'inherit' });
    const [code] = await once(active, 'exit') as [number | null, NodeJS.Signals | null];
    let summary: FleetSummary;
    try { summary = JSON.parse(readFileSync(join(matchDirectory, 'fleet', 'summary.json'), 'utf8')) as FleetSummary; }
    catch (error) { process.exitCode = 1; writeFileSync(join(directory, 'summary.json'), JSON.stringify({ candidate, baseline, matches: reports, incompleteMatch: index + 1, error: String(error) }, null, 2) + '\n'); break; }
    const report = buildMatchReport(index + 1, matchDirectory, assignment, summary, code); reports.push(report);
    if (report.status === 'execution-error') process.exitCode = 1;
    writeFileSync(join(directory, 'summary.json'), JSON.stringify({ ...summarizeTournament(reports, candidate, baseline), configuredMatches: matches, seconds, ships, strategy, gameMode: 'tournament', baseSeed, updatedAt: new Date().toISOString() }, null, 2) + '\n');
  }
} finally { stop(); process.off('SIGINT', stop); process.off('SIGTERM', stop); }
console.log(`Weapon tournament report: ${join(directory, 'summary.json')}`);
