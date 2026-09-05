import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { RepairServices } from '../../src/game/repair-statements.ts';
import { dockStatements } from '../../src/game/dock-statements.ts';
import type { DockServices } from '../../src/game/dock-statements.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainDockRuntime(f:ReturnType<typeof pregameRuntimeFixture>,numeric:Pick<RepairServices<string>,'logical'|'integer'|'assign'|'equal'|'etim'>){
  f.m.map(49200n,Array<bigint>(400).fill(77n));const locals={v:49200n,ifract:49201n,i:49202n,j:49203n},s={header:49210n,count:49220n,object:49221n,space:49222n,status:49230n,dock01:49300n,dockin:49340n};
  f.h.put(s.status,'STATUS');f.h.put(s.dock01,messages.dock01.text);f.h.put(s.dockin,messages.dockin.text);
  const events:string[]=[],prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:DockServices<string>={...numeric,trueWord:-1n,enterPlanets:(a,b)=>a<=b,
    *different(a,b){return (yield*a())!==(yield*b());},
    *etim(a){events.push('etim');return yield*numeric.etim(a);},
    *ldis(v,h,ov,oh,range){events.push('ldis');f.m.write(s.count,BigInt(range));prepare([v,h,ov,oh,s.count]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *dispc(v,h){events.push('dispc');prepare([v,h]);yield*f.rawBoard.run('dispc');return f.r.f;},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *crlf(){yield*f.rt.run('crlf');},
    *odisp(value,space){f.m.write(s.object,value);f.m.write(s.space,BigInt(space));prepare([s.object,s.space]);yield*f.rt.run('odisp');},
    *out(key,count){events.push(key);f.m.write(s.count,BigInt(count));prepare([s[key],s.count]);yield*f.rt.run('out');},
    *status(token){events.push('status');f.m.write(f.statusReport.stoken,BigInt(token));yield*f.statusReport.run();},
  }; // Existing explicit arithmetic/LOGICAL/call policies, raw board/distance and clocks.
  return {locals,s,events,io,run:()=>dockStatements(f.high,f.low,locals,s.status,io)};
}
