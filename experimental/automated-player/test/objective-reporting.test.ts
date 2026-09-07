import test from 'node:test';
import assert from 'node:assert/strict';
import { objectiveConfirmation } from '../player.ts';
import type { ListedObject } from '../observations.ts';

const at = { v: 20, h: 21 };
const planet = (faction: ListedObject['faction'], builds: number): ListedObject => ({ name: `${faction} planet`, kind: 'planet', faction, builds, position: at, observedAt: 1 });
test('Objective confirmation belongs only to a matching pending action', () => {
  const neutral = [planet('NEUTRAL', 0)], captured = [planet('FEDERATION', 0)];
  assert.equal(objectiveConfirmation(neutral, captured, 'FEDERATION'), undefined, 'A teammate observation receives no credit');
  assert.equal(objectiveConfirmation(neutral, captured, 'FEDERATION', { action: 'build', position: at }), undefined, 'Wrong action receives no credit');
  assert.deepEqual(objectiveConfirmation(neutral, captured, 'FEDERATION', { action: 'capture', position: at }), { event: 'planet-captured', position: at, previousFaction: 'NEUTRAL' });
  assert.equal(objectiveConfirmation(neutral, [planet('FEDERATION', 0)], 'FEDERATION', { action: 'capture', position: { v: 1, h: 1 } }), undefined, 'Wrong target receives no credit');
});
test('Build confirmation distinguishes increments from base conversion', () => {
  assert.deepEqual(objectiveConfirmation([planet('FEDERATION', 2)], [planet('FEDERATION', 3)], 'FEDERATION', { action: 'build', position: at }), { event: 'planet-built', position: at, from: 2, to: 3 });
  const base: ListedObject = { name: 'Fed Base', kind: 'base', faction: 'FEDERATION', position: at, observedAt: 1 };
  assert.deepEqual(objectiveConfirmation([planet('FEDERATION', 4)], [base], 'FEDERATION', { action: 'build', position: at }), { event: 'base-created', position: at });
});
