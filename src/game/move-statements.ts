import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import type { localLayout } from '../generated/local-layout.ts';
import { constants as K } from '../generated/source-data.ts';
import type { CommandReturn } from './maintenance.ts';
import type { WeaponExpression,WeaponStatementServices,WeaponPredicate,WeaponValueType } from './weapon-damage-statements.ts';
import type { CheckStatementArguments,CheckPointServices } from './check-statements.ts';
export type MoveStatementLocals={iflg:bigint;v:bigint;d:bigint;randam:bigint;time:bigint;tem:bigint;iv:bigint;ih:bigint;ia:bigint;tran:bigint;ied:bigint;indxto:bigint;indxfm:bigint;tl:bigint};
export type MoveMessage='wrpdam'|'impdam'|'error2'|'error1'|'move1a'|'move1b'|'move2s'|'move2l'|'move3s'|'move3l'|'engoff'|'move5l'|'move5s'|'move06'|'move08'|'move09'|'strdat'|'move10';
export type MoveCallWord<W>=bigint|WeaponExpression<W>; // address, or expression requiring a compiler temporary
export type MoveStatementServices<W>=Pick<WeaponStatementServices<W>,'binary'|'convert'|'compare'|'assign'|'realLiteral'|'logical'|'and'|'or'|'ran'>&Pick<CheckPointServices<W>,'iabs'>&{
  assignFalse(destination:()=>bigint,type:'integer'):Generator<W,void,void>;
  etim(startAddress:bigint):Generator<W,bigint,void>;
  iran(max:4000|100):Generator<W,bigint,void>;
  locate(entry:'locate'|'reloc',count:2):Generator<W,bigint,void>;
  check(args:CheckStatementArguments):Generator<W,void,void>;
  lock(boardAddress:bigint):Generator<W,void,void>;
  unlock(boardAddress:bigint):Generator<W,void,void>;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;
  setdsp(v:MoveCallWord<W>,h:MoveCallWord<W>,code:MoveCallWord<W>):Generator<W,void,void>;
  out(message:MoveMessage,lines:0|1):Generator<W,void,void>;
  out2c(text:'3.'|'6.'):Generator<W,void,void>;
  oflt(address:bigint,width:2|3):Generator<W,void,void>;
};
// MOVE.FOR:25-157, including IMPULS. MOVE's V1/H1/DISV/DISH are CHECK's
// physical H1/V1/DHS/DVS. Compiler operands, output/call temporaries and flag
// interpretation remain required. Lock failures are read from live LOWSEG.
export function* moveStatements<W>(entry:'move'|'impuls',high:CommonBlock,low:CommonBlock,out:WordBlock<typeof localLayout.check>,locals:MoveStatementLocals,io:MoveStatementServices<W>):Generator<W,CommandReturn,void>{
  const m=low.memory,value=(read:()=>bigint,type:WeaponValueType='integer'):WeaponExpression<W>=>({type,evaluate:function*(){return read();}});
  const integer=(n:bigint|number)=>value(()=>BigInt(n)),real=(t:string)=>value(()=>io.realLiteral(t),'real'),word=(a:()=>bigint,type:WeaponValueType='integer')=>value(()=>m.read(a()),type);
  const local=(n:keyof MoveStatementLocals)=>word(()=>locals[n],n==='d'?'real':'integer'),lo=(n:string)=>word(()=>low.address(n));
  const ship=(col:number)=>()=>high.address('shpcon',low.read('who'),col),device=(col:number)=>()=>high.address('shpdam',low.read('who'),col);
  const tow=(col:number)=>()=>high.address('shpcon',high.read('trstat',low.read('who')),col),tractor=()=>high.read('trstat',low.read('who'));
  const path=(name:'h1'|'v1'|'dhs'|'dvs'|'dcode')=>word(()=>out.address(name),name==='dhs'||name==='dvs'?'real':'integer');
  const bin=(op:Parameters<MoveStatementServices<W>['binary']>[0],l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponExpression<W>=>({type:l.type==='real'||r.type==='real'?'real':'integer',evaluate:()=>io.binary(op,l,r)});
  const add=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('add',l,r),sub=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('sub',l,r),mul=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('mul',l,r),div=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('div',l,r);
  const cmp=(op:Parameters<MoveStatementServices<W>['compare']>[0],l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponPredicate<W>=>()=>io.compare(op,l,r);
  const and=(...p:WeaponPredicate<W>[]):WeaponPredicate<W>=>()=>io.and(...p);
  const abs=(v:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.iabs(v)});
  const int=(v:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.convert('integer','int',v)});
  const set=(d:()=>bigint,v:WeaponExpression<W>,type:WeaponValueType='integer')=>io.assign(d,type,v),setLocal=(n:keyof MoveStatementLocals,v:WeaponExpression<W>)=>set(()=>locals[n],v,n==='d'?'real':'integer');
  const elapsed:WeaponExpression<W>={type:'integer',evaluate:()=>io.etim(high.address('tim0'))};
  const random:WeaponExpression<W>={type:'real',evaluate:()=>io.ran(0)},iran=(n:4000|100):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.iran(n)});
  const coordinate=(entry:'locate'|'reloc'):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.locate(entry,2)});
  const alt=():CommandReturn=>({alternateReturn:true}),index=(v:WeaponExpression<W>,h:WeaponExpression<W>)=>add(add(mul(sub(v,integer(1)),integer(25)),div(sub(h,integer(1)),integer(3))),integer(1));
  m.write(locals.iflg,entry==='move'?0n:1n);
  if(m.read(device(entry==='move'?K.KDWARP:K.KDIMP)())>=BigInt(K.KCRIT)){yield*io.out(entry==='move'?'wrpdam':'impdam',1);return alt();}
  yield*setLocal('v',add(add(elapsed,mul(word(()=>high.address('slwest')),integer(1000))),integer(1000)));
  yield*setLocal('d',real('0.0'));yield*setLocal('randam',iran(4000));yield*setLocal('time',div(local('randam'),integer(30)));
  yield*setLocal('tem',coordinate('locate'));
  for(;;){if(m.read(locals.tem)<0n)return alt();if(m.read(locals.tem)!==0n)break;yield*setLocal('tem',coordinate('reloc'));}
  for(;;){
    yield*setLocal('iv',sub(value(()=>low.read('vallst',1)),word(ship(K.KVPOS))));yield*setLocal('ih',sub(value(()=>low.read('vallst',2)),word(ship(K.KHPOS))));
    if(!(yield*and(cmp('eq',local('iv'),integer(0)),cmp('eq',local('ih'),integer(0)))()))break;
    yield*io.out(low.read('oflg')<=0n?'error2':'error1',1);
    if((yield*io.locate('reloc',2))<0n)return alt(); // Label 600 does not assign TEM or retry zero counts.
  }
  yield*set(ship(K.KSPCON),integer(K.GREEN));yield*io.assignFalse(()=>high.address('docked',low.read('who')),'integer');
  yield*setLocal('ia',bin('max',abs(local('iv')),abs(local('ih'))));
  if(m.read(device(K.KDCOMP)())>=BigInt(K.KCRIT))yield*setLocal('d',div(sub(random,real('0.5')),real('2.0')));
  if(m.read(locals.iflg)===1n){
    if(m.read(locals.ia)!==1n){if(low.read('oflg')===BigInt(K.LONG))yield*io.out('move1a',0);yield*io.out('move1b',1);return alt();}
  }else{
    if(m.read(locals.ia)>6n){
      yield*io.out(low.read('oflg')<=0n?'move3s':'move3l',0);
      if(m.read(device(K.KDWARP)())>0n)yield*io.out2c('3.');
      if(m.read(device(K.KDWARP)())===0n)yield*io.out2c('6.');return alt();
    }
    if(yield*and(cmp('gt',word(device(K.KDWARP)),integer(0)),cmp('gt',local('ia'),integer(3)))()){
      yield*io.out(low.read('oflg')<=0n?'move2s':'move2l',1);return alt();
    }
    if(m.read(locals.ia)>4n){
      if(low.read('oflg')===BigInt(K.LONG))yield*io.out('engoff',0);
      if(low.read('oflg')!==BigInt(K.SHORT))yield*io.out('move5l',1);
      if(low.read('oflg')===BigInt(K.SHORT))yield*io.out('move5s',1);
      yield*setLocal('tran',iran(100));
      if(yield*io.or(and(cmp('gt',local('tran'),integer(80)),cmp('ge',local('ia'),integer(6))),and(cmp('gt',local('tran'),integer(90)),cmp('eq',local('ia'),integer(5))))){
        yield*io.out('move06',0);yield*io.oflt(locals.randam,3);yield*io.out('move08',1);
        if(low.read('oflg')!==BigInt(K.SHORT)){yield*io.out('move09',0);yield*io.oflt(locals.time,2);yield*io.out('strdat',1);}
        yield*set(device(K.KDWARP),add(word(device(K.KDWARP)),local('randam')));
      }
    }
  }
  yield*io.check({h:ship(K.KVPOS)(),v:ship(K.KHPOS)(),dh:locals.iv,dv:locals.ih,dist:locals.ia,displ:locals.d});
  yield*setLocal('ied',mul(mul(integer(40),local('ia')),local('ia')));
  if(m.read(ship(K.KSHCON)())>0n)yield*setLocal('ied',mul(integer(2),local('ied')));
  if(tractor()!==0n)yield*setLocal('ied',mul(integer(3),local('ied')));
  yield*set(ship(K.KSNRGY),sub(word(ship(K.KSNRGY)),local('ied')));
  if(!(yield*and(cmp('eq',path('h1'),word(ship(K.KVPOS))),cmp('eq',path('v1'),word(ship(K.KHPOS))))())){
    yield*setLocal('indxto',index(path('h1'),path('v1')));yield*setLocal('indxfm',index(word(ship(K.KVPOS)),word(ship(K.KHPOS))));
    const board=(name:'indxto'|'indxfm')=>high.address('board',m.read(locals[name]));
    yield*io.lock(board('indxto'));if(io.logical(low.read('lkfail')))return alt();
    if(m.read(locals.indxto)!==m.read(locals.indxfm)){
      yield*io.lock(board('indxfm'));
      if(io.logical(low.read('lkfail'))){yield*io.unlock(board('indxto'));return alt();}
    }
    yield*io.setdsp(ship(K.KVPOS)(),ship(K.KHPOS)(),integer(0));
    yield*io.setdsp(out.address('h1'),out.address('v1'),add(mul(lo('team'),integer(100)),lo('who')));
    yield*set(ship(K.KVPOS),path('h1'));yield*set(ship(K.KHPOS),path('v1'));
    if(m.read(locals.indxto)!==m.read(locals.indxfm))yield*io.unlock(board('indxfm'));
    yield*io.unlock(board('indxto'));
    if(tractor()!==0n){
      yield*setLocal('tl',{type:'integer',evaluate:()=>io.disp(tow(K.KVPOS)(),tow(K.KHPOS)())});
      yield*io.setdsp(sub(path('h1'),int(path('dhs'))),sub(path('v1'),int(path('dvs'))),locals.tl);
      yield*io.setdsp(tow(K.KVPOS)(),tow(K.KHPOS)(),integer(0));
      yield*set(tow(K.KVPOS),sub(path('h1'),path('dhs')));yield*set(tow(K.KHPOS),sub(path('v1'),path('dvs')));
    }
  }
  if(out.read('dcode')!==0n)yield*io.out('move10',1);
  yield*set(()=>low.address('ptime'),sub(local('v'),elapsed));return {alternateReturn:false,pause:low.read('ptime')};
}
