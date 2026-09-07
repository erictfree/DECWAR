import test from 'node:test';
import assert from 'node:assert/strict';
import { commands } from '../index.ts';
import { parseStatus } from '../index.ts';

test('public command builders produce printable Austin commands', () => {
  assert.equal(commands.move({ v: 4, h: 9 }), 'MOVE ABSOLUTE 4 9');
  assert.equal(commands.impulse({ v: 4, h: 9 }), 'IMPULSE ABSOLUTE 4 9');
  assert.equal(commands.phasers(180, { v: 4, h: 9 }), 'PHASERS ABSOLUTE 180 4 9');
  assert.equal(commands.torpedoes({ v: 4, h: 9 }), 'TORPEDOES ABSOLUTE 4 9');
  assert.equal(commands.dock(), 'DOCK');
  assert.equal(commands.capture({ v: 4, h: 9 }), 'CAPTURE ABSOLUTE 4 9');
  assert.equal(commands.build({ v: 4, h: 9 }), 'BUILD ABSOLUTE 4 9');
});

test('command builders reject malformed coordinates and weapon energy', () => {
  assert.throws(() => commands.move({ v: 0, h: 9 }), RangeError);
  assert.throws(() => commands.move({ v: 4.5, h: 9 }), RangeError);
  assert.throws(() => commands.phasers(0, { v: 4, h: 9 }), RangeError);
});

test('typed observation parsing is available from the public facade', () => {
  const status = parseStatus('Stardate 1\r\nCondition Green\r\nLocation 20-11\r\nEnergy left 2400.0\r\nTorpedoes 10\r\nDamage 0.0\r\nShields +100.0% 5000.0 units\r\nCommand: ');
  assert.equal(status.energy, 2400);
  assert.deepEqual(status.position, { v: 20, h: 11 });
});
