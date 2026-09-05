import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import { typeStatements,typeMessages } from '../../src/game/type-statements.ts';
import type { TypeStatementServices,TypeMessage } from '../../src/game/type-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindTypeRuntime(f:ReturnType<typeof pregameInputRuntimeFixture>){
  f.m.map(21700n,Array<bigint>(600).fill(0n));
  const symbols={p:21700n,kind:21701n,header:21710n,lines:21720n,O:21730n,OUTPUT:21734n,OPTION:21738n};
  f.m.write(symbols.p,88n);f.m.write(symbols.kind,0n);
  for(const key of ['O','OUTPUT','OPTION'] as const)f.h.put(symbols[key],key);
  const labels={} as Record<TypeMessage,bigint>;for(const [i,key] of typeMessages.entries()){labels[key]=21800n+16n*BigInt(i);f.h.put(labels[key],messages[key].text);}
  const numeric=f.weapon.io,events:string[]=[],prepare=(args:bigint[])=>{loadArgumentBlock(f.m,symbols.header,args);selectArgumentBlock(f.r,symbols.header);};
  const io:TypeStatementServices<string>={logical:numeric.logical,not:w=>!numeric.logical(w),
    *assign(...a){yield*numeric.assign(...a);},*compare(...a){return yield*numeric.compare(...a);},
    *twoLabelIf(field,v){events.push('branch:'+field);return (yield*v.evaluate())<0n?'first':'second';}, // Explicit two-label compiler fixture.
    *equal(a,key){events.push('equal:'+key);return yield*f.pregameInput.io.equal(a,symbols[key]);},
    *out(key,n){events.push(key);f.m.write(symbols.lines,BigInt(n));prepare([labels[key],symbols.lines]);yield*f.rt.run('out');},
    *out2w(a,b){events.push('out2w');prepare([a(),b()]);yield*f.rt.run('out2w');}, // Explicit left-to-right argument fixture.
    *crlf(){events.push('crlf');yield*f.rt.run('crlf');},*gtkn(){events.push('gtkn');yield*f.tokens.run();},
  };
  return {symbols,labels,io,events,*call(kind:0|1|2){f.m.write(symbols.kind,BigInt(kind));yield*typeStatements(f.high,f.low,symbols.kind,symbols.p,io);},run:(kind:bigint)=>typeStatements(f.high,f.low,kind,symbols.p,io)};
}
