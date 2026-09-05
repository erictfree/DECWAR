import type { SourceArguments } from './fortran-call.ts';
import { constants as K } from '../generated/source-data.ts';
// WARMAC.MAC:4429-4436. SKIPLE loads T1 even on failure; a rejected vertical
// coordinate skips the horizontal argument. No compiler call frames here.
export function* rawIngal<W>(r:{f:bigint;t1:bigint},args:SourceArguments):Generator<W,void,void>{
  r.t1=args.read(0);
  if(r.t1<=0n||r.t1>BigInt(K.KGALV)){r.f=0n;return;}
  r.t1=args.read(1);r.f=r.t1>0n&&r.t1<=BigInt(K.KGALH)?-1n:0n;
}
