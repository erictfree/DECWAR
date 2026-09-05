import { currentVariant } from '../runtime/variant-execution.ts';
import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import { constants as K } from '../runtime/variant-values.ts';
export const endgameMessages=['endgm0','endgm1','endgm3','endgm4','endgm5','endgm6','endgm7','endgm8'] as const;
export type EndgameLocals=Record<'txppn'|'txnm1'|'txnm2'|'txsh1'|'txsh2'|'whowon'|'txwhy'|'txtim'|'txtem'|'txtot',bigint>;
export type EndgameStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'and'|'compare'|'assign'|'binary'>&{
  minmax(operation:'min0'|'max0',values:WeaponExpression<W>[]):Generator<W,bigint,void>;
  assignTrue(address:()=>bigint):Generator<W,void,void>;
  kilhgh():Generator<W,void,void>;
  out(message:typeof endgameMessages[number],lines:1):Generator<W,void,void>;
  etim(start:()=>bigint):Generator<W,bigint,void>;
  points(final:true):Generator<W,void,void>;
  updsta(addresses:readonly bigint[]):Generator<W,void,void>;
  free(who:bigint):Generator<W,void,void>;
  exit():Generator<W,void,void>;
};
// ENDGAM.FOR:26-76. TX* and WHOWON are private compiler words; TOTAL is
// the /POLOCL/ address, not a returned host score. Compiler evaluation, calls,
// monitor effects and nonreturning EXIT remain supplied runtime behavior.
export function* endgameStatements<W>(high:CommonBlock,low:CommonBlock,l:EndgameLocals,total:bigint,io:EndgameStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),integer=(n:number)=>value(()=>BigInt(n));
  const h=(name:string,...indices:number[])=>value(()=>high.read(name,...indices)),lo=(name:string)=>value(()=>low.read(name));
  const cmp=(op:Parameters<typeof io.compare>[0],a:WeaponExpression<W>,b:WeaponExpression<W>)=>()=>io.compare(op,a,b);
  const write=(a:bigint,e:WeaponExpression<W>)=>io.assign(()=>a,'integer',e),local=(key:keyof EndgameLocals)=>value(()=>m.read(l[key]));
  if(!io.logical(high.read('endflg'))){
    if(yield*cmp('gt',h('nplnet'),integer(0))())return;
    if(yield*cmp('gt',{type:'integer',evaluate:()=>io.minmax('min0',[h('nbase',1),h('nbase',2)])},integer(0))())return;
    yield*io.kilhgh();yield*io.assignTrue(()=>high.address('endflg'));
  }
  yield*io.out('endgm0',1);
  if(yield*cmp('eq',{type:'integer',evaluate:()=>io.minmax('max0',[h('nplnet'),h('nbase',1),h('nbase',2)])},integer(0))()){
    yield*io.out('endgm1',1);yield*write(high.address('endflg'),integer(-2));
  }
  if(yield*cmp('eq',h('nbase',1),integer(0))())yield*io.out('endgm3',1);
  if(yield*cmp('eq',h('nbase',2),integer(0))())yield*io.out('endgm4',1);
  for(const [team,base,message] of [[1,1,'endgm5'],[1,2,'endgm6'],[2,1,'endgm7'],[2,2,'endgm8']] as const)
    if(yield*io.and(cmp('eq',lo('team'),integer(team)),cmp('eq',h('nbase',base),integer(0))))yield*io.out(message,1);
  if(yield*cmp('ne',lo('who'),integer(0))()){
    for(const [key,column] of [['txppn',K.KPPN],['txnm1',K.KNAM1],['txnm2',K.KNAM2]] as const)yield*write(l[key],value(()=>high.read('job',low.read('who'),column)));
    yield*write(l.txsh1,value(()=>high.read('names',low.read('who'),1)));yield*write(l.txsh2,value(()=>high.read('names',low.read('who'),2)));
    yield*write(l.whowon,integer(1));if(yield*cmp('lt',h('nbase',1),h('nbase',2))())yield*write(l.whowon,integer(2));
    yield*write(l.txwhy,integer(1));if(yield*cmp('ne',lo('team'),local('whowon'))())yield*write(l.txwhy,integer(0));
    if(yield*cmp('eq',h('endflg'),integer(-2))())yield*write(l.txwhy,integer(0));
    yield*write(l.txtim,{type:'integer',evaluate:()=>io.etim(()=>high.address('job',low.read('who'),K.KJOBTM))});
    yield*write(l.txtem,{type:'integer',evaluate:()=>io.binary('sub',lo('team'),integer(1))});
    yield*io.points(true);yield*write(l.txtot,value(()=>m.read(total)));
    if(currentVariant().definition.id!=='austin')yield*io.updsta([l.txppn,l.txnm1,l.txnm2,l.txsh1,l.txsh2,l.txtot,l.txtim,l.txwhy,l.txtem,low.address('who')]);
    yield*io.free(low.address('who'));yield*write(low.address('who'),integer(0));
  }
  yield*io.exit();
}
