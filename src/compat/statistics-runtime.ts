import type { WordMemory } from './memory.ts';
import type { MachineRegisters } from './registers.ts';
import type { SourceArguments } from './fortran-call.ts';
import type { FieldStack } from './field-output.ts';
import { halfWords,rightHalf,signed36 } from './word36.ts';
export type StatisticsEntry='updsta'|'updcap';
export type StatisticsSymbols={stabuf:bigint;staend:bigint;stacap:bigint;stakil:bigint;staiow:bigint;stfiow:bigint;
  stared:bigint;staupd:bigint;stfred:bigint;stfupd:bigint;lePpn:bigint;lkfail:bigint;hungup:bigint;frebie:bigint;gameno:bigint;lngshp:bigint;knstat:bigint;
  clearLiteral:bigint;openLiterals:Record<'stared'|'staupd'|'stfred'|'stfupd',bigint>;statisticsText:readonly bigint[];commissionText:readonly bigint[];};
export type StatisticsRuntimeServices<W>=FieldStack<W>&{
  lock():Generator<W,void,void>;unlo():Generator<W,void,void>;
  open():Generator<W,boolean,void>; // OPEN. success skip, with live X1/ARG/LE.PPN.
  inputSTA(descriptor:bigint):Generator<W,void,void>;outputSTA(descriptor:bigint):Generator<W,void,void>;closeSTA():Generator<W,void,void>;
  outputTTY():Generator<W,void,void>;outstr(address:bigint):Generator<W,void,void>;indirectAddress(wordAddress:bigint):Generator<W,bigint,void>;
  odec():Generator<W,void,void>;dateT3():Generator<W,void,void>;
  bltT1(end:bigint):Generator<W,void,void>;
  aos(register:'t1'|null,address:bigint):Generator<W,void,void>;sosX1():Generator<W,void,void>;
  addi(register:'t1'|'t2'|'x1'|'x2',operand:bigint):Generator<W,void,void>;
  subiT1(operand:bigint):Generator<W,void,void>;
  movmX1():Generator<W,void,void>; // MOVM X1,T1, including CPU exception behavior.
  sojgT1():Generator<W,boolean,void>;sojaT4():Generator<W,void,void>;
  continuation(site:'updcap-write-open'|'updcap-read-open'|'updcap-free-exit'|'updsta-first-kill'|'updsta-consolation-exit'):Generator<W,void,void>;
};
// WARMAC.MAC:5589-5670,5694-5882; data 676-692,875-924. Source words,
// argument descriptors and ACs remain live across each external operation.
// JRST .+1 in out-of-line literals is an explicit assembler/linker policy.
export function* statisticsRuntime<W>(entry:StatisticsEntry,m:WordMemory,r:MachineRegisters,args:SourceArguments,s:StatisticsSymbols,io:StatisticsRuntimeServices<W>):Generator<W,void,void>{
  const at=(base:bigint,index:bigint)=>rightHalf(base+index);
  const clear=function*(){m.write(s.stabuf,0n);r.t1=m.read(s.clearLiteral);yield*io.bltT1(s.staend);};
  const open=function*(key:keyof StatisticsSymbols['openLiterals']){r.x1=m.read(s.openLiterals[key]);return yield*io.open();};
  const flush=function*(){if(m.read(s.hungup)===0n)yield*io.outputTTY();};
  const text=function*(index:number){if(m.read(s.hungup)===0n)yield*io.outstr(s.statisticsText[index]);};
  const ship=function*(index:bigint){yield*io.outstr(yield*io.indirectAddress(at(s.lngshp-1n,index)));};
  const lock=function*(){do{r.t1=rightHalf(s.staupd);yield*io.lock();}while(m.read(s.lkfail)!==0n);};
  const unlock=function*(){r.t1=rightHalf(s.staupd);yield*io.unlo();};
  const rewrite=function*(){r.x1=m.read(s.openLiterals.staupd);if(m.read(s.frebie)!==0n)r.x1=m.read(s.openLiterals.stfupd);
    if(yield*io.open()){yield*io.outputSTA(s.staiow);yield*io.closeSTA();}};
  if(entry==='updcap'){
    yield*lock();yield*clear();
    if(yield*open('stared')){if(m.read(s.lePpn)<0n)yield*io.inputSTA(s.staiow);yield*io.closeSTA();}
    if(m.read(s.gameno)===0n)yield*io.aos(null,s.stabuf);r.t1=m.read(s.stabuf);m.write(s.gameno,r.t1);
    if(m.read(s.frebie)!==0n){
      if(!(yield*open('staupd')))yield*io.continuation('updcap-write-open');
      yield*io.outputSTA(s.staiow);yield*io.closeSTA();
      m.write(s.stabuf,0n);yield*clear(); // The source has two consecutive SETZM.
      if(!(yield*open('stfred')))yield*io.continuation('updcap-read-open');
      if(m.read(s.lePpn)<0n)yield*io.inputSTA(s.staiow);yield*io.closeSTA();
      r.t1=m.read(s.gameno);m.write(s.stabuf,r.t1);yield*io.continuation('updcap-free-exit');
    }
    r.t1=args.read(0);yield*io.aos(null,at(s.stacap,r.t1));yield*rewrite();yield*unlock();
    yield*flush();yield*io.outstr(s.commissionText[0]); // Unguarded even when HUNGUP.
    r.x1=m.read(s.gameno);r.x2=0n;yield*io.odec();yield*flush();
    if(m.read(s.hungup)===0n)yield*io.outstr(s.commissionText[1]);
    r.t1=args.read(0);r.x1=m.read(at(s.stacap,r.t1));r.x2=0n;yield*io.odec();yield*flush();
    if(m.read(s.hungup)===0n)yield*io.outstr(s.commissionText[2]);
    r.t1=args.read(0);if(m.read(s.hungup)===0n)yield*ship(r.t1);
    // The two trailing SKIPN HUNGUP instructions always reach POPJ; the
    // intervening newline OUTSTR is commented out in the supplied source.
    return;
  }
  r.t1=args.read(6);if(r.t1<1000n)return;yield*flush();yield*lock();yield*clear();
  if(yield*open('stared')){
    if(m.read(s.lePpn)<0n)yield*io.inputSTA(s.staiow);yield*io.closeSTA();
    if(m.read(s.frebie)!==0n){yield*clear();if(yield*open('stfred')){if(m.read(s.lePpn)<0n)yield*io.inputSTA(s.stfiow);yield*io.closeSTA();}}
  }
  r.t2=args.read(9);
  if(args.read(7)===0n){
    yield*io.aos('t1',at(s.stakil,r.t2));
    if(r.t1===1n)yield*io.continuation('updsta-first-kill');
    else{
      yield*flush();yield*text(0);if(m.read(s.hungup)===0n)yield*ship(r.t2);yield*text(1);
      r.x1=m.read(at(s.stakil,r.t2));yield*io.sosX1();r.x2=0n;yield*io.odec();yield*flush();yield*text(2);
      r.t2=args.read(9);r.x1=m.read(at(s.stacap,r.t2));r.x2=0n;yield*io.odec();yield*flush();yield*text(3);
      yield*io.continuation('updsta-consolation-exit');
    }
  }
  r.x1=rightHalf(s.stabuf+3n);if(args.read(8)!==0n)yield*io.addi('x1',256n);
  r.t2=rightHalf(r.x1);r.t3=args.read(5);r.t1=rightHalf(s.knstat);
  for(;;){ // UPDST0: the score is loaded once; elapsed is read at each tie.
    let insert=m.read(at(0n,r.t2))===0n;
    if(!insert&&r.t3>=m.read(at(6n,r.t2))){
      if(r.t3!==m.read(at(6n,r.t2)))insert=true;
      else{r.t4=m.read(at(7n,r.t2));insert=r.t4<args.read(6);}
    }
    if(insert)break;
    yield*io.addi('t2',10n);if(yield*io.sojgT1())continue;
    yield*text(9);if(args.read(7)===0n)yield*rewrite();yield*unlock();return;
  }
  yield*io.subiT1(s.knstat+1n);
  yield*io.pushData(r.t2);yield*io.pushData(r.x1);yield*io.pushData(r.x2);
  const restore=function*(){r.x2=yield*io.popData();r.x1=yield*io.popData();r.t2=yield*io.popData();};
  r.x2=rightHalf(r.x1);r.t3=args.read(0);
  while(r.t2>rightHalf(r.x2)){
    if(r.t3===m.read(at(0n,r.x2))){yield*restore();if(args.read(7)===0n)yield*rewrite();yield*unlock();return;}
    yield*io.addi('x2',10n);
  }
  yield*io.movmX1();
  if(m.read(s.hungup)===0n){
    if(r.x1===1n)yield*io.outstr(s.statisticsText[4]);
    else if(r.x1===s.knstat)yield*text(5);
    else{yield*io.outstr(s.statisticsText[6]);r.x2=0n;yield*io.odec();yield*io.outputTTY();yield*io.outstr(s.statisticsText[7]);}
  }
  yield*restore();if(m.read(s.hungup)===0n&&args.read(7)===0n)yield*io.outstr(s.statisticsText[8]);
  r.t4=at(s.knstat*10n-1n,r.x1);
  while(r.t2<=at(-10n,r.t4)){r.t3=m.read(at(-10n,r.t4));m.write(at(0n,r.t4),r.t3);yield*io.sojaT4();}
  for(let i=0;i<5;i++){r.t3=args.read(i);m.write(at(BigInt(i),r.t2),r.t3);}
  yield*io.dateT3();m.write(at(5n,r.t2),r.t3);
  r.t4=args.read(9);r.t3=m.read(at(s.stacap,r.t4));m.write(at(9n,r.t2),r.t3);
  r.t3=args.read(7);const flagAddress=at(9n,r.t2);m.write(flagAddress,signed36(halfWords(r.t3,rightHalf(m.read(flagAddress)))));
  r.t3=args.read(5);m.write(at(6n,r.t2),r.t3);r.t3=args.read(6);m.write(at(7n,r.t2),r.t3);
  yield*rewrite();yield*unlock();
}
