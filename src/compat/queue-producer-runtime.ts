import type { WordMemory } from './memory.ts';
import type { FieldStack } from './field-output.ts';
import type { MessageSearchRegisters,MessageSearchServices } from './message-search-runtime.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type QueueProducerEntry='rsrv'|'qrsrv'|'updt'|'qupdt'|'rsrvhq';
export type QueueProducerSymbols={lkfail:bigint;quelok:bigint;reserveLiteral:bigint;updateLiteral:bigint};
export type QueueProducerServices<W>=FieldStack<W>&Pick<MessageSearchServices<W>,'addi'|'subi'|'lock'|'unlo'|'searchInner'|'removeInner'>&{
  aobjnT1():Generator<W,boolean,void>; // Actual increment and branch, including exceptional pointers.
  movniX3(word:bigint):Generator<W,void,void>;
  reserveInner():Generator<W,void,void>;
  updateInner():Generator<W,void,void>;
};
// WARMAC.MAC:3127-3209. DBQUE.=0. A full queue evicts one recipient from
// every linked entry under the existing lock, then restarts its physical scan.
export function* queueProducerRuntime<W>(entry:QueueProducerEntry,m:WordMemory,r:MessageSearchRegisters,s:QueueProducerSymbols,io:QueueProducerServices<W>):Generator<W,void,void>{
  if(entry==='rsrvhq'){m.write(s.lkfail,0n);return;}
  if(entry==='rsrv'){
    r.t1=m.read(s.reserveLiteral);yield*io.lock();if(m.read(s.lkfail)!==0n)return;
    yield*io.reserveInner();return;
  }
  if(entry==='updt'){
    do{r.t1=m.read(s.updateLiteral);yield*io.lock();}while(m.read(s.lkfail)!==0n);
    yield*io.updateInner();return;
  }
  if(entry==='qrsrv'){
    for(;;){
      r.t1=r.x1;
      for(;;){
        if(m.read(rightHalf(r.t1))===0n){
          m.write(rightHalf(r.t1),-1n);yield*io.subi('t1',rightHalf(r.x1));r.x2=rightHalf(r.t1);
          r.t1=rightHalf(s.quelok);yield*io.unlo();return;
        }
        if(!(yield*io.aobjnT1()))break;
      }
      yield*io.pushData(r.x3);
      r.t1=leftHalf(m.read(rightHalf(r.x1-1n)));yield*io.addi('t1',rightHalf(r.x1));r.t1=rightHalf(m.read(rightHalf(r.t1)));
      yield*io.movniX3(rightHalf(r.t1));r.x3=signed36(r.x3&rightHalf(r.t1));
      while(yield*io.searchInner())yield*io.removeInner();
      r.x3=signed36(yield*io.popData());
    }
  }
  r.t1=BigInt.asIntN(18,rightHalf(m.read(rightHalf(r.x1-1n))));yield*io.addi('t1',rightHalf(r.x1));
  const previous=rightHalf(r.t1);m.write(previous,signed36(halfWords(rightHalf(r.x2),rightHalf(m.read(previous)))));
  const header=rightHalf(r.x1-1n);m.write(header,signed36(halfWords(leftHalf(m.read(header)),rightHalf(r.x2))));
  r.t1=rightHalf(r.x2);yield*io.addi('t1',rightHalf(r.x1));m.write(rightHalf(r.t1),signed36(halfWords(-1n,rightHalf(r.x3))));
  r.t1=rightHalf(s.quelok);yield*io.unlo();
}
