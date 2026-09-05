import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import { radioStatements,radioMessages } from '../../src/game/radio-statements.ts';
import type { RadioStatementServices,RadioMessage,RadioSymbols } from '../../src/game/radio-statements.ts';
import { messages,ships } from '../../src/generated/source-data.ts';
import { halfWords,signed36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindRadioRuntime(f:ReturnType<typeof pregameInputRuntimeFixture>){
  f.m.map(28800n,Array<bigint>(600).fill(0n));const locals={index:28800n,gagtyp:28801n,i:28802n,iteam:28803n},symbols={} as RadioSymbols,labels={} as Record<RadioMessage,bigint>,header=28860n,lines=28870n,object=28871n,detail=28872n;
  for(const a of Object.values(locals))f.m.write(a,77n);for(const [i,key] of (['ON','OFF','GAG','UNGAG'] as const).entries()){symbols[key]=28820n+BigInt(i*8);f.h.put(symbols[key],key);}for(const [i,key] of radioMessages.entries()){labels[key]=28900n+BigInt(i*32);f.h.put(labels[key],messages[key].text);}
  // Explicit relocated SHTDSP/LNGDSP ship entries from WARMAC:2409-2439.
  for(const n of [1n,2n]){f.m.write(f.s.object.shtdsp+n,halfWords(2n,29139n));f.m.write(f.s.object.lngdsp+n,halfWords(0o22n,f.s.status.lngshp-1n));}
  for(const ship of ships){f.h.put(29140n+BigInt(ship.id-1),ship.name[0]);const a=29200n+3n*BigInt(ship.id-1);f.h.put(a,ship.name);f.m.write(f.s.status.lngshp+BigInt(ship.id-1),a);}
  const events:string[]=[],numeric=f.weapon.io,prepare=(args:bigint[])=>{loadArgumentBlock(f.m,header,args);selectArgumentBlock(f.r,header);};
  const io:RadioStatementServices<string>={logical:numeric.logical,*assign(...a){yield*numeric.assign(...a);},*binary(...a){return yield*numeric.binary(...a);},*or(...a){return yield*numeric.or(...a);},
    *bits(op,a,b){const left=yield*a.evaluate(),right=yield*b.evaluate();return signed36(op==='or'?left|right:left&right);},*negate(v){return signed36(-(yield*v.evaluate()));},
    *bounds(a,b){return yield*f.location.io.bounds(a,b,1);},enterLoop:(a,b)=>f.location.io.enterLoop(a,b,1),
    *equal(a,b){events.push('equal:'+b);return yield*f.pregameInput.io.equal(a,b);},*crlf(){events.push('crlf');yield*f.rt.run('crlf');},*gtkn(){events.push('gtkn');yield*f.tokens.run();},
    *out(key,n){events.push(key);f.m.write(lines,BigInt(n));prepare([labels[key],lines]);yield*f.rt.run('out');},
    *odisp(v,d){f.m.write(object,yield*v.evaluate());f.m.write(detail,BigInt(d));events.push('odisp:'+f.m.read(object));prepare([object,detail]);yield*f.rt.run('odisp');},
  };
  return {locals,symbols,labels,events,io,run:()=>radioStatements(f.high,f.low,locals,symbols,io)};
}
