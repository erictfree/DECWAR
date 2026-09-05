import type { WordBlock } from './memory.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
import type { InliState } from './inli.ts';

export type CharacterRegister={c:bigint};
export type TerminalInputState={hungup:bigint;ccflg:bigint;inwait:bigint};
export type TerminalInputServices<W>={
  inchwl():Generator<W,bigint,void>;
  clearInput():void;
};

// WARMAC ICHR.T/INCR.H:1642-1659. The comment says ESC; MOVEI C,12 is LF.
export function* ichrTerminal<W>(state:TerminalInputState,r:CharacterRegister,io:TerminalInputServices<W>):Generator<W,bigint,void>{
  for(;;){
    if(state.hungup===0n&&state.ccflg===0n){
      state.inwait=-1n;r.c=yield*io.inchwl();state.inwait=0n;
      if(state.ccflg===0n&&state.hungup===0n){
        if(r.c===0n||r.c===13n)continue;
        return r.c;
      }
    }
    r.c=10n;
    if(state.hungup===0n)io.clearInput();
    return r.c;
  }
}

export type BufferedInputServices<W>={
  // CPU effective-address resolution of @IBFCTR / @IBFPTR, including any
  // indexing/indirection encoded in those live words. No right-half shortcut.
  indirect(wordAddress:bigint):bigint;
  ildb(pointerAddress:bigint):bigint;
  // True iff the executed IN skips the following JRST, the source EOF path.
  executeInput(instruction:bigint):Generator<W,boolean,void>;
};
// WARMAC ICHR.B:1631-1640. Each NUL consumes a count and updated byte pointer.
export function* ichrBuffered<W>(block:WordBlock,r:CharacterRegister,io:BufferedInputServices<W>):Generator<W,bigint,void>{
  for(;;){
    const address=io.indirect(block.address('ibfctr'));
    const count=add36(block.memory.read(address),-1n);block.memory.write(address,count);
    if(count>=0n){
      r.c=io.ildb(io.indirect(block.address('ibfptr')));
      if(r.c!==0n)return r.c;
    }else if(yield*io.executeInput(block.read('ibfins'))){r.c=-1n;return r.c;}
  }
}

export type TerminalOutputServices={output():void;skpinl():void};
// WARMAC DMPBUF:1335-1338 and TTYON:1346-1352; separate HUNGUP reads.
export function dumpTerminal(state:Pick<InliState,'hungup'>,io:TerminalOutputServices):void{
  if(state.hungup===0n)io.output();
}
export function terminalOn(state:Pick<InliState,'hungup'>,io:TerminalOutputServices):void{
  dumpTerminal(state,io);
  if(state.hungup===0n)io.skpinl();
}

export type IniInputState=InliState&{ccflg:bigint};
export type IniRegisters=CharacterRegister&{x1:bigint;p1:bigint};
export type IniInputServices<W>=TerminalOutputServices&{
  buffered():Generator<W,bigint,void>;
  ochr(character:bigint):void;
  close():Generator<W,void,void>;
  ttyFileAddress:bigint;
  setInput():Generator<W,void,void>;
  dispatch():Generator<W,bigint,void>;
};
// WARMAC IICH:1284-1306. Close/SETI use the same X1/P1 register object as
// the caller. The negative EOF branch does not clear an outstanding CCFLG.
export function* ichrIni<W>(state:IniInputState,r:IniRegisters,io:IniInputServices<W>):Generator<W,bigint,void>{
  r.c=yield*io.buffered();
  if(r.c>=0n){
    if(state.ccflg>=0n){
      if(r.c!==7n&&state.echflg>=0n)io.ochr(r.c);
      return r.c;
    }
    state.ccflg=0n;
  }
  const x1=r.x1,p1=r.p1;
  yield*io.close();
  terminalOn(state,io);dumpTerminal(state,io);
  r.x1=rightHalf(io.ttyFileAddress);
  yield*io.setInput();
  state.iniflg=0n;state.blank=-1n;
  r.p1=p1;r.x1=x1;
  r.c=yield*io.dispatch();return r.c;
}

export type SetInputRegisters={x1:bigint;t1:bigint;t2:bigint;t3:bigint};
export type InputMachineConstants={bufferCountOffset:bigint;bufferPointerOffset:bigint;inInstructionLeftHalf:bigint};
// WARMAC SETI:1552-1572; .FBCIO/.FBBRH/.FBFNC are 0/5/2 (604-609).
// The monitor's .BFCTR/.BFPTR and assembled IN instruction left half are not defined
// in this archive and must be supplied. Existing buffer contents and counters
// are not initialized by SETI.
export function setInput(block:WordBlock,r:SetInputRegisters,machine:InputMachineConstants):void{
  r.t1=rightHalf(r.x1);
  r.x1=signed36(halfWords(leftHalf(r.x1),rightHalf(block.read('ibflb'))));
  block.write('ibflb',signed36(halfWords(leftHalf(block.read('ibflb')),r.t1)));
  r.t2=rightHalf(block.memory.read(r.t1));block.write('ic',r.t2);
  r.t2=rightHalf(block.memory.read(r.t1+5n));
  r.t3=rightHalf(machine.bufferCountOffset+r.t2);block.write('ibfctr',r.t3);
  r.t3=rightHalf(machine.bufferPointerOffset+r.t2);block.write('ibfptr',r.t3);
  r.t2=signed36(halfWords(machine.inInstructionLeftHalf,0n));block.write('ibfins',r.t2);
  r.t2=leftHalf(block.memory.read(r.t1+2n));
  block.write('ibfins',signed36((block.read('ibfins')&~(15n<<23n))|((r.t2&15n)<<23n)));
}
