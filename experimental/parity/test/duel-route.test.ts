import test from 'node:test';
import assert from 'node:assert/strict';
import { duelRoute } from '../duel-route.ts';
import { ObservedMap } from '../../automated-player/navigation.ts';
import { distance, type Position } from '../../automated-player/observations.ts';

for (const start of [{ v: 30, h: 10 }, { v: 22, h: 15 }]) {
  test(`duel setup escapes defended terrain from ${start.v},${start.h}`, () => {
    const objects = [{ v: 25, h: 10, symbol: '<>', radius: 4 }, { v: 19, h: 14, symbol: ' @', radius: 2 }, { v: 19, h: 17, symbol: ' @', radius: 2 }, { v: 15, h: 10, symbol: ')(', radius: 0 }, { v: 21, h: 11, symbol: ' *', radius: 0 }];
    let p: Position = start;
    const goal = { v: 14, h: 10 }, map = new ObservedMap();
    for (let step = 0; step < 70 && distance(p, goal); step++) {
      const now = 1000 + step, cells = [];
      for (let v = Math.max(1, p.v - 10); v <= Math.min(75, p.v + 10); v++) for (let h = Math.max(1, p.h - 10); h <= Math.min(75, p.h + 10); h++) cells.push({ v, h, symbol: objects.find(o => o.v === v && o.h === h)?.symbol ?? ' .', observedAt: now });
      const scan = { cells, observedAt: now }; map.ingest(scan, p);
      const next = duelRoute(map, scan, p, goal, now); assert.ok(next, 'route must progress');
      const length = distance(p, next); assert.ok(length >= 1 && length <= 4, 'no overheating-speed setup');
      for (let n = 1; n <= length; n++) {
        const cell: Position = { v: p.v + Math.sign(next.v - p.v) * n, h: p.h + Math.sign(next.h - p.h) * n };
        assert.ok(cells.some(c => distance(c, cell) === 0 && c.symbol === ' .'));
        assert.ok(objects.every(o => !o.radius || distance(o, cell) > o.radius), 'every crossed cell clears defenses');
      }
      p = next;
    }
    assert.deepEqual(p, goal);
  });
}
