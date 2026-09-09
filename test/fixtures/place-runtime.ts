import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { placeStatements } from '../../src/game/place-statements.ts';
import type { PlaceStatementArguments,PlaceStatementServices } from '../../src/game/place-statements.ts';
import { add36,divide36 } from '../../src/compat/word36.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindPlaceRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(46000n,Array<bigint>(400).fill(77n));const locals={k:46000n,i:46001n,pteam:46002n},s={header:46020n,object:46100n,n:46101n,v:46102n,h:46103n,range:46104n};
  const events:string[]=diagnosticRecords(),draws:bigint[]=diagnosticRecords(),prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:PlaceStatementServices<string>={logical:f.weapon.io.logical,
    *integer(op,l,r){const a=yield*l(),b=yield*r();return op==='sub'?add36(a,-b):divide36(a,b).quotient;},
    *compare(op,l,r){const a=yield*l(),b=yield*r();return op==='gt'?a>b:op==='le'?a<=b:a!==b;},
    *assign(a,e){const word=yield*e();f.m.write(a(),word);},*or(a,b){return (yield*a())||(yield*b());},
    *bounds(a,b){return {start:yield*a(),limit:yield*b()};},enterLoop:(a,b)=>a<=b,
    *iran(max){events.push('iran:'+max);const word=yield*f.tell.random.iran(BigInt(max));draws.push(word);return word;},
    *disp(v,h){events.push(`disp:${f.m.read(v)},${f.m.read(h)}`);prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *dispc(v,h){events.push(`dispc:${f.m.read(v)},${f.m.read(h)}`);prepare([v,h]);yield*f.rawBoard.run('dispc');return f.r.f;},
    *ldis(v,h,ov,oh,range){events.push(`ldis:${f.m.read(v)},${f.m.read(h)},${f.m.read(ov)},${f.m.read(oh)},${range}`);f.m.write(s.range,BigInt(range));prepare([v,h,ov,oh,s.range]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *setdsp(v,h,object){events.push(`setdsp:${f.m.read(v)},${f.m.read(h)},${f.m.read(object)}`);prepare([v,h,object]);yield*f.rawBoard.run('setdsp');},
  }; // Explicit left-first, RHS-first, sign-logical, short-circuit and ordinary DO fixture.
  const run=(args:PlaceStatementArguments=s)=>placeStatements(f.high,args,locals,io);
  return {locals,s,events,draws,io,run};
}
