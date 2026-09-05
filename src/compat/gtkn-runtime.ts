import { currentVariant } from '../runtime/variant-execution.ts';
import type { WordMemory } from './memory.ts';
import type { FieldStack } from './field-output.ts';
import type { WaitLockServices } from './wait-runtime.ts';
import { reacquireRuntime } from './wait-runtime.ts';
import { tokenFlags as tf } from './token-runtime.ts';
import { add36,halfWords,rightHalf,signed36 } from './word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export type GtknState={hungup:bigint;ccflgDot:bigint;bufptr:bigint;locked:bigint;svlock:bigint;lkfail:bigint};
export type GtknRegisters={f:bigint;t1:bigint;x1:bigint;x2:bigint;p1:bigint};
export type GtknSymbols={tknlst:bigint;typlst:bigint;vallst:bigint;ntok:bigint;linbuf:bigint;quitWord:bigint;overflow:bigint};
export type GtknServices<W>=FieldStack<W>&WaitLockServices<W>&{
  ocrl():Generator<W,void,void>;
  inli():Generator<W,void,void>; // INLI. writes LINBUF itself.
  nxtt():Generator<W,void,void>; // NXTT. writes token/value/pointer at current X1.
  ostr():Generator<W,void,void>; // OSTR. reads P1 (source ASCIL literal).
  aobjn():Generator<W,boolean,void>; // AOBJN X1, return true for jump.
};
// WARMAC.MAC:1670-1733. Actual S saves, pointer/flag words and register token
// index. Hangup's AOJA retains X1's left half in NTOK; no host count cleanup.
export function* gtknRuntime<W>(m:WordMemory,state:GtknState,r:GtknRegisters,s:GtknSymbols,io:GtknServices<W>):Generator<W,void,void>{
  if(state.hungup!==0n)return;
  yield*io.pushData(r.x1);yield*io.pushData(r.x2);
  state.ccflgDot=add36(state.ccflgDot,1n);
  let fresh=state.ccflgDot===0n;
  if(!fresh){state.bufptr=add36(state.bufptr,1n);fresh=state.bufptr<=0n;}
  if(fresh){
    if(currentVariant().definition.id!=='austin'){r.t1=state.locked;state.svlock=r.t1;if(r.t1!==0n)yield*io.unlo();}
    yield*io.inli();if(currentVariant().definition.id!=='austin')yield*reacquireRuntime(state,r,io);r.t1=rightHalf(s.linbuf);state.bufptr=r.t1;
  }else yield*io.ocrl();
  r.f=0n;r.x1=signed36(halfWords(-BigInt(K.KMAXTK-1),0n));
  const at=(base:bigint)=>rightHalf(base+rightHalf(r.x1));
  if(state.hungup!==0n){
    r.t1=BigInt(K.KALF);m.write(at(s.typlst),r.t1);r.t1=m.read(s.quitWord);m.write(at(s.tknlst),r.t1);r.x1=add36(r.x1,1n);
  }else for(;;){
    yield*io.nxtt();r.t1=BigInt(K.KNUL);
    if((r.f&tf.num)!==0n)r.t1=BigInt(K.KINT);
    if((r.f&tf.pnt)!==0n)r.t1=BigInt(K.KFLT);
    if((r.f&tf.nnm)!==0n)r.t1=BigInt(K.KALF);
    m.write(at(s.typlst),r.t1);
    if((r.f&tf.eol)!==0n){
      if((r.f&tf.chr)!==0n||rightHalf(r.x1)!==0n)r.x1=rightHalf(r.x1+1n);
      r.x1=rightHalf(r.x1);break;
    }
    if(yield*io.aobjn())continue;
    r.p1=rightHalf(s.overflow);yield*io.ostr();r.x1=0n;state.bufptr=-1n;break;
  }
  m.write(s.ntok,r.x1);r.t1=BigInt(K.KEOL);m.write(at(s.typlst),r.t1);m.write(at(s.vallst),0n);
  r.t1=rightHalf(r.x1);m.write(rightHalf(s.tknlst+rightHalf(r.t1)),0n);
  r.x2=yield*io.popData();r.x1=yield*io.popData();
}
