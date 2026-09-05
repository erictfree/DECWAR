import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindFreeRuntime } from './free-runtime.ts';
import type { bindJobStatusRuntime } from './job-status-runtime.ts';
import { restartStatements } from '../../src/game/restart-statements.ts';
import type { RestartStatementServices } from '../../src/game/restart-statements.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { messages } from '../../src/runtime/variant-values.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{free:ReturnType<typeof bindFreeRuntime>;jobStatus:ReturnType<typeof bindJobStatusRuntime>};
export function bindRestartRuntime(f:Host){
  f.m.map(25800n,Array<bigint>(400).fill(0n));const locals={tteam:f.free.locals.tteam,i:f.free.locals.i,dummy:25404n},header=25800n,lines=25810n,labels={free01:25820n,free02:25850n};
  f.m.write(locals.dummy,77n);for(const key of ['free01','free02'] as const)f.h.put(labels[key],messages[key].text);
  const events:string[]=[],prepare=(a:bigint[])=>{loadArgumentBlock(f.m,header,a);selectArgumentBlock(f.r,header);},base=f.free.io;
  const io:RestartStatementServices<string>={logical:base.logical,*binary(...a){return yield*base.binary(...a);},*assign(...a){yield*base.assign(...a);},*bounds(...a){return yield*base.bounds(...a);},enterLoop:base.enterLoop,
    *assignAliveTrue(d){f.m.write(d(),-1n);},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *lock(a,caller){events.push('lock:'+caller);yield*base.lock(a);}, // WARMAC LOCK reads only its first argument.
    *unlock(a){events.push('unlock');yield*base.unlock(a);},
    *jobsta(args){events.push('jobsta');yield*f.jobStatus.run(args);},
    *setdsp(v,h,s){events.push('setdsp');prepare([v,h,s]);yield*f.rawBoard.run('setdsp');},
    *out(key,n){events.push(key);f.m.write(lines,BigInt(n));prepare([labels[key],lines]);yield*f.rt.run('out');},
    *monit(){events.push('monit');throw new Error('fixture requires RSTART MONIT continuation');},
  };
  return {locals,events,io,run:(snum=f.free.snum)=>restartStatements(f.high,f.low,f.free.fr,snum,locals,io)};
}
