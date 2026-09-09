import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainEnergyRuntime } from './main-energy-runtime.ts';
import { tractorStatements } from '../../src/game/tractor-statements.ts';
import type { TractorStatementServices,TractorMessage } from '../../src/game/tractor-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { signed36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainTractorRuntime(f:ReturnType<typeof pregameRuntimeFixture>,energy:ReturnType<typeof bindMainEnergyRuntime>){
  f.m.map(52500n,Array<bigint>(500).fill(77n));const locals={index:52500n,i:52501n,dteam:52502n,iship:52503n},s={header:52510n,count:52520n,off:52530n,ip:52540n},labels={} as Record<TractorMessage,bigint>;
  f.h.put(s.off,'OFF');for(const [i,key] of (['tract1','tract2','tract3','tract4','tract5','tract6','tract7','tract8','unkshp','noship','energ3'] as const).entries()){labels[key]=52600n+BigInt(i*30);f.h.put(labels[key],messages[key].text);}
  const events:string[]=diagnosticRecords(),hits:(typeof f.hit)[]=diagnosticRecords(),policy:{ip?:bigint}={},prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:TractorStatementServices<string>={logical:energy.io.logical,equal:energy.io.equal,ldis:energy.io.ldis,
    *or(a,b){return a()||b();},*integerOr(a,b){return signed36(a()|b());},
    *crlf(){yield*f.rt.run('crlf');},*gtkn(){events.push('gtkn');yield*f.tokens.run();},
    *out(key,n){events.push(key);f.m.write(s.count,BigInt(n));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *odisp(a,n){events.push('odisp');f.m.write(s.count,BigInt(n));prepare([a,s.count]);yield*f.rt.run('odisp');},
    argument(){if(policy.ip===undefined)throw new Error('TRACTR requires zero-argument IP binding');return policy.ip;},
    *trcoff(a){events.push('trcoff');yield*f.getHit.tractor(a);},
    *makhit(){events.push('makhit');hits.push({...f.hit});yield*f.makeHit.run();},
  };
  return {locals,s,labels,events,hits,policy,io,run:()=>tractorStatements(f.high,f.low,locals,s.off,io)};
}
