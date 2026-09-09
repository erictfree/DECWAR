import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressWatch } from '../progress-watch.ts';
import type { ShipStatus } from '../observations.ts';

test('Responsive but unchanged game state emits one strategic stall, then resumes on recovery', () => {
  const watch = new ProgressWatch();
  const s: ShipStatus = { position: { v: 36, h: 21 }, energy: 103.5, shieldPercent: 23.8, shieldsUp: true, hullDamage: 1802.9, torpedoes: 6, stardate: 139, observedAt: 0, docked: false, condition: 'Yellow' };
  assert.equal(watch.observe(s, 1000), undefined);
  s.observedAt = 31000;
  assert.equal(watch.observe(s, 31000), 'stalled');
  assert.equal(watch.observe(s, 61000), undefined);
  s.energy = 193.5;
  assert.equal(watch.observe(s, 62000), 'resumed');
  assert.equal(watch.observe(s, 63000), undefined);
});

test('Useful repairs and normal weapon cooldowns do not trigger strategic stalls', () => {
  const watch = new ProgressWatch();
  const s: ShipStatus = { position: { v: 1, h: 1 }, energy: 2000, shieldPercent: 50, shieldsUp: true, hullDamage: 1000, torpedoes: 10, stardate: 1, observedAt: 0, docked: true, condition: 'Green' };
  for (let n = 0; n < 20; n++) {
    s.hullDamage -= 10;
    assert.equal(watch.observe(s, n * 5000), undefined);
    assert.equal(watch.observe(s, n * 5000 + 3000), undefined);
  }
});
