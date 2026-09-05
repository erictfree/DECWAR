import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { CommandReturn } from './maintenance.ts';

export type RepairExpression<W>=()=>Generator<W,bigint,void>;
export type RepairServices<W>={
  logical(word:bigint):boolean;
  and(left:()=>boolean,right:()=>boolean):Generator<W,boolean,void>; // Compiler compound LOGICAL evaluation.
  integer(op:'add'|'sub'|'mul'|'div'|'min'|'max',left:RepairExpression<W>,right:RepairExpression<W>):Generator<W,bigint,void>;
  assign(destination:()=>bigint,value:RepairExpression<W>):Generator<W,void,void>; // Compiler LHS/RHS order and arithmetic policy.
  equal(tokenAddress:bigint,masterAddress:bigint):Generator<W,bigint,void>;
  etim(startAddress:bigint):Generator<W,bigint,void>;
  damage(stokenValue:bigint):Generator<W,void,void>; // Compiler NTOKEN+1 temporary and by-reference DAMAGE argument.
};
// REPAIR.FOR:37-70. IL is a reference; unnamed locals have caller-supplied
// compiler storage. Ordinary DO body advancement is modeled, not exceptional
// control-variable mutation or the compiler's complete return/call frames.
export function* repairStatements<W>(high:CommonBlock,low:CommonBlock,il:bigint,locals:{v:bigint;l:bigint;repsiz:bigint;ntoken:bigint;maxd:bigint;i:bigint},s:{all:bigint;damage:bigint},io:RepairServices<W>):Generator<W,CommandReturn,void>{
  const m=low.memory,value=(read:()=>bigint):RepairExpression<W>=>function*(){return read();};
  const local=(a:bigint)=>value(()=>m.read(a)),constant=(n:bigint)=>value(()=>n);
  const binary=(op:Parameters<RepairServices<W>['integer']>[0],left:RepairExpression<W>,right:RepairExpression<W>):RepairExpression<W>=>()=>io.integer(op,left,right);
  const elapsed:RepairExpression<W>=()=>io.etim(high.address('tim0'));
  const damageAddress=()=>high.address('shpdam',low.read('who'),m.read(locals.i));
  const advance=()=>m.write(locals.i,add36(m.read(locals.i),1n));
  m.write(locals.v,0n);m.write(locals.l,m.read(il));
  if(yield*io.and(()=>io.logical(high.read('docked',low.read('who'))),()=>m.read(locals.l)!==3n))m.write(locals.l,2n);
  if(m.read(locals.l)===1n)m.write(locals.repsiz,500n);
  if(m.read(locals.l)===2n)m.write(locals.repsiz,1000n);
  if(m.read(locals.l)===3n)m.write(locals.repsiz,300n);
  m.write(locals.ntoken,2n);
  if(m.read(locals.l)!==3n&&low.read('typlst',2)===BigInt(K.KINT)){
    yield*io.assign(()=>locals.repsiz,binary('mul',value(()=>low.read('vallst',2)),constant(10n)));m.write(locals.ntoken,3n);
  }
  m.write(locals.maxd,0n);
  for(m.write(locals.i,1n);m.read(locals.i)<=BigInt(K.KNDEV);advance()){
    yield*io.assign(()=>locals.maxd,binary('max',local(locals.maxd),value(()=>m.read(damageAddress()))));
  }
  if(m.read(locals.maxd)!==0n){
    yield*io.assign(()=>locals.repsiz,binary('min',local(locals.repsiz),local(locals.maxd)));
    if(io.logical(yield*io.equal(low.address('tknlst',2),s.all))){m.write(locals.repsiz,m.read(locals.maxd));m.write(locals.ntoken,3n);}
    if(m.read(locals.l)!==3n)yield*io.assign(()=>locals.v,binary('add',elapsed,binary('div',binary('mul',local(locals.repsiz),constant(8n)),local(locals.l))));
    for(m.write(locals.i,1n);m.read(locals.i)<=BigInt(K.KNDEV);advance()){
      yield*io.assign(damageAddress,binary('max',binary('sub',value(()=>m.read(damageAddress())),local(locals.repsiz)),constant(0n)));
    }
  }
  if(m.read(locals.l)===3n)return {alternateReturn:false};
  if(io.logical(yield*io.equal(low.address('tknlst',m.read(locals.ntoken)),s.damage))){
    const token=yield*io.integer('add',local(locals.ntoken),constant(1n));yield*io.damage(token);
  }
  yield*io.assign(()=>low.address('ptime'),binary('sub',local(locals.v),elapsed));
  return {alternateReturn:low.read('ptime')<=0n,pause:low.read('ptime')};
}
