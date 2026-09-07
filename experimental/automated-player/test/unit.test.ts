import test from 'node:test';
import assert from 'node:assert/strict';
import { ClientTelnet, commandBytes } from '../telnet.ts';
import { parseFriendlyBases, parseStatus, type ShipStatus } from '../observations.ts';
import { decide } from '../policy.ts';

const report = '\r\nStardate\t1\r\nCondition\tDocked+Green\r\nLocation\t10-20\r\nTorpedoes\t10\r\nEnergy left\t5000.0\r\nDamage\t\t0.0\r\nShields\t        +100.0% 2500.0 units\r\nSub-Space Radio On\r\nCommand: ';
const ship: ShipStatus = parseStatus(report, 1000);

test('Telnet negotiation, escaped bytes, CR-NUL and subnegotiation survive every split', () => {
  const wire = Buffer.from([255,251,1,255,251,3,65,13,0,66,255,255,255,250,24,1,65,255,255,66,255,240,67,13,10]);
  for (let split = 0; split <= wire.length; split++) {
    const codec = new ClientTelnet();
    const a = codec.feed(wire.subarray(0, split)), b = codec.feed(wire.subarray(split));
    assert.equal(a.text + b.text, 'A\rBÿC\r\n');
    assert.deepEqual(Buffer.concat([a.reply, b.reply]), Buffer.from([255,254,1,255,253,3]));
  }
});

test('Negotiation does not create repeated-response loops', () => {
  const codec = new ClientTelnet();
  codec.feed(Buffer.from([255,251,1,255,251,3,255,253,24]));
  assert.equal(codec.feed(Buffer.from([255,251,1,255,251,3,255,253,24])).reply.length, 0);
});

test('Command encoder prevents typeahead and control injection', () => {
  assert.equal(commandBytes('STATUS').toString(), 'STATUS\r\n');
  assert.equal(commandBytes('').toString(), '\r\n');
  for (const input of ['STATUS\nQUIT', '\x03', 'é', 'STATUS\r']) assert.throws(() => commandBytes(input));
});

test('Long STATUS preserves displayed units and signed shield state, ignoring unrelated notifications', () => {
  assert.deepEqual(ship.position, { v: 10, h: 20 });
  assert.equal(ship.energy, 5000);
  assert.equal(ship.docked, true);
  assert.equal(ship.shieldsUp, true);
  const down = parseStatus('Incoming message: Energy left is low\r\n' + report.replace('+100.0%', '-0.0%'));
  assert.equal(down.shieldsUp, false);
  assert.equal(down.shieldPercent, 0);
});

test('Missing, duplicate and invalid status data fail closed', () => {
  for (const malformed of [report.replace('Energy left', 'Ener'), report + report, report.replace('10-20', '76-20')]) {
    assert.throws(() => parseStatus(malformed));
  }
});

test('Base parser excludes hostile markers, wrong teams, prose and out-of-range coordinates', () => {
  const text = ' Fed Base     @10-20 100.0%\r\n*Fed Base     @11-21\r\n Emp Base     @12-22\r\nMessage: Fed Base @13-23\r\n Fed Base     @99-22\r\n';
  assert.deepEqual(parseFriendlyBases(text, 'FEDERATION'), [{ v: 10, h: 20 }]);
  assert.deepEqual(parseFriendlyBases(text, 'EMPIRE'), [{ v: 12, h: 22 }]);
});

test('Resupply policy docks when adjacent and ends when replenished', () => {
  assert.equal(decide({ ...ship, docked: false }, [{ v: 10, h: 21 }], { failedMoves: 0 }, 1000).command, 'DOCK');
  assert.equal(decide({ ...ship, energy: 4000 }, [{ v: 10, h: 21 }], { failedMoves: 0 }, 1000).command, 'DOCK');
  assert.match(decide(ship, [{ v: 10, h: 21 }], { failedMoves: 0 }, 1000).reason, /objective complete/);
  assert.equal(decide(ship, [{ v: 10, h: 21 }], { failedMoves: 0 }, 1000).kind, 'complete');
});

test('Approach uses a single sector toward closest observed base', () => {
  const action = decide(ship, [{ v: 50, h: 60 }, { v: 5, h: 30 }], { failedMoves: 0 }, 1000);
  assert.equal(action.command, 'MOVE ABSOLUTE 9 21');
});

test('Baseline refuses stale, dangerous, unlocated or repeatedly blocked decisions', () => {
  const bases = [{ v: 15, h: 25 }];
  assert.equal(decide(ship, bases, { failedMoves: 0 }, 6001).command, undefined);
  assert.equal(decide({ ...ship, condition: 'Red' }, bases, { failedMoves: 0 }, 1000).command, undefined);
  assert.equal(decide({ ...ship, energy: 1199 }, bases, { failedMoves: 0 }, 1000).command, undefined);
  assert.equal(decide(ship, [], { failedMoves: 0 }, 1000).command, undefined);
  assert.equal(decide(ship, bases, { failedMoves: 2 }, 1000).command, undefined);
  assert.equal(decide(ship, bases, { failedMoves: 2 }, 1000).kind, 'blocked');
});
