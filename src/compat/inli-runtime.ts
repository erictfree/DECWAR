import type { WordMemory } from './memory.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
import { characterBits } from '../generated/character-bits.ts';
export type EditorState={hungup:bigint;echflg:bigint;iniflg:bigint;blank:bigint;bufptr:bigint;chrcnt:bigint;rptflg:bigint};
export type EditorRegisters={f:bigint;c:bigint;t1:bigint};
export type EditorSymbols={cbits:bigint;linbuf:bigint;maxcnt:bigint;newline:bigint;caret:bigint};
export type EditorServices<W>={
  ichr():Generator<W,void,void>;
  output():Generator<W,void,void>;
  ochr():Generator<W,void,void>;
  outstr(address:bigint):Generator<W,void,void>;
  outchr(address:'c'|bigint):Generator<W,void,void>;
  echo(entry:'echon'|'echoff'):Generator<W,void,void>;
  movnT1(word:bigint):Generator<W,void,void>;
  addiC(operand:bigint):Generator<W,void,void>;
  aobjp():Generator<W,boolean,void>;
};
const cf=characterBits.flags,has=(r:EditorRegisters,b:number)=>(r.f&BigInt(b))!==0n;
// WARMAC.MAC:1927-1936. Raw CBITS memory and C index, without a host ASCII guard.
export function* nextEditorCharacter<W>(m:WordMemory,state:EditorState,r:EditorRegisters,s:EditorSymbols,io:EditorServices<W>):Generator<W,void,void>{
  for(;;){
    yield*io.ichr();
    const flags=m.read(rightHalf(s.cbits+rightHalf(r.c)));r.f=signed36(halfWords(leftHalf(r.f),rightHalf(flags)));
    if(has(r,cf['cf.ign']))continue;
    if(state.echflg!==0n)r.f&=~BigInt(cf['cf.cr']|cf['cf.ff']);return;
  }
}
// WARMAC.MAC:1942-1964. Monitor OUTSTR/OUTCHR deliberately bypass OCHR state.
export function* redisplayEditor<W>(m:WordMemory,state:EditorState,r:EditorRegisters,s:EditorSymbols,io:EditorServices<W>):Generator<W,void,void>{
  if(state.hungup===0n)yield*io.outstr(s.newline);
  if(state.echflg<0n)yield*io.echo('echon');
  yield*io.movnT1(state.chrcnt);r.t1=signed36(halfWords(r.t1-1n,0n));r.t1=signed36(halfWords(leftHalf(r.t1),rightHalf(s.linbuf-1n)));
  for(;;){
    if(yield*io.aobjp())return;r.c=rightHalf(m.read(rightHalf(r.t1)));
    if(r.c<7n||(r.c>13n&&r.c<32n)){
      if(state.hungup===0n)yield*io.outchr(s.caret);yield*io.addiC(0o100n);
    }
    if(state.hungup===0n)yield*io.outchr('c');
  }
}
// WARMAC.MAC:1860-1915 and ECHG.:1970-1972. Current F/C survive calls and are
// reread for each special action; source stores are not a host edited-string update.
export function* editInput<W>(m:WordMemory,state:EditorState,r:EditorRegisters,s:EditorSymbols,io:EditorServices<W>):Generator<W,void,void>{
  if(state.hungup===0n)yield*io.output();state.bufptr=-1n;
  yield*nextEditorCharacter(m,state,r,s,io);
  if(has(r,cf['cf.rpt']))state.rptflg=-1n;
  else{
    state.rptflg=0n;state.chrcnt=0n;
    for(;;){
      if(!has(r,cf['cf.spe'])){
        r.t1=add36(state.chrcnt,1n);state.chrcnt=r.t1;m.write(rightHalf(s.linbuf-1n+rightHalf(r.t1)),r.c);
        if(r.t1>=s.maxcnt)break;
      }else if(has(r,cf['cf.eol']))break;
      else{
        if(has(r,cf['cf.etg']))yield*io.echo(state.echflg<0n?'echon':'echoff');
        if(has(r,cf['cf.dsp']))yield*redisplayEditor(m,state,r,s,io);
        if(has(r,cf['cf.bsc'])){state.chrcnt=add36(state.chrcnt,-1n);if(state.chrcnt<0n)state.chrcnt=0n;}
        if(has(r,cf['cf.bsl'])){
          state.chrcnt=0n;if(state.hungup===0n)yield*io.outstr(s.newline);
          if(state.echflg<0n)yield*io.echo('echon');
        }
      }
      yield*nextEditorCharacter(m,state,r,s,io);
    }
    r.t1=add36(state.chrcnt,1n);state.chrcnt=r.t1;m.write(rightHalf(s.linbuf-1n+rightHalf(r.t1)),0n);
  }
  r.c=13n;yield*io.ochr();r.c=10n;
  if(state.iniflg<0n||has(r,cf['cf.ff']))state.blank=add36(state.blank,1n);else yield*io.ochr();
  if(state.echflg!==0n)yield*io.echo('echon');
}
// Both linked entries immediately POPJ (WARMAC.MAC:1313,1324); unreachable
// echo-changing code is not enabled. The caller still owns call-frame effects.
export function echoControl(_entry:'echon'|'echoff'):void{}
