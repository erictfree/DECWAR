import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import type { FreeStatementServices } from './free-statements.ts';
import type { WeaponExpression } from './weapon-damage-statements.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export type RestartLocals={tteam:bigint;i:bigint;dummy:bigint};
export type RestartStatementServices<W>=Pick<FreeStatementServices<W>,'logical'|'binary'|'assign'|'bounds'|'enterLoop'|'unlock'>&{
  assignAliveTrue(destination:()=>bigint):Generator<W,void,void>;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;
  lock(address:bigint,caller:'RSTART'):Generator<W,void,void>;
  jobsta(args:readonly [bigint,bigint,bigint,bigint,bigint,bigint]):Generator<W,void,void>;
  setdsp(v:bigint,h:bigint,ship:bigint):Generator<W,void,void>;
  out(message:'free01'|'free02',lines:1):Generator<W,void,void>;
  monit():Generator<W,void,void>;
};
// FREE.FOR:100-148. This ENTRY shares FRLOCL, TTEAM and I with FREE.
// Availability is tested before LOCK; MONIT return resumes label 800.
export function* restartStatements<W>(high:CommonBlock,low:CommonBlock,fr:WordBlock,snum:bigint,l:RestartLocals,io:RestartStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),integer=(n:number)=>v(()=>BigInt(n));
  const word=(a:()=>bigint)=>v(()=>m.read(a())),write=(a:()=>bigint,e:WeaponExpression<W>)=>io.assign(a,'integer',e);
  const sn=()=>m.read(snum),job=(c:number)=>()=>high.address('job',sn(),c),saved=(c:number)=>fr.address('tshpco',c);
  const bin=(op:'add'|'sub'|'div',a:WeaponExpression<W>,b:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.binary(op,a,b)});
  for(;;){
    if(high.read('shpcon',sn(),K.KVPOS)!==0n)yield*io.out('free01',1);
    else if((yield*io.disp(saved(K.KVPOS),saved(K.KHPOS)))>0n)yield*io.out('free02',1);
    else break;
    yield*io.monit();
  }
  do{yield*io.lock(high.address('frelok'),'RSTART');}while(io.logical(low.read('lkfail')));
  yield*io.assignAliveTrue(()=>high.address('alive',sn()));
  yield*write(()=>high.address('numply'),bin('add',word(()=>high.address('numply')),integer(1)));
  yield*write(()=>l.tteam,bin('add',bin('div',bin('sub',word(()=>snum),integer(1)),integer(K.KNPLAY/2)),integer(1)));
  const side=()=>high.address('numsid',m.read(l.tteam));yield*write(side,bin('add',word(side),integer(1)));
  function* loop(limit:number,body:()=>Generator<W,void,void>):Generator<W,void,void>{
    const b=yield*io.bounds(integer(1),integer(limit));m.write(l.i,b.start);if(io.enterLoop(b.start,b.limit))do{yield*body();m.write(l.i,add36(m.read(l.i),1n));}while(m.read(l.i)<=b.limit);
  }
  yield*loop(10,function*(){yield*write(()=>high.address('shpcon',sn(),m.read(l.i)),word(()=>fr.address('tshpco',m.read(l.i))));});
  yield*loop(K.KNDEV,function*(){yield*write(()=>high.address('shpdam',sn(),m.read(l.i)),word(()=>fr.address('tshpda',m.read(l.i))));});
  yield*io.jobsta([job(K.KJOB)(),l.dummy,l.dummy,job(K.KPPN)(),job(K.KTTYN)(),job(K.KTTYSP)()]);
  for(const c of [K.KNAM1,K.KNAM2,K.KTTYTP,K.KJOBTM,K.KRUNTM])yield*write(job(c),word(()=>fr.address('tjob',c)));
  yield*io.setdsp(saved(K.KVPOS),saved(K.KHPOS),fr.address('tship'));
  yield*io.unlock(high.address('frelok'));
}
