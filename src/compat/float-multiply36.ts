import { normalizedFloatDyadic } from './ran-float36.ts';
import { signed36 } from './word36.ts';

export type FloatMultiplyResult={word:bigint;trap1:boolean;overflow:boolean;floatingOverflow:boolean;floatingUnderflow:boolean};

// DEC Processor Reference, June 1982, pp. 1-21–22 and 2-19–20.
// FMPR for normalized single words (or zero). The 54-bit product is exact;
// normalization and half-away-from-zero rounding occur before exponent checks.
// Returned flags are newly raised conditions, not a replacement for sticky CPU
// flags. Monitor trap delivery is the caller's responsibility. Unnormalized
// input is deliberately unsupported; see docs/platform-manuals.md.
export function multiplyRoundedFloat36(left:bigint,right:bigint):FloatMultiplyResult{
  const a=normalizedFloatDyadic(left),b=normalizedFloatDyadic(right);
  let fraction=a.significand*b.significand;
  if(fraction===0n)return {word:0n,trap1:false,overflow:false,floatingOverflow:false,floatingUnderflow:false};
  // Inputs have 27 significant bits; their product has 53 or 54.
  const shift=fraction>=(1n<<53n)?27n:26n;
  const dropped=fraction&((1n<<shift)-1n);
  fraction>>=shift;
  if(dropped>=(1n<<(shift-1n)))fraction++;
  let exponent=a.exponent+b.exponent+shift+27n;
  if(fraction===(1n<<27n)){fraction>>=1n;exponent++;}
  const underflow=exponent< -128n,overflow=underflow||exponent>127n;
  const magnitude=(((exponent+128n)&255n)<<27n)|fraction;
  return {word:signed36(a.sign*b.sign*magnitude),trap1:overflow,overflow,floatingOverflow:overflow,floatingUnderflow:underflow};
}
