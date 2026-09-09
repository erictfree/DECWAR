import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import { pauseRuntime,inputWaitRuntime,clearInputRuntime } from '../../src/compat/wait-runtime.ts';
import type { PauseRuntimeServices,InputWaitServices } from '../../src/compat/wait-runtime.ts';
import type { checkRuntimeFixture } from './check-runtime.ts';
import type { LockBlock,UnlockServices,UnlockSymbols } from '../../src/compat/unlock.ts';
import type { LockServices } from '../../src/compat/lock.ts';
import type { lockState } from '../../src/compat/lock-state.ts';
import { acquireLock } from '../../src/compat/lock.ts';
import { releaseLock } from '../../src/compat/unlock.ts';
import { add36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
// Reuse MOVE's actual COMMON, lock and input words. Synthetic HB.RTC and explicit
// literal branch policy are fixtures only; monitor/assembler semantics stay open.
type WaitFixtureHost=Pick<ReturnType<typeof checkRuntimeFixture>,'m'|'r'|'input'|'rt'>&{locks:LockBlock;lockState:ReturnType<typeof lockState>;symbols:UnlockSymbols;lockIO:LockServices<string>;unlockIO:UnlockServices<string>};
export function bindWaitRuntime(f:WaitFixtureHost){
  f.m.map(16300n,Array<bigint>(100).fill(0n));
  const argument=16300n,header=16310n,events:string[]=diagnosticRecords(),clocks=[1000n,11000n],operands:bigint[]=diagnosticRecords();
  f.m.write(argument,2000n);
  const state={
    get locked(){return f.lockState.locked;},set locked(v:bigint){f.lockState.locked=v;},
    get svlock(){return f.lockState.svlock;},set svlock(v:bigint){f.lockState.svlock=v;},
    get lkfail(){return f.lockState.lkfail;},set lkfail(v:bigint){f.lockState.lkfail=v;},
    get hungup(){return f.lockState.hungup;},set hungup(v:bigint){f.lockState.hungup=v;},
    get ccflg(){return f.lockState.ccflg;},set ccflg(v:bigint){f.lockState.ccflg=v;},
    get iniflg(){return f.lockState.iniflg;},set iniflg(v:bigint){f.lockState.iniflg=v;},
    get bufptr(){return f.input.pointer;},set bufptr(v:bigint){f.input.pointer=v;},
  };
  const prepare=(actual=argument)=>{loadArgumentBlock(f.m,header,[actual]);selectArgumentBlock(f.r,header);};
  const io:PauseRuntimeServices<string>&InputWaitServices<string>={
    *unlo(){events.push(`unlo:${f.r.t1}`);yield*releaseLock(f.locks,f.lockState,f.r,f.symbols,f.unlockIO);},
    *lock(){events.push(`lock:${f.r.t1}`);yield*acquireLock(f.locks,f.lockState,f.r,f.symbols,f.lockIO);},
    *lockJump(branch){events.push(`branch:${branch}`);return branch==='failure'?'load-svlock':'return';},
    *mstime(reg){events.push(`mstime:${reg}`);assert.ok(clocks.length,'unscheduled MSTIME');f.r[reg]=clocks.shift()!;},
    *addT3(){f.r.t3=add36(f.r.t3,f.r.t1);},
    *hiber(){events.push(`hiber:${f.r.t1}`);operands.push(f.r.t1);yield `hiber:${f.r.t1}`;return true;},
    *halt(){events.push('halt');throw new Error('fixture HALT transfer');},
    *skpinc(){events.push('skpinc');return false;},
    *pushData(w){events.push(`save:${w}`);yield*f.rt.stack.pushData(w);},*popData(){events.push('restore');return yield*f.rt.stack.popData();},
  };
  const wakeInputLeftHalf=0o123456n; // Synthetic marker, NOT a claimed HB.RTC encoding.
  return {argument,header,io,state,clocks,operands,events,wakeInputLeftHalf,prepare,
    pause:(actual=argument)=>{prepare(actual);return pauseRuntime(state,f.r,f.rt.args,io);},
    input:(actual=argument)=>{prepare(actual);return inputWaitRuntime(state,f.r,f.rt.args,wakeInputLeftHalf,io);},
    clear:(clrbfi:()=>Generator<string,void,void>=function*(){events.push('clrbfi');})=>clearInputRuntime(state,clrbfi)};
}
