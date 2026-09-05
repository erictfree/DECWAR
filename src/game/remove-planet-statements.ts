import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { WeaponExpression as Expr,WeaponStatementServices as Numeric } from './weapon-damage-statements.ts';
export type RemovePlanetStatementServices<W>=Pick<Numeric<W>,'binary'|'assign'|'compare'|'or'>&{
  baskil(team:bigint):Generator<W,void,void>;
  blkmov(from:()=>bigint,to:()=>bigint,count:Expr<W>):Generator<W,void,void>;
  bounds(start:Expr<W>,limit:Expr<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;
  setdsp(v:bigint,h:bigint,code:Expr<W>):Generator<W,void,void>;
  endgam():Generator<W,void,void>;
};
// PLNRMV.FOR:25-58. Actual I/PTEAM/J words. Each column copy re-evaluates
// arguments; the old final row remains. No board clear, lock or cleanup is
// introduced. Ordinary DO advancement; compiler bounds/entry remain explicit.
export function* removePlanetStatements<W>(high:CommonBlock,args:{i:bigint;pteam:bigint},l:{j:bigint},io:RemovePlanetStatementServices<W>):Generator<W,void,void>{
  const m=high.memory,value=(read:()=>bigint):Expr<W>=>({type:'integer',evaluate:function*(){return read();}}),n=(v:number)=>value(()=>BigInt(v)),word=(a:()=>bigint)=>value(()=>m.read(a()));
  const i=word(()=>args.i),team=word(()=>args.pteam),count=word(()=>high.address('nplnet')),cmp=(op:Parameters<typeof io.compare>[0],a:Expr<W>,b:Expr<W>)=>()=>io.compare(op,a,b);
  const sub=(a:Expr<W>,b:Expr<W>):Expr<W>=>({type:'integer',evaluate:()=>io.binary('sub',a,b)});
  if(yield*cmp('lt',team,n(0))())return;if(yield*cmp('gt',i,count)())return;if(yield*cmp('le',i,n(0))())return;
  if(!(yield*cmp('le',team,n(0))())&&!(yield*cmp('gt',team,n(2))())){
    const captured=()=>high.address('numcap',m.read(args.pteam));yield*io.assign(captured,'integer',sub(word(captured),n(1)));yield*io.baskil(args.pteam);
  }
  if(!(yield*cmp('eq',i,count)()))for(const column of [K.KVPOS,K.KHPOS,3,4])
    yield*io.blkmov(()=>high.address('locpln',add36(m.read(args.i),1n),column),()=>high.address('locpln',m.read(args.i),column),sub(count,i));
  yield*io.assign(()=>high.address('nplnet'),'integer',sub(count,n(1)));
  if(!(yield*io.or(cmp('le',count,n(0)),cmp('gt',i,count)))){
    const bounds=yield*io.bounds(i,count);m.write(l.j,bounds.start);
    if(io.enterLoop(bounds.start,bounds.limit))do{
      const v=()=>high.address('locpln',m.read(l.j),K.KVPOS),h=()=>high.address('locpln',m.read(l.j),K.KHPOS);
      yield*io.setdsp(v(),h(),sub({type:'integer',evaluate:()=>io.disp(v(),h())},n(1)));
      m.write(l.j,add36(m.read(l.j),1n));
    }while(m.read(l.j)<=bounds.limit);
  }
  yield*io.endgam();
}
