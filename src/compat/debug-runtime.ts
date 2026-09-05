import type { WordMemory } from './memory.ts';
import type { MachineRegisters } from './registers.ts';
import { add36,divide36,halfWords,leftHalf,multiply36,rightHalf,signed36 } from './word36.ts';
export type DebugSymbols={pasflg:bigint;hungup:bigint;unkcom:bigint;forhlp:bigint;header:bigint;newline:bigint;tab:bigint;timnam:bigint;timcnt:bigint;timtot:bigint;timhi:bigint};
export type DebugRuntimeServices<W>={
  ostr():Generator<W,void,void>;
  outstr(actual:bigint):Generator<W,void,void>;outchr(actual:bigint):Generator<W,void,void>;
  number(radix:8|10):Generator<W,void,void>; // PUSHJ/POPJ including writable return word at 0(P).
};
// WARMAC.MAC:4567-4582. HRLM uses the actual return word for each remainder;
// HLRZ zero-extends it, including negative residues. No added sign formatting.
export function* debugNumberRuntime<W>(radix:8|10,m:WordMemory,r:MachineRegisters,hungup:bigint,io:DebugRuntimeServices<W>):Generator<W,void,void>{
  const x=divide36(r.t1,BigInt(radix));r.t1=x.quotient;r.t2=x.remainder;
  const a=rightHalf(r.p);m.write(a,signed36(halfWords(r.t2,rightHalf(m.read(a)))));
  if(r.t1!==0n)yield*io.number(radix);r.t1=leftHalf(m.read(rightHalf(r.p)));r.t1=add36(r.t1,48n);if(m.read(hungup)===0n)yield*io.outchr(1n);
}
// WARMAC.MAC:4314-4348. A zero name terminates traversal, not a row bound.
// Raw monitor output deliberately bypasses terminal HCPOS/BLANK accounting.
export function* debugRuntime<W>(m:WordMemory,r:MachineRegisters,s:DebugSymbols,io:DebugRuntimeServices<W>):Generator<W,void,void>{
  if(m.read(s.pasflg)>=0n){r.p1=rightHalf(s.unkcom);yield*io.ostr();r.p1=rightHalf(s.forhlp);yield*io.ostr();return;}
  yield*io.outstr(s.header);r.x1=49n;
  for(;;){if(m.read(rightHalf(s.timnam+r.x1))===0n)return;r.t1=m.read(rightHalf(s.timnam+r.x1));r.t2=0n;yield*io.outstr(1n);yield*io.outchr(s.tab);
    r.t1=m.read(rightHalf(s.timcnt+r.x1));yield*io.number(10);yield*io.outchr(s.tab);
    r.t1=m.read(rightHalf(s.timtot+r.x1));r.t1=multiply36(r.t1,86400n);r.t1=leftHalf(r.t1);yield*io.number(10);yield*io.outchr(s.tab);
    r.t1=m.read(rightHalf(s.timhi+r.x1));r.t1=multiply36(r.t1,86400n);r.t1=leftHalf(r.t1);yield*io.number(10);yield*io.outstr(s.newline);r.x1=add36(r.x1,-1n);
  }
}
