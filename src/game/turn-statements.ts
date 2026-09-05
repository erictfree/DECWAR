import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
import type { CommandReturn } from './maintenance.ts';

export type TurnExpression<W>=()=>Generator<W,bigint,void>;
export type TurnStatementServices<W>={
  logical(word:bigint):boolean; // Required compiler IF/.NOT. interpretation, including integer ROMOPT/PRTYPE.
  integer(op:'add'|'sub',left:TurnExpression<W>,right:TurnExpression<W>):Generator<W,bigint,void>;
  assign(destination:()=>bigint,value:TurnExpression<W>):Generator<W,void,void>;
  repair(mode:3):Generator<W,CommandReturn|void,void>; // Both REPAIR returns resume at label 3500.
  debugLine(operation:'timin'|'timout',routine:'BASPHA'|'PLNATK'|'BASBLD'):Generator<W,void,void>; // Required column-D compilation/call policy.
  baspha():Generator<W,void,void>;plnatk():Generator<W,void,void>;basbld():Generator<W,void,void>;
  romdrv(d1Address:bigint,d2Address:bigint):Generator<W,void,void>;
  out(message:'lifdam'|'strdat',lines:0|1):Generator<W,void,void>;
  odec(valueAddress:bigint,width:0):Generator<W,void,void>;
};
// DECWAR.FOR:254-289. Entry 3400 requests repair; entry 3500 skips it.
// I/D1/D2 are compiler-local words, not an invented /LOCAL/ allocation.
// Return transfers back to the caller's label 49 path; do not reset PLAYER or
// PTIME here. Exceptional DO-variable changes and CPU/call frames remain unmodeled.
export function* turnStatements<W>(high:CommonBlock,low:CommonBlock,automaticRepair:boolean,locals:{i:bigint;d1:bigint;d2:bigint},io:TurnStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):TurnExpression<W>=>function*(){return read();};
  const constant=(n:bigint)=>value(()=>n),ship=(field:number)=>high.address('shpcon',low.read('who'),field);
  const binary=(op:'add'|'sub',left:TurnExpression<W>,right:TurnExpression<W>):TurnExpression<W>=>()=>io.integer(op,left,right);
  const increment=(address:()=>bigint)=>io.assign(address,binary('add',value(()=>m.read(address())),constant(1n)));
  if(automaticRepair)yield*io.repair(3);
  yield*increment(()=>high.address('dotime'));
  if(high.read('dotime')>=high.read('numply')){
    high.write('dotime',0n);
    yield*io.debugLine('timin','BASPHA');yield*io.baspha();yield*io.debugLine('timout','BASPHA');
    yield*io.debugLine('timin','PLNATK');yield*io.plnatk();yield*io.debugLine('timout','PLNATK');
    yield*io.debugLine('timin','BASBLD');yield*io.basbld();yield*io.debugLine('timout','BASBLD');
    if(io.logical(high.read('romopt')))yield*io.romdrv(locals.d1,locals.d2);
  }
  yield*increment(()=>ship(K.KNTURN));yield*increment(()=>high.address('tmturn',low.read('team')));
  if(high.read('shpdam',low.read('who'),K.KDLIFE)>=BigInt(K.KCRIT)){
    if(!io.logical(high.read('docked',low.read('who'))))yield*io.assign(()=>ship(K.KLFSUP),binary('sub',value(()=>m.read(ship(K.KLFSUP))),constant(1n)));
    if(m.read(ship(K.KLFSUP))<0n)m.write(ship(K.KSDAM),BigInt(K.KENDAM));
    if(!io.logical(low.read('prtype'))){
      yield*io.out('lifdam',0);yield*io.odec(ship(K.KLFSUP),0);yield*io.out('strdat',1);
    }
  }
  for(m.write(locals.i,1n);m.read(locals.i)<=BigInt(K.KNPOIN);m.write(locals.i,add36(m.read(locals.i),1n))){
    const points=()=>low.read('tpoint',m.read(locals.i));
    const score=()=>high.address('score',m.read(locals.i),low.read('who'));
    const team=()=>high.address('tmscor',low.read('team'),m.read(locals.i));
    yield*io.assign(score,binary('add',value(()=>m.read(score())),value(points)));
    yield*io.assign(team,binary('add',value(()=>m.read(team())),value(points)));
    low.write('tpoint',0n,m.read(locals.i));
  }
}
