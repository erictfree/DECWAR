import { normalizedFloatDyadic } from './ran-float36.ts';
import { multiplyRoundedFloat36 } from './float-multiply36.ts';
import { signed36 } from './word36.ts';

export type FloatArithmeticResult={word:bigint;trap1:boolean;overflow:boolean;floatingOverflow:boolean;floatingUnderflow:boolean;noDivide:boolean};
const clear={trap1:false,overflow:false,floatingOverflow:false,floatingUnderflow:false,noDivide:false};

// Exact intermediary for NORMALIZED single operands. DEC Processor Reference
// pp. 2-17–21: their significant add/subtract bits and complete product fit the
// hardware's extended fraction. Division's extra quotient bit implements the
// same nearest, midpoint-away rounding. This is not unnormalized arithmetic.
function roundedRatio(numerator:bigint,denominator:bigint,scale:bigint,round=true):FloatArithmeticResult{
  if(numerator===0n)return {word:0n,...clear};
  const sign=numerator<0n?-1n:1n;let n=numerator*sign,d=denominator;
  let exponent=scale;
  while(n>=d){d<<=1n;exponent++;}
  while((n<<1n)<d){n<<=1n;exponent--;}
  // n/d is now a normalized fraction with its scale recorded in exponent.
  n<<=27n;let fraction=n/d;
  if(round&&(n%d)*2n>=d)fraction++;
  if(fraction===(1n<<27n)){fraction>>=1n;exponent++;}
  const underflow=exponent< -128n,overflow=underflow||exponent>127n;
  const magnitude=(((exponent+128n)&255n)<<27n)|fraction;
  return {word:signed36(sign*magnitude),trap1:overflow,overflow,floatingOverflow:overflow,floatingUnderflow:underflow,noDivide:false};
}

// WARMAC ANUM accumulates positive magnitudes and applies the sign afterward.
// FAD/FDV here therefore need only normalized NONNEGATIVE operands. This
// restriction avoids pretending to implement the KI's signed unrounded shift
// edge cases (Processor Reference p. 2-22, footnote 8). An integer-overflowed
// negative accumulator followed by '.' requires a broader CPU binding.
export function unroundedPositiveFloat36(op:'add'|'div',left:bigint,right:bigint):FloatArithmeticResult{
  const a=normalizedFloatDyadic(left),b=normalizedFloatDyadic(right);
  if(a.sign<0n||b.sign<0n)throw new RangeError('ANUM unrounded float binding requires nonnegative operands');
  if(op==='div'){
    if(b.significand===0n)return {word:signed36(left),trap1:true,overflow:true,floatingOverflow:true,floatingUnderflow:false,noDivide:true};
    return roundedRatio(a.significand,b.significand,a.exponent-b.exponent,false);
  }
  const exponent=a.exponent<b.exponent?a.exponent:b.exponent;
  return roundedRatio((a.significand<<(a.exponent-exponent))+(b.significand<<(b.exponent-exponent)),1n,exponent,false);
}
export function roundedFloat36(op:'add'|'sub'|'mul'|'div',left:bigint,right:bigint):FloatArithmeticResult{
  if(op==='mul')return {...multiplyRoundedFloat36(left,right),noDivide:false};
  const a=normalizedFloatDyadic(left),b=normalizedFloatDyadic(right);
  if(op==='div'){
    if(b.significand===0n)return {word:signed36(left),trap1:true,overflow:true,floatingOverflow:true,floatingUnderflow:false,noDivide:true};
    return roundedRatio(a.sign*b.sign*a.significand,b.significand,a.exponent-b.exponent);
  }
  const exponent=a.exponent<b.exponent?a.exponent:b.exponent;
  const x=(a.sign*a.significand)<<(a.exponent-exponent),y=(b.sign*b.significand)<<(b.exponent-exponent);
  return roundedRatio(op==='add'?x+y:x-y,1n,exponent);
}

// FLTR, printed p. 2-28.1: all 36-bit integers can be floated; low precision may
// be lost. FIX, p. 2-28, checks exponent >35 BEFORE touching the destination.
export function floatInteger36(integer:bigint):bigint{return roundedRatio(signed36(integer),1n,0n).word;}
export function fixFloat36(operand:bigint,previousDestination:bigint):FloatArithmeticResult{
  const n=normalizedFloatDyadic(operand);
  if(n.significand!==0n&&n.exponent+27n>35n)return {word:signed36(previousDestination),...clear,trap1:true,overflow:true};
  const magnitude=n.exponent>=0n?n.significand<<n.exponent:n.significand>>(-n.exponent);
  return {word:signed36(n.sign*magnitude),...clear};
}

// Named compiler-literal policy, not evidence of the archived compiler's
// decimal conversion algorithm. FORTRAN V5 p. 3-3 specifies 27-bit rounding;
// this policy selects nearest with midpoint ties away. No host Number parsing.
export function nearestDecimalFloat36(text:string):FloatArithmeticResult{
  const match=/^([+-]?)(\d*)(?:\.(\d*))?(?:[Ee]([+-]?\d+))?$/.exec(text);
  if(!match||!(match[2]||match[3]))throw new RangeError('Invalid decimal REAL literal');
  let n=BigInt((match[2]||'0')+(match[3]||'')),d=1n;
  const exponent=BigInt(match[4]||'0')-BigInt((match[3]||'').length);
  if(exponent< -1000n||exponent>1000n)throw new RangeError('Decimal REAL literal outside supported conversion domain');
  if(exponent>=0n)n*=10n**exponent;else d=10n**(-exponent);
  return roundedRatio(match[1]==='-'?-n:n,d,0n);
}
