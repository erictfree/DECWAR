import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDevices } from '../../automated-player/observations.ts';
import { Captain, type Observation } from '../../automated-player/captain.ts';
import { captainStrategy } from '../index.ts';
import { evaluateFixture, type DecisionFixture } from '../testing.ts';
import { statusStrategyDefinition } from '../examples/status-strategy.ts';

function observation(position = { v: 10, h: 10 }): Observation {
  const cells = [];
  for (let v = 1; v <= 21; v++) for (let h = 1; h <= 21; h++) cells.push({ v, h, symbol: ' .', observedAt: 1000 });
  return { scan: { cells, observedAt: 1000 }, bases: [{ v: 10, h: 20 }], devices: parseDevices('All devices functional.\r\n'), status: { observedAt: 1000, stardate: 1, position, condition: 'Green', docked: false, energy: 5000, torpedoes: 10, hullDamage: 0, shieldsUp: true, shieldPercent: 100 } };
}

const combat = observation();
combat.scan.cells.find(c => c.v === 10 && c.h === 12)!.symbol = ' W';
combat.scan.cells.find(c => c.v === 10 && c.h === 11)!.symbol = ' V';
const resupply = observation({ v: 10, h: 19 });
resupply.status.energy = 2000;
const fixtures: DecisionFixture[] = [
  { id: 'combat-phaser', session: { team: 'FEDERATION', ship: 'YORKTOWN' }, now: 1000, observation: combat, expected: new Captain('FEDERATION').choose(combat, 1000) },
  { id: 'resupply-dock', session: { team: 'FEDERATION', ship: 'YORKTOWN' }, now: 1000, observation: resupply, expected: new Captain('FEDERATION').choose(resupply, 1000) },
];

test('captain adapter preserves the pre-migration decision fixtures', () => {
  for (const fixture of fixtures) assert.deepEqual(evaluateFixture(captainStrategy, fixture), fixture.expected, fixture.id);
});

test('strategy definitions create isolated captain state', () => {
  const first = captainStrategy.create({ team: 'FEDERATION', ship: 'A' });
  const second = captainStrategy.create({ team: 'FEDERATION', ship: 'B' });
  assert.notEqual(first, second);
  assert.equal(captainStrategy.id, 'austin-captain');
});

test('a custom strategy uses only the public strategy contract', () => {
  const decision = statusStrategyDefinition.create({ team: 'EMPIRE', ship: 'SCOUT' }).decide({ observation: resupply, now: 1000 });
  assert.deepEqual(decision, { kind: 'act', command: 'STATUS', reason: 'Example strategy requested a status report.' });
});
