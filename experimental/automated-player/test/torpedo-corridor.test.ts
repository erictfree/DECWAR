import test from 'node:test';
import assert from 'node:assert/strict';
import { torpedoCorridor, clearTorpedoCorridor } from '../torpedo-corridor.ts';
import { Captain, type Observation } from '../captain.ts';
import { parseDevices, positionKey, type Scan } from '../observations.ts';
import { check, CheckLocals } from '../../../src/game/check.ts';
import { rational as real } from '../../../test/support/rational-real.ts';

function observation(): Observation {
  const scan: Scan = { observedAt: 1000, cells: [] };
  for (let v = 10; v <= 30; v++) for (let h = 10; h <= 30; h++) scan.cells.push({ v, h, symbol: ' .', observedAt: 1000 });
  scan.cells.find(c => c.v === 20 && c.h === 23)!.symbol = ' W';
  const wolf = { name: 'Wolf', kind: 'ship' as const, faction: 'EMPIRE' as const, position: { v: 20, h: 23 }, shieldPercent: 40, observedAt: 1000 };
  return { scan, bases: [], devices: parseDevices('All devices functional.\r\n'), objects: [wolf], targets: [wolf],
    status: { position: { v: 20, h: 20 }, observedAt: 1000, stardate: 0, energy: 5000, torpedoes: 10, hullDamage: 0, shieldsUp: true, shieldPercent: 100, condition: 'Green', docked: false } };
}

test('Corridor extends past the target, widens for drift, and respects galaxy edges', () => {
  const corridor = new Set(torpedoCorridor({ v: 20, h: 20 }, { v: 20, h: 23 }).map(positionKey));
  assert.ok(corridor.has('20,30'));
  assert.ok(corridor.has('23,30'));
  assert.ok(!corridor.has('24,30'));
  assert.ok(!corridor.has('20,20'));
  assert.deepEqual(torpedoCorridor({ v: 20, h: 20 }, { v: 20, h: 20 }), []);
  assert.deepEqual(torpedoCorridor({ v: 20, h: 20 }, { v: 20, h: 31 }), []);
  assert.ok(torpedoCorridor({ v: 74, h: 74 }, { v: 75, h: 75 }).every(p => p.v <= 75 && p.h <= 75));
});

test('Corridor preserves reflection and non-tied axis exchange; diagonal ties follow CHECK', () => {
  const sorted = (ps: { v: number; h: number }[]) => ps.map(positionKey).sort();
  for (let dv = -8; dv <= 8; dv++) for (let dh = -8; dh <= 8; dh++) {
    if (!dv && !dh) continue;
    const path = torpedoCorridor({ v: 38, h: 38 }, { v: 38 + dv, h: 38 + dh });
    if (Math.abs(dv) !== Math.abs(dh)) assert.deepEqual(sorted(path.map(p => ({ v: p.h, h: p.v }))), sorted(torpedoCorridor({ v: 38, h: 38 }, { v: 38 + dh, h: 38 + dv })));
    assert.deepEqual(sorted(path.map(p => ({ v: 76 - p.v, h: 76 - p.h }))), sorted(torpedoCorridor({ v: 38, h: 38 }, { v: 38 - dv, h: 38 - dh })));
  }
});

test('Captain falls back to phasers for collateral hazards including beyond-target stars', () => {
  for (const symbol of [' *', ' V', '<>', ' @', '@E', '@F', '  ', '??']) {
    const o = observation();
    assert.match(new Captain('FEDERATION', 'patrol', false, true, true).choose(o, 1000).command!, /^TORPEDOES/);
    o.scan.cells.find(c => c.v === 21 && c.h === 27)!.symbol = symbol;
    assert.match(new Captain('FEDERATION').choose(o, 1000).command!, /^TORPEDOES/, 'Default policy remains unchanged pending comparison');
    assert.equal(new Captain('FEDERATION', 'patrol', false, true, true).choose(o, 1000).command, 'PHASERS ABSOLUTE 180 20 23', symbol);
  }
});

test('Corridor requires fresh complete coverage and recognizes faction ownership', () => {
  const o = observation(), from = o.status.position, target = { v: 20, h: 23 };
  assert.ok(clearTorpedoCorridor(o.scan, from, target, 'FEDERATION', 1000));
  assert.equal(clearTorpedoCorridor(o.scan, from, target, 'EMPIRE', 1000), false);
  assert.equal(clearTorpedoCorridor(o.scan, from, target, 'FEDERATION', 6001), false);
  o.scan.cells = o.scan.cells.filter(c => !(c.v === 20 && c.h === 30));
  assert.equal(clearTorpedoCorridor(o.scan, from, target, 'FEDERATION', 1000), false);
});

// Independent source-derived CHECK composition in TESTS only. Rational
// arithmetic checks the geometry and strict CHKPNT branches; this is not
// original-executable verification or an exhaustive PDP-10 rounding proof.
test('Corridor contains CHECK board reads for all legal aim directions and sampled extreme drift', () => {
  for (const from of [{ v: 38, h: 38 }, { v: 3, h: 73 }]) {
    for (let dv = -10; dv <= 10; dv++) for (let dh = -10; dh <= 10; dh++) {
      const target = { v: from.v + dv, h: from.h + dh };
      if ((!dv && !dh) || target.v < 1 || target.v > 75 || target.h < 1 || target.h > 75) continue;
      const corridor = new Set(torpedoCorridor(from, target).map(positionKey));
      for (const drift of ['-.2', '-.1', '0', '.1', '.2']) {
        const out = { h1: 0n, v1: 0n, h2: 0n, v2: 0n, dcode: 0n, dhs: real.literal('0'), dvs: real.literal('0') };
        check({ value: BigInt(from.v) }, { value: BigInt(from.h) }, { value: BigInt(dv) }, { value: BigInt(dh) },
          { value: 10n }, { value: real.literal(drift) }, out, new CheckLocals(real.literal('0')), {
            real, ran: () => real.literal('.5'),
            ingal: (a, b) => a >= 1n && a <= 75n && b >= 1n && b <= 75n,
            disp: (v, h) => { assert.ok(corridor.has(`${v},${h}`), `${dv},${dh} drift ${drift}: ${v},${h}`); return 0n; },
          });
      }
    }
  }
});

test('Planet corridor exception permits only the selected enemy or neutral planet', () => {
  const o = observation(), target = { v: 20, h: 23 };
  const targetCell = o.scan.cells.find(c => c.v === 20 && c.h === 23)!;
  targetCell.symbol = '@E';
  const clear = () => clearTorpedoCorridor(o.scan, o.status.position, target, 'FEDERATION', 1000, true);
  assert.equal(clearTorpedoCorridor(o.scan, o.status.position, target, 'FEDERATION', 1000), false);
  assert.equal(clear(), true);
  targetCell.symbol = ' @'; assert.equal(clear(), true);
  for (const symbol of ['@F', ' *']) { targetCell.symbol = symbol; assert.equal(clear(), false); }
  targetCell.symbol = '@E';
  const beyond = o.scan.cells.find(c => c.v === 20 && c.h === 25)!;
  for (const symbol of ['@E', '@F', ' @', ' *']) { beyond.symbol = symbol; assert.equal(clear(), false); }
  beyond.symbol = ' .'; beyond.observedAt = -6000;
  assert.equal(clear(), false);
});
