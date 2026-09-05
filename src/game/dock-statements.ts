import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { CommandReturn } from './maintenance.ts';

export type DockExpression<W>=()=>Generator<W,bigint,void>;
export type DockServices<W>={
  logical(word:bigint):boolean;trueWord:bigint;
  // The source defines the expression tree, but not compiler operand/LHS
  // evaluation order or overflow behavior. No host arithmetic is substituted.
  integer(op:'add'|'sub'|'mul'|'min'|'max',left:DockExpression<W>,right:DockExpression<W>):Generator<W,bigint,void>;
  different(left:DockExpression<W>,right:DockExpression<W>):Generator<W,boolean,void>;
  assign(destination:()=>bigint,value:DockExpression<W>):Generator<W,void,void>;
  enterPlanets(start:bigint,limit:bigint):boolean;
  etim(startAddress:bigint):Generator<W,bigint,void>;
  ldis(v:bigint,h:bigint,otherV:bigint,otherH:bigint,range:1):Generator<W,bigint,void>;
  dispc(v:bigint,h:bigint):Generator<W,bigint,void>;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;
  equal(tokenAddress:bigint,masterAddress:bigint):Generator<W,bigint,void>;
  crlf():Generator<W,void,void>;odisp(value:bigint,space:1):Generator<W,void,void>;
  out(message:'dock01'|'dockin',lines:1):Generator<W,void,void>;
  status(stoken:3):Generator<W,void,void>;
};
// DOCK.FOR:34-81. V/IFRACT/I/J require actual compiler-local words. Ordinary
// DO body advancement is modeled; exceptional control-variable mutations and
// full compiler call/return instruction execution remain outside this body.
export function* dockStatements<W>(high:CommonBlock,low:CommonBlock,locals:{v:bigint;ifract:bigint;i:bigint;j:bigint},statusWord:bigint,io:DockServices<W>):Generator<W,CommandReturn,void>{
  const m=low.memory,ship=(field:number)=>high.address('shpcon',low.read('who'),field);
  const base=(field:number)=>high.address('base',m.read(locals.j),field,low.read('team'));
  const planet=(field:number)=>high.address('locpln',m.read(locals.i),field);
  const value=(read:()=>bigint):DockExpression<W>=>function*(){return read();};
  const constant=(word:bigint)=>value(()=>word),local=(address:bigint)=>value(()=>m.read(address));
  const binary=(op:Parameters<DockServices<W>['integer']>[0],a:DockExpression<W>,b:DockExpression<W>):DockExpression<W>=>()=>io.integer(op,a,b);
  const elapsed:DockExpression<W>=()=>io.etim(high.address('tim0'));
  const advance=(index:bigint)=>m.write(index,add36(m.read(index),1n));
  const addFraction=(n:bigint)=>io.assign(()=>locals.ifract,binary('add',local(locals.ifract),constant(n)));
  yield*io.assign(()=>locals.v,binary('add',binary('add',elapsed,binary('mul',value(()=>high.read('slwest')),constant(1000n))),constant(1000n)));
  m.write(locals.ifract,0n);
  for(m.write(locals.j,1n);m.read(locals.j)<=BigInt(K.KNBASE);advance(locals.j)){
    if(m.read(base(3))<=0n)continue;
    if(io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),base(K.KVPOS),base(K.KHPOS),1)))yield*addFraction(2n);
  }
  if(high.read('numcap',low.read('team'))>0n){
    const limit=high.read('nplnet');m.write(locals.i,1n);
    if(io.enterPlanets(1n,limit))do{
      if(!(yield*io.different(binary('add',value(()=>low.read('team')),constant(BigInt(K.DXNPLN))),()=>io.dispc(planet(K.KVPOS),planet(K.KHPOS))))){
        if(io.logical(yield*io.ldis(ship(K.KVPOS),ship(K.KHPOS),planet(K.KVPOS),planet(K.KHPOS),1)))yield*addFraction(1n);
      }
      advance(locals.i);
    }while(m.read(locals.i)<=limit);
  }
  if(m.read(locals.ifract)===0n){
    yield*io.crlf();yield*io.odisp(yield*io.disp(ship(K.KVPOS),ship(K.KHPOS)),1);yield*io.out('dock01',1);return {alternateReturn:true};
  }
  if(!io.logical(high.read('alive',low.read('who'))))return {alternateReturn:true};
  // Each source assignment selects its own current ship, and the shield
  // multiplication retains 100*IFRACT rather than exchanging its operands.
  yield*io.assign(()=>ship(K.KNTORP),binary('min',binary('add',value(()=>m.read(ship(K.KNTORP))),binary('mul',local(locals.ifract),constant(5n))),constant(10n)));
  yield*io.assign(()=>ship(K.KSNRGY),binary('min',binary('add',value(()=>m.read(ship(K.KSNRGY))),binary('mul',local(locals.ifract),constant(5000n))),constant(50000n)));
  yield*io.assign(()=>ship(K.KSSHPC),binary('min',binary('add',value(()=>m.read(ship(K.KSSHPC))),binary('mul',constant(100n),local(locals.ifract))),constant(1000n)));
  const hull=()=>io.assign(()=>ship(K.KSDAM),binary('max',binary('sub',value(()=>m.read(ship(K.KSDAM))),binary('mul',local(locals.ifract),constant(500n))),constant(0n)));
  yield*hull();if(io.logical(high.read('docked',low.read('who'))))yield*hull();
  high.write('docked',io.trueWord,low.read('who'));m.write(ship(K.KLFSUP),5n);m.write(ship(K.KSPCON),BigInt(K.GREEN));
  yield*io.out('dockin',1);
  if(io.logical(yield*io.equal(low.address('tknlst',2),statusWord)))yield*io.status(3);
  yield*io.assign(()=>low.address('ptime'),binary('sub',local(locals.v),elapsed));
  return {alternateReturn:false,pause:low.read('ptime')};
}
