import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { RepairServices } from '../../src/game/repair-statements.ts';
import { energyStatements } from '../../src/game/energy-statements.ts';
import type { EnergyStatementServices,EnergyMessage } from '../../src/game/energy-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainEnergyRuntime(f:ReturnType<typeof pregameRuntimeFixture>,numeric:Pick<RepairServices<string>,'logical'|'and'|'integer'|'assign'|'equal'>){
  f.m.map(50000n,Array<bigint>(500).fill(77n));const locals={index:50000n,i:50001n,dteam:50002n},s={header:50010n,count:50020n},labels={} as Record<EnergyMessage,bigint>;
  for(const [i,key] of (['ener1s','ener1l','unkshp','begyrp','energ7','noship','energ2','energ3','ener4s','ener4l','energ8','energ5','energ6'] as const).entries()){labels[key]=50100n+BigInt(i*25);f.h.put(labels[key],messages[key].text);}
  const events:string[]=diagnosticRecords(),hits:(typeof f.hit)[]=diagnosticRecords(),prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:EnergyStatementServices<string>={...numeric,
    *crlf(){yield*f.rt.run('crlf');},*out(key,n){events.push(key);f.m.write(s.count,BigInt(n));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *gtkn(){events.push('gtkn');yield*f.tokens.run();},
    *ldis(v,h,ov,oh,range){events.push('ldis');f.m.write(s.count,BigInt(range));prepare([v,h,ov,oh,s.count]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *intTimesPointNine(value){const w=f.weapon.io;return yield*w.convert('integer','int',{type:'real',evaluate:()=>w.binary('mul',{type:'integer',evaluate:value},{type:'real',evaluate:function*(){return w.realLiteral('0.9');}})});},
    *makhit(){events.push('makhit');hits.push({...f.hit});yield*f.makeHit.run();},
  }; // Explicit existing rational REAL test policy, never a native float default.
  return {locals,s,labels,events,hits,io,run:()=>energyStatements(f.high,f.low,locals,io)};
}
