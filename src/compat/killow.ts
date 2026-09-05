import type { FileJobState,FileMonitor } from './files.ts';
import { fileWarning } from './files.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';

// WARMAC KILLOW:4253-4261. .JBDDT suppresses every write. Failed CORE does
// not undo the restart address or .JBFF; WARN owns the two HUNGUP checks.
export function* discardSetup<W>(state:FileJobState&{jbddt:bigint;jbsa:bigint},r:{t1:bigint},
  symbols:{start:bigint;a:bigint},io:FileMonitor<W>):Generator<W,void,void>{
  if(state.jbddt!==0n)return;
  r.t1=rightHalf(symbols.start);state.jbsa=signed36(halfWords(leftHalf(state.jbsa),r.t1));
  r.t1=rightHalf(symbols.a);state.jbff=r.t1;
  if(!(yield*io.core(r.t1)))yield*fileWarning(state,"Can't remove once only code",io);
}
