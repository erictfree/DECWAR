import assert from 'node:assert/strict';
import test from 'node:test';
import { unexploredFrontier } from '../exploration.ts';
import { ObservedMap } from '../navigation.ts';

test('systematic exploration selects a reachable least-visited frontier sector', () => {
  const map = new ObservedMap();
  const now = Date.now();
  map.ingest({ observedAt: now, cells: [
    { v: 10, h: 10, symbol: ' .', observedAt: now },
    { v: 10, h: 11, symbol: ' .', observedAt: now },
    { v: 10, h: 12, symbol: ' .', observedAt: now },
    { v: 10, h: 13, symbol: ' .', observedAt: now },
  ] }, { v: 10, h: 10 });
  map.visits.set('10,11', 4);
  map.visits.set('10,12', 3);
  assert.deepEqual(unexploredFrontier(map, { v: 10, h: 10 }, 'FEDERATION', now), { v: 10, h: 13 });
});

test('systematic exploration ignores frontier sectors in known installation danger', () => {
  const map = new ObservedMap();
  const now = Date.now();
  map.ingest({ observedAt: now, cells: [
    { v: 10, h: 10, symbol: ' .', observedAt: now },
    { v: 10, h: 11, symbol: ' .', observedAt: now },
    { v: 10, h: 12, symbol: ' .', observedAt: now },
    { v: 10, h: 13, symbol: ' .', observedAt: now },
    { v: 10, h: 14, symbol: ')(', observedAt: now },
  ] }, { v: 10, h: 10 });
  assert.equal(unexploredFrontier(map, { v: 10, h: 10 }, 'FEDERATION', now), undefined);
});
