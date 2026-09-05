import { constants as K } from '../runtime/variant-values.ts';
import { add36 } from '../compat/word36.ts';

// BLKDAT.FOR:96-97 initializes only BITS(1:10). HISEG.FOR:28,88-89 places
// NAMES(KNPLAY,3) immediately before BITS. The caller supplies the real final
// NAMES word, so this view does not invent a FORTRAN literal-padding policy.
export function messageBits(index: number, lastNameWord: () => bigint,
  remainingBits?: (index: number) => bigint): bigint {
  if (index === 0) return lastNameWord();
  if (index >= 1 && index <= K.KNPLAY) return 1n << BigInt(index - 1);
  if (remainingBits) return remainingBits(index);
  throw new RangeError('BITS address requires uninitialized or surrounding source memory');
}

// HISEG.FOR:24,53-55: MSGFLG(1:10) is followed by HITFLG(1:10).
// MAKMSG's shift loop can walk beyond MSGFLG; ROMSPK sets up to 18 bits.
// This component view binds those stores to the same player counters used
// by GETCMD/GETHIT. Further addresses still require full HISEG memory.
export function incrementMessageAlias(players: readonly { hitflg: bigint }[], index: number): void {
  const hitIndex = index - K.KNPLAY;
  if (hitIndex < 1 || hitIndex > K.KNPLAY || !players[hitIndex])
    throw new RangeError('MAKMSG counter address beyond MSGFLG/HITFLG requires HISEG memory');
  players[hitIndex].hitflg = add36(players[hitIndex].hitflg, 1n);
}
