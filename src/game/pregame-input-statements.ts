import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
export type PregameInputLocals={i:bigint;precmd:bigint};
export type PregameInputMessage='ambcom'|'unkcom'|'maicom'|'forhlp';
export type PregameInputStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'or'|'assign'>&{
  assignFalse(address:bigint):Generator<W,void,void>;
  bounds(start:WeaponExpression<W>,limit:WeaponExpression<W>,step:1):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint,step:1):boolean;
  crlf():Generator<W,void,void>;
  out2c(literal:'PG'|'> '):Generator<W,void,void>;
  dmpbuf():Generator<W,void,void>;
  input(milliseconds:10000):Generator<W,bigint,void>;
  gtkn():Generator<W,void,void>;
  monit():Generator<W,void,void>;
  equal(token:bigint,master:bigint):Generator<W,bigint,void>;
  out(message:PregameInputMessage,lines:0|1):Generator<W,void,void>;
};
// SETUP.FOR:498-556 (XGTCMD), PARAM:21 all-letter INTEGER. CMD is an
// actual caller address; I and PRECMD are caller-owned private compiler storage.
// Literal, logical, assignment, DO, expression/call and monitor policies remain
// supplied; no source command table or local state is copied into host objects.
export function* pregameInputStatements<W>(cmd:bigint,high:CommonBlock,low:CommonBlock,l:PregameInputLocals,io:PregameInputStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}});
  const integer=(n:number)=>value(()=>BigInt(n)),index=()=>m.read(l.i);
  function* scan(limit:number,body:()=>Generator<W,'stop'|void,void>):Generator<W,boolean,void>{
    const b=yield*io.bounds(integer(1),integer(limit),1);m.write(l.i,b.start);
    if(io.enterLoop(b.start,b.limit,1))do{
      if((yield*body())==='stop')return true;
      m.write(l.i,add36(index(),1n));
    }while(index()<=b.limit);
    return false;
  }
  for(;;){
    yield*io.crlf();yield*io.assignFalse(low.address('ccflg'));yield*io.out2c('PG');yield*io.out2c('> ');yield*io.dmpbuf();
    while(!io.logical(yield*io.input(10000))){} // Label 200 does not reprompt or separately check flags.
    yield*io.gtkn();
    if(yield*io.or(function*(){return io.logical(low.read('ccflg'));},function*(){return io.logical(low.read('hungup'));}))yield*io.monit();
    if(low.read('typlst',1)===BigInt(K.KEOL))continue;
    yield*io.assign(()=>cmd,'integer',integer(0));
    const ambiguous=yield*scan(K.KNPCMD,function*(){
      if(!io.logical(yield*io.equal(low.address('tknlst',1),l.precmd+2n*(index()-1n))))return;
      if(m.read(cmd)!==0n)return 'stop';
      yield*io.assign(()=>cmd,'integer',value(index));
    });
    // The arithmetic IF includes its negative branch even though its comment
    // says it cannot occur; aliases or caller state can make it observable.
    const result=ambiguous?undefined:m.read(cmd);
    if(result!==undefined&&result>0n)return;
    if(ambiguous||(result!==undefined&&result<0n))yield*io.out('ambcom',0);
    else{
      const gameOnly=yield*scan(K.KNCMD,function*(){if(io.logical(yield*io.equal(low.address('tknlst',1),high.address('isaydo',1,index()))))return 'stop';});
      yield*io.out(gameOnly?'maicom':'unkcom',0);
    }
    yield*io.out('forhlp',1);
  }
}
