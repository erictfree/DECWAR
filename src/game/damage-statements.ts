import { copiedArgument } from './argument-copy.ts';
import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';

export type DamageServices<W>={
  logical(word:bigint):boolean; // Required compiler interpretation of EQUAL's LOGICAL word.
  enterTokenLoop(start:bigint,limit:bigint):boolean; // Required compiler DO entry policy for reversed bounds.
  equal(tokenAddress:bigint,deviceAddress:bigint):Generator<W,bigint,void>;
  out(message:'alldok'|'units1'|'damrep'|'dmhdr1'|'dmhdr2',lines:0|1|2):Generator<W,void,void>;
  crlf():Generator<W,void,void>;space():Generator<W,void,void>;
  tab(column:10|19):Generator<W,void,void>;spaces(count:9):Generator<W,void,void>;skip(lines:2):Generator<W,void,void>;
  odev(indexAddress:bigint):Generator<W,void,void>;
  oflt(valueAddress:bigint,width:4):Generator<W,void,void>;
  disp(vAddress:bigint,hAddress:bigint):Generator<W,bigint,void>;
  odisp(value:bigint,space:0):Generator<W,void,void>;
};
// DAMAGE.FOR:31-78. STOKEN is a reference; I/J are explicit compiler-local
// words. Ordinary integer DO advancement is modeled; exceptional mutation of
// an active control variable still requires compiler instruction semantics.
export function* damageStatements<W>(high:CommonBlock,low:CommonBlock,stoken:bigint,locals:{i:bigint;j:bigint;ia?:bigint;ja?:bigint},io:DamageServices<W>):Generator<W,void,void>{
  const m=low.memory,damageAddress=(index:bigint)=>high.address('shpdam',low.read('who'),m.read(index));
  const advance=(index:bigint)=>m.write(index,add36(m.read(index),1n));
  function* row(index:bigint):Generator<W,void,void>{
    yield*io.odev(copiedArgument(m,index,index===locals.i?locals.ia:locals.ja,'DECWAR.FOR:800,822'));
    const format=low.read('oflg');
    if(format<0n)yield*io.space();else yield*io.tab(format===0n?10:19);
    yield*io.oflt(damageAddress(index),4);
    if(low.read('oflg')===BigInt(K.LONG))yield*io.out('units1',0);
    yield*io.crlf();
  }
  yield*io.crlf();
  for(m.write(locals.i,1n);m.read(locals.i)<=BigInt(K.KNDEV);advance(locals.i)){
    if(m.read(damageAddress(locals.i))>0n)break;
  }
  if(m.read(locals.i)>BigInt(K.KNDEV)){yield*io.out('alldok',1);return;}
  if(low.read('typlst',m.read(stoken))===BigInt(K.KALF)){
    m.write(locals.i,m.read(stoken));
    if(!io.enterTokenLoop(m.read(locals.i),BigInt(K.KMAXTK)))return;
    do{
      if(low.read('typlst',m.read(locals.i))!==BigInt(K.KALF))return;
      for(m.write(locals.j,1n);m.read(locals.j)<=BigInt(K.KNDEV);advance(locals.j)){
        if(!io.logical(yield*io.equal(low.address('tknlst',m.read(locals.i)),high.address('device',m.read(locals.j)))))continue;
        yield*row(locals.j);
      }
      advance(locals.i);
    }while(m.read(locals.i)<=BigInt(K.KMAXTK));
    return;
  }
  const format=low.read('oflg');
  if(format>=0n){
    if(format>0n){
      yield*io.out('damrep',0);
      yield*io.odisp(yield*io.disp(high.address('shpcon',low.read('who'),K.KVPOS),high.address('shpcon',low.read('who'),K.KHPOS)),0);
      yield*io.skip(2);
    }
    yield*io.out('dmhdr1',0);
    if(low.read('oflg')===BigInt(K.LONG))yield*io.spaces(9);
    yield*io.out('dmhdr2',2);
  }
  for(m.write(locals.i,1n);m.read(locals.i)<=BigInt(K.KNDEV);advance(locals.i)){
    if(m.read(damageAddress(locals.i))<=0n)continue;
    yield*row(locals.i);
  }
}
