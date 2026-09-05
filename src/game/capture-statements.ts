import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { RepairExpression as Expr } from './repair-statements.ts';
import type { BuildServices } from './build-statements.ts';
import type { CommandReturn } from './maintenance.ts';
export type CaptureMessage='captu0'|'captu1'|'captu2'|'captu4'|'captu5'|'captu6'|'captu7'|'captu8'|'noplnt'|'nosur1'|'nosur2'|'nosur3'|'nosur4'|'refuses';
export type CaptureServices<W>=Omit<BuildServices<W>,'out'|'outc'|'odec'|'plnrmv'>&{
  out(key:CaptureMessage,lines:0|1):Generator<W,void,void>;
  pridis(v:bigint,h:bigint,range:number,flag:bigint|null,zero:0|1):Generator<W,void,void>;
  baskil(actual:bigint):Generator<W,void,void>;
  pdist(v:bigint,h:bigint,ov:bigint,oh:bigint):Generator<W,bigint,void>;
  phadam(team:bigint,who:bigint,distance:bigint,power:bigint):Generator<W,void,void>;
  makhit():Generator<W,void,void>;
};
// CAPTUR.FOR:28-127. Ownership changes before the planet defends itself.
// Death after capture returns normally and still enters the main turn path.
export function* captureStatements<W>(high:CommonBlock,low:CommonBlock,l:Record<'v'|'tem'|'vloc'|'hloc'|'c'|'i'|'tcap'|'phit'|'id'|'idsp',bigint>,io:CaptureServices<W>):Generator<W,CommandReturn,void>{
  const m=low.memory,get=(key:keyof typeof l)=>m.read(l[key]),value=(read:()=>bigint):Expr<W>=>function*(){return read();},n=(x:number)=>value(()=>BigInt(x)),v=(key:keyof typeof l)=>value(()=>get(key)),team=value(()=>low.read('team'));
  const bin=(op:Parameters<typeof io.integer>[0],a:Expr<W>,b:Expr<W>):Expr<W>=>()=>io.integer(op,a,b),set=(key:keyof typeof l,e:Expr<W>)=>io.assign(()=>l[key],e),put=(key:string,e:Expr<W>)=>io.assign(()=>low.address(key),e);
  const planet=(col:number)=>high.address('locpln',get('i'),col),ship=(col:number)=>high.address('shpcon',low.read('who'),col),p=(col:number)=>value(()=>m.read(planet(col))),elapsed:Expr<W>=()=>io.etim(high.address('tim0')),fail=()=>({alternateReturn:true});
  const code=bin('add',value(()=>low.read('who')),bin('mul',team,n(100)));
  yield*set('v',bin('add',elapsed,n(5000)));yield*set('tem',()=>io.locate('locate',2));while(get('tem')===0n)yield*set('tem',()=>io.locate('reloc',2));if(get('tem')<0n)return fail();
  m.write(l.vloc,low.read('vallst',1));m.write(l.hloc,low.read('vallst',2));
  if(!io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),l.vloc,l.hloc,1))){yield*io.crlf();yield*io.odisp(()=>io.board('disp',ship(K.KVPOS),ship(K.KHPOS)),1);yield*io.out('captu5',1);return fail();}
  yield*set('c',()=>io.board('dispc',l.vloc,l.hloc));
  if(yield*io.or(()=>get('c')<BigInt(K.DXNPLN),()=>get('c')>BigInt(K.DXEPLN))){
    yield*set('idsp',()=>io.board('dispc',l.vloc,l.hloc));if(get('idsp')<=0n)yield*io.out('noplnt',1);
    if(yield*io.or(()=>low.read('team')===get('idsp'),()=>add36(low.read('team'),2n)===get('idsp')))yield*io.out('nosur1',1);
    if(yield*io.or(()=>add36(3n,-low.read('team'))===get('idsp'),()=>add36(5n,-low.read('team'))===get('idsp')))yield*io.out('nosur2',1);
    if(get('idsp')===BigInt(K.DXROM))yield*io.out('nosur3',1);if(get('idsp')>=BigInt(K.DXSTAR))yield*io.out('nosur4',1);return fail();
  }
  if(get('c')===(yield*io.integer('add',n(K.DXNPLN),team))){if(low.read('oflg')!==BigInt(K.LONG))yield*io.out('captu7',1);else{if(low.read('team')===1n)yield*io.out('captu6',1);if(low.read('team')===2n)yield*io.out('captu8',1);}return fail();}
  yield*io.lock();if(io.logical(low.read('lkfail'))){yield*io.out('refuses',1);return fail();}
  yield*set('tcap',bin('sub',v('c'),n(K.DXNPLN)));if(get('tcap')!==0n)yield*io.pridis(l.vloc,l.hloc,K.KRANGE,l.tcap,0);yield*io.pridis(l.vloc,l.hloc,4,null,1);
  yield*set('i',()=>io.board('dispx',l.vloc,l.hloc));if(get('tcap')!==0n)yield*io.baskil(l.tcap);
  if(get('tcap')!==0n)yield*io.assign(()=>high.address('numcap',get('tcap')),bin('sub',value(()=>high.read('numcap',get('tcap'))),n(1)));
  yield*io.assign(()=>high.address('numcap',low.read('team')),bin('add',value(()=>high.read('numcap',low.read('team'))),n(1)));
  yield*set('phit',bin('add',n(50),bin('mul',n(30),p(3))));low.write('shstfr',m.read(planet(3)));yield*set('v',bin('add',v('v'),bin('mul',p(3),n(1000))));
  yield*io.assign(()=>ship(K.KSNRGY),bin('sub',value(()=>m.read(ship(K.KSNRGY))),bin('mul',p(3),n(500))));m.write(planet(3),0n);yield*io.unlock();
  yield*put('dispfr',()=>io.board('disp',l.vloc,l.hloc));low.write('iwhat',1n);yield*io.setdsp(l.vloc,l.hloc,bin('add',bin('mul',bin('add',team,n(K.DXNPLN)),n(100)),v('i')));
  yield*put('dispto',code);low.write('shjump',0n);low.write('vfrom',get('vloc'));low.write('hfrom',get('hloc'));low.write('vto',m.read(ship(K.KVPOS)));low.write('hto',m.read(ship(K.KHPOS)));
  yield*set('id',()=>io.pdist(low.address('vfrom'),low.address('hfrom'),low.address('vto'),low.address('hto')));yield*io.phadam(low.address('team'),low.address('who'),l.id,l.phit);
  const score=(category:number,e:Expr<W>)=>io.assign(()=>high.address('tmscor',get('tcap'),category),bin('add',value(()=>high.read('tmscor',get('tcap'),category)),e));
  if(get('tcap')!==0n)yield*score(K.KPEDAM,value(()=>low.read('ihita')));if(yield*io.and(()=>low.read('klflg')!==0n,()=>get('tcap')!==0n))yield*score(K.KPEKIL,n(5000));
  yield*io.pridis(ship(K.KVPOS),ship(K.KHPOS),K.KRANGE,low.address('team'),0);yield*io.pridis(ship(K.KVPOS),ship(K.KHPOS),4,null,1);
  yield*io.crlf();yield*io.odisp(code,1);yield*io.out('captu0',0);yield*io.odisp(bin('mul',bin('add',v('tcap'),n(K.DXNPLN)),n(100)),1);yield*io.prloc(l.vloc,l.hloc);yield*io.makhit();
  yield*io.assign(()=>low.address('tpoint',K.KPPCAP),bin('add',value(()=>low.read('tpoint',K.KPPCAP)),n(1000)));yield*put('ptime',bin('sub',v('v'),elapsed));
  if(yield*io.and(()=>m.read(ship(K.KSDAM))<BigInt(K.KENDAM),()=>m.read(ship(K.KSNRGY))>0n))return {alternateReturn:false,pause:low.read('ptime')};
  if(low.read('team')===1n)yield*io.out('captu1',1);if(low.read('team')===2n)yield*io.out('captu2',1);yield*io.odisp(code,1);yield*io.out('captu4',1);return {alternateReturn:false,pause:low.read('ptime')};
}
