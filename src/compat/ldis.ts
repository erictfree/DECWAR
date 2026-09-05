import type { SourceArguments } from './fortran-call.ts';
import { signed36 } from './word36.ts';

// WARMAC.MAC:4410-4421. Ordered full-word axis comparisons; unlike PDIST,
// this does not reduce the horizontal magnitude to an immediate right half.
export function* rawLdis<W>(r:{f:bigint;t1:bigint},args:SourceArguments,io:{
  subT1(word:bigint):Generator<W,void,void>;
  movmT1():Generator<W,void,void>; // Required CPU arithmetic/overflow effects.
}):Generator<W,void,void>{
  r.t1=signed36(args.read(0));yield*io.subT1(args.read(2));yield*io.movmT1();
  if(r.t1>signed36(args.read(4))){r.f=0n;return;}
  r.t1=signed36(args.read(1));yield*io.subT1(args.read(3));yield*io.movmT1();
  r.f=r.t1<=signed36(args.read(4))?-1n:0n;
}
