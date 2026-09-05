import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import { constants as K } from '../generated/source-data.ts';
export const pointsMessages=['poin04','federa','empire','romula','poi11s','poi11l','poi12s','poi12l','poi13s','poi13l','poi14s','poi14l','poi15s','poi15l','poi16s','poi16l','poi17s','poi17l','poi18s','poi18l','poin19','poin20','poin21','poin22','poin23','poi03s','poi03l','poi07s','poi07l','poi05s','poi05l','poi06s','poi06l'] as const;
export const pointsSwitches=['ME','I','HUMANS','EMPIRE','KLINGONS','ROMULANS','ALL'] as const;
export type PointsMessage=typeof pointsMessages[number];
export type PointsSymbols=Record<typeof pointsSwitches[number]|'federa',bigint>;
export type PointsStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'and'|'or'|'binary'|'assign'>&{
  not(word:bigint):boolean;
  assignBoolean(destination:()=>bigint,value:boolean):Generator<W,void,void>;
  blkset(address:bigint,zero:0,count:4):Generator<W,void,void>;
  beginLoop(site:'switches'|'rows',index:bigint,start:2|1,limit:number):Generator<W,boolean,void>;
  continueLoop(site:'switches'|'rows',index:bigint):Generator<W,boolean,void>;
  equal(token:bigint,master:bigint):Generator<W,bigint,void>;
  out(message:PointsMessage,lines:0|1):Generator<W,void,void>;
  crlf():Generator<W,void,void>;
  tab(column:14|24|26|31):Generator<W,void,void>;
  space():Generator<W,void,void>;
  out2c(spaces:'  '):Generator<W,void,void>;
  out2w(first:()=>bigint,second:()=>bigint):Generator<W,void,void>;
  oflt(value:bigint|WeaponExpression<W>,width:11):Generator<W,void,void>;
  odec(value:bigint,width:bigint):Generator<W,void,void>;
  spaces(width:bigint):Generator<W,void,void>;
};
// POINTS.FOR:23-200. DFLG and I are caller/private words; POLOCL is shared.
// Final entry goes through label 600 without beginLoop. The supplied compiler
// continuation must handle that state; no implicit ALL-to-report shortcut.
export function* pointsStatements<W>(high:CommonBlock,low:CommonBlock,po:WordBlock,dflg:bigint,i:bigint,s:PointsSymbols,io:PointsStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,flags=['iflg','fflg','eflg','rflg'] as const;
  const v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),word=(address:()=>bigint)=>v(()=>m.read(address()));
  const integer=(n:number)=>v(()=>BigInt(n)),flag=(name:typeof flags[number])=>io.logical(po.read(name));
  const set=(name:typeof flags[number],value:boolean)=>io.assignBoolean(()=>po.address(name),value);
  const assign=(a:()=>bigint,e:WeaponExpression<W>)=>io.assign(a,'integer',e);
  const binary=(op:'add'|'div',a:WeaponExpression<W>,b:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.binary(op,a,b)});
  const eq=(name:keyof PointsSymbols)=>function*(){return io.logical(yield*io.equal(low.address('tknlst',m.read(i)),s[name]));};
  const predicate=(read:()=>boolean)=>function*(){return read();};
  function* all(){for(const f of ['fflg','eflg','rflg','iflg'] as const)yield*set(f,true);if(low.read('who')===0n)yield*set('iflg',false);}
  yield*io.blkset(po.address('total',1),0,4);
  let scan=false,direct=false;
  if(io.logical(m.read(dflg))){yield*all();scan=yield*io.continueLoop('switches',i);}
  else{
    for(const f of ['fflg','eflg','rflg','iflg'] as const)yield*set(f,false);
    if(low.read('ntok')>1n)scan=yield*io.beginLoop('switches',i,2,K.KMAXTK);
    else{
      if(low.read('who')!==0n)yield*set('iflg',true);
      if(flag('iflg'))direct=true;
      else for(const f of ['fflg','eflg','rflg'] as const)yield*set(f,true);
    }
  }
  while(scan){
    if(low.read('typlst',m.read(i))!==BigInt(K.KALF))break;
    if((yield*io.or(eq('ME'),eq('I')))&&low.read('who')!==0n)yield*set('iflg',true);
    else if(yield*io.or(eq('federa'),eq('HUMANS')))yield*set('fflg',true);
    else if(yield*io.or(eq('EMPIRE'),eq('KLINGONS')))yield*set('eflg',true);
    else if(yield*eq('ROMULANS')())yield*set('rflg',true);
    else if(yield*eq('ALL')())yield*all();
    else{yield*io.out('poin04',1);return;}
    scan=yield*io.continueLoop('switches',i);
  }
  if(!direct){
    if(io.not(high.read('romopt')))yield*set('rflg',false);
    if(!(yield*io.or(...(['fflg','eflg','rflg','iflg'] as const).map(f=>predicate(()=>flag(f)))))){yield*io.out('poin04',1);return;}
  }
  yield*io.crlf();const verbosity=low.read('oflg');yield*io.tab(verbosity<0n?14:verbosity===0n?24:31);
  if(!io.not(po.read('iflg'))){yield*io.space();yield*io.out2w(()=>high.address('names',low.read('who'),1),()=>high.address('names',low.read('who'),2));if(low.read('oflg')!==BigInt(K.SHORT))yield*io.out2c('  ');}
  for(const [f,label] of [['fflg','federa'],['eflg','empire']] as const)if(!io.not(po.read(f))){yield*io.out(label,0);yield*io.space();if(low.read('oflg')!==BigInt(K.SHORT))yield*io.out2c('  ');}
  if(flag('rflg'))yield*io.out('romula',0);yield*io.crlf();
  const scores=[()=>high.address('score',m.read(i),low.read('who')),()=>high.address('tmscor',1,m.read(i)),()=>high.address('tmscor',2,m.read(i)),()=>high.address('rsr',m.read(i))];
  let rows=yield*io.beginLoop('rows',i,1,K.KNPOIN);
  while(rows){
    const visible=yield*io.or(...flags.map((f,c)=>()=>io.and(predicate(()=>flag(f)),predicate(()=>m.read(scores[c]())!==0n))));
    if(visible){
      const index=m.read(i),title=index<1n||index>8n?1:Number(index);
      if(low.read('oflg')===BigInt(K.SHORT))yield*io.out(`poi1${title}s` as PointsMessage,0);
      if(low.read('oflg')!==BigInt(K.SHORT))yield*io.out(`poi1${title}l` as PointsMessage,0);
      if(low.read('oflg')===BigInt(K.LONG)){
        const annotation=[null,null,'poin22',null,'poin21','poin23','poin22','poin20','poin19'][title] as PointsMessage|null;
        if(annotation)yield*io.out(annotation,0);else yield*io.tab(26);
      }
      for(const [c,f] of flags.entries())if(!io.not(po.read(f))){
        yield*io.oflt(scores[c](),11);
        yield*assign(()=>po.address('total',c+1),binary('add',word(()=>po.address('total',c+1)),word(scores[c])));
      }
      yield*io.crlf();
    }
    rows=yield*io.continueLoop('rows',i);
  }
  function* title(short:PointsMessage,long:PointsMessage,column:24|26):Generator<W,void,void>{
    if(low.read('oflg')<0n)yield*io.out(short,0);
    else{yield*io.out(long,0);if(low.read('oflg')===BigInt(K.LONG))yield*io.tab(column);}
  }
  yield*title('poi03s','poi03l',26);for(const [c,f] of flags.entries())if(flag(f))yield*io.oflt(po.address('total',c+1),11);yield*io.crlf();
  if(yield*io.or(...(['fflg','eflg','rflg'] as const).map(f=>predicate(()=>flag(f))))){
    yield*title('poi07s','poi07l',24);yield*assign(()=>po.address('owidth'),integer(13));if(low.read('oflg')===BigInt(K.SHORT))yield*assign(()=>po.address('owidth'),integer(11));
    if(flag('iflg'))yield*io.spaces(po.address('owidth'));
    const counts=[()=>high.address('numshp',1),()=>high.address('numshp',2),()=>high.address('numrom')];
    for(const [c,f] of (['fflg','eflg','rflg'] as const).entries())if(flag(f))yield*io.odec(counts[c](),po.address('owidth'));
    yield*title('poi05s','poi05l',26);if(flag('iflg'))yield*io.spaces(po.address('owidth'));
    for(const [c,f] of (['fflg','eflg','rflg'] as const).entries())if(flag(f))yield*io.oflt(binary('div',word(()=>po.address('total',c+2)),word(counts[c])),11);
  }
  yield*title('poi06s','poi06l',26);
  const turns=[()=>high.address('shpcon',low.read('who'),K.KNTURN),()=>high.address('tmturn',1),()=>high.address('tmturn',2),()=>high.address('tmturn',3)];
  for(const [c,f] of flags.entries())if(flag(f))yield*io.oflt(binary('div',word(()=>po.address('total',c+1)),word(turns[c])),11);
  yield*io.crlf();
}
