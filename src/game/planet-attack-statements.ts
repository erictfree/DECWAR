import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { BasePhaserServices,BasePhaserExpression } from './base-phaser-statements.ts';

export type PlanetPredicate<W>=()=>Generator<W,boolean,void>;
export type PlanetAttackServices<W>=Pick<BasePhaserServices<W>,
  'logical'|'integer'|'assign'|'bounds'|'enterLoop'|'disp'|'pdist'|'pharom'|'pridis'|'makhit'>&{
  and(left:PlanetPredicate<W>,right:PlanetPredicate<W>):Generator<W,boolean,void>;
  or(left:PlanetPredicate<W>,right:PlanetPredicate<W>):Generator<W,boolean,void>;
  iran(max:2):Generator<W,bigint,void>;
  dispc(v:bigint,h:bigint):Generator<W,bigint,void>;
  ldis(v:bigint,h:bigint,otherV:bigint,otherH:bigint,range:2):Generator<W,bigint,void>;
  phadam(kind:2,targetAddress:bigint,distanceAddress:bigint,powerAddress:bigint,ship:false):Generator<W,void,void>;
};
export type PlanetAttackLocals={k:bigint;pcode:bigint;pteam:bigint;j:bigint;jtype:bigint;phit:bigint;id:bigint};
// PLNATK.FOR:34-93. Source statements over actual COMMON/compiler words.
// Compound conditions retain required compiler evaluation policy, including
// whether/when the IRAN call is evaluated. No implicit host short-circuit rule.
export function* planetAttackStatements<W>(high:CommonBlock,low:CommonBlock,locals:PlanetAttackLocals,io:PlanetAttackServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):BasePhaserExpression<W>=>function*(){return read();};
  const literal=(n:bigint)=>value(()=>n),local=(a:bigint)=>value(()=>m.read(a));
  const predicate=(read:()=>boolean):PlanetPredicate<W>=>function*(){return read();};
  const binary=(op:Parameters<PlanetAttackServices<W>['integer']>[0],l:BasePhaserExpression<W>,r:BasePhaserExpression<W>):BasePhaserExpression<W>=>()=>io.integer(op,l,r);
  const planet=(column:number)=>high.address('locpln',m.read(locals.k),column);
  const ship=(column:number)=>high.address('shpcon',m.read(locals.j),column);
  const owned=predicate(()=>m.read(locals.pcode)!==BigInt(K.DXNPLN));
  const score=(category:number)=>high.address('tmscor',m.read(locals.pteam),category);
  const addScore=(category:number,amount:BasePhaserExpression<W>)=>io.assign(()=>score(category),binary('add',value(()=>m.read(score(category))),amount));
  const advance=(a:bigint)=>m.write(a,add36(m.read(a),1n));
  const power=()=>binary('add',literal(50n),binary('mul',literal(30n),value(()=>m.read(planet(3)))));
  const distance=()=>io.assign(()=>locals.id,()=>io.pdist(low.address('vfrom'),low.address('hfrom'),low.address('vto'),low.address('hto')));
  if(high.read('nplnet')<=0n)return;
  const planets=yield*io.bounds(literal(1n),value(()=>high.read('nplnet')));m.write(locals.k,planets.start);
  if(!io.enterLoop(planets.start,planets.limit))return;
  do{
    yield*io.assign(()=>locals.pcode,()=>io.dispc(planet(K.KVPOS),planet(K.KHPOS)));
    yield*io.assign(()=>locals.pteam,binary('sub',local(locals.pcode),literal(BigInt(K.DXNPLN))));
    if(yield*io.and(predicate(()=>m.read(locals.pcode)===BigInt(K.DXNPLN)),function*(){return (yield*io.iran(2))===1n;})){advance(locals.k);continue;}
    if(yield*io.and(predicate(()=>io.logical(low.read('player'))),predicate(()=>m.read(locals.pteam)===low.read('team')))){advance(locals.k);continue;}
    for(m.write(locals.j,1n);m.read(locals.j)<=BigInt(K.KNPLAY);advance(locals.j)){
      m.write(locals.jtype,BigInt(K.DXFPLN));if(m.read(locals.j)>BigInt(K.KNPLAY/2))m.write(locals.jtype,BigInt(K.DXEPLN));
      if(yield*io.or(predicate(()=>m.read(locals.pcode)===m.read(locals.jtype)),predicate(()=>!io.logical(high.read('alive',m.read(locals.j))))))continue;
      if((yield*io.disp(ship(K.KVPOS),ship(K.KHPOS)))<=0n)continue;
      if(!io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),planet(K.KVPOS),planet(K.KHPOS),2)))continue;
      yield*io.assign(()=>low.address('dispfr'),()=>io.disp(planet(K.KVPOS),planet(K.KHPOS)));
      yield*io.assign(()=>low.address('dispto'),()=>io.disp(ship(K.KVPOS),ship(K.KHPOS)));
      low.write('shstfr',m.read(planet(3)));
      low.write('vfrom',m.read(planet(K.KVPOS)));low.write('hfrom',m.read(planet(K.KHPOS)));
      low.write('vto',m.read(ship(K.KVPOS)));low.write('hto',m.read(ship(K.KHPOS)));low.write('shjump',0n);
      low.write('iwhat',1n);yield*io.assign(()=>locals.phit,binary('div',power(),value(()=>high.read('numply'))));
      yield*distance();yield*io.phadam(2,locals.j,locals.id,locals.phit,false);
      if(yield*owned())yield*addScore(K.KPEDAM,value(()=>low.read('ihita')));
      if(yield*io.and(predicate(()=>low.read('klflg')!==0n),owned))yield*addScore(K.KPEKIL,literal(5000n));
      yield*io.pridis(ship(K.KVPOS),ship(K.KHPOS),K.KRANGE,locals.pteam,0);
      yield*io.pridis(ship(K.KVPOS),ship(K.KHPOS),4,null,1);yield*io.makhit();
    }
    if(!io.logical(high.read('rom'))){advance(locals.k);continue;}
    if(!io.logical(yield*io.ldis(high.address('locr',K.KVPOS),high.address('locr',K.KHPOS),planet(K.KVPOS),planet(K.KHPOS),2))){advance(locals.k);continue;}
    yield*io.assign(()=>low.address('dispfr'),()=>io.disp(planet(K.KVPOS),planet(K.KHPOS)));
    low.write('dispto',BigInt(K.DXROM*100));low.write('iwhat',1n);low.write('shstfr',m.read(planet(3)));
    low.write('vfrom',m.read(planet(K.KVPOS)));low.write('hfrom',m.read(planet(K.KHPOS)));
    low.write('vto',high.read('locr',K.KVPOS));low.write('hto',high.read('locr',K.KHPOS));low.write('shjump',0n);
    yield*io.pridis(high.address('locr',K.KVPOS),high.address('locr',K.KHPOS),K.KRANGE,locals.pteam,0);
    yield*io.pridis(high.address('locr',K.KVPOS),high.address('locr',K.KHPOS),4,null,1);
    yield*distance();yield*io.pharom(power(),locals.id);low.write('shstto',high.read('erom'));low.write('shcnto',1n);
    if(yield*owned())yield*addScore(K.KPRKIL,value(()=>low.read('ihita')));
    if(yield*io.and(predicate(()=>!io.logical(high.read('rom'))),owned))yield*addScore(K.KPRKIL,literal(5000n));
    yield*io.makhit();advance(locals.k);
  }while(m.read(locals.k)<=planets.limit);
}
