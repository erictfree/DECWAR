import type { WordMemory } from './memory.ts';
import { rightHalf,signed36 } from './word36.ts';

export type TableOutputRegisters={t1:bigint;t2:bigint;p1:bigint};
export type TableOutputServices<W>={
  argument(index:0|1):bigint; // Live @index(ARG), including actual argument addressing.
  ostr():Generator<W,void,void>; // Current P1 through OSTR.
  space():Generator<W,void,void>;
};
export type ObjectOutputServices<W>=TableOutputServices<W>&{
  idiviT1(divisor:bigint):Generator<W,void,void>; // T1/T2, including CPU failure/flags.
  indirectAddress(address:bigint):Generator<W,bigint,void>; // Effective address of @table(T1); honor indexed/indirect table words.
};
// WARMAC ODISP:2393-2405. OFLG is tested separately at both skips. The
// space argument is read only after string output. No ship-index validation.
export function* outputObject<W>(r:TableOutputRegisters,state:{oflg:bigint},s:{shtdsp:bigint;lngdsp:bigint},
  io:ObjectOutputServices<W>):Generator<W,void,void>{
  r.t1=signed36(io.argument(0));if(r.t1<0n)r.t1=0n;
  yield*io.idiviT1(100n);if(r.t1>10n){r.t1=0n;r.t2=0n;}
  if(state.oflg<=0n)r.p1=rightHalf(yield*io.indirectAddress(rightHalf(s.shtdsp+r.t1)));
  if(state.oflg>0n)r.p1=rightHalf(yield*io.indirectAddress(rightHalf(s.lngdsp+r.t1)));
  yield*io.ostr();if(signed36(io.argument(1))>0n)yield*io.space();
}

// WARMAC ODEV:2464-2472. Short entries are inline ASCIZ words; medium
// and long entries are pointer words. Each format predicate reads live OFLG.
export function* outputDevice<W>(m:WordMemory,r:TableOutputRegisters,state:{oflg:bigint},
  s:{shtdev:bigint;meddev:bigint;lngdev:bigint},io:TableOutputServices<W>):Generator<W,void,void>{
  r.t1=signed36(io.argument(0));
  if(state.oflg<0n)r.p1=rightHalf(s.shtdev-1n+r.t1);
  if(state.oflg===0n)r.p1=signed36(m.read(rightHalf(s.meddev-1n+r.t1)));
  if(state.oflg>0n)r.p1=signed36(m.read(rightHalf(s.lngdev-1n+r.t1)));
  yield*io.ostr();
}

export type ConditionSymbols={docked:bigint;dockedLong:bigint;dockedShort:bigint;lngcnd:bigint;shtcnd:bigint};
// WARMAC OCOND:2511-2523. WHO has no pre-game guard. The long condition
// pointer is read even in short format, before the optional short-table read.
export function* outputCondition<W>(m:WordMemory,r:TableOutputRegisters,state:{who:bigint;oflg:bigint},
  s:ConditionSymbols,io:TableOutputServices<W>):Generator<W,void,void>{
  r.t1=signed36(state.who);
  if(m.read(rightHalf(s.docked-1n+r.t1))<0n){
    r.p1=rightHalf(s.dockedLong);if(state.oflg<0n)r.p1=rightHalf(s.dockedShort);yield*io.ostr();
  }
  r.t1=signed36(io.argument(0));r.p1=signed36(m.read(rightHalf(s.lngcnd-1n+r.t1)));
  if(state.oflg<0n)r.p1=signed36(m.read(rightHalf(s.shtcnd-1n+r.t1)));
  yield*io.ostr();
}
