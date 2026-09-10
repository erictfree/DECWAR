import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScan, parseDevices, type Cell, type Position } from '../observations.ts';
import { Captain, selectSafeNova, type Observation } from '../captain.ts';
import type { Decision } from '../policy.ts';
import { ObservedMap, route } from '../navigation.ts';
import { createCaptainStrategy } from '../../player-library/strategies/captain.ts';

function observation(position = { v: 10, h: 10 }): Observation {
  const cells: Cell[] = [];
  for (let v = 1; v <= 21; v++) for (let h = 1; h <= 21; h++) cells.push({ v, h, symbol: ' .', observedAt: 1000 });
  return {
    scan: { cells, observedAt: 1000 }, bases: [{ v: 10, h: 20 }],
    devices: parseDevices('All devices functional.\r\n'),
    status: { observedAt: 1000, stardate: 1, position, condition: 'Green', docked: false, energy: 5000, torpedoes: 10, hullDamage: 0, shieldsUp: true, shieldPercent: 100 },
  };
}
function action(d: Decision) { assert.equal(d.kind, 'act'); return d; }
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

test('Reusable aggressive profile enables the combined strategy contract', () => {
  const definition = createCaptainStrategy({ mode: 'siege', aggressive: true });
  assert.equal(definition.version, 'v21-installation-assault');
  const strategy = definition.create({ team: 'FEDERATION', ship: { name: 'Test', id: 1 } } as never);
  assert.equal(typeof strategy.decide, 'function');
});

test('Aggressive captains switch from foothold work to confirmed installation pressure', () => {
  const o = observation();
  o.objects = [
    { name: 'Home', kind: 'base', faction: 'FEDERATION', position: { v: 10, h: 5 }, observedAt: 1000 },
    { name: 'P1', kind: 'planet', faction: 'FEDERATION', position: { v: 8, h: 5 }, observedAt: 1000, builds: 2 },
    { name: 'P2', kind: 'planet', faction: 'FEDERATION', position: { v: 12, h: 5 }, observedAt: 1000, builds: 2 },
    { name: 'Enemy Base', kind: 'base', faction: 'EMPIRE', position: { v: 10, h: 15 }, observedAt: 1000 },
  ];
  cell(o, { v: 10, h: 15 }, ')(');
  const captain = new Captain('FEDERATION', 'objective', false, true, true, true, true, true, true, true, true);
  const decision = captain.choose(o, 1000);
  assert.equal(decision.kind, 'act');
  if (decision.kind === 'act') assert.equal(decision.targetKind, 'base');
});

test('Aggressive captains bypass roaming ships but fight ships screening an installation', () => {
  const o = observation();
  o.objects = [
    { name: 'Home', kind: 'base', faction: 'FEDERATION', position: { v: 10, h: 5 }, observedAt: 1000 },
    { name: 'P1', kind: 'planet', faction: 'FEDERATION', position: { v: 8, h: 5 }, observedAt: 1000, builds: 2 },
    { name: 'P2', kind: 'planet', faction: 'FEDERATION', position: { v: 12, h: 5 }, observedAt: 1000, builds: 2 },
    { name: 'Enemy Base', kind: 'base', faction: 'EMPIRE', position: { v: 10, h: 15 }, observedAt: 1000 },
  ];
  o.baseMission = { v: 10, h: 15 };
  cell(o, { v: 10, h: 15 }, ')('); cell(o, { v: 10, h: 20 }, ' W');
  const assault = new Captain('FEDERATION', 'objective', true, true, true, true, true, true, true, true, true);
  assert.equal(action(assault.choose(o, 1000)).targetKind, 'base', 'A remote ship does not displace the installation mission');
  cell(o, { v: 10, h: 20 }, ' .'); cell(o, { v: 10, h: 17 }, ' W');
  o.targets = [{ name: 'Wolf', kind: 'ship', faction: 'EMPIRE', position: { v: 10, h: 17 }, shieldPercent: 100, observedAt: 5000 }];
  o.status.observedAt = o.scan.observedAt = 5000; o.objects.forEach(object => object.observedAt = 5000);
  assert.equal(action(assault.choose(o, 5000)).targetKind, 'ship', 'A ship screening the assigned base is engaged defensively');
});

test('Exploration-priority aggressive captains attack a discovered hostile planet', () => {
  const o = observation();
  o.objects = [
    { name: 'Home', kind: 'base', faction: 'FEDERATION', position: { v: 10, h: 5 }, observedAt: 1000 },
    { name: 'P1', kind: 'planet', faction: 'FEDERATION', position: { v: 8, h: 5 }, observedAt: 1000, builds: 2 },
    { name: 'P2', kind: 'planet', faction: 'FEDERATION', position: { v: 12, h: 5 }, observedAt: 1000, builds: 2 },
    { name: 'Enemy Planet', kind: 'planet', faction: 'EMPIRE', position: { v: 10, h: 13 }, observedAt: 1000, builds: 1 },
  ];
  cell(o, { v: 10, h: 13 }, '@E');
  const captain = new Captain('FEDERATION', 'patrol', false, true, true, true, true, true, true, true, true, true);
  const decision = captain.choose(o, 1000);
  assert.equal(decision.kind, 'act');
  if (decision.kind === 'act') assert.equal(decision.targetKind, 'planet');
});

test('Exploration-priority aggressive captains join a reported installation strike', () => {
  const o = observation();
  o.objects = [
    { name: 'Home', kind: 'base', faction: 'FEDERATION', position: { v: 10, h: 5 }, observedAt: 1000 },
    { name: 'P1', kind: 'planet', faction: 'FEDERATION', position: { v: 8, h: 5 }, observedAt: 1000, builds: 2 },
    { name: 'P2', kind: 'planet', faction: 'FEDERATION', position: { v: 12, h: 5 }, observedAt: 1000, builds: 2 },
    { name: 'Enemy Base', kind: 'base', faction: 'EMPIRE', position: { v: 10, h: 15 }, observedAt: 1000 },
  ];
  o.radio = [{ kind: 'strike-base', position: { v: 10, h: 15 }, text: 'Enemy base confirmed at 10-15. Strike group converge.' }];
  cell(o, { v: 10, h: 15 }, ')(');
  const captain = new Captain('FEDERATION', 'objective', false, true, true, true, true, true, true, true, true, true);
  const decision = captain.choose(o, 1000);
  assert.equal(decision.kind, 'act');
  if (decision.kind === 'act') assert.equal(decision.targetKind, 'base');
});

test('A supplied captain answers an adjacent teammate resupply request', () => {
  const o = observation({ v: 10, h: 10 });
  o.radio = [{ kind: 'resupply', text: 'Low on energy or torpedoes. Falling back to base for supplies.' }];
  o.objects = [{ name: 'Farragut', kind: 'ship', faction: 'FEDERATION', position: { v: 10, h: 11 }, observedAt: 1000 }];
  const decision = new Captain('FEDERATION', 'patrol').choose(o, 1000);
  assert.equal(decision.kind, 'act');
  if (decision.kind === 'act') assert.equal(decision.command, 'ENERGY Farragut 500');
});

test('Opt-in survey handoff marks a bounded unproductive mission for reassignment', () => {
  const o = observation({ v: 10, h: 10 });
  o.planetMission = { v: 10, h: 15 };
  o.objects = [{ name: 'Neu planet', kind: 'planet', faction: 'NEUTRAL', position: { v: 10, h: 15 }, observedAt: 1000, builds: 0 }];
  cell(o, { v: 10, h: 15 }, ' @'); cell(o, { v: 10, h: 14 }, ' *');
  const captain = new Captain('FEDERATION', 'siege', false, true, true, false, true);
  let released = false;
  for (let i = 0; i < 140; i++) {
    o.status.observedAt = 1000; o.scan.observedAt = 1000;
    const d = captain.choose(o, 1000);
    assert.equal(d.kind, 'act');
    if (d.kind === 'act') {
      if (d.releasePlanetMission) { released = true; break; }
      if (d.command.startsWith('MOVE ABSOLUTE')) {
        const p = d.command.split(' ').slice(-2).map(Number); o.status.position = { v: p[0], h: p[1] };
      }
    }
  }
  assert.equal(released, true);
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
  const o = observation(); cell(o, { v: 10, h: 14 }, ' *'); cell(o, { v: 10, h: 15 }, ')(');
  const base = { name: 'Emp Base', kind: 'base' as const, faction: 'EMPIRE' as const, observedAt: 1000, position: { v: 10, h: 15 }, shieldPercent: 100 };
  o.objects = [base]; o.targets = [base];
  assert.deepEqual(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), { v: 10, h: 14, symbol: ' *', observedAt: 1000 });
  const shot = new Captain('FEDERATION', 'patrol', true).choose(o, 1000);
  assert.equal(shot.command, 'TORPEDOES ABSOLUTE 1 10 14'); assert.equal(shot.targetKind, 'star');
  assert.equal(new Captain('FEDERATION').choose(o, 1000).command, 'PHASERS ABSOLUTE 180 10 15', 'Default policy does not deliberately trigger novas');
  cell(o, { v: 10, h: 12 }, ' V');
  assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), undefined, 'A friendly in the possible launch corridor vetoes the nova');
  cell(o, { v: 10, h: 12 }, ' .');
  cell(o, { v: 9, h: 14 }, ' V');
  assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), undefined);
  cell(o, { v: 9, h: 14 }, ' .'); cell(o, { v: 11, h: 15 }, ' @');
  assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), undefined);
  cell(o, { v: 11, h: 15 }, ' .'); cell(o, { v: 10, h: 14 }, ' .'); cell(o, { v: 1, h: 2 }, ' *');
  base.position = { v: 1, h: 3 }; o.targets = [base];
  assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', o.targets), undefined, 'A scan-edge cluster has an unknown continuation');
});

test('Installation nova permits an enemy planet but rejects neutral and friendly planets', () => {
  const o = observation(); cell(o, { v: 10, h: 13 }, ' *'); cell(o, { v: 10, h: 14 }, '@E');
  const planet = { name: 'Emp planet', kind: 'planet' as const, faction: 'EMPIRE' as const, observedAt: 1000, position: { v: 10, h: 14 }, builds: 2 };
  assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', [planet])?.symbol, ' *');
  for (const symbol of [' @', '@F']) {
    cell(o, { v: 10, h: 14 }, symbol);
    assert.equal(selectSafeNova(o.scan, o.status, 'FEDERATION', [planet]), undefined);
  }
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

test('Objective captain rejects planets inside a known enemy base defense zone', () => {
  const o = observation();
  o.objects = [
    { name: 'Neu planet', kind: 'planet', faction: 'NEUTRAL', position: { v: 10, h: 11 }, builds: 0, observedAt: 1000 },
    { name: 'Emp Base', kind: 'base', faction: 'EMPIRE', position: { v: 10, h: 15 }, shieldPercent: 100, observedAt: 1000 },
  ];
  cell(o, { v: 10, h: 11 }, ' @');
  assert.doesNotMatch(new Captain('FEDERATION', 'objective').choose(o, 1000).command!, /^CAPTURE/);
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

test('Siege prioritizes a confirmed installation over distant ships but defends against nearby threats', () => {
  const o = observation();
  cell(o, { v: 15, h: 10 }, ')('); cell(o, { v: 10, h: 17 }, ' W');
  o.objects = [{ name: 'Emp Base', kind: 'base', faction: 'EMPIRE', position: { v: 15, h: 10 }, observedAt: 1000 }];
  assert.equal(new Captain('FEDERATION', 'siege').choose(o, 1000).command, 'PHASERS ABSOLUTE 180 15 10');
  cell(o, { v: 10, h: 17 }, ' .'); cell(o, { v: 10, h: 12 }, ' W');
  assert.equal(action(new Captain('FEDERATION', 'siege').choose(o, 1000)).targetKind, 'ship');
});

test('Siege preserves its target across a full resupply and rejects fresh evidence of removal', () => {
  const captain = new Captain('FEDERATION', 'siege');
  const o = observation(); cell(o, { v: 15, h: 10 }, ')(');
  o.objects = [{ name: 'Emp Base', kind: 'base', faction: 'EMPIRE', position: { v: 15, h: 10 }, observedAt: 1000 }];
  assert.equal(action(captain.choose(o, 1000)).targetKind, 'base');
  const refill = structuredClone(o); refill.status.position = { v: 10, h: 19 }; refill.status.energy = 2000;
  assert.equal(captain.choose(refill, 1000).command, 'DOCK');
  refill.status.energy = 5000; refill.status.docked = true;
  captain.choose(refill, 1000);
  const returned = structuredClone(o);
  cell(returned, { v: 10, h: 15 }, ')(');
  returned.objects!.unshift({ name: 'Emp Base', kind: 'base', faction: 'EMPIRE', position: { v: 10, h: 15 }, observedAt: 5000 });
  returned.status.observedAt = returned.scan.observedAt = 5000;
  returned.objects!.forEach(o => o.observedAt = 5000);
  assert.equal(captain.choose(returned, 5000).command, 'PHASERS ABSOLUTE 180 15 10');
  cell(returned, { v: 15, h: 10 }, ' .');
  returned.objects = returned.objects!.filter(o => o.position?.v !== 15);
  returned.status.observedAt = returned.scan.observedAt = 9000; returned.objects.forEach(o => o.observedAt = 9000);
  assert.equal(captain.choose(returned, 9000).command, 'PHASERS ABSOLUTE 180 10 15');
});

test('Siege uses distant LIST reports only for navigation, and cannot fire on an unconfirmed planet', () => {
  const o = observation();
  o.objects = [{ name: 'Emp Planet', kind: 'planet', faction: 'EMPIRE', position: { v: 10, h: 13 }, builds: 4, observedAt: 1000 }];
  assert.doesNotMatch(new Captain('FEDERATION', 'siege').choose(o, 1000).command ?? '', /^PHASERS/);
  cell(o, { v: 10, h: 13 }, '@E');
  assert.equal(action(new Captain('FEDERATION', 'siege').choose(o, 1000)).targetKind, 'planet');
  o.objects[0].builds = 0;
  assert.doesNotMatch(new Captain('FEDERATION', 'siege').choose(o, 1000).command ?? '', /^PHASERS/);
});

test('Siege torpedoes remove unbuilt enemy planets, respect cooldown and resupply ammunition', () => {
  const o = observation();
  o.objects = [{ name: 'Emp Planet', kind: 'planet', faction: 'EMPIRE', position: { v: 10, h: 13 }, builds: 0, observedAt: 1000 }];
  cell(o, { v: 10, h: 13 }, '@E');
  const captain = new Captain('FEDERATION', 'siege', false, true, true);
  assert.equal(captain.choose(o, 1000).command, 'TORPEDOES ABSOLUTE 1 10 13');
  assert.equal(captain.choose(o, 2000).command, 'STATUS');
  o.status.torpedoes = 2;
  assert.match(captain.choose(o, 2500).reason, /supplies/);
});

test('Planetary torpedoes require fresh hostile evidence and honor weapon policy', () => {
  const o = observation();
  o.objects = [{ name: 'Emp Planet', kind: 'planet', faction: 'EMPIRE', position: { v: 10, h: 13 }, builds: 4, observedAt: 1000 }];
  const choose = () => new Captain('FEDERATION', 'siege').choose(o, 1000);
  assert.notEqual(('weapon' in choose() ? action(choose()).weapon : undefined), 'torpedoes');
  cell(o, { v: 10, h: 13 }, '@E');
  assert.equal(('weapon' in choose() ? action(choose()).weapon : undefined), 'torpedoes');
  assert.equal(action(new Captain('FEDERATION', 'siege', false, false).choose(o, 1000)).weapon, 'phasers');
  o.devices.torpedoes = 300;
  assert.notEqual(('weapon' in choose() ? action(choose()).weapon : undefined), 'torpedoes');
  o.devices.torpedoes = 0; cell(o, { v: 10, h: 13 }, '@F'); o.objects[0].faction = 'FEDERATION';
  assert.notEqual(('weapon' in choose() ? action(choose()).weapon : undefined), 'torpedoes');
});

test('Siege destroys neutral planets but withdraws a firing solution after friendly capture', () => {
  const o = observation();
  o.objects = [{ name: 'Neu Planet', kind: 'planet', faction: 'NEUTRAL', position: { v: 10, h: 13 }, builds: 0, observedAt: 1000 }];
  cell(o, { v: 10, h: 13 }, ' @');
  const captain = new Captain('FEDERATION', 'siege', false, true, true);
  assert.equal(captain.choose(o, 1000).command, 'TORPEDOES ABSOLUTE 1 10 13');
  o.objects[0].faction = 'FEDERATION'; cell(o, { v: 10, h: 13 }, '@F');
  assert.doesNotMatch(captain.choose(o, 5000).command ?? '', /^TORPEDOES/);
  o.objects[0].faction = 'NEUTRAL'; cell(o, { v: 10, h: 13 }, ' @');
  assert.doesNotMatch(new Captain('FEDERATION', 'siege', false, false).choose(o, 1000).command ?? '', /^TORPEDOES|^PHASERS/);
});

test('Neutral planet firing requires SCAN and LIST ownership agreement', () => {
  const o = observation();
  o.objects = [{ name: 'Neu Planet', kind: 'planet', faction: 'NEUTRAL', position: { v: 10, h: 13 }, builds: 0, observedAt: 1000 }];
  cell(o, { v: 10, h: 13 }, '@E');
  assert.doesNotMatch(new Captain('FEDERATION', 'siege').choose(o, 1000).command ?? '', /^TORPEDOES/);
});
