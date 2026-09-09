import test from 'node:test';
import assert from 'node:assert/strict';
import { bindLiveWait } from '../src/runtime/live-wait.ts';
import { GameSession,type SessionWait } from '../src/runtime/session.ts';
import { moveRuntimeFixture } from './fixtures/move-runtime.ts';
import { createVariantContext } from '../src/runtime/variant.ts';
import { variantGenerator } from '../src/runtime/variant-execution.ts';

for(const variant of ['austin','compuserve'] as const)for(const queued of [false,true])test(`${variant}: disconnected midnight PAUSE yields to host cancellation (queued input ${queued})`,async()=>{
  const f=moveRuntimeFixture();
  f.m.write(f.wait.argument,2000n);
  // The real PAUSE starts just before midnight and reads a wrapped clock after
  // waking. Bound the reproducer so a regression cannot exhaust the test host.
  f.wait.io.mstime=function*(reg){f.r[reg]=reg==='t3'?86399000n:1000n;};
  let attempts=0;
  const session=new GameSession(()=>({
    run:variantGenerator(createVariantContext(variant,'historical-diagnostic'),(function*():Generator<SessionWait,void,void>{
      const pause=f.wait.pause();
      try{
        while(!pause.next().done){
          if(++attempts===128)throw new Error('Disconnected PAUSE exhausted bounded spin budget');
          yield {type:'delay' as const,milliseconds:10,wakeOnInput:queued};
        }
      }finally{pause.return();}
    })()),hangup(){},interrupt(){},
  }),()=>{});
  if(queued)session.receive(Buffer.from('STATUS\r\n'));
  session.disconnect();
  setImmediate(()=>session.cancel());
  const result=await session.start();
  assert.equal(result.reason,'cancelled');
  assert.ok(attempts<128);
  assert.ok(f.wait.operands.length<128);
});

for(const variant of ['austin','compuserve'] as const)for(const playable of [true,false])test(`${variant}: ${playable?'playable':'diagnostic'} live PAUSE across midnight`,()=>{
  const f=moveRuntimeFixture();f.m.write(f.wait.argument,2000n);
  let elapsed=0n,wall=86399000n;
  bindLiveWait(f.wait.io,f.r,playable,{monotonic:()=>elapsed,daytime:()=>wall});
  const pause=variantGenerator(createVariantContext(variant,playable?'playable':'historical-diagnostic'),f.wait.pause());
  assert.deepEqual(pause.next(),{done:false,value:'hiber:2000'});
  elapsed=2000n;wall=1000n;
  const next=pause.next();
  if(playable)assert.equal(next.done,true);
  else assert.deepEqual(next,{done:false,value:'hiber:1000'});
  pause.return();
  assert.equal(f.wait.operands.length,0);
  assert.equal(f.wait.events.length,0);
});

test('playable PAUSE preserves cap and early-wake retry even when wall time moves backwards',()=>{
  const f=moveRuntimeFixture();f.m.write(f.wait.argument,20000n);
  let elapsed=500n,wall=50000n;
  bindLiveWait(f.wait.io,f.r,true,{monotonic:()=>elapsed,daytime:()=>wall});
  const pause=f.wait.pause();
  assert.deepEqual(pause.next(),{done:false,value:'hiber:10000'});
  elapsed=10499n;wall=0n;
  assert.deepEqual(pause.next(),{done:false,value:'hiber:1000'});
  elapsed=10500n;
  assert.equal(pause.next().done,true);
});
