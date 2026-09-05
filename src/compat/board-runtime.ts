import type { WordMemory } from './memory.ts';
import type { MachineRegisters } from './registers.ts';
import type { SourceArguments } from './fortran-call.ts';
import { rightHalf } from './word36.ts';

export type BoardEntry='disp'|'dispc'|'dispx'|'setdsp';
export type BoardSymbols={ksid:bigint;b12tbl:bigint;oldobj:bigint;pasflg:bigint};
export type BoardServices<W>={
  subiT0(word:bigint):Generator<W,void,void>;
  idiviT0(word:bigint):Generator<W,void,void>;
  imuli(register:'arg'|'t2',word:bigint):Generator<W,void,void>;
  addiT0(word:bigint):Generator<W,void,void>;
  addT0(word:bigint):Generator<W,void,void>;
  ldb(destination:'t0'|'t1'):Generator<W,void,void>;
  dpb():Generator<W,void,void>;
  chkc():Generator<W,void,void>;
  chkd():Generator<W,void,void>;
};
// WARMAC.MAC:5333-5404; selected DEBUG.=-1, DBZER.=0 (617-620).
// Routine bodies, not PUSHJ/POPJ or CPU flag emulation. Debug routines and
// arithmetic/byte instructions are required services, including their effects
// on the live registers. B12TBL is actual memory, not a host cell lookup.
export function* boardRoutine<W>(entry:BoardEntry,m:WordMemory,
  r:Pick<MachineRegisters,'t0'|'t1'|'t2'|'arg'>,args:SourceArguments,
  s:BoardSymbols,io:BoardServices<W>):Generator<W,void,void>{
  if(entry==='dispc'||entry==='dispx'){
    yield*boardRoutine('disp',m,r,args,s,io);
    yield*io.idiviT0(100n);
    if(entry==='dispx')r.t0=rightHalf(r.t1);
    return;
  }
  yield*io.chkc();
  r.t0=args.read(1);yield*io.subiT0(1n);yield*io.idiviT0(3n);
  const vertical=entry==='disp'?'arg':'t2';
  r[vertical]=args.read(0);yield*io.imuli(vertical,s.ksid);
  yield*io.addiT0(rightHalf(r[vertical]-s.ksid));
  yield*io.addT0(m.read(rightHalf(s.b12tbl+r.t1)));
  if(entry==='disp'){
    yield*io.ldb('t0');if(r.t0===0o7777n)r.t0=-1n;
    yield*io.chkd();return;
  }
  yield*io.ldb('t1');m.write(s.oldobj,r.t1);
  r.t1=args.read(2);yield*io.dpb();
  r.t0=rightHalf(r.t1);yield*io.chkd();
  // Both SKIPN outcomes return in the selected DBZER.=0 assembly.
  m.read(s.pasflg);
}
