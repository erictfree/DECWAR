import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';

export type BasePhaserExpression<W>=()=>Generator<W,bigint,void>;
export type BasePhaserServices<W>={
  logical(word:bigint):boolean;
  integer(op:'add'|'sub'|'mul'|'div'|'or',left:BasePhaserExpression<W>,right:BasePhaserExpression<W>):Generator<W,bigint,void>;
  assign(destination:()=>bigint,value:BasePhaserExpression<W>):Generator<W,void,void>;
  bounds(start:BasePhaserExpression<W>,limit:BasePhaserExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;
  ldis(v:bigint,h:bigint,otherV:bigint,otherH:bigint,range:4):Generator<W,bigint,void>;
  pdist(v:bigint,h:bigint,otherV:bigint,otherH:bigint):Generator<W,bigint,void>;
  // Required compiler call binding: expression evaluation order, temporary
  // storage and literal encoding are not supplied by this statement driver.
  phadam(kind:BasePhaserExpression<W>,targetAddress:bigint,distanceAddress:bigint,power:BasePhaserExpression<W>,ship:false):Generator<W,void,void>;
  pharom(power:BasePhaserExpression<W>,distanceAddress:bigint):Generator<W,void,void>;
  // null means the source literal zero; otherwise this is a live flag argument.
  pridis(v:bigint,h:bigint,range:number,flagAddress:bigint|null,zero:0|1):Generator<W,void,void>;
  makhit():Generator<W,void,void>;
};
export type BasePhaserLocals={jb:bigint;je:bigint;i:bigint;j:bigint;k:bigint;id:bigint};
// BASPHA.FOR:33-87. Actual compiler-local and COMMON words; ordinary DO
// advancement. Exceptional DO-control mutation and full CPU/call frames remain
// separate compiler work. No host floating arithmetic or random draws here.
export function* basePhaserStatements<W>(high:CommonBlock,low:CommonBlock,locals:BasePhaserLocals,io:BasePhaserServices<W>):Generator<W,void,void>{
  const m=low.memory,read=(f:()=>bigint):BasePhaserExpression<W>=>function*(){return f();};
  const literal=(n:bigint)=>read(()=>n),local=(a:bigint)=>read(()=>m.read(a));
  const binary=(op:Parameters<BasePhaserServices<W>['integer']>[0],l:BasePhaserExpression<W>,r:BasePhaserExpression<W>):BasePhaserExpression<W>=>()=>io.integer(op,l,r);
  const base=(field:number)=>high.address('base',m.read(locals.j),field,m.read(locals.i));
  const ship=(field:number)=>high.address('shpcon',m.read(locals.k),field);
  const score=(category:number)=>high.address('tmscor',m.read(locals.i),category);
  const addScore=(category:number,amount:BasePhaserExpression<W>)=>io.assign(()=>score(category),binary('add',read(()=>m.read(score(category))),amount));
  const advance=(a:bigint)=>m.write(a,add36(m.read(a),1n));
  const fromCode=()=>io.assign(()=>low.address('dispfr'),binary('add',binary('mul',binary('add',literal(BigInt(K.DXFBAS)),binary('sub',local(locals.i),literal(1n))),literal(100n)),local(locals.j)));
  const distance=()=>io.assign(()=>locals.id,()=>io.pdist(low.address('vfrom'),low.address('hfrom'),low.address('vto'),low.address('hto')));
  const power=()=>binary('div',literal(200n),read(()=>high.read('numply')));
  m.write(locals.jb,1n);m.write(locals.je,2n);
  if(io.logical(low.read('player'))){
    yield*io.assign(()=>locals.jb,binary('sub',literal(3n),read(()=>low.read('team'))));m.write(locals.je,m.read(locals.jb));
  }
  const teams=yield*io.bounds(local(locals.jb),local(locals.je));m.write(locals.i,teams.start);
  if(!io.enterLoop(teams.start,teams.limit))return;
  do{
    if(high.read('nbase',m.read(locals.i))>0n){
      for(m.write(locals.j,1n);m.read(locals.j)<=BigInt(K.KNBASE);advance(locals.j)){
        if(m.read(base(3))<=0n)continue;
        const half=literal(BigInt(K.KNPLAY/2));
        const players=yield*io.bounds(binary('add',binary('mul',half,binary('sub',literal(2n),local(locals.i))),literal(1n)),binary('mul',half,binary('sub',literal(3n),local(locals.i))));
        m.write(locals.k,players.start);
        if(io.enterLoop(players.start,players.limit))do{
          if(io.logical(high.read('alive',m.read(locals.k)))&&
            (yield*io.disp(ship(K.KVPOS),ship(K.KHPOS)))>0n&&
            io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),base(K.KVPOS),base(K.KHPOS),4))){
            low.write('vfrom',m.read(base(K.KVPOS)));low.write('hfrom',m.read(base(K.KHPOS)));
            low.write('vto',m.read(ship(K.KVPOS)));low.write('hto',m.read(ship(K.KHPOS)));
            yield*io.assign(()=>low.address('dispto'),binary('add',binary('mul',binary('add',literal(BigInt(K.DXFSHP)),binary('sub',literal(2n),local(locals.i))),literal(100n)),local(locals.k)));
            low.write('iwhat',1n);yield*fromCode();low.write('shjump',0n);yield*distance();
            yield*io.phadam(binary('sub',literal(3n),local(locals.i)),locals.k,locals.id,power(),false);
            yield*addScore(K.KPEDAM,read(()=>low.read('ihita')));
            low.write('shstfr',m.read(base(3)));low.write('shcnfr',1n);
            if(low.read('klflg')!==0n)yield*addScore(K.KPEKIL,literal(5000n));
            yield*io.pridis(ship(K.KVPOS),ship(K.KHPOS),K.KRANGE,low.address('team'),0);
            yield*io.pridis(ship(K.KVPOS),ship(K.KHPOS),4,null,1);
            yield*io.assign(()=>low.address('dbits'),binary('or',read(()=>low.read('dbits')),read(()=>high.read('bits',m.read(locals.k)))));
            yield*io.makhit();
          }
          advance(locals.k);
        }while(m.read(locals.k)<=players.limit);
        if(!io.logical(high.read('rom')))continue;
        if(!io.logical(yield*io.ldis(high.address('locr',K.KVPOS),high.address('locr',K.KHPOS),base(K.KVPOS),base(K.KHPOS),4)))continue;
        low.write('dispto',BigInt(K.DXROM*100));low.write('shjump',0n);yield*fromCode();low.write('iwhat',1n);
        low.write('vfrom',m.read(base(K.KVPOS)));low.write('hfrom',m.read(base(K.KHPOS)));
        low.write('vto',high.read('locr',K.KVPOS));low.write('hto',high.read('locr',K.KHPOS));
        yield*distance();yield*io.pharom(power(),locals.id);
        low.write('shstfr',m.read(base(3)));low.write('shcnfr',1n);low.write('shstto',high.read('erom'));low.write('shcnto',1n);
        yield*io.pridis(high.address('locr',K.KVPOS),high.address('locr',K.KHPOS),K.KRANGE,null,0);
        yield*addScore(K.KPRKIL,read(()=>low.read('ihita')));
        if(!io.logical(high.read('rom')))yield*addScore(K.KPRKIL,literal(5000n));
        yield*io.makhit();
      }
    }
    advance(locals.i);
  }while(m.read(locals.i)<=teams.limit);
}
