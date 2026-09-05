import type { CommonBlock,WordMemory } from '../compat/memory.ts';
import { constants as K } from '../runtime/variant-values.ts';
import { add36 } from '../compat/word36.ts';

// Addresses of the six by-reference arguments and compiler-local TW.
export type PrlocWords={v:bigint;h:bigint;prcflg:bigint;w:bigint;prlflg:bigint;proflg:bigint;tw:bigint};
export type PrlocServices<W>={
  outc(character:'@'|'-'|','):Generator<W,void,void>;space():Generator<W,void,void>;crlf():Generator<W,void,void>;
  odec(valueAddress:bigint,widthAddress:bigint):Generator<W,void,void>;
  osdec(value:bigint,widthAddress:bigint):Generator<W,void,void>;
  pdist(v:bigint,h:bigint,ownV:bigint,ownH:bigint):Generator<W,bigint,void>;
  difference(valueAddress:bigint,originAddress:bigint):Generator<W,bigint,void>; // Compiler subtraction/overflow policy.
  omitRelative(distance:()=>Generator<W,bigint,void>,width:()=>bigint):Generator<W,boolean,void>; // Compiler .AND. evaluation policy.
};
// PRLOC.FOR:34-52. Arguments/own position are reread at their source calls;
// TW has caller-supplied compiler storage. No pre-game WHO guard is added.
export function* prlocStatements<W>(m:WordMemory,high:CommonBlock,low:CommonBlock,a:PrlocWords,io:PrlocServices<W>):Generator<W,void,void>{
  if(m.read(a.prlflg)!==BigInt(K.KREL)){
    if(m.read(a.proflg)!==BigInt(K.SHORT))yield*io.outc('@');
    yield*io.odec(a.v,a.w);yield*io.outc('-');yield*io.odec(a.h,a.w);
  }
  const own=(axis:number)=>high.address('shpcon',low.read('who'),axis);
  if(!(yield*io.omitRelative(()=>io.pdist(a.v,a.h,own(K.KVPOS),own(K.KHPOS)),()=>m.read(a.w)))){
    if(m.read(a.prlflg)===BigInt(K.KBOTH))yield*io.space();
    if(m.read(a.prlflg)!==BigInt(K.KABS)){
      m.write(a.tw,m.read(a.w));if(m.read(a.w)!==0n)m.write(a.tw,add36(m.read(a.w),1n));
      yield*io.osdec(yield*io.difference(a.v,own(K.KVPOS)),a.tw);yield*io.outc(',');
      yield*io.osdec(yield*io.difference(a.h,own(K.KHPOS)),a.tw);
    }
  }
  if(m.read(a.prcflg)!==0n)yield*io.crlf();
}
