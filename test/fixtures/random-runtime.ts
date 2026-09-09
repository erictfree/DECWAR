import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import { createSessionRandom } from '../../src/runtime/random.ts';
import assert from 'node:assert/strict';
import { randomRoutine } from '../../src/compat/random-runtime.ts';
import type { RandomEntry,RandomServices } from '../../src/compat/random-runtime.ts';
import type { outputRuntimeFixture } from './output-runtime.ts';
import { multiply36,divide36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Runtime=Pick<ReturnType<typeof outputRuntimeFixture>,'m'|'r'|'rt'|'file'>;
export function randomRuntimeFixture(f:Runtime){
  const s={seed:f.file.address('seed')},events:string[]=diagnosticRecords(),clock:bigint[]=[];
  const divide=(w:bigint)=>{const d=divide36(f.r.t0,w);f.r.t0=d.quotient;f.r.t1=d.remainder;};
  const io:RandomServices<string>={
    *mstimeT1(){events.push('mstime');assert.ok(clock.length,'unscheduled MSTIME');f.r.t1=clock.shift()!;},
    *imuliT1(w){events.push('imuli');f.r.t1=multiply36(f.r.t1,w);},
    *idiviT0(w){events.push(`idivi:${w}`);divide(w);},
    *idivT0(w){events.push(`idiv:${w}`);divide(w);},
    *fscT0(){throw new Error('FSC requires an explicit CPU floating-point fixture');},
  }; // Ordinary integer CPU and clock fixtures; no production defaults.
  const run=(entry:RandomEntry)=>randomRoutine(entry,f.m,f.r,f.rt.args,s,io);
  const prepare=(n:bigint)=>{f.m.write(13750n,n);loadArgumentBlock(f.m,13740n,[13750n]);selectArgumentBlock(f.r,13740n);};
  const session=createSessionRandom(f.m,f.r,f.rt.args,{...s,header:13740n,argument:13750n},io);
  return {s,io,events,clock,run,prepare,...session};
}
