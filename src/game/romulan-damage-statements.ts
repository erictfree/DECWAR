import type { CommonBlock } from '../compat/memory.ts';
import { constants as K } from '../generated/source-data.ts';

export type RomulanDamageEntry='pharom'|'deadro'|'torom';
export type RomulanDamageExpression<W>=()=>Generator<W,bigint,void>;
export type RomulanDamageStatementServices<W>={
  falseWord:bigint;
  integer(op:'add'|'sub'|'mul'|'div'|'min',left:RomulanDamageExpression<W>,right:RomulanDamageExpression<W>):Generator<W,bigint,void>;
  assign(destination:()=>bigint,value:RomulanDamageExpression<W>):Generator<W,void,void>;
  iran(max:100|4000):Generator<W,bigint,void>;
  setdsp(vAddress:bigint,hAddress:bigint,zero:0):Generator<W,void,void>;
};
// ROMDRV.FOR:212-233. Alternate entries bypass main ROMDRV locals/guards.
// PHIT/ID are actual compiler argument addresses; DEADRO and TOROM never read
// them. Expression trees and assignment order require explicit compiler policy.
export function* romulanDamageStatements<W>(entry:RomulanDamageEntry,high:CommonBlock,low:CommonBlock,
  args:{phit:bigint;id:bigint},io:RomulanDamageStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):RomulanDamageExpression<W>=>function*(){return read();};
  const literal=(n:bigint)=>value(()=>n);
  const binary=(op:Parameters<RomulanDamageStatementServices<W>['integer']>[0],l:RomulanDamageExpression<W>,r:RomulanDamageExpression<W>):RomulanDamageExpression<W>=>()=>io.integer(op,l,r);
  if(entry!=='deadro'){
    low.write('iwhat',entry==='pharom'?1n:2n);
    const hit=entry==='pharom'
      ?binary('div',binary('mul',binary('add',literal(100n),()=>io.iran(100)),value(()=>m.read(args.phit))),binary('mul',literal(10n),value(()=>m.read(args.id))))
      :binary('min',()=>io.iran(4000),literal(2000n));
    yield*io.assign(()=>low.address('ihita'),hit);
    yield*io.assign(()=>high.address('erom'),binary('sub',value(()=>high.read('erom')),binary('div',value(()=>low.read('ihita')),literal(10n))));
    if(high.read('erom')>0n)return;
  }
  low.write('klflg',2n);high.write('rom',io.falseWord);
  yield*io.setdsp(high.address('locr',K.KVPOS),high.address('locr',K.KHPOS),0);
}
