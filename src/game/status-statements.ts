import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';

export type StatusItem='shields'|'location'|'condition'|'torpedo'|'energy'|'damage'|'radio';
export type StatusMessage='stat2m'|'stat2l'|'stat3m'|'stat3l'|'stat6m'|'stat6l'|'stat7m'|'stat7l'|
  'stat8m'|'stat8l'|'stat9m'|'stat9l'|'sta10m'|'sta10l'|'stat05'|'stat11'|'radio3'|'radio1'|'syntax';
export type StatusSymbols={
  switches:Record<StatusItem,bigint>; // Addresses of the six compiler strings and RADIO3.
  tokens:Record<'C'|'L'|'T'|'E'|'D'|'S'|'R',bigint>; // Actual compiled 1H literal words; no default padding.
};
export type StatusServices<W>={
  logical(word:bigint):boolean;
  enterLoop(start:bigint,limit:bigint,loop:'types'|'items'):boolean; // Required compiler DO entry policy.
  newlinePredicate(notAlpha:()=>boolean,isShort:()=>boolean):Generator<W,boolean,void>; // Compiler .AND. evaluation.
  product(left:()=>bigint,right:()=>bigint):Generator<W,bigint,void>; // Compiler integer arithmetic/evaluation order.
  integerAnd(left:()=>bigint,right:()=>bigint):Generator<W,bigint,void>;
  equal(tokenAddress:bigint,masterAddress:bigint):Generator<W,bigint,void>;
  out(message:StatusMessage,lines:0|1):Generator<W,void,void>;
  outc(character:'T'|'E'|'D'|'R'|'%'|'f'):Generator<W,void,void>;
  out2c(characters:'SD'|'SH'|'Of'|'On'):Generator<W,void,void>;
  crlf():Generator<W,void,void>;space():Generator<W,void,void>;
  odec(valueAddress:bigint,widthAddress:bigint):Generator<W,void,void>;
  oflt(valueAddress:bigint,widthAddress:bigint):Generator<W,void,void>;
  osfltValue(value:bigint,widthAddress:bigint):Generator<W,void,void>; // Required compiler expression temporary/call binding.
  ofltValue(value:bigint,widthAddress:bigint):Generator<W,void,void>;
  ocond(valueAddress:bigint):Generator<W,void,void>;
  prloc(vAddress:bigint,hAddress:bigint):Generator<W,void,void>; // Other source arguments: 0,0,KABS,SHORT.
};
// STATUS.FOR:34-162. Explicit compiler-local I/OBIT and STOKEN argument words.
// DO bounds are evaluated once on entry; exceptional active-control-variable
// changes and the actual compiler instruction/frame layout remain unimplemented.
export function* statusStatements<W>(high:CommonBlock,low:CommonBlock,stoken:bigint,locals:{i:bigint;obit:bigint},s:StatusSymbols,io:StatusServices<W>):Generator<W,void,void>{
  const m=low.memory,short=()=>low.read('oflg')===BigInt(K.SHORT);
  const ship=(column:number)=>high.address('shpcon',low.read('who'),column);
  const notAlpha=()=>low.read('typlst',m.read(locals.i))!==BigInt(K.KALF);
  const radioMask=()=>io.integerAnd(()=>high.read('bits',low.read('who')),()=>high.read('nomsg'));
  const advance=()=>m.write(locals.i,add36(m.read(locals.i),1n));
  function* endItem():Generator<W,void,void>{if(low.read('oflg')<0n)yield*io.space();else yield*io.crlf();}
  function* label(shortText:'SD'|'SH'|'T'|'E'|'D'|'R'|null,medium:StatusMessage,long:StatusMessage):Generator<W,void,void>{
    const format=low.read('oflg');
    if(format<0n){if(shortText==='SD'||shortText==='SH')yield*io.out2c(shortText);else if(shortText!==null)yield*io.outc(shortText);}
    else yield*io.out(format===0n?medium:long,0);
  }
  yield*io.crlf();m.write(locals.obit,4n);if(short())m.write(locals.obit,0n);
  if(low.read('typlst',m.read(stoken))===BigInt(K.KEOL)){
    yield*label('SD','stat2m','stat2l');yield*io.odec(ship(K.KNTURN),locals.obit);yield*endItem();
    low.write('typlst',BigInt(K.KEOL),add36(m.read(stoken),7n));
    for(const [offset,token] of (['C','L','T','E','D','S','R'] as const).entries())low.write('tknlst',s.tokens[token],add36(m.read(stoken),BigInt(offset)));
    const start=m.read(stoken),limit=add36(m.read(stoken),6n);m.write(locals.i,start);
    if(io.enterLoop(start,limit,'types'))do{low.write('typlst',BigInt(K.KALF),m.read(locals.i));advance();}while(m.read(locals.i)<=limit);
  }
  const start=m.read(stoken),limit=BigInt(K.KMAXTK);m.write(locals.i,start);
  if(!io.enterLoop(start,limit,'items'))return;
  do{
    if(yield*io.newlinePredicate(notAlpha,short))yield*io.crlf();
    if(notAlpha())return;
    let selected:StatusItem|undefined;
    for(const item of ['shields','location','condition','torpedo','energy','damage','radio'] as const){
      if(io.logical(yield*io.equal(low.address('tknlst',m.read(locals.i)),s.switches[item]))){selected=item;break;}
    }
    switch(selected){
      case 'shields':
        yield*label('SH','stat3m','stat3l');
        yield*io.osfltValue(yield*io.product(()=>m.read(ship(K.KSHCON)),()=>m.read(ship(K.KSSHPC))),locals.obit);
        if(!short())yield*io.outc('%');yield*io.space();
        if(!short()){
          yield*io.ofltValue(yield*io.product(()=>m.read(ship(K.KSSHPC)),()=>25n),locals.obit);
          yield*io.out('stat05',0);if(!short())yield*io.crlf();
        }
        break;
      case 'location':yield*label(null,'stat6m','stat6l');yield*io.prloc(ship(K.KVPOS),ship(K.KHPOS));yield*endItem();break;
      case 'condition':yield*label(null,'stat7m','stat7l');yield*io.ocond(ship(K.KSPCON));yield*endItem();break;
      case 'torpedo':yield*label('T','stat8m','stat8l');yield*io.odec(ship(K.KNTORP),locals.obit);yield*endItem();break;
      case 'energy':yield*label('E','stat9m','stat9l');yield*io.oflt(ship(K.KSNRGY),locals.obit);yield*endItem();break;
      case 'damage':yield*label('D','sta10m','sta10l');yield*io.oflt(ship(K.KSDAM),locals.obit);yield*endItem();break;
      case 'radio':
        yield*label('R','radio3','radio1');
        if(high.read('shpdam',low.read('who'),K.KDRAD)>=BigInt(K.KCRIT))yield*io.out('stat11',0);
        else{
          if((yield*radioMask())!==0n)yield*io.out2c('Of');
          if((yield*radioMask())!==0n)yield*io.outc('f');
          if((yield*radioMask())===0n)yield*io.out2c('On');
        }
        yield*endItem();break;
      default:yield*io.out('syntax',1);
    }
    advance();
  }while(m.read(locals.i)<=limit);
}
