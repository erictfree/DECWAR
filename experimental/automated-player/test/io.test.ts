import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareCases, type CapturedCase } from '../io-comparison.ts';
import { ioScenarios, selectGroups } from '../io-scenarios.ts';

const c = (id: string, response: string, command = 'STATUS'): CapturedCase => ({ id, index: 1, command, response });
test('Echo handling retains numeric, whitespace and control differences', () => {
  const a = c('status', '\r\nE5000\x07\r\n> ');
  const b = c('status', 'STATUS\r\n' + a.response);
  assert.equal(compareCases([a], [b]).cases[0].result, 'needs-review');
  const r = compareCases([a], [b], true).cases[0];
  assert.equal(r.result, 'command-echo-only');
  assert.equal(r.right, b.response);
  for (const response of [b.response.replace('5000', '4999'), b.response.replace('\x07', ''), b.response + ' ']) {
    assert.equal(compareCases([a], [c('status', response)], true).cases[0].result, 'needs-review');
  }
  assert.equal(compareCases([c('blank', '\r\n> ', '')], [c('blank', '\r\n\r\n> ', '')], true).cases[0].result, 'needs-review');
});
test('Missing, reordered and failed cases cannot silently become passes', () => {
  const a = c('a', 'same'), b = c('b', 'same');
  assert.equal(compareCases([a, b], [b]).cases[0].result, 'missing-case');
  assert.deepEqual(compareCases([a, b], [b, a]).cases.map(x => x.result), ['exact-decoded-match', 'exact-decoded-match']);
  assert.equal(compareCases([a], [{ ...a, passed: false }]).cases[0].result, 'failed-expectation');
  assert.throws(() => compareCases([a, a], [a]), /Duplicate/);
});
test('A case budget ends at a complete dialogue, not a continuation prompt', () => {
  const groups = ioScenarios('dialogs');
  assert.equal(selectGroups(groups, 2).length, 0);
  assert.equal(selectGroups(groups, 4).flatMap(g => g.steps).length, 3);
  const all = [...ioScenarios('modes'), ...groups].flatMap(g => g.steps);
  assert.equal(new Set(all.map(s => s.id)).size, all.length);
  for (const g of groups) assert.equal(g.steps.at(-1)?.prompt, undefined);
});
test('Preserved four-case native checkpoint distinguishes echo from changed coordinates', t => {
  const read = (name: string) => readFileSync(new URL(`../../../logs/automated-player-io-first/${name}.jsonl`, import.meta.url), 'utf8')
    .trim().split('\n').map(s => JSON.parse(s)).filter(e => e.event === 'case');
  // Local diagnostic evidence is optional in a clean checkout.
  let a: CapturedCase[], b: CapturedCase[];
  try { a = read('typescript'); b = read('pdp10-retry'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    t.skip('Local native capture is not present'); return;
  }
  const report = compareCases(a, b, true);
  assert.deepEqual(report.cases.slice(0, 4).map(x => x.result), ['command-echo-only', 'command-echo-only', 'command-echo-only', 'needs-review']);
  assert.equal(report.cases.filter(x => x.result === 'missing-case').length, 57);
});
