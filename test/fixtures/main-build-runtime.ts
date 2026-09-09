import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { RepairServices } from '../../src/game/repair-statements.ts';
import type { bindRemovePlanetRuntime } from './remove-planet-runtime.ts';
import { buildStatements } from '../../src/game/build-statements.ts';
import type { BuildServices,BuildMessage } from '../../src/game/build-statements.ts';
import { prlocStatements } from '../../src/game/prloc-statements.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainBuildRuntime(f:ReturnType<typeof pregameRuntimeFixture>,numeric:Pick<RepairServices<string>,'logical'|'and'|'integer'|'assign'|'etim'>,removal:ReturnType<typeof bindRemovePlanetRuntime>){
  f.m.map(54000n,Array<bigint>(500).fill(77n));const locals={v:54000n,tem:54001n,vloc:54002n,hloc:54003n,c:54004n,i:54005n,j:54006n},s={header:54010n,count:54020n,value:54021n,char:54022n,prcflg:54023n,w:54024n,tw:54025n},labels={} as Record<BuildMessage,bigint>;
  for(const [i,key] of (['build1','build2','build3','build4','build5','build7','noplnt','captu5','busy1','busy2'] as const).entries()){labels[key]=54100n+BigInt(i*30);f.h.put(labels[key],key==='busy1'?'Sorry, Captain, but the construction crew is':key==='busy2'?'busy with repairs at the moment.':messages[key].text);}f.h.put(s.char,'s');
  const events:string[]=diagnosticRecords(),prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:BuildServices<string>={...numeric,*or(a,b){return a()||b();},
    *locate(entry,n){events.push(entry);return yield*f.io.locate(entry,n);},
    *ldis(v,h,ov,oh,range){f.m.write(s.count,BigInt(range));prepare([v,h,ov,oh,s.count]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *board(entry,v,h){prepare([v,h]);yield*f.rawBoard.run(entry);return f.r.f;},
    *setdsp(v,h,code){events.push('setdsp');f.m.write(s.value,yield*code());prepare([v,h,s.value]);yield*f.rawBoard.run('setdsp');},
    *lock(){events.push('lock');yield*f.io.lock(f.high.address('plnlok'));},*unlock(){events.push('unlock');yield*f.io.unlock(f.high.address('plnlok'));},
    *plnrmv(i,team){events.push('plnrmv');yield*removal.run(i,team);},
    *crlf(){yield*f.rt.run('crlf');},*outc(){prepare([s.char]);yield*f.rt.run('outc');},
    *out(key,n){events.push(key);f.m.write(s.count,BigInt(n));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *odec(a,n){f.m.write(s.count,BigInt(n));prepare([a,s.count]);yield*f.rt.run('odec');},
    *odisp(e,n){f.m.write(s.value,yield*e());f.m.write(s.count,BigInt(n));prepare([s.value,s.count]);yield*f.rt.run('odisp');},
    *prloc(v,h){f.m.write(s.prcflg,0n);f.m.write(s.w,0n);yield*prlocStatements(f.m,f.high,f.low,{v,h,prcflg:s.prcflg,w:s.w,tw:s.tw,prlflg:f.low.address('ocflg'),proflg:f.low.address('oflg')},f.pi);},
  };
  return {locals,s,labels,events,io,run:()=>buildStatements(f.high,f.low,locals,io)};
}
