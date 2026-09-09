import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import { powerRoutine } from '../../src/compat/power-runtime.ts';
import type { RawPowerServices } from '../../src/compat/power-runtime.ts';
import type { outputRuntimeFixture } from './output-runtime.ts';
import { divide36,signed36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { orderedRational as real } from '../support/rational-real.ts';
import type { Rational } from '../support/rational-real.ts';
type Runtime=Pick<ReturnType<typeof outputRuntimeFixture>,'m'|'r'|'rt'>;
// Opaque 36-bit handles for exact rational fixture values. These are explicitly
// NOT PDP-10 floating words. Only instruction/stack/control ordering is tested.
export function powerRuntimeFixture(f:Runtime){
  const s={oneImmediate:1n},values=new Map<bigint,Rational>([[262144n,real.literal('1')]]),events:string[]=diagnosticRecords();
  let next=262145n;
  const encode=(n:Rational)=>{const key=next++;values.set(key,n);return key;};
  const decode=(w:bigint)=>{const n=values.get(w);assert.ok(n,`unknown rational handle ${w}`);return n;};
  const io:RawPowerServices<string>={...f.rt.stack,
    *idiviX3(n){events.push('divide');const d=divide36(f.r.x3,n);f.r.x3=d.quotient;f.r.x4=d.remainder;},
    *fmpr(destination,source){events.push(`${destination}*${source}`);f.r[destination]=signed36(encode(real.multiply(decode(f.r[destination]),decode(f.r[source]))));},
  };
  const run=(entry:'pwr'|'pwr.')=>powerRoutine(entry,f.r,f.rt.args,s,io);
  const prepare=(base:Rational,exponentAddress:bigint)=>{f.m.write(13780n,encode(base));loadArgumentBlock(f.m,13790n,[13780n,exponentAddress]);selectArgumentBlock(f.r,13790n);};
  return {s,io,values,events,encode,decode,run,prepare,
    *call(base:Rational,exponentAddress:bigint):Generator<string,Rational,void>{prepare(base,exponentAddress);yield*run('pwr');return decode(f.r.t0);},
  };
}
