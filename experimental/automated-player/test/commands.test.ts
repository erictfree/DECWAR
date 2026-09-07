import test from 'node:test';
import assert from 'node:assert/strict';
import { playerCommands } from '../commands.ts';

const sourceOrder = ['BASES', 'BUILD', 'CAPTURE', 'DAMAGES', 'DOCK', 'ENERGY', 'GRIPE', 'HELP', 'IMPULSE', 'LIST', 'MOVE', 'NEWS', 'PHASERS', 'PLANETS', 'POINTS', 'QUIT', 'RADIO', 'REPAIR', 'SCAN', 'SET', 'SHIELDS', 'SRSCAN', 'STATUS', 'SUMMARY', 'TARGETS', 'TELL', 'TIME', 'TORPEDOES', 'TRACTOR', 'TYPE', 'USERS'];

test('All 31 Austin public commands have one explicit bot disposition in source order', () => {
  assert.deepEqual(playerCommands.map(command => command.name), sourceOrder);
  assert.equal(new Set(playerCommands.map(command => command.name)).size, 31);
  for (const command of playerCommands) {
    assert.ok(command.use.length > 10);
    assert.ok(['automatic', 'supported', 'planned', 'manual'].includes(command.coverage));
  }
});

test('Unattended feedback is excluded while missing team and weapon capabilities stay planned', () => {
  const coverage = Object.fromEntries(playerCommands.map(command => [command.name, command.coverage]));
  assert.equal(coverage.GRIPE, 'manual');
  for (const name of ['ENERGY', 'RADIO', 'TELL', 'TRACTOR']) assert.equal(coverage[name], 'planned');
  for (const name of ['TARGETS', 'TORPEDOES']) assert.equal(coverage[name], 'automatic');
  for (const name of ['MOVE', 'PHASERS', 'POINTS', 'QUIT', 'SCAN']) assert.equal(coverage[name], 'automatic');
});
