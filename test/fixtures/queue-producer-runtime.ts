import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindGetMessageRuntime } from './get-message-runtime.ts';
import { queueProducerRuntime } from '../../src/compat/queue-producer-runtime.ts';
import type { QueueProducerEntry,QueueProducerServices } from '../../src/compat/queue-producer-runtime.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from '../../src/compat/word36.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{getMessage:ReturnType<typeof bindGetMessageRuntime>};
export function bindQueueProducerRuntime(f:Host){
  f.m.map(27000n,Array<bigint>(400).fill(0n));const symbols={lkfail:f.low.address('lkfail'),quelok:f.high.address('quelok'),reserveLiteral:27000n,updateLiteral:27001n},events:string[]=diagnosticRecords();
  f.m.write(symbols.reserveLiteral,halfWords(27010n,symbols.quelok));f.m.write(symbols.updateLiteral,halfWords(27020n,symbols.quelok));f.h.put(27010n,'RSRV.');f.h.put(27020n,'UPDT.');
  function* run(entry:QueueProducerEntry):Generator<string,void,void>{yield*f.cpu.pushP(1000n);yield*queueProducerRuntime(entry,f.m,f.r,symbols,io);assert.equal(yield*f.cpu.popP(),1000n,'fixture requires queue producer return transfer');}
  const q=f.getMessage.qio;
  const io:QueueProducerServices<string>={
    *addi(...a){yield*q.addi(...a);},*subi(...a){yield*q.subi(...a);},*lock(){events.push('lock');yield*q.lock();},*unlo(){events.push('unlo');yield*q.unlo();},
    *searchInner(){events.push('search');return yield*q.searchInner();},*removeInner(){events.push('remove');yield*q.removeInner();},
    *pushData(w){events.push('save');yield*f.rt.stack.pushData(w);},*popData(){events.push('restore');return yield*f.rt.stack.popData();},
    *aobjnT1(){f.r.t1=signed36(halfWords(leftHalf(f.r.t1)+1n,rightHalf(f.r.t1)+1n));return f.r.t1<0n;}, // Explicit ordinary two-half increment policy.
    *movniX3(w){f.r.x3=signed36(-w);},*reserveInner(){yield*run('qrsrv');},*updateInner(){yield*run('qupdt');},
  };
  return {symbols,events,io,run};
}
