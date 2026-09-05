import type { WordMemory } from './memory.ts';
import type { FileBlock } from './files.ts';
import type { SourceArguments } from './fortran-call.ts';
import type { TextRegisters,TextOutputServices } from './text-output.ts';
import { outputArgument,outputCharacters,outputWords,outputTab,outputSpaces,skipLines,outputSpace,outputCrLf } from './text-output.ts';
import { signed36 } from './word36.ts';

export type FortranTextEntry='out'|'skip'|'tab'|'spaces'|'space'|'crlf'|'outc'|'out2c'|'outw'|'out2w';
// WARMAC public text entries:1986-2101. Routine-body binding only: caller
// owns PUSHJ/POPJ and compiled argument/literal loading. State, ARG and reads
// remain live; no host argument list or optional-argument default is introduced.
export function* fortranText<W>(entry:FortranTextEntry,m:WordMemory,file:FileBlock,r:TextRegisters,
  state:{hcpos:bigint;blank:bigint},point7LeftHalf:bigint,args:SourceArguments,io:TextOutputServices<W>):Generator<W,void,void>{
  switch(entry){
    case 'out':yield*outputArgument(m,r,point7LeftHalf,()=>args.address(0),()=>args.read(1),io);return;
    case 'skip':r.t1=signed36(args.read(0));yield*skipLines(r,io);return;
    case 'tab':r.x1=signed36(args.read(0));yield*outputTab(state,r,io);return;
    case 'spaces':r.x1=signed36(args.read(0));yield*outputSpaces(r,io);return;
    case 'space':yield*outputSpace(r,io);return;
    case 'crlf':yield*outputCrLf(state,r,io);return;
    case 'outc':case 'out2c':yield*outputCharacters(r,()=>args.read(0),entry==='outc'?1:2,io);return;
    case 'outw':yield*outputWords(file,r,point7LeftHalf,()=>args.read(0),undefined,io);return;
    case 'out2w':yield*outputWords(file,r,point7LeftHalf,()=>args.read(0),()=>args.read(1),io);return;
  }
}
