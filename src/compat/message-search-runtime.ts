import type { WordMemory } from './memory.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type MessageSearchRegisters={t1:bigint;t2:bigint;t3:bigint;x1:bigint;x2:bigint;x3:bigint;p:bigint};
export type MessageSearchSymbols={lkfail:bigint;quelok:bigint;srchLiteral:bigint;remvLiteral:bigint};
export type MessageSearchServices<W>={
  addi(register:'t1',word:bigint):Generator<W,void,void>;
  subi(register:'t1'|'t3',word:bigint):Generator<W,void,void>;
  aos(address:bigint):Generator<W,void,void>;
  lock():Generator<W,void,void>;unlo():Generator<W,void,void>;
  searchInner():Generator<W,boolean,void>; // PUSHJ SRCH.X and resolve its actual return skip.
  removeInner():Generator<W,void,void>;
};
// WARMAC.MAC:3227-3292, selected DBQUE.=0. Bodies expose AOS(P); their
// PUSHJ/POPJ return-address semantics are supplied by the caller adapter.
export function* messageSearchRuntime<W>(entry:'srch'|'srch.x'|'remv'|'remv.x',m:WordMemory,r:MessageSearchRegisters,s:MessageSearchSymbols,io:MessageSearchServices<W>):Generator<W,void,void>{
  if(entry==='srch'){
    r.t1=m.read(s.srchLiteral);yield*io.lock();if(m.read(s.lkfail)!==0n)return;
    if(yield*io.searchInner())yield*io.aos(rightHalf(r.p));
    r.t1=rightHalf(s.quelok);yield*io.unlo();return;
  }
  if(entry==='remv'){
    do{r.t1=m.read(s.remvLiteral);yield*io.lock();}while(m.read(s.lkfail)!==0n);
    yield*io.removeInner();r.t1=rightHalf(s.quelok);yield*io.unlo();return;
  }
  if(entry==='srch.x'){
    r.x2=signed36(halfWords(rightHalf(r.x1-1n),0n));r.t1=BigInt.asIntN(18,leftHalf(m.read(rightHalf(r.x1-1n))));
    while(r.t1>=0n){
      yield*io.addi('t1',rightHalf(r.x1));
      if((r.x3&m.read(rightHalf(r.t1)))!==0n){yield*io.subi('t1',rightHalf(r.x1));r.x2=signed36(halfWords(leftHalf(r.x2),rightHalf(r.t1)));yield*io.aos(rightHalf(r.p));return;}
      r.x2=signed36(halfWords(rightHalf(r.t1),0n));r.t1=BigInt.asIntN(18,leftHalf(m.read(rightHalf(r.t1))));
    }
    return;
  }
  r.t1=rightHalf(r.x1);yield*io.addi('t1',rightHalf(r.x2));
  m.write(rightHalf(r.t1),signed36(m.read(rightHalf(r.t1))&~r.x3));r.t2=m.read(rightHalf(r.t1));
  if(rightHalf(r.t2)!==0n)return;
  r.t3=leftHalf(r.x2);m.write(rightHalf(r.t3),signed36(halfWords(leftHalf(r.t2),rightHalf(m.read(rightHalf(r.t3))))));
  if(r.t2<0n){yield*io.subi('t3',rightHalf(r.x1));const h=rightHalf(r.x1-1n);m.write(h,signed36(halfWords(leftHalf(m.read(h)),rightHalf(r.t3))));}
  m.write(rightHalf(r.t1),0n);
}
