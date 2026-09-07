import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScan, parseDevices, type Cell, type Position } from '../observations.ts';
import { Captain, selectSafeNova, type Observation } from '../captain.ts';
import { ObservedMap, route } from '../navigation.ts';

function observation(position = { v: 10, h: 10 }): Observation {
  const cells: Cell[] = [];
  for (let v = 1; v <= 21; v++) for (let h = 1; h <= 21; h++) cells.push({ v, h, symbol: ' .', observedAt: 1000 });
  return {
    scan: { cells, observedAt: 1000 }, bases: [{ v: 10, h: 20 }],
    devices: parseDevices('All devices functional.\r\n'),
    status: { observedAt: 1000, stardate: 1, position, condition: 'Green', docked: false, energy: 5000, torpedoes: 10, hullDamage: 0, shieldsUp: true, shieldPercent: 100 },
  };
}
function cell(o: Observation, p: Position, symbol: string): void { o.scan.cells.find(c => c.v === p.v && c.h === p.h)!.symbol = symbol; }

test('Long scan parser preserves black holes, captured planets, warnings and row orientation', () => {
  const text = '\r\n    9  11\r\n11  .  @E 11\r\n10  ! N<> 10\r\n 9  * W @  9\r\n    9  11\r\nCommand: ';
  const scan = parseScan(text, 1000);
  assert.equal(scan.cells.length, 9);
  assert.deepEqual(scan.cells[1], { v: 11, h: 10, symbol: '  ', observedAt: 1000 });
  assert.deepEqual(scan.cells[7], { v: 9, h: 10, symbol: ' W', observedAt: 1000 });
  assert.throws(() => parseScan(text.replace('    9  11\r\nCommand:', 'Command:')), /Incomplete/);
});

test('Device report differentiates critical engines and ordinary damage', () => {
  const d = parseDevices('\r\nDamage Report for Nimitz\r\n\r\nDevice             Damage\r\n\r\nWarp Engines       300.0 units\r\nPhasers            25.0 units\r\nCommand: ');
  assert.equal(d.warp, 300); assert.equal(d.phasers, 25); assert.equal(d.impulse, 0);
  assert.throws(() => parseDevices('Warp Engines 300.0 units'), /Incomplete/);
});

test('Navigator detours around a solid wall through its gap', () => {
  const o = observation(), map = new ObservedMap();
  for (let v = 1; v <= 21; v++) if (v !== 16) cell(o, { v, h: 12 }, ' *');
  map.ingest(o.scan, o.status.position);
  let position = o.status.position;
  for (let i = 0; i < 30 && position.h < 14; i++) {
    const step = route(map, position, { v: 10, h: 18 }, 'FEDERATION', 1000);
    assert.ok(step); assert.notEqual(map.cell(step, 1000)?.symbol, ' *');
    if (step.h === 12) assert.equal(step.v, 16);
    position = step;
  }
  assert.ok(position.h >= 14);
});

test('Navigator avoids warning zones and black holes, and never executes an unknown first step', () => {
  const o = observation(), map = new ObservedMap();
  cell(o, { v: 10, h: 11 }, '  '); cell(o, { v: 9, h: 11 }, ' !');
  map.ingest(o.scan, o.status.position);
  const step = route(map, o.status.position, { v: 10, h: 15 }, 'FEDERATION', 1000);
  assert.ok(step); assert.equal(map.cell(step, 1000)?.symbol, ' .');
  assert.equal(route(new ObservedMap(), { v: 1, h: 1 }, { v: 5, h: 5 }, 'FEDERATION', 1000), undefined);
});

test('Captain fires only on fresh enemies, preserves energy, and spaces phaser shots', () => {
  const o = observation(), captain = new Captain('FEDERATION');
  cell(o, { v: 10, h: 12 }, ' W'); cell(o, { v: 10, h: 11 }, ' V');
  assert.equal(captain.choose(o, 1000).command, 'PHASERS ABSOLUTE 180 10 12');
  assert.equal(captain.choose(o, 1100).command, 'STATUS');
  o.status.energy = 2200;
  assert.match(captain.choose(o, 1200).command!, /^MOVE/);
  const friendly = observation(); cell(friendly, { v: 10, h: 11 }, ' V');
  assert.doesNotMatch(new Captain('FEDERATION').choose(friendly, 1000).command!, /^PHASERS/);
});

test('Red condition does not freeze retreat; damaged warp uses impulse and critical mobility requests repair', () => {
  const o = observation(); o.status.condition = 'Red'; o.status.energy = 2000; o.devices.warp = 300;
  assert.match(new Captain('FEDERATION').choose(o, 1000).command!, /^IMPULSE/);
  o.devices.impulse = 300;
  assert.equal(new Captain('FEDERATION').choose(o, 1000).command, 'REPAIR 30');
});

test('Resupply docks repeatedly until restored; patrol resumes afterward', () => {
  const o = observation({ v: 10, h: 19 }); o.status.energy = 2000;
  const captain = new Captain('FEDERATION');
  assert.equal(captain.choose(o, 1000).command, 'DOCK');
  o.status.energy = 5000; o.status.docked = true;
  assert.match(captain.choose(o, 1100).command!, /^MOVE/);
  assert.equal(new Captain('FEDERATION', 'resupply').choose(o, 1100).kind, 'complete');
});

test('An observed failed movement temporarily blocks that destination and causes a different route', () => {
  const o = observation(), captain = new Captain('FEDERATION', 'resupply');
  const first = captain.choose(o, 1000).command;
  const second = captain.choose(o, 1100).command;
  assert.notEqual(second, first);
});

test('A supplied captain closes on one distant enemy, but does not charge a group or enter a warning sector', () => {
  const o = observation(); cell(o, { v: 10, h: 20 }, ' W'); o.bases = [{ v: 10, h: 2 }];
  const close = new Captain('FEDERATION').choose(o, 1000);
  assert.match(close.command!, /^MOVE/); assert.match(close.reason, /Close on/);
  cell(o, { v: 9, h: 20 }, ' D');
  assert.match(new Captain('FEDERATION').choose(o, 1000).command!, /^PHASERS/);
  cell(o, { v: 9, h: 20 }, ' .'); o.status.shieldPercent = 70;
  assert.match(new Captain('FEDERATION').choose(o, 1000).command!, /^PHASERS/);
  o.status.shieldPercent = 100;
  for (let v = 9; v <= 11; v++) cell(o, { v, h: 11 }, ' !');
  assert.match(new Captain('FEDERATION').choose(o, 1000).command!, /^PHASERS/);
});

test('Combat reserve gap enters resupply and keeps that goal after losing sight of the enemy', () => {
  const o = observation(), captain = new Captain('FEDERATION');
  o.bases = [{ v: 10, h: 2 }]; o.status.energy = 2600; cell(o, { v: 10, h: 13 }, ' W');
  const retreat = captain.choose(o, 1000);
  assert.match(retreat.reason, /supplies/); assert.match(retreat.command!, /^MOVE ABSOLUTE \d+ 9$/);
  cell(o, { v: 10, h: 13 }, ' .'); o.status.position = { v: 9, h: 9 };
  assert.match(captain.choose(o, 1100).reason, /supplies/);
  o.status.position = { v: 10, h: 3 };
  assert.equal(captain.choose(o, 1200).command, 'DOCK');
});

test('Fresh LIST shield information helps select a vulnerable SCAN-confirmed ship', () => {
  const o = observation(); cell(o, { v: 10, h: 11 }, ' W'); cell(o, { v: 10, h: 12 }, ' D');
  o.objects = [
    { name: 'Wolf', kind: 'ship', faction: 'EMPIRE', observedAt: 1000, position: { v: 10, h: 11 }, shieldPercent: 100 },
    { name: 'Demon', kind: 'ship', faction: 'EMPIRE', observedAt: 1000, position: { v: 10, h: 12 }, shieldPercent: 10 },
  ];
  assert.equal(new Captain('FEDERATION').choose(o, 1000).command, 'TORPEDOES ABSOLUTE 1 10 12');
  // A conflicting newer scan prevents an old LIST position becoming a shot.
  cell(o, { v: 10, h: 12 }, ' .');
  assert.equal(new Captain('FEDERATION').choose(o, 1000).command, 'PHASERS ABSOLUTE 180 10 11');
});

test('Captain uses one torpedo only when TARGETS agrees and shields are weakened', () => {
  const o = observation(); cell(o, { v: 10, h: 12 }, ' W');
  const wolf = { name: 'Wolf', kind: 'ship' as const, faction: 'EMPIRE' as const, observedAt: 1000, position: { v: 10, h: 12 }, shieldPercent: 40 };
  o.objects = [wolf]; o.targets = [wolf];
  const captain = new Captain('FEDERATION');
  const shot = captain.choose(o, 1000);
  assert.equal(shot.command, 'TORPEDOES ABSOLUTE 1 10 12'); assert.equal(shot.weapon, 'torpedoes');
  assert.equal(captain.choose(o, 1100).command, 'PHASERS ABSOLUTE 180 10 12', 'Torpedo readiness gap falls back to phasers');
  o.targets = []; assert.doesNotMatch(new Captain('FEDERATION').choose(o, 1000).command!, /^(TORPEDOES|PHASERS)/);
  o.targets = [wolf]; wolf.shieldPercent = 90;
  assert.doesNotMatch(new Captain('FEDERATION').choose(o, 1000).command!, /^TORPEDOES/);
  wolf.shieldPercent = 40; o.status.torpedoes = 4;
  assert.equal(new Captain('FEDERATION').choose(o, 1000).command, 'PHASERS ABSOLUTE 180 10 12');
  o.status.torpedoes = 10; o.devices.torpedoes = 300;
  assert.doesNotMatch(new Captain('FEDERATION').choose(o, 1000).command!, /^TORPEDOES/);
  o.devices.torpedoes = 0;
  assert.equal(new Captain('FEDERATION', 'patrol', false, false).choose(o, 1000).command, 'PHASERS ABSOLUTE 180 10 12');
});

test('Captain keeps weakened targets at torpedo range or closer before firing', () => {
  const o = observation(); cell(o, { v: 10, h: 19 }, ' W');
  const wolf = { name: 'Wolf', kind: 'ship' as const, faction: 'EMPIRE' as const, observedAt: 1000, position: { v: 10, h: 19 }, shieldPercent: 40 };
  o.objects = [wolf]; o.targets = [wolf];
  const decision = new Captain('FEDERATION').choose(o, 1000);
  assert.doesNotMatch(decision.command!, /^TORPEDOES/);
});

test('Captain pursues a fresh teammate sighting without treating it as a firing solution', () => {
  const o = observation();
  o.intel = [{ name: 'Wolf', kind: 'ship', faction: 'EMPIRE', observedAt: 1000, position: { v: 10, h: 20 } }];
  const decision = new Captain('FEDERATION').choose(o, 1000);
  assert.match(decision.command!, /^MOVE/);
  assert.match(decision.reason, /Pursue teammate sighting/);
});

test('Objective captain keeps planet priority over teammate pursuit waypoints', () => {
  const o = observation();
  o.objects = [{ name: 'Neu planet', kind: 'planet', faction: 'NEUTRAL', position: { v: 10, h: 11 }, builds: 0, observedAt: 1000 }];
  o.intel = [{ name: 'Wolf', kind: 'ship', faction: 'EMPIRE', observedAt: 1000, position: { v: 20, h: 20 } }];
  cell(o, { v: 10, h: 11 }, ' @');
  assert.equal(new Captain('FEDERATION', 'objective').choose(o, 1000).command, 'CAPTURE ABSOLUTE 10 11');
});

test('Nova tactic requires a fully observed star cluster clear of friendlies and planets', () => {
  const o = observation(); cell(o, { v: 10, h: 13 }, ' *'); cell(o, { v: 10, h: 14 }, ' W');
  const wolf = { name: 'Wolf', kind: 'ship' as const, faction: 'EMPIRE' as const, observedAt: 1000, position: { v: 10, h: 14 }, shieldPercent: 100 };
  o.objects = [wolf]; o.targets = [wolf];
  assert.deepEqual(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), { v: 10, h: 13, symbol: ' *', observedAt: 1000 });
  const shot = new Captain('FEDERATION', 'patrol', true).choose(o, 1000);
  assert.equal(shot.command, 'TORPEDOES ABSOLUTE 1 10 13'); assert.equal(shot.targetKind, 'star');
  assert.equal(new Captain('FEDERATION').choose(o, 1000).command, 'PHASERS ABSOLUTE 180 10 14', 'Default policy does not deliberately trigger novas');
  cell(o, { v: 9, h: 13 }, ' V');
  assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), undefined);
  cell(o, { v: 9, h: 13 }, ' .'); cell(o, { v: 11, h: 14 }, ' @');
  assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), undefined);
  cell(o, { v: 11, h: 14 }, ' .'); cell(o, { v: 10, h: 13 }, ' .'); cell(o, { v: 1, h: 2 }, ' *');
  wolf.position = { v: 1, h: 3 }; o.targets = [wolf];
  assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), undefined, 'A scan-edge cluster has an unknown continuation');
});

test('Objective captain captures and develops only freshly scanned planets with safe reserves', () => {
  const neutral = observation(); neutral.objects = [{ name: 'Neu planet', kind: 'planet', faction: 'NEUTRAL', position: { v: 10, h: 11 }, builds: 0, observedAt: 1000 }];
  cell(neutral, { v: 10, h: 11 }, ' @');
  const capture = new Captain('FEDERATION', 'objective').choose(neutral, 1000);
  assert.equal(capture.command, 'CAPTURE ABSOLUTE 10 11'); assert.equal(capture.objectiveAction, 'capture'); assert.equal(capture.targetKind, undefined);
  const friendly = observation(); friendly.objects = [{ name: 'Fed planet', kind: 'planet', faction: 'FEDERATION', position: { v: 10, h: 11 }, builds: 3, observedAt: 1000 }];
  cell(friendly, { v: 10, h: 11 }, '@F');
  const build = new Captain('FEDERATION', 'objective').choose(friendly, 1000);
  assert.equal(build.command, 'BUILD ABSOLUTE 10 11'); assert.equal(build.objectiveAction, 'build');
  friendly.objects[0].builds = 4; friendly.bases = Array.from({ length: 10 }, (_, i) => ({ v: i + 1, h: 20 }));
  assert.doesNotMatch(new Captain('FEDERATION', 'objective').choose(friendly, 1000).command!, /^BUILD/, 'A full base roster prevents a repeated rejected fifth build');
  assert.doesNotMatch(new Captain('FEDERATION').choose(neutral, 1000).command!, /^(CAPTURE|BUILD)/, 'Patrol role leaves objective work to its teammate');
  neutral.status.energy = 3000;
  assert.doesNotMatch(new Captain('FEDERATION', 'objective').choose(neutral, 1000).command!, /^(CAPTURE|BUILD)/);
  neutral.status.energy = 5000; neutral.objects[0].observedAt = -10000;
  assert.doesNotMatch(new Captain('FEDERATION', 'objective').choose(neutral, 1000).command!, /^(CAPTURE|BUILD)/);
});

test('Empire objective captain uses the same capture and construction path', () => {
  const o = observation(); o.objects = [{ name: 'Neu planet', kind: 'planet', faction: 'NEUTRAL', position: { v: 10, h: 11 }, builds: 0, observedAt: 1000 }];
  cell(o, { v: 10, h: 11 }, ' @');
  assert.equal(new Captain('EMPIRE', 'objective').choose(o, 1000).command, 'CAPTURE ABSOLUTE 10 11');
  o.objects = [{ name: 'Emp planet', kind: 'planet', faction: 'EMPIRE', position: { v: 10, h: 11 }, builds: 0, observedAt: 1000 }];
  cell(o, { v: 10, h: 11 }, '@E');
  assert.equal(new Captain('EMPIRE', 'objective').choose(o, 1000).command, 'BUILD ABSOLUTE 10 11');
});

test('Objective waypoint expires without turning stale coordinates into actions', () => {
  const o = observation();
  o.objects = [{ name: 'Neu planet', kind: 'planet', faction: 'NEUTRAL', position: { v: 10, h: 18 }, builds: 0, observedAt: 1000 }];
  cell(o, { v: 10, h: 18 }, ' @');
  const captain = new Captain('FEDERATION', 'objective');
  assert.match(captain.choose(o, 1000).reason, /planet for capture/);
  o.objects = [];
  o.status.observedAt = 62001; o.scan.observedAt = 62001;
  const expired = captain.choose(o, 62001);
  assert.doesNotMatch(expired.reason, /planet for capture|captured planet/);
});

test('Defense captain guards developed planets and prioritizes ships threatening friendly assets', () => {
  const travel = observation();
  travel.objects = [
    { name: 'Fed Base', kind: 'base', faction: 'FEDERATION', position: { v: 10, h: 20 }, observedAt: 1000 },
    { name: 'Fed planet', kind: 'planet', faction: 'FEDERATION', position: { v: 15, h: 15 }, builds: 4, observedAt: 1000 },
  ];
  const station = new Captain('FEDERATION', 'defense').choose(travel, 1000);
  assert.match(station.command!, /^MOVE/); assert.match(station.reason, /friendly planet/);

  const watch = observation({ v: 13, h: 13 });
  watch.objects = [{ name: 'Fed planet', kind: 'planet', faction: 'FEDERATION', position: { v: 15, h: 15 }, builds: 4, observedAt: 1000 }];
  const watcher = new Captain('FEDERATION', 'defense');
  assert.equal(watcher.choose(watch, 1000).command, 'STATUS');
  assert.equal(watcher.choose(watch, 1100).command, 'STATUS');
  assert.match(watcher.choose(watch, 1200).command!, /^MOVE/, 'A defender starts a combat sortie instead of holding indefinitely');

  const threat = observation();
  threat.objects = [
    { name: 'Fed planet', kind: 'planet', faction: 'FEDERATION', position: { v: 10, h: 20 }, builds: 4, observedAt: 1000 },
    { name: 'Wolf', kind: 'ship', faction: 'EMPIRE', position: { v: 10, h: 11 }, shieldPercent: 100, observedAt: 1000 },
    { name: 'Demon', kind: 'ship', faction: 'EMPIRE', position: { v: 10, h: 18 }, shieldPercent: 100, observedAt: 1000 },
  ];
  cell(threat, { v: 10, h: 11 }, ' W'); cell(threat, { v: 10, h: 18 }, ' D');
  assert.equal(new Captain('FEDERATION', 'defense').choose(threat, 1000).command, 'PHASERS ABSOLUTE 180 10 18');
  assert.equal(new Captain('FEDERATION').choose(threat, 1000).command, 'PHASERS ABSOLUTE 180 10 11');
});
