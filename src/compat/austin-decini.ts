import type { MemoryCommandInput } from './input-memory.ts';
import type { DeciniRegisters,DeciniState,DeciniServices } from './decini.ts';
import { rightHalf } from './word36.ts';

// Austin WARMAC.MAC:1098-1116. No experience prompt, HIBER, or fallback
// setting writes: the missing-file message is all the source does on failure.
export function* austinDecini<W>(input:MemoryCommandInput,state:DeciniState,r:DeciniRegisters,
  text:{prompt:string;missing:string},io:DeciniServices<W>):Generator<W,void,void>{
  const x1=r.x1,p1=r.p1;
  yield*io.outstr(text.prompt);yield*io.clearInput();input.beginLine();
  r.x1=rightHalf(io.files.inibeg);
  if(yield*io.open()){
    yield*io.ttyon();yield*io.ocrl();yield*io.seti();state.iniflg=-1n;
  }else yield*io.outstr(text.missing);
  r.p1=p1;r.x1=x1;
}
