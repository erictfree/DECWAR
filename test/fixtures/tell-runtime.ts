import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindRadioRuntime } from './radio-runtime.ts';
import type { bindMakeMessageRuntime } from './make-message-runtime.ts';
import { tellStatements,tellMessages } from '../../src/game/tell-statements.ts';
import type { TellStatementServices,TellStatementLocals,TellMessage } from '../../src/game/tell-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { signed36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { rawIngal } from '../../src/compat/ingal.ts';
import { randomRuntimeFixture } from './random-runtime.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{radio:ReturnType<typeof bindRadioRuntime>;makeMessage:ReturnType<typeof bindMakeMessageRuntime>};
export function bindTellRuntime(f:Host){
  f.m.map(29400n,Array<bigint>(600).fill(0n));const locals={} as TellStatementLocals;
  for(const [i,key] of (['sntrom','rmspk','p','i','j','gm','gbits','svdb','mask','iship','ph','pv','ix','ir','jr'] as const).entries()){locals[key]=29400n+BigInt(i);f.m.write(locals[key],77n);}locals.local=29420n;
  const header=29450n,lines=29460n,vertical=29461n,horizontal=29462n,object=29463n,romulan=29480n,labels={} as Record<TellMessage|'Romulan',bigint>,events:string[]=[];
  f.h.put(romulan,'ROMULAN');for(const [i,key] of [...tellMessages,'Romulan' as const].entries()){labels[key]=29500n+BigInt(i*32);f.h.put(labels[key],key==='Romulan'?'Romulan':messages[key].text);}
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,header,a);selectArgumentBlock(f.r,header);},radio=f.radio.io,random=randomRuntimeFixture(f);
  const io:TellStatementServices<string>={...radio,
    *and(...terms){return yield*f.weapon.io.and(...terms);},*assignTruth(a,b){f.m.write(a(),b?-1n:0n);},*complement(a){return signed36(~(yield*a.evaluate()));},
    *out(key,n){events.push(key);f.m.write(lines,BigInt(n));prepare([labels[key],lines]);yield*f.rt.run('out');},
    *outw(a){events.push('outw:'+a);prepare([a]);yield*f.rt.run('outw');},
    *gtkn(){events.push('gtkn');yield*f.tokens.run();},*crlf(){events.push('crlf');yield*f.rt.run('crlf');},
    *odisp(...a){events.push('odisp');yield*radio.odisp(...a);},
    *romspk(){throw new Error('ROMSPK requires source runtime binding');},
    *makmsg(a){events.push(a===undefined?'makmsg:input':'makmsg:local');yield*f.makeMessage.run(a===undefined?[]:[a]);},
    *iran(n){events.push('iran:'+n);return yield*random.iran(BigInt(n));},
    *ingal(v,h){f.m.write(vertical,yield*v.evaluate());f.m.write(horizontal,yield*h.evaluate());events.push(`ingal:${f.m.read(vertical)},${f.m.read(horizontal)}`);prepare([vertical,horizontal]);yield*rawIngal(f.r,f.rt.args);return f.r.f;},
    *disp(v,h){f.m.write(vertical,yield*v.evaluate());f.m.write(horizontal,yield*h.evaluate());events.push(`disp:${f.m.read(vertical)},${f.m.read(horizontal)}`);prepare([vertical,horizontal]);yield*f.rawBoard.run('disp');return f.r.t0;},
    *setdsp(v,h,n){events.push(`setdsp:${f.m.read(v)},${f.m.read(h)},${n}`);f.m.write(object,BigInt(n));prepare([v,h,object]);yield*f.rawBoard.run('setdsp');},
  }; // Explicit truth, left-first expressions, literals and ordinary CPU fixtures.
  return {locals,romulan,labels,io,events,random,run:()=>tellStatements(f.high,f.low,locals,romulan,io)};
}
