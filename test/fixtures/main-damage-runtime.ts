import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { damageStatements } from '../../src/game/damage-statements.ts';
import type { DamageServices } from '../../src/game/damage-statements.ts';
import { messages } from '../../src/generated/source-data.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';

// Reuses the main runtime's loaded DEVICE words, ODEV tables, raw EQUAL,
// board and output. Only DAMAGE's compiler locals/literals/temporaries are added.
export function bindMainDamageRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(48400n,Array<bigint>(400).fill(77n));
  const locals={i:48400n,j:48401n},s={stoken:48402n,header:48410n,count:48420n,width:48421n,object:48422n,zero:48423n};
  const labels={alldok:48500n,units1:48540n,damrep:48580n,dmhdr1:48620n,dmhdr2:48660n};
  for(const key of Object.keys(labels) as (keyof typeof labels)[])f.h.put(labels[key],messages[key].text);
  const events:string[]=[],prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:DamageServices<string>={logical:f.weapon.io.logical,enterTokenLoop:(a,b)=>a<=b,
    *equal(a,b){events.push('equal');return yield*f.pregameInput.io.equal(a,b);},
    *out(key,count){events.push(key);f.m.write(s.count,BigInt(count));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *crlf(){events.push('crlf');yield*f.rt.run('crlf');},*space(){yield*f.rt.run('space');},
    *tab(n){f.m.write(s.count,BigInt(n));prepare([s.count]);yield*f.rt.run('tab');},
    *spaces(n){f.m.write(s.count,BigInt(n));prepare([s.count]);yield*f.rt.run('spaces');},
    *skip(n){f.m.write(s.count,BigInt(n));prepare([s.count]);yield*f.rt.run('skip');},
    *odev(a){events.push('odev');prepare([a]);yield*f.rt.run('odev');},
    *oflt(a,width){events.push('oflt');f.m.write(s.width,BigInt(width));prepare([a,s.width]);yield*f.rt.run('oflt');},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *odisp(value,zero){f.m.write(s.object,value);f.m.write(s.zero,BigInt(zero));prepare([s.object,s.zero]);yield*f.rt.run('odisp');},
  };
  return {locals,s,labels,events,io,run:(stoken=s.stoken)=>damageStatements(f.high,f.low,stoken,locals,io)};
}
