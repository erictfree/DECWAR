import type { WordMemory } from './memory.ts';
import type { MachineRegisters } from './registers.ts';
import type { SourceArguments } from './fortran-call.ts';
import type { FieldStack } from './field-output.ts';
import { leftHalf,rightHalf } from './word36.ts';
export type HonorRollEntry='shosta'|'shopay'|'dofed'|'doemp'|'dspsta';
export type StatisticsDateSymbols={day:bigint;month:bigint;year:bigint};
export type StatisticsDateServices<W>={
  idivi(register:'t1'|'x1',divisor:bigint):Generator<W,void,void>;
  addi(register:'t1'|'t2'|'x1'|'x4',operand:bigint):Generator<W,void,void>;
  subi(register:'t1'|'x2',operand:bigint):Generator<W,void,void>;
};
export type HonorRollSymbols=StatisticsDateSymbols&{stabuf:bigint;staiow:bigint;frebie:bigint;hungup:bigint;ccflg:bigint;terwid:bigint;leName:bigint;freeLabelLiteral:bigint;freeContinueLiteral:bigint;knstat:bigint;
  openLiterals:{stared:bigint;stfred:bigint};text:readonly bigint[];};
export type HonorRollRuntimeServices<W>=FieldStack<W>&StatisticsDateServices<W>&{
  open():Generator<W,boolean,void>;inputSTA(descriptor:bigint):Generator<W,void,void>;closeSTA():Generator<W,void,void>;outputTTY():Generator<W,void,void>;
  ostr():Generator<W,void,void>;ochr():Generator<W,void,void>;osix():Generator<W,void,void>;space():Generator<W,void,void>;
  ooct():Generator<W,void,void>;odec():Generator<W,void,void>;ostbx():Generator<W,void,void>;o2dg():Generator<W,void,void>;crlf():Generator<W,void,void>;
  call(entry:'dofed'|'doemp'|'dspsta'):Generator<W,void,void>;
  aojlX2():Generator<W,boolean,void>;aosX3():Generator<W,void,void>;
  continuation(site:'nonpay-label'|'wide-header'):Generator<W,void,void>;
};
// WARMAC.MAC:34-44, expanded at 6080. Both divisions use the actual T1/T2
// pair; the output words may alias ACs or each other. No host date conversion.
export function* statisticsDateRuntime<W>(m:WordMemory,r:Pick<MachineRegisters,'t1'|'t2'>,s:StatisticsDateSymbols,io:StatisticsDateServices<W>):Generator<W,void,void>{
  yield*io.idivi('t1',31n);yield*io.addi('t2',1n);m.write(s.day,r.t2);
  yield*io.idivi('t1',12n);yield*io.addi('t2',1n);m.write(s.month,r.t2);
  yield*io.addi('t1',1964n);yield*io.subi('t1',2000n);m.write(s.year,r.t1);
}
// SHOSTA/SHOPAY/DOFED/DOEMP/DSPSTA, WARMAC.MAC:5885-6102. No lock, clear,
// LE.PPN guard, snapshot of row words or additional in-row Ctrl-C test.
export function* honorRollRuntime<W>(entry:HonorRollEntry,m:WordMemory,r:MachineRegisters,args:SourceArguments,s:HonorRollSymbols,io:HonorRollRuntimeServices<W>):Generator<W,void,void>{
  const indexed=(offset:bigint)=>rightHalf(r.x4+offset);
  const text=function*(i:number){r.p1=rightHalf(s.text[i]);yield*io.ostr();};
  if(entry==='dspsta'){
    if(m.read(s.ccflg)!==0n)return;
    yield*io.pushData(r.x1);yield*io.pushData(r.x2);yield*io.pushData(r.x3);yield*io.pushData(r.x4);
    r.x3=1n;r.x4=r.x1;yield*text(6);
    if(args.read(0)<=0n){yield*text(7);yield*io.continuation('wide-header');}yield*io.crlf();
    for(;;){
      if(m.read(indexed(0n))!==0n){
        r.c=32n;r.t1=leftHalf(m.read(indexed(9n)));if(r.t1===0n)r.c=42n;yield*io.ochr();
        r.x1=m.read(indexed(1n));yield*io.osix();r.x1=m.read(indexed(2n));yield*io.osix();yield*io.space();
        r.x1=leftHalf(m.read(indexed(0n)));r.x2=6n;yield*io.ooct();r.c=45n;yield*io.ochr();
        r.x1=rightHalf(m.read(indexed(0n)));r.x2=0n;yield*io.ooct();yield*io.subi('x2',5n);
        do{yield*io.space();}while(yield*io.aojlX2());
        r.x1=m.read(indexed(6n));yield*io.addi('x1',0o500n);yield*io.idivi('x1',1000n);r.x2=6n;yield*io.odec();
        r.t1=m.read(s.terwid);
        if(args.read(0)>0n||r.t1>=80n){
          yield*io.space();r.p1=indexed(3n);yield*io.ostbx();
          r.x1=m.read(indexed(7n));yield*io.addi('x1',30000n);yield*io.idivi('x1',60000n);r.x2=5n;yield*io.odec();yield*io.space();
          yield*text(8);r.t1=m.read(indexed(5n));yield*statisticsDateRuntime(m,r,s,io);
          r.x1=m.read(s.day);yield*io.o2dg();yield*text(9);r.x1=m.read(s.month);yield*io.o2dg();yield*text(10);r.x1=m.read(s.year);yield*io.o2dg();
        }
        yield*io.crlf();
      }
      yield*io.addi('x4',s.knstat);yield*io.aosX3();if(r.x3>s.knstat)break;
    }
    r.x4=yield*io.popData();r.x3=yield*io.popData();r.x2=yield*io.popData();r.x1=yield*io.popData();
    if(m.read(s.hungup)===0n)yield*io.outputTTY();return;
  }
  if(entry==='dofed'||entry==='doemp'){
    const base=s.stabuf+3n+(entry==='doemp'?256n:0n),heading=entry==='doemp'?4:2;
    if(m.read(base)!==0n){yield*text(heading);r.x1=rightHalf(base);yield*io.call('dspsta');if(m.read(s.ccflg)!==0n)return;}
    if(m.read(base+s.knstat*10n)===0n)return;
    yield*text(heading+1);r.x1=rightHalf(base+s.knstat*10n);yield*io.call('dspsta');return;
  }
  let free=entry==='shosta'&&m.read(s.frebie)!==0n;
  for(;;){
    r.x1=m.read(free?s.openLiterals.stfred:s.openLiterals.stared);
    if(!(yield*io.open()))return;
    yield*io.inputSTA(s.staiow);yield*io.closeSTA();
    r.t1=m.read(s.stabuf+3n);r.t1|=m.read(s.stabuf+3n+s.knstat*10n);r.t1|=m.read(s.stabuf+259n);r.t1|=m.read(s.stabuf+259n+s.knstat*10n);
    if(r.t1!==0n){
      if(m.read(s.hungup)===0n)yield*io.outputTTY();yield*text(0);
      r.t1=m.read(s.leName);if(r.t1===m.read(s.freeLabelLiteral)){yield*text(1);yield*io.continuation('nonpay-label');}
      r.t1=m.read(s.stabuf+9n);
      if(r.t1>=m.read(s.stabuf+265n)){yield*io.call('dofed');yield*io.call('doemp');}
      else{yield*io.call('doemp');yield*io.call('dofed');}
    }
    if(m.read(s.ccflg)!==0n){m.write(s.ccflg,0n);return;}
    if(m.read(s.frebie)===0n)return;if(args.read(0)===0n)return;
    r.t1=m.read(s.leName);if(r.t1!==m.read(s.freeContinueLiteral))return;
    free=false;
  }
}
