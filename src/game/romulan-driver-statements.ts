import { currentVariant } from '../runtime/variant-execution.ts';
import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
import type { BasePhaserExpression } from './base-phaser-statements.ts';
// A plain expression needs a compiler temporary; an address-bearing expression
// denotes a source variable actual and must preserve that reference at calls.
export type RomulanExpression<W>=BasePhaserExpression<W>&{address?:()=>bigint};
export type RomulanMainLocals=Record<'iplace'|'nplc'|'numsec'|'i'|'j'|'ctime'|'l'|'vt'|'ht'|'i1',bigint>;
export type RomulanMainServices<W>={
  logical(word:bigint):boolean;
  integer(op:'add'|'sub'|'mul'|'min'|'max'|'or'|'and',left:RomulanExpression<W>,right:RomulanExpression<W>):Generator<W,bigint,void>;
  complement(word:RomulanExpression<W>):Generator<W,bigint,void>;
  iabs(word:RomulanExpression<W>):Generator<W,bigint,void>;
  assign(address:()=>bigint,word:RomulanExpression<W>):Generator<W,void,void>;
  assignBoolean(address:()=>bigint,value:boolean):Generator<W,void,void>;
  or(left:()=>Generator<W,boolean,void>,right:()=>Generator<W,boolean,void>):Generator<W,boolean,void>;
  bounds(start:RomulanExpression<W>,limit:RomulanExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  debugLine(operation:'timin'|'timout',label:'ROMDRV'|'BASPHA'|'PLNATK'|'BASBLD'):Generator<W,void,void>;
  iran(max:2|5|10|50|200):Generator<W,bigint,void>;
  place(code:501,count:1,v:bigint,h:bigint):Generator<W,void,void>;
  dist(index:bigint,kind:bigint,distance:bigint):Generator<W,void,void>;
  check(v:bigint,h:bigint,dv:bigint,dh:bigint,range:bigint):Generator<W,void,void>; // Sixth argument is compiled 0.0.
  setdsp(v:RomulanExpression<W>,h:RomulanExpression<W>,code:0|500):Generator<W,void,void>;
  disp(v:RomulanExpression<W>,h:RomulanExpression<W>):Generator<W,bigint,void>;
  ingal(v:RomulanExpression<W>,h:RomulanExpression<W>):Generator<W,bigint,void>;
  etim(start:bigint):Generator<W,bigint,void>;
  romstr(v:bigint,h:bigint):Generator<W,void,void>;
  romtor(dv:bigint,dh:bigint):Generator<W,void,void>;
  phadam(kind:bigint,index:bigint,distance:bigint,power:200,ship:true):Generator<W,void,void>;
  pdist(v:bigint,h:bigint,toV:bigint,toH:bigint):Generator<W,bigint,void>;
  pridis(v:RomulanExpression<W>,h:RomulanExpression<W>,range:number,flag:RomulanExpression<W>,zero:0):Generator<W,void,void>;
  makhit():Generator<W,void,void>;tell():Generator<W,void,void>;
  odisp(code:500,space:1):Generator<W,void,void>;outAdvance():Generator<W,void,void>;
  prloc(v:bigint,h:bigint):Generator<W,void,void>; // (V,H,1,0,OCFLG,SHORT).
  baspha():Generator<W,void,void>;plnatk():Generator<W,void,void>;basbld():Generator<W,void,void>;
};
// ROMDRV.FOR:40-208. PHIT is untouched on main entry. CHKOUT is the actual
// shared seven-word block; ROMDRV V1/H1 are CHECK H1/V1, including ROMTOR's
// aliased direction arguments. Compiler expressions, calls and DO are services.
export function* romulanDriverStatements<W>(_phit:bigint,id:bigint,high:CommonBlock,low:CommonBlock,path:WordBlock,l:RomulanMainLocals,io:RomulanMainServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):RomulanExpression<W>=>function*(){return read();},n=(word:number)=>v(()=>BigInt(word));
  const word=(a:()=>bigint):RomulanExpression<W>=>Object.assign(v(()=>m.read(a())),{address:a}),local=(key:keyof RomulanMainLocals)=>word(()=>l[key]),hi=(key:string,...indices:number[])=>v(()=>high.read(key,...indices)),lo=(key:string)=>v(()=>low.read(key));
  const op=(kind:Parameters<typeof io.integer>[0],a:RomulanExpression<W>,b:RomulanExpression<W>):RomulanExpression<W>=>()=>io.integer(kind,a,b);
  const set=(a:()=>bigint,x:RomulanExpression<W>)=>io.assign(a,x),sl=(key:keyof RomulanMainLocals,x:RomulanExpression<W>)=>set(()=>l[key],x),sh=(key:string,x:RomulanExpression<W>)=>set(()=>high.address(key),x),sw=(key:string,x:RomulanExpression<W>)=>set(()=>low.address(key),x);
  const pred=(read:()=>boolean)=>function*(){return read();},cmp=(kind:'lt'|'gt'|'eq',a:RomulanExpression<W>,b:RomulanExpression<W>)=>function*(){const x=yield*a(),y=yield*b();return kind==='lt'?x<y:kind==='gt'?x>y:x===y;};
  const rv=()=>high.address('locr',K.KVPOS),rh=()=>high.address('locr',K.KHPOS),rV=word(rv),rH=word(rh);
  const dist=()=>io.dist(l.iplace,l.nplc,l.numsec),early=()=>io.debugLine('timout','ROMDRV');
  function* loadTarget(){const ship=m.read(l.nplc)===1n||m.read(l.nplc)===2n;const target=(column:number)=>ship?high.address('shpcon',m.read(l.iplace),column):high.address('base',m.read(l.iplace),column,m.read(l.nplc)-2n);yield*sl('i',word(()=>target(K.KVPOS)));yield*sl('j',word(()=>target(K.KHPOS)));}
  function* relocate(vv:RomulanExpression<W>,hh:RomulanExpression<W>){yield*io.setdsp(rV,rH,0);yield*io.setdsp(vv,hh,500);yield*set(rv,vv);yield*set(rh,hh);}
  function* announce(){yield*io.pridis(n(30),n(30),100,op('sub',local('nplc'),n(2)),0);yield*sw('dbits',op('and',lo('dbits'),()=>io.complement(hi('nomsg'))));}
  yield*io.debugLine('timin','ROMDRV');yield*sh('romcnt',op('add',hi('romcnt'),n(1)));
  if(yield*cmp('lt',op('mul',hi('romcnt'),n(2)),hi('numply'))()){yield*early();return;}
  yield*io.assignBoolean(()=>low.address('player'),false);yield*set(()=>high.address('tmturn',3),op('add',hi('tmturn',3),n(1)));
  if(!io.logical(high.read('rom'))){
    if(yield*io.or(cmp('lt',hi('romcnt'),op('mul',hi('numply'),n(3))),function*(){return (yield*io.iran(5))===5n;})){yield*early();return;}
    yield*sh('romcnt',n(0));yield*io.place(501,1,rv(),rh());yield*io.assignBoolean(()=>high.address('rom'),true);
    yield*sh('erom',op('add',()=>io.iran(200),n(200)));yield*sh('numrom',op('add',hi('numrom'),n(1)));
    yield*sw('iwhat',n(11));yield*sw('dispfr',n(500));yield*sw('vfrom',rV);yield*sw('hfrom',rH);yield*io.pridis(rV,rH,K.KRANGE,n(0),0);
    if(io.logical(low.read('pasflg')))yield*sw('dbits',op('or',lo('dbits'),v(()=>high.read('bits',low.read('who')))));yield*io.makhit();
    if((yield*io.iran(currentVariant().definition.id==='austin'?5:10))===1n)yield*io.tell();yield*dist();if(m.read(l.numsec)>BigInt(K.KRANGE)){yield*early();return;}
  }else{
    yield*dist();if(m.read(l.numsec)>1n){
      yield*loadTarget();
      for(const [key,coord] of [['i',rV],['j',rH]] as const){
        const delta=()=>op('sub',local(key),coord);
        if(yield*cmp('lt',delta(),n(0))())yield*sl(key,op('sub',coord,op('sub',()=>io.iabs(delta()),n(1))));
        if(yield*cmp('gt',delta(),n(0))())yield*sl(key,op('add',coord,op('sub',()=>io.iabs(delta()),n(1))));
        if(yield*cmp('eq',delta(),n(0))())yield*sl(key,coord);
      }
      yield*sl('l',n(4));if(m.read(l.numsec)<4n)yield*sl('l',local('numsec'));
      yield*sl('vt',op('sub',local('i'),rV));yield*sl('ht',op('sub',local('j'),rH));yield*io.check(rv(),rh(),l.vt,l.ht,l.l);
      yield*sl('i',v(()=>path.read('h1')));yield*sl('j',v(()=>path.read('v1')));
      if(path.read('dcode')===0n)yield*relocate(local('i'),local('j'));
      else{
        const bounds=yield*io.bounds(n(1),local('l'));m.write(l.i1,bounds.start);
        if(io.enterLoop(bounds.start,bounds.limit))do{
          const vv=op('sub',local('i'),local('i1')),hh=op('sub',local('j'),local('i1'));
          if(io.logical(yield*io.ingal(vv,n(5)))&&(yield*io.disp(vv,local('j')))<=0n){yield*relocate(vv,local('j'));break;}
          if(io.logical(yield*io.ingal(n(5),hh))&&(yield*io.disp(local('i'),hh))<=0n){yield*relocate(local('i'),hh);break;}
          m.write(l.i1,add36(m.read(l.i1),1n));
        }while(m.read(l.i1)<=bounds.limit);
      }
      yield*dist();if(io.logical(low.read('pasflg'))){yield*io.odisp(500,1);yield*io.outAdvance();yield*io.prloc(rv(),rh());}
      if(m.read(l.numsec)>BigInt(K.KRANGE)){yield*sh('romcnt',n(0));yield*early();return;}
    }
  }
  yield*loadTarget();yield*sl('ctime',()=>io.etim(high.address('tim0')));
  if(yield*cmp('gt',op('min',hi('rtpaus'),hi('rppaus')),local('ctime'))()){yield*early();return;}
  yield*sh('romcnt',n(0));let choice=0n;
  if(yield*cmp('lt',op('max',hi('rtpaus'),hi('rppaus')),local('ctime'))())choice=yield*io.iran(2);
  const phaser=choice===2n||(choice!==1n&&high.read('rppaus')<m.read(l.ctime));
  if(!phaser){
    yield*io.romstr(l.i,l.j);yield*set(()=>path.address('h1'),op('sub',local('i'),rV));yield*set(()=>path.address('v1'),op('sub',local('j'),rH));yield*io.romtor(path.address('h1'),path.address('v1'));
  }else{
    if(m.read(l.nplc)>=BigInt(K.DXFBAS)&&high.read('base',m.read(l.iplace),3,m.read(l.nplc)-2n)===1000n){
      yield*sw('vto',local('i'));yield*sw('hto',local('j'));yield*sw('iwhat',n(9));yield*sw('dispto',()=>io.disp(local('i'),local('j')));yield*sw('dispfr',n(500));yield*announce();yield*io.makhit();
    }
    yield*sw('vfrom',rV);yield*sw('hfrom',rH);yield*sw('vto',local('i'));yield*sw('hto',local('j'));yield*sw('shjump',n(0));yield*sw('shstfr',hi('erom'));yield*sw('shcnfr',n(1));
    yield*set(()=>id,()=>io.pdist(low.address('vfrom'),low.address('hfrom'),low.address('vto'),low.address('hto')));yield*io.phadam(l.nplc,l.iplace,id,200,true);
    yield*sw('iwhat',n(1));yield*io.pridis(local('i'),local('j'),K.KRANGE,n(0),0);yield*sw('dispfr',n(500));yield*sw('dispto',op('add',op('mul',local('nplc'),n(100)),local('iplace')));yield*io.makhit();
    yield*sh('rppaus',op('add',()=>io.etim(high.address('tim0')),op('mul',op('add',hi('slwest'),n(1)),n(750))));
    if(!(yield*io.or(pred(()=>m.read(l.nplc)<BigInt(K.DXFBAS)),function*(){return (yield*io.disp(local('i'),local('j')))!==0n;}))){
      yield*sw('iwhat',n(10));yield*sw('dispto',op('add',op('mul',local('nplc'),n(100)),local('iplace')));yield*sw('vto',local('i'));yield*sw('hto',local('j'));yield*announce();yield*io.makhit();
    }
  }
  if((yield*io.iran(currentVariant().definition.id==='austin'?10:50))<=1n)yield*io.tell();yield*early();
  yield*io.debugLine('timin','BASPHA');yield*io.baspha();yield*io.debugLine('timout','BASPHA');
  yield*io.debugLine('timin','PLNATK');yield*io.plnatk();yield*io.debugLine('timout','PLNATK');
  yield*io.debugLine('timin','BASBLD');yield*io.basbld();yield*io.debugLine('timout','BASBLD');
}
