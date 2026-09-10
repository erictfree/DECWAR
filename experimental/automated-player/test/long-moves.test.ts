import assert from 'node:assert/strict';
import test from 'node:test';
import { clearDirectRoute, ObservedMap } from '../navigation.ts';

test('long move is allowed only across fresh clear sectors', () => {
  const map = new ObservedMap(); const now = Date.now();
  map.ingest({ observedAt: now, cells: [
    { v: 10, h: 10, symbol: ' .', observedAt: now },
    { v: 10, h: 11, symbol: ' .', observedAt: now },
    { v: 10, h: 12, symbol: ' .', observedAt: now },
    { v: 10, h: 13, symbol: ' .', observedAt: now },
  ] }, { v: 10, h: 10 });
  assert.equal(clearDirectRoute(map, { v: 10, h: 10 }, { v: 10, h: 13 }, 'FEDERATION', now), true);
  assert.equal(clearDirectRoute(map, { v: 10, h: 10 }, { v: 10, h: 18 }, 'FEDERATION', now), false);
});

test('long move rejects known danger and stale terrain', () => {
  const map = new ObservedMap(); const now = Date.now();
  map.ingest({ observedAt: now, cells: [
    { v: 10, h: 10, symbol: ' .', observedAt: now },
    { v: 10, h: 11, symbol: ' .', observedAt: now - 6000 },
    { v: 10, h: 12, symbol: ')(', observedAt: now },
  ] }, { v: 10, h: 10 });
  assert.equal(clearDirectRoute(map, { v: 10, h: 10 }, { v: 10, h: 12 }, 'FEDERATION', now), false);
});
