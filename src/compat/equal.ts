import type { SourceArguments } from './fortran-call.ts';
import type { FieldStack } from './field-output.ts';
import { add36,halfWords,rightHalf,signed36 } from './word36.ts';

export type EqualRegisters={t0:bigint;t1:bigint;c:bigint;p1:bigint;p2:bigint};
export type EqualServices<W>=FieldStack<W>&{
  ildb(pointer:'t1'|'p1'|'p2'):Generator<W,bigint,void>; // Required CPU byte-pointer operation, including memory writes/faults.
};
// WARMAC.MAC:4363-4368. The outer SAVE precedes resolving either argument.
export function* rawEqual<W>(r:EqualRegisters,args:SourceArguments,point7LeftHalf:bigint,io:EqualServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.p1);yield*io.pushData(r.p2);
  r.p1=args.address(0);r.p2=args.address(1);
  yield*rawEqualStrings(r,point7LeftHalf,io);
  r.p2=yield*io.popData();r.p1=yield*io.popData();
}
// WARMAC.MAC:4370-4402, EQUAL. internal entry. T0/F is the result;
// T1 is scratch. The mistaken substring conversion targets T0, not C.
export function* rawEqualStrings<W>(r:EqualRegisters,point7LeftHalf:bigint,io:EqualServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.p1);yield*io.pushData(r.p2);yield*io.pushData(r.c);
  r.p1=signed36(halfWords(point7LeftHalf,rightHalf(r.p1)));
  r.p2=signed36(halfWords(point7LeftHalf,rightHalf(r.p2)));
  r.t1=r.p1;r.c=yield*io.ildb('t1');
  if(r.c===0n||r.c===0o40n)r.t0=0n;
  else{
    r.t1=5n;
    for(;;){
      r.c=yield*io.ildb('p1');
      if(r.c===0n||r.c===0o40n){
        r.t0=-1n;r.c=yield*io.ildb('p2');
        if(r.c===0n||r.c===0o40n)r.t0=-2n;
        break;
      }
      if(r.t0>0o137n)r.t0&=~0o40n;
      r.t0=yield*io.ildb('p2');if(r.t0>0o137n)r.t0&=~0o40n;
      if(r.t0!==rightHalf(r.c)){r.t0=0n;break;}
      r.t1=add36(r.t1,-1n);if(r.t1<=0n){r.t0=-2n;break;}
    }
  }
  r.c=yield*io.popData();r.p2=yield*io.popData();r.p1=yield*io.popData();
}
