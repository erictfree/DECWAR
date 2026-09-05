import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import type { JumpStatementServices } from './jump-statements.ts';
export type BaseKilledStatementLocals={ib:bigint;ie:bigint;i:bigint;j:bigint};
export type BaseKilledStatementServices<W>=Pick<WeaponStatementServices<W>,'binary'|'assign'|'logical'|'compare'>&Pick<JumpStatementServices<W>,'assignFalse'|'dispc'>&{
  bounds(start:WeaponExpression<W>,limit:WeaponExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  ldis(v:bigint,h:bigint,pv:bigint,ph:bigint,limit:1):Generator<W,bigint,void>;
};
// BASKIL.FOR:27-64. No ALIVE filter, and NUMCAP<=0 skips undocking even
// with no remaining adjacent base. DO bounds/entry are compiler policies;
// advancement models ordinary integer DO, not complete compiler instructions.
export function* baseKilledStatements<W>(high:CommonBlock,low:CommonBlock,itype:bigint,locals:BaseKilledStatementLocals,io:BaseKilledStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}});
  const literal=(n:bigint|number)=>value(()=>BigInt(n)),local=(a:bigint)=>value(()=>m.read(a));
  const binary=(op:'add'|'div',l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.binary(op,l,r)});
  const set=(a:()=>bigint,v:WeaponExpression<W>)=>io.assign(a,'integer',v);
  const ship=(col:number)=>high.address('shpcon',m.read(locals.i),col),base=(col:number)=>high.address('base',m.read(locals.j),col,m.read(itype)),planet=(col:number)=>high.address('locpln',m.read(locals.j),col);
  const advance=(a:bigint)=>m.write(a,add36(m.read(a),1n));
  m.write(locals.ib,1n);m.write(locals.ie,BigInt(K.KNPLAY));
  if(m.read(itype)===1n)yield*set(()=>locals.ie,binary('div',literal(K.KNPLAY),literal(2)));
  if(m.read(itype)===2n)yield*set(()=>locals.ib,binary('add',binary('div',literal(K.KNPLAY),literal(2)),literal(1)));
  const ships=yield*io.bounds(local(locals.ib),local(locals.ie));m.write(locals.i,ships.start);
  if(!io.enterLoop(ships.start,ships.limit))return;
  do{yield*checkShip();advance(locals.i);}while(m.read(locals.i)<=ships.limit);
  function* checkShip():Generator<W,void,void>{
    if(!io.logical(high.read('docked',m.read(locals.i))))return;
    if(high.read('nbase',m.read(itype))>0n){
      for(m.write(locals.j,1n);m.read(locals.j)<=BigInt(K.KNBASE);advance(locals.j)){
        if(m.read(base(3))<=0n)continue;
        if(io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),base(K.KVPOS),base(K.KHPOS),1)))return;
      }
    }
    if(high.read('numcap',m.read(itype))<=0n)return;
    const planets=yield*io.bounds(literal(1),value(()=>high.read('nplnet')));m.write(locals.j,planets.start);
    if(io.enterLoop(planets.start,planets.limit))do{
      if(!(yield*io.compare('ne',binary('add',local(itype),literal(K.DXNPLN)),{type:'integer',evaluate:()=>io.dispc(planet(K.KVPOS),planet(K.KHPOS))}))){
        if(io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),planet(K.KVPOS),planet(K.KHPOS),1)))return;
      }
      advance(locals.j);
    }while(m.read(locals.j)<=planets.limit);
    yield*set(()=>ship(K.KSPCON),literal(K.RED));yield*io.assignFalse(()=>high.address('docked',m.read(locals.i)),'integer');
  }
}
