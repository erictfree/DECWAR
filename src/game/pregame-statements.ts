import { currentVariant } from '../runtime/variant-execution.ts';
import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponStatementServices } from './weapon-damage-statements.ts';
import type { PregameCall } from './pregame.ts';
export type PregameStatementLocals={identity:bigint;n:bigint};
export type PregameStatementMessage='strtup'|'pgame1'|'honorInstruction'|'documentInstruction'|'documentInstructionEnd'|'documentMessage'|'documentBlank';
export type PregameStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'or'>&{
  jobsta(addresses:readonly bigint[]):Generator<W,void,void>;
  ttyon():Generator<W,void,void>;
  out(message:PregameStatementMessage,lines:0|1):Generator<W,void,void>;
  gtkn():Generator<W,void,void>;
  equal(token:bigint,literal:'HONORROLL'|'HELP'|'PREGAME'):Generator<W,bigint,void>;
  monit():Generator<W,void,void>;
  invoke(call:PregameCall):Generator<W,void,void>;
  xgtcmd(address:bigint):Generator<W,void,void>;
  prgnam(literal:'DECWAR'):Generator<W,void,void>;
};
// SETUP.FOR:117-194. The first six /LOCAL/ words are actual JOBSTA arguments;
// N is a private caller-supplied word. Logical/literal/call conventions remain
// required services. Returning requests SETUP; it does not initialize a player.
export function* pregameStatements<W>(low:CommonBlock,l:PregameStatementLocals,io:PregameStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,austin=currentVariant().definition.id==='austin';
  yield*io.jobsta(Array.from({length:6},(_,i)=>l.identity+BigInt(i)));
  if(io.logical(low.read('ccflg')))yield*io.monit();
  for(;;){
    yield*io.ttyon();yield*io.out('strtup',0);yield*io.gtkn();
    if(yield*io.or(function*(){return io.logical(low.read('ccflg'));},function*(){return io.logical(low.read('hungup'));}))yield*io.monit();
    if(low.read('ntok')===0n)return;
    if(!austin&&io.logical(yield*io.equal(low.address('tknlst',1),'HONORROLL'))){yield*io.invoke({routine:'shosta',argument:true});continue;}
    if(io.logical(yield*io.equal(low.address('tknlst',1),'HELP'))){yield*io.invoke({routine:'hlpxtr'});yield*io.invoke({routine:'hlpall'});yield*io.ttyon();continue;}
    if(io.logical(yield*io.equal(low.address('tknlst',1),'PREGAME')))break;
  }
  yield*io.out('pgame1',1);if(!austin){yield*io.out('honorInstruction',1);yield*io.out('documentInstruction',1);yield*io.out('documentInstructionEnd',1);}
  for(;;){
    yield*io.xgtcmd(l.n);const n=m.read(l.n);
    // An out-of-range computed GOTO falls through to label 100.
    if(n<2n||n>16n){yield*io.prgnam('DECWAR');return;}
    if(n===2n){yield*io.out(austin?'documentBlank':'documentMessage',1);continue;}
    if(austin&&n===5n)continue;
    if(n===8n){yield*io.monit();continue;}
    if(n===16n){if(io.logical(low.read('pasflg')))yield*io.invoke({routine:'stazap'});continue;}
    const call:PregameCall=({3:{routine:'gripe'},4:{routine:'help'},5:{routine:'shosta',argument:true},6:{routine:'news'},7:{routine:'points',argument:false},9:{routine:'set'},10:{routine:'summar'},11:{routine:'time'},12:{routine:'type'},13:{routine:'users'},14:{routine:'debug'},15:{routine:'paswrd'}} as const)[Number(n) as 3|4|5|6|7|9|10|11|12|13|14|15];
    yield*io.invoke(call);
  }
}
