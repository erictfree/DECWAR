import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { RepairExpression as Expr,RepairServices } from './repair-statements.ts';
import type { CommandReturn } from './maintenance.ts';
export type BuildMessage='build1'|'build2'|'build3'|'build4'|'build5'|'build7'|'noplnt'|'captu5'|'busy1'|'busy2';
export type BuildServices<W>=Pick<RepairServices<W>,'logical'|'and'|'integer'|'assign'|'etim'>&{
  or(left:()=>boolean,right:()=>boolean):Generator<W,boolean,void>;
  locate(entry:'locate'|'reloc',n:2):Generator<W,bigint,void>;
  ldis(v:bigint,h:bigint,ov:bigint,oh:bigint,range:1):Generator<W,bigint,void>;
  board(entry:'disp'|'dispc'|'dispx',v:bigint,h:bigint):Generator<W,bigint,void>;
  setdsp(v:bigint,h:bigint,code:Expr<W>):Generator<W,void,void>;
  lock():Generator<W,void,void>;unlock():Generator<W,void,void>;
  plnrmv(index:bigint,team:bigint):Generator<W,void,void>;
  crlf():Generator<W,void,void>;outc():Generator<W,void,void>;
  out(key:BuildMessage,lines:0|1):Generator<W,void,void>;
  odec(actual:bigint,width:0):Generator<W,void,void>;
  odisp(value:Expr<W>,space:0|1):Generator<W,void,void>;
  prloc(v:bigint,h:bigint):Generator<W,void,void>;
};
// BUILD.FOR:34-114. Scores/build increments precede the fifth-build lock;
// failed locking does not roll those stores back. PLNRMV can transfer away.
export function* buildStatements<W>(high:CommonBlock,low:CommonBlock,l:Record<'v'|'tem'|'vloc'|'hloc'|'c'|'i'|'j',bigint>,io:BuildServices<W>):Generator<W,CommandReturn,void>{
  const m=low.memory,get=(key:keyof typeof l)=>m.read(l[key]),value=(read:()=>bigint):Expr<W>=>function*(){return read();},n=(x:number)=>value(()=>BigInt(x)),v=(key:keyof typeof l)=>value(()=>get(key)),team=value(()=>low.read('team'));
  const bin=(op:Parameters<typeof io.integer>[0],a:Expr<W>,b:Expr<W>):Expr<W>=>()=>io.integer(op,a,b),set=(key:keyof typeof l,e:Expr<W>)=>io.assign(()=>l[key],e);
  const planet=(col:number)=>high.address('locpln',get('i'),col),base=(col:number)=>high.address('base',get('j'),col,low.read('team')),ship=(col:number)=>high.address('shpcon',low.read('who'),col);
  const p=(col:number)=>value(()=>m.read(planet(col))),elapsed:Expr<W>=()=>io.etim(high.address('tim0')),fail=()=>({alternateReturn:true});
  const score=(amount:Expr<W>)=>io.assign(()=>low.address('tpoint',K.KPBBAS),bin('add',value(()=>low.read('tpoint',K.KPBBAS)),amount));
  const full=function*(){yield*io.out('build4',0);yield*io.odisp(bin('mul',bin('add',team,n(2)),n(100)),0);yield*io.out('build5',1);return fail();};
  yield*set('v',bin('add',bin('add',elapsed,bin('mul',value(()=>high.read('slwest')),n(1000))),n(4000)));
  yield*set('tem',()=>io.locate('locate',2));while(get('tem')===0n)yield*set('tem',()=>io.locate('reloc',2));if(get('tem')<0n)return fail();
  m.write(l.vloc,low.read('vallst',1));m.write(l.hloc,low.read('vallst',2));
  if(!io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),l.vloc,l.hloc,1))){yield*io.odisp(()=>io.board('disp',ship(K.KVPOS),ship(K.KHPOS)),1);yield*io.out('captu5',1);return fail();}
  yield*set('c',()=>io.board('dispc',l.vloc,l.hloc));
  if(yield*io.or(()=>get('c')<BigInt(K.DXNPLN),()=>get('c')>BigInt(K.DXEPLN))){yield*io.out('noplnt',1);return fail();}
  if((yield*io.integer('add',team,n(K.DXNPLN)))!==get('c')){yield*io.out('build7',0);return fail();}
  yield*set('i',()=>io.board('dispx',l.vloc,l.hloc));
  if(yield*io.and(()=>m.read(planet(3))===4n,()=>high.read('nbase',low.read('team'))===BigInt(K.KNBASE)))return yield*full();
  yield*io.assign(()=>planet(3),bin('add',p(3),n(1)));
  if(m.read(planet(3))!==5n){yield*io.odec(planet(3),0);yield*io.out('build3',0);if(m.read(planet(3))>1n)yield*io.outc();yield*io.crlf();}
  yield*score(bin('mul',n(500),p(3)));
  if(m.read(planet(3))===5n){
    yield*io.lock();if(io.logical(low.read('lkfail'))){yield*io.out('busy1',1);yield*io.out('busy2',1);return fail();}
    for(m.write(l.j,1n);get('j')<=BigInt(K.KNBASE);m.write(l.j,add36(get('j'),1n)))if(m.read(base(3))<=0n)break;
    if(get('j')>BigInt(K.KNBASE)){yield*io.assign(()=>planet(3),bin('sub',p(3),n(1)));yield*io.unlock();return yield*full();}
    yield*score(n(2500));yield*io.assign(()=>high.address('nbase',low.read('team')),bin('add',value(()=>high.read('nbase',low.read('team'))),n(1)));
    m.write(base(4),m.read(planet(4)));yield*io.plnrmv(l.i,low.address('team'));yield*io.unlock();
    m.write(base(K.KVPOS),get('vloc'));m.write(base(K.KHPOS),get('hloc'));m.write(base(3),1000n);
    yield*io.setdsp(l.vloc,l.hloc,bin('add',bin('mul',bin('add',n(K.DXFBAS),bin('sub',team,n(1))),n(100)),v('j')));
    yield*io.crlf();yield*io.odisp(()=>io.board('disp',ship(K.KVPOS),ship(K.KHPOS)),1);yield*io.out('build1',0);yield*io.prloc(l.vloc,l.hloc);yield*io.out('build2',0);yield*io.odisp(()=>io.board('disp',l.vloc,l.hloc),0);yield*io.crlf();
  }
  yield*io.assign(()=>low.address('ptime'),bin('sub',v('v'),elapsed));return {alternateReturn:false,pause:low.read('ptime')};
}
