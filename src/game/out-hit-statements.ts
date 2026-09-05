import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import type { RadioStatementServices } from './radio-statements.ts';
import type { messages } from '../runtime/variant-values.ts';
import { constants as K } from '../runtime/variant-values.ts';
export type OutHitMessage=Extract<keyof typeof messages,`outh${string}`>|'star02'|'displc'|'units1'|'destry'|'tormis';
export type OutHitLocals={nplcf:bigint;nplct:bigint};
export type OutHitStatementServices<W>=Pick<RadioStatementServices<W>,'assign'|'binary'|'bits'|'crlf'>&Pick<WeaponStatementServices<W>,'and'|'or'>&{
  blkset(address:bigint,zero:0,count:17):Generator<W,void,void>;gethit(who:bigint):Generator<W,void,void>;
  out(message:OutHitMessage,lines:0|1):Generator<W,void,void>;outc(text:string):Generator<W,void,void>;out2c(text:string):Generator<W,void,void>;space():Generator<W,void,void>;
  odisp(address:bigint,space:0|1):Generator<W,void,void>;odec(address:bigint):Generator<W,void,void>;oflt(address:bigint):Generator<W,void,void>;osflt(value:WeaponExpression<W>):Generator<W,void,void>;odev(address:bigint):Generator<W,void,void>;
  prloc(v:bigint,h:bigint,newline:0|1,ocflg:bigint,oflg:bigint|'short'):Generator<W,void,void>;
};
// OUTHIT.FOR:33-288. Source labels preserve reads after each output call;
// compiler arithmetic/compound predicates and raw callees remain required.
export function* outHitStatements<W>(high:CommonBlock,low:CommonBlock,l:OutHitLocals,io:OutHitStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,a=(key:string)=>low.address(key),r=(key:string)=>low.read(key),of=()=>r('oflg'),from=()=>m.read(l.nplcf),to=()=>m.read(l.nplct),long=()=>of()===BigInt(K.LONG),short=()=>of()===BigInt(K.SHORT);
  const v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),word=(key:string)=>v(()=>r(key)),integer=(n:number)=>v(()=>BigInt(n));
  const bin=(op:'add'|'sub'|'mul'|'div',x:WeaponExpression<W>,y:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.binary(op,x,y)});
  const p=(read:()=>boolean)=>function*(){return read();},out=(key:OutHitMessage,n:0|1=0)=>io.out(key,n),obj=(key:string,s:0|1=0)=>io.odisp(a(key),s);
  const loc=(side:'from'|'to',n:0|1=0,format:bigint|'short'=a('oflg'))=>io.prloc(a('v'+side),a('h'+side),n,a('ocflg'),format);
  const percent=(side:'fr'|'to')=>io.osflt(bin('mul',word('shcn'+side),word('shst'+side)));
  let pc=100;
  for(;;)switch(pc){
    case 100:{yield*io.blkset(a('iwhat'),0,17);if(high.read('hitflg',r('who'))===0n)return;if(long())yield*io.crlf();yield*io.gethit(a('who'));
      const n=r('iwhat');pc=n>=1n&&n<=15n?[200,200,200,4600,4600,200,200,200,6000,6000,6800,6900,7300,7600,4600][Number(n)-1]:100;break;}
    case 200:
      yield*obj('dispfr');yield*io.assign(()=>l.nplcf,'integer',bin('div',word('dispfr'),integer(100)));yield*io.assign(()=>l.nplct,'integer',bin('div',word('dispto'),integer(100)));
      if(!(yield*io.or(p(()=>from()<BigInt(K.DXNPLN)),p(()=>from()>BigInt(K.DXEPLN))))&&r('shstfr')!==0n){if(long())yield*io.outc('(');yield*io.odec(a('shstfr'));if(long())yield*io.outc(')');}
      yield*io.space();yield*loc('from');if(yield*io.and(p(()=>!short()),p(()=>from()<BigInt(K.DXROM))))yield*io.outc(',');
      if(from()<=BigInt(K.DXROM)){yield*io.space();yield*percent('fr');if(!short())yield*io.outc('%');}yield*io.space();
      if(r('iwhat')===7n){if(of()<=0n)yield*io.outc('N');else yield*out('outh01');yield*io.crlf();pc=100;break;}
      if(r('iwhat')===6n){if(of()<=0n)yield*io.outc('U');else yield*out('star02');yield*io.crlf();pc=100;break;}
      if(r('iwhat')===3n&&of()>=0n){yield*out(of()===0n?'outh29':'outh30');pc=2500;break;}
      if(long())yield*out('outh02');yield*io.space();
      if(yield*io.and(p(()=>to()>BigInt(K.DXROM)),p(()=>r('iwhat')!==8n))){pc=1900;break;}
      if(to()>BigInt(K.DXROM)){pc=1600;break;}yield*io.oflt(a('ihita'));if(!short())yield*out('outh03');pc=r('iwhat')===8n?1600:1900;break;
    case 1600:if(of()<=0n)yield*io.outc('N');else yield*out('outh04');pc=2500;break;
    case 1900:if(r('iwhat')===1n){if(of()<=0n)yield*io.outc('P');else yield*out('outh06');}else{if(of()<=0n)yield*io.outc('T');else yield*out('outh05');}pc=2500;break;
    case 2500:
      if(of()<=0n)yield*io.out2c('  ');else if(yield*io.and(p(()=>to()<BigInt(K.DXROM)),p(()=>r('hcpos')>40n)))yield*io.crlf();
      yield*obj('dispto');if(!(yield*io.or(p(()=>to()<BigInt(K.DXNPLN)),p(()=>to()>BigInt(K.DXEPLN))))&&r('shstto')!==0n){if(long())yield*io.outc('(');yield*io.odec(a('shstto'));if(long())yield*io.outc(')');}
      yield*io.space();
      if(r('shjump')!==0n){if(of()<0n)yield*io.outc('>');else if(of()===0n){yield*io.out2c('--');yield*io.outc('>');}else yield*out('displc');}else if(!short())yield*io.outc('@');
      yield*loc('to',0,'short');if(yield*io.or(p(()=>to()>BigInt(K.DXROM)),p(()=>r('klflg')!==0n))){pc=3900;break;}
      if(!short())yield*io.outc(',');yield*io.space();yield*percent('to');if(!short())yield*io.outc('%');
      if(r('dispto')!==(yield*bin('add',word('who'),bin('mul',word('team'),integer(100))).evaluate())){pc=3900;break;}
      if(r('critdv')===0n){pc=4100;break;}yield*io.out2c('; ');yield*io.odev(a('critdv'));
      if(of()<0n)yield*io.space();else yield*out(of()===0n?'outh08':'outh07');yield*io.oflt(a('critdm'));if(long())yield*out('units1');pc=3900;break;
    case 3900:
      if(yield*io.or(p(()=>!long()),()=>io.and(p(()=>to()!==BigInt(K.DXFBAS)),p(()=>to()!==BigInt(K.DXEBAS))))){pc=4100;break;}
      if(yield*io.and(p(()=>r('klflg')===0n),p(()=>r('critdm')===0n))){pc=4500;break;}yield*io.out2c('  ');if(r('klflg')!==0n)yield*io.crlf();yield*out('outh31',1);
      if(!long()){pc=4100;break;}yield*out('outh32',1);if(r('klflg')===0n){yield*out('outh33',1);pc=4500;break;}yield*out('outh34');pc=4100;break;
    case 4100:
      if(r('klflg')!==0n){yield*io.space();if(long())yield*io.crlf();if(r('klflg')!==2n){yield*obj('dispto');yield*out(of()<=0n?'outh10':'outh09',1);}yield*obj('dispto',1);yield*out('destry',1);}pc=4500;break;
    case 4500:yield*io.crlf();pc=100;break;
    case 4600:{if(of()<=0n)yield*io.outc('T');else yield*out('tormis');yield*io.odec(a('critdv'));const n=yield*bin('sub',word('iwhat'),integer(5)).evaluate();yield*out(n<0n?(of()<=0n?'outh13':'outh12'):n===0n?(of()<=0n?'outh15':'outh14'):(of()<=0n?'outh28':'outh27'));yield*loc('to',1);pc=100;break;}
    case 6000:
      if(high.read('shpdam',r('who'),K.KDRAD)>BigInt(K.KCRIT)){pc=100;break;}
      if((yield*io.bits('and',v(()=>high.read('nomsg')),v(()=>high.read('bits',r('who')))))!==0n){pc=100;break;}
      yield*obj('dispto',1);yield*loc('to');
      if(r('iwhat')===10n){if(of()<0n){yield*io.out2c(' D');yield*io.crlf();}else yield*out(of()===0n?'outh19':'outh18',1);}else{if(of()<0n){yield*io.out2c(' A');yield*io.crlf();}else yield*out(of()===0n?'outh17':'outh16',1);}pc=100;break;
    case 6800:yield*obj('dispfr',1);if(long())yield*out('outh20');yield*io.space();yield*loc('from',1);pc=100;break;
    case 6900:yield*obj('dispfr',1);if(long())yield*out('outh21');yield*io.oflt(a('ihita'));if(of()<=0n)yield*io.out2c(' >');else yield*out('outh22');yield*io.space();yield*obj('dispto',1);yield*io.crlf();pc=100;break;
    case 7300:yield*out(of()<=0n?'outh24':'outh23',1);pc=100;break;
    case 7600:yield*out(of()<=0n?'outh26':'outh25',1);pc=100;break;
    default:throw new Error('unreachable OUTHIT label');
  }
}
