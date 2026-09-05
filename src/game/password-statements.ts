import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import { constants as K } from '../generated/source-data.ts';

export type PasswordStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'and'|'compare'|'assign'>&{
  equal(token:bigint,password:'KPASS',one:1):Generator<W,bigint,void>;
  usrprj(zero:0):Generator<W,bigint,void>;
  out(message:'unkcom'|'forhlp',lines:0|1):Generator<W,void,void>;
};
// PASWRD.FOR:24-42. PASFLG is explicitly INTEGER (LOWSEG.FOR:56).
// The four function occurrences are separate evaluable expressions: compiler
// AND/evaluation policy may not be replaced by a cached host project value.
export function* passwordStatements<W>(low:CommonBlock,io:PasswordStatementServices<W>):Generator<W,void,void>{
  const value=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}});
  const integer=(n:bigint)=>value(()=>n),flag=value(()=>low.read('pasflg'));
  const assign=(expression:WeaponExpression<W>)=>io.assign(()=>low.address('pasflg'),'integer',expression);
  yield*assign({type:'integer',evaluate:()=>io.equal(low.address('tknlst',2),'KPASS',1)});
  if(yield*io.compare('eq',flag,integer(-1n)))yield*assign(integer(0n));
  if(yield*io.and(...[0o70000n,0o337n,0o70006n,0o70725n].map(project=>
    ()=>io.compare('ne',{type:'integer',evaluate:()=>io.usrprj(0)},integer(project)))))yield*assign(integer(0n));
  if(io.logical(low.read('pasflg')))return;
  yield*io.out('unkcom',0);
  if(yield*io.compare('ne',value(()=>low.read('oflg')),integer(BigInt(K.SHORT))))yield*io.out('forhlp',1);
}
