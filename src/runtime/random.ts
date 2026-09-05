import type { WordMemory } from '../compat/memory.ts';
import type { SourceArguments } from '../compat/fortran-call.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../compat/fortran-call.ts';
import { randomRoutine } from '../compat/random-runtime.ts';
import type { RandomServices } from '../compat/random-runtime.ts';
// WARMAC:2716-2753, one SEED per low segment. Both public entries go through
// the same actual words and machine services. FSC is required, never replaced
// by Math.random or independently scheduled floating draws in this composition.
export function createSessionRandom<W>(m:WordMemory,r:{t0:bigint;t1:bigint;arg:bigint},args:SourceArguments,
  s:{seed:bigint;header:bigint;argument:bigint},cpu:RandomServices<W>){
  function prepare(word:bigint){m.write(s.argument,word);loadArgumentBlock(m,s.header,[s.argument]);selectArgumentBlock(r,s.header);}
  return {
    *setran(seed:bigint):Generator<W,void,void>{prepare(seed);yield*randomRoutine('setran',m,r,args,s,cpu);},
    *iran(max:bigint):Generator<W,bigint,void>{prepare(max);yield*randomRoutine('iran',m,r,args,s,cpu);return r.t0;},
    *ran(dummy:bigint):Generator<W,bigint,void>{prepare(dummy);yield*randomRoutine('ran',m,r,args,s,cpu);return r.t0;},
  };
}
