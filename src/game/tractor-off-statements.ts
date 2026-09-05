import type { CommonBlock } from '../compat/memory.ts';
import type { FreeStatementServices } from './free-statements.ts';
import type { WeaponExpression } from './weapon-damage-statements.ts';
export type TractorOffStatementServices<W>=Pick<FreeStatementServices<W>,'assign'|'integerOr'>&{makhit():Generator<W,void,void>};
// TRACTR.FOR:126-132, TRCOFF/label 1400. IP and its nested TRSTAT are live;
// no zero-beam guard or cached partner replaces the two separate clears.
export function* tractorOffStatements<W>(high:CommonBlock,low:CommonBlock,ip:bigint,io:TractorOffStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),who=()=>m.read(ip);
  yield*io.assign(()=>low.address('dbits'),'integer',{type:'integer',evaluate:()=>io.integerOr(v(()=>high.read('bits',who())),v(()=>high.read('bits',high.read('trstat',who()))))});
  yield*io.assign(()=>low.address('iwhat'),'integer',v(()=>14n));
  yield*io.assign(()=>high.address('trstat',high.read('trstat',who())),'integer',v(()=>0n));
  yield*io.assign(()=>high.address('trstat',who()),'integer',v(()=>0n));
  yield*io.makhit();
}
