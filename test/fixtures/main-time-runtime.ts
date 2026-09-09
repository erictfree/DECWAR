import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { timeStatements } from '../../src/game/time-command.ts';
import type { TimeStatementServices,TimeHeading } from '../../src/game/time-command.ts';
import { clockRoutine } from '../../src/compat/clock-runtime.ts';
import type { ClockServices } from '../../src/compat/clock-runtime.ts';
import { add36 } from '../../src/compat/word36.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainTimeRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(48800n,Array<bigint>(400).fill(77n));const s={header:48800n,zero:48810n,value:48811n,d:48812n},labels={} as Record<TimeHeading,bigint>;
  for(const [i,key] of (['time01','time02','time03','time04','time05'] as const).entries()){labels[key]=48900n+BigInt(i*40);f.h.put(labels[key],messages[key].text);}
  f.m.write(s.zero,0n);const runs:bigint[]=[],events:string[]=diagnosticRecords(),prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const clockIO:ClockServices<string>={...f.clockIO,*runtim(){events.push('runtim');assert.ok(runs.length,'TIME requires scheduled RUNTIM');f.r.f=runs.shift()!;}};
  function* clock(entry:'etim'|'daytim'|'runtim',a:bigint):Generator<string,bigint,void>{events.push(entry);prepare([a]);yield*clockRoutine(entry,f.m,f.r,f.rt.args,clockIO);return f.r.f;}
  const io:TimeStatementServices<string>={
    *out(key){events.push(key);prepare([labels[key],s.zero]);yield*f.rt.run('out');},
    *otim(value){f.m.write(s.value,value);prepare([s.value]);yield*f.rt.run('otim');},*crlf(){yield*f.rt.run('crlf');},
    *etim(a){return yield*clock('etim',a);},*runtim(){return yield*clock('runtim',s.d);},*daytim(){return yield*clock('daytim',s.d);},
    *runtimeDifference(run,start){return add36(yield*run(),-start());},
  }; // Explicit shared scheduled MSTIME, required RUNTIM, compiler subtraction/temporary policy.
  return {s,labels,runs,events,clockIO,io,run:()=>timeStatements(f.high,f.low,io)};
}
