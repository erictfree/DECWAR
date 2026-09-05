import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindFreeRuntime } from './free-runtime.ts';
import { getHitRuntime,getHitClearFields } from '../../src/compat/get-hit-runtime.ts';
import type { GetHitServices,GetHitField } from '../../src/compat/get-hit-runtime.ts';
import { tractorOffStatements } from '../../src/game/tractor-off-statements.ts';
import type { TractorOffStatementServices } from '../../src/game/tractor-off-statements.ts';
import { queueLayout } from '../../src/generated/queue-layout.ts';
import { queueState } from '../../src/game/queue-state.ts';
import { add36,multiply36,rightHalf,unsigned36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { bindQueueInitializeRuntime } from './queue-initialize-runtime.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{free:ReturnType<typeof bindFreeRuntime>};
export function bindGetHitRuntime(f:Host){
  f.m.map(26200n,Array<bigint>(400).fill(0n));f.m.map(BigInt(queueLayout.address),Array<bigint>(queueLayout.words).fill(0n));
  const queues=queueState(f.m,i=>f.high.read('bits',i)),header=26200n,player=26210n;f.m.write(player,1n);
  const initialize=bindQueueInitializeRuntime(f,queues);
  for(const entry of ['setqh','setqm'] as const){if(!initialize.run(entry).next().done)throw new Error('fixture initialization requires non-suspending ordinary BLT');}
  const fields={} as Record<GetHitField,bigint>;for(const key of getHitClearFields)fields[key]=f.low.address(key);
  const symbols={fields,dbits:f.low.address('dbits'),hitflg:f.high.address('hitflg',1),bits:f.high.address('bits',1),hitql:queues.address('hitql'),hitq:queues.address('hitq'),knhit:BigInt(queueLayout.constants.knhit)},events:string[]=[];
  const io:GetHitServices<string>={
    *sosl(a){const n=add36(f.m.read(a),-1n);f.m.write(a,n);return n<0n;},*sojgT1(){f.r.t1=add36(f.r.t1,-1n);return f.r.t1>0n;},*aojaX2(){f.r.x2=add36(f.r.x2,1n);},
    *imuliT1(n){f.r.t1=multiply36(f.r.t1,n);},*addi(reg,n){f.r[reg]=add36(f.r[reg],n);},
    *ldbT2(p){events.push(`point:${p.size},${p.offset},${p.end}`);const size=BigInt(p.size),end=BigInt(p.end);f.r.t2=(unsigned36(f.m.read(rightHalf(f.r.t1+BigInt(p.offset))))>>BigInt(35n-end))&((1n<<size)-1n);},
  }; // Explicit decimal POINT-field fixture, not an inferred assembler rule.
  const run=(actual=player)=>{loadArgumentBlock(f.m,header,[actual]);selectArgumentBlock(f.r,header);return getHitRuntime(f.m,f.r,f.rt.args,symbols,io);};
  const tractorIO:TractorOffStatementServices<string>={*assign(...a){yield*f.free.io.assign(...a);},*integerOr(...a){return yield*f.free.io.integerOr(...a);},*makhit(){throw new Error('fixture requires TRCOFF MAKHIT');}};
  f.free.io.gethit=function*(a){events.push('gethit');yield*run(a);};f.free.io.trcoff=function*(a){events.push('trcoff');yield*tractorOffStatements(f.high,f.low,a,tractorIO);};
  return {queues,initialize,header,player,symbols,events,io,run,tractorIO,tractor:(ip=f.free.snum)=>tractorOffStatements(f.high,f.low,ip,tractorIO)};
}
