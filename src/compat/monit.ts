import type { WordMemory } from './memory.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type MonitState={hungup:bigint;jbsa:bigint;who:bigint;jsqwho:bigint};
export type MonitRegisters={t1:bigint;arg:bigint};
export type MonitServices<W>={
  outputTTY():Generator<W,void,void>;
  zaplok():Generator<W,void,void>;
  reset():Generator<W,void,void>;
  free():Generator<W,void,void>;
  // Resolve JRST .+1 inside the literal, before the appended JSQWHO code.
  // Other machine targets must transfer through the runtime service.
  afterFreeJump():Generator<W,'resume-monit'|'sequence-cleanup',void>;
  monrt():Generator<W,never,void>;
};
// WARMAC MONIT:1191-1211, also STOP./EXIT./EXIT. The JSQTAB clear is inside
// the nonzero-WHO literal branch after JRST .+1. Literal-dot resolution is
// required; zero WHO bypasses the entire branch regardless of that target.
export function* monit<W>(memory:WordMemory,state:MonitState,r:MonitRegisters,
  symbols:{whoArgumentList:bigint;jsqtab:bigint},io:MonitServices<W>):Generator<W,never,void>{
  if(state.hungup===0n)yield*io.outputTTY();
  state.jbsa=signed36(halfWords(leftHalf(state.jbsa),0n));
  yield*io.zaplok();yield*io.reset();
  r.t1=state.who;
  if(r.t1!==0n){
    r.arg=rightHalf(symbols.whoArgumentList);yield*io.free();
    if((yield*io.afterFreeJump())==='sequence-cleanup'){
      r.t1=state.jsqwho;
      if(r.t1!==0n)memory.write(symbols.jsqtab-1n+rightHalf(r.t1),0n);
    }
  }
  return yield*io.monrt();
}
