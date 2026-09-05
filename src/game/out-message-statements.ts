import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import type { WeaponExpression } from './weapon-damage-statements.ts';
import type { RadioStatementServices } from './radio-statements.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export type OutMessageLocals={i:bigint;k:bigint};
export type OutMessageStatementServices<W>=Pick<RadioStatementServices<W>,'assign'|'binary'|'bits'|'bounds'|'enterLoop'|'crlf'>&{
  mod(left:WeaponExpression<W>,right:WeaponExpression<W>):Generator<W,bigint,void>;
  getmsg(who:bigint,buffer:bigint):Generator<W,void,void>;
  out(label:'mess01'|'mess02',lines:0):Generator<W,void,void>;
  outBuffer(address:bigint,lines:1):Generator<W,void,void>;
  odisp(address:bigint,detail:1):Generator<W,void,void>;
  out2c(address:bigint):Generator<W,void,void>;
};
// OUTMSG.FOR:24-54. OMLOCL persists; a GETMSG miss can print its old buffer.
// No count-sign, sender-index, radio-damage or NOMSG guard is added.
export function* outMessageStatements<W>(high:CommonBlock,low:CommonBlock,om:WordBlock,l:OutMessageLocals,io:OutMessageStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),integer=(n:number)=>v(()=>BigInt(n));
  const word=(address:()=>bigint)=>v(()=>m.read(address())),write=(address:()=>bigint,e:WeaponExpression<W>)=>io.assign(address,'integer',e);
  const bits=(a:WeaponExpression<W>,b:WeaponExpression<W>)=>io.bits('and',a,b);
  for(;;){
    yield*write(()=>low.address('dbits'),integer(0));yield*write(()=>low.address('dispfr'),integer(0));
    if(high.read('msgflg',low.read('who'))===0n)return;
    yield*io.getmsg(low.address('who'),om.address('msg',1));
    if(low.read('dispfr')!==0n){
      const sender:WeaponExpression<W>={type:'integer',evaluate:function*(){const i=yield*io.mod(word(()=>low.address('dispfr')),integer(100));return high.read('bits',i);}};
      if((yield*bits(word(()=>low.address('gagmsg')),sender))!==0n)continue;
      yield*io.out('mess01',0);yield*io.odisp(low.address('dispfr'),1);yield*io.out('mess02',0);
      yield*write(()=>l.k,integer(1));const b=yield*io.bounds(integer(1),integer(K.KNPLAY));m.write(l.i,b.start);
      if(io.enterLoop(b.start,b.limit))do{
        if((yield*bits(word(()=>low.address('dbits')),word(()=>l.k)))!==0n)yield*io.out2c(high.address('names',m.read(l.i),3));
        yield*write(()=>l.k,{type:'integer',evaluate:()=>io.binary('mul',word(()=>l.k),integer(2))});m.write(l.i,add36(m.read(l.i),1n));
      }while(m.read(l.i)<=b.limit);
      yield*io.crlf();
    }
    yield*io.outBuffer(om.address('msg',1),1);
  }
}
