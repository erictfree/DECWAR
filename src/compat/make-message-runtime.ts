import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type MakeMessageRegisters={arg:bigint;p1:bigint;c:bigint;t1:bigint;t2:bigint;t3:bigint;x1:bigint;x2:bigint;x3:bigint};
export type MakeMessageSymbols={dbits:bigint;dispfr:bigint;ccflg:bigint;lkfail:bigint;cbits:bigint;eol:bigint;point7:bigint;linePointer:bigint;queuePointer:bigint;messagePointer:bigint;msglen:bigint;capacity:bigint;msgflg:bigint;prompt:bigint;notSent:bigint};
export type MakeMessageServices<W>={
  ildb():Generator<W,void,void>;idpb():Generator<W,void,void>;dpb():Generator<W,void,void>; // C,P1 or C,T1 as in the source.
  ostr():Generator<W,void,void>;inli():Generator<W,void,void>;
  reserve():Generator<W,void,void>;remove():Generator<W,void,void>;publish():Generator<W,void,void>;
  imuliT1(word:bigint):Generator<W,void,void>;addT1(word:bigint):Generator<W,void,void>;movniT2(word:bigint):Generator<W,void,void>;
  aojgeT2():Generator<W,boolean,void>;addiT2(word:bigint):Generator<W,void,void>;
  aosMessage(address:bigint):Generator<W,void,void>;lshT1():Generator<W,void,void>;aojT2():Generator<W,void,void>;
};
// WARMAC.MAC:3536-3607. Input/queue/byte/CPU operations retain live register
// state. The pre-reservation Ctrl-C path deliberately enters REMV with stale X2.
export function* makeMessageRuntime<W>(m:WordMemory,r:MakeMessageRegisters,args:SourceArguments,s:MakeMessageSymbols,io:MakeMessageServices<W>):Generator<W,void,void>{
  if(m.read(s.dbits)===0n)return;
  function* cancel():Generator<W,void,void>{r.p1=rightHalf(s.notSent);yield*io.ostr();r.x3=-1n;r.x1=s.queuePointer;yield*io.remove();m.write(s.dbits,0n);}
  r.p1=BigInt.asIntN(18,leftHalf(m.read(rightHalf(r.arg-1n))));
  if(r.p1!==0n){r.p1=args.address(0);r.t3=m.read(rightHalf(r.p1));if(leftHalf(r.t3)===0n)r.p1=m.read(rightHalf(r.p1));r.p1=signed36(halfWords(s.point7,rightHalf(r.p1)));}
  else{
    r.p1=s.linePointer;
    for(;;){yield*io.ildb();if(r.c===59n)break;if(r.c===0n){
      r.p1=rightHalf(s.prompt);yield*io.ostr();yield*io.inli();if(m.read(s.ccflg)!==0n){yield*cancel();return;}r.p1=s.linePointer;break;
    }}
  }
  do{r.x1=s.queuePointer;yield*io.reserve();}while(m.read(s.lkfail)!==0n);
  r.t1=rightHalf(r.x2);yield*io.imuliT1(s.msglen);yield*io.addT1(s.messagePointer);
  r.t2=signed36(halfWords(rightHalf(m.read(s.dispfr)),0n));r.t2=signed36(halfWords(leftHalf(r.t2),rightHalf(m.read(s.dbits))));m.write(rightHalf(r.t1-1n),r.t2);
  yield*io.movniT2(s.capacity);
  for(;;){yield*io.ildb();if(!(yield*io.aojgeT2()))yield*io.idpb();r.t3=m.read(rightHalf(s.cbits+r.c));if((r.t3&s.eol)!==0n)break;}
  r.c=13n;yield*io.dpb();r.c=10n;yield*io.idpb();r.c=0n;yield*io.idpb();
  yield*io.addiT2(s.capacity);if(r.t2<=2n){yield*cancel();return;}
  r.x3=m.read(s.dbits);yield*io.publish();r.t1=m.read(s.dbits);r.t2=0n;
  do{if((r.t1&1n)!==0n)yield*io.aosMessage(rightHalf(s.msgflg+r.t2));yield*io.lshT1();yield*io.aojT2();}while(r.t1!==0n);
  m.write(s.dbits,0n);
}
