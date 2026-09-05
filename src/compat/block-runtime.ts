import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type BlockRegisters={t0:bigint;t1:bigint;t2:bigint};
export type BlockServices<W>={
  aojT1():Generator<W,void,void>; // AOJ T1, including flags/overflow effects.
  addT2(word:bigint):Generator<W,void,void>; // ADD T2,operand.
  blt(last:bigint):Generator<W,void,void>; // BLT T1,(T2), including overlap and AC effects.
};
// WARMAC.MAC:3918-3950. BLKSET's first write is unconditional and precedes
// the second resolution of the destination and the size read. BLT semantics
// are supplied even for zero/negative lengths or wrapped addresses.
export function* blockRuntime<W>(entry:'blkset'|'blkmov'|'locf',m:WordMemory,r:BlockRegisters,args:SourceArguments,io:BlockServices<W>):Generator<W,void,void>{
  if(entry==='locf'){r.t0=args.address(0);return;}
  if(entry==='blkset'){
    r.t1=args.read(1);m.write(args.address(0),r.t1);
    r.t1=args.address(0);r.t1=signed36(halfWords(rightHalf(r.t1),rightHalf(r.t1)));
    yield*io.aojT1();r.t2=rightHalf(r.t1-2n);
  }else{
    r.t1=signed36(halfWords(args.address(0),rightHalf(r.t1)));
    const destination=args.address(1);r.t1=signed36(halfWords(leftHalf(r.t1),destination));
    r.t2=rightHalf(r.t1-1n);
  }
  yield*io.addT2(args.read(2));yield*io.blt(rightHalf(r.t2));
}
