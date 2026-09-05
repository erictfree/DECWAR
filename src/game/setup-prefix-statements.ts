import type { CommonBlock } from '../compat/memory.ts';
import { add36,multiply36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
export type SetupPrefixLabel='setu01'|'setu02'|'setu03'|'setu04'|'setu05'|'setu06'|'setu07'|'nogal1';
export type SetupPrefixServices<W>={
  logical(word:bigint):boolean;trueWord():bigint;
  or(a:()=>Generator<W,boolean,void>,b:()=>Generator<W,boolean,void>):Generator<W,boolean,void>;
  and(a:()=>Generator<W,boolean,void>,b:()=>Generator<W,boolean,void>):Generator<W,boolean,void>;
  frcchk():Generator<W,void,void>;crlf():Generator<W,void,void>;jobsta(actuals:readonly bigint[]):Generator<W,void,void>;
  out(key:SetupPrefixLabel,lines:0|1):Generator<W,void,void>;kilhgh():Generator<W,void,void>;start():Generator<W,void,void>;exit():Generator<W,void,void>;
  cctrap(handler?:'cc1'):Generator<W,void,void>;lock():Generator<W,void,void>;cancel():Generator<W,void,void>;
  daytim(dummy:bigint):Generator<W,bigint,void>;setran(seed:bigint):Generator<W,void,void>;
  clear(first:bigint,value:bigint,count:bigint):Generator<W,void,void>;queue(entry:'setqh'|'setqm'):Generator<W,void,void>;
  gtkn():Generator<W,void,void>;equal(actual:bigint,key:'TOURNAMENT'|'REGULAR'|'YES'|'NO'):Generator<W,bigint,void>;
  regularBranch(test:()=>Generator<W,bigint,void>):Generator<W,boolean,void>;
  iabs(word:bigint):Generator<W,bigint,void>;starCount():Generator<W,bigint,void>;holeCount():Generator<W,bigint,void>;
  place(code:()=>bigint,count:bigint,v:bigint,h:bigint):Generator<W,void,void>;admit():Generator<W,void,void>;
};
// SETUP.FOR:219-341 followed by label 1400 admission. DATA initialization
// belongs to loading a shared segment, not each invocation of this routine.
export function* setupPrefixStatements<W>(high:CommonBlock,low:CommonBlock,l:{identity:bigint;d:bigint;i:bigint;j:bigint;nstar:bigint;nhole:bigint;one:bigint;dm1:bigint;dm2:bigint},io:SetupPrefixServices<W>):Generator<W,void,void>{
  const m=low.memory,eq=(key:'TOURNAMENT'|'REGULAR'|'YES'|'NO')=>io.equal(low.address('tknlst',1),key),pred=(f:()=>boolean)=>function*(){return f();},flag=(key:string)=>pred(()=>io.logical(low.read(key))),interrupted=()=>io.or(flag('ccflg'),flag('hungup')),empty=()=>low.read('typlst',1)===BigInt(K.KEOL);
  low.write('who',0n);yield*io.frcchk();yield*io.crlf();yield*io.jobsta(Array.from({length:6},(_,i)=>l.identity+BigInt(i)));
  if(high.read('numply')===BigInt(K.KNPLAY)){yield*io.out('setu01',1);yield*io.kilhgh();yield*io.start();yield*io.exit();}
  yield*io.cctrap();for(;;){yield*io.lock();if(yield*io.or(flag('hungup'),flag('ccflg')))yield*io.exit();if(!io.logical(low.read('lkfail')))break;}
  high.write('numply',add36(high.read('numply'),1n));if(yield*interrupted())yield*io.cancel();yield*io.cctrap('cc1');yield*io.setran(yield*io.daytim(l.d));
  let existing=false;
  if(high.read('tim0')>=0n)existing=yield*io.or(pred(()=>high.read('numply')!==1n),function*(){const left=high.read('hitime'),right=yield*io.daytim(l.d);return add36(left,-right)>0n;});
  if(existing){
    if(io.logical(high.read('endflg'))){yield*io.kilhgh();yield*io.out('nogal1',1);yield*io.exit();}
    if(io.logical(high.read('romopt')))yield*io.out('setu06',1);if(io.logical(high.read('blhopt')))yield*io.out('setu07',1);
  }else{
    yield*io.clear(high.address('hfz'),0n,high.address('hlz')-high.address('hfz')+1n);high.write('tim0',yield*io.daytim(l.d));yield*io.queue('setqh');yield*io.queue('setqm');
    options:{
      for(;;){
        yield*io.out('setu02',0);yield*io.gtkn();if(io.logical(low.read('ccflg')))break options;if(io.logical(low.read('hungup')))yield*io.cancel();if(empty())break;
        if(io.logical(yield*eq('TOURNAMENT'))){m.write(l.i,2n);if(low.read('typlst',2)===BigInt(K.KEOL)){m.write(l.i,1n);yield*io.out('setu03',0);yield*io.gtkn();if(io.logical(low.read('ccflg')))break options;if(io.logical(low.read('hungup')))yield*io.cancel();}yield*io.setran(yield*io.iabs(low.read('tknlst',m.read(l.i))));break;}
        if(yield*io.regularBranch(()=>eq('REGULAR')))break;
      }
      for(;;){
        high.write('romopt',io.trueWord());yield*io.out('setu04',0);yield*io.gtkn();if(io.logical(low.read('ccflg')))break;if(io.logical(low.read('hungup')))yield*io.cancel();if(empty())break;
        if(yield*io.and(function*(){return !io.logical(yield*eq('YES'));},function*(){return !io.logical(yield*eq('NO'));}))continue;
        if(io.logical(yield*eq('NO')))high.write('romopt',0n);break;
      }
    }
    high.write('rom',0n);
    for(m.write(l.j,1n);m.read(l.j)<=2n;m.write(l.j,add36(m.read(l.j),1n)))for(m.write(l.i,1n);m.read(l.i)<=BigInt(K.KNBASE);m.write(l.i,add36(m.read(l.i),1n))){high.write('base',1000n,m.read(l.i),3,m.read(l.j));high.write('base',m.read(l.j),m.read(l.i),4,m.read(l.j));}
    high.write('nbase',10n,1);high.write('nbase',10n,2);yield*io.clear(high.address('alive',1),1n,BigInt(K.KNPLAY));
    m.write(l.nstar,yield*io.starCount());m.write(l.nhole,yield*io.holeCount());high.write('nplnet',60n);
    for(m.write(l.i,1n);m.read(l.i)<=BigInt(K.KNBASE);m.write(l.i,add36(m.read(l.i),1n))){
      yield*io.place(()=>add36(BigInt(K.DXFBAS*100),m.read(l.i)),l.one,high.address('base',m.read(l.i),K.KVPOS,1),high.address('base',m.read(l.i),K.KHPOS,1));
      yield*io.place(()=>add36(BigInt(K.DXEBAS*100),m.read(l.i)),l.one,high.address('base',m.read(l.i),K.KVPOS,2),high.address('base',m.read(l.i),K.KHPOS,2));
    }
    const limit=high.read('nplnet');for(m.write(l.i,1n);m.read(l.i)<=limit;m.write(l.i,add36(m.read(l.i),1n)))yield*io.place(()=>add36(BigInt(K.DXNPLN*100),m.read(l.i)),l.one,high.address('locpln',m.read(l.i),K.KVPOS),high.address('locpln',m.read(l.i),K.KHPOS));
    yield*io.place(()=>multiply36(BigInt(K.DXSTAR),100n),l.nstar,l.dm1,l.dm2);
    if(!(yield*interrupted()))for(;;){
      yield*io.out('setu05',0);yield*io.gtkn();if(yield*interrupted())break;if(empty())break;
      if(!(yield*io.or(function*(){return io.logical(yield*eq('YES'));},function*(){return io.logical(yield*eq('NO'));})))continue;
      if(io.logical(yield*eq('YES')))high.write('blhopt',io.trueWord());if(io.logical(high.read('blhopt')))yield*io.place(()=>BigInt(K.DXBHOL*100),l.nhole,l.i,l.j);break;
    }
  }
  yield*io.admit();
}
