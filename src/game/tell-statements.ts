import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import type { RadioStatementServices } from './radio-statements.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
export const tellMessages=['tell01','tell02','tell03','tell04','tell05','tell06','tell07','tell08','tell09'] as const;
export type TellMessage=typeof tellMessages[number];
export type TellStatementLocals=Record<'sntrom'|'rmspk'|'p'|'i'|'j'|'gm'|'gbits'|'svdb'|'mask'|'iship'|'ph'|'pv'|'ix'|'ir'|'jr'|'local',bigint>;
export type TellStatementServices<W>=Pick<RadioStatementServices<W>,'assign'|'binary'|'logical'|'bits'|'negate'|'equal'|'bounds'|'enterLoop'|'crlf'|'gtkn'|'odisp'>&Pick<WeaponStatementServices<W>,'and'>&{
  assignTruth(destination:()=>bigint,value:boolean):Generator<W,void,void>;
  complement(value:WeaponExpression<W>):Generator<W,bigint,void>;
  out(key:TellMessage|'Romulan',lines:0|1):Generator<W,void,void>;
  outw(address:bigint):Generator<W,void,void>;
  romspk(buffer:bigint):Generator<W,void,void>;
  makmsg(buffer?:bigint):Generator<W,void,void>;
  iran(max:4|10):Generator<W,bigint,void>;
  ingal(v:WeaponExpression<W>,h:WeaponExpression<W>):Generator<W,bigint,void>;
  disp(v:WeaponExpression<W>,h:WeaponExpression<W>):Generator<W,bigint,void>;
  setdsp(v:bigint,h:bigint,object:number):Generator<W,void,void>;
};
// TELL.FOR:25-165. Private LOCAL(17) is not the /LOCAL/ common block.
// All arithmetic, truth encoding, expression/call and DO policies are required.
// No recipient snapshots, cached names, generated BITS or rollback are added.
export function* tellStatements<W>(high:CommonBlock,low:CommonBlock,l:TellStatementLocals,romulan:bigint,io:TellStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),integer=(n:number)=>v(()=>BigInt(n));
  const word=(a:()=>bigint)=>v(()=>m.read(a())),local=(key:keyof TellStatementLocals)=>word(()=>l[key]),lo=(key:string)=>word(()=>low.address(key));
  const write=(a:()=>bigint,e:WeaponExpression<W>)=>io.assign(a,'integer',e),put=(key:keyof TellStatementLocals,e:WeaponExpression<W>)=>write(()=>l[key],e);
  const truth=(key:keyof TellStatementLocals,b:boolean)=>io.assignTruth(()=>l[key],b),yes=(key:keyof TellStatementLocals)=>io.logical(m.read(l[key]));
  const bin=(op:'add'|'sub'|'mul',a:WeaponExpression<W>,b:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.binary(op,a,b)});
  const bits=(op:'and'|'or',a:WeaponExpression<W>,b:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.bits(op,a,b)});
  const not=(a:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.complement(a)});
  const remove=(a:()=>bigint,b:WeaponExpression<W>)=>write(a,bits('and',word(a),not(b)));
  const db=()=>low.address('dbits'),token=()=>low.address('tknlst',m.read(l.i)),bit=(index:()=>bigint)=>v(()=>high.read('bits',index()));
  const ii=()=>m.read(l.i),jj=()=>m.read(l.j),who=()=>low.read('who');
  function* loop(key:'i'|'j'|'ir'|'jr',start:WeaponExpression<W>,limit:WeaponExpression<W>,body:()=>Generator<W,boolean|void,void>):Generator<W,boolean,void>{
    const b=yield*io.bounds(start,limit);m.write(l[key],b.start);
    if(io.enterLoop(b.start,b.limit))do{if(yield*body())return true;m.write(l[key],add36(m.read(l[key]),1n));}while(m.read(l[key])<=b.limit);
    return false;
  }
  yield*truth('sntrom',false);
  if(io.logical(low.read('player'))){
    yield*truth('rmspk',false);
    if(high.read('shpdam',who(),K.KDRAD)>=BigInt(K.KCRIT)){yield*io.out('tell01',1);return;}
    yield*remove(()=>high.address('nomsg'),bit(who));yield*put('p',integer(2));
    if(low.read('ntok')<=1n){yield*io.out('tell02',0);yield*io.gtkn();yield*put('p',integer(1));if(low.read('typlst',1)===BigInt(K.KEOL))return;}
    yield*write(db,integer(0));
    let aborted=false;
    yield*loop('i',local('p'),lo('ntok'),function*(){
      if(io.logical(yield*io.equal(token(),romulan))){
        if(!io.logical(high.read('rom'))){yield*io.out('tell07',0);yield*io.out('Romulan',1);return;}
        yield*put('svdb',lo('dbits'));yield*io.romspk(l.local);yield*io.makmsg(l.local);yield*truth('sntrom',true);yield*write(db,local('svdb'));
        if((yield*io.iran(4))>1n)return;
        yield*put('ph',v(()=>high.read('shpcon',who(),K.KHPOS)));yield*put('pv',v(()=>high.read('shpcon',who(),K.KVPOS)));
        yield*put('ix',bin('sub',{type:'integer',evaluate:()=>io.iran(10)},integer(5)));
        const vertical=()=>bin('add',local('pv'),local('jr')),horizontal=()=>bin('add',local('ph'),local('ir'));
        yield*loop('ir',local('ix'),integer(10),function*(){return yield*loop('jr',local('ix'),integer(10),function*(){
          if(!io.logical(yield*io.ingal(vertical(),horizontal())))return;
          if((yield*io.disp(vertical(),horizontal()))!==0n)return;
          yield*io.setdsp(high.address('locr',K.KVPOS),high.address('locr',K.KHPOS),0);
          yield*write(()=>high.address('locr',K.KHPOS),horizontal());yield*write(()=>high.address('locr',K.KVPOS),vertical());
          yield*io.setdsp(high.address('locr',K.KVPOS),high.address('locr',K.KHPOS),K.DXROM*100);return true;
        });});return;
      }
      if(io.logical(low.read('rptflg'))){yield*io.out('tell09',1);aborted=true;return true;}
      const matched=yield*loop('j',integer(1),integer(K.KNPLAY),function*(){return io.logical(yield*io.equal(token(),high.address('names',jj(),1)));});
      if(matched){yield*write(db,bits('or',lo('dbits'),bit(jj)));if(jj()===who())yield*io.out('tell05',1);return;}
      yield*truth('gm',false);
      const ambiguous=yield*loop('j',integer(1),integer(K.KNGRP),function*(){
        if(group(1)===0n)return;
        if(!io.logical(yield*io.equal(token(),low.address('group',jj(),1))))return;
        if(yes('gm'))return true;
        yield*truth('gm',true);yield*put('gbits',v(()=>group(2)));
      });
      if(ambiguous||!yes('gm')){yield*io.out(ambiguous?'tell04':'tell03',0);yield*io.outw(token());yield*io.crlf();return;}
      yield*loop('j',integer(1),integer(K.KNPLAY),function*(){if(!io.logical(high.read('alive',jj()))){
        const mask:WeaponExpression<W>={type:'integer',evaluate:()=>io.negate(bin('add',bit(jj),integer(1)))};
        yield*put('gbits',bits('and',local('gbits'),mask));
      }});yield*write(db,bits('or',lo('dbits'),local('gbits')));
    });if(aborted)return;
  }else{yield*truth('rmspk',true);yield*io.romspk(l.local);}
  yield*put('mask',integer(1));
  yield*loop('i',integer(1),integer(K.KNPLAY),function*(){
    yield*put('iship',bin('add',integer(K.DXFSHP*100),local('i')));
    if((yield*bits('and',lo('dbits'),local('mask')).evaluate())!==0n){
      let rejected:'tell06'|'tell07'|undefined;
      if(high.read('shpdam',ii(),K.KDRAD)>=BigInt(K.KCRIT))rejected='tell07';
      else if(!io.logical(high.read('alive',ii())))rejected='tell06';
      else if((yield*bits('and',v(()=>high.read('nomsg')),local('mask')).evaluate())!==0n)rejected='tell07';
      if(rejected){if(!yes('rmspk')){yield*io.out(rejected,0);yield*io.odisp(local('iship'),0);yield*io.crlf();}yield*remove(db,local('mask'));}
    }
    yield*put('mask',bin('mul',local('mask'),integer(2)));
  });
  if(io.logical(low.read('player')))yield*remove(db,bit(who));
  yield*remove(()=>low.address('gagmsg'),lo('dbits'));
  if(low.read('dbits')===0n){if(yield*io.and(function*(){return !yes('rmspk');},function*(){return !yes('sntrom');}))yield*io.out('tell08',1);return;}
  if(yes('rmspk'))yield*io.makmsg(l.local);
  else{yield*write(()=>low.address('dispfr'),bin('add',lo('who'),bin('mul',lo('team'),integer(100))));yield*io.makmsg();yield*io.crlf();}
  function group(column:number){return low.read('group',jj(),column);}
}
