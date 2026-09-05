import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';

export type ClockServices<W>={
  mstime():Generator<W,void,void>; // MSTIME 0, writes live AC0 with CPU/monitor effects.
  runtim():Generator<W,void,void>; // RUNTIM 0, uses live AC0 job argument/result.
  sub0(word:bigint):Generator<W,void,void>; // SUB 0,operand, including flags/overflow effects.
};
// WARMAC DAYTIM/RUNTIM/ETIM:3959-3997. Function result aliases AC0/F.
// DAYTIM/RUNTIM also MOVEM into the current argument after the monitor call.
// ETIM reads its argument only after MSTIME; corrections are separate tests.
export function* clockRoutine<W>(entry:'daytim'|'runtim'|'etim',m:WordMemory,r:{f:bigint},args:SourceArguments,
  io:ClockServices<W>):Generator<W,void,void>{
  if(entry==='runtim'){r.f=0n;yield*io.runtim();}
  else yield*io.mstime();
  if(entry!=='etim'){m.write(args.address(0),r.f);return;}
  yield*io.sub0(args.read(0));
  if(r.f< -43200000n)yield*io.sub0(-86400000n);
  if(r.f>43200000n)yield*io.sub0(86400000n);
}
