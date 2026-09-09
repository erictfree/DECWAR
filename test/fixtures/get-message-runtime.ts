import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindFreeRuntime } from './free-runtime.ts';
import type { bindGetHitRuntime } from './get-hit-runtime.ts';
import { getMessageRuntime } from '../../src/compat/get-message-runtime.ts';
import type { GetMessageServices } from '../../src/compat/get-message-runtime.ts';
import { messageSearchRuntime } from '../../src/compat/message-search-runtime.ts';
import type { MessageSearchServices } from '../../src/compat/message-search-runtime.ts';
import { acquireLock } from '../../src/compat/lock.ts';
import { releaseLock } from '../../src/compat/unlock.ts';
import { add36,halfWords,rightHalf,signed36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{free:ReturnType<typeof bindFreeRuntime>;getHit:ReturnType<typeof bindGetHitRuntime>};
export function bindGetMessageRuntime(f:Host){
  f.m.map(26600n,Array<bigint>(400).fill(0n));const header=26600n,player=26610n,buffer=26700n,events:string[]=diagnosticRecords();f.m.write(player,1n);
  const s={msgflg:f.high.address('msgflg',1),bits:f.high.address('bits',1),msgql:f.getHit.queues.address('msgql'),msgq:f.getHit.queues.address('msgq'),msglen:17n,dispfr:f.low.address('dispfr'),dbits:f.low.address('dbits')};
  const qs={lkfail:f.low.address('lkfail'),quelok:f.high.address('quelok'),srchLiteral:26620n,remvLiteral:26621n};f.m.write(qs.srchLiteral,halfWords(26630n,qs.quelok));f.m.write(qs.remvLiteral,halfWords(26640n,qs.quelok));f.h.put(26630n,'SRCH.');f.h.put(26640n,'REMV.');
  function* call(entry:'srch'|'srch.x'|'remv'|'remv.x'):Generator<string,boolean,void>{
    // Explicit ordinary PUSHJ/POPJ fixture with synthetic return PC; no unwind on failure.
    yield*f.cpu.pushP(1000n);yield*messageSearchRuntime(entry,f.m,f.r,qs,qio);const pc=yield*f.cpu.popP();assert.ok(pc===1000n||pc===1001n,'fixture requires changed queue return transfer');return pc===1001n;
  }
  const qio:MessageSearchServices<string>={
    *addi(reg,n){f.r[reg]=add36(f.r[reg],n);},*subi(reg,n){f.r[reg]=add36(f.r[reg],-n);},*aos(a){events.push('aos:'+a);f.m.write(a,add36(f.m.read(a),1n));},
    *lock(){events.push('lock');yield*acquireLock(f.locks,f.lockState,f.r,f.symbols,f.lockIO);},*unlo(){events.push('unlo');yield*releaseLock(f.locks,f.lockState,f.r,f.symbols,f.unlockIO);},
    *searchInner(){return yield*call('srch.x');},*removeInner(){yield*call('remv.x');},
  };
  const io:GetMessageServices<string>={
    *sosl(a){return yield*f.getHit.io.sosl(a);},*search(){events.push('search');return yield*call('srch');},*imuliT1(n){yield*f.getHit.io.imuliT1(n);},*addiT1(n){yield*f.getHit.io.addi('t1',n);},
    *blt(last){events.push('blt');yield*f.cpu.blt(last);},*remove(){events.push('remove');yield*call('remv');},
  };
  const run=(who=player,destination=buffer)=>{loadArgumentBlock(f.m,header,[who,destination]);selectArgumentBlock(f.r,header);return getMessageRuntime(f.m,f.r,f.rt.args,s,io);};
  f.free.io.getmsg=function*(a,b){events.push('getmsg');yield*run(a,b);};
  return {symbols:s,queueSymbols:qs,header,player,buffer,events,io,qio,call,run};
}
