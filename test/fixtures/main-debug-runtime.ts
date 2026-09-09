import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import { currentVariant } from '../../src/runtime/variant-execution.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { debugRuntime,debugNumberRuntime } from '../../src/compat/debug-runtime.ts';
import type { DebugRuntimeServices } from '../../src/compat/debug-runtime.ts';
import { debugText,messages } from '../../src/runtime/variant-values.ts';
import { rightHalf,unsigned36 } from '../../src/compat/word36.ts';
export function bindMainDebugRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  const timerBase=BigInt(currentVariant().definition.timers.address);
  f.m.map(56000n,Array<bigint>(200).fill(77n));f.m.map(timerBase,Array<bigint>(250).fill(0n));
  const s={pasflg:f.low.address('pasflg'),hungup:f.low.address('hungup'),unkcom:56000n,forhlp:56020n,header:56040n,newline:56060n,tab:56070n,timnam:timerBase,timcnt:timerBase+50n,timtot:timerBase+100n,timhi:timerBase+150n};
  f.h.put(s.unkcom,messages.unkcom.text);f.h.put(s.forhlp,messages.forhlp.text);f.h.put(s.header,debugText[0].text);f.h.put(s.newline,debugText[1].text);f.m.write(s.tab,9n);
  const events:string[]=diagnosticRecords(),io:DebugRuntimeServices<string>={
    *ostr(){yield*f.rt.run('ostr.');},
    *outstr(a){events.push('outstr');let address=rightHalf(a);for(let words=0;words<200;words++,address=rightHalf(address+1n)){const w=unsigned36(f.m.read(address));for(let shift=29n;shift>=1n;shift-=7n){const c=(w>>shift)&127n;if(c===0n)return;yield*f.cpu.outchr(c);}}throw new Error('debug fixture unterminated OUTSTR');},
    *outchr(a){events.push('outchr');yield*f.cpu.outchr(f.m.read(a));},
    *number(radix){yield*f.cpu.pushP(0n);yield*debugNumberRuntime(radix,f.m,f.r,s.hungup,io);yield*f.cpu.popP();},
  }; // Explicit monitor and synthetic PUSHJ return-address fixture; not CPU equivalence.
  return {s,events,io,run:()=>debugRuntime(f.m,f.r,s,io)};
}
