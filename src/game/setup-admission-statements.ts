import { currentVariant } from '../runtime/variant-execution.ts';
import type { CommonBlock } from '../compat/memory.ts';
import { add36,divide36,signed36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
import type { setupLiterals,setupGroupNames } from './setup.ts';
export type AdmissionLabel=keyof typeof setupLiterals|'setu11'|'setu12'|'setu13'|'setu14'|'setu15'|'setu16'|'setu17'|'stu17a'|'setu18';
export type AdmissionServices<W>={
  logical(w:bigint):boolean;trueWord():bigint;
  interrupted(cc:()=>bigint,hungup:()=>bigint):Generator<W,boolean,void>;
  out(key:AdmissionLabel,lines:0|1|2):Generator<W,void,void>;
  out2w(first:bigint,second:bigint):Generator<W,void,void>;crlf():Generator<W,void,void>;
  odec(actual:bigint,width:0):Generator<W,void,void>;gtkn():Generator<W,void,void>;
  equal(actual:bigint,literal:'YES'|'FEDERATION'|'EMPIRE'|bigint):Generator<W,bigint,void>;
  sideChoice(fed:()=>Generator<W,bigint,void>,emp:()=>Generator<W,bigint,void>):Generator<W,boolean,void>;
  cctrap(handler:0|'cc1'|'cc2'|'clrbuf'):Generator<W,void,void>;cancel(stage:'cc1'|'cc2'):Generator<W,void,void>;
  kqsrch(tty:bigint,job:bigint,ppn:bigint,index:bigint):Generator<W,void,void>;
  unlock():Generator<W,void,void>;updcap(who:bigint):Generator<W,void,void>;
  jobsta(actuals:readonly bigint[]):Generator<W,void,void>;
  daytim(dummy:bigint):Generator<W,bigint,void>;runtim(dummy:bigint):Generator<W,bigint,void>;
  groupWord(name:typeof setupGroupNames[number]):bigint;
};
// SETUP.FOR:342-494, label 1400 through RETURN. This phase assumes SETUP
// already holds FRELOK and has counted NUMPLY; it does not invent a new universe.
// The first six LOCAL words remain the actual JOBSTA identity area, including
// TTYSPD later reused by the original slowest-terminal loop (which tests WHO).
export function* setupAdmissionStatements<W>(high:CommonBlock,low:CommonBlock,l:{identity:bigint;kindex:bigint;i:bigint;ibeg:bigint;iend:bigint;d:bigint},io:AdmissionServices<W>):Generator<W,void,void>{
  const m=low.memory,B=(n:number)=>BigInt(n),who=()=>low.read('who'),team=()=>low.read('team'),interrupted=()=>io.interrupted(()=>low.read('ccflg'),()=>low.read('hungup')),empty=()=>low.read('typlst',1)===B(K.KEOL),eq=(literal:'YES'|'FEDERATION'|'EMPIRE'|bigint)=>io.equal(low.address('tknlst',1),literal),inc=(field:string)=>high.write(field,add36(high.read(field,team()),1n),team());
  const abs=(n:bigint)=>n<0n?signed36(-n):n;
  if(yield*interrupted())yield*io.cancel('cc1');yield*io.cctrap('cc1');low.write('ttytyp',8n);
  yield*io.kqsrch(l.identity+4n,l.identity,l.identity+3n,l.kindex);
  let retain=false;
  if(m.read(l.kindex)!==0n){
    low.write('team',high.read('kilque',m.read(l.kindex),5)&0o777777n);
    low.write('who',divide36(high.read('kilque',m.read(l.kindex),5),0o1000000n).quotient);
    if(high.read('numsid',team())>=B(K.KNPLAY/2)){
      if(team()===1n)yield*io.out('federationFull',1);if(team()===2n)yield*io.out('empireFull',1);yield*io.out('fleetFull',1);yield*io.out('defect',0);yield*io.gtkn();
      if(yield*interrupted())yield*io.cancel('cc1');if(empty())yield*io.cancel('cc1');if(!io.logical(yield*eq('YES')))yield*io.cancel('cc1');low.write('team',add36(team(),1n));if(team()===3n)low.write('team',1n);
    }else if(high.read('alive',who())>0n)retain=true;
    else{
      yield*io.out('reassignedStart',0);yield*io.out2w(high.address('names',who(),1),high.address('names',who(),2));yield*io.crlf();yield*io.out('reassignedEnd',1);yield*io.out('anotherShip',0);yield*io.gtkn();
      if(yield*interrupted())yield*io.cancel('cc1');if(empty())yield*io.cancel('cc1');if(!io.logical(yield*eq('YES'))){yield*io.cancel('cc1');retain=true;} // A returning CC1 falls through label 1420.
    }
  }else{
    yield*io.out('setu16',0);yield*io.odec(high.address('numsid',1),0);yield*io.out('setu17',0);yield*io.odec(high.address('numsid',2),0);yield*io.out('stu17a',0);
    if(abs(add36(high.read('numsid',1),-high.read('numsid',2)))>=2n){low.write('team',1n);if(high.read('numsid',1)>high.read('numsid',2))low.write('team',2n);}
    else for(;;){
      yield*io.out('setu18',0);yield*io.gtkn();if(yield*interrupted())yield*io.cancel('cc1');
      if(empty()){low.write('team',1n);if(high.read('numsid',1)>high.read('numsid',2))low.write('team',2n);break;}
      if(!(yield*io.sideChoice(()=>eq('FEDERATION'),()=>eq('EMPIRE'))))continue;
      low.write('team',1n);if(io.logical(yield*eq('EMPIRE')))low.write('team',2n);break;
    }
  }
  yield*io.cctrap(0);inc('numsid');inc('numshp');yield*io.cctrap('cc2');if(yield*interrupted())yield*io.cancel('cc2');
  if(!retain){
    if(team()===2n){yield*io.out('setu12',1);m.write(l.ibeg,B(K.KNPLAY/2+1));m.write(l.iend,B(K.KNPLAY));}
    else{yield*io.out('setu11',1);m.write(l.ibeg,1n);m.write(l.iend,B(K.KNPLAY/2));}
    for(;;){
      yield*io.out('setu13',2);const limit=m.read(l.iend);for(m.write(l.i,m.read(l.ibeg));m.read(l.i)<=limit;m.write(l.i,add36(m.read(l.i),1n))){if(high.read('alive',m.read(l.i))<=0n)continue;yield*io.out2w(high.address('names',m.read(l.i),1),high.address('names',m.read(l.i),2));yield*io.crlf();}
      yield*io.out('setu14',0);yield*io.gtkn();if(yield*interrupted())yield*io.cancel('cc2');
      for(low.write('who',1n);who()<=B(K.KNPLAY);low.write('who',add36(who(),1n)))if(io.logical(yield*eq(high.address('names',who(),1))))break;
      if(who()<m.read(l.ibeg)||who()>m.read(l.iend))continue;if(high.read('alive',who())>0n)break;yield*io.out('setu15',1);
    }
  }
  yield*io.unlock();if(currentVariant().definition.id!=='austin')yield*io.updcap(low.address('who'));
  for(m.write(l.i,1n);m.read(l.i)<=B(K.KNPOIN);m.write(l.i,add36(m.read(l.i),1n)))high.write('score',0n,m.read(l.i),who());high.write('alive',io.trueWord(),who());
  for(const [n,name,bits] of [[1,'ALL',0o1777n],[2,'KLINGON',0o1740n],[3,'EMPIRE',0o1740n],[4,'HUMAN',0o37n],[5,'FEDERATION',0o37n],[6,'FRIENDLY',null],[7,'ENEMY',null]] as const){low.write('group',io.groupWord(name),n,1);low.write('group',bits===null?low.read('group',n===6?add36(5n,-team()):add36(2n,team()),2):BigInt(currentVariant().definition.groupMasks[n-1].mask),n,2);}
  yield*io.cctrap('clrbuf');yield*io.jobsta([K.KJOB,K.KNAM1,K.KNAM2,K.KPPN,K.KTTYN,K.KTTYSP].map(k=>high.address('job',who(),k)));
  high.write('job',low.read('ttytyp'),who(),K.KTTYTP);const day=yield*io.daytim(l.d);high.write('job',day,who(),K.KJOBTM);const runtime=yield*io.runtim(l.d);high.write('job',runtime,who(),K.KRUNTM);
  for(m.write(l.i,1n);m.read(l.i)<=10n;m.write(l.i,add36(m.read(l.i),1n)))high.write('shpcon',0n,who(),m.read(l.i));
  for(m.write(l.i,1n);m.read(l.i)<=B(K.KNDEV);m.write(l.i,add36(m.read(l.i),1n)))high.write('shpdam',0n,who(),m.read(l.i));
  const speed=l.identity+5n;m.write(speed,9600n);
  for(m.write(l.i,1n);m.read(l.i)<=B(K.KNPLAY);m.write(l.i,add36(m.read(l.i),1n))){if(!io.logical(high.read('alive',who())))continue;if(high.read('job',m.read(l.i),K.KTTYSP)<m.read(speed))m.write(speed,high.read('job',m.read(l.i),K.KTTYSP));}
  if(m.read(speed)<=1200n)high.write('slwest',3n);if(m.read(speed)===1200n)high.write('slwest',2n);if(m.read(speed)>1200n)high.write('slwest',1n);if(m.read(speed)===0n)high.write('slwest',1n);
  for(const [key,value] of [[K.KSPCON,B(K.GREEN)],[K.KNTORP,10n],[K.KSHCON,1n],[K.KLFSUP,5n],[K.KSNRGY,50000n],[K.KSSHPC,1000n]] as const)high.write('shpcon',value,who(),key);
}
// CC1/CC2, SETUP.FOR:31-60. These exit paths do not undo NUMSHP or clear WHO.
export function* setupCancelStatements<W>(stage:'cc1'|'cc2',high:CommonBlock,low:CommonBlock,io:{unlock():Generator<W,void,void>;exit():Generator<W,void,void>}):Generator<W,void,void>{
  high.write('numply',add36(high.read('numply'),-1n));if(stage==='cc2')high.write('numsid',add36(high.read('numsid',low.read('team')),-1n),low.read('team'));yield*io.unlock();yield*io.exit();
}
