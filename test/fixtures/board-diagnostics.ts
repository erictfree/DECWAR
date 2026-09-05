import { boardDiagnostic,traceRoutine } from '../../src/compat/board-diagnostics.ts';
import type { BoardDiagnosticServices,TraceServices } from '../../src/compat/board-diagnostics.ts';
import type { CommonBlock } from '../../src/compat/memory.ts';
import type { outputRuntimeFixture } from './output-runtime.ts';
import { add36,halfWords } from '../../src/compat/word36.ts';
export type DiagnosticFixtureRuntime=Pick<ReturnType<typeof outputRuntimeFixture>,'m'|'r'|'rt'|'cpu'|'h'>;
// Literal/range placement and CPU policies are explicit test assembler fixtures.
// P remains caller-owned: tests must install any return frames they intend to trace.
export function boardDiagnosticsFixture(f:DiagnosticFixtureRuntime,low:CommonBlock){
  const s={pasflg:low.address('pasflg'),kgalv:75n,kgalh:75n,rngtbl:13220n,illegalCoordinate:13240n,illegalDisplay:13250n};
  const ranges=[[0,0],[1,5],[6,10],[1,10],[1,10],[0,1],[1,80],[1,80],[1,80],[0,0],[0,0]];
  ranges.forEach(([lo,hi],i)=>f.m.write(s.rngtbl+BigInt(i),halfWords(BigInt(lo!),BigInt(hi!))));
  f.h.put(s.illegalCoordinate,'%Illegal coordinate: ');f.h.put(s.illegalDisplay,'%Illegal display code: ');
  const events:string[]=[];
  const traceSymbols={pdlsiz:40n,hungup:low.address('hungup')};
  const traceIO:TraceServices<string>={...f.rt.stack,*addiX2(w){f.r.x2=add36(f.r.x2,w);},*soj(reg){f.r[reg]=add36(f.r[reg],-1n);},output:f.rt.run,*outputTTY(){events.push('flush');yield*f.cpu.outputTTY();}};
  const trace=()=>traceRoutine(f.m,f.r,traceSymbols,traceIO);
  const io:BoardDiagnosticServices<string>={...f.rt.stack,*idiviT1(w){yield*f.cpu.idivi('t1',w);},output:f.rt.run,*trace(){yield*trace();}};
  return {s,io,events,traceSymbols,traceIO,trace,run:(entry:'chkc'|'chkd')=>boardDiagnostic(entry,f.m,f.r,f.rt.args,s,io)};
}
