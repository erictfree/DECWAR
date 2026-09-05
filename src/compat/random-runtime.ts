import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';
import { halfWords,leftHalf,rightHalf,signed36,MAX_INTEGER } from './word36.ts';

export type RandomEntry='setran'|'iran'|'ran'|'ran.';
export type RandomServices<W>={
  mstimeT1():Generator<W,void,void>;
  imuliT1(word:bigint):Generator<W,void,void>;
  idiviT0(word:bigint):Generator<W,void,void>;
  idivT0(word:bigint):Generator<W,void,void>;
  fscT0(scale:bigint):Generator<W,void,void>;
};
// WARMAC.MAC:2716-2753. SEED is actual private memory (BLOCK at 712).
// Arithmetic, FSC, clock and their register/trap effects are required CPU/
// monitor services. No host floating result or range guard is substituted.
export function* randomRoutine<W>(entry:RandomEntry,m:WordMemory,r:{t0:bigint;t1:bigint},
  args:SourceArguments,s:{seed:bigint},io:RandomServices<W>):Generator<W,void,void>{
  if(entry==='setran'){
    r.t1=args.read(0);if(r.t1===0n)yield*io.mstimeT1();m.write(s.seed,r.t1);return;
  }
  r.t1=m.read(s.seed);
  if(rightHalf(r.t1)===0n)r.t1=signed36(halfWords(leftHalf(r.t1),260543n));
  yield*io.imuliT1(260543n);r.t1=signed36(r.t1&MAX_INTEGER);m.write(s.seed,r.t1);
  r.t0=r.t1;yield*io.idiviT0(257n);
  if(entry==='iran'){
    yield*io.idivT0(args.read(0));r.t0=rightHalf(r.t1+1n);
  }else if(entry==='ran')yield*io.fscT0(0o200n);
}
