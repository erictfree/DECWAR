import { WordBlock } from './memory.ts';
import type { WordMemory } from './memory.ts';
import { lockLayout } from '../generated/lock-layout.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export class LockBlock extends WordBlock<typeof lockLayout>{
  constructor(memory:WordMemory,base=BigInt(lockLayout.address)){super(memory,lockLayout,base);}
}
export type UnlockRegisters={t1:bigint;t2:bigint;x2:bigint};
export type UnlockState={gameno:bigint;hungup:bigint};
export type UnlockSymbols={queue:bigint;queuen:bigint;quereq:bigint;frelok:bigint;staupd:bigint};
export type UnlockServices<W>={
  deq():Generator<W,boolean,void>; // T2 is queue address/result; true means skip next instruction.
  outstr(text:string):Generator<W,void,void>;
  outchr(word:bigint):Generator<W,void,void>;
  deboct():Generator<W,void,void>;
  fndlok():Generator<W,void,void>;
};
// WARMAC UNLO:4621-4651. The first matching slot is searched from the end;
// remembered LOCKED is unchanged. Monitor/private addresses remain required.
export function* releaseLock<W>(block:LockBlock,state:UnlockState,r:UnlockRegisters,symbols:UnlockSymbols,io:UnlockServices<W>):Generator<W,void,void>{
  const memory=block.memory;
  for(const address of [symbols.queuen,symbols.quereq])memory.write(address,signed36(halfWords(leftHalf(memory.read(address)),r.t1)));
  r.t2=BigInt(lockLayout.maximum-1);r.t1=rightHalf(r.t1);
  while(r.t1!==block.read('loktab',r.t2)){r.t2=add36(r.t2,-1n);if(r.t2<0n)break;}
  if(r.t2>=0n)block.write('loktab',0n,r.t2);
  r.t2=state.gameno;
  if(r.t1===rightHalf(symbols.frelok)||r.t1===rightHalf(symbols.staupd))r.t2=0n;
  memory.write(symbols.queuen,signed36((memory.read(symbols.queuen)&~(63n<<18n))|((r.t2&63n)<<18n)));
  r.t2=rightHalf(symbols.queue);
  if(yield*io.deq())return;
  if(r.t2===0o24n)return;
  yield*io.outstr('\r\nFailure ');yield*io.deboct();yield*io.outstr(' releasing ');
  r.t1=rightHalf(memory.read(symbols.queuen));yield*io.fndlok();r.t1=add36(r.t1&0o77n,0o40n);
  if(state.hungup===0n)yield*io.outchr(r.t1);
  if(state.hungup===0n)yield*io.outstr('\r\n');
}
// WARMAC ZAPLOK/KILALL:4604-4619. X2 is live across UNLO and its waits.
export function* zapLocks<W>(block:LockBlock,r:UnlockRegisters,unlo:()=>Generator<W,void,void>):Generator<W,void,void>{
  r.x2=BigInt(lockLayout.maximum-1);
  for(;;){r.t1=block.read('loktab',r.x2);if(r.t1!==0n)yield*unlo();r.x2=add36(r.x2,-1n);if(r.x2<0n)return;}
}
export function* killAllLocks<W>(block:LockBlock,r:UnlockRegisters,unlo:()=>Generator<W,void,void>):Generator<W,void,void>{
  const saved=r.x2;yield*zapLocks(block,r,unlo);r.x2=saved;
}
// WARMAC UNLOCK:4594-4599. MOVEI uses the resolved argument address.
export function* unlockArgument<W>(block:LockBlock,r:UnlockRegisters,address:()=>bigint,unlo:()=>Generator<W,void,void>):Generator<W,void,void>{
  r.t1=rightHalf(address());block.write('locked',0n);yield*unlo();
}
