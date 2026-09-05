import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
import type { WeaponExpression as E,WeaponStatementServices } from './weapon-damage-statements.ts';
import type { CommandReturn } from './maintenance.ts';
export type PhaserMessage='phacn0'|'erloc1'|'error1'|'error2'|'phacn1'|'phacn2'|'phacn4'|'phacn5'|'phacn7'|'phacn8'|'phacn9';
export type PhaserStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'binary'|'assign'|'realLiteral'|'and'|'or'>&{
  locate(entry:'locate'|'reloc',n:-3):Generator<W,bigint,void>;
  board(entry:'disp'|'dispc'|'dispx',v:bigint,h:bigint):Generator<W,bigint,void>;
  pdist(v:bigint,h:bigint,ov:bigint,oh:bigint):Generator<W,bigint,void>;
  pause(amount:E<W>):Generator<W,void,void>;etim(actual:bigint):Generator<W,bigint,void>;
  iran(n:100):Generator<W,bigint,void>;
  out(key:PhaserMessage,lines:1):Generator<W,void,void>;
  phadam(kind:bigint,index:bigint,distance:bigint,power:bigint):Generator<W,void,void>;
  pharom(power:bigint,distance:bigint):Generator<W,void,void>;
  pridis(v:bigint,h:bigint,range:number,flag:E<W>,zero:0|1):Generator<W,void,void>;
  mask(left:E<W>,right:E<W>):Generator<W,bigint,void>;integerOr(left:E<W>,right:E<W>):Generator<W,bigint,void>;
  makhit():Generator<W,void,void>;
};
// PHACON.FOR:33-164. Actual bank/local/token words are retained across waits.
// No PTIME assignment; successful fire sets PHBANK only after all notifications.
export function* phaserStatements<W>(high:CommonBlock,low:CommonBlock,l:Record<'tem'|'bank'|'iv'|'ih'|'nplc'|'ip'|'id'|'phit',bigint>,thirty:bigint,io:PhaserStatementServices<W>):Generator<W,CommandReturn,void>{
  const m=low.memory,get=(key:keyof typeof l)=>m.read(l[key]);
  const value=(read:()=>bigint,type:'integer'|'real'='integer'):E<W>=>({type,evaluate:function*(){return read();}}),n=(x:number)=>value(()=>BigInt(x)),v=(key:keyof typeof l)=>value(()=>get(key)),lo=(key:string)=>value(()=>low.read(key)),team=lo('team');
  const bin=(op:Parameters<typeof io.binary>[0],a:E<W>,b:E<W>):E<W>=>({type:a.type==='real'||b.type==='real'?'real':'integer',evaluate:()=>io.binary(op,a,b)}),add=(a:E<W>,b:E<W>)=>bin('add',a,b),sub=(a:E<W>,b:E<W>)=>bin('sub',a,b),mul=(a:E<W>,b:E<W>)=>bin('mul',a,b),div=(a:E<W>,b:E<W>)=>bin('div',a,b);
  const call=(f:()=>Generator<W,bigint,void>):E<W>=>({type:'integer',evaluate:f}),set=(key:keyof typeof l,e:E<W>)=>io.assign(()=>l[key],'integer',e),put=(key:string,e:E<W>)=>io.assign(()=>low.address(key),'integer',e),pred=(f:()=>boolean)=>function*(){return f();};
  const ship=(col:number)=>high.address('shpcon',low.read('who'),col),sh=(col:number)=>value(()=>m.read(ship(col))),dev=()=>high.address('shpdam',low.read('who'),K.KDPHAS),energy=(e:E<W>)=>io.assign(()=>ship(K.KSNRGY),'integer',e);
  const elapsed=call(()=>io.etim(high.address('tim0'))),draw=()=>call(()=>io.iran(100)),code=add(lo('who'),mul(team,n(100))),fail=function*(key:PhaserMessage){yield*io.out(key,1);return {alternateReturn:true};};
  const nearby=(range:number,flag:E<W>,zero:0|1)=>io.pridis(l.iv,l.ih,range,flag,zero),announcement=()=>io.pridis(thirty,thirty,100,sub(v('nplc'),n(2)),0),target=()=>call(()=>io.board('disp',l.iv,l.ih));
  const score=(amount:E<W>)=>io.assign(()=>low.address('tpoint',K.KPRKIL),'integer',add(value(()=>low.read('tpoint',K.KPRKIL)),amount));
  if(m.read(dev())>=BigInt(K.KCRIT))return yield*fail('phacn0');yield*set('tem',call(()=>io.locate('locate',-3)));
  for(;;){if(get('tem')===1n)yield*io.out('erloc1',1);if(yield*io.or(pred(()=>get('tem')<0n),pred(()=>get('tem')===1n)))return {alternateReturn:true};if(get('tem')!==0n)break;yield*set('tem',call(()=>io.locate('reloc',-3)));}
  m.write(l.bank,1n);if(low.read('phbank',2)<low.read('phbank',1))m.write(l.bank,2n);m.write(l.iv,low.read('vallst',add36(get('tem'),-1n)));m.write(l.ih,low.read('vallst',get('tem')));
  yield*set('nplc',call(()=>io.board('dispc',l.iv,l.ih)));yield*set('ip',call(()=>io.board('dispx',l.iv,l.ih)));
  if(yield*io.or(pred(()=>get('nplc')<BigInt(K.DXFSHP)),pred(()=>get('nplc')>BigInt(K.DXEPLN))))return yield*fail('phacn7');
  if(yield*io.and(pred(()=>get('nplc')<BigInt(K.DXFBAS)),pred(()=>!io.logical(high.read('alive',get('ip'))))))return yield*fail('phacn7');
  yield*set('id',call(()=>io.pdist(l.iv,l.ih,ship(K.KVPOS),ship(K.KHPOS))));if(get('id')===0n)return yield*fail(low.read('oflg')<=0n?'error2':'error1');
  if(yield*io.or(pred(()=>get('nplc')===low.read('team')),pred(()=>get('nplc')===add36(low.read('team'),2n)),pred(()=>get('nplc')===add36(low.read('team'),BigInt(K.DXNPLN)))))return yield*fail('phacn9');
  if(get('id')>BigInt(K.KRANGE))return yield*fail('phacn1');yield*io.pause(sub(value(()=>low.read('phbank',get('bank'))),elapsed));
  m.write(l.phit,200n);if(get('tem')!==2n){if(yield*io.or(pred(()=>low.read('vallst',1)>500n),pred(()=>low.read('vallst',1)<50n)))return yield*fail('phacn8');m.write(l.phit,low.read('vallst',1));}
  if(m.read(ship(K.KSHCON))>=0n){if(low.read('oflg')!==BigInt(K.SHORT))yield*io.out('phacn2',1);yield*energy(sub(sh(K.KSNRGY),n(2000)));}
  if((yield*mul(draw(),v('phit')).evaluate())>18900n){yield*io.out('phacn4',1);if(low.read('oflg')===BigInt(K.LONG))yield*io.out('phacn5',1);yield*io.assign(dev,'integer',add(add(value(()=>m.read(dev())),n(750)),div(mul(mul(draw(),v('phit')),value(()=>io.realLiteral('7.5'),'real')),n(100))));}
  if(!(yield*io.or(pred(()=>get('nplc')<BigInt(K.DXNPLN)),pred(()=>get('nplc')>BigInt(K.DXEPLN))))){
    low.write('vfrom',m.read(ship(K.KVPOS)));low.write('hfrom',m.read(ship(K.KHPOS)));low.write('shstfr',m.read(ship(K.KSSHPC)));low.write('shcnfr',m.read(ship(K.KSHCON)));low.write('vto',get('iv'));low.write('hto',get('ih'));low.write('shjump',0n);yield*put('dispfr',code);yield*put('dispto',target());low.write('iwhat',1n);yield*nearby(K.KRANGE,n(0),0);
    const builds=()=>high.address('locpln',get('ip'),3);if((yield*div(mul(draw(),v('phit')),mul(n(25),v('id'))).evaluate())>150n)yield*io.assign(builds,'integer',bin('max',sub(value(()=>m.read(builds())),n(1)),n(0)));low.write('shstto',m.read(builds()));yield*io.makhit();
  }else if(get('nplc')===BigInt(K.DXROM)){
    low.write('vfrom',m.read(ship(K.KVPOS)));low.write('hfrom',m.read(ship(K.KHPOS)));low.write('vto',high.read('locr',K.KVPOS));low.write('hto',high.read('locr',K.KHPOS));low.write('shjump',0n);yield*io.pharom(l.phit,l.id);yield*score(lo('ihita'));if(!io.logical(high.read('rom')))yield*score(n(5000));
    low.write('shstfr',m.read(ship(K.KSSHPC)));low.write('shcnfr',m.read(ship(K.KSHCON)));low.write('shstto',high.read('erom'));low.write('shcnto',1n);yield*put('dispfr',code);low.write('dispto',BigInt(K.DXROM*100));low.write('iwhat',1n);yield*nearby(K.KRANGE,n(0),0);yield*io.makhit();
  }else{
    if(get('nplc')>=BigInt(K.DXFBAS)&&high.read('base',get('ip'),3,add36(get('nplc'),-2n))===1000n){low.write('vto',get('iv'));low.write('hto',get('ih'));low.write('iwhat',9n);yield*put('dispto',target());yield*put('dispfr',code);yield*announcement();yield*put('dbits',call(()=>io.mask(lo('dbits'),value(()=>high.read('nomsg')))));yield*io.makhit();}
    yield*io.phadam(l.nplc,l.ip,l.id,l.phit);
    low.write('shstfr',m.read(ship(K.KSSHPC)));low.write('shcnfr',m.read(ship(K.KSHCON)));low.write('vfrom',m.read(ship(K.KVPOS)));low.write('hfrom',m.read(ship(K.KHPOS)));low.write('vto',get('iv'));low.write('hto',get('ih'));low.write('shjump',0n);yield*put('dispfr',code);yield*put('dispto',add(mul(v('nplc'),n(100)),v('ip')));low.write('iwhat',1n);
    if(get('nplc')>=BigInt(K.DXFBAS))yield*nearby(K.KRANGE,sub(v('nplc'),n(2)),0);if(get('nplc')<BigInt(K.DXFBAS))yield*nearby(K.KRANGE,v('nplc'),0);yield*nearby(4,n(0),1);yield*put('dbits',call(()=>io.integerOr(lo('dbits'),value(()=>high.read('bits',low.read('who'))))));yield*io.makhit();
    if(!(yield*io.or(pred(()=>get('nplc')<BigInt(K.DXFBAS)),function*(){return (yield*target().evaluate())!==0n;}))){low.write('iwhat',10n);yield*put('dispto',add(mul(v('nplc'),n(100)),v('ip')));yield*put('dispfr',code);low.write('vto',get('iv'));low.write('hto',get('ih'));yield*announcement();yield*put('dbits',call(()=>io.mask(lo('dbits'),value(()=>high.read('nomsg')))));yield*io.makhit();}
  }
  yield*energy(sub(sh(K.KSNRGY),mul(v('phit'),n(10))));
  m.write(ship(K.KSPCON),BigInt(K.RED));yield*io.assign(()=>low.address('phbank',get('bank')),'integer',add(add(elapsed,mul(add(value(()=>high.read('slwest')),n(1)),n(1500))),value(()=>m.read(dev()))));return {alternateReturn:false};
}
