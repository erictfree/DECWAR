import type { WordMemory } from './memory.ts';
import type { MachineRegisters } from './registers.ts';
import type { SourceArguments } from './fortran-call.ts';
import { add36,multiply36,divide36,rightHalf,halfWords,signed36 } from './word36.ts';
export type ScanMachineSymbols={hmin:bigint;hmax:bigint;vmin:bigint;vmax:bigint;dh:bigint;dv:bigint;screen:bigint;b12tbl:bigint;b7tbl:bigint;ksid:bigint;scnflg:bigint;ccflg:bigint};
export type ScanMachineServices<W>={
  ildb():Generator<W,void,void>; // T1 <- next byte at P1.
  idpb(register:'t1'|'t2'):Generator<W,void,void>; // Next byte at P2.
  object():Generator<W,void,void>; // XCT OBJTBL(T1), including GETSHP.
  output(entry:'ocrl.'|'ospc.'|'ostr.'|'o2db.'):Generator<W,void,void>;
  pushData(value:bigint):Generator<W,void,void>;popData():Generator<W,bigint,void>;
};
// WARMAC.MAC:2799-3000. Actual ACs, pointer tables and LOCAL screen words.
// Ordinary signed word arithmetic is explicit here; byte/XCT/output and SAVE
// services remain supplied. PUSHJ return frames and CPU trap flags are not modeled.
export function* scanMachine<W>(entry:'setscn'|'mark'|'shwscn',m:WordMemory,r:MachineRegisters,args:SourceArguments,s:ScanMachineSymbols,io:ScanMachineServices<W>):Generator<W,void,void>{
  const rd=(key:keyof ScanMachineSymbols)=>m.read(s[key]),store=(key:keyof ScanMachineSymbols,w:bigint)=>m.write(s[key],w);
  const divide=(reg:'t1',d:bigint)=>{const x=divide36(r[reg],d);r.t1=x.quotient;r.t2=x.remainder;};
  const boardPointer=()=>{r.p1=rightHalf(r.x1-1n);r.p1=multiply36(r.p1,s.ksid);r.t1=rightHalf(r.x3-1n);divide('t1',3n);r.p1=add36(r.p1,rightHalf(r.t1));r.p1=add36(r.p1,m.read(rightHalf(s.b12tbl-1n+r.t2)));};
  const relocate=()=>{r.t3=rightHalf(r.x1);r.t3=add36(r.t3,rightHalf(r.x2));if(r.t3>rightHalf(r.t2))r.t3=rightHalf(r.t2);r.x1=add36(r.x1,-rightHalf(r.x2));if(r.x1<rightHalf(r.t1))r.x1=rightHalf(r.t1);r.t3=add36(r.t3,-rightHalf(r.x1));r.x2=BigInt.asIntN(18,r.t3+1n);};
  if(entry==='setscn'){
    r.x1=args.read(0);store('hmin',r.x1);r.x2=args.read(2);store('vmin',r.x2);r.x3=args.read(3);store('vmax',r.x3);r.x3=add36(r.x3,-rightHalf(r.x2-1n));store('dv',r.x3);
    r.x4=args.read(1);store('hmax',r.x4);r.x4=add36(r.x4,-rightHalf(r.x1-1n));store('dh',r.x4);
    r.p1=rightHalf(r.x2-1n);r.p1=multiply36(r.p1,s.ksid);r.t1=rightHalf(r.x1-1n);divide('t1',3n);r.p1=add36(r.p1,rightHalf(r.t1));r.p1=add36(r.p1,m.read(rightHalf(s.b12tbl-1n+r.t2)));
    r.x1=r.p1;r.p2=signed36(halfWords(0o440700n,s.screen));r.x2=r.p2;
    for(;;){
      do{yield*io.ildb();if(r.t1===0o7777n)r.t1=0n;divide('t1',100n);yield*io.object();if(rd('scnflg')>=0n)yield*io.idpb('t1');yield*io.idpb('t2');r.x4=add36(r.x4,-1n);}while(r.x4>0n);
      r.t1=0n;yield*io.idpb('t1');r.x3=add36(r.x3,-1n);if(r.x3<=0n)return;
      r.x1=add36(r.x1,s.ksid);r.p1=r.x1;r.x2=add36(r.x2,9n);r.p2=r.x2;r.x4=rd('dh');
    }
  }
  if(entry==='mark'){
    r.x1=args.read(1);r.x2=args.read(2);r.t1=rd('hmin');r.t2=rd('hmax');relocate();if(r.x2<=0n)return;r.x3=r.x1;r.x4=r.x2;
    r.x1=args.read(0);r.x2=args.read(2);r.t1=rd('vmin');r.t2=rd('vmax');relocate();if(r.x2<=0n)return;boardPointer();
    r.p2=rightHalf(r.x1);r.p2=add36(r.p2,-rd('vmin'));r.p2=multiply36(r.p2,9n);r.t1=rightHalf(r.x3);r.t1=add36(r.t1,-rd('hmin'));if(rd('scnflg')>=0n)r.t1=add36(r.t1,rightHalf(r.t1));divide('t1',5n);r.p2=add36(r.p2,rightHalf(r.t1));r.p2=add36(r.p2,m.read(rightHalf(s.b7tbl-1n+r.t2)));
    r.x1=r.p1;r.x3=r.p2;r.t3=rightHalf(r.x4);
    for(;;){
      do{yield*io.ildb();if(r.t1===0n||r.t1===0o7777n)r.t1=-1n;else divide('t1',100n);yield*io.object();if(rd('scnflg')>=0n)yield*io.idpb('t1');yield*io.idpb('t2');r.t3=add36(r.t3,-1n);}while(r.t3>0n);
      r.x2=add36(r.x2,-1n);if(r.x2<=0n)return;r.x1=add36(r.x1,s.ksid);r.p1=r.x1;r.x3=add36(r.x3,9n);r.p2=r.x3;r.t3=rightHalf(r.x4);
    }
  }
  const labels=function*(){yield*io.pushData(r.x1);yield*io.output('ospc.');r.x1=rd('hmin');if(rd('scnflg')<0n)r.x1=add36(r.x1,1n);yield*io.output('ospc.');yield*io.output('ospc.');
    for(;;){yield*io.output('o2db.');r.x1=add36(r.x1,2n);if(rd('scnflg')<0n)r.x1=add36(r.x1,1n);if(r.x1>rd('hmax'))break;yield*io.output('ospc.');if(rd('scnflg')>=0n)yield*io.output('ospc.');}
    yield*io.output('ocrl.');r.x1=yield*io.popData();};
  yield*io.output('ocrl.');yield*labels();r.x1=rd('vmax');r.x2=multiply36(rd('dv'),9n);r.x2=add36(r.x2,rightHalf(s.screen-9n));
  for(;;){yield*io.output('o2db.');yield*io.output('ospc.');r.p1=rightHalf(r.x2);yield*io.output('ostr.');yield*io.output('ospc.');yield*io.output('o2db.');yield*io.output('ocrl.');if(rd('ccflg')!==0n){store('ccflg',0n);return;}r.x1=add36(r.x1,-1n);if(r.x1<rd('vmin'))break;r.x2=add36(r.x2,-9n);}
  yield*labels();
}
