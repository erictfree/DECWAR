import { currentVariant } from '../runtime/variant-execution.ts';
import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import type { RadioStatementServices } from './radio-statements.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export type GetCommandLocals=Record<'i'|'txppn'|'txnm1'|'txnm2'|'txsh1'|'txsh2'|'txtim'|'txwhy'|'txtem'|'txtot',bigint>;
export type GetCommandMessage='beep'|'noquit'|'ambcom'|'unkcom'|'forhlp'|'main02';
export type GetCommandStatementServices<W>=Pick<RadioStatementServices<W>,'assign'|'binary'|'logical'|'bounds'|'enterLoop'|'equal'|'crlf'>&Pick<WeaponStatementServices<W>,'and'|'or'>&{
  pendingControl?:'handle'; // Playable repair: avoid the source 200/210/350 spin.
  assignFalse(address:()=>bigint):Generator<W,void,void>;
  ttyon():Generator<W,void,void>;outhit():Generator<W,void,void>;outmsg():Generator<W,void,void>;
  prgnam(name:'DECWSL'|'DECWTI'|'DECWRN'):Generator<W,void,void>;
  dmpbuf():Generator<W,void,void>;cctrap():Generator<W,void,void>;pause(ptime:bigint):Generator<W,void,void>;
  chkseq():Generator<W,void,void>;endgam():Generator<W,void,void>;prompt():Generator<W,void,void>;zaplok():Generator<W,void,void>;
  input(milliseconds:number):Generator<W,bigint,void>;gtkn():Generator<W,void,void>;clear():Generator<W,void,void>;
  out(message:GetCommandMessage,lines:0|1):Generator<W,void,void>;odisp(code:WeaponExpression<W>,detail:1):Generator<W,void,void>;
  etim(start:()=>bigint):Generator<W,bigint,void>;points(final:true):Generator<W,void,void>;
  updsta(addresses:readonly bigint[]):Generator<W,void,void>;free(who:bigint):Generator<W,void,void>;
};
// GETCMD.FOR:25-133. CMD and TX/I locals are actual addresses. Named LOCAL
// is declared but not referenced; TOTAL is the shared POLOCL first word.
export function* getCommandStatements<W>(cmd:bigint,high:CommonBlock,low:CommonBlock,l:GetCommandLocals,total:bigint,quit:bigint,io:GetCommandStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),integer=(n:number)=>v(()=>BigInt(n));
  const word=(a:()=>bigint)=>v(()=>m.read(a())),lo=(key:string)=>word(()=>low.address(key)),write=(a:()=>bigint,e:WeaponExpression<W>)=>io.assign(a,'integer',e);
  const bin=(op:'add'|'sub'|'mul',a:WeaponExpression<W>,b:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.binary(op,a,b)});
  const who=()=>low.read('who'),ship=(c:number)=>high.read('shpcon',who(),c),yes=(key:string)=>io.logical(low.read(key));
  const condition=(read:()=>boolean)=>function*(){return read();};
  function* notifications(){yield*io.ttyon();if(high.read('hitflg',who())!==0n)yield*io.outhit();yield*io.ttyon();if(high.read('msgflg',who())!==0n)yield*io.outmsg();}
  if(currentVariant().definition.id==='austin')yield*io.zaplok();
  yield*notifications();yield*io.prgnam('DECWSL');yield*io.dmpbuf();yield*io.cctrap();if(!yes('pasflg'))yield*io.pause(low.address('ptime'));yield*write(()=>low.address('ptime'),integer(0));
  let pc=100;
  for(;;)switch(pc){
    case 100:
      yield*io.crlf();yield*io.chkseq();if(ship(K.KSDAM)>=BigInt(K.KENDAM)){pc=1100;break;}if(ship(K.KSNRGY)<=0n){pc=1200;break;}
      if(ship(K.KSNRGY)<=10000n)yield*write(()=>high.address('shpcon',who(),K.KSPCON),integer(K.YELLOW));
      if(ship(K.KSPCON)===BigInt(K.YELLOW))yield*io.out('beep',0);yield*io.ttyon();yield*io.endgam();yield*io.assignFalse(()=>low.address('ccflg'));yield*io.prompt();yield*io.prgnam('DECWTI');yield*io.dmpbuf();pc=200;break;
    case 200:
      yield*io.zaplok();if(yield*io.or(condition(()=>yes('ccflg')),condition(()=>yes('hungup')))){
        if(io.pendingControl==='handle'){
          if(yes('hungup')||ship(K.KSPCON)!==BigInt(K.RED))pc=500;
          else{yield*io.out('noquit',1);yield*io.clear();pc=100;}
        }else pc=210;
        break;
      }
      if(io.logical(yield*io.input(K.KCMDTM))){pc=400;break;}pc=yes('hungup')?500:210;break;
    case 210:
      yield*write(()=>high.address('active',who()),integer(0));yield*write(()=>high.address('comknt'),bin('add',v(()=>high.read('comknt')),integer(1)));
      if(high.read('comknt')>=(yield*bin('mul',integer(30),v(()=>high.read('numply'))).evaluate()))yield*write(()=>high.address('comknt'),integer(0));
      if(yield*io.and(condition(()=>high.read('hitflg',who())===0n),condition(()=>high.read('msgflg',who())===0n))){yield*io.endgam();pc=200;}else{yield*notifications();pc=100;}break;
    case 400:
      yield*write(()=>high.address('active',who()),integer(0));if(yes('hungup')){pc=500;break;}
      yield*write(()=>high.address('comknt'),bin('add',v(()=>high.read('comknt')),integer(1)));yield*io.gtkn();
      if(!yes('ccflg')){pc=low.read('typlst',1)===BigInt(K.KEOL)?100:610;break;}
      if(ship(K.KSPCON)!==BigInt(K.RED)){pc=500;break;}yield*io.out('noquit',1);yield*io.clear();pc=100;break;
    case 500:
      yield*write(()=>low.address('tknlst',1),word(()=>quit));yield*write(()=>low.address('typlst',1),integer(K.KALF));pc=610;break;
    case 610:{
      yield*write(()=>cmd,integer(0));const b=yield*io.bounds(integer(1),integer(K.KNCMD));m.write(l.i,b.start);let ambiguous=false;
      if(io.enterLoop(b.start,b.limit))do{
        if(io.logical(yield*io.equal(low.address('tknlst',1),high.address('isaydo',1,m.read(l.i))))){if(m.read(cmd)!==0n){ambiguous=true;break;}yield*write(()=>cmd,word(()=>l.i));}
        m.write(l.i,add36(m.read(l.i),1n));
      }while(m.read(l.i)<=b.limit);
      if(!ambiguous&&m.read(cmd)>0n){yield*io.prgnam('DECWRN');return;}
      yield*io.out(ambiguous||m.read(cmd)<0n?'ambcom':'unkcom',0);if(low.read('oflg')!==BigInt(K.SHORT))yield*io.out('forhlp',0);yield*io.crlf();pc=100;break;
    }
    case 1200:yield*io.odisp(bin('add',bin('mul',lo('team'),integer(100)),lo('who')),1);yield*io.out('main02',1);pc=1100;break;
    case 1100:
      for(const [key,col] of [['txppn',K.KPPN],['txnm1',K.KNAM1],['txnm2',K.KNAM2]] as const)yield*write(()=>l[key],v(()=>high.read('job',who(),col)));
      yield*write(()=>l.txsh1,v(()=>high.read('names',who(),1)));yield*write(()=>l.txsh2,v(()=>high.read('names',who(),2)));
      yield*write(()=>l.txtim,{type:'integer',evaluate:()=>io.etim(()=>high.address('job',who(),K.KJOBTM))});yield*write(()=>l.txwhy,integer(0));yield*write(()=>l.txtem,bin('sub',lo('team'),integer(1)));
      yield*io.points(true);yield*write(()=>l.txtot,word(()=>total));if(currentVariant().definition.id!=='austin')yield*io.updsta([l.txppn,l.txnm1,l.txnm2,l.txsh1,l.txsh2,l.txtot,l.txtim,l.txwhy,l.txtem,low.address('who')]);yield*io.free(low.address('who'));yield*write(()=>low.address('who'),integer(0));return;
    default:throw new Error('unreachable GETCMD label');
  }
}
