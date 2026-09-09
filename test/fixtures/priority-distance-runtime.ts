import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import { priorityDistanceStatements } from '../../src/game/priority-distance-statements.ts';
import type { PriorityArguments,PriorityStatementServices } from '../../src/game/priority-distance-statements.ts';
import type { CommonBlock } from '../../src/compat/memory.ts';
import type { outputRuntimeFixture } from './output-runtime.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { add36,signed36,MIN_INTEGER } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';

type Runtime=Pick<ReturnType<typeof outputRuntimeFixture>,'m'|'r'|'rt'>;
export function priorityDistanceRuntimeFixture(f:Runtime,high:CommonBlock,low:CommonBlock){
  const locals={li:13130n,lj:13131n,i:13132n},events:bigint[][]=diagnosticRecords();
  const cpu={*subT1(w:bigint):Generator<string,void,void>{f.r.t1=add36(f.r.t1,-w);},*movmT1():Generator<string,void,void>{assert.notEqual(f.r.t1,MIN_INTEGER);if(f.r.t1<0n)f.r.t1=-f.r.t1;}};
  const io:PriorityStatementServices<string>={logical:w=>w<0n,enterLoop:(s,l)=>s<=l,
    *bounds(s,l){return {start:yield*s(),limit:yield*l()};},
    *assign(d,v){const n=yield*v();f.m.write(d(),n);},
    *integerOr(l,r){return signed36((yield*l())|(yield*r()));},
    *ldis(v,h,ov,oh,n){events.push([v,h,ov,oh,n]);loadArgumentBlock(f.m,13520n,[v,h,ov,oh,n]);selectArgumentBlock(f.r,13520n);yield*rawLdis(f.r,f.rt.args,cpu);return f.r.f;},
  }; // Explicit ordinary compiler/CPU/local/call fixtures, with suspending LDIS.
  return {locals,events,cpu,io,run:(a:PriorityArguments)=>priorityDistanceStatements(high,low,a,locals,io)};
}
