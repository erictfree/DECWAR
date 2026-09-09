import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindGetHitRuntime } from './get-hit-runtime.ts';
import { makeHitRuntime } from '../../src/compat/make-hit-runtime.ts';
import type { MakeHitServices } from '../../src/compat/make-hit-runtime.ts';
import { add36,multiply36,rightHalf,unsigned36 } from '../../src/compat/word36.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{getHit:ReturnType<typeof bindGetHitRuntime>};
export function bindMakeHitRuntime(f:Host){
  f.m.map(27400n,Array<bigint>(400).fill(0n));const symbols={...f.getHit.symbols,who:f.low.address('who'),pasflg:f.low.address('pasflg'),hitser:f.getHit.queues.address('hitser'),knhshp:40n,illegal:27400n},events:string[]=diagnosticRecords();f.h.put(symbols.illegal,'%Illegal IWHAT code in MAKHIT: ');
  const io:MakeHitServices<string>={...f.rt.stack,
    *sosX1(){f.r.x1=add36(f.r.x1,-1n);},*imuli(reg,n){f.r[reg]=multiply36(f.r[reg],n);},*aosX1(){f.r.x1=add36(f.r.x1,1n);},*sojgT1(){return yield*f.getHit.io.sojgT1();},
    *afterOldestUpdate(){events.push('oldest-continuation');}, // Explicit return to scan after the source literal block.
    *aosSerial(a){f.r.t1=add36(f.m.read(a),1n);f.m.write(a,f.r.t1);},*addiT1(n){f.r.t1=add36(f.r.t1,n);},
    *dpbT2(p){events.push(`point:${p.size},${p.offset},${p.end}`);const a=rightHalf(f.r.t1+BigInt(p.offset)),shift=35n-BigInt(p.end),mask=(1n<<BigInt(p.size))-1n;f.m.write(a,(unsigned36(f.m.read(a))&~(mask<<shift))|((f.r.t2&mask)<<shift));}, // Explicit decimal POINT-field fixture, as for GETHIT.
    *crlf(){events.push('crlf');yield*f.rt.run('ocrl.');},*ostr(){events.push('illegal');yield*f.rt.run('ostr.');},*odec(){yield*f.rt.run('odec.');},
    *aosHit(a){events.push('hit:'+a);f.m.write(a,add36(f.m.read(a),1n));},*lshT1(){f.r.t1=unsigned36(f.r.t1)>>1n;},*aojT2(){f.r.t2=add36(f.r.t2,1n);},
  };
  const run=()=>makeHitRuntime(f.m,f.r,symbols,io);f.getHit.tractorIO.makhit=function*(){events.push('makhit');yield*run();};return {symbols,events,io,run};
}
