import type { WordMemory } from './memory.ts';
import type { MachineRegisters } from './registers.ts';
import type { SourceArguments } from './fortran-call.ts';
import type { FieldStack } from './field-output.ts';
import { leftHalf,rightHalf,signed36 } from './word36.ts';

export type BoardDiagnosticSymbols={pasflg:bigint;kgalv:bigint;kgalh:bigint;rngtbl:bigint;illegalCoordinate:bigint;illegalDisplay:bigint};
export type BoardDiagnosticOutput='ostr.'|'odec.'|'ospc.'|'ocrl.';
export type BoardDiagnosticServices<W>=FieldStack<W>&{
  idiviT1(word:bigint):Generator<W,void,void>;
  output(entry:BoardDiagnosticOutput):Generator<W,void,void>;
  trace():Generator<W,void,void>;
};
// WARMAC.MAC:5483-5547, selected DEBUG.=-1. Literal and range-table
// addresses are actual assembled memory; SAVE/RESTOR share the runtime S stack.
export function* boardDiagnostic<W>(entry:'chkc'|'chkd',m:WordMemory,r:MachineRegisters,
  args:SourceArguments,s:BoardDiagnosticSymbols,io:BoardDiagnosticServices<W>):Generator<W,void,void>{
  if(m.read(s.pasflg)===0n)return;
  if(entry==='chkc'){
    yield*io.pushData(r.t0);r.t0=args.read(0);
    let bad=r.t0<=0n||r.t0>s.kgalv;
    if(!bad){r.t0=args.read(1);bad=r.t0<=0n||r.t0>s.kgalh;}
    if(bad){
      for(const k of ['t1','t2','t3','t4','x1','x2','p1','c'] as const)yield*io.pushData(r[k]);
      r.p1=rightHalf(s.illegalCoordinate);yield*io.output('ostr.');
      r.x2=0n;r.x1=args.read(0);yield*io.output('odec.');yield*io.output('ospc.');
      // X2 is deliberately not cleared again: ODEC.'s returned width is reused.
      r.x1=args.read(1);yield*io.output('odec.');yield*io.output('ocrl.');yield*io.trace();
      for(const k of ['c','p1','x2','x1','t4','t3','t2','t1'] as const)r[k]=signed36(yield*io.popData());
    }
    r.t0=signed36(yield*io.popData());return;
  }
  for(const k of ['t1','t2','t3'] as const)yield*io.pushData(r[k]);
  r.t1=rightHalf(r.t0);yield*io.idiviT1(100n);
  let bad=r.t1>10n;
  if(!bad){
    r.t3=leftHalf(m.read(rightHalf(s.rngtbl+r.t1)));bad=r.t2<rightHalf(r.t3);
    if(!bad){r.t3=rightHalf(m.read(rightHalf(s.rngtbl+r.t1)));bad=r.t2>rightHalf(r.t3);}
  }
  if(bad){
    for(const k of ['t0','t4','x1','x2','p1','c'] as const)yield*io.pushData(r[k]);
    r.p1=rightHalf(s.illegalDisplay);yield*io.output('ostr.');
    r.x1=r.t0;r.x2=0n;yield*io.output('odec.');yield*io.output('ocrl.');yield*io.trace();
    for(const k of ['c','p1','x2','x1','t4','t0'] as const)r[k]=signed36(yield*io.popData());
  }
  for(const k of ['t3','t2','t1'] as const)r[k]=signed36(yield*io.popData());
}

export type TraceServices<W>=FieldStack<W>&{
  addiX2(word:bigint):Generator<W,void,void>;
  soj(register:'x2'|'x3'):Generator<W,void,void>;
  output(entry:'osix.'|'ospc.'|'ocrl.'):Generator<W,void,void>;
  outputTTY():Generator<W,void,void>;
};
// WARMAC.MAC:5568-5583. Walks actual P/return/instruction/name words.
// Caller supplies the real P stack, PDL size, CPU flags and monitor flush.
export function* traceRoutine<W>(m:WordMemory,r:MachineRegisters,s:{pdlsiz:bigint;hungup:bigint},
  io:TraceServices<W>):Generator<W,void,void>{
  for(const k of ['x1','x2','x3'] as const)yield*io.pushData(r[k]);
  r.x2=BigInt.asIntN(18,leftHalf(r.p));yield*io.addiX2(rightHalf(s.pdlsiz-1n));
  r.x3=rightHalf(r.p-1n);
  for(;;){
    yield*io.soj('x2');if(r.x2<0n)break;
    r.x1=rightHalf(m.read(rightHalf(r.x3)));
    r.x1=rightHalf(m.read(rightHalf(r.x1-1n)));
    r.x1=m.read(rightHalf(r.x1-1n));
    yield*io.output('osix.');yield*io.output('ospc.');yield*io.soj('x3');
  }
  yield*io.output('ocrl.');if(m.read(s.hungup)===0n)yield*io.outputTTY();
  for(const k of ['x3','x2','x1'] as const)r[k]=signed36(yield*io.popData());
}
