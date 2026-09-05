import { WordBlock } from './memory.ts';
import type { WordMemory } from './memory.ts';
import { fileLayout } from '../generated/file-layout.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36,packSixbit,HALF_MASK } from './word36.ts';

export class FileBlock extends WordBlock<typeof fileLayout>{
  constructor(memory:WordMemory,base=BigInt(fileLayout.address)){super(memory,fileLayout,base);}
}
export type FileJobState={jbff:bigint;jbrel:bigint;hungup:bigint};
export type FileRegisters={x1:bigint;x2:bigint;x3:bigint;t1:bigint;t2:bigint};
export type FileMonitor<W>={
  core(value:bigint):Generator<W,boolean,void>;
  outputTTY():Generator<W,void,void>;
  outstr(text:string):Generator<W,void,void>;
};
export type OpenServices<W>=FileMonitor<W>&{
  // BLT uses and updates caller-owned T1, including overlap and address carry.
  blt(lastAddress:bigint):void;
  getppn():Generator<W,bigint,void>;
  filop():Generator<W,boolean,void>; // T1 is the descriptor; true = success skip.
  successReturn():void; // AOS (P), before OPEN.6's .JBFF store.
  lookupOffset:bigint; // Monitor .FOLEB, undefined in the archive.
};

// WARMAC WARN/ASCIL:50-67: each monitor call has its own HUNGUP test.
export function* fileWarning<W>(state:Pick<FileJobState,'hungup'>,text:string,io:FileMonitor<W>):Generator<W,void,void>{
  if(state.hungup===0n)yield*io.outputTTY();
  if(state.hungup===0n)yield*io.outstr('%'+text+'\r\n');
}

// WARMAC OPEN:1426-1489. Working blocks and FL.FF are shared, not a stack of
// JS descriptors. The boolean mirrors the return skip; successReturn retains
// its actual source ordering. Full SAVE/RESTOR stack execution remains external.
export function* openFile<W>(block:FileBlock,state:FileJobState,r:FileRegisters,io:OpenServices<W>):Generator<W,boolean,void>{
  const x2=r.x2,x3=r.x3;
  block.write('fl.ff',0n);r.x3=state.jbff;
  r.x2=block.memory.read(rightHalf(r.x1)+1n);
  if(r.x2<0n){
    block.write('fl.ff',r.x3);r.x3=add36(r.x3,rightHalf(r.x2));
    r.x2=state.jbff;r.t1=rightHalf(r.x3-1n);
    if(r.t1>state.jbrel&&!(yield*io.core(r.t1))){
      yield*fileWarning(state,'Not enough core',io);
      r.x3=x3;r.x2=x2;return false; // OPEN.7 does not restore .JBFF.
    }
  }
  state.jbff=r.x2;
  r.t1=signed36(halfWords(rightHalf(r.x1+2n),block.address('foblk',0)));
  io.blt(block.address('foblk',4));
  if(block.memory.read(rightHalf(r.x1)+7n)!==0n){
    r.t1=block.address('leblk',0);block.memory.write(block.address('foblk',0)+io.lookupOffset,r.t1);
    r.t1=signed36(halfWords(rightHalf(r.x1+7n),block.address('leblk',0)));
    io.blt(block.address('leblk',3));
    if(block.memory.read(rightHalf(r.x1)+10n)<0n){
      r.t1=yield*io.getppn();block.write('le.ppn',r.t1);
    }
    r.t1=halfWords(6n,block.address('foblk',0));
  }else r.t1=halfWords(5n,block.address('foblk',0));
  if(block.read('debflg')!==0n){
    if(block.read('debflg')<=0n){r.t2=signed36(packSixbit('DSK'));block.write('fo.dev',r.t2);block.write('le.ppn',0n);}
    else{
      r.t2=leftHalf(block.read('le.ext'));
      if(r.t2===leftHalf(packSixbit('STA')))block.write('le.ppn',0n);
      if(r.t2===leftHalf(packSixbit('GRP')))r.t2=leftHalf(packSixbit('MPH'));
      block.write('le.ext',signed36(halfWords(r.t2,rightHalf(block.read('le.ext')))));
    }
  }
  const success=yield*io.filop();
  if(success)io.successReturn();
  else if(r.x3===state.jbff){
    r.x3=rightHalf(r.x2);yield*io.core(r.x2); // Failure ignored by JFCL.
  }
  state.jbff=r.x3;r.x3=x3;r.x2=x2;return success;
}

export type CloseServices<W>=FileMonitor<W>&{
  closeInstructionLeftHalf:bigint;
  executeClose():Generator<W,void,void>; // XCT T1, with live caller registers.
};
// WARMAC CLOSE:1495-1512. Clear FL.FF/write .JBFF before page comparison/CORE.
export function* closeFile<W>(block:FileBlock,state:FileJobState,r:FileRegisters,io:CloseServices<W>):Generator<W,void,void>{
  r.t1=signed36(halfWords(io.closeInstructionLeftHalf,0n));r.t2=leftHalf(block.read('fo.fnc'));
  r.t1=signed36((r.t1&~(15n<<23n))|((r.t2&15n)<<23n));
  yield*io.executeClose();
  r.t1=block.read('fl.ff');if(r.t1<=0n)return;
  block.write('fl.ff',0n);state.jbff=r.t1;
  r.t1&=HALF_MASK&~0o777n;
  r.t2=state.jbrel;r.t2&=HALF_MASK&~0o777n;
  if(r.t1===rightHalf(r.t2))return;
  if(!(yield*io.core(r.t1)))yield*fileWarning(state,"Can't reduce core",io);
}
