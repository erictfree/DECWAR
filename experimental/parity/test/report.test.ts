import test from 'node:test';
import assert from 'node:assert/strict';
import { parityReport } from '../report.ts';
const capture = (backend: string, response = 'output\r\n> ') => [
  { event: 'configuration', backend, scenario: 'io-modes-v2' },
  { event: 'case', index: 1, id: 'modes/defaults/1', command: 'TYPE OUTPUT', response, passed: true },
  { event: 'complete', cases: 1 },
];
test('complete matching selected responses have a narrowly scoped match outcome', () => {
  assert.equal(parityReport(capture('typescript'), capture('pdp10'), 'modes', 1).outcome, 'matched-selected-output');
});
test('empty, truncated, wrong backend and cleanup failure captures never pass', () => {
  for (const right of [[], capture('pdp10').slice(0, 2), capture('typescript'), [...capture('pdp10'), { event: 'cleanup-error', error: 'logout failed' }]]) {
    assert.equal(parityReport(capture('typescript'), right, 'modes', 1).outcome, 'incomplete');
  }
});
test('echo adjustment is explicit and preserves raw evidence', () => {
  const left = capture('typescript'), right = capture('pdp10', 'TYPE OUTPUT\r\noutput\r\n> ');
  assert.equal(parityReport(left, right, 'modes', 1).outcome, 'differences');
  const adjusted = parityReport(left, right, 'modes', 1, true);
  assert.equal(adjusted.outcome, 'matched-selected-output');
  assert.equal(adjusted.comparison?.cases[0]?.result, 'command-echo-only');
});
test('whitespace, control characters, numeric differences and duplicate cases remain visible', () => {
  for (const response of ['output\n> ', 'output\r\n\x07> ', 'output 123\r\n> ']) {
    assert.equal(parityReport(capture('typescript'), capture('pdp10', response), 'modes', 1, true).outcome, 'differences');
  }
  const duplicate = capture('pdp10'); duplicate.push(duplicate[1]!);
  assert.equal(parityReport(capture('typescript'), duplicate, 'modes', 1).outcome, 'incomplete');
});
