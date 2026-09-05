import type { CommonBlock } from '../compat/memory.ts';
import type { CommandRoutine } from './command-loop.ts';
export type StatementCommandCall={routine:CommandRoutine;argument?:0|1|2|false;alternate?:49};
export type MainLoopServices<W>={
  logical(word:bigint):boolean;
  assignTrue(address:()=>bigint):Generator<W,void,void>;
  assignFalse(address:()=>bigint):Generator<W,void,void>;
  debugLine(operation:'timin'|'timout',label:string):Generator<W,void,void>;
  getcmd(actual:bigint):Generator<W,void,void>;
  invoke(call:StatementCommandCall):Generator<W,'normal'|'alternate',void>;
  movementBranch(alive:()=>bigint):Generator<W,'leave'|'repair',void>; // IF (.NOT.ALIVE(WHO)) 3810,3400.
  outSure():Generator<W,void,void>;
  clear():Generator<W,void,void>;
  gtkn():Generator<W,void,void>;
  equalYes(token:bigint):Generator<W,bigint,void>;
  quitBranch(result:bigint):Generator<W,'leave'|'next',void>; // IF (EQUAL(...)) 3800,50.
  leave():Generator<W,never,void>;
  finishTurn(automaticRepair:boolean):Generator<W,void,void>;
};
const table:readonly {call:StatementCommandCall;debug?:string;next?:'repair'|'weapon'|'movement'}[]=[
  {call:{routine:'bases'},debug:'CMDBA '},
  {call:{routine:'build',alternate:49},debug:'CMDBU ',next:'repair'},
  {call:{routine:'captur',alternate:49},debug:'CMDCA ',next:'repair'},
  {call:{routine:'damage',argument:2},debug:'CMDDA '},
  {call:{routine:'dock',alternate:49},debug:'CMDDO ',next:'repair'},
  {call:{routine:'energy'},debug:'CMDEN '},
  {call:{routine:'gripe'},debug:'CMDGR '},
  {call:{routine:'help'},debug:'CMDHEL'},
  {call:{routine:'impuls',alternate:49},debug:'CMDIMP',next:'movement'},
  {call:{routine:'list'},debug:'CMDLIS'},
  {call:{routine:'move',alternate:49},debug:'CMDMOV',next:'movement'},
  {call:{routine:'news'},debug:'CMDNEW'},
  {call:{routine:'phacon',alternate:49},debug:'CMDPHA',next:'weapon'},
  {call:{routine:'planet'},debug:'CMDPLA'},
  {call:{routine:'points',argument:false},debug:'CMDPOI'},
  {call:{routine:'bases'}}, // Slot 16 branches to QUIT before table dispatch.
  {call:{routine:'radio'},debug:'CMDRAD'},
  {call:{routine:'repair',argument:1,alternate:49},debug:'CMDREP',next:'repair'},
  {call:{routine:'scan'},debug:'CMDSCA'},
  {call:{routine:'set'},debug:'CMDSET'},
  {call:{routine:'shield'},debug:'CMDSHI'},
  {call:{routine:'srscan'},debug:'CMDSRS'},
  {call:{routine:'status',argument:2},debug:'CMDSTA'},
  {call:{routine:'summar'},debug:'CMDSUM'},
  {call:{routine:'target'},debug:'CMDTAR'},
  {call:{routine:'tell'},debug:'CMDTEL'},
  {call:{routine:'time'},debug:'CMDTIM'},
  {call:{routine:'torp',alternate:49},debug:'CMDTOR',next:'weapon'},
  {call:{routine:'tractr'},debug:'CMDTRA'},
  {call:{routine:'type',argument:0},debug:'CMDTYP'},
  {call:{routine:'users'},debug:'CMDUSE'},
  {call:{routine:'debug'}},
  {call:{routine:'paswrd'}},
];
// DECWAR.FOR:163-169. HUNGUP is a compiler logical test. No token-type,
// CCFLG or post-input hangup test is added. Both two-label IF branches require
// an explicit compiler interpretation, even when EQUAL returns an unusual word.
export function* quitStatements<W>(low:CommonBlock,io:MainLoopServices<W>):Generator<W,void,void>{
  if(io.logical(low.read('hungup')))return yield*io.leave();
  yield*io.outSure();yield*io.assignFalse(()=>low.address('ccflg'));yield*io.clear();yield*io.gtkn();
  if((yield*io.quitBranch(yield*io.equalYes(low.address('tknlst',1))))==='leave')return yield*io.leave();
}
// DECWAR.FOR:86-250. The branch index is the current caller-local word.
// Out-of-range computed GOTO falls through to 100. Alternate-return calls
// transfer directly to 49, bypassing the following column-D TIMOUT.
export function* dispatchCommandStatements<W>(n:bigint,high:CommonBlock,low:CommonBlock,io:MainLoopServices<W>):Generator<W,void,void>{
  const word=low.memory.read(n);if(word===16n){yield*quitStatements(low,io);return;}
  const item=table[word>=1n&&word<=33n?Number(word)-1:0];
  if(item.debug)yield*io.debugLine('timin',item.debug);
  const result=yield*io.invoke({...item.call});if(item.call.alternate!==undefined&&result==='alternate')return;
  if(item.debug)yield*io.debugLine('timout',item.debug);
  if(item.next==='movement'&&(yield*io.movementBranch(()=>high.read('alive',low.read('who'))))==='leave')return yield*io.leave();
  if(item.next)yield*io.finishTurn(item.next!=='weapon');
}
// DECWAR.FOR:77-89,49/50. Returning requests label 1 (PREGAM), without
// resetting the command word, private locals, settings, traps or shared state.
export function* commandLoopStatements<W>(n:bigint,high:CommonBlock,low:CommonBlock,io:MainLoopServices<W>):Generator<W,'pregame',void>{
  for(;;){
    yield*io.assignTrue(()=>low.address('player'));yield*io.debugLine('timin','GETCMD');yield*io.getcmd(n);yield*io.debugLine('timout','GETCMD');
    if(low.read('who')===0n)return 'pregame';yield*dispatchCommandStatements(n,high,low,io);
  }
}
