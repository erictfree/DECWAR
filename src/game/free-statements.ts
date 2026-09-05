import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export type FreeLocals={tteam:bigint;d:bigint;kindex:bigint;i:bigint};
export type FreeStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'and'|'binary'|'assign'>&{
  not(word:bigint):boolean;
  integerOr(left:WeaponExpression<W>,right:WeaponExpression<W>):Generator<W,bigint,void>;
  bounds(start:WeaponExpression<W>,limit:WeaponExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  assignAliveOne(destination:()=>bigint):Generator<W,void,void>;
  lock(address:bigint):Generator<W,void,void>;
  unlock(address:bigint):Generator<W,void,void>;
  setdsp(v:bigint,h:bigint,zero:0):Generator<W,void,void>;
  daytim(d:bigint):Generator<W,bigint,void>;
  trcoff(snum:bigint):Generator<W,void,void>;
  kqsrch(tty:bigint,job:bigint,ppn:bigint,index:bigint):Generator<W,void,void>;
  gethit(snum:bigint):Generator<W,void,void>;
  getmsg(snum:bigint,buffer:bigint):Generator<W,void,void>;
  blkset(address:bigint,zero:0,count:17):Generator<W,void,void>;
};
// FREE.FOR:29-96, FREE entry only. RSTART shares FRLOCL and private locals
// through restartStatements. No player snapshot, range guard or rollback.
export function* freeStatements<W>(high:CommonBlock,low:CommonBlock,fr:WordBlock,snum:bigint,l:FreeLocals,io:FreeStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),integer=(n:number)=>v(()=>BigInt(n));
  const word=(a:()=>bigint)=>v(()=>m.read(a())),write=(a:()=>bigint,e:WeaponExpression<W>)=>io.assign(a,'integer',e);
  const sn=()=>m.read(snum),ship=(c:number)=>()=>high.address('shpcon',sn(),c),job=(c:number)=>()=>high.address('job',sn(),c),q=(c:number)=>()=>high.address('kilque',m.read(l.kindex),c);
  const bin=(op:'add'|'sub'|'mul',a:WeaponExpression<W>,b:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.binary(op,a,b)});
  const h=(name:string)=>()=>high.address(name),local=(key:keyof FreeLocals)=>()=>l[key];
  const time:WeaponExpression<W>={type:'integer',evaluate:()=>io.daytim(l.d)};
  function* loop(limit:number,body:()=>Generator<W,void,void>):Generator<W,void,void>{
    const b=yield*io.bounds(integer(1),integer(limit));m.write(l.i,b.start);if(io.enterLoop(b.start,b.limit))do{yield*body();m.write(l.i,add36(m.read(l.i),1n));}while(m.read(l.i)<=b.limit);
  }
  if(high.read('alive',sn())>0n)return;
  do{yield*io.lock(high.address('frelok'));}while(io.logical(low.read('lkfail')));
  yield*io.setdsp(ship(K.KVPOS)(),ship(K.KHPOS)(),0);
  yield*write(local('tteam'),integer(1));if(sn()>BigInt(K.KNPLAY/2))yield*write(local('tteam'),integer(2));
  yield*write(()=>fr.address('tship'),bin('add',bin('mul',word(local('tteam')),integer(100)),word(()=>snum)));
  yield*write(h('numply'),bin('sub',word(h('numply')),integer(1)));
  if(yield*io.and(function*(){return high.read('numply')===0n;},function*(){return io.not(high.read('endflg'));}))yield*write(h('hitime'),bin('add',time,integer(300000)));
  const side=()=>high.address('numsid',m.read(l.tteam));yield*write(side,bin('sub',word(side),integer(1)));
  if(high.read('trstat',sn())!==0n)yield*io.trcoff(snum);
  yield*io.kqsrch(job(K.KTTYN)(),job(K.KJOB)(),job(K.KPPN)(),l.kindex);
  if(m.read(l.kindex)===0n){
    if(high.read('nkill')<BigInt(K.KQLEN))yield*write(h('nkill'),bin('add',word(h('nkill')),integer(1)));
    yield*write(h('kilndx'),bin('add',word(h('kilndx')),integer(1)));if(high.read('kilndx')>BigInt(K.KQLEN))yield*write(h('kilndx'),integer(1));yield*write(local('kindex'),word(h('kilndx')));
  }
  yield*write(q(1),word(job(K.KJOB)));yield*write(q(2),word(job(K.KPPN)));yield*write(q(3),word(job(K.KTTYN)));yield*write(q(4),time);
  yield*write(q(5),{type:'integer',evaluate:()=>io.integerOr(word(local('tteam')),bin('mul',word(()=>snum),integer(262144)))});
  yield*loop(K.KNJBST,function*(){yield*write(()=>fr.address('tjob',m.read(l.i)),word(()=>high.address('job',sn(),m.read(l.i))));yield*write(()=>high.address('job',sn(),m.read(l.i)),integer(0));});
  yield*loop(10,function*(){yield*write(()=>fr.address('tshpco',m.read(l.i)),word(()=>high.address('shpcon',sn(),m.read(l.i))));});
  for(const c of [K.KVPOS,K.KHPOS,K.KSNRGY])yield*write(ship(c),integer(0));
  yield*loop(K.KNDEV,function*(){yield*write(()=>fr.address('tshpda',m.read(l.i)),word(()=>high.address('shpdam',sn(),m.read(l.i))));});
  while(high.read('hitflg',sn())>0n)yield*io.gethit(snum);
  while(high.read('msgflg',sn())>0n)yield*io.getmsg(snum,fr.address('dum',1));
  yield*write(()=>low.address('dbits'),integer(0));yield*write(()=>low.address('dispfr'),integer(0));yield*io.blkset(low.address('iwhat'),0,17);
  yield*io.assignAliveOne(()=>high.address('alive',sn()));yield*io.unlock(high.address('frelok'));
}
