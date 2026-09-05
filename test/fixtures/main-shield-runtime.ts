import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { RepairServices } from '../../src/game/repair-statements.ts';
import { shieldStatements } from '../../src/game/shield-statements.ts';
import type { ShieldStatementServices,ShieldMessage } from '../../src/game/shield-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { signed36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainShieldRuntime(f:ReturnType<typeof pregameRuntimeFixture>,numeric:Pick<RepairServices<string>,'logical'|'integer'|'assign'|'equal'>){
  f.m.map(49600n,Array<bigint>(400).fill(77n));const senrgy=49600n,s={header:49610n,count:49620n},words={transfer:49630n,up:49634n,down:49636n,yes:49638n},labels={} as Record<ShieldMessage,bigint>;
  for(const [key,address] of Object.entries(words))f.h.put(address,key.toUpperCase());
  for(const [i,key] of (['shld01','shld02','shld03','shld04','shld05','shld06','shld07','shld08','shld09'] as const).entries()){labels[key]=49700n+BigInt(i*30);f.h.put(labels[key],messages[key].text);}
  const events:string[]=[],io:ShieldStatementServices<string>={...numeric,
    *negate(e){return signed36(-(yield*e()));},*greater(a,b){return (yield*a())>(yield*b());},*less(a,b){return (yield*a())<(yield*b());},
    *crlf(){yield*f.rt.run('crlf');},
    *out(key,n){events.push(key);f.m.write(s.count,BigInt(n));loadArgumentBlock(f.m,s.header,[labels[key],s.count]);selectArgumentBlock(f.r,s.header);yield*f.rt.run('out');},
    *gtkn(){events.push('gtkn');yield*f.tokens.run();},*trcoff(a){events.push('trcoff');yield*f.getHit.tractor(a);},
  }; // Explicit compiler signed negation, expression/store and literal policies.
  return {senrgy,s,words,labels,events,io,run:()=>shieldStatements(f.high,f.low,senrgy,words,io)};
}
