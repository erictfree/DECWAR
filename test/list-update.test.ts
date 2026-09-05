import test from 'node:test';
import assert from 'node:assert/strict';
import { updateListSelection } from '../src/game/list-update.ts';
import type { ListSelection } from '../src/game/list-update.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { MAX_INTEGER, MIN_INTEGER } from '../src/compat/word36.ts';

const bits = (...values: number[]) => BigInt(values.reduce((a, b) => a | b, 0));
function fixture() {
  const s: ListSelection = { svpos: 1, shpos: 1, vpos: 3, hpos: 4, side: 2, team: 1, password: false,
    range: 75n, gxf: bits(K.LSTBIT, K.IRNBIT), xf: 999n, imask: 0n, grpbts: 0n, txf: 0n,
    clsest: 999n, vposc: 60, hposc: 60 };
  const mask = { value: 0n }, count = { value: 0n }, scan = { value: 0n }, summary = { value: 0n };
  const run = () => updateListSelection(s, mask, count, scan, summary);
  return { s, mask, count, scan, summary, run };
}

test('LSTUPD within sensor range adds all flags and increments on repeated selection even when mask was already set', () => {
  const f = fixture(); f.run(); f.run(); assert.equal(f.mask.value, f.s.gxf); assert.equal(f.count.value, 2n);
  assert.equal(f.summary.value, f.s.gxf); assert.equal(f.s.grpbts, f.s.gxf); assert.equal(f.s.txf, 0n);
});

test('LSTUPD range boundary is inclusive; rejected objects still update summary but only distance group bits', () => {
  const f = fixture(); f.s.range = 2n; f.run();
  assert.equal(f.count.value, 0n); assert.equal(f.mask.value, 0n); assert.equal(f.s.grpbts, BigInt(K.IRNBIT));
  assert.equal(f.summary.value, f.s.gxf); f.s.range = 3n; f.run(); assert.equal(f.count.value, 1n);
});

test('LSTUPD friendly and privileged objects bypass sensor visibility but still obey requested range', () => {
  for (const password of [false, true]) {
    const f = fixture(); f.s.vpos = 40; f.s.password = password; if (!password) f.s.side = 1;
    f.run(); assert.equal(f.count.value, 1n); assert.equal(f.s.txf, 0n);
    assert.equal(f.s.xf, f.s.gxf | (password ? BigInt(K.PASBIT) : 0n));
    f.s.range = 5n; f.run(); assert.equal(f.count.value, 1n);
  }
});

test('LSTUPD unseen enemy sets out-of-range/known flags and target summary without selecting an object', () => {
  const f = fixture(); f.s.vpos = 40; f.run();
  assert.equal(f.s.xf, bits(K.LSTBIT, K.IRNBIT, K.ORNBIT, K.KNOBIT));
  assert.equal(f.s.txf, f.s.xf); assert.equal(f.s.grpbts, bits(K.IRNBIT, K.ORNBIT, K.KNOBIT));
  assert.equal(f.count.value, 0n); assert.equal(f.summary.value, f.s.xf);
});

test('LSTUPD source scan mask ANDs with team number, including all-team minus-one scan', () => {
  for (const team of [1, 2]) for (const scan of [0n, 1n, 2n, -1n]) {
    const f = fixture(); f.s.team = team; f.s.side = 3; f.s.vpos = 40; f.scan.value = scan;
    f.run(); assert.equal(f.count.value, (scan & BigInt(team)) !== 0n ? 1n : 0n);
    assert.ok((f.s.txf & BigInt(K.ORNBIT)) !== 0n);
  }
});

test('LSTUPD whole-game summary admits an unseen enemy outside requested range and bypasses closest without list flag', () => {
  const f = fixture(); f.s.gxf = bits(K.IGMBIT, K.LSTBIT, K.SUMBIT); f.s.vpos = 40; f.s.range = 2n;
  f.s.imask = BigInt(K.CLSBIT); f.run();
  assert.equal(f.count.value, 1n); assert.equal(f.mask.value, bits(K.IGMBIT, K.ORNBIT, K.SUMBIT));
  assert.equal(f.s.txf, bits(K.IGMBIT, K.ORNBIT, K.SUMBIT, K.LSTBIT)); assert.equal(f.s.clsest, 999n);
});

test('LSTUPD IGMBIT excludes KNOBIT from object flags but retains KNOBIT in the group', () => {
  const f = fixture(); f.s.gxf = bits(K.IGMBIT, K.SUMBIT); f.s.vpos = 40; f.run();
  assert.equal(f.s.xf & BigInt(K.KNOBIT), 0n); assert.equal(f.s.grpbts & BigInt(K.KNOBIT), BigInt(K.KNOBIT));
});

test('LSTUPD closest uses Chebyshev distance and later equal-distance objects replace earlier coordinates without counting', () => {
  const f = fixture(); f.s.imask = BigInt(K.CLSBIT); f.run();
  assert.equal(f.s.clsest, 3n); assert.deepEqual([f.s.vposc, f.s.hposc], [3, 4]);
  f.s.vpos = 4; f.s.hpos = 1; f.run(); assert.deepEqual([f.s.vposc, f.s.hposc], [4, 1]);
  f.s.vpos = 5; f.run(); assert.deepEqual([f.s.vposc, f.s.hposc], [4, 1]);
  assert.equal(f.count.value, 0n); assert.equal(f.mask.value, 0n); assert.equal(f.s.grpbts, BigInt(K.IRNBIT));
  assert.equal(f.summary.value, f.s.gxf);
});

test('LSTUPD argument aliasing retains source mask-write then counter-increment then summary-OR ordering', () => {
  const f = fixture(), dummy = { value: 7n };
  updateListSelection(f.s, dummy, dummy, { value: -1n }, dummy);
  assert.equal(dummy.value, 32777n); // (7 OR 32769) = 32775, +1, then OR 32769.
  assert.equal(f.s.grpbts, f.s.gxf);
});

test('LSTUPD increments counters as 36-bit words and preserves unrelated preexisting flags', () => {
  const f = fixture(); f.count.value = MAX_INTEGER; f.mask.value = 128n; f.summary.value = 256n; f.s.grpbts = 512n;
  f.run(); assert.equal(f.count.value, MIN_INTEGER); assert.equal(f.mask.value, 128n | f.s.gxf);
  assert.equal(f.summary.value, 256n | f.s.gxf); assert.equal(f.s.grpbts, 512n | f.s.gxf);
});
