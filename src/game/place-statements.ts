import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export type PlaceExpression<W>=()=>Generator<W,bigint,void>;
export type PlaceStatementArguments={object:bigint;n:bigint;v:bigint;h:bigint};
export type PlaceStatementLocals={k:bigint;i:bigint;pteam:bigint};
export type PlaceStatementServices<W>={
  logical(word:bigint):boolean;
  integer(op:'sub'|'div',left:PlaceExpression<W>,right:PlaceExpression<W>):Generator<W,bigint,void>;
  compare(op:'gt'|'le'|'ne',left:PlaceExpression<W>,right:PlaceExpression<W>):Generator<W,boolean,void>;
  assign(address:()=>bigint,value:PlaceExpression<W>):Generator<W,void,void>;
  or(left:()=>Generator<W,boolean,void>,right:()=>Generator<W,boolean,void>):Generator<W,boolean,void>;
  bounds(start:PlaceExpression<W>,limit:PlaceExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  iran(max:number):Generator<W,bigint,void>;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;
  dispc(v:bigint,h:bigint):Generator<W,bigint,void>;
  ldis(v:bigint,h:bigint,otherV:bigint,otherH:bigint,range:2|4):Generator<W,bigint,void>;
  setdsp(v:bigint,h:bigint,object:bigint):Generator<W,void,void>;
};
// PLACE.FOR:26-59. Four actual arguments and three compiler-local words.
// Rejected coordinates stay written; retries have no source count limit.
// The commented-out object increment is not executed. Compiler evaluation and
// DO bounds/entry are services; advancement models ordinary integer DO.
export function* placeStatements<W>(high:CommonBlock,a:PlaceStatementArguments,l:PlaceStatementLocals,io:PlaceStatementServices<W>):Generator<W,void,void>{
  const m=high.memory,value=(read:()=>bigint):PlaceExpression<W>=>function*(){return read();},n=(w:number)=>value(()=>BigInt(w));
  const word=(address:()=>bigint)=>value(()=>m.read(address())),local=(key:keyof PlaceStatementLocals)=>word(()=>l[key]);
  const op=(kind:'sub'|'div',left:PlaceExpression<W>,right:PlaceExpression<W>):PlaceExpression<W>=>()=>io.integer(kind,left,right);
  const cmp=(kind:'gt'|'le'|'ne',left:PlaceExpression<W>,right:PlaceExpression<W>)=>()=>io.compare(kind,left,right);
  const objectType=()=>op('div',word(()=>a.object),n(100));
  const base=(column:number)=>high.address('base',m.read(l.i),column,m.read(l.pteam)),planet=(column:number)=>high.address('locpln',m.read(l.i),column);
  const objects=yield*io.bounds(n(1),word(()=>a.n));m.write(l.k,objects.start);if(!io.enterLoop(objects.start,objects.limit))return;
  do{
    while(!(yield*attempt())){/* Source GOTO 100 retries within the same K. */}
    m.write(l.k,add36(m.read(l.k),1n));
  }while(m.read(l.k)<=objects.limit);
  function* attempt():Generator<W,boolean,void>{
    yield*io.assign(()=>a.v,()=>io.iran(K.KGALV));yield*io.assign(()=>a.h,()=>io.iran(K.KGALH));
    if(yield*io.compare('ne',()=>io.disp(a.v,a.h),n(0)))return false;
    if(!(yield*io.compare('gt',objectType(),n(K.DXESHP)))){
      yield*io.assign(()=>l.pteam,op('sub',n(3),objectType()));
      if(!(yield*io.compare('le',word(()=>high.address('nbase',m.read(l.pteam))),n(0)))){
        const bases=yield*io.bounds(n(1),n(K.KNBASE));m.write(l.i,bases.start);
        if(io.enterLoop(bases.start,bases.limit))do{
          if(io.logical(yield*io.ldis(a.v,a.h,base(K.KVPOS),base(K.KHPOS),4)))return false;
          m.write(l.i,add36(m.read(l.i),1n));
        }while(m.read(l.i)<=bases.limit);
      }
      if(!(yield*io.or(cmp('le',word(()=>high.address('nplnet')),n(0)),cmp('le',word(()=>high.address('numcap',m.read(l.pteam))),n(0))))){
        const planets=yield*io.bounds(n(1),word(()=>high.address('nplnet')));m.write(l.i,planets.start);
        if(io.enterLoop(planets.start,planets.limit))do{
          if(!(yield*io.compare('ne',local('pteam'),()=>io.dispc(planet(K.KVPOS),planet(K.KHPOS)))))
            if(io.logical(yield*io.ldis(a.v,a.h,planet(K.KVPOS),planet(K.KHPOS),2)))return false;
          m.write(l.i,add36(m.read(l.i),1n));
        }while(m.read(l.i)<=planets.limit);
      }
    }
    yield*io.setdsp(a.v,a.h,a.object);return true;
  }
}
