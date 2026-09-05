import { currentVariant } from '../runtime/variant-execution.ts';
import type { LockBlock,UnlockSymbols } from './unlock.ts';
import { lockLayout } from '../runtime/variant-values.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36,packSixbit } from './word36.ts';
import type { WordMemory } from './memory.ts';
export type LockRegisters={t0:bigint;t1:bigint;t2:bigint};
export type LockState={lkfail:bigint;hvLok:bigint;ccflg:bigint;ccflgDot:bigint;gameno:bigint;hungup:bigint};
export type LockServices<W>={
  enq():Generator<W,boolean,void>; // live T2; true = monitor success skip.
  hibernate(operand:bigint):Generator<W,void,void>;
  uct(register:'t1'|'t2'):Generator<W,boolean,void>; // CALLI -210, sets that register.
  outstr(text:string):Generator<W,void,void>;
  outchr(word:bigint):Generator<W,void,void>;
  fndlok():Generator<W,void,void>;
  debdec():Generator<W,void,void>;
  enqc():Generator<W,boolean,void>; // T1 queue, T2 WHOHAS address.
  unlo():Generator<W,void,void>;
  monit():Generator<W,never,void>;
};
// WARMAC LOCK.:4476-4565. Register values and flags remain live across waits.
// No host mutex, timeout policy or automatic ENQ retry replaces these branches.
export function* acquireLock<W>(block:LockBlock,state:LockState,r:LockRegisters,symbols:UnlockSymbols,io:LockServices<W>,austinKey:1|2=2):Generator<W,void,void>{
  // Austin WARMAC:3768-3786 has two fixed global keys and no LOKTAB search.
  if(currentVariant().definition.id==='austin'){
    r.t1=BigInt(austinKey);
    if(yield*io.enq()){state.lkfail=0n;return;}
    state.lkfail=-1n;r.t1=25n;yield*io.hibernate(r.t1);return;
  }
  state.lkfail=0n;state.hvLok=0n;r.t1=rightHalf(r.t1);r.t2=BigInt(lockLayout.maximum-1);
  while(r.t1!==block.read('loktab',r.t2)){r.t2=add36(r.t2,-1n);if(r.t2<0n)break;}
  if(r.t2>=0n)return;
  r.t2=BigInt(lockLayout.maximum-1);
  while(block.read('loktab',r.t2)!==0n){r.t2=add36(r.t2,-1n);if(r.t2<0n)break;}
  if(r.t2<0n)r.t0=block.memory.read(0o200000n); // Source trap attempt; a returning read continues.
  block.write('loktab',r.t1,r.t2);
  for(const a of [symbols.queuen,symbols.quereq])block.memory.write(a,signed36(halfWords(leftHalf(block.memory.read(a)),r.t1)));
  r.t2=state.gameno;if(r.t1===rightHalf(symbols.frelok)||r.t1===rightHalf(symbols.staupd))r.t2=0n;
  block.memory.write(symbols.queuen,signed36((block.memory.read(symbols.queuen)&~(63n<<18n))|((r.t2&63n)<<18n)));
  let issueEnq=true;
  for(;;){
    if(issueEnq){r.t2=signed36(halfWords(2n,symbols.queue));if(yield*io.enq())return;}
    issueEnq=false;
    if(r.t2!==1n){
      if(r.t2!==0o13n){
        yield*io.outstr('\r\nFatal ENQ. error code ');r.t1=r.t2;yield*io.debdec();return yield*io.monit();
      }
      r.t2=1000n;yield*io.hibernate(r.t2);issueEnq=true;continue;
    }
    r.t2=100n;yield*io.hibernate(r.t2);
    if(!(yield*io.uct('t1')))r.t1=0n;
    state.ccflg=0n;state.ccflgDot=0n;r.t1=add36(r.t1,12n);r.t2=5000n;
    for(;;){
      yield*io.hibernate(r.t2);if(state.hvLok!==0n)return;
      if(!(yield*io.uct('t2')))r.t2=10000n;
      if(r.t2>=r.t1)break;
      r.t2=1000n;
    }
    yield*io.outstr('\r\n**** Lockup on queue ');
    r.t1=rightHalf(block.memory.read(symbols.queuen));yield*io.fndlok();r.t1=add36(r.t1&0o77n,0o40n);
    if(state.hungup===0n)yield*io.outchr(r.t1);
    if(state.hungup===0n)yield*io.outstr(' by job ');
    r.t1=rightHalf(symbols.queue);r.t2=block.address('whohas',0);
    if(!(yield*io.enqc()))block.write('whohas',0n,0);
    r.t1=rightHalf(block.read('whohas',0));if(r.t1===0o777777n)r.t1=0n;
    yield*io.debdec();
    if(state.hungup===0n)yield*io.outstr('\r\n');
    if(state.ccflg===0n)continue; // LOCK.0, using T2 left by the diagnostic.
    r.t1=rightHalf(block.memory.read(symbols.queuen));yield*io.unlo();state.lkfail=-1n;return;
  }
}
// WARMAC LOCK:4468-4471 resolves the key address and remembers it first.
export function* lockArgument<W>(block:LockBlock,r:LockRegisters,address:()=>bigint,lock:(austinKey?:1)=>Generator<W,void,void>):Generator<W,void,void>{
  r.t1=rightHalf(address());if(currentVariant().definition.id==='austin'){r.t1=1n;yield*lock(1);return;}block.write('locked',r.t1);yield*lock();
}
// WARMAC FNDLOK:6423-6439. LOKNAM is read from caller-supplied source memory.
export function findLockName(memory:WordMemory,r:{t1:bigint;t2:bigint;t3:bigint},symbols:{loknam:bigint;board:bigint;brdsiz:bigint}):void{
  const t2=r.t2,t3=r.t3;r.t2=0n;
  for(;;){
    const address=symbols.loknam+rightHalf(r.t2);
    if(memory.read(address)===0n){
      const board=rightHalf(symbols.board),end=rightHalf(symbols.board+symbols.brdsiz-1n);
      r.t1=leftHalf(packSixbit(r.t1>=board&&r.t1<=end?'BBB':'???'));break;
    }
    r.t3=rightHalf(memory.read(address));
    if(r.t3===r.t1){r.t1=leftHalf(memory.read(address));break;}
    r.t2=add36(r.t2,1n);
  }
  r.t3=t3;r.t2=t2;
}
