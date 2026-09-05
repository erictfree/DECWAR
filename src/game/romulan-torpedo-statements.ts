import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { WeaponExpression as Expr,WeaponStatementServices as Numeric } from './weapon-damage-statements.ts';
export type RomulanTorpedoStatementLocals=Record<'misfir'|'tpaus'|'id'|'idis'|'aran'|'nplc'|'j'|'iob'|'num99'|'iv2'|'ih2'|'i'|'pteam'|'d'|'idum',bigint>;
export type RomulanTorpedoStatementServices<W>=Pick<Numeric<W>,'binary'|'convert'|'compare'|'assign'|'logical'|'and'|'or'|'ran'|'realLiteral'>&{
  mod(left:Expr<W>,right:Expr<W>):Generator<W,bigint,void>;
  mask(left:Expr<W>,excluded:Expr<W>):Generator<W,bigint,void>;
  bounds(start:Expr<W>,limit:Expr<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  iran(max:100):Generator<W,bigint,void>;
  check(v:bigint,h:bigint,dv:bigint,dh:bigint,range:bigint,deflection:bigint):Generator<W,void,void>;
  pridis(v:bigint|30,h:bigint|30,range:number,flag:Expr<W>,zero:0):Generator<W,void,void>;
  makhit():Generator<W,void,void>;snova():Generator<W,void,void>;
  tordam(kind:bigint,index:bigint,distance:bigint,size:bigint,ship:true):Generator<W,void,void>;
  trcoff(index:bigint):Generator<W,void,void>;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;setdsp(v:bigint,h:bigint,zero:0):Generator<W,void,void>;
  dist(index:bigint,kind:bigint,distance:bigint):Generator<W,void,void>;romstr(v:bigint,h:bigint):Generator<W,void,void>;
  lockPlanet(caller:'ROMTOR'):Generator<W,void,void>;unlockPlanet():Generator<W,void,void>;
  plnrmv(index:bigint,team:bigint):Generator<W,void,void>;etim(start:bigint):Generator<W,bigint,void>;
};
// ROMTOR.FOR:25-139. Actual locals, IV1/IH1 and CHKOUT words. REAL words
// remain opaque compiler values; no native floating fallback. ROMTOR IVC/IHC
// are CHECK H2/V2. Caller direction actuals can alias CHECK H1/V1.
export function* romulanTorpedoStatements<W>(high:CommonBlock,low:CommonBlock,path:WordBlock,args:{iv1:bigint;ih1:bigint},l:RomulanTorpedoStatementLocals,io:RomulanTorpedoStatementServices<W>):Generator<W,void,void>{
  const m=high.memory,value=(read:()=>bigint,type:'integer'|'real'='integer'):Expr<W>=>({type,evaluate:function*(){return read();}}),word=(a:()=>bigint,type:'integer'|'real'='integer')=>value(()=>m.read(a()),type);
  const n=(w:number)=>value(()=>BigInt(w)),real=(s:string)=>value(()=>io.realLiteral(s),'real'),local=(key:keyof RomulanTorpedoStatementLocals)=>word(()=>l[key],key==='d'?'real':'integer');
  const call=(evaluate:()=>Generator<W,bigint,void>,type:'integer'|'real'='integer'):Expr<W>=>({type,evaluate});
  const op=(kind:Parameters<typeof io.binary>[0],a:Expr<W>,b:Expr<W>):Expr<W>=>call(()=>io.binary(kind,a,b),a.type==='real'||b.type==='real'?'real':'integer');
  const cmp=(kind:Parameters<typeof io.compare>[0],a:Expr<W>,b:Expr<W>)=>()=>io.compare(kind,a,b);
  const set=(a:()=>bigint,e:Expr<W>,type:'integer'|'real'='integer')=>io.assign(a,type,e),sl=(key:keyof RomulanTorpedoStatementLocals,e:Expr<W>)=>set(()=>l[key],e,key==='d'?'real':'integer'),sw=(key:string,e:Expr<W>)=>set(()=>low.address(key),e);
  const hi=(key:string)=>word(()=>high.address(key)),lo=(key:string)=>word(()=>low.address(key)),code=()=>path.address('dcode'),hitV=()=>path.address('h2'),hitH=()=>path.address('v2'),rv=()=>high.address('locr',K.KVPOS),rh=()=>high.address('locr',K.KHPOS);
  const base=(field:number)=>high.address('base',m.read(l.j),field,add36(m.read(l.nplc),-2n)),planet=()=>high.address('locpln',m.read(l.i),3);
  const ran=()=>call(()=>io.ran(0),'real'),nearby=()=>io.pridis(hitV(),hitH(),K.KRANGE,n(0),0);
  function* announce(){yield*io.pridis(30,30,100,op('sub',local('nplc'),n(2)),0);yield*sw('dbits',call(()=>io.mask(lo('dbits'),hi('nomsg'))));}
  const score=(category:number,amount:number)=>set(()=>high.address('rsr',category),op('sub',word(()=>high.address('rsr',category)),n(amount)));
  function* finish(){yield*set(()=>high.address('rtpaus'),op('add',call(()=>io.etim(high.address('tim0'))),local('tpaus')));}
  yield*sl('misfir',n(0));yield*sl('tpaus',n(0));
  const shots=yield*io.bounds(n(1),n(3));m.write(l.id,shots.start);
  if(io.enterLoop(shots.start,shots.limit))do{
    yield*sl('d',op('div',op('sub',ran(),real('0.5')),real('2.5')));
    if(m.read(l.misfir)<0n){yield*finish();return;}
    if((yield*io.iran(100))>96n)yield*sl('misfir',n(-1));
    if(m.read(l.misfir)<0n)yield*sl('d',op('add',local('d'),op('div',op('sub',ran(),real('0.5')),real('5.0'))));
    const rangeNoise=op('add',op('mul',op('sub',ran(),real('0.5')),real('4.0')),real('0.5'));
    yield*sl('idis',op('add',op('sub',n(K.KRANGE),n(2)),call(()=>io.convert('integer','int',rangeNoise))));
    yield*sl('tpaus',op('add',local('tpaus'),op('mul',op('add',hi('slwest'),n(1)),n(1000))));
    yield*io.check(rv(),rh(),args.iv1,args.ih1,l.idis,l.d);
    if(m.read(code())!==0n){
      yield*sl('aran',call(()=>io.iran(100)));
      if(m.read(code())===BigInt(K.DXSTAR*100)){
        if(m.read(l.aran)<=80n){
          yield*sw('iwhat',n(7));yield*sw('dispfr',n(K.DXSTAR*100));yield*sw('vfrom',word(hitV));yield*sw('hfrom',word(hitH));yield*nearby();yield*io.makhit();yield*score(K.KNSDES,500);yield*io.snova();
          if(!io.logical(high.read('rom')))return;
        }
      }else{
        yield*sl('nplc',op('div',word(code),n(100)));yield*sl('j',call(()=>io.mod(word(code),n(100))));
        if(yield*io.and(cmp('ge',local('nplc'),n(K.DXNPLN)),cmp('le',local('nplc'),n(K.DXEPLN)))){
          yield*sw('dispto',word(code));yield*sw('iwhat',n(2));yield*sw('dispfr',n(K.DXROM*100));yield*sw('vfrom',word(rv));yield*sw('hfrom',word(rh));yield*sw('vto',word(hitV));yield*sw('hto',word(hitH));yield*sw('shjump',n(0));yield*sw('shstfr',hi('erom'));yield*sw('shcnfr',n(1));
          yield*io.lockPlanet('ROMTOR');
          if(io.logical(low.read('lkfail'))){m.write(l.id,add36(m.read(l.id),1n));continue;}
          yield*sl('i',call(()=>io.mod(word(code),n(100))));
          if(m.read(l.aran)>=75n)yield*set(planet,op('sub',word(planet),n(1)));
          yield*sw('shstto',op('max',word(planet),n(0)));if(m.read(planet())<0n)yield*sw('klflg',n(2));
          if(low.read('klflg')!==0n){
            yield*sl('pteam',op('sub',op('div',word(code),n(100)),n(K.DXNPLN)));yield*io.setdsp(hitV(),hitH(),0);yield*score(K.KNPDES,1000);yield*io.plnrmv(l.i,l.pteam);
          }
          yield*io.unlockPlanet();yield*nearby();yield*io.makhit();
        }else if(m.read(l.nplc)!==BigInt(K.DXBHOL)){
          if(m.read(l.nplc)>=BigInt(K.DXFBAS)&&m.read(base(3))===1000n){
            yield*sw('iwhat',n(9));yield*sw('dispto',word(code));yield*sw('vto',word(()=>base(K.KVPOS)));yield*sw('hto',word(()=>base(K.KHPOS)));yield*announce();yield*io.makhit();
          }
          yield*sw('vto',word(hitV));yield*sw('hto',word(hitH));yield*io.tordam(l.nplc,l.j,l.idum,l.idum,true);
          yield*sw('vfrom',word(rv));yield*sw('hfrom',word(rh));yield*sw('shstfr',hi('erom'));yield*sw('shcnfr',n(1));yield*sw('dispto',word(code));yield*sw('dispfr',n(K.DXROM*100));yield*sw('iwhat',n(2));yield*nearby();yield*io.makhit();
          if(yield*io.and(cmp('lt',local('nplc'),n(K.DXFBAS)),cmp('ne',word(()=>high.address('trstat',m.read(l.j))),n(0))))yield*io.trcoff(l.j);
          if(!(yield*io.or(cmp('lt',local('nplc'),n(K.DXFBAS)),cmp('ne',call(()=>io.disp(hitV(),hitH())),n(0))))){
            yield*sw('dispto',word(code));yield*sw('iwhat',n(10));yield*announce();yield*sw('vto',word(hitV));yield*sw('hto',word(hitH));yield*io.makhit();
          }
        }
      }
      yield*io.dist(l.iob,l.nplc,l.num99);if(m.read(l.num99)>BigInt(K.KRANGE)){yield*finish();return;}
      const ship=m.read(l.nplc)<BigInt(K.DXFBAS),target=(field:number)=>ship?high.address('shpcon',m.read(l.iob),field):high.address('base',m.read(l.iob),field,add36(m.read(l.nplc),-2n));
      yield*sl('iv2',word(()=>target(K.KVPOS)));yield*sl('ih2',word(()=>target(K.KHPOS)));yield*io.romstr(l.iv2,l.ih2);
      yield*set(()=>args.iv1,op('sub',local('iv2'),word(rv)));yield*set(()=>args.ih1,op('sub',local('ih2'),word(rh)));
    }
    m.write(l.id,add36(m.read(l.id),1n));
  }while(m.read(l.id)<=shots.limit);
  yield*finish();
}
