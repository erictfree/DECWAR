import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTeamPoints } from '../observations.ts';
import { buildMatchReport, summarizeTournament, type FleetSummary } from '../tournament-report.ts';

test('POINTS parser reads exactly the two selected team totals', () => {
  const report = '\r\n                         Federation       Empire   \r\nDamage to bases              10.0         20.0\r\n\r\nTotal points:                110.0        220.0\r\n\r\nCommand: ';
  assert.deepEqual(parseTeamPoints(report, 123), { observedAt: 123, federation: 110, empire: 220, categories: { 'Damage to bases': { federation: 10, empire: 20 } } });
  assert.throws(() => parseTeamPoints(report + report), /Expected one/);
  assert.throws(() => parseTeamPoints(report.replace('220.0', 'unknown')), /Expected one/);
});

const bot = (team: 'FEDERATION' | 'EMPIRE', federation: number, empire: number) => ({
  team, state: 'interrupted', deaths: 0, shipShots: 2, baseShots: 3, planetShots: 0,
  capturesConfirmed: team === 'FEDERATION' ? 1 : 0, buildsConfirmed: 4, basesCreated: 0,
  finalPoints: { observedAt: team === 'FEDERATION' ? 10 : 11, federation, empire, categories: { 'Damage to bases': { federation, empire } } },
});

test('Tournament reports swapped strategy leads without calling time limits victories', () => {
  const first: FleetSummary = { durationReached: true, elapsedMs: 90000, bots: { Scout: bot('FEDERATION', 600, 300), Raven: bot('EMPIRE', 600, 300) } };
  const second: FleetSummary = { durationReached: true, elapsedMs: 90000, bots: { Scout: bot('FEDERATION', 400, 700), Raven: bot('EMPIRE', 400, 700) } };
  const a = buildMatchReport(1, 'a', { FEDERATION: 'objective', EMPIRE: 'patrol' }, first, 0);
  const b = buildMatchReport(2, 'b', { FEDERATION: 'patrol', EMPIRE: 'objective' }, second, 0);
  assert.equal(a.status, 'time-limit'); assert.equal(a.leaderStrategy, 'objective');
  assert.equal(b.leaderStrategy, 'objective');
  const report = summarizeTournament([a, b], 'objective', 'patrol');
  assert.equal(report.policies.objective.leadsAtLimit, 2);
  assert.equal(report.policies.patrol.leadsAtLimit, 0);
  assert.deepEqual(report.policies.objective.leadRate95Interval, [0.342, 1]);
  assert.deepEqual(report.factionLeadsAtLimit, { FEDERATION: 1, EMPIRE: 1, tiesOrUnavailable: 0 });
  assert.match(report.interpretation, /not completed-game victories/);
});

test('Missing point evidence remains unavailable and a failed bot marks execution error', () => {
  const summary: FleetSummary = { durationReached: true, elapsedMs: 90, bots: { Scout: { ...bot('FEDERATION', 0, 0), state: 'failed', finalPoints: null }, Raven: { ...bot('EMPIRE', 0, 0), finalPoints: null } } };
  const report = buildMatchReport(1, 'bad', { FEDERATION: 'objective', EMPIRE: 'patrol' }, summary, 1);
  assert.equal(report.status, 'execution-error'); assert.equal(report.leaderTeam, null);
  assert.equal(report.points.FEDERATION.points, null);
});
