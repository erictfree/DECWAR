import type { CommonBlock } from '../compat/memory.ts';
import { constants as K } from '../generated/source-data.ts';
export type EntryStatementServices<W>={
  clearLow(first:bigint,last:bigint):Generator<W,void,void>;
  startupText():Generator<W,void,void>;gtkn():Generator<W,void,void>;
  and(a:()=>Generator<W,boolean,void>,b:()=>Generator<W,boolean,void>):Generator<W,boolean,void>;
  equal(token:bigint,key:'BEGINNER'|'INTERMEDIATE'|'EXPERT'):Generator<W,bigint,void>;
  type(kind:1|2):Generator<W,void,void>;summar():Generator<W,void,void>;
  pregam():Generator<W,void,void>;ttyon():Generator<W,void,void>;
  setupAndPlace():Generator<W,void,void>;commands():Generator<W,'pregame',void>;
};
// DECWAR.FOR:30-85. VALLST and EQUAL are separate terms of a compiler AND.
// No extra validity/interrupt checks, retry, low clear or preferences on re-entry.
export function* initializeDecwarStatements<W>(high:CommonBlock,low:CommonBlock,io:EntryStatementServices<W>):Generator<W,void,void>{
  yield*io.clearLow(low.address('lfz'),low.address('llz'));high.write('versio',24n);low.write('oflg',BigInt(K.MEDIUM));yield*io.startupText();yield*io.gtkn();
  for(const [n,key] of [[1,'BEGINNER'],[2,'INTERMEDIATE'],[3,'EXPERT']] as const){
    const skip=yield*io.and(function*(){return low.read('vallst',1)!==BigInt(n);},function*(){return (yield*io.equal(low.address('tknlst',1),key))===0n;});if(skip)continue;
    if(n===1){low.write('scnflg',BigInt(K.LONG));low.write('oflg',BigInt(K.MEDIUM));low.write('prtype',0n);low.write('icflg',BigInt(K.KABS));}
    if(n===2){low.write('scnflg',BigInt(K.LONG));low.write('prtype',-1n);low.write('icflg',BigInt(K.KREL));low.write('oflg',BigInt(K.MEDIUM));}
    if(n===3){low.write('scnflg',BigInt(K.SHORT));low.write('prtype',-1n);low.write('icflg',BigInt(K.KREL));low.write('oflg',BigInt(K.SHORT));}break;
  }
  yield*io.type(1);yield*io.type(2);yield*io.summar();
}
export function* runDecwarStatements<W>(high:CommonBlock,low:CommonBlock,io:EntryStatementServices<W>):Generator<W,never,void>{
  yield*initializeDecwarStatements(high,low,io);
  for(;;){yield*io.pregam();yield*io.ttyon();yield*io.setupAndPlace();yield*io.commands();}
}
