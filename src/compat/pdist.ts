import type { SourceArguments } from './fortran-call.ts';
import { rightHalf,signed36 } from './word36.ts';
// WARMAC PDIST:4443-4451. CAIGE/MOVEI use the right half of T1.
// Ordinary board coordinates fit; arbitrary words do not equal host Math.max.
export function* rawPdist<W>(r:{f:bigint;t1:bigint},args:SourceArguments,io:{
  sub(register:'f'|'t1',word:bigint):Generator<W,void,void>;
  movm(register:'f'|'t1'):Generator<W,void,void>;
}):Generator<W,void,void>{
  r.f=signed36(args.read(0));yield*io.sub('f',args.read(2));yield*io.movm('f');
  r.t1=signed36(args.read(1));yield*io.sub('t1',args.read(3));yield*io.movm('t1');
  if(r.f<rightHalf(r.t1))r.f=rightHalf(r.t1);
}
