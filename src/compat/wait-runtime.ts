import { currentVariant } from '../runtime/variant-execution.ts';
import type { SourceArguments } from './fortran-call.ts';
import type { FieldStack } from './field-output.ts';
import { halfWords,rightHalf,signed36 } from './word36.ts';
export type WaitRuntimeState={locked:bigint;svlock:bigint;lkfail:bigint;bufptr:bigint;iniflg:bigint;hungup:bigint;ccflg:bigint};
export type WaitRuntimeRegisters={f:bigint;t1:bigint;t2:bigint;t3:bigint};
export type WaitLockTarget='load-svlock'|'lock'|'test-lkfail'|'return';
export type WaitLockServices<W>={
  unlo():Generator<W,void,void>; // Internal UNLO., current T1; does not clear LOCKED.
  lock():Generator<W,void,void>; // Internal LOCK., current T1; writes live LKFAIL.
  // Resolve JRST .-1 / .+1 in the inline literal. Other machine targets must
  // transfer through this service; the source archive supplies no assembled code.
  lockJump(branch:'failure'|'success'):Generator<W,WaitLockTarget,void>;
};
export type PauseRuntimeServices<W>=WaitLockServices<W>&{
  mstime(register:'t2'|'t3'):Generator<W,void,void>;
  addT3():Generator<W,void,void>; // ADD T3,T1 including CPU flags/overflow.
  hiber():Generator<W,boolean,void>; // HIBER T1, true is success skip; operands stay live.
  halt():Generator<W,void,void>; // Returning means monitor-approved continuation.
};
export type InputWaitServices<W>=WaitLockServices<W>&FieldStack<W>&{
  hiber():Generator<W,boolean,void>;
  halt():Generator<W,void,void>;
  skpinc():Generator<W,boolean,void>; // True means skip (input pending).
};
// WARMAC.MAC:1685-1689,3888-3892,4037-4041. Shared literal-block structure;
// no default retry target, key reload or inferred repair of the source jumps.
export function* reacquireRuntime<W>(state:Pick<WaitRuntimeState,'svlock'|'lkfail'>,r:Pick<WaitRuntimeRegisters,'t1'>,io:Pick<WaitLockServices<W>,'lock'|'lockJump'>):Generator<W,void,void>{
  let target:WaitLockTarget='load-svlock';
  for(;;){
    if(target==='return')return;
    if(target==='load-svlock'){r.t1=state.svlock;if(r.t1===0n)return;target='lock';}
    if(target==='lock'){yield*io.lock();target='test-lkfail';}
    target=yield*io.lockJump(state.lkfail!==0n?'failure':'success');
  }
}
// WARMAC.MAC:4010-4042. No accumulator saves or host deadline snapshot.
// The duration is dereferenced three times, and raw MSTIME has no midnight fix.
export function* pauseRuntime<W>(state:Pick<WaitRuntimeState,'locked'|'svlock'|'lkfail'>,r:WaitRuntimeRegisters,args:SourceArguments,io:PauseRuntimeServices<W>):Generator<W,void,void>{
  if(args.read(0)<=0n)return;
  if(currentVariant().definition.id!=='austin'){r.t1=state.locked;state.svlock=r.t1;if(r.t1!==0n)yield*io.unlo();}
  r.t1=args.read(0);
  if(r.t1>0n){
    if(r.t1>10000n)r.t1=10000n;
    yield*io.mstime('t3');yield*io.addT3();
    r.t1=args.read(0);if(r.t1>10000n)r.t1=10000n;
    for(;;){
      if(!(yield*io.hiber())&&currentVariant().definition.id!=='austin')yield*io.halt();
      yield*io.mstime('t2');r.t1=1000n;
      if(r.t2>=r.t3)break;
    }
  }
  if(currentVariant().definition.id!=='austin')yield*reacquireRuntime(state,r,io);
}
// WARMAC.MAC:3874-3901. HB.RTC's HRLI value is a required relocated/assembled
// symbol, not a chosen monitor bit. INPUT has no PAUSE cap and masks its duration
// to the right half when HRLI replaces the left half.
export function* inputWaitRuntime<W>(state:WaitRuntimeState,r:WaitRuntimeRegisters,args:SourceArguments,wakeInputLeftHalf:bigint,io:InputWaitServices<W>):Generator<W,void,void>{
  if(state.bufptr>0n||state.iniflg<0n)r.f=-1n;
  else{
    r.t1=args.read(0);
    if(r.t1>0n){
      if(currentVariant().definition.id!=='austin'){r.t1=state.locked;state.svlock=r.t1;if(r.t1!==0n)yield*io.unlo();}
      r.t1=args.read(0);r.t1=signed36(halfWords(wakeInputLeftHalf,rightHalf(r.t1)));
      if(!(yield*io.hiber())&&currentVariant().definition.id!=='austin')yield*io.halt();
      if(currentVariant().definition.id!=='austin')yield*reacquireRuntime(state,r,io);
    }
    r.f=0n;
    if(state.hungup!==0n)r.f=-1n;
    else if(yield*io.skpinc())r.f=-1n;
    else if(state.ccflg!==0n)r.f=-1n;
  }
  yield*io.pushData(r.f);r.f=yield*io.popData();
}
// WARMAC.MAC:3906-3909. The monitor clear precedes SETOM BUFPTR, even when it
// yields or fails; a preexisting hangup skips only CLRBFi.
export function* clearInputRuntime<W>(state:Pick<WaitRuntimeState,'hungup'|'bufptr'>,clrbfi:()=>Generator<W,void,void>):Generator<W,void,void>{
  if(state.hungup===0n)yield*clrbfi();state.bufptr=-1n;
}
