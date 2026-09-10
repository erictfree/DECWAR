// Isolated production-runtime exercise, not original-executable parity.
// Stage only world geometry; commands, timing, random draws and ENDGAM are real.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { scenario } from './scenario-fixture.ts';
import { WarFinished } from '../war-result.ts';
import { parseStatus } from '../observations.ts';

const directory = process.argv[2], neutral = process.argv[3] === 'neutral';
if (!directory) throw new Error('Usage: verify-planet-ending.ts NEW_OUTPUT_DIRECTORY [neutral]');
mkdirSync(directory, { recursive: false });
const results: Record<string, unknown>[] = [];
for (const enemyBasePresent of [true, false]) {
  const cleanup: (() => unknown)[] = [], evidence: string[] = [];
  const f = await scenario({ after(fn) { cleanup.push(fn); }, diagnostic(text) { evidence.push(text); } });
  let shots = 0, ended: WarFinished | undefined;
  try {
    // Austin TORP1800 / DECWAR.FOR:4383–4398 and PLNRMV/ENDGAM.
    f.place(9, { v: 20, h: 25 });
    f.f.views.high.board.setdsp(75, 75, 0);
    f.f.high.write('locpln', 23n, 1, 1); f.f.high.write('locpln', 25n, 1, 2);
    f.f.high.write('locpln', 0n, 1, 3); f.f.high.write('locpln', 3n, 1, 4);
    f.f.high.write('numcap', neutral ? 0n : 1n, 2); f.f.views.high.board.setdsp(23, 25, neutral ? 601 : 801);
    if (!enemyBasePresent) {
      f.f.views.high.board.setdsp(70, 70, 0);
      f.f.high.write('nbase', 0n, 2); f.f.high.write('base', 0n, 1, 3, 2);
    }
    f.record({ event: 'planet-ending-fixture', enemyBasePresent, neutral, planet: { v: 23, h: 25, builds: 0 }, note: 'Test-only staged geometry; no timing or random overrides.' });
    await f.client.command('SHIELDS DOWN');
    await f.client.command('DOCK');
    const before = parseStatus(await f.client.command('STATUS'));
    assert.equal(before.docked, true);
    for (; shots < 60 && f.f.high.read('nplnet') > 0n;) {
      shots++;
      try {
        const response = await f.client.command('TORPEDOES ABSOLUTE 1 23 25');
        f.record({ event: 'planet-ending-shot', shots, response, remainingPlanets: String(f.f.high.read('nplnet')) });
      } catch (error) {
        if (!(error instanceof WarFinished)) throw error;
        ended = error; break;
      }
    }
    assert.equal(f.f.high.read('nplnet'), 0n, 'Bounded torpedo exercise must actually remove the planet');
    assert.equal(f.f.views.high.board.disp(23, 25), 0);
    if (enemyBasePresent) {
      assert.equal(ended, undefined);
      assert.equal(f.f.high.read('endflg'), 0n);
      const after = parseStatus(await f.client.command('STATUS'));
      assert.equal(after.torpedoes, before.torpedoes, 'Source docked firing preserves ammunition');
      await f.client.quit();
    } else {
      assert.ok(ended instanceof WarFinished);
      assert.equal(ended.winner, 'FEDERATION');
      assert.match(ended.text, /THE WAR IS OVER!!/);
      assert.match(ended.text, /Total points:/);
      assert.equal(f.f.high.read('endflg'), -1n);
    }
    results.push({ enemyBasePresent, neutral, shots, planetRemoved: true, outcome: ended ? 'war-over' : 'war-continues', winner: ended?.winner, finalText: ended?.text, evidence });
    writeFileSync(`${directory}/report.json`, JSON.stringify({ scope: 'TypeScript production Telnet; staged geometry, unchanged random/timing; not PDP-10 parity', results }, null, 2) + '\n');
  } finally { for (const fn of cleanup.reverse()) await fn(); }
}
console.log(JSON.stringify(results, null, 2));
