// Source: PARAM.FOR MAXINT; WARMAC.MAC packed words and integer instructions.
// These are word operations, not a claim that FORLIB ignores overflow traps.
export const WORD_BITS = 36n;
export const WORD_MASK = (1n << WORD_BITS) - 1n;
export const HALF_MASK = (1n << 18n) - 1n;
export const MAX_INTEGER = (1n << 35n) - 1n;
export const MIN_INTEGER = -(1n << 35n);

export function unsigned36(value: bigint): bigint { return value & WORD_MASK; }
export function signed36(value: bigint): bigint {
  return BigInt.asIntN(36, value);
}
export function add36(a: bigint, b: bigint): bigint { return signed36(a + b); }
export function multiply36(a: bigint, b: bigint): bigint { return signed36(a * b); }
export function divide36(a: bigint, b: bigint): { quotient: bigint; remainder: bigint } {
  a = signed36(a); b = signed36(b);
  if (b === 0n) throw new RangeError('PDP-10 integer divide by zero');
  const quotient = a / b; // BigInt division truncates toward zero, including negatives.
  if (quotient > MAX_INTEGER || quotient < MIN_INTEGER) throw new RangeError('PDP-10 integer divide overflow');
  return { quotient, remainder: a % b };
}
export function halfWords(left: bigint, right: bigint): bigint {
  return ((left & HALF_MASK) << 18n) | (right & HALF_MASK);
}
export function leftHalf(word: bigint): bigint { return (word >> 18n) & HALF_MASK; }
export function rightHalf(word: bigint): bigint { return word & HALF_MASK; }

// Five 7-bit characters occupy bits 35..1; bit 0 is unused.
export function packAscii(text: string): bigint {
  if (text.length > 5) throw new RangeError('One ASCII word holds at most five characters');
  let word = 0n;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 127) throw new RangeError('Only 7-bit ASCII is representable');
    word |= BigInt(code) << BigInt(29 - i * 7);
  }
  return word;
}
export function unpackAscii(word: bigint): string {
  return Array.from({ length: 5 }, (_, i) => String.fromCharCode(Number((word >> BigInt(29 - i * 7)) & 127n))).join('');
}
export function packSixbit(text: string): bigint {
  if (text.length > 6) throw new RangeError('One SIXBIT word holds at most six characters');
  let word = 0n;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 || code > 95) throw new RangeError('SIXBIT requires ASCII space through underscore');
    word |= BigInt(code - 32) << BigInt(30 - i * 6);
  }
  return word;
}
export function unpackSixbit(word: bigint): string {
  return Array.from({ length: 6 }, (_, i) => String.fromCharCode(Number((word >> BigInt(30 - i * 6)) & 63n) + 32)).join('');
}
