import type { FileBlock } from './files.ts';
import { add36,halfWords,rightHalf,signed36 } from './word36.ts';

export type InterruptState={ccflg:bigint;ccflgDot:bigint;inwait:bigint};
export type InterruptServices<W>={
  // Required machine operations use live ACs/stack in block.memory.
  pushReturn(word:bigint):Generator<W,void,void>;
  incrementReturn():Generator<W,void,void>; // AOS 0(P), full word.
  popReturn():Generator<W,void,void>; // POPJ P; actual PC/flags transfer.
  blt(ac:bigint,lastAddress:bigint):Generator<W,void,void>;
  callTrap(address:bigint):Generator<W,void,void>; // PUSHJ P,(T1).
};

// WARMAC CCTRAP:4120-4123. A missing FORTRAN argument has no invented default.
// AC1 is T1 (WARMAC:553); its memory mapping belongs to the caller's machine.
export function setControlTrap(block:FileBlock,state:Pick<InterruptState,'ccflg'>,resolveArgumentAddress:()=>bigint):void{
  block.memory.write(1n,rightHalf(resolveArgumentAddress()));
  block.write('trpadr',block.memory.read(1n));state.ccflg=0n;
}

// WARMAC INTH.:4152-4174. Executable statements replace the obsolete prose
// above them: no INTTYP check, CCFLG decrement, character injection or reenable.
export function* interceptInterrupt<W>(block:FileBlock,state:InterruptState,io:InterruptServices<W>):Generator<W,void,void>{
  const memory=block.memory;
  yield*io.pushReturn(block.read('intadr'));
  if(state.ccflgDot<0n){block.write('intadr',0n);yield*io.popReturn();return;}
  state.ccflgDot=-1n;state.ccflg=-1n;
  if(state.inwait!==0n)yield*io.incrementReturn();
  block.write('intadr',0n);
  if(block.read('trpadr')!==0n){
    const processing=add36(block.read('intflg'),1n);block.write('intflg',processing);
    if(processing===0n){
      block.write('savr',memory.read(0n),0);
      memory.write(0n,signed36(halfWords(1n,block.address('savr',1))));
      yield*io.blt(0n,block.address('savr',0o16));
      memory.write(1n,block.read('trpadr')); // Recheck after the register save.
      if(memory.read(1n)!==0n)yield*io.callTrap(rightHalf(memory.read(1n)));
      memory.write(0o16n,signed36(halfWords(block.address('savr',0),0n)));
      yield*io.blt(0o16n,0o16n);
      block.write('intflg',-1n);
    }
  }
  yield*io.popReturn();
}
