import type { WordBlock } from './memory.ts';
import type { FieldStack } from './field-output.ts';
import { add36,rightHalf } from './word36.ts';
export type RawCharacterState={hungup:bigint;ccflg:bigint;inwait:bigint};
export type RawTerminalServices<W>={inchwl():Generator<W,void,void>;clrbfi():Generator<W,void,void>};
// WARMAC.MAC:1629. CPU resolution of @IC and transfer/call-frame effects are
// supplied; IC is read at dispatch time, not captured as a host input function.
export function* dispatchInput<W>(block:WordBlock,io:{indirectAddress(address:bigint):Generator<W,bigint,void>;transfer(address:bigint):Generator<W,void,void>}):Generator<W,void,void>{
  yield*io.transfer(yield*io.indirectAddress(block.address('ic')));
}
// WARMAC.MAC:1642-1659. INCHWL writes C; its return is followed by INWAIT clear
// and live interrupt/hangup checks. CLRBFi can suspend or fail before return.
export function* terminalCharacter<W>(state:RawCharacterState,r:{c:bigint},io:RawTerminalServices<W>):Generator<W,void,void>{
  for(;;){
    if(state.hungup===0n&&state.ccflg===0n){
      state.inwait=-1n;yield*io.inchwl();state.inwait=0n;
      if(state.ccflg===0n&&state.hungup===0n){if(r.c===0n||r.c===13n)continue;return;}
    }
    r.c=10n;if(state.hungup===0n)yield*io.clrbfi();return;
  }
}

export type RawBufferedServices<W>={
  indirectAddress(address:bigint):Generator<W,bigint,void>;
  ildb(pointerAddress:bigint):Generator<W,void,void>; // ILDB C,@IBFPTR; writes C.
  executeInput(instruction:bigint):Generator<W,boolean,void>; // True skips JRST to the source EOF path.
};
// WARMAC.MAC:1631-1640. Every count decrement, pointer resolution and byte load
// remains separate. A refill's skip is treated as EOF regardless of its cause.
export function* bufferedCharacter<W>(block:WordBlock,r:{c:bigint},io:RawBufferedServices<W>):Generator<W,void,void>{
  for(;;){
    const address=yield*io.indirectAddress(block.address('ibfctr'));
    const count=add36(block.memory.read(address),-1n);block.memory.write(address,count);
    if(count>=0n){
      yield*io.ildb(yield*io.indirectAddress(block.address('ibfptr')));if(r.c!==0n)return;
    }else if(yield*io.executeInput(block.read('ibfins'))){r.c=-1n;return;}
  }
}
export type RawTerminalControl<W>={output():Generator<W,void,void>;skpinl():Generator<W,void,void>};
// WARMAC.MAC:1335-1338,1346-1352. SKPINL's skip only skips JFCL. Each monitor
// operation has its own current HUNGUP guard.
export function* terminalControl<W>(entry:'ttyon'|'dmpbuf',state:{hungup:bigint},io:RawTerminalControl<W>):Generator<W,void,void>{
  if(state.hungup===0n)yield*io.output();
  if(entry==='ttyon'&&state.hungup===0n)yield*io.skpinl();
}
export type RawIniState={ccflg:bigint;echflg:bigint;iniflg:bigint;blank:bigint};
export type RawIniServices<W>=FieldStack<W>&{
  buffered():Generator<W,void,void>;
  ochr():Generator<W,void,void>;
  close():Generator<W,void,void>;
  ttyon():Generator<W,void,void>;
  dmpbuf():Generator<W,void,void>;
  setInput():Generator<W,void,void>;
  dispatch():Generator<W,void,void>;
};
// WARMAC.MAC:1284-1306. Raw C and S-stack saves replace detached character
// returns and host snapshots. Negative EOF bypasses the CCFLG clear.
export function* iniCharacter<W>(state:RawIniState,r:{c:bigint;x1:bigint;p1:bigint},ttyFileAddress:bigint,io:RawIniServices<W>):Generator<W,void,void>{
  yield*io.buffered();
  if(r.c>=0n){
    if(state.ccflg>=0n){if(r.c!==7n&&state.echflg>=0n)yield*io.ochr();return;}
    state.ccflg=0n;
  }
  yield*io.pushData(r.x1);yield*io.pushData(r.p1);
  yield*io.close();yield*io.ttyon();yield*io.dmpbuf();
  r.x1=rightHalf(ttyFileAddress);yield*io.setInput();state.iniflg=0n;state.blank=-1n;
  r.p1=yield*io.popData();r.x1=yield*io.popData();yield*io.dispatch();
}
