import { signed36,unsigned36 } from './word36.ts';
// DEC processor reference (June 1982), printed pp. 1-21 and 2-28.5;
// see docs/platform-manuals.md. This is only WARMAC RAN's proven nonnegative,
// 27-bit input domain for FSC T0,200, not a general FSC implementation.
export function ranFractionWord(raw:bigint):bigint{
  if(raw<0n||raw>=(1n<<27n))throw new RangeError('RAN fraction requires a nonnegative 27-bit quotient');
  if(raw===0n)return 0n;
  let fraction=raw,exponent=128n;
  while(fraction<(1n<<26n)){fraction<<=1n;exponent--;}
  return (exponent<<27n)|fraction;
}
// Decode a normalized standard-range word exactly as a dyadic value. No host
// floating point or rounding occurs. Non-normalized operands need their own
// machine instruction policy and are deliberately outside this codec's domain.
export function normalizedFloatDyadic(word:bigint):{sign:1n|-1n;significand:bigint;exponent:bigint}{
  const value=signed36(word);if(value===0n)return {sign:1n,significand:0n,exponent:0n};
  const sign=value<0n?-1n:1n,magnitude=unsigned36(value<0n?-value:value),fraction=magnitude&((1n<<27n)-1n);
  if((magnitude>>35n)!==0n||fraction<(1n<<26n))throw new RangeError('Normalized standard-range floating word required');
  return {sign,significand:fraction,exponent:((magnitude>>27n)&255n)-128n-27n};
}
