import type { WordMemory,WordBlock } from '../compat/memory.ts';
import type { localLayout } from '../generated/local-layout.ts';
import { add36 } from '../compat/word36.ts';
import type { WeaponExpression,WeaponStatementServices,WeaponValueType } from './weapon-damage-statements.ts';
export type CheckPointServices<W>=Pick<WeaponStatementServices<W>,'binary'|'convert'|'compare'|'assign'|'realLiteral'>&{
  iabs(value:WeaponExpression<W>):Generator<W,bigint,void>;
  mod(left:WeaponExpression<W>,right:WeaponExpression<W>):Generator<W,bigint,void>;
};
export type CheckStatementArguments={h:bigint;v:bigint;dh:bigint;dv:bigint;dist:bigint;displ:bigint};
export type CheckStatementLocals={inc:bigint;i:bigint;rh:bigint;rv:bigint;ih1:bigint;ih2:bigint;iv1:bigint;iv2:bigint};
export type CheckStatementServices<W>=CheckPointServices<W>&{
  logical(word:bigint):boolean;
  isign(magnitude:WeaponExpression<W>,sign:WeaponExpression<W>):Generator<W,bigint,void>;
  bounds(start:WeaponExpression<W>,limit:WeaponExpression<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint):boolean;
  // Bigints are actual argument addresses; number 5 is the source literal.
  ingal(first:bigint|5,second:bigint|5):Generator<W,bigint,void>;
  disp(first:bigint,second:bigint):Generator<W,bigint,void>;
  chkpnt(c:bigint,c1:bigint,c2:bigint):Generator<W,void,void>;
  ran(zero:0):Generator<W,bigint,void>;
};
function expressions<W>(m:WordMemory,io:CheckPointServices<W>){
  const value=(read:()=>bigint,type:WeaponValueType='integer'):WeaponExpression<W>=>({type,evaluate:function*(){return read();}});
  const integer=(n:bigint|number)=>value(()=>BigInt(n)),real=(text:string)=>value(()=>io.realLiteral(text),'real');
  const word=(a:bigint,type:WeaponValueType='integer')=>value(()=>m.read(a),type);
  const binary=(op:'add'|'sub'|'mul'|'div',l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponExpression<W>=>({type:l.type==='real'||r.type==='real'?'real':'integer',evaluate:()=>io.binary(op,l,r)});
  const convert=(type:WeaponValueType,reason:'float'|'int',v:WeaponExpression<W>):WeaponExpression<W>=>({type,evaluate:()=>io.convert(type,reason,v)});
  const iabs=(v:WeaponExpression<W>):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.iabs(v)});
  const set=(a:bigint,type:WeaponValueType,v:WeaponExpression<W>)=>io.assign(()=>a,type,v);
  return {value,integer,real,word,binary,convert,iabs,set};
}
// CHKPNT.FOR:29-41. All three arguments are actual words, including aliases.
// Strict integer hundredths, signed MOD and separate C1/C2 writes are retained.
// Intrinsic semantics and REAL words are required compiler/runtime services.
export function* checkPointStatements<W>(m:WordMemory,args:{c:bigint;c1:bigint;c2:bigint},io:CheckPointServices<W>):Generator<W,void,void>{
  const e=expressions(m,io),c=()=>e.word(args.c,'real');
  const hundredths=e.convert('integer','int',e.binary('mul',c(),e.integer(100)));
  const remainder:WeaponExpression<W>={type:'integer',evaluate:()=>io.mod(hundredths,e.integer(100))};
  if(yield*io.compare('lt',e.iabs(e.binary('sub',remainder,e.integer(50))),e.integer(10))){
    yield*e.set(args.c1,'integer',e.convert('integer','int',c()));
    yield*e.set(args.c2,'integer',e.binary('add',e.word(args.c1),e.integer(1)));
  }else{
    yield*e.set(args.c1,'integer',e.convert('integer','int',e.binary('add',c(),e.real('.5'))));
    yield*e.set(args.c2,'integer',e.integer(0));
  }
}
// CHECK.FOR:36-95. Names follow CHECK's physical /CHKOUT/ declaration.
// Direction/coordinate words and caller locals stay live across each yielded
// operation. Ordinary DO advancement is modeled; full compiler instructions,
// reversed entry policy, argument temporaries and return frames remain explicit.
export function* checkStatements<W>(m:WordMemory,out:WordBlock<typeof localLayout.check>,args:CheckStatementArguments,locals:CheckStatementLocals,io:CheckStatementServices<W>):Generator<W,void,void>{
  const e=expressions(m,io),arg=(name:keyof CheckStatementArguments)=>e.word(args[name],name==='displ'?'real':'integer');
  const local=(name:keyof CheckStatementLocals)=>e.word(locals[name],name==='rh'||name==='rv'?'real':'integer');
  const ow=(name:'h1'|'v1'|'h2'|'v2'|'dcode'|'dhs'|'dvs')=>e.word(out.address(name),name==='dhs'||name==='dvs'?'real':'integer');
  const setOut=(name:Parameters<typeof ow>[0],v:WeaponExpression<W>)=>e.set(out.address(name),name==='dhs'||name==='dvs'?'real':'integer',v);
  const setLocal=(name:keyof CheckStatementLocals,v:WeaponExpression<W>)=>e.set(locals[name],name==='rh'||name==='rv'?'real':'integer',v);
  const float=(v:WeaponExpression<W>)=>e.convert('real','float',v),int=(v:WeaponExpression<W>)=>e.convert('integer','int',v);
  yield*setOut('h1',arg('h'));yield*setOut('v1',arg('v'));out.write('dcode',0n);
  const vertical=yield*io.compare('gt',e.iabs(arg('dv')),e.iabs(arg('dh')));
  const dominant=vertical?'v':'h',minor=vertical?'h':'v';
  const delta=vertical?'dv':'dh',otherDelta=vertical?'dh':'dv';
  const result1=vertical?'v1':'h1',result2=vertical?'v2':'h2',other1=vertical?'h1':'v1',other2=vertical?'h2':'v2';
  const increment=vertical?'dvs':'dhs',otherIncrement=vertical?'dhs':'dvs';
  const accumulator=vertical?'rh':'rv',candidate1=vertical?'ih1':'iv1',candidate2=vertical?'ih2':'iv2';
  yield*setLocal('inc',{type:'integer',evaluate:()=>io.isign(e.integer(1),arg(delta))});
  yield*setOut(increment,float(local('inc')));
  yield*setOut(otherIncrement,e.binary('add',e.binary('div',float(arg(otherDelta)),float(e.iabs(arg(delta)))),arg('displ')));
  yield*setOut(result2,arg(dominant));yield*setLocal(accumulator,float(arg(minor)));
  const loop=yield*io.bounds(e.integer(1),arg('dist'));m.write(locals.i,loop.start);
  if(io.enterLoop(loop.start,loop.limit))do{
    yield*setOut(result2,e.binary('add',ow(result2),local('inc')));
    if(!io.logical(yield*io.ingal(vertical?out.address(result2):5,vertical?5:out.address(result2)))){yield*boundary();return;}
    yield*setLocal(accumulator,e.binary('add',local(accumulator),ow(otherIncrement)));
    yield*io.chkpnt(locals[accumulator],locals[candidate1],locals[candidate2]);
    if(!io.logical(yield*io.ingal(vertical?5:locals[candidate1],vertical?locals[candidate1]:5))){yield*boundary();return;}
    yield*setOut(other2,local(candidate1));
    if((yield*io.disp(out.address('h2'),out.address('v2')))>0n){yield*collision();return;}
    if(m.read(locals[candidate2])!==0n){
      if(!io.logical(yield*io.ingal(vertical?5:locals[candidate2],vertical?locals[candidate2]:5))){yield*boundary();return;}
      yield*setOut(other2,local(candidate2));
      if((yield*io.disp(out.address('h2'),out.address('v2')))>0n){yield*collision();return;}
      yield*setOut(other1,int(e.binary('add',local(accumulator),{type:'real',evaluate:()=>io.ran(0)})));
    }else yield*setOut(other1,int(e.binary('add',local(accumulator),e.real('.5'))));
    yield*setOut(result1,ow(result2));m.write(locals.i,add36(m.read(locals.i),1n));
  }while(m.read(locals.i)<=loop.limit);
  yield*setOut(other2,ow(other1));
  function* collision():Generator<W,void,void>{yield*setOut('dcode',{type:'integer',evaluate:()=>io.disp(out.address('h2'),out.address('v2'))});}
  function* boundary():Generator<W,void,void>{yield*setOut('h2',ow('h1'));yield*setOut('v2',ow('v1'));}
}
