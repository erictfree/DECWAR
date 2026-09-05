import { add36,halfWords,rightHalf,signed36 } from './word36.ts';
import type { TextOutputServices } from './text-output.ts';

export type FieldStack<W>={pushData(word:bigint):Generator<W,void,void>;popData():Generator<W,bigint,void>};
export type FieldRegisters={p1:bigint;c:bigint;x1:bigint;x2:bigint};
// WARMAC OSTBX./OSTB./OSTB.X:2145-2170. Stack and counters are live.
export function* outputTextField<W>(r:FieldRegisters,entry:'ostbx'|'ostb'|'ostb.x',point7LeftHalf:bigint,
  io:TextOutputServices<W>&FieldStack<W>):Generator<W,void,void>{
  if(entry!=='ostb.x')r.p1=signed36(halfWords(point7LeftHalf,rightHalf(r.p1)));
  yield*io.pushData(r.x1);yield*io.pushData(r.x2);
  if(entry==='ostbx'){r.x1=10n;r.x2=-1n;}else{r.x2=0n;r.x1=10n;}
  for(;;){
    r.c=signed36(yield*io.ildb());if(r.c===0n||r.c===32n)break;
    yield*io.ochr();r.x1=add36(r.x1,-1n);if(r.x1<=0n)break;
  }
  if(r.x2!==0n)for(;;){r.x1=add36(r.x1,-1n);if(r.x1<=0n)break;r.c=32n;yield*io.ochr();}
  r.x2=signed36(yield*io.popData());r.x1=signed36(yield*io.popData());
}

export type SixbitRegisters={x1:bigint;c:bigint;cNext:bigint}; // C+1 aliases P1 in WARMAC.
export type SixbitServices<W>=FieldStack<W>&{
  lshc():Generator<W,void,void>; // LSHC C,6, operating on the live C/C+1 pair.
  ochr():Generator<W,void,void>;
};
// WARMAC OSIX.:2213-2224. X2's documented width is not used by the code.
export function* outputSixbit<W>(r:SixbitRegisters,io:SixbitServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.x1);yield*io.pushData(r.cNext);r.cNext=r.x1;r.x1=6n;
  do{r.c=0n;yield*io.lshc();r.c=add36(r.c,0o40n);yield*io.ochr();r.x1=add36(r.x1,-1n);}while(r.x1>0n);
  r.cNext=signed36(yield*io.popData());r.x1=signed36(yield*io.popData());
}

export type NumberRegisters={x1:bigint;x2:bigint;x3:bigint;x4:bigint;t1:bigint;t2:bigint;c:bigint};
export type NumberServices<W>=FieldStack<W>&{
  movm(destination:'x4'|'t1',value:bigint):Generator<W,void,void>; // Includes actual machine overflow/trap behavior.
  aobjn():Generator<W,boolean,void>; // Updates X4; true takes branch.
  idivi(divisor:bigint):Generator<W,void,void>; // T1/T2 division, including CPU failure effects.
  space():Generator<W,void,void>;
  ochr():Generator<W,void,void>;
};
export type NumberSign='onum'|'osn1'|'osn2'|'osn3';
// WARMAC ONUM./OSN1./OSN2./OSN3.:2280-2330. Preserve digit/sign space
// accounting, saved registers and partial stack state across every service.
export function* outputNumber<W>(r:NumberRegisters,entry:NumberSign,io:NumberServices<W>):Generator<W,void,void>{
  if(entry==='onum'||(entry==='osn1'&&r.x1===0n))r.t2=r.x1<0n?45n:0n;
  else r.t2=(entry==='osn3'?r.x1<=0n:r.x1<0n)?45n:43n;
  yield*io.pushData(r.x1);yield*io.pushData(r.x4);
  yield*io.movm('x4',r.x2);r.x4=signed36(-rightHalf(r.x4));r.x4=signed36(halfWords(rightHalf(r.x4),0n));
  yield*io.pushData(-1n);yield*io.movm('t1',r.x1);r.x1=rightHalf(r.t2);
  let overflow=false;
  if(r.x1!==0n&&!(yield*io.aobjn())&&r.x2>0n)overflow=true;
  if(!overflow){
    for(;;){
      yield*io.idivi(rightHalf(r.x3));yield*io.pushData(r.t2);
      if(r.t1===0n){while(yield*io.aobjn())yield*io.space();r.x2=0n;break;}
      if(yield*io.aobjn())continue;
      if(r.x2<=0n)continue;
      overflow=true;break;
    }
  }
  if(overflow)r.x2=-1n;
  r.c=r.x1;if(r.c!==0n)yield*io.ochr();
  for(;;){r.c=signed36(yield*io.popData());if(r.c<0n)break;r.c=add36(r.c,48n);if(r.x2!==0n)r.c=42n;yield*io.ochr();}
  r.x2=rightHalf(r.x4);r.x4=signed36(yield*io.popData());r.x1=signed36(yield*io.popData());
}
// WARMAC ODEC./OOCT.:2234-2252. Internal entries restore X3 but return
// ONUM's actual width in X2. These are not the FORTRAN ODEC/OSDEC wrappers.
export function* outputRadix<W>(r:NumberRegisters,radix:8|10,io:NumberServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.x3);r.x3=BigInt(radix);yield*outputNumber(r,'onum',io);r.x3=signed36(yield*io.popData());
}
