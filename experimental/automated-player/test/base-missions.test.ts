import test from 'node:test';
import assert from 'node:assert/strict';
import { BaseMissions } from '../base-missions.ts';
import { Captain } from '../captain.ts';
import { parseDevices, type Cell } from '../observations.ts';
import type { Observation } from '../captain.ts';

function observation(): Observation {
  const cells: Cell[] = [];
  for (let v = 1; v <= 20; v++) for (let h = 1; h <= 20; h++) cells.push({ v, h, symbol: ' .', observedAt: 1000 });
  cells.find(c => c.v === 10 && c.h === 15)!.symbol = ')('; cells.find(c => c.v === 15 && c.h === 15)!.symbol = ')('; 
  return { scan: { cells, observedAt: 1000 }, bases: [], devices: parseDevices('All devices functional.'), status: { observedAt: 1000, stardate: 1, position: { v: 10, h: 10 }, condition: 'Green', docked: false, energy: 5000, torpedoes: 10, hullDamage: 0, shieldsUp: true, shieldPercent: 100 } , objects: [
    { name: 'Emp Base', kind: 'base', faction: 'EMPIRE', position: { v: 10, h: 15 }, observedAt: 1000 },
    { name: 'Emp Base', kind: 'base', faction: 'EMPIRE', position: { v: 15, h: 15 }, observedAt: 1000 },
  ] };
}

test('Base missions split same-team captains and retain their lease', () => {
  const m = new BaseMissions(), o = observation();
  assert.deepEqual(m.assign('FEDERATION', 'A', o, 1000), { v: 10, h: 15 });
  assert.deepEqual(m.assign('FEDERATION', 'B', o, 1000), { v: 15, h: 15 });
  o.status.position = { v: 19, h: 19 };
  assert.deepEqual(m.assign('FEDERATION', 'A', o, 2000), { v: 10, h: 15 });
});

test('Base missions isolate factions and invalidate removed bases', () => {
  const m = new BaseMissions(), o = observation();
  assert.deepEqual(m.assign('FEDERATION', 'A', o, 1000), { v: 10, h: 15 });
  assert.deepEqual(m.assign('EMPIRE', 'E', o, 1000), null);
  o.objects = [o.objects![1]];
  assert.deepEqual(m.assign('FEDERATION', 'C', o, 1001), { v: 15, h: 15 });
});

test('Base missions expire leases and reject stale public rows', () => {
  const m = new BaseMissions(), o = observation(); m.assign('FEDERATION', 'A', o, 1000);
  o.objects = o.objects!.map(x => ({ ...x, observedAt: 32001 }));
  assert.deepEqual(m.assign('FEDERATION', 'B', o, 32001), { v: 10, h: 15 });
  o.objects = o.objects!.map(x => ({ ...x, observedAt: 0 }));
  assert.equal(m.assign('FEDERATION', 'C', o, 40000), null);
});

test('Siege captain honors a coordinated base assignment over nearest-first choice', () => {
  const o = observation();
  o.baseMission = { v: 15, h: 15 };
  const d = new Captain('FEDERATION', 'siege').choose(o, 1000);
  assert.equal(d.kind, 'act');
  if (d.kind === 'act') assert.equal(d.command, 'PHASERS ABSOLUTE 180 15 15');
  // The assigned base is five sectors away; the unassigned base is equally
  // close in this fixture, so the filter—not distance ordering—determines it.
});
