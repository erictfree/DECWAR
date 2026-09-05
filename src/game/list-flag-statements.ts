import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36,divide36,multiply36,signed36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
export type ListFlagLabel='lstf01'|'lstf02'|'lstf03'|'lstf04'|'lstf05'|'lstf06'|'lstf07'|'lstf08'|'lstf09'|'lstf10'|'lstf11'|'lstf12'|'lstf13'|'lstf14'|'lstf15'|'lstf16'|'lstf17'|'known'|'ingame'|'inrang'|'inspra'|'type06'|'inactiveShip';
export type ListFlagServices<W>={
  logical(word:bigint):boolean;and(...terms:(()=>boolean)[]):Generator<W,boolean,void>;
  twoLabel(test:()=>boolean):Generator<W,boolean,void>;enterLoop(first:bigint,last:bigint):boolean;
  board(entry:'disp'|'dispc',v:bigint,h:bigint):Generator<W,bigint,void>;
  pdist(v:bigint,h:bigint,ov:bigint,oh:bigint):Generator<W,bigint,void>;
  update(mask:bigint,count:bigint,scan:bigint,flags:bigint):Generator<W,void,void>;
  object():Generator<W,void,void>;crlf():Generator<W,void,void>;
  out(key:ListFlagLabel,lines:0|1):Generator<W,void,void>;outActual(actual:bigint,lines:0):Generator<W,void,void>;
  odisp(actual:bigint,space:0):Generator<W,void,void>;
  prloc(v:bigint,h:bigint,mode:'absolute'|'session',verbosity:'short'|'long'):Generator<W,void,void>;
};
// LSTFLG.FOR:32-229. Local DUMMY is deliberately passed multiple times;
// explicit two-label IF and reversed-loop policies preserve compiler uncertainty.
export function* listFlagStatements<W>(high:CommonBlock,low:CommonBlock,list:WordBlock,l:Record<'d'|'scn'|'ctr'|'dummy'|'first'|'last'|'i'|'msg',bigint>,minusOne:bigint,labels:Record<ListFlagLabel,bigint>,io:ListFlagServices<W>):Generator<W,boolean,void>{
  const m=low.memory,rd=(key:string,...i:(number|bigint)[])=>list.read(key,...i),put=(key:string,w:bigint)=>list.write(key,w),B=(key:keyof typeof K)=>BigInt(K[key]),has=(key:string,flag:number)=>(rd(key)&BigInt(flag))!==0n,local=(key:keyof typeof l)=>m.read(l[key]);
  const location=(mode:'absolute'|'session',of:'short'|'long')=>io.prloc(list.address('vpos'),list.address('hpos'),mode,of),board=(entry:'disp'|'dispc')=>io.board(entry,list.address('vpos'),list.address('hpos'));
  const update=(mask:bigint,count:bigint,scan:bigint,flags:bigint)=>io.update(mask,count,scan,flags),tooFar=function*(){yield*io.out('lstf01',0);yield*location('absolute','short');return false;},absent=function*(){if(rd('cmd')===B('BASCMD'))yield*io.out('lstf02',0);if(rd('cmd')===B('PLNCMD'))yield*io.out('lstf03',0);if(rd('cmd')===B('TARCMD'))yield*io.out('lstf04',0);yield*location('session','long');return false;};
  const coordinate=function*():Generator<W,boolean,void>{
    put('code',yield*board('disp'));const div=divide36(rd('code'),100n);put('object',div.quotient);put('index',div.remainder);put('side',0n);m.write(l.d,yield*io.pdist(list.address('vpos'),list.address('hpos'),list.address('svpos'),list.address('shpos')));
    if(rd('object')===1n||rd('object')===2n){put('side',rd('object'));m.write(l.scn,0n);}else if(rd('object')===5n){put('side',3n);m.write(l.scn,0n);}else if(rd('object')===3n||rd('object')===4n){if(!has('omask',K.BASBIT))return yield*absent();put('side',add36(rd('object'),-2n));m.write(l.scn,high.read('base',rd('index'),4,rd('side')));}else if(rd('object')>=6n&&rd('object')<=8n){if(!has('omask',K.PLNBIT))return yield*absent();put('side',add36(rd('object'),-6n));m.write(l.scn,high.read('locpln',rd('index'),4));}else{if(local('d')>B('KRANGE'))return yield*tooFar();if(rd('cmd')!==B('LSTCMD'))return yield*absent();yield*io.object();return false;}
    m.write(l.ctr,0n);yield*update(l.dummy,l.ctr,l.scn,l.dummy);if(yield*io.twoLabel(()=>local('ctr')!==0n)){yield*io.object();return false;}return yield*tooFar();
  };
  put('gxf',B('IRNBIT'));if(rd('range')>B('KGALV'))put('gxf',B('IGMBIT'));if(has('imask',K.RNGBIT))put('gxf',B('ISRBIT'));put('grpbts',0n);
  if(yield*io.and(()=>rd('smask')!==high.read('sbits',low.read('team')),()=>rd('range')>B('KRANGE'),()=>rd('gxf')!==B('IGMBIT')))put('grpbts',B('KNOBIT'));put('gxf',signed36(rd('gxf')|rd('lmask')));
  if(has('imask',K.CRDBIT))return yield*coordinate();
  if(has('imask',K.NAMBIT)){
    yield*io.crlf();if(has('imask',K.ROMBIT)){if(!io.logical(high.read('romopt')))yield*io.out('type06',1);else if(!io.logical(high.read('rom')))yield*io.out('lstf05',1);else{put('side',3n);put('code',500n);put('object',5n);put('vpos',high.read('locr',K.KVPOS));put('hpos',high.read('locr',K.KHPOS));yield*update(l.dummy,l.dummy,minusOne,l.dummy);yield*io.object();}}
    if(rd('ships')!==0n)for(put('index',1n);rd('index')<=B('KNPLAY');put('index',add36(rd('index'),1n))){if((rd('ships')&high.read('bits',rd('index')))===0n)continue;put('side',1n);if(rd('index')>BigInt(K.KNPLAY/2))put('side',2n);put('object',rd('side'));put('code',add36(multiply36(rd('object'),100n),rd('index')));
      if(io.logical(high.read('alive',rd('index')))){put('vpos',high.read('shpcon',rd('index'),K.KVPOS));put('hpos',high.read('shpcon',rd('index'),K.KHPOS));if((yield*board('disp'))!==0n){yield*update(l.dummy,l.dummy,minusOne,l.dummy);yield*io.object();continue;}}
      yield*io.odisp(list.address('code'),0);yield*io.out('inactiveShip',1);
    }return false;
  }
  put('clsest',B('MAXINT'));
  if(has('omask',K.SHPBIT)){
    if(has('smask',K.ROMBIT)&&io.logical(high.read('rom'))){put('vpos',high.read('locr',1));put('hpos',high.read('locr',2));put('side',3n);m.write(l.scn,0n);if(has('gxf',K.IGMBIT))m.write(l.scn,-1n);if(has('imask',K.CLSBIT))m.write(l.scn,0n);yield*update(list.address('romlst'),list.address('romctr'),l.scn,list.address('rxf'));}
    m.write(l.first,1n);m.write(l.last,B('KNPLAY'));if(!has('smask',K.FEDBIT))m.write(l.first,BigInt(K.KNPLAY/2+1));if(!has('smask',K.EMPBIT))m.write(l.last,BigInt(K.KNPLAY/2));
    if(local('first')<=local('last')){const limit=local('last');for(m.write(l.i,local('first'));local('i')<=limit;m.write(l.i,add36(local('i'),1n))){if(!io.logical(high.read('alive',local('i'))))continue;put('vpos',high.read('shpcon',local('i'),K.KVPOS));put('hpos',high.read('shpcon',local('i'),K.KHPOS));if((yield*board('disp'))===0n)continue;put('side',1n);if(local('i')>BigInt(K.KNPLAY/2))put('side',2n);m.write(l.scn,0n);if(has('imask',K.CLSBIT)){if(!(yield*io.twoLabel(()=>local('i')!==low.read('who'))))continue;}else if(has('gxf',K.IGMBIT))m.write(l.scn,-1n);yield*update(list.address('shplst',local('i')),list.address('shpctr',rd('side')),l.scn,list.address('sxf',rd('side')));}}
  }
  if(has('omask',K.BASBIT)){
    m.write(l.first,1n);m.write(l.last,2n);if(!has('smask',K.FEDBIT))m.write(l.first,2n);if(!has('smask',K.EMPBIT))m.write(l.last,1n);const first=local('first'),last=local('last');put('side',first);
    if(io.enterLoop(first,last))do{for(m.write(l.i,1n);local('i')<=B('KNBASE');m.write(l.i,add36(local('i'),1n))){if(high.read('base',local('i'),3,rd('side'))<=0n)continue;put('vpos',high.read('base',local('i'),K.KVPOS,rd('side')));put('hpos',high.read('base',local('i'),K.KHPOS,rd('side')));yield*update(list.address('baslst',local('i'),rd('side')),list.address('basctr',rd('side')),high.address('base',local('i'),4,rd('side')),list.address('bxf',rd('side')));}put('side',add36(rd('side'),1n));}while(rd('side')<=last);
  }
  if(has('omask',K.PLNBIT)&&high.read('nplnet')!==0n){const limit=high.read('nplnet');m.write(l.i,1n);if(io.enterLoop(1n,limit))do{put('vpos',high.read('locpln',local('i'),K.KVPOS));put('hpos',high.read('locpln',local('i'),K.KHPOS));put('side',add36(yield*board('dispc'),-6n));if((rd('smask')&high.read('sbits',rd('side')))!==0n)yield*update(list.address('plnlst',local('i')),list.address('plnctr'),high.address('locpln',local('i'),4),list.address('pxf',rd('side')));m.write(l.i,add36(local('i'),1n));}while(local('i')<=limit);}
  if(has('imask',K.CLSBIT)){put('vpos',rd('vposc'));put('hpos',rd('hposc'));put('imask',signed36(rd('imask')&~B('CLSBIT')));if(!(yield*io.twoLabel(()=>rd('clsest')===B('MAXINT'))))return yield*coordinate();}
  else if((rd('grpbts')&(B('LSTBIT')|B('SUMBIT')))!==0n)return false;
  m.write(l.msg,labels.lstf06);if(low.read('oflg')!==B('LONG'))m.write(l.msg,labels.lstf07);yield*io.outActual(l.msg,0);if(has('grpbts',K.KNOBIT))yield*io.out('known',0);m.write(l.msg,0n);
  for(const [mask,key] of [[K.NEUBIT,'lstf08'],[K.FEDBIT,'lstf09'],[K.EMPBIT,'lstf10']] as const)if(rd('smask')===BigInt(mask))m.write(l.msg,labels[key]);if(yield*io.and(()=>rd('smask')===(B('FEDBIT')|B('EMPBIT')),()=>rd('omask')===B('PLNBIT')))m.write(l.msg,labels.lstf11);if(yield*io.and(()=>has('smask',K.ROMBIT),()=>!has('smask',K.NEUBIT)))m.write(l.msg,labels.lstf12);yield*io.outActual(l.msg,0);
  for(const [mask,key] of [[K.PLNBIT,'lstf13'],[K.BASBIT,'lstf14'],[K.SHPBIT,'lstf15'],[K.BASBIT|K.PLNBIT,'lstf16'],[K.PLNBIT|K.BASBIT|K.SHPBIT,'lstf17']] as const)if(rd('omask')===BigInt(mask))m.write(l.msg,labels[key]);yield*io.outActual(l.msg,0);
  if(low.read('oflg')!==B('SHORT')){m.write(l.msg,labels.ingame);if(has('grpbts',K.IRNBIT))m.write(l.msg,labels.inrang);if(has('grpbts',K.ISRBIT))m.write(l.msg,labels.inspra);if(has('grpbts',K.IGMBIT))m.write(l.msg,labels.ingame);yield*io.outActual(l.msg,0);}yield*io.crlf();return true;
}
