import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { WeaponExpression as E } from './weapon-damage-statements.ts';
import type { RomulanTorpedoStatementServices as RomIO } from './romulan-torpedo-statements.ts';
import type { CommandReturn } from './maintenance.ts';
export type TorpedoWords=Record<'iflg'|'i'|'tem'|'ntorp'|'id'|'iv'|'ih'|'idis'|'aran'|'nplc'|'j'|'d'|'idum'|'d1'|'d2',bigint>;
export type TorpedoMessage='torp00'|'torp01'|'torp02'|'torp03'|'torp04'|'torp05'|'torp06'|'torp07'|'phacn1'|'error1'|'error2'|'empty';
export type TorpedoStatementServices<W>=Omit<RomIO<W>,'iran'|'lockPlanet'|'dist'|'romstr'|'plnrmv'>&{
  plnrmv(index:bigint,team:E<W>):Generator<W,void,void>;
  iran(n:100|10|5|4|3000):Generator<W,bigint,void>;
  locate(entry:'locate'|'reloc',count:E<W>):Generator<W,bigint,void>;
  pause(amount:E<W>):Generator<W,void,void>;
  ldis(v:bigint,h:bigint,ov:bigint,oh:bigint,range:number):Generator<W,bigint,void>;
  blkset(actual:bigint,zero:0,count:7):Generator<W,void,void>;
  out(key:TorpedoMessage,lines:0|1):Generator<W,void,void>;crlf():Generator<W,void,void>;odec(actual:bigint,width:0):Generator<W,void,void>;
  torom(d1:bigint,d2:bigint):Generator<W,void,void>;jumpRomulan():Generator<W,void,void>;
  lockPlanet(caller:'TORP'):Generator<W,void,void>;
};
// TORP.FOR:33-264. CHKOUT IVC/IHC alias CHECK H2/V2, and IDUM is passed
// twice to TORDAM. A misfire still executes that shot, then aborts later shots.
export function* torpedoStatements<W>(high:CommonBlock,low:CommonBlock,path:WordBlock,torps:WordBlock,l:TorpedoWords,io:TorpedoStatementServices<W>):Generator<W,CommandReturn,void>{
  const m=low.memory,get=(key:keyof TorpedoWords)=>m.read(l[key]),value=(read:()=>bigint,type:'integer'|'real'='integer'):E<W>=>({type,evaluate:function*(){return read();}}),word=(a:()=>bigint,type:'integer'|'real'='integer')=>value(()=>m.read(a()),type),n=(x:number)=>value(()=>BigInt(x)),real=(s:string)=>value(()=>io.realLiteral(s),'real');
  const v=(key:keyof TorpedoWords)=>word(()=>l[key],key==='d'?'real':'integer'),lo=(key:string)=>value(()=>low.read(key)),hi=(key:string)=>value(()=>high.read(key)),call=(evaluate:()=>Generator<W,bigint,void>,type:'integer'|'real'='integer'):E<W>=>({type,evaluate});
  const op=(kind:Parameters<typeof io.binary>[0],a:E<W>,b:E<W>):E<W>=>call(()=>io.binary(kind,a,b),a.type==='real'||b.type==='real'?'real':'integer'),add=(a:E<W>,b:E<W>)=>op('add',a,b),sub=(a:E<W>,b:E<W>)=>op('sub',a,b),mul=(a:E<W>,b:E<W>)=>op('mul',a,b),div=(a:E<W>,b:E<W>)=>op('div',a,b);
  const set=(a:()=>bigint,e:E<W>,type:'integer'|'real'='integer')=>io.assign(a,type,e),sl=(key:keyof TorpedoWords,e:E<W>)=>set(()=>l[key],e,key==='d'?'real':'integer'),sw=(key:string,e:E<W>)=>set(()=>low.address(key),e),cmp=(kind:Parameters<typeof io.compare>[0],a:E<W>,b:E<W>)=>()=>io.compare(kind,a,b);
  const ship=(col:number)=>high.address('shpcon',low.read('who'),col),sh=(col:number)=>word(()=>ship(col)),dev=(col:number)=>high.address('shpdam',low.read('who'),col),target=(row:bigint,col:number)=>torps.address('torpl',row,col),tp=()=>torps.address('tpaus'),hitV=()=>path.address('h2'),hitH=()=>path.address('v2'),code=()=>path.address('dcode');
  const ran=()=>call(()=>io.ran(0),'real'),iran=(x:100|10|5|4|3000)=>call(()=>io.iran(x)),elapsed=call(()=>io.etim(high.address('tim0'))),sender=add(lo('who'),mul(lo('team'),n(100))),nearby=()=>io.pridis(hitV(),hitH(),K.KRANGE,n(0),0),fail=()=>({alternateReturn:true});
  const score=(cat:number,amount:E<W>,kind:'add'|'sub'='add')=>set(()=>low.address('tpoint',cat),op(kind,value(()=>low.read('tpoint',cat)),amount));
  function* finish():Generator<W,CommandReturn,void>{yield*sw('tobank',add(elapsed,word(tp)));return {alternateReturn:false};}
  function* ownError(){yield*io.out(low.read('oflg')<=0n?'error2':'error1',1);return yield*finish();}
  function* ammo(){yield*io.crlf();yield*io.odec(ship(K.KNTORP),0);yield*io.out('torp07',1);return fail();}
  function* selfNotice(type:number){low.write('iwhat',BigInt(type));low.write('vto',m.read(hitV()));low.write('hto',m.read(hitH()));low.write('critdv',get('id'));low.write('dbits',high.read('bits',low.read('who')));yield*io.makhit();}
  function* announce(){yield*io.pridis(30,30,100,sub(v('nplc'),n(2)),0);yield*sw('dbits',call(()=>io.mask(lo('dbits'),hi('nomsg'))));}
  const source=function*(){yield*sw('dispfr',sender);low.write('shstfr',m.read(ship(K.KSSHPC)));low.write('shcnfr',m.read(ship(K.KSHCON)));low.write('vfrom',m.read(ship(K.KVPOS)));low.write('hfrom',m.read(ship(K.KHPOS)));};
  if(m.read(dev(K.KDTORP))>=BigInt(K.KCRIT)){yield*io.out('torp00',1);return fail();}
  yield*io.blkset(torps.address('torpl',1,1),0,7);m.write(l.iflg,1n);m.write(l.i,2n);
  if(m.read(ship(K.KNTORP))<=0n){if(low.read('oflg')===BigInt(K.SHORT))return yield*ammo();yield*io.out('torp01',1);return fail();}
  yield*sl('tem',call(()=>io.locate('locate',n(-7))));if(get('tem')<0n)return fail();
  if(get('tem')===0n)for(;;){yield*io.out('torp02',0);yield*sl('tem',call(()=>io.locate('reloc',n(-7))));if(get('tem')<0n)return fail();if(!(yield*io.or(cmp('eq',v('tem'),n(0)),cmp('eq',call(()=>io.mod(v('tem'),n(2))),n(0)))))break;}
  if(low.read('vallst',1)<=0n)return fail();m.write(l.ntorp,low.read('vallst',1));if(get('ntorp')>m.read(ship(K.KNTORP)))yield*io.out('torp03',1);
  if(yield*io.or(cmp('gt',v('ntorp'),sh(K.KNTORP)),cmp('gt',v('ntorp'),n(3)),cmp('lt',v('ntorp'),n(1))))return yield*ammo();
  if(get('tem')===1n){do{yield*sl('tem',call(()=>io.locate('reloc',mul(sub(n(0),v('ntorp')),n(2)))));if(get('tem')<0n)return fail();}while((yield*io.mod(v('tem'),n(2)))!==0n);m.write(l.i,1n);}
  const saveTarget=(row:number)=>{m.write(target(BigInt(row),1),low.read('vallst',get('i')));m.write(target(BigInt(row),2),low.read('vallst',add36(get('i'),1n)));};
  saveTarget(1);if(get('ntorp')!==1n){if(get('tem')>=add36(get('i'),2n))m.write(l.i,add36(get('i'),2n));saveTarget(2);if(get('ntorp')!==2n){if(get('tem')>=add36(get('i'),2n))m.write(l.i,add36(get('i'),2n));saveTarget(3);}}
  const targets=yield*io.bounds(n(1),v('ntorp'));m.write(l.i,targets.start);if(io.enterLoop(targets.start,targets.limit))do{
    if(yield*io.and(cmp('eq',word(()=>target(get('i'),1)),sh(K.KVPOS)),cmp('eq',word(()=>target(get('i'),2)),sh(K.KHPOS))))return yield*ownError();
    if(!io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),target(get('i'),1),target(get('i'),2),K.KRANGE))){yield*io.out('phacn1',1);return fail();}m.write(l.i,add36(get('i'),1n));
  }while(get('i')<=targets.limit);
  yield*io.pause(sub(lo('tobank'),elapsed));m.write(tp(),0n);m.write(ship(K.KSPCON),BigInt(K.RED));
  const shots=yield*io.bounds(n(1),v('ntorp'));m.write(l.id,shots.start);if(io.enterLoop(shots.start,shots.limit))do{
    yield*source();if(get('iflg')<0n)return yield*finish();yield*sl('d',div(sub(ran(),real('0.5')),real('5.0')));
    if(yield*io.or(cmp('gt',word(()=>dev(K.KDTORP)),n(0)),cmp('gt',word(()=>dev(K.KDCOMP)),n(0))))yield*sl('d',add(v('d'),div(sub(ran(),real('0.5')),real('10.0'))));
    if(m.read(ship(K.KSHCON))>0n)yield*sl('d',add(v('d'),div(mul(call(()=>io.convert('real','float',sh(K.KSSHPC)),'real'),sub(ran(),real('0.5'))),real('10000.'))));
    yield*sl('iv',sub(word(()=>target(get('id'),1)),sh(K.KVPOS)));yield*sl('ih',sub(word(()=>target(get('id'),2)),sh(K.KHPOS)));if(yield*io.and(cmp('eq',v('iv'),n(0)),cmp('eq',v('ih'),n(0))))return yield*ownError();
    if(!io.logical(high.read('docked',low.read('who'))))yield*set(()=>ship(K.KNTORP),sub(sh(K.KNTORP),n(1)));
    if((yield*io.iran(100))>96n){yield*io.out('torp04',0);yield*io.odec(l.id,0);yield*io.out('torp05',1);yield*sl('d',add(v('d'),div(sub(ran(),real('0.5')),real('5.0'))));m.write(l.iflg,-1n);if((yield*io.iran(5))===5n){yield*set(()=>dev(K.KDTORP),add(add(word(()=>dev(K.KDTORP)),n(500)),iran(3000)));yield*io.out('torp06',1);}}
    yield*sl('idis',add(sub(n(K.KRANGE),n(2)),call(()=>io.convert('integer','int',add(mul(sub(ran(),real('0.5')),real('4.0')),real('0.5'))))));yield*set(tp,add(add(word(tp),mul(add(hi('slwest'),n(1)),n(1000))),word(()=>dev(K.KDTORP))));
    yield*io.check(ship(K.KVPOS),ship(K.KHPOS),l.iv,l.ih,l.idis,l.d);
    if(m.read(code())===0n)yield*selfNotice(4);else{
      yield*sl('aran',iran(100));
      if(m.read(code())===BigInt(K.DXSTAR*100)){
        if(get('aran')>80n){low.write('dbits',high.read('bits',low.read('who')));low.write('vfrom',m.read(hitV()));low.write('hfrom',m.read(hitH()));low.write('dispfr',BigInt(K.DXSTAR*100));low.write('iwhat',6n);yield*io.makhit();}
        if(get('aran')<=80n){low.write('dispfr',BigInt(K.DXSTAR*100));low.write('iwhat',7n);low.write('vfrom',m.read(hitV()));low.write('hfrom',m.read(hitH()));yield*nearby();yield*io.makhit();yield*score(K.KNSDES,n(500),'sub');yield*io.snova();}
      }else{
        yield*sl('nplc',div(word(code),n(100)));
        if(yield*io.and(cmp('ge',v('nplc'),n(K.DXNPLN)),cmp('le',v('nplc'),n(K.DXEPLN)))){
          if(get('nplc')===add36(low.read('team'),BigInt(K.DXNPLN)))yield*selfNotice(15);else{
            low.write('dispto',m.read(code()));yield*sl('i',call(()=>io.mod(word(code),n(100))));low.write('iwhat',2n);yield*io.lockPlanet('TORP');if(io.logical(low.read('lkfail'))){yield*io.out('empty',1);return fail();}
            const planet=(col:number)=>high.address('locpln',get('i'),col);low.write('vto',m.read(planet(K.KVPOS)));low.write('hto',m.read(planet(K.KHPOS)));if((yield*io.iran(4))===4n)yield*set(()=>planet(3),sub(word(()=>planet(3)),n(1)));yield*sw('shstto',op('max',word(()=>planet(3)),n(0)));if(m.read(planet(3))<0n)low.write('klflg',2n);
            if(low.read('klflg')!==0n){yield*score(K.KNPDES,n(1000),'sub');yield*io.setdsp(hitV(),hitH(),0);yield*io.plnrmv(l.i,sub(v('nplc'),n(K.DXNPLN)));}yield*io.unlockPlanet();yield*nearby();yield*io.makhit();
          }
        }else if(get('nplc')===BigInt(K.DXBHOL))yield*selfNotice(5);
        else if(get('nplc')===BigInt(K.DXROM)){
          yield*io.torom(l.d1,l.d2);if(yield*io.and(function*(){return io.logical(high.read('rom'));},cmp('gt',iran(10),n(7))))yield*io.jumpRomulan();yield*score(K.KPRKIL,lo('ihita'));if(!io.logical(high.read('rom')))yield*score(K.KPRKIL,n(5000));low.write('shstto',high.read('erom'));low.write('shcnto',1n);low.write('dispto',BigInt(K.DXROM*100));low.write('vto',high.read('locr',K.KVPOS));low.write('hto',high.read('locr',K.KHPOS));yield*nearby();yield*io.makhit();
        }else if(!(yield*io.and(cmp('ne',v('nplc'),lo('team')),cmp('ne',v('nplc'),add(lo('team'),n(2))))))yield*selfNotice(15);
        else{
          yield*sl('j',call(()=>io.mod(word(code),n(100))));const base=(col:number)=>high.address('base',get('j'),col,add36(get('nplc'),-2n));
          if(get('nplc')>=BigInt(K.DXFBAS)&&m.read(base(3))===1000n){low.write('vto',m.read(base(K.KVPOS)));low.write('hto',m.read(base(K.KHPOS)));low.write('iwhat',9n);low.write('dispto',m.read(code()));low.write('dbits',0n);yield*announce();yield*io.makhit();low.write('iwhat',2n);yield*source();}
          low.write('vto',m.read(hitV()));low.write('hto',m.read(hitH()));yield*io.tordam(l.nplc,l.j,l.idum,l.idum,true);low.write('dispto',m.read(code()));yield*nearby();yield*io.makhit();if(yield*io.and(cmp('lt',v('nplc'),n(K.DXFBAS)),cmp('ne',value(()=>high.read('trstat',get('j'))),n(0))))yield*io.trcoff(l.j);
          if(!(yield*io.or(cmp('lt',v('nplc'),n(K.DXFBAS)),cmp('ne',call(()=>io.disp(hitV(),hitH())),n(0))))){yield*sw('dispto',add(v('j'),mul(v('nplc'),n(100))));low.write('iwhat',10n);yield*announce();low.write('vto',m.read(hitV()));low.write('hto',m.read(hitH()));yield*io.makhit();}
        }
      }
    }
    m.write(l.id,add36(get('id'),1n));
  }while(get('id')<=shots.limit);
  return yield*finish();
}
