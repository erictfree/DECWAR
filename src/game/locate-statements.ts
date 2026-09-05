import type { CommonBlock } from '../compat/memory.ts';
import { add36,multiply36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
import type { CheckPointServices,CheckStatementServices } from './check-statements.ts';
import type { WeaponExpression,WeaponPredicate,WeaponStatementServices,WeaponValueType } from './weapon-damage-statements.ts';

export type LocateStatementLocals={p:bigint;sign:bigint;max:bigint;k:bigint;i:bigint;j:bigint;index:bigint;dv:bigint;dh:bigint;locate:bigint;reloc:bigint};
export type LocateMessage='coord1'|'damcom'|'erloc1'|'erloc2'|'erloc3'|'erloc4'|'noship'|'erloc7'|'erloc8'|'erloc9';
export type LocateSymbols={absolute:bigint;relative:bigint;computed:bigint;romulan:bigint};
export type LocateStatementServices<W>=CheckPointServices<W>&Pick<WeaponStatementServices<W>,'logical'|'and'|'or'>&Pick<CheckStatementServices<W>,'isign'|'ingal'|'disp'>&{
  bounds(start:WeaponExpression<W>,limit:WeaponExpression<W>,step:1|-1):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint,step:1|-1):boolean;
  equal(tokenAddress:bigint,masterAddress:bigint):Generator<W,bigint,void>;
  out(message:LocateMessage,lines:0|1):Generator<W,void,void>;
  gtkn():Generator<W,void,void>;
  pause(milliseconds:WeaponExpression<W>):Generator<W,void,void>;
};

// LOCATE.FOR:36-169, including RELOC. Actual argument, local, return and COMMON
// words retain aliases and partial writes. Caller supplies both result addresses
// (which may alias), literal storage and compiler/numeric/DO/call policies.
export function* locateStatements<W>(entry:'locate'|'reloc',n:bigint,high:CommonBlock,low:CommonBlock,locals:LocateStatementLocals,s:LocateSymbols,io:LocateStatementServices<W>):Generator<W,bigint,void>{
  const m=low.memory;
  const value=(read:()=>bigint,type:WeaponValueType='integer'):WeaponExpression<W>=>({type,evaluate:function*(){return read();}});
  const integer=(v:bigint|number)=>value(()=>BigInt(v)),word=(a:()=>bigint,type:WeaponValueType='integer')=>value(()=>m.read(a()),type);
  const local=(name:keyof LocateStatementLocals)=>word(()=>locals[name],name==='dv'||name==='dh'?'real':'integer');
  const lo=(name:string)=>word(()=>low.address(name));
  const tokenAddress=(field:'tknlst'|'typlst'|'vallst',index:bigint)=>low.address(field,index);
  const token=(field:'tknlst'|'typlst'|'vallst',index:()=>bigint)=>word(()=>tokenAddress(field,index()));
  const lv=(name:keyof LocateStatementLocals)=>m.read(locals[name]);
  const own=(field:string,col:number)=>word(()=>high.address(field,low.read('who'),col));
  const binary=(op:'add'|'sub'|'mul',l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponExpression<W>=>({type:l.type==='real'||r.type==='real'?'real':'integer',evaluate:()=>io.binary(op,l,r)});
  const add=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>binary('add',l,r),sub=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>binary('sub',l,r),mul=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>binary('mul',l,r);
  const cmp=(op:Parameters<LocateStatementServices<W>['compare']>[0],l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponPredicate<W>=>()=>io.compare(op,l,r);
  const set=(a:()=>bigint,v:WeaponExpression<W>,type:WeaponValueType='integer')=>io.assign(a,type,v);
  const setLocal=(name:keyof LocateStatementLocals,v:WeaponExpression<W>)=>set(()=>locals[name],v,name==='dv'||name==='dh'?'real':'integer');
  const realZero=value(()=>io.realLiteral('0.0'),'real');
  const float=(v:WeaponExpression<W>):WeaponExpression<W>=>({type:'real',evaluate:()=>io.convert('real','float',v)});
  const result=()=>lv(entry),equals=(address:bigint)=>io.equal(tokenAddress('tknlst',lv('p')),address);
  function* abort(message?:LocateMessage):Generator<W,bigint,void>{
    if(message)yield*io.out(message,1);
    yield*setLocal('locate',integer(-1));yield*setLocal('reloc',local('locate'));return result();
  }
  function* offsets():Generator<W,void,void>{
    yield*setLocal('dv',float(own('shpcon',K.KVPOS)));yield*setLocal('dh',float(own('shpcon',K.KHPOS)));
  }
  function* countError():Generator<W,LocateMessage|undefined,void>{
    if(yield*io.and(cmp('gt',local('sign'),integer(0)),cmp('ne',local('locate'),local('max'))))return 'erloc1';
    if(yield*io.and(cmp('lt',local('sign'),integer(0)),cmp('gt',local('locate'),local('max'))))return 'erloc2';
  }
  // Captures compiler-evaluated bounds, but reads the live DO variable on each
  // source iteration/advancement. Complete generated loop instructions are open.
  function* doLoop(name:'i'|'j',start:WeaponExpression<W>,limit:WeaponExpression<W>,step:1|-1,body:()=>Generator<W,'break'|'abort'|void,void>):Generator<W,'break'|'abort'|void,void>{
    const b=yield*io.bounds(start,limit,step);m.write(locals[name],b.start);
    if(io.enterLoop(b.start,b.limit,step))do{
      const exit=yield*body();if(exit)return exit;
      m.write(locals[name],add36(lv(name),BigInt(step)));
    }while(step===1?lv(name)<=b.limit:lv(name)>=b.limit);
  }
  if(entry==='reloc'){yield*io.out('coord1',0);yield*io.gtkn();yield*setLocal('p',integer(1));}
  else yield*setLocal('p',integer(2));
  yield*setLocal('sign',{type:'integer',evaluate:()=>io.isign(integer(1),word(()=>n))});
  yield*setLocal('max',{type:'integer',evaluate:()=>io.iabs(word(()=>n))});
  if(low.read('typlst',1)===BigInt(K.KEOL))return yield*abort();
  yield*setLocal('dv',realZero);yield*setLocal('dh',realZero);
  if(low.read('icflg')!==BigInt(K.KABS))yield*offsets();
  let computed=false;
  if(io.logical(yield*equals(s.absolute))){
    yield*setLocal('p',add(local('p'),integer(1)));
    if(low.read('icflg')!==BigInt(K.KABS)){yield*setLocal('dv',realZero);yield*setLocal('dh',realZero);}
  }else if(io.logical(yield*equals(s.relative))){
    yield*setLocal('p',add(local('p'),integer(1)));if(low.read('icflg')!==BigInt(K.KREL))yield*offsets();
  }else computed=io.logical(yield*equals(s.computed));
  if(computed){
    if(high.read('shpdam',low.read('who'),K.KDCOMP)>=BigInt(K.KCRIT))return yield*abort('damcom');
    if(!(yield*io.or(function*(){return io.logical(low.read('pasflg'));},cmp('le',own('job',K.KTTYSP),integer(300)))))yield*io.pause(mul(own('job',K.KTTYSP),integer(2)));
    yield*setLocal('k',sub(lo('ntok'),local('p')));
    yield*doLoop('i',integer(1),local('k'),1,function*(){
      for(const field of ['tknlst','typlst','vallst'] as const)yield*set(()=>tokenAddress(field,lv('i')),token(field,()=>add36(lv('i'),lv('p'))));
    });
    yield*setLocal('locate',mul(local('k'),integer(2)));yield*setLocal('p',integer(1));
    if(low.read('typlst',1)===BigInt(K.KINT)){
      yield*setLocal('locate',sub(local('locate'),integer(1)));yield*setLocal('k',sub(local('k'),integer(1)));yield*setLocal('p',integer(2));
    }
    yield*set(()=>low.address('ntok'),local('locate'));yield*setLocal('reloc',local('locate'));
    if(lv('locate')===0n)return result();
    const error=yield*countError();if(error)return yield*abort(error);
    const first=()=>add36(multiply36(2n,lv('i')),-lv('p'));
    yield*doLoop('i',sub(add(local('k'),local('p')),integer(1)),local('p'),-1,function*(){
      const search=yield*doLoop('j',integer(1),integer(K.KNPLAY),1,function*(){
        if(low.read('typlst',lv('i'))!==BigInt(K.KALF)){yield*abort('erloc3');return 'abort';}
        if(io.logical(yield*io.equal(tokenAddress('tknlst',lv('i')),high.address('names',lv('j'),1))))return 'break';
      });
      if(search==='abort')return 'abort';
      if(search!=='break'){
        if(!io.logical(yield*io.equal(tokenAddress('tknlst',lv('i')),s.romulan))){yield*abort('erloc4');return 'abort';}
        if(!io.logical(high.read('rom'))){yield*abort('noship');return 'abort';}
        yield*set(()=>tokenAddress('vallst',first()),word(()=>high.address('locr',K.KVPOS)));
        yield*set(()=>tokenAddress('typlst',first()),integer(K.KINT));
        yield*set(()=>tokenAddress('vallst',add36(first(),1n)),word(()=>high.address('locr',K.KHPOS)));
        yield*set(()=>tokenAddress('typlst',add36(first(),1n)),integer(K.KINT));
      }else{
        if(!io.logical(high.read('alive',lv('j')))){yield*abort('noship');return 'abort';}
        if((yield*io.disp(high.address('shpcon',lv('j'),K.KVPOS),high.address('shpcon',lv('j'),K.KHPOS)))<=0n){yield*abort('noship');return 'abort';}
        yield*set(()=>tokenAddress('vallst',first()),word(()=>high.address('shpcon',lv('j'),K.KVPOS)));
        yield*set(()=>tokenAddress('typlst',first()),integer(K.KINT));
        yield*set(()=>tokenAddress('vallst',add36(first(),1n)),word(()=>high.address('shpcon',lv('j'),K.KHPOS)));
        yield*set(()=>tokenAddress('typlst',add36(first(),1n)),integer(K.KINT));
      }
    });
    return result();
  }
  yield*setLocal('locate',add(sub(lo('ntok'),local('p')),integer(1)));yield*setLocal('reloc',local('locate'));
  if(lv('locate')===0n)return result();
  const error=yield*countError();if(error)return yield*abort(error);
  const failed=yield*doLoop('i',local('p'),lo('ntok'),1,function*(){
    if(low.read('typlst',lv('i'))!==BigInt(K.KINT)){yield*abort('erloc7');return 'abort';}
  });
  if(failed)return result();
  yield*setLocal('index',integer(1));
  if((yield*io.mod(local('locate'),integer(2)))!==0n){
    yield*set(()=>tokenAddress('vallst',lv('index')),token('vallst',()=>lv('p')));yield*advance();
  }
  for(;;){
    if(lv('p')===add36(low.read('ntok'),1n))return result();
    yield*set(()=>tokenAddress('vallst',lv('index')),add(token('vallst',()=>lv('p')),local('dv')));
    if(!io.logical(yield*io.ingal(tokenAddress('vallst',lv('index')),5)))return yield*abort('erloc8');
    yield*advance();if(lv('p')===add36(low.read('ntok'),1n))return result();
    yield*set(()=>tokenAddress('vallst',lv('index')),add(token('vallst',()=>lv('p')),local('dh')));
    if(!io.logical(yield*io.ingal(5,tokenAddress('vallst',lv('index')))))return yield*abort('erloc9');
    yield*advance();
  }
  function* advance():Generator<W,void,void>{yield*setLocal('p',add(local('p'),integer(1)));yield*setLocal('index',add(local('index'),integer(1)));}
}
