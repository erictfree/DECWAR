import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import { constants as K } from '../runtime/variant-values.ts';

export const typeMessages=['ambswi','type01','type02','shtfrm','medfrm','lngfrm','type03','inform','normal','type04','type05','relfrm','bthfrm','absfrm','type08','type09','set008','decver','setu06','type06','setu07','type07'] as const;
export type TypeMessage=typeof typeMessages[number];
export type TypeStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'assign'|'compare'>&{
  not(word:bigint):boolean;
  twoLabelIf(field:'prtype'|'scnflg',value:WeaponExpression<W>):Generator<W,'first'|'second',void>;
  equal(token:bigint,literal:'O'|'OUTPUT'|'OPTION'):Generator<W,bigint,void>;
  out(message:TypeMessage,lines:0|1|2):Generator<W,void,void>;
  out2w(first:()=>bigint,second:()=>bigint):Generator<W,void,void>;
  crlf():Generator<W,void,void>;
  gtkn():Generator<W,void,void>;
};
// TYPE.FOR:34-103. KIND and P are actual argument/private storage. Callers
// must resolve the missing argument in PREGAM; this body supplies no default.
// Two-label IF, logical, assignment/comparison and argument evaluation remain
// compiler services. The option conditions are separate source statements.
export function* typeStatements<W>(high:CommonBlock,low:CommonBlock,kind:bigint,p:bigint,io:TypeStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}});
  const integer=(n:number)=>value(()=>BigInt(n)),argument=value(()=>m.read(kind));
  const setP=(n:number)=>io.assign(()=>p,'integer',integer(n));
  yield*setP(2);
  let report:'output'|'option'|undefined;
  if(yield*io.compare('eq',argument,integer(1)))report='output';
  else if(yield*io.compare('eq',argument,integer(2)))report='option';
  while(report===undefined){
    if(low.read('typlst',m.read(p))===BigInt(K.KALF)){
      if((yield*io.equal(low.address('tknlst',m.read(p)),'O'))===-2n)yield*io.out('ambswi',1);
      else if(io.logical(yield*io.equal(low.address('tknlst',m.read(p)),'OUTPUT')))report='output';
      else if(io.logical(yield*io.equal(low.address('tknlst',m.read(p)),'OPTION')))report='option';
    }
    if(report!==undefined)break;
    yield*io.out('type01',0);yield*io.gtkn();
    if(low.read('typlst',1)===BigInt(K.KEOL))return;
    yield*setP(1);
  }
  if(report==='output'){
    yield*io.out('type02',2);
    const format=low.read('oflg');yield*io.out(format<0n?'shtfrm':format===0n?'medfrm':'lngfrm',0);
    yield*io.out('type03',1);
    yield*io.out((yield*io.twoLabelIf('prtype',value(()=>low.read('prtype'))))==='first'?'inform':'normal',0);
    yield*io.out('type04',1);
    yield*io.out((yield*io.twoLabelIf('scnflg',value(()=>low.read('scnflg'))))==='first'?'shtfrm':'lngfrm',0);
    yield*io.out('type05',1);
    const input=low.read('icflg');yield*io.out(input<0n?'relfrm':input===0n?'bthfrm':'absfrm',0);
    yield*io.out('type08',1);
    const output=low.read('ocflg');yield*io.out(output<0n?'relfrm':output===0n?'bthfrm':'absfrm',0);
    yield*io.out('type09',1);yield*io.out('set008',0);
    yield*io.out2w(()=>high.address('ttydat',1,low.read('ttytyp')),()=>high.address('ttydat',2,low.read('ttytyp')));
    yield*io.crlf();
  }else{
    yield*io.crlf();yield*io.out('decver',1);
    if(io.logical(high.read('romopt')))yield*io.out('setu06',1);
    if(io.not(high.read('romopt')))yield*io.out('type06',1);
    if(io.logical(high.read('blhopt')))yield*io.out('setu07',1);
    if(io.not(high.read('blhopt')))yield*io.out('type07',1);
  }
}
