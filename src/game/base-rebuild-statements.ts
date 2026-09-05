import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';

export type BaseRebuildExpression<W>=()=>Generator<W,bigint,void>;
export type BaseRebuildServices<W>={
  logical(word:bigint):boolean;
  integer(op:'add'|'div'|'min',left:BaseRebuildExpression<W>,right:BaseRebuildExpression<W>):Generator<W,bigint,void>;
  assign(destination:()=>bigint,value:BaseRebuildExpression<W>):Generator<W,void,void>;
  enterTeams(start:bigint,limit:bigint):boolean; // Compiler DO entry policy; no default for reversed bounds.
};
// BASBLD.FOR:33-45. IB/IE/N/J/I are explicit compiler-local words. The
// initial division runs even when PLAYER causes its value to be replaced.
// Ordinary DO advancement is modeled; exceptional control-variable mutation
// and actual compiler/CPU instruction/frame behavior remain outside this body.
export function* rebuildBaseStatements<W>(high:CommonBlock,low:CommonBlock,locals:{ib:bigint;ie:bigint;n:bigint;j:bigint;i:bigint},io:BaseRebuildServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):BaseRebuildExpression<W>=>function*(){return read();};
  const constant=(n:bigint)=>value(()=>n),local=(a:bigint)=>value(()=>m.read(a));
  const binary=(op:Parameters<BaseRebuildServices<W>['integer']>[0],l:BaseRebuildExpression<W>,r:BaseRebuildExpression<W>):BaseRebuildExpression<W>=>()=>io.integer(op,l,r);
  const advance=(a:bigint)=>m.write(a,add36(m.read(a),1n));
  const base=()=>high.address('base',m.read(locals.i),3,m.read(locals.j));
  m.write(locals.ib,1n);m.write(locals.ie,2n);
  yield*io.assign(()=>locals.n,binary('div',constant(50n),binary('add',value(()=>high.read('numply')),constant(1n))));
  if(io.logical(low.read('player'))){
    if(low.read('team')===1n)m.write(locals.ib,2n);
    m.write(locals.ie,m.read(locals.ib));
    yield*io.assign(()=>locals.n,binary('div',constant(25n),value(()=>high.read('numsid',low.read('team')))));
  }
  const start=m.read(locals.ib),limit=m.read(locals.ie);m.write(locals.j,start);
  if(!io.enterTeams(start,limit))return;
  do{
    for(m.write(locals.i,1n);m.read(locals.i)<=BigInt(K.KNBASE);advance(locals.i)){
      if(m.read(base())<=0n)continue;
      yield*io.assign(base,binary('min',binary('add',value(()=>m.read(base())),local(locals.n)),constant(1000n)));
    }
    advance(locals.j);
  }while(m.read(locals.j)<=limit);
}
