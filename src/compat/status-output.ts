import type { WordMemory } from './memory.ts';
import type { FieldStack,NumberRegisters } from './field-output.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';

export type StatusRegisters=NumberRegisters&{p1:bigint};
export type IdentityWord='name1'|'name2'|'speed'|'ppn'|'tty'|'job';
export type StatusSymbols={lngshp:bigint;pregameLabel:bigint;point7LeftHalf:bigint;
  player:Record<IdentityWord,bigint>; // Each address is JOB+KNPLAY*(field-1), i.e. player one.
  pregame:Record<IdentityWord,bigint>};
export type StatusServices<W>={
  ostr():Generator<W,void,void>;space():Generator<W,void,void>;spaces():Generator<W,void,void>;
  sixbit():Generator<W,void,void>;decimal():Generator<W,void,void>;octal():Generator<W,void,void>;ochr():Generator<W,void,void>;
};
// WARMAC STAT.X/STAT.Y:2603-2708. Field counters, indices, cursor and
// source words remain live across calls. No row snapshot or bounds guard.
export function* outputStatus<W>(m:WordMemory,r:StatusRegisters,state:{hcpos:bigint},entry:'stat.x'|'stat.y',
  s:StatusSymbols,io:StatusServices<W>):Generator<W,void,void>{
  const next=()=>{r.x4=add36(r.x4,1n);return r.x4<=0n;};
  const read=(field:IdentityWord)=>m.read(rightHalf(entry==='stat.y'?s.pregame[field]:s.player[field]-1n+r.x3));
  if(!next())return;
  r.p1=entry==='stat.y'?rightHalf(s.pregameLabel):m.read(rightHalf(s.lngshp-1n+r.x3));
  r.p1=signed36(halfWords(s.point7LeftHalf,rightHalf(r.p1)));r.x1=signed36(state.hcpos);
  yield*io.ostr();r.x1=add36(r.x1,-state.hcpos);r.x1=add36(r.x1,10n);yield*io.spaces();
  if(!next())return;
  yield*io.space();r.x1=read('name1');yield*io.sixbit();r.x1=read('name2');yield*io.sixbit();
  if(!next())return;
  yield*io.space();r.x1=read('speed');r.x2=4n;yield*io.decimal();
  if(!next())return;
  yield*io.space();yield*io.space();r.x1=leftHalf(read('ppn'));r.x2=-6n;yield*io.octal();
  r.c=44n;yield*io.ochr();r.x1=rightHalf(read('ppn'));r.x2=0n;yield*io.octal();
  r.x2=add36(r.x2,-6n);for(;;){r.x2=add36(r.x2,1n);if(r.x2>=0n)break;yield*io.space();}
  if(!next())return;
  yield*io.space();r.x1=read('tty');yield*io.sixbit();
  if(!next())return;
  yield*io.space();yield*io.space();r.x1=read('job');r.x2=entry==='stat.y'?2n:3n;yield*io.decimal();
}
// WARMAC STAT:2598-2599. Read player before count; MOVN is a CPU service
// so minimum-integer overflow/trap behavior is not silently invented.
export function* outputStatusArgument<W>(m:WordMemory,r:StatusRegisters,state:{hcpos:bigint},s:StatusSymbols,
  io:StatusServices<W>&{argument(index:0|1):bigint;movnX4(word:bigint):Generator<W,void,void>}):Generator<W,void,void>{
  r.x3=signed36(io.argument(1));yield*io.movnX4(signed36(io.argument(0)));yield*outputStatus(m,r,state,'stat.x',s,io);
}

export type HeaderState={versio:bigint;who:bigint;gameno:bigint;blhopt:bigint;romopt:bigint};
export type HeaderSymbols={tmp:bigint;tmpPointer:bigint;blackHoleLabel:bigint;romulanLabel:bigint};
export type HeaderServices<W>=FieldStack<W>&Pick<StatusServices<W>,'space'|'ochr'|'ostr'|'decimal'>&{
  idiviX1(divisor:bigint):Generator<W,void,void>;
  undat():Generator<W,void,void>;untim():Generator<W,void,void>; // CALLI X1,-121/-120 and JFCL continuation, no fabricated host date/time.
  ildbX1():Generator<W,bigint,void>; // Live C,X1 byte-pointer operation.
  status(entry:'stat.x'|'stat.y'):Generator<W,void,void>;
  crlf():Generator<W,void,void>;
};
// WARMAC XFRTMP:2586-2591. X1 holds the pointer, not P1 as in OSTR.
export function* outputTemporary<W>(r:StatusRegisters,pointer:bigint,
  io:Pick<HeaderServices<W>,'ildbX1'|'ochr'>):Generator<W,void,void>{
  r.x1=signed36(pointer);for(;;){r.c=signed36(yield*io.ildbX1());if(r.c===0n)return;yield*io.ochr();}
}
// WARMAC OSTS.:2536-2584. Same TMP is reused for both monitor calls,
// including retained bytes on a returning failure. Saves are not finally blocks.
export function* outputStatusHeader<W>(r:StatusRegisters,state:HeaderState,s:HeaderSymbols,io:HeaderServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.x1);yield*io.pushData(r.x2);yield*io.pushData(r.x3);yield*io.pushData(r.x4);
  r.c=91n;yield*io.ochr();r.c=86n;yield*io.ochr();
  r.x1=signed36(state.versio);yield*io.idiviX1(10n);r.c=rightHalf(48n+r.x1);yield*io.ochr();
  r.c=46n;yield*io.ochr();r.c=rightHalf(48n+r.x2);yield*io.ochr();yield*io.space();yield*io.space();
  r.x1=rightHalf(s.tmp);yield*io.undat();yield*outputTemporary(r,s.tmpPointer,io);yield*io.space();
  r.x1=rightHalf(s.tmp);yield*io.untim();yield*outputTemporary(r,s.tmpPointer,io);yield*io.space();yield*io.space();
  r.x3=signed36(state.who);r.x4=-rightHalf(-0o100n); // MOVNI X4,-100 negates the masked immediate EA.
  yield*io.status(state.who===0n?'stat.y':'stat.x');yield*io.space();
  r.x1=signed36(state.gameno);r.x2=5n;yield*io.decimal();
  r.p1=rightHalf(s.blackHoleLabel);if(state.blhopt<0n)yield*io.ostr();
  r.p1=rightHalf(s.romulanLabel);if(state.romopt<0n)yield*io.ostr();
  r.c=93n;yield*io.ochr();yield*io.crlf();
  r.x4=signed36(yield*io.popData());r.x3=signed36(yield*io.popData());r.x2=signed36(yield*io.popData());r.x1=signed36(yield*io.popData());
}
