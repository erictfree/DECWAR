import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindGetMessageRuntime } from './get-message-runtime.ts';
import type { bindRadioRuntime } from './radio-runtime.ts';
import { outMessageStatements } from '../../src/game/out-message-statements.ts';
import type { OutMessageStatementServices } from '../../src/game/out-message-statements.ts';
import { WordBlock } from '../../src/compat/memory.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { messages,outputTables } from '../../src/runtime/variant-values.ts';
import { divide36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{getMessage:ReturnType<typeof bindGetMessageRuntime>;radio:ReturnType<typeof bindRadioRuntime>};
export function bindOutMessageRuntime(f:Host){
  f.m.map(32000n,Array<bigint>(300).fill(0n));f.m.map(BigInt(localLayout.message.address),Array<bigint>(localLayout.message.words).fill(0n));const om=new WordBlock(f.m,localLayout.message),locals={i:32000n,k:32001n};
  f.m.write(locals.i,77n);f.m.write(locals.k,77n);const header=32010n,lines=32020n,detail=32021n,labels={mess01:32100n,mess02:32140n},events:string[]=[];
  for(const key of ['mess01','mess02'] as const)f.h.put(labels[key],messages[key].text);
  // Source ODISP class five literals (WARMAC:2413,2437) for received speech.
  f.h.put(32030n,outputTables.shtdsp[5].text);f.h.put(32040n,outputTables.lngdsp[5].text);f.m.write(f.s.object.shtdsp+5n,32030n);f.m.write(f.s.object.lngdsp+5n,32040n);
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,header,a);selectArgumentBlock(f.r,header);},radio=f.radio.io;
  const io:OutMessageStatementServices<string>={...radio,
    *mod(a,b){return divide36(yield*a.evaluate(),yield*b.evaluate()).remainder;},
    *getmsg(a,b){events.push('getmsg');yield*f.getMessage.run(a,b);},
    *out(key,n){events.push(key);f.m.write(lines,BigInt(n));prepare([labels[key],lines]);yield*f.rt.run('out');},
    *outBuffer(a,n){events.push('buffer');f.m.write(lines,BigInt(n));prepare([a,lines]);yield*f.rt.run('out');},
    *odisp(a,d){events.push('odisp');f.m.write(detail,BigInt(d));prepare([a,detail]);yield*f.rt.run('odisp');},
    *out2c(a){events.push('out2c:'+a);prepare([a]);yield*f.rt.run('out2c');},
    *crlf(){events.push('crlf');yield*f.rt.run('crlf');},
  }; // Explicit signed MOD, expression/DO, literal and raw monitor/CPU fixtures.
  return {om,locals,labels,io,events,run:()=>outMessageStatements(f.high,f.low,om,locals,io)};
}
