import test from 'node:test';
import assert from 'node:assert/strict';
import { check, checkPoint, CheckLocals } from '../src/game/check.ts';
import type { CheckOutput, CheckServices } from '../src/game/check.ts';
import { rational as real } from './support/rational-real.ts';
import type { Rational } from './support/rational-real.ts';
import { PackedBoard, ingal } from '../src/compat/board.ts';

function fixture(h = 10n, v = 20n, dh = 4n, dv = 2n, dist = 4n, displ = '0.0') {
  const board = new PackedBoard(), events: string[] = [], local = new CheckLocals(real.literal('99'));
  const out: CheckOutput<Rational> = { h1: 91n, v1: 92n, h2: 93n, v2: 94n, dcode: 95n, dhs: real.literal('96'), dvs: real.literal('97') };
  const io: CheckServices<Rational> = {
    real, ingal: (a, b) => ingal(Number(a), Number(b)),
    disp(a, b) { events.push(`disp:${a},${b}`); return BigInt(board.disp(Number(a), Number(b))); },
    ran(zero) { assert.equal(zero, 0); events.push('ran'); return real.literal('.75'); },
  };
  const args = [{ value: h }, { value: v }, { value: dh }, { value: dv }, { value: dist }, { value: real.literal(displ) }] as const;
  return { board, events, local, out, io, args, run: () => check(...args, out, local, io) };
}
const coordinates = (o: CheckOutput<Rational>) => [o.h1, o.v1, o.h2, o.v2, o.dcode];

test('CHKPNT strict integer hundredths include .41 through .59, excluding .40 and .60', () => {
  for (const [text, expected] of [['12.40', [12n, 0n]], ['12.4099', [12n, 0n]], ['12.41', [12n, 13n]],
    ['12.50', [12n, 13n]], ['12.5999', [12n, 13n]], ['12.60', [13n, 0n]]] as const) {
    const c1 = { value: -1n }, c2 = { value: -2n }; checkPoint(real.literal(text), c1, c2, real);
    assert.deepEqual([c1.value, c2.value], expected, text);
  }
});

test('CHKPNT negative and small values retain INT toward zero and signed MOD behavior', () => {
  for (const [text, expected] of [['-12.5', [-12n, 0n]], ['-.5', [0n, 0n]], ['.5', [0n, 1n]], ['0', [0n, 0n]]] as const) {
    const c1 = { value: 77n }, c2 = { value: 88n }; checkPoint(real.literal(text), c1, c2, real); assert.deepEqual([c1.value, c2.value], expected);
  }
});

test('CHKPNT writes aliases in C1 then C2 order and rereads C1 for the second candidate', () => {
  const ref = { value: 99n }; checkPoint(real.literal('12.5'), ref, ref, real); assert.equal(ref.value, 13n);
  checkPoint(real.literal('12.2'), ref, ref, real); assert.equal(ref.value, 0n);
});

test('CHECK visits both fractional candidates before each RAN and uses physical board-coordinate order', () => {
  const f = fixture(); f.run(); assert.deepEqual(coordinates(f.out), [14n, 22n, 14n, 22n, 0n]);
  assert.deepEqual(f.events, ['disp:11,20', 'disp:11,21', 'ran', 'disp:12,21', 'disp:13,21', 'disp:13,22', 'ran', 'disp:14,22']);
  assert.equal(real.toInteger(f.out.dhs), 1n); assert.equal(real.toInteger(real.multiply(f.out.dvs, real.fromInteger(2n))), 1n); assert.equal(f.local.i, 5n);
});

test('CHECK other dominant axis preserves symmetric read and random order', () => {
  const f = fixture(20n, 10n, 2n, 4n); f.run(); assert.deepEqual(coordinates(f.out), [22n, 14n, 22n, 14n, 0n]);
  assert.deepEqual(f.events, ['disp:20,11', 'disp:21,11', 'ran', 'disp:21,12', 'disp:21,13', 'disp:22,13', 'ran', 'disp:22,14']);
});

test('CHECK straight lines and ties select the first branch and perform no random calls', () => {
  for (const [dh, dv, expected] of [[4n, 0n, [14n, 20n]], [0n, 4n, [10n, 24n]], [-4n, 0n, [6n, 20n]],
    [0n, -4n, [10n, 16n]], [4n, 4n, [14n, 24n]], [-4n, -4n, [6n, 16n]]] as const) {
    const f = fixture(10n, 20n, dh, dv); f.run(); assert.deepEqual([f.out.h1, f.out.v1], expected); assert.ok(!f.events.includes('ran'));
    assert.equal(f.events.length, 4); assert.equal(f.local.iv1.value !== 0n, dh !== 0n);
  }
});

test('CHECK first candidate collision stops before random and rereads DISP at label 800', () => {
  const f = fixture(); let reads = 0; f.io.disp = (a, b) => { assert.deepEqual([a, b], [11n, 20n]); return ++reads === 1 ? 102n : 203n; };
  f.run(); assert.deepEqual(coordinates(f.out), [10n, 20n, 11n, 20n, 203n]); assert.equal(reads, 2); assert.deepEqual(f.events, []);
});

test('CHECK second candidate collision preserves prior clear position without RAN on either dominant axis', () => {
  for (const vertical of [false, true]) {
    const f = vertical ? fixture(20n, 10n, 2n, 4n) : fixture();
    f.board.setdsp(vertical ? 21 : 11, vertical ? 11 : 21, 501); f.run();
    assert.deepEqual(coordinates(f.out), vertical ? [20n, 10n, 21n, 11n, 501n] : [10n, 20n, 11n, 21n, 501n]);
    assert.equal(f.events.length, 3); assert.ok(!f.events.includes('ran'));
  }
});

test('CHECK advances the last clear position before a later collision and traverses negative sentinels', () => {
  const f = fixture(10n, 20n, 4n, 0n); f.board.setdsp(11, 20, -1); f.board.setdsp(13, 20, 301); f.run();
  assert.deepEqual(coordinates(f.out), [12n, 20n, 13n, 20n, 301n]); assert.equal(f.local.i, 3n);
});

test('CHECK dominant-axis galaxy exits reset object coordinates without a collision code', () => {
  for (const f of [fixture(74n, 20n, 4n, 0n), fixture(20n, 74n, 0n, 4n)]) {
    f.run(); assert.deepEqual([f.out.h2, f.out.v2], [f.out.h1, f.out.v1]); assert.equal(f.out.dcode, 0n); assert.equal(f.events.length, 1);
  }
});

test('CHECK fractional second candidate outside the galaxy discards the first clear candidate and skips RAN', () => {
  for (const f of [fixture(10n, 75n, 4n, 2n), fixture(75n, 10n, 2n, 4n)]) {
    f.run(); assert.deepEqual(coordinates(f.out), [f.args[0].value, f.args[1].value, f.args[0].value, f.args[1].value, 0n]);
    assert.equal(f.events.length, 1); assert.ok(!f.events.includes('ran'));
  }
});

test('CHECK fractional first candidate outside the galaxy causes no board read', () => {
  const f = fixture(10n, 1n, 4n, -4n); f.run(); assert.deepEqual(coordinates(f.out), [10n, 1n, 10n, 1n, 0n]); assert.deepEqual(f.events, []);
});

test('CHECK displacement is added per step to the minor axis, independent of direction sign', () => {
  const f = fixture(10n, 20n, -4n, 0n, 4n, '.25'); f.run(); assert.deepEqual(coordinates(f.out), [6n, 21n, 6n, 21n, 0n]);
  assert.equal(f.events.filter(e => e === 'ran').length, 1);
});

test('CHECK low versus high RAN chooses different final cells only after identical collision checks', () => {
  const f = fixture(10n, 20n, 2n, 1n, 1n); f.io.ran = () => real.literal('0.0'); f.run(); assert.deepEqual(coordinates(f.out), [11n, 20n, 11n, 20n, 0n]);
  const g = fixture(10n, 20n, 2n, 1n, 1n); g.run(); assert.deepEqual(coordinates(g.out), [11n, 21n, 11n, 21n, 0n]);
  assert.deepEqual(f.events, g.events.filter(e => e !== 'ran'));
});

test('CHECK captures DO distance at entry to the loop even when later board reads mutate its argument', () => {
  const f = fixture(10n, 20n, 4n, 0n), disp = f.io.disp;
  f.io.disp = (a, b) => { Object.assign(f.args[4], { value: 1n }); return disp(a, b); }; f.run(); assert.equal(f.out.h1, 14n); assert.equal(f.local.i, 5n);
});

test('CHECK nonpositive distances expose compiler DO policy after computing increments', () => {
  const f = fixture(10n, 20n, 4n, 0n, 0n); assert.throws(f.run, /reversed DO/); assert.equal(f.out.h2, 10n); assert.equal(f.out.v2, 94n);
  f.io.reversedLoop = (first, last) => { assert.deepEqual([first, last], [1n, 0n]); return { iterations: [], after: 1n }; };
  f.run(); assert.deepEqual(coordinates(f.out), [10n, 20n, 10n, 20n, 0n]); assert.deepEqual(f.events, []);
});

test('CHECK does not add a zero-direction guard and exposes the arithmetic service trap after initial writes', () => {
  const f = fixture(10n, 20n, 0n, 0n); assert.throws(f.run, /division by zero/);
  assert.deepEqual(coordinates(f.out), [10n, 20n, 93n, 94n, 0n]); assert.equal(real.toInteger(f.out.dhs), 1n);
});
