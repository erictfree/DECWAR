import { rightHalf,signed36 } from './word36.ts';
import type { FieldStack,NumberRegisters,NumberServices } from './field-output.ts';

export type NumericTargets={onum:bigint;osn1:bigint;osn2:bigint;osn3:bigint};
export type NumericWrapperServices<W>=FieldStack<W>&{
  argument(index:0|1):bigint; // Actual @index(ARG) read, including live ARG/addressing.
  callNumber(target:bigint):Generator<W,void,void>; // PUSHJ P,(T1); target is resolved at the call.
};
// WARMAC ODEC/OSDEC:2340-2349. Unlike internal ODEC., restore the caller's
// width and radix. T1 remains live between selecting and calling the entry.
export function* outputDecimalArgument<W>(r:NumberRegisters,entry:'odec'|'osdec',s:NumericTargets,
  io:NumericWrapperServices<W>):Generator<W,void,void>{
  r.t1=entry==='osdec'?signed36(s.osn1):rightHalf(s.onum);
  yield*io.pushData(r.x1);yield*io.pushData(r.x2);yield*io.pushData(r.x3);
  r.x1=signed36(io.argument(0));r.x2=signed36(io.argument(1));r.x3=10n;
  yield*io.callNumber(rightHalf(r.t1));
  r.x3=signed36(yield*io.popData());r.x2=signed36(yield*io.popData());r.x1=signed36(yield*io.popData());
}

export type FixedPointServices<W>=NumericWrapperServices<W>&Pick<NumberServices<W>,'movm'|'ochr'>&{
  idiviX1(divisor:bigint):Generator<W,void,void>; // Live X1/X2 quotient/remainder, CPU failure effects.
};
// WARMAC OFLT/OSFLT:2362-2381. Integer tenths, not host floating point.
// OSFLT reads argument zero twice; OFLG and fractional X4 are read after calls.
export function* outputTenthsArgument<W>(r:NumberRegisters,state:{oflg:bigint},entry:'oflt'|'osflt',s:NumericTargets,
  io:FixedPointServices<W>):Generator<W,void,void>{
  if(entry==='osflt')r.t1=signed36(io.argument(0))>0n?rightHalf(s.osn2):signed36(s.osn3);
  else r.t1=rightHalf(s.onum);
  yield*io.pushData(r.x1);yield*io.pushData(r.x2);yield*io.pushData(r.x3);yield*io.pushData(r.x4);
  r.x1=signed36(io.argument(0));yield*io.idiviX1(10n);yield*io.movm('x4',r.x2);
  r.x2=signed36(io.argument(1));r.x3=10n;yield*io.callNumber(rightHalf(r.t1));
  if(state.oflg>=0n){r.c=46n;yield*io.ochr();r.c=rightHalf(48n+r.x4);yield*io.ochr();}
  r.x4=signed36(yield*io.popData());r.x3=signed36(yield*io.popData());
  r.x2=signed36(yield*io.popData());r.x1=signed36(yield*io.popData());
}

export type TwoDigitServices<W>=FieldStack<W>&Pick<FixedPointServices<W>,'idiviX1'|'ochr'>;
// WARMAC O2DG./O2DB.:2180-2204. O2DG masks the first remainder through
// MOVEI before dividing it; O2DB does not discard hundreds. Neither rounds.
export function* outputTwoDigits<W>(r:Pick<NumberRegisters,'x1'|'x2'|'c'>,entry:'o2dg'|'o2db',
  io:TwoDigitServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.x1);yield*io.pushData(r.x2);
  if(entry==='o2dg'){yield*io.idiviX1(100n);r.x1=rightHalf(r.x2);}
  yield*io.idiviX1(10n);r.c=rightHalf(48n+r.x1);
  if(entry==='o2db'&&r.c===48n)r.c=32n;
  yield*io.ochr();r.c=rightHalf(48n+r.x2);yield*io.ochr();
  r.x2=signed36(yield*io.popData());r.x1=signed36(yield*io.popData());
}
