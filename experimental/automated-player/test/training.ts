// Controlled tactical evaluation. Privileged staging is confined to test/;
// both captains choose targets and commands from ordinary Telnet observations.
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { Captain } from '../captain.ts';
import { Captain as Baseline } from './captain-v2.ts';
import { ReentryRequired, type Team } from '../client.ts';
import { observe } from '../player.ts';
import { distance, parseStatus, type ShipStatus } from '../observations.ts';
import { scenario } from './scenario-fixture.ts';

const { values } = parseArgs({ options: {
  policy: { type: 'string', default: 'both' }, set: { type: 'string', default: 'development' },
  rounds: { type: 'string', default: '12' }, repeats: { type: 'string', default: '1' },
} });
if (!['baseline', 'candidate', 'both'].includes(values.policy) || !['development', 'held-out'].includes(values.set)) throw new Error('Use --policy baseline|candidate|both --set development|held-out');
const rounds = Number(values.rounds), repeats = Number(values.repeats);
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100 || !Number.isInteger(repeats) || repeats < 1 || repeats > 20) throw new Error('Invalid rounds (1..100) or repeats (1..20)');
const directory = `logs/automated-player-training-${Date.now()}`;
mkdirSync(directory, { recursive: true });
const cases = values.set === 'development'
  ? [{ name: 'distant-target', range: 10, energy: 5000, sentry: false, team: 'FEDERATION' as Team },
     { name: 'reserve-under-fire', range: 3, energy: 2600, sentry: true, team: 'FEDERATION' as Team }]
  : [{ name: 'distant-target-swapped', range: 8, energy: 5000, sentry: false, team: 'EMPIRE' as Team },
     { name: 'reserve-under-fire-swapped', range: 4, energy: 2700, sentry: true, team: 'EMPIRE' as Team }];
const results: Record<string, unknown>[] = [];
for (let repeat = 0; repeat < repeats; repeat++) for (const encounter of cases) {
  // Alternate order on repeats to reduce systematic wall-clock ordering bias.
  const policies = values.policy === 'both' ? (repeat % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate']) : [values.policy];
  for (const policy of policies) {
    const cleanups: (() => unknown)[] = [];
    let transcript = '';
    try {
      const fixture = await scenario({ after(fn) { cleanups.push(fn); }, diagnostic(path) { transcript = path; } }, true);
      const { f, K, place, record } = fixture;
      const own = encounter.team === 'FEDERATION' ? fixture.client : fixture.opponent!;
      const other = encounter.team === 'FEDERATION' ? fixture.opponent! : fixture.client;
      const ownId = encounter.team === 'FEDERATION' ? 9 : 18, otherId = ownId === 9 ? 18 : 9;
      const otherTeam = encounter.team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
      // Relocate the two test bases behind their corresponding captains.
      f.views.high.board.setdsp(20, 26, 0); f.views.high.board.setdsp(70, 70, 0);
      for (const side of [1, 2]) {
        const h = side === (ownId === 9 ? 1 : 2) ? (encounter.sentry ? 26 : 14) : (encounter.sentry ? 5 : 50);
        f.high.write('base', 40n, 1, 1, side); f.high.write('base', BigInt(h), 1, 2, side);
        f.views.high.board.setdsp(40, h, (side + 2) * 100 + 1);
      }
      place(ownId, { v: 40, h: 20 }); place(otherId, { v: 40, h: 20 + (encounter.sentry ? -1 : 1) * encounter.range });
      f.high.write('shpcon', BigInt(encounter.energy * 10), ownId, K.KSNRGY);
      const captain = policy === 'baseline' ? new Baseline(encounter.team) : new Captain(encounter.team);
      const start = parseStatus(await own.command('STATUS'));
      const targetStart = parseStatus(await other.command('STATUS'));
      let final: ShipStatus = start, targetFinal: ShipStatus = targetStart;
      let shots = 0, moves = 0, docks = 0, waits = 0, shotsReceived = 0, shotEnergy = 0, lastSentryFire = -Infinity;
      let outcome = 'round-limit', completedRounds = 0;
      const fireRanges: number[] = [];
      const started = Date.now();
      record({ event: 'training-configuration', policy, encounter, rounds, repeat, opponent: encounter.sentry ? 'stationary-phaser-180-v1' : 'passive-target-v1' });
      try {
        for (let round = 0; round < rounds; round++) {
          const o = await observe(own, encounter.team), decision = captain.choose(o);
          record({ event: 'training-decision', round, observation: o, decision });
          if (decision.kind !== 'act') { outcome = decision.kind; break; }
          if (decision.command.startsWith('PHASERS')) { shots++; shotEnergy += 180 + (o.status.shieldsUp ? 200 : 0); fireRanges.push(distance(o.status.position, targetFinal.position)); }
          if (/^(MOVE|IMPULSE) /.test(decision.command)) moves++;
          if (decision.command === 'DOCK') docks++;
          if (decision.command === 'STATUS') waits++;
          await own.command(decision.command);
          if (encounter.sentry) {
            const enemy = await observe(other, otherTeam);
            const target = enemy.scan.cells.find(c => c.symbol === (ownId === 9 ? ' Y' : ' W'));
            if (target && enemy.status.energy >= 2800 && enemy.devices.phasers < 300 && Date.now() - lastSentryFire >= 3000 + enemy.devices.phasers * 10) {
              await other.command(`PHASERS ABSOLUTE 180 ${target.v} ${target.h}`); lastSentryFire = Date.now(); shotsReceived++;
            }
          }
          final = parseStatus(await own.command('STATUS')); targetFinal = parseStatus(await other.command('STATUS'));
          completedRounds++;
          if (encounter.sentry && docks > 0 && final.energy >= 4900 && final.shieldPercent >= 95 && final.hullDamage === 0) { outcome = 'resupplied'; break; }
          await delay(500);
        }
      } catch (error) {
        if (!(error instanceof ReentryRequired)) throw error;
        outcome = 'death-or-opponent-death';
      }
      const result = { encounter: encounter.name, team: encounter.team, policy, repeat, outcome, completedRounds,
        elapsedMs: Date.now() - started, shots, moves, docks, waits, shotsReceived, shotEnergy, fireRanges,
        targetShieldLoss: targetStart.shieldPercent - targetFinal.shieldPercent,
        targetHullIncrease: targetFinal.hullDamage - targetStart.hullDamage,
        finalEnergy: final.energy, finalShields: final.shieldPercent, finalHull: final.hullDamage,
        finalRange: distance(final.position, targetFinal.position), finalPosition: final.position, transcript };
      results.push(result); record({ event: 'training-result', ...result });
      console.log(JSON.stringify(result));
    } catch (error) {
      const result = { encounter: encounter.name, policy, repeat, outcome: 'error', error: String(error), transcript };
      results.push(result); console.error(JSON.stringify(result)); process.exitCode = 1;
    } finally {
      for (const cleanup of cleanups.reverse()) await cleanup();
      writeFileSync(`${directory}/summary.json`, JSON.stringify({ set: values.set, rounds, repeats, results }, null, 2) + '\n');
    }
  }
}
console.log(`Results: ${directory}/summary.json`);
