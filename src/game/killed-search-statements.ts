import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import { add36 } from '../compat/word36.ts';
export type KilledSearchServices<W>=Pick<WeaponStatementServices<W>,'assign'|'and'|'compare'>&{
  bounds(start:WeaponExpression<W>,limit:WeaponExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
};
// KQSRCH.FOR:25-50. I is assigned from II on each iteration. The disabled
// terminal/time match stays disabled. Actual arguments and queue words alias.
export function* killedSearchStatements<W>(high:CommonBlock,args:{tty:bigint;job:bigint;ppn:bigint;index:bigint},l:{i:bigint;ii:bigint},io:KilledSearchServices<W>):Generator<W,void,void>{
  const m=high.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),word=(a:()=>bigint)=>v(()=>m.read(a()));
  const write=(a:()=>bigint,e:WeaponExpression<W>)=>io.assign(a,'integer',e),row=(c:number)=>()=>high.address('kilque',m.read(l.i),c);
  yield*write(()=>args.index,v(()=>0n));if(high.read('nkill')===0n)return;
  const b=yield*io.bounds(v(()=>1n),v(()=>high.read('nkill')));m.write(l.ii,b.start);
  if(io.enterLoop(b.start,b.limit))do{
    yield*write(()=>l.i,word(()=>l.ii));
    if(yield*io.and(()=>io.compare('eq',word(()=>args.job),word(row(1))),()=>io.compare('eq',word(()=>args.ppn),word(row(2))))){
      yield*write(()=>args.index,word(()=>l.i));yield*write(row(1),word(()=>args.job));yield*write(row(2),word(()=>args.ppn));yield*write(row(3),word(()=>args.tty));return;
    }
    m.write(l.ii,add36(m.read(l.ii),1n));
  }while(m.read(l.ii)<=b.limit);
}
