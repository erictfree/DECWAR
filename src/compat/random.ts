import { HALF_MASK, MAX_INTEGER, multiply36, signed36 } from './word36.ts';

// WARMAC.MAC:2716-2753. One generator belongs to one low segment/session.
export class DecwarRandom {
  seed: bigint;
  constructor(seed: bigint) { this.seed = signed36(seed); }
  setran(seed: bigint, millisecondsSinceMidnight: bigint): void {
    this.seed = signed36(seed === 0n ? millisecondsSinceMidnight : seed);
  }
  // RAN. returns an INTEGER quotient. This is not the public floating RAN.
  nextRaw(): bigint {
    let next = this.seed;
    if ((next & HALF_MASK) === 0n) next = (next & ~HALF_MASK) | 260543n;
    this.seed = multiply36(next, 260543n) & MAX_INTEGER;
    return this.seed / 257n;
  }
  iran(n: bigint): bigint {
    const raw = this.nextRaw();
    // No source range guard: zero faults after advancing SEED, and signed
    // divisors retain integer remainder behavior. Raw CPU effects live in random-runtime.
    return (raw % n + 1n) & HALF_MASK; // MOVEI, not MOVE: preserve 18-bit result.
  }
}
