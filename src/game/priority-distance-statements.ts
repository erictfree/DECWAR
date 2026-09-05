import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';

export type PriorityExpression<W>=()=>Generator<W,bigint,void>;
export type PriorityArguments={iv:bigint;ih:bigint;ilim:bigint;iflag:bigint;zero:bigint};
export type PriorityLocals={li:bigint;lj:bigint;i:bigint};
export type PriorityStatementServices<W>={
  logical(word:bigint):boolean;
  bounds(start:PriorityExpression<W>,limit:PriorityExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  ldis(v:bigint,h:bigint,otherV:bigint,otherH:bigint,limitAddress:bigint):Generator<W,bigint,void>;
  integerOr(left:PriorityExpression<W>,right:PriorityExpression<W>):Generator<W,bigint,void>;
  assign(destination:()=>bigint,value:PriorityExpression<W>):Generator<W,void,void>;
};
// PRIDIS.FOR:35-46. Arguments and LI/LJ/I are actual compiler storage.
// ALIVE is compared numerically, not interpreted as LOGICAL. Ordinary DO
// advancement is modeled; CPU/call frames and exceptional loop changes are not.
export function* priorityDistanceStatements<W>(high:CommonBlock,low:CommonBlock,a:PriorityArguments,
  locals:PriorityLocals,io:PriorityStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):PriorityExpression<W>=>function*(){return read();};
  m.write(locals.li,1n);m.write(locals.lj,BigInt(K.KNPLAY));
  if(m.read(a.iflag)===1n)m.write(locals.lj,BigInt(K.KNPLAY/2));
  if(m.read(a.iflag)===2n)m.write(locals.li,BigInt(K.KNPLAY/2+1));
  if(m.read(a.zero)===0n)low.write('dbits',0n);
  const bounds=yield*io.bounds(value(()=>m.read(locals.li)),value(()=>m.read(locals.lj)));
  m.write(locals.i,bounds.start);if(!io.enterLoop(bounds.start,bounds.limit))return;
  do{
    if(high.read('alive',m.read(locals.i))<=0n){
      if(io.logical(yield*io.ldis(a.iv,a.ih,high.address('shpcon',m.read(locals.i),K.KVPOS),high.address('shpcon',m.read(locals.i),K.KHPOS),a.ilim))){
        yield*io.assign(()=>low.address('dbits'),()=>io.integerOr(value(()=>low.read('dbits')),value(()=>high.read('bits',m.read(locals.i)))));
      }
    }
    m.write(locals.i,add36(m.read(locals.i),1n));
  }while(m.read(locals.i)<=bounds.limit);
}
