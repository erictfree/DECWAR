import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36,signed36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export const listKeywords=['&','AND','ROMULAN','SHIPS','BASES','PLANETS','PORTS','FRIENDLY','ENEMY','TARGETS','FEDERATION','HUMAN','EMPIRE','KLINGON','NEUTRAL','CAPTURED','ALL','CLOSEST','LIST','SUMMARY'] as const;
export type ListKeyword=typeof listKeywords[number];
export type ListScanStatementServices<W>={
  logical(word:bigint):boolean;equal(a:bigint,b:bigint):Generator<W,bigint,void>;
  and(...terms:(()=>Generator<W,boolean,void>)[]):Generator<W,boolean,void>;
  implicitShip(actual:bigint):bigint;
  sideBranch(friendly:boolean,test:()=>boolean):Generator<W,2500|2600,void>;
  out(key:'lsts01'|'lsts02'|'lsts03'|'lsts04',lines:0|1):Generator<W,void,void>;
  outw(actual:bigint):Generator<W,void,void>;crlf():Generator<W,void,void>;
  ingal(v:bigint,h:bigint):Generator<W,bigint,void>;prloc(v:bigint,h:bigint):Generator<W,void,void>;
};
// LSTSCN.FOR:31-294. TOKEN is a saved one-word copy, not the live TKNLST
// element. The typo SHIP is a distinct uninitialized compiler local.
export function* listScanStatements<W>(high:CommonBlock,low:CommonBlock,list:WordBlock,l:{op:bigint;token:bigint;i:bigint;ship:bigint},s:Record<ListKeyword,bigint>,io:ListScanStatementServices<W>):Generator<W,boolean,void>{
  const m=low.memory,rd=(key:string)=>list.read(key),put=(key:string,w:bigint)=>list.write(key,w),B=(key:keyof typeof K)=>BigInt(K[key]),has=(mask:bigint)=>(rd('imask')&mask)!==0n,or=(key:string,w:bigint)=>put(key,signed36(rd(key)|w)),mask=(key:string,w:bigint)=>put(key,signed36(rd(key)&w)),pred=(f:()=>boolean)=>function*(){return f();};
  const matches=(key:ListKeyword)=>function*(){return io.logical(yield*io.equal(l.token,s[key]));},error=function*(syntax=true){yield*io.out(syntax?'lsts03':'lsts02',0);yield*io.outw(l.token);yield*io.crlf();return true;};
  const allObjects=B('SHPBIT')|B('BASBIT')|B('PLNBIT'),allSides=B('FEDBIT')|B('EMPBIT')|B('NEUBIT')|B('ROMBIT');
  put('omask',allObjects);put('smask',allSides);put('lmask',B('LSTBIT'));put('range',B('MAXINT'));
  switch(rd('cmd')){case BigInt(K.SUMCMD):put('lmask',B('SUMBIT'));break;case BigInt(K.BASCMD):put('omask',B('BASBIT'));put('smask',high.read('sbits',low.read('team')));or('lmask',B('SUMBIT'));break;case BigInt(K.PLNCMD):put('omask',B('PLNBIT'));put('smask',B('FEDBIT')|B('EMPBIT')|B('NEUBIT'));put('range',B('KRANGE'));break;case BigInt(K.TARCMD):put('smask',high.read('sbits',add36(3n,-low.read('team')))|B('ROMBIT'));put('range',B('KRANGE'));break;}
  put('imask',0n);put('ships',0n);put('vpos',0n);put('hpos',0n);m.write(l.op,rd('p'));
  for(;;){put('p',add36(rd('p'),1n));if(rd('p')>B('KMAXTK'))return true;
    let end=low.read('typlst',rd('p'))===B('KEOL');if(!end){m.write(l.token,low.read('tknlst',rd('p')));end=(yield*matches('&')())||(yield*matches('AND')());}
    if(end){if(rd('p')!==add36(m.read(l.op),1n)||m.read(l.op)===1n)return false;yield*io.out('lsts01',1);return true;}
    let action=1400;
    if(yield*io.and(pred(()=>low.read('typlst',rd('p'))===B('KINT')),pred(()=>low.read('typlst',add36(rd('p'),1n))===B('KINT'))))action=2200;
    else if(low.read('typlst',rd('p'))===B('KINT'))action=2900;
    else if(low.read('typlst',rd('p'))===B('KALF')){
      if(rd('cmd')===B('LSTCMD')||rd('cmd')===B('TARCMD')){
        for(m.write(l.i,1n);m.read(l.i)<=B('KNPLAY');m.write(l.i,add36(m.read(l.i),1n)))if(io.logical(yield*io.equal(l.token,high.address('names',m.read(l.i),1)))){action=1800;break;}
        if(action===1400&&(yield*matches('ROMULAN')()))action=1700;
      }
      if(action===1400&&[B('LSTCMD'),B('SUMCMD'),B('TARCMD')].includes(rd('cmd')))for(const [key,label] of [['SHIPS',1900],['BASES',2000],['PLANETS',2100],['PORTS',2150]] as const)if(yield*matches(key)()){action=label;break;}
      if(action===1400&&rd('cmd')!==B('TARCMD'))for(const [key,label] of [['FRIENDLY',2300],['ENEMY',2400],['TARGETS',2400],['FEDERATION',2500],['HUMAN',2500],['EMPIRE',2600],['KLINGON',2600]] as const)if(yield*matches(key)()){action=label;break;}
      if(action===1400&&rd('cmd')!==B('BASCMD')&&rd('cmd')!==B('TARCMD')){if(yield*matches('NEUTRAL')())action=2700;else if(yield*matches('CAPTURED')())action=2800;}
      if(action===1400){if(yield*matches('ALL')())action=2850;else if(yield*io.and(pred(()=>rd('cmd')!==B('SUMCMD')),matches('CLOSEST')))action=3000;else if(yield*io.and(pred(()=>rd('cmd')!==B('LSTCMD')),pred(()=>rd('cmd')!==B('SUMCMD')),matches('LIST')))action=3100;else if(yield*io.and(pred(()=>rd('cmd')!==B('SUMCMD')),matches('SUMMARY')))action=3200;}
    }
    if(action===2300||action===2400){if(low.read('who')===0n)return yield*error();if(action===2300)mask('smask',~B('ROMBIT'));else or('smask',B('ROMBIT'));action=yield*io.sideBranch(action===2300,()=>low.read('team')===1n);}
    switch(action){
      case 1400:return yield*error(false);
      case 1700:if(has(B('ROMBIT')))return yield*error();or('imask',B('ROMBIT')|B('NAMBIT'));put('omask',B('SHPBIT'));break;
      case 1800:if(has(~(B('NAMBIT')|B('ROMBIT'))))return yield*error();or('imask',B('NAMBIT'));if((io.implicitShip(l.ship)&high.read('bits',m.read(l.i)))!==0n)return yield*error();or('ships',high.read('bits',m.read(l.i)));put('omask',B('SHPBIT'));break;
      case 1900:case 2000:if(has(B('OBJMSK')|B('NEUBIT')|B('CAPBIT')))return yield*error();or('imask',action===1900?B('SHPBIT'):B('BASBIT'));put('omask',action===1900?B('SHPBIT'):B('BASBIT'));mask('smask',B('FEDBIT')|B('EMPBIT')|(action===1900?B('ROMBIT'):0n));break;
      case 2100:if(has(B('OBJMSK')))return yield*error();or('imask',B('PLNBIT'));put('omask',B('PLNBIT'));mask('smask',B('FEDBIT')|B('EMPBIT')|B('NEUBIT'));break;
      case 2150:if(low.read('who')===0n||has(B('OBJMSK')))return yield*error();or('imask',B('PRTBIT'));if(!has(B('NEUBIT')))put('omask',B('BASBIT')|B('PLNBIT'));if(!has(B('SIDMSK')))put('smask',high.read('sbits',low.read('team'))|B('NEUBIT'));mask('smask',~B('ROMBIT'));break;
      case 2200:if(rd('cmd')===B('SUMCMD')||has(B('OBJMSK')|B('SIDMSK')|B('ALLBIT')|B('RNGBIT')|B('CLSBIT')|B('OUTMSK')))return yield*error();or('imask',B('CRDBIT'));put('vpos',low.read('vallst',rd('p')));put('hpos',low.read('vallst',add36(rd('p'),1n)));put('p',add36(rd('p'),1n));if(rd('p')>B('KMAXTK'))return true;if(io.logical(yield*io.ingal(list.address('vpos'),list.address('hpos'))))break;yield*io.out('lsts04',0);yield*io.prloc(list.address('vpos'),list.address('hpos'));return true;
      case 2500:case 2600:{if(has(B('SIDMSK')|B('CRDBIT')))return yield*error();const bit=action===2500?B('FEDBIT'):B('EMPBIT');or('imask',bit);put('smask',(rd('smask')&B('ROMBIT'))|bit);break;}
      case 2700:case 2800:if(has(B('SIDMSK')|(B('OBJMSK')&~B('PLNBIT'))))return yield*error();or('imask',action===2700?B('NEUBIT'):B('CAPBIT'));put('smask',action===2700?B('NEUBIT'):B('FEDBIT')|B('EMPBIT'));put('omask',B('PLNBIT'));break;
      case 2850:if(has(B('ALLBIT')|B('CRDBIT')))return yield*error();or('imask',B('ALLBIT'));if(yield*io.and(pred(()=>!has(B('SIDMSK'))),pred(()=>rd('cmd')!==B('TARCMD'))))put('smask',allSides);if(!has(B('RNGBIT')))put('range',B('MAXINT'));break;
      case 2900:if(low.read('who')===0n||has(B('RNGBIT')|B('CRDBIT')))return yield*error();or('imask',B('RNGBIT'));put('range',low.read('vallst',rd('p')));if(rd('range')<1n)return yield*error();break;
      case 3000:if(low.read('who')===0n||has(B('CLSBIT')|B('CRDBIT')|B('OUTMSK')))return yield*error();or('imask',B('CLSBIT'));put('lmask',B('LSTBIT'));if(!has(B('RNGBIT')))put('range',B('MAXINT'));break;
      case 3100:case 3200:{if(has(B('OUTMSK')|B('CRDBIT')|B('CLSBIT')|B('NAMBIT')))return yield*error();const isList=action===3100,bit=isList?B('LSTBIT'):B('SUMBIT');or('imask',bit);if(!isList&&!has(B('RNGBIT')))put('range',B('MAXINT'));or('lmask',bit);if(yield*io.and(pred(()=>rd('cmd')!==(isList?B('SUMCMD'):B('LSTCMD'))),pred(()=>!has(isList?B('SUMBIT'):B('LSTBIT')))))put('lmask',bit);break;}
    }
  }
}
