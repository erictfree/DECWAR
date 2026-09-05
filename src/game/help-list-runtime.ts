import type { FieldStack } from '../compat/field-output.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from '../compat/word36.ts';
export type HelpListRegisters={x1:bigint;x2:bigint;x3:bigint;x4:bigint;p1:bigint;p2:bigint;t0:bigint;c:bigint};
export type HelpListServices<W>=FieldStack<W>&{
  equal():Generator<W,void,void>;
  output(entry:'ostb.'|'ostr.'|'ochr.'|'ospc.'|'ocrl.'):Generator<W,void,void>;
  aobjpX1():Generator<W,boolean,void>; // Updates X1, returns branch condition.
  successReturn():Generator<W,void,void>; // AOS (P), before restoring S saves.
};
// WARMAC.MAC:5207-5263. X4 is match address,,index; X3 is -1 before
// matches, 0 for a unique match and positive for ambiguity. P2 is the result.
export function* searchHelpList<W>(r:HelpListRegisters,s:{ambiguous:bigint;candidates:bigint},io:HelpListServices<W>):Generator<W,boolean,void>{
  yield*io.pushData(r.x3);yield*io.pushData(r.x4);yield*io.pushData(r.p1);
  r.x3=-1n;r.x4=0n;
  for(;;){
    r.p2=rightHalf(r.x1);yield*io.equal();
    if(r.t0<0n){
      r.x3=add36(r.x3,1n);
      if(r.x3<=0n)r.x4=signed36(halfWords(rightHalf(r.p2),rightHalf(r.x4)));
      else{
        yield*io.pushData(r.p1);
        if(r.x3===1n){
          yield*io.output('ostb.');r.p1=rightHalf(s.ambiguous);yield*io.output('ostr.');
          if(r.x2>=0n){
            r.p1=rightHalf(s.candidates);yield*io.output('ostr.');r.p1=leftHalf(r.x4);yield*io.output('ostb.');
            yield*printHit();
          }
        }else yield*printHit();
        r.p1=yield*io.popData();if(r.x2<0n)break;
      }
    }
    if(yield*advance())break;
  }
  let unique=false;
  if(r.x3===0n){r.p2=leftHalf(r.x4);r.x1=rightHalf(r.x4);yield*io.successReturn();unique=true;}
  else{
    r.x1=0n;
    if(r.x3>0n)yield*io.output('ocrl.');
    else{
      r.x1=-1n;r.x3=rightHalf(r.p1);r.p1=rightHalf(r.x2);
      if(r.p1!==0n){yield*io.output('ostr.');r.p1=rightHalf(r.x3);yield*io.output('ostb.');yield*io.output('ocrl.');}
    }
  }
  r.p1=yield*io.popData();r.x4=yield*io.popData();r.x3=yield*io.popData();return unique;
  function* advance():Generator<W,boolean,void>{
    if(yield*io.aobjpX1())return true;if(yield*io.aobjpX1())return true;
    if(r.x3<0n)r.x4=add36(r.x4,1n);return false;
  }
  function* printHit():Generator<W,void,void>{
    r.c=44n;yield*io.output('ochr.');yield*io.output('ospc.');r.p1=rightHalf(r.p2);yield*io.output('ostb.');
  }
}
export type OutputHelpListServices<W>=FieldStack<W>&{
  dmove():Generator<W,void,void>; // DMOVE T1,(X1), supplied CPU pair semantics.
  dmovem():Generator<W,void,void>; // DMOVEM T1,TMP.
  clearTerminator():Generator<W,void,void>; // SETZM TMP+2 over actual memory.
  output(entry:'ostr.'|'ocrl.'):Generator<W,void,void>;
  aobjpX1():Generator<W,boolean,void>;
};
// WARMAC.MAC:5268-5285. MOVEI X2,7 takes precedence over the six-column
// comment. Even a nonnegative entry pointer processes its first pair.
export function* outputHelpList<W>(r:Pick<HelpListRegisters,'x1'|'x2'|'p1'>,tmp:bigint,io:OutputHelpListServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.x1);yield*io.pushData(r.x2);
  rows:for(;;){
    r.x2=7n;
    for(;;){
      yield*io.dmove();yield*io.dmovem();yield*io.clearTerminator();r.p1=rightHalf(tmp);yield*io.output('ostr.');
      if(yield*io.aobjpX1())break rows;if(yield*io.aobjpX1())break rows;
      r.x2=add36(r.x2,-1n);if(r.x2>0n)continue;
      yield*io.output('ocrl.');break;
    }
  }
  yield*io.output('ocrl.');r.x2=yield*io.popData();r.x1=yield*io.popData();
}

export type HelpSummarySymbols={extraIntro:bigint;extraEnd:bigint;commandsTitle:bigint;extraPointer:bigint;publicPointer:bigint;allPointer:bigint};
// WARMAC.MAC:5074-5103. These entries do not save registers, erase a ship,
// check RED or clear interrupts. PASFLG is read after both HLPALL newlines.
export function* helpSummary<W>(entry:'hlpxtr'|'hlpall',r:Pick<HelpListRegisters,'x1'|'p1'>,state:{pasflg:bigint},s:HelpSummarySymbols,
  io:{output(entry:'ostr.'|'ocrl.'):Generator<W,void,void>;list():Generator<W,void,void>}):Generator<W,void,void>{
  if(entry==='hlpxtr'){
    r.p1=rightHalf(s.extraIntro);yield*io.output('ostr.');r.x1=s.extraPointer;yield*io.list();r.p1=rightHalf(s.extraEnd);yield*io.output('ostr.');
  }else{
    yield*io.output('ocrl.');r.p1=rightHalf(s.commandsTitle);yield*io.output('ostr.');yield*io.output('ocrl.');
    r.x1=state.pasflg<0n?s.allPointer:s.publicPointer;yield*io.list();
  }
}
