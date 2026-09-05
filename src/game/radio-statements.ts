import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import type { FreeStatementServices } from './free-statements.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export const radioMessages=['radio0','radio2','unkshp','radgag','radung','radoff','radon0'] as const;
export type RadioMessage=typeof radioMessages[number];
export type RadioLocals={index:bigint;gagtyp:bigint;i:bigint;iteam:bigint};
export type RadioSymbols=Record<'ON'|'OFF'|'GAG'|'UNGAG',bigint>;
export type RadioStatementServices<W>=Pick<WeaponStatementServices<W>,'assign'|'binary'|'logical'|'or'>&Pick<FreeStatementServices<W>,'bounds'|'enterLoop'>&{
  bits(op:'and'|'or',left:WeaponExpression<W>,right:WeaponExpression<W>):Generator<W,bigint,void>;
  negate(value:WeaponExpression<W>):Generator<W,bigint,void>;
  equal(token:bigint,master:bigint):Generator<W,bigint,void>;
  out(message:RadioMessage,lines:0|1):Generator<W,void,void>;crlf():Generator<W,void,void>;gtkn():Generator<W,void,void>;
  odisp(value:WeaponExpression<W>,detail:0):Generator<W,void,void>;
};
// RADIO.FOR:25-87. All private variables, tokens, BITS and NAMES remain live;
// there is no target-alive, radio-damage or player-range guard in this command.
export function* radioStatements<W>(high:CommonBlock,low:CommonBlock,l:RadioLocals,s:RadioSymbols,io:RadioStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),integer=(n:number)=>v(()=>BigInt(n));
  const word=(a:()=>bigint)=>v(()=>m.read(a())),write=(a:()=>bigint,e:WeaponExpression<W>)=>io.assign(a,'integer',e);
  const index=()=>m.read(l.index),token=()=>low.address('tknlst',index()),next=()=>add36(index(),1n),alpha=(i:bigint)=>low.read('typlst',i)===BigInt(K.KALF);
  const bin=(op:'add'|'mul',a:WeaponExpression<W>,b:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.binary(op,a,b)});
  const bitop=(op:'and'|'or',a:WeaponExpression<W>,b:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.bits(op,a,b)});
  const mask=(bit:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.negate(bin('add',bit,integer(1)))});
  const equal=function*(key:keyof RadioSymbols){return io.logical(yield*io.equal(token(),s[key]));};
  yield*io.crlf();yield*write(()=>l.index,integer(2));let prompt=!alpha(2n);
  for(;;){
    if(prompt){yield*write(()=>l.index,integer(1));yield*io.out('radio0',0);yield*io.gtkn();if(low.read('typlst',1)===BigInt(K.KEOL))return;yield*io.crlf();}
    if(yield*equal('ON')){yield*write(()=>high.address('nomsg'),bitop('and',word(()=>high.address('nomsg')),mask(v(()=>high.read('bits',low.read('who'))))));yield*io.out('radon0',1);return;}
    if(yield*equal('OFF')){yield*write(()=>high.address('nomsg'),bitop('or',word(()=>high.address('nomsg')),v(()=>high.read('bits',low.read('who')))));yield*io.out('radoff',1);return;}
    if(yield*io.or(()=>equal('GAG'),()=>equal('UNGAG')))break;
    prompt=true;
  }
  yield*write(()=>l.gagtyp,integer(0));if(yield*equal('UNGAG'))yield*write(()=>l.gagtyp,integer(1));
  while(!alpha(next())){yield*io.out('radio2',0);yield*io.gtkn();if(low.read('typlst',1)===BigInt(K.KEOL))return;yield*write(()=>l.index,integer(0));}
  const b=yield*io.bounds(integer(1),integer(K.KNPLAY));m.write(l.i,b.start);let found=false;
  if(io.enterLoop(b.start,b.limit))do{if(io.logical(yield*io.equal(low.address('tknlst',next()),high.address('names',m.read(l.i),1)))){found=true;break;}m.write(l.i,add36(m.read(l.i),1n));}while(m.read(l.i)<=b.limit);
  if(!found){yield*io.out('unkshp',1);return;}
  if(m.read(l.i)===low.read('who'))return;
  const bit=v(()=>high.read('bits',m.read(l.i))),gag=()=>low.address('gagmsg');
  if(m.read(l.gagtyp)!==0n){yield*write(gag,bitop('and',word(gag),mask(bit)));yield*io.out('radung',0);}
  else{yield*write(gag,bitop('or',word(gag),bit));yield*io.out('radgag',0);}
  yield*write(()=>l.iteam,integer(1));if(m.read(l.i)>BigInt(K.KNPLAY/2))yield*write(()=>l.iteam,integer(2));
  yield*io.odisp(bin('add',bin('mul',word(()=>l.iteam),integer(100)),word(()=>l.i)),0);yield*io.crlf();
}
