import type { RealArithmetic } from '../../src/compat/real.ts';

// Exact mathematical fixture ONLY: no PDP-10 rounding/exponent/trap claim.
export type Rational = { n: bigint; d: bigint };
const r = (n: bigint, d = 1n): Rational => {
  if (d === 0n) throw new RangeError('fixture division by zero');
  return d < 0n ? { n: -n, d: -d } : { n, d };
};
export const rational: RealArithmetic<Rational> = {
  literal(text) {
    const negative = text.startsWith('-'), [whole, fraction = ''] = text.replace(/^[+-]/, '').split('.');
    return r(BigInt((whole || '0') + fraction) * (negative ? -1n : 1n), 10n ** BigInt(fraction.length));
  },
  fromInteger: n => r(n), toInteger: a => a.n / a.d,
  add: (a, b) => r(a.n * b.d + b.n * a.d, a.d * b.d),
  subtract: (a, b) => r(a.n * b.d - b.n * a.d, a.d * b.d),
  multiply: (a, b) => r(a.n * b.n, a.d * b.d),
  divide: (a, b) => r(a.n * b.d, a.d * b.n),
};

// Comparison/AMAX1 fixture for source control flow, not FORLIB edge semantics.
export const orderedRational = {
  ...rational,
  compare(a: Rational, b: Rational): -1 | 0 | 1 { const d = a.n * b.d - b.n * a.d; return d < 0n ? -1 : d > 0n ? 1 : 0; },
  amax1(a: Rational, b: Rational): Rational { return a.n * b.d >= b.n * a.d ? a : b; },
};
