import type { WordMemory } from './memory.ts';
import type { MachineRegisters } from './registers.ts';
import { rightHalf } from './word36.ts';
export type ClearStatisticsSymbols={stabuf:bigint;staiow:bigint;lkfail:bigint;addrck:bigint;normalLiteral:bigint;freeLiteral:bigint;text:readonly bigint[]};
export type ClearStatisticsRuntimeServices<W>={
  outstr(address:bigint):Generator<W,void,void>;lock():Generator<W,void,void>;unlo():Generator<W,void,void>;gripe():Generator<W,void,void>;
  sojgT1():Generator<W,boolean,void>;open():Generator<W,boolean,void>;outputSTA(descriptor:bigint):Generator<W,void,void>;closeSTA():Generator<W,void,void>;
};
// STAZAP/STZAP0/STZAPX, WARMAC.MAC:6185-6223. STABUF is the lock key,
// unlike UPDSTA. GRIPE may replace the buffer; index zero is never cleared.
export function* clearStatisticsRuntime<W>(m:WordMemory,r:Pick<MachineRegisters,'t1'|'x1'>,s:ClearStatisticsSymbols,io:ClearStatisticsRuntimeServices<W>):Generator<W,void,void>{
  yield*io.outstr(s.text[0]);
  do{r.t1=rightHalf(s.stabuf);yield*io.lock();}while(m.read(s.lkfail)!==0n);
  r.t1=1n;m.write(s.addrck,r.t1);yield*io.gripe();
  r.t1=639n;do{m.write(rightHalf(s.stabuf+r.t1),0n);}while(yield*io.sojgT1());
  r.x1=m.read(s.normalLiteral);
  if(!(yield*io.open()))yield*io.outstr(s.text[2]);
  else{
    yield*io.outputSTA(s.staiow);yield*io.closeSTA();r.x1=m.read(s.freeLiteral);
    if(!(yield*io.open()))yield*io.outstr(s.text[2]);
    else{yield*io.outputSTA(s.staiow);yield*io.closeSTA();}
  }
  r.t1=rightHalf(s.stabuf);yield*io.unlo();yield*io.outstr(s.text[1]);m.write(s.addrck,0n);
}
