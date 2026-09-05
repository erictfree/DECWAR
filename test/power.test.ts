import test from 'node:test';
import assert from 'node:assert/strict';
import { power } from '../src/compat/power.ts';
import { orderedRational as real } from './support/rational-real.ts';

test('PWR negative and zero exponents return the loaded one without division', () => {
  for (const n of [-100n, -1n, 0n]) assert.equal(power('f', n, { one: () => 'one', fmpr() { return assert.fail(); } }), 'one');
});
test('PWR exponents 1..4 use the source left-associated FMPR sequence', () => {
  for (const [n, expected] of [[1n, 'f'], [2n, '(f*f)'], [3n, '((f*f)*f)'], [4n, '(((f*f)*f)*f)']] as const) {
    let ones = 0; const result = power('f', n, { one() { ones++; return '1'; }, fmpr: (a, b) => `(${a}*${b})` });
    assert.equal(result, expected); assert.equal(ones, 1);
  }
});
test('PWR recursively squares the half power before an odd final multiply', () => {
  const io = { one: () => '1', fmpr: (a: string, b: string) => `(${a}*${b})` };
  assert.equal(power('f', 5n, io), '(((f*f)*(f*f))*f)');
  assert.equal(power('f', 6n, io), '(((f*f)*f)*((f*f)*f))');
  assert.equal(power('f', 10n, io), '((((f*f)*(f*f))*f)*(((f*f)*(f*f))*f))');
});
test('PWR uses each opaque rounded result rather than collapsing operations into exponentiation', () => {
  const events: string[] = []; let serial = 0;
  const value = power('f', 10n, { one: () => 'one', fmpr(a, b) { events.push(`${a},${b}`); return 'r' + ++serial; } });
  assert.deepEqual(events, ['f,f', 'r1,r1', 'r2,f', 'r3,r3']); assert.equal(value, 'r4');
});
test('PWR rational fixture checks magnitudes and signed-word exponent interpretation', () => {
  const io = { one: () => real.literal('1.0'), fmpr: real.multiply };
  assert.equal(real.toInteger(power(real.literal('2'), 13n, io)), 8192n);
  assert.equal(real.toInteger(power(real.literal('2'), (1n << 36n) - 1n, io)), 1n);
});
