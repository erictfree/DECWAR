import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36,multiply36,signed36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
export type ListReportLabel='outOfRange'|'builds'|'build3'|'buildAbbreviation'|'known'|'inrang'|'inspra'|'ingame';
export type ListReportServices<W>={
  or(...terms:(()=>boolean)[]):Generator<W,boolean,void>;and(...terms:(()=>boolean)[]):Generator<W,boolean,void>;
  out(key:ListReportLabel,lines:0):Generator<W,void,void>;outActual(actual:bigint,lines:0):Generator<W,void,void>;
  outc(char:'*'|'%'|'s'):Generator<W,void,void>;space():Generator<W,void,void>;crlf():Generator<W,void,void>;
  odisp(actual:bigint,space:0):Generator<W,void,void>;tab(n:14|5):Generator<W,void,void>;
  prloc(v:bigint,h:bigint):Generator<W,void,void>;
  numeric(entry:'oflt'|'osflt'|'odec',actual:bigint,width:6|3):Generator<W,void,void>;
};
// LSTOBJ.FOR:43-87. Computed-GOTO fallthrough is the Romulan row even for
// object codes outside 1:8. Preserve the independent post-output verbosity tests.
export function* listObjectStatements<W>(high:CommonBlock,low:CommonBlock,list:WordBlock,l:{spc:bigint;b:bigint},io:ListReportServices<W>):Generator<W,void,void>{
  const m=low.memory,rd=(key:string)=>list.read(key),location=()=>io.prloc(list.address('vpos'),list.address('hpos')),distant=()=>(rd('xf')&BigInt(K.ORNBIT))!==0n;
  if(yield*io.or(()=>rd('side')===0n,()=>rd('side')===low.read('team'),()=>rd('cmd')===BigInt(K.TARCMD)))yield*io.space();else yield*io.outc('*');yield*io.odisp(list.address('code'),0);
  if(low.read('oflg')===BigInt(K.LONG))yield*io.tab(14);if(low.read('oflg')!==BigInt(K.LONG))yield*io.tab(5);
  const object=rd('object');
  if(object===3n||object===4n){yield*location();if(!distant()){yield*io.numeric('oflt',high.address('base',rd('index'),3,rd('side')),6);if(low.read('oflg')!==BigInt(K.SHORT))yield*io.outc('%');}}
  else if(object>=6n&&object<=8n){yield*location();m.write(l.b,high.read('locpln',rd('index'),3));if(m.read(l.b)!==0n){yield*io.numeric('odec',l.b,6);
    if(yield*io.and(()=>low.read('oflg')===BigInt(K.LONG),()=>m.read(l.b)!==1n))yield*io.out('builds',0);
    if(yield*io.and(()=>low.read('oflg')===BigInt(K.LONG),()=>m.read(l.b)===1n))yield*io.out('build3',0);if(low.read('oflg')===BigInt(K.MEDIUM))yield*io.out('buildAbbreviation',0);
  }}else if(distant())yield*io.out('outOfRange',0);else{
    yield*location();if(object===1n||object===2n){m.write(l.spc,multiply36(high.read('shpcon',rd('index'),K.KSHCON),high.read('shpcon',rd('index'),K.KSSHPC)));yield*io.numeric('osflt',l.spc,6);}else yield*io.numeric('oflt',high.address('erom'),6);
    if(low.read('oflg')!==BigInt(K.SHORT))yield*io.outc('%');
  }yield*io.crlf();
}
// LSTSUM.FOR:30-44. N can alias F, and output can modify both before later tests.
export function* listSummaryStatements<W>(low:CommonBlock,a:{n:bigint;str:bigint;f:bigint},msg:bigint,s:Record<'inrang'|'inspra'|'ingame',bigint>,io:ListReportServices<W>):Generator<W,void,void>{
  const m=low.memory;if(m.read(a.n)===0n)return;yield*io.numeric('odec',a.n,3);if((m.read(a.f)&BigInt(K.KNOBIT))!==0n)yield*io.out('known',0);yield*io.space();yield*io.outActual(a.str,0);if(m.read(a.n)!==1n)yield*io.outc('s');
  if(low.read('oflg')!==BigInt(K.SHORT)){m.write(msg,s.inrang);if((m.read(a.f)&BigInt(K.ISRBIT))!==0n)m.write(msg,s.inspra);if((m.read(a.f)&BigInt(K.IGMBIT))!==0n)m.write(msg,s.ingame);yield*io.outActual(msg,0);}yield*io.crlf();m.write(a.n,0n);
}
export type ListOutputServices<W>={crlf():Generator<W,void,void>;object():Generator<W,void,void>;summary(n:bigint,text:'romulan'|'fedshp'|'empshp'|'fedbas'|'empbas'|'neupln'|'fedpln'|'emppln'|'target',flags:bigint):Generator<W,void,void>;dispc(v:bigint,h:bigint):Generator<W,bigint,void>;enterLoop(first:bigint,last:bigint):boolean;};
// LSTOUT.FOR:31-132. SUM persists between categories; LSTSUM clears only the
// counters it is passed, and TARGET bypasses those category summaries.
export function* listOutputStatements<W>(high:CommonBlock,low:CommonBlock,list:WordBlock,l:{sum:bigint;nt:bigint;first:bigint;last:bigint},io:ListOutputServices<W>):Generator<W,void,void>{
  const m=low.memory,rd=(key:string,...i:(number|bigint)[])=>list.read(key,...i),put=(key:string,w:bigint)=>list.write(key,w),has=(bit:number)=>(rd('xf')&BigInt(bit))!==0n,sum=()=>l.sum+rd('side'),inc=(a:bigint)=>m.write(a,add36(m.read(a),1n)),target=()=>rd('cmd')===BigInt(K.TARCMD);
  for(let i=0;i<=2;i++)m.write(l.sum+BigInt(i),0n);m.write(l.nt,0n);
  if(rd('romctr')!==0n){put('xf',rd('romlst'));if(has(K.LSTBIT)){put('side',3n);put('code',BigInt(K.DXROM*100));put('object',BigInt(K.DXROM));put('vpos',high.read('locr',K.KVPOS));put('hpos',high.read('locr',K.KHPOS));yield*io.crlf();yield*io.object();}if(has(K.SUMBIT)){inc(l.nt);yield*io.crlf();yield*io.summary(list.address('romctr'),'romulan',list.address('rxf'));}}
  m.write(l.first,1n);m.write(l.last,BigInt(K.KNPLAY));if(rd('shpctr',1)===0n)m.write(l.first,BigInt(K.KNPLAY/2+1));if(rd('shpctr',2)===0n)m.write(l.last,BigInt(K.KNPLAY/2));
  if(m.read(l.first)<=m.read(l.last)){yield*io.crlf();const limit=m.read(l.last);for(put('index',m.read(l.first));rd('index')<=limit;put('index',add36(rd('index'),1n))){put('xf',rd('shplst',rd('index')));if(rd('xf')===0n)continue;put('side',1n);if(rd('index')>BigInt(K.KNPLAY/2))put('side',2n);
    if(has(K.LSTBIT)){put('object',rd('side'));put('code',add36(multiply36(rd('object'),100n),rd('index')));put('vpos',high.read('shpcon',rd('index'),K.KVPOS));put('hpos',high.read('shpcon',rd('index'),K.KHPOS));yield*io.object();}if(has(K.SUMBIT)){inc(sum());if(rd('side')!==low.read('team'))inc(l.nt);}
  }if(!target()){yield*io.crlf();yield*io.summary(l.sum+1n,'fedshp',list.address('sxf',1));yield*io.summary(l.sum+2n,'empshp',list.address('sxf',2));}}
  m.write(l.first,1n);m.write(l.last,2n);if(rd('basctr',1)===0n)m.write(l.first,2n);if(rd('basctr',2)===0n)m.write(l.last,1n);
  if(m.read(l.first)<=m.read(l.last)){yield*io.crlf();const limit=m.read(l.last);for(put('side',m.read(l.first));rd('side')<=limit;put('side',add36(rd('side'),1n)))for(put('index',1n);rd('index')<=BigInt(K.KNBASE);put('index',add36(rd('index'),1n))){put('xf',rd('baslst',rd('index'),rd('side')));if(rd('xf')===0n)continue;
    if(has(K.LSTBIT)){put('object',add36(rd('side'),2n));put('code',add36(multiply36(rd('object'),100n),rd('index')));put('vpos',high.read('base',rd('index'),K.KVPOS,rd('side')));put('hpos',high.read('base',rd('index'),K.KHPOS,rd('side')));yield*io.object();if(!has(K.PASBIT))high.write('base',signed36(high.read('base',rd('index'),4,rd('side'))|low.read('team')),rd('index'),4,rd('side'));}if(has(K.SUMBIT)){inc(sum());if(rd('side')!==low.read('team'))inc(l.nt);}
  }if(!target()){yield*io.crlf();yield*io.summary(l.sum+1n,'fedbas',list.address('bxf',1));yield*io.summary(l.sum+2n,'empbas',list.address('bxf',2));}}
  if(rd('plnctr')!==0n){yield*io.crlf();const limit=high.read('nplnet');put('index',1n);if(io.enterLoop(1n,limit))do{put('xf',rd('plnlst',rd('index')));if(rd('xf')!==0n){put('vpos',high.read('locpln',rd('index'),K.KVPOS));put('hpos',high.read('locpln',rd('index'),K.KHPOS));put('object',yield*io.dispc(list.address('vpos'),list.address('hpos')));put('side',add36(rd('object'),-6n));
    if(has(K.LSTBIT)){put('code',add36(multiply36(rd('object'),100n),rd('index')));yield*io.object();if(!has(K.PASBIT))high.write('locpln',signed36(high.read('locpln',rd('index'),4)|low.read('team')),rd('index'),4);}if(has(K.SUMBIT)){inc(sum());if(rd('side')===add36(3n,-low.read('team')))inc(l.nt);}}
    put('index',add36(rd('index'),1n));
  }while(rd('index')<=limit);if(!target()){yield*io.crlf();yield*io.summary(l.sum,'neupln',list.address('pxf',0));yield*io.summary(l.sum+1n,'fedpln',list.address('pxf',1));yield*io.summary(l.sum+2n,'emppln',list.address('pxf',2));}}
  if(target()&&m.read(l.nt)!==0n){yield*io.crlf();yield*io.summary(l.nt,'target',list.address('txf'));}
}
