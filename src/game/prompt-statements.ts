import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponStatementServices } from './weapon-damage-statements.ts';
import { constants as K } from '../generated/source-data.ts';
export type PromptStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'or'>&{
  outNormal():Generator<W,void,void>;odec(address:bigint,zero:0):Generator<W,void,void>;
  outc(literal:'L'|'S'|'D'|'E'):Generator<W,void,void>;outEnd():Generator<W,void,void>;
};
// PROMPT.FOR:36-52. Separate life-support tests and deferred shield terms
// preserve reads after output calls; compiler logical policy remains required.
export function* promptStatements<W>(high:CommonBlock,low:CommonBlock,io:PromptStatementServices<W>):Generator<W,void,void>{
  const who=()=>low.read('who'),life=()=>high.read('shpdam',who(),K.KDLIFE),ship=(col:number)=>high.read('shpcon',who(),col);
  if(!io.logical(low.read('prtype'))){yield*io.outNormal();return;}
  if(life()>=BigInt(K.KCRIT))yield*io.odec(high.address('shpcon',who(),K.KLFSUP),0);
  if(life()>=BigInt(K.KCRIT))yield*io.outc('L');
  if(yield*io.or(function*(){return ship(K.KSSHPC)<=100n;},function*(){return ship(K.KSHCON)<0n;}))yield*io.outc('S');
  if(ship(K.KSDAM)>=20000n)yield*io.outc('D');if(ship(K.KSNRGY)<=10000n)yield*io.outc('E');yield*io.outEnd();
}
