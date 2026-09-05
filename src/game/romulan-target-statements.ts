import type { CommonBlock,WordBlock,WordMemory } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
export type TargetExpression<W>=()=>Generator<W,bigint,void>;
type Predicate<W>=()=>Generator<W,boolean,void>;
export type TargetCompiler<W>={
  integer(op:'add'|'sub'|'mul'|'div'|'min'|'max',a:TargetExpression<W>,b:TargetExpression<W>):Generator<W,bigint,void>;
  compare(op:'lt'|'eq'|'ge',a:TargetExpression<W>,b:TargetExpression<W>):Generator<W,boolean,void>;
  assign(address:()=>bigint,value:TargetExpression<W>):Generator<W,void,void>;
  bounds(start:TargetExpression<W>,limit:TargetExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
};
export type DistanceStatementLocals=Record<'rv'|'rh'|'j'|'k'|'ztem',bigint>;
export type DistanceStatementServices<W>=TargetCompiler<W>&{
  logical(word:bigint):boolean;
  and(a:Predicate<W>,b:Predicate<W>):Generator<W,boolean,void>;
  or(a:Predicate<W>,b:Predicate<W>):Generator<W,boolean,void>;
  blkset(start:bigint,value:number,count:4):Generator<W,void,void>;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;
  pdist(v:bigint,h:bigint,rv:bigint,rh:bigint):Generator<W,bigint,void>;
  iran(max:2):Generator<W,bigint,void>;
};
export type StarStatementLocals=Record<'ivf'|'ivl'|'ihf'|'ihl'|'i'|'j',bigint>;
export type StarStatementServices<W>=TargetCompiler<W>&{dispc(v:bigint,h:bigint):Generator<W,bigint,void>};
function expressions<W>(m:WordMemory,io:TargetCompiler<W>){
  const value=(f:()=>bigint):TargetExpression<W>=>function*(){return f();};
  const word=(a:()=>bigint)=>value(()=>m.read(a())),n=(v:number)=>value(()=>BigInt(v));
  const op=(kind:Parameters<TargetCompiler<W>['integer']>[0],a:TargetExpression<W>,b:TargetExpression<W>):TargetExpression<W>=>()=>io.integer(kind,a,b);
  return {value,word,n,op};
}
// DIST.FOR:24-86. DISTLC is physical V/H/IV/Z storage, not an isolated
// candidate array. Only BLKSET clears Z; all other words retain prior values.
// Caller aliases, expressions and compound conditions remain live. DO bounds
// and entry are compiler services; advancement is ordinary 36-bit integer DO.
export function* romulanDistanceStatements<W>(high:CommonBlock,dist:WordBlock,args:{ip:bigint;np:bigint;num:bigint},l:DistanceStatementLocals,io:DistanceStatementServices<W>):Generator<W,void,void>{
  const m=high.memory,{word,n,op}=expressions(m,io),local=(key:keyof DistanceStatementLocals)=>word(()=>l[key]);
  const z=(index:()=>bigint)=>word(()=>dist.address('z',index())),ship=(column:number)=>()=>high.address('shpcon',m.read(l.j),column),base=(column:number)=>()=>high.address('base',m.read(l.j),column,m.read(l.k));
  const cmp=(kind:Parameters<typeof io.compare>[0],a:TargetExpression<W>,b:TargetExpression<W>)=>()=>io.compare(kind,a,b);
  function* loop(index:bigint,start:TargetExpression<W>,limit:TargetExpression<W>,body:()=>Generator<W,void,void>):Generator<W,void,void>{
    const bounds=yield*io.bounds(start,limit);m.write(index,bounds.start);if(!io.enterLoop(bounds.start,bounds.limit))return;
    do{yield*body();m.write(index,add36(m.read(index),1n));}while(m.read(index)<=bounds.limit);
  }
  function* candidate(kind:()=>bigint,at:(column:number)=>()=>bigint):Generator<W,void,void>{
    const dv=()=>op('sub',local('rv'),word(at(K.KVPOS))),dh=()=>op('sub',local('rh'),word(at(K.KHPOS)));
    yield*io.assign(()=>l.ztem,op('add',op('mul',dv(),dv()),op('mul',dh(),dh())));
    if(yield*io.compare('ge',local('ztem'),z(kind)))return;
    yield*io.assign(()=>dist.address('iv',kind()),local('j'));yield*io.assign(()=>dist.address('z',kind()),local('ztem'));
    yield*io.assign(()=>dist.address('v',kind()),word(at(K.KVPOS)));yield*io.assign(()=>dist.address('h',kind()),word(at(K.KHPOS)));
  }
  yield*io.blkset(dist.address('z',1),K.KGALV*K.KGALH+1,4);
  yield*io.assign(()=>l.rv,word(()=>high.address('locr',K.KVPOS)));yield*io.assign(()=>l.rh,word(()=>high.address('locr',K.KHPOS)));
  yield*loop(l.j,n(1),op('div',n(K.KNPLAY),n(2)),function*(){
    if(!io.logical(high.read('alive',m.read(l.j))))return;
    if((yield*io.disp(ship(K.KVPOS)(),ship(K.KHPOS)()))<=0n)return;
    yield*candidate(()=>1n,ship);
  });
  yield*loop(l.j,op('add',op('div',n(K.KNPLAY),n(2)),n(1)),n(K.KNPLAY),function*(){
    if(m.read(ship(K.KVPOS)())===0n)return;
    if((yield*io.disp(ship(K.KVPOS)(),ship(K.KHPOS)()))<=0n)return;
    yield*candidate(()=>2n,ship);
  });
  yield*loop(l.k,n(1),n(2),function*(){
    if(high.read('nbase',m.read(l.k))<=0n)return;
    yield*loop(l.j,n(1),n(K.KNBASE),function*(){
      if(m.read(base(3)())<=0n)return;
      if((yield*io.disp(base(K.KVPOS)(),base(K.KHPOS)()))===0n)return;
      yield*candidate(()=>add36(2n,m.read(l.k)),base);
    });
  });
  yield*io.assign(()=>args.np,n(1));
  const np=()=>m.read(args.np),iran=cmp('eq',()=>io.iran(2),n(1));
  // First equality is Z(1)==Z(2), subsequent equalities are Z(class)==Z(NP).
  if(yield*io.or(cmp('lt',z(()=>2n),z(()=>1n)),()=>io.and(cmp('eq',z(()=>1n),z(()=>2n)),iran)))yield*io.assign(()=>args.np,n(2));
  for(const kind of [3,4])if(yield*io.or(cmp('lt',z(()=>BigInt(kind)),z(np)),()=>io.and(cmp('eq',z(()=>BigInt(kind)),z(np)),iran)))yield*io.assign(()=>args.np,n(kind));
  yield*io.assign(()=>args.ip,word(()=>dist.address('iv',np())));
  yield*io.assign(()=>args.num,()=>io.pdist(dist.address('v',np()),dist.address('h',np()),l.rv,l.rh));
}
// ROMSTR.FOR:24-39. Captures four bounds in source order, then scans including
// the target cell. IV and IH writes are separate; actual aliases see both.
export function* romulanStarStatements<W>(m:WordMemory,args:{iv:bigint;ih:bigint},l:StarStatementLocals,io:StarStatementServices<W>):Generator<W,void,void>{
  const {word,n,op}=expressions(m,io),local=(key:keyof StarStatementLocals)=>word(()=>l[key]),iv=word(()=>args.iv),ih=word(()=>args.ih);
  yield*io.assign(()=>l.ivf,op('max',op('sub',iv,n(1)),n(1)));yield*io.assign(()=>l.ivl,op('min',op('add',iv,n(1)),n(K.KGALV)));
  yield*io.assign(()=>l.ihf,op('max',op('sub',ih,n(1)),n(1)));yield*io.assign(()=>l.ihl,op('min',op('add',ih,n(1)),n(K.KGALH)));
  const rows=yield*io.bounds(local('ivf'),local('ivl'));m.write(l.i,rows.start);if(!io.enterLoop(rows.start,rows.limit))return;
  do{
    const columns=yield*io.bounds(local('ihf'),local('ihl'));m.write(l.j,columns.start);
    if(io.enterLoop(columns.start,columns.limit))do{
      if((yield*io.dispc(l.i,l.j))===BigInt(K.DXSTAR)){yield*io.assign(()=>args.iv,local('i'));yield*io.assign(()=>args.ih,local('j'));return;}
      m.write(l.j,add36(m.read(l.j),1n));
    }while(m.read(l.j)<=columns.limit);
    m.write(l.i,add36(m.read(l.i),1n));
  }while(m.read(l.i)<=rows.limit);
}
