// Rebuilds an aggregate solely from preserved match summaries. This is useful
// after report-format changes and does not rerun or inspect a live game.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildMatchReport, summarizeTournament, type FleetSummary, type Strategy, type TournamentAssignment } from './tournament-report.ts';

const { values } = parseArgs({ options: { 'log-dir': { type: 'string' }, help: { type: 'boolean' } } });
if (values.help || !values['log-dir']) {
  console.log('Usage: node experimental/automated-player/rebuild-tournament.ts --log-dir logs/automated-player-tournament-...');
  process.exit(values.help ? 0 : 1);
}
const directory = resolve(values['log-dir']);
const configuration = JSON.parse(readFileSync(join(directory, 'configuration.json'), 'utf8')) as {
  candidate: Strategy; baseline: Strategy; matches: number; seconds: number; ships: number;
};
const matchDirectories = readdirSync(directory).filter(name => /^match-\d+$/.test(name)).sort();
const reports = matchDirectories.map((name, index) => {
  const matchDirectory = join(directory, name);
  const summary = JSON.parse(readFileSync(join(matchDirectory, 'fleet', 'summary.json'), 'utf8')) as FleetSummary;
  const launcher = JSON.parse(readFileSync(join(matchDirectory, 'launcher-result.json'), 'utf8')) as { fleetExitCode: number | null };
  const assignment: TournamentAssignment = index % 2 === 0
    ? { FEDERATION: configuration.candidate, EMPIRE: configuration.baseline }
    : { FEDERATION: configuration.baseline, EMPIRE: configuration.candidate };
  return buildMatchReport(index + 1, matchDirectory, assignment, summary, launcher.fleetExitCode);
});
const report = { ...summarizeTournament(reports, configuration.candidate, configuration.baseline), configuredMatches: configuration.matches,
  seconds: configuration.seconds, ships: configuration.ships, rebuiltAt: new Date().toISOString() };
writeFileSync(join(directory, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Rebuilt tournament report: ${join(directory, 'summary.json')}`);
