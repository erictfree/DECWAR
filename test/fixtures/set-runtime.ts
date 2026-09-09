import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import { setStatements,setSwitches,setMessages } from '../../src/game/set-statements.ts';
import type { SetStatementServices,SetSymbols } from '../../src/game/set-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindSetRuntime(f:ReturnType<typeof pregameInputRuntimeFixture>){
  f.m.map(22300n,Array<bigint>(900).fill(0n));
  const locals={p:22300n,i:22301n,j:22302n,ia:22303n,ja:22304n},header=22310n,zero=22320n,lines=22321n;
  for(const a of Object.values(locals))f.m.write(a,88n);
  const symbols={} as SetSymbols;
  for(const [i,key] of setSwitches.entries()){symbols[key]=22340n+BigInt(i*8);f.h.put(symbols[key],key);}
  for(const [i,key] of setMessages.entries()){symbols[key]=22500n+BigInt(i*32);f.h.put(symbols[key],messages[key].text);}
  const prepare=(args:bigint[])=>{loadArgumentBlock(f.m,header,args);selectArgumentBlock(f.r,header);},events:string[]=diagnosticRecords(),numeric=f.weapon.io;
  const io:SetStatementServices<string>={logical:numeric.logical,not:w=>!numeric.logical(w),
    *assign(...a){yield*numeric.assign(...a);},*assignTrue(d){f.m.write(d(),-1n);}, // Explicit logical-to-integer fixture encoding.
    *bounds(...a){return yield*f.location.io.bounds(...a);},enterLoop:f.location.io.enterLoop,
    *equal(a,b){events.push('equal:'+b);return yield*f.pregameInput.io.equal(a,b);},
    *out(key,n){events.push(key);f.m.write(lines,BigInt(n));prepare([symbols[key],lines]);yield*f.rt.run('out');},
    *crlf(){events.push('crlf');yield*f.rt.run('crlf');},*gtkn(){events.push('gtkn');yield*f.tokens.run();},
    *usrnam(){throw new Error('fixture requires raw USRNAM');},*endgam(){throw new Error('fixture requires ENDGAM');},
    *dispc(v,h){events.push(`dispc:${f.m.read(v)},${f.m.read(h)}`);prepare([v,h]);yield*f.rawBoard.run('dispc');return f.r.f;},
    *setdsp(v,h,z){events.push(`setdsp:${f.m.read(v)},${f.m.read(h)}`);f.m.write(zero,BigInt(z));prepare([v,h,zero]);yield*f.rawBoard.run('setdsp');},
  };
  return {locals,symbols,header,zero,events,io,run:()=>setStatements(f.high,f.low,locals,symbols,io)};
}
