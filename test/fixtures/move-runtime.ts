import assert from 'node:assert/strict';
import { checkRuntimeFixture } from './check-runtime.ts';
import { moveStatements } from '../../src/game/move-statements.ts';
import type { MoveStatementServices,MoveMessage } from '../../src/game/move-statements.ts';
import { checkStatements } from '../../src/game/check-statements.ts';
import { bindLocateRuntime } from './locate-runtime.ts';
import { bindWaitRuntime } from './wait-runtime.ts';
import { bindTokenRuntime } from './token-runtime.ts';
import { bindEditorRuntime } from './editor-runtime.ts';
import { bindIniRuntime } from './ini-runtime.ts';
import { clockRoutine } from '../../src/compat/clock-runtime.ts';
import type { ClockServices } from '../../src/compat/clock-runtime.ts';
import { LockBlock,releaseLock,unlockArgument } from '../../src/compat/unlock.ts';
import type { UnlockServices } from '../../src/compat/unlock.ts';
import { acquireLock,lockArgument } from '../../src/compat/lock.ts';
import type { LockServices } from '../../src/compat/lock.ts';
import { lockState } from '../../src/compat/lock-state.ts';
import { lockLayout } from '../../src/generated/lock-layout.ts';
import { constants as K,messages as M } from '../../src/generated/source-data.ts';
import { add36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function moveRuntimeFixture(line='MOVE 12 20',format:number=K.MEDIUM){
  const f=checkRuntimeFixture();f.m.map(14200n,Array<bigint>(1200).fill(0n));f.m.map(BigInt(lockLayout.address),Array<bigint>(lockLayout.words).fill(0n));
  f.low.write('oflg',BigInt(format));f.high.write('slwest',2n);f.high.write('tim0',0n);f.low.write('ptime',99n);f.low.write('icflg',BigInt(K.KABS));
  const ship=f.views.high.players[1].ship;Object.assign(ship,{energy:10000n,docked:true,condition:K.RED});f.parse(line);
  const locals={iflg:14200n,v:14201n,d:14202n,randam:14203n,time:14204n,tem:14205n,iv:14206n,ih:14207n,ia:14208n,tran:14209n,ied:14210n,indxto:14211n,indxfm:14212n,tl:14213n};
  f.m.write(locals.d,f.realWord('99'));const events:string[]=[],clock=[100n,500n];f.damage.integers.push(1234n,1n);
  const labels={} as Record<MoveMessage,bigint>;
  for(const [i,name] of (['wrpdam','impdam','error2','error1','move1a','move1b','move2s','move2l','move3s','move3l','engoff','move5l','move5s','move06','move08','move09','strdat','move10'] as const).entries()){labels[name]=14400n+BigInt(i*32);f.h.put(labels[name],M[name].text);}
  const prepare=(words:bigint[])=>{loadArgumentBlock(f.m,14340n,words);selectArgumentBlock(f.r,14340n);};
  function* text(t:string):Generator<string,void,void>{if(!t)return;f.h.put(15100n,t);f.m.write(14359n,0n);prepare([15100n,14359n]);yield*f.rt.run('out');}
  const clockIO:ClockServices<string>={*mstime(){assert.ok(clock.length,'unscheduled MSTIME');f.r.f=clock.shift()!;},*runtim(){throw new Error('fixture requires RUNTIM');},*sub0(n){f.r.f=add36(f.r.f,-n);}};
  const locks=new LockBlock(f.m),state=lockState(f.input,f.high,locks,f.ref(14310n)),symbols={queue:14300n,queuen:14301n,quereq:14302n,frelok:f.high.address('frelok'),staupd:14303n};
  const unlockIO:UnlockServices<string>={*deq(){events.push('deq');return true;},*outstr(t){yield*text(t);},*outchr(w){yield*text(String.fromCharCode(Number(w)));},*deboct(){throw new Error('fixture requires DEBOCT');},*fndlok(){throw new Error('fixture requires FNDLOK');}};
  const lockIO:LockServices<string>={*enq(){events.push('enq');return true;},*hibernate(n){yield `hibernate:${n}`;},*uct(){throw new Error('fixture requires UCT');},
    *outstr(t){yield*text(t);},*outchr(w){yield*text(String.fromCharCode(Number(w)));},*fndlok(){throw new Error('fixture requires FNDLOK');},*debdec(){throw new Error('fixture requires DEBDEC');},*enqc(){throw new Error('fixture requires ENQC');},
    *unlo(){yield*releaseLock(locks,state,f.r,symbols,unlockIO);},*monit(){throw new Error('fixture MONIT transfer');}};
  const numeric=f.weapon.io,location=bindLocateRuntime(f),locateLocal=location.locals;
  const io:MoveStatementServices<string>={
    *binary(...a){return yield*numeric.binary(...a);},*convert(...a){return yield*numeric.convert(...a);},*compare(...a){return yield*numeric.compare(...a);},*assign(...a){yield*numeric.assign(...a);},realLiteral:t=>numeric.realLiteral(t),logical:w=>numeric.logical(w),
    *and(...a){return yield*numeric.and(...a);},*or(...a){return yield*numeric.or(...a);},*ran(z){events.push('ran');return yield*numeric.ran(z);},*iabs(v){return yield*f.io.iabs(v);},
    *assignFalse(d,t){yield*f.displacement.jumpIO.assignFalse(d,t);},
    *etim(start){events.push('clock');prepare([start]);yield*clockRoutine('etim',f.m,f.r,f.rt.args,clockIO);return f.r.f;},
    *iran(n){events.push('iran:'+n);return f.damage.io.iran(BigInt(n));},
    *locate(entry,n){events.push(entry);f.m.write(location.n,BigInt(n));return yield*location.run(entry);},
    *check(args){events.push('check');yield*checkStatements(f.m,f.out,args,f.locals,f.io);},
    *lock(address){events.push(`lock:${address}`);yield*lockArgument(locks,f.r,()=>address,()=>acquireLock(locks,state,f.r,symbols,lockIO));},
    *unlock(address){events.push(`unlock:${address}`);yield*unlockArgument(locks,f.r,()=>address,()=>releaseLock(locks,state,f.r,symbols,unlockIO));},
    *disp(v,h){return yield*f.io.disp(v,h);},
    *setdsp(v,h,code){const addresses:bigint[]=[];for(const [i,arg] of [v,h,code].entries()){if(typeof arg==='bigint')addresses.push(arg);else{const a=14350n+BigInt(i);f.m.write(a,yield*arg.evaluate());addresses.push(a);}}
      events.push(`set:${addresses.map(a=>f.m.read(a)).join(',')}`);prepare(addresses);yield*f.rawBoard.run('setdsp');},
    *out(message,lines){events.push(message);f.m.write(14360n,BigInt(lines));prepare([labels[message],14360n]);yield*f.rt.run('out');},
    *out2c(t){events.push(t);f.h.put(14361n,t);prepare([14361n]);yield*f.rt.run('out2c');},
    *oflt(a,width){events.push('oflt');f.m.write(14362n,BigInt(width));prepare([a,14362n]);yield*f.rt.run('oflt');},
  };
  const wait=bindWaitRuntime({...f,locks,lockState:state,symbols,lockIO,unlockIO});
  location.io.pause=function*(ms){f.m.write(wait.argument,yield*ms.evaluate());yield*wait.pause();};
  const tokens=bindTokenRuntime({...f,wait});location.io.gtkn=()=>tokens.run();
  const editor=bindEditorRuntime({...f,tokens});tokens.gtknIO.inli=()=>editor.run();
  const ini=bindIniRuntime({...f,editor});
  return {...f,wait,tokens,editor,ini,checkIO:f.io,checkLocals:f.locals,checkEvents:f.events,checkRun:f.run,ship,locals,events,io,clock,clockIO,locks,lockIO,unlockIO,lockState:state,symbols,locateLocal,location,labels,
    run:(entry:'move'|'impuls'='move')=>moveStatements(entry,f.high,f.low,f.out,locals,io)};
}
