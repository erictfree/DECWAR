import { signed36 } from './word36.ts';

export type PowerServices<R> = { one(): R; fmpr(left: R, right: R): R };
// WARMAC.MAC:2762-2794. Small powers multiply left-to-right; larger powers
// recurse, square the result, then multiply once for odd exponents. Negative
// exponents return the source's HRLZI 1.0, not a reciprocal. FMPR rounding and
// the loaded floating word remain required machine services.
export function power<R>(base: R, exponent: bigint, io: PowerServices<R>): R {
  const n = signed36(exponent);
  if (n < 5n) {
    let result = io.one();
    if (n >= 1n) result = base;
    if (n >= 2n) result = io.fmpr(result, base);
    if (n >= 3n) result = io.fmpr(result, base);
    if (n >= 4n) result = io.fmpr(result, base);
    return result;
  }
  const half = power(base, n / 2n, io);
  let result = io.fmpr(half, half);
  if (n % 2n !== 0n) result = io.fmpr(result, base);
  return result;
}
