import type { Team } from './client.ts';
import type { TeamPoints } from './observations.ts';

export type Strategy = 'objective' | 'patrol' | 'balanced';
export type TournamentAssignment = Record<Team, string>;

type BotSummary = {
  team: Team;
  state: string;
  deaths: number;
  shipShots: number;
  baseShots: number;
  planetShots: number;
  torpedoAttempts?: number;
  torpedoHits?: number;
  torpedoMisses?: number;
  torpedoDeflections?: number;
  torpedoMisfires?: number;
  torpedoNovas?: number;
  capturesConfirmed: number;
  buildsConfirmed: number;
  basesCreated: number;
  finalPoints: TeamPoints | null;
};

export type FleetSummary = {
  durationReached: boolean;
  elapsedMs: number;
  bots: Record<string, BotSummary>;
};

const teamPoints = (bots: BotSummary[]): { points: number | null; samples: number[]; observedAt: number | null; categories: TeamPoints['categories'] } => {
  const reports = bots.flatMap(bot => bot.finalPoints ? [bot.finalPoints] : []).sort((a, b) => b.observedAt - a.observedAt);
  if (!reports.length) return { points: null, samples: [], observedAt: null, categories: {} };
  const team = bots[0]?.team;
  return { points: team === 'FEDERATION' ? reports[0].federation : reports[0].empire,
    samples: reports.map(report => team === 'FEDERATION' ? report.federation : report.empire), observedAt: reports[0].observedAt,
    categories: reports[0].categories ?? {} };
};

const support = (bots: BotSummary[]) => ({
  deaths: bots.reduce((sum, bot) => sum + bot.deaths, 0),
  shipShots: bots.reduce((sum, bot) => sum + bot.shipShots, 0),
  baseShots: bots.reduce((sum, bot) => sum + bot.baseShots, 0),
  planetShots: bots.reduce((sum, bot) => sum + bot.planetShots, 0),
  torpedoAttempts: bots.reduce((sum, bot) => sum + (bot.torpedoAttempts ?? 0), 0),
  torpedoHits: bots.reduce((sum, bot) => sum + (bot.torpedoHits ?? 0), 0),
  torpedoMisses: bots.reduce((sum, bot) => sum + (bot.torpedoMisses ?? 0), 0),
  torpedoDeflections: bots.reduce((sum, bot) => sum + (bot.torpedoDeflections ?? 0), 0),
  torpedoMisfires: bots.reduce((sum, bot) => sum + (bot.torpedoMisfires ?? 0), 0),
  torpedoNovas: bots.reduce((sum, bot) => sum + (bot.torpedoNovas ?? 0), 0),
  capturesConfirmed: bots.reduce((sum, bot) => sum + bot.capturesConfirmed, 0),
  buildsConfirmed: bots.reduce((sum, bot) => sum + bot.buildsConfirmed, 0),
  basesCreated: bots.reduce((sum, bot) => sum + bot.basesCreated, 0),
});

export function buildMatchReport(id: number, directory: string, assignment: TournamentAssignment, summary: FleetSummary, exitCode: number | null) {
  const bots = Object.values(summary.bots);
  const federationBots = bots.filter(bot => bot.team === 'FEDERATION');
  const empireBots = bots.filter(bot => bot.team === 'EMPIRE');
  const points = { FEDERATION: teamPoints(federationBots), EMPIRE: teamPoints(empireBots) };
  const failedBots = bots.filter(bot => bot.state === 'failed').length;
  const status = exitCode === 0 && summary.durationReached && failedBots === 0 ? 'time-limit' : 'execution-error';
  const leaderTeam = points.FEDERATION.points === null || points.EMPIRE.points === null || points.FEDERATION.points === points.EMPIRE.points
    ? null : points.FEDERATION.points > points.EMPIRE.points ? 'FEDERATION' as const : 'EMPIRE' as const;
  return {
    id, directory, status, exitCode, elapsedMs: summary.elapsedMs, assignment,
    points, leaderTeam, leaderStrategy: leaderTeam ? assignment[leaderTeam] : null,
    supporting: { FEDERATION: support(federationBots), EMPIRE: support(empireBots) },
    evidence: {
      pointSnapshot: 'Latest final POINTS FED EMPIRE report observed from a captain on each side after the stop signal.',
      pointSampleSkew: 'Concurrent shutdown can make captain snapshots differ slightly; all samples are retained.',
      failedBots,
    },
  };
}

export function summarizeTournament(matches: ReturnType<typeof buildMatchReport>[], candidate: string, baseline: string) {
  const addTenth = (a: number, b: number) => Math.round((a + b) * 10) / 10;
  const wilson95 = (successes: number, trials: number): [number, number] | null => {
    if (!trials) return null;
    const z = 1.959963984540054, p = successes / trials, denominator = 1 + z * z / trials;
    const center = (p + z * z / (2 * trials)) / denominator;
    const radius = z * Math.sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / denominator;
    return [Math.round(Math.max(0, center - radius) * 1000) / 1000, Math.round(Math.min(1, center + radius) * 1000) / 1000];
  };
  const policies = Object.fromEntries([candidate, baseline].map(strategy => [strategy, {
    matches: 0, leadsAtLimit: 0, ties: 0, pointSamples: 0, totalPoints: 0, totalOpponentPoints: 0, scoreCategories: {} as Record<string, number>,
    deaths: 0, shipShots: 0, baseShots: 0, planetShots: 0, torpedoAttempts: 0, torpedoHits: 0, torpedoMisses: 0,
    torpedoDeflections: 0, torpedoMisfires: 0, torpedoNovas: 0, capturesConfirmed: 0, buildsConfirmed: 0, basesCreated: 0,
  }]));
  for (const match of matches) {
    if (match.status !== 'time-limit') continue;
    for (const team of ['FEDERATION', 'EMPIRE'] as const) {
      const strategy = match.assignment[team], opponent = team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
      const row = policies[strategy]; row.matches++;
      const own = match.points[team].points, other = match.points[opponent].points;
      if (own !== null && other !== null) {
        row.pointSamples++; row.totalPoints = addTenth(row.totalPoints, own); row.totalOpponentPoints = addTenth(row.totalOpponentPoints, other);
        if (own > other) row.leadsAtLimit++; else if (own === other) row.ties++;
      }
      for (const [label, scores] of Object.entries(match.points[team].categories)) row.scoreCategories[label] = addTenth(row.scoreCategories[label] ?? 0, scores[team === 'FEDERATION' ? 'federation' : 'empire']);
      const supporting = match.supporting[team];
      row.deaths += supporting.deaths; row.shipShots += supporting.shipShots; row.baseShots += supporting.baseShots;
      row.planetShots += supporting.planetShots; row.capturesConfirmed += supporting.capturesConfirmed;
      row.torpedoAttempts += supporting.torpedoAttempts; row.torpedoHits += supporting.torpedoHits;
      row.torpedoMisses += supporting.torpedoMisses; row.torpedoDeflections += supporting.torpedoDeflections;
      row.torpedoMisfires += supporting.torpedoMisfires; row.torpedoNovas += supporting.torpedoNovas;
      row.buildsConfirmed += supporting.buildsConfirmed; row.basesCreated += supporting.basesCreated;
    }
  }
  const policySummary = Object.fromEntries(Object.entries(policies).map(([name, row]) => [name, {
    ...row,
    averagePoints: row.pointSamples ? Math.round(row.totalPoints / row.pointSamples * 10) / 10 : null,
    averagePointMargin: row.pointSamples ? Math.round((row.totalPoints - row.totalOpponentPoints) / row.pointSamples * 10) / 10 : null,
    leadRateAtLimit: row.pointSamples ? Math.round(row.leadsAtLimit / row.pointSamples * 1000) / 1000 : null,
    leadRate95Interval: wilson95(row.leadsAtLimit, row.pointSamples),
  }]));
  const factionLeadsAtLimit = {
    FEDERATION: matches.filter(match => match.status === 'time-limit' && match.leaderTeam === 'FEDERATION').length,
    EMPIRE: matches.filter(match => match.status === 'time-limit' && match.leaderTeam === 'EMPIRE').length,
    tiesOrUnavailable: matches.filter(match => match.status === 'time-limit' && match.leaderTeam === null).length,
  };
  return {
    schemaVersion: 1, candidate, baseline, matchCount: matches.length,
    completedTimeLimits: matches.filter(match => match.status === 'time-limit').length,
    executionErrors: matches.filter(match => match.status === 'execution-error').length,
    policies: policySummary, factionLeadsAtLimit, matches,
    interpretation: 'Leads are score leads at a fixed time limit, not completed-game victories. Each fresh world is an independent process. A shared configured seed aligns initial RNG state, but different actions and scheduling can consume draws in a different order; matches are not paired random event streams.',
  };
}
