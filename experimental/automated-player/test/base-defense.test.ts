import assert from 'node:assert/strict';
import test from 'node:test';
import { BaseDefense } from '../base-defense.ts';

const observation = (enemyDistance: number) => ({
  status: { position: { v: 10, h: 10 }, observedAt: 0 },
  devices: {}, scan: { cells: [], observedAt: 0 }, bases: [{ v: 10, h: 10 }],
  objects: [{ kind: 'base', faction: 'FEDERATION', position: { v: 10, h: 10 }, observedAt: 100 }],
  targets: [{ kind: 'ship', faction: 'EMPIRE', position: { v: 10, h: 10 + enemyDistance }, observedAt: 100 }],
} as any);

test('last-base defense assigns one captain and keeps others unassigned', () => {
  const defense = new BaseDefense();
  assert.deepEqual(defense.assign('FEDERATION', 'A', observation(4), 100), { v: 10, h: 10 });
  assert.equal(defense.assign('FEDERATION', 'B', observation(4), 101), null);
  assert.deepEqual(defense.assign('FEDERATION', 'A', observation(4), 102), { v: 10, h: 10 });
});

test('last-base defense releases when multiple bases or no nearby enemy are known', () => {
  const defense = new BaseDefense();
  assert.equal(defense.assign('FEDERATION', 'A', observation(20), 100), null);
  const multiple = observation(4) as any;
  multiple.objects.push({ kind: 'base', faction: 'FEDERATION', position: { v: 20, h: 20 }, observedAt: 100 });
  assert.equal(defense.assign('FEDERATION', 'A', multiple, 101), null);
});
