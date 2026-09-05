import type { FileBlock } from './files.ts';
import { fileWarning } from './files.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';

export type GripeFileRegisters={x1:bigint;x2:bigint;t1:bigint;t4:bigint;p1:bigint};
export type GripeFileState={hungup:bigint;ccflg:bigint};
export type GripeFileSymbols={grpfil:bigint;ttyfil:bigint;separator:bigint;linbuf:bigint;
  bufferAddressOffset:bigint;bufferPointerOffset:bigint;fileBusyCode:bigint};
export type GripeFileServices<W>={
  ostr():Generator<W,void,void>; // P1 literal; current output destination.
  ocrl():Generator<W,void,void>; // Same entry as CRLF: suppresses extra blank lines.
  open():Generator<W,boolean,void>; // OPEN. success skip.
  hibernate():Generator<W,boolean,void>; // HIBER T1; true skips HALT.
  halt():Generator<W,void,void>; // Returning means continuation at the following instruction.
  core():Generator<W,boolean,void>; // CORE T1; true skips the failure branch.
  input(tmp:bigint):Generator<W,boolean,void>; // IN GRP,TMP: true skips JRST and enters warning.
  output(tmp:bigint):Generator<W,boolean,void>; // OUT GRP,TMP: same skip polarity.
  useto(block:bigint):Generator<W,void,void>;
  close():Generator<W,void,void>;
  seto():Generator<W,void,void>;
  pshp():Generator<W,void,void>;
  outputTTY():Generator<W,void,void>;
  outstr(text:string):Generator<W,void,void>;
};

// WARMAC GRIP.8:4967-4976. CLOSE sees the original DBUF address word, not
// a masked or cached allocation base. Subsequent calls finish before CCFLG clears.
export function* cleanupGripe<W>(file:FileBlock,state:GripeFileState,r:GripeFileRegisters,s:GripeFileSymbols,io:GripeFileServices<W>):Generator<W,void,void>{
  r.t1=file.memory.read(file.address('dbuf',0)+s.bufferAddressOffset);file.write('fl.ff',r.t1);
  yield*io.close();r.x1=signed36(halfWords(s.ttyfil,s.ttyfil));yield*io.seto();yield*io.pshp();state.ccflg=0n;
}

// WARMAC GRIP.2:4914-4921. Entry after an EOF line, with live X2 and LINBUF.
export function* finishGripeInput<W>(file:FileBlock,state:GripeFileState,job:{jbrel:bigint},r:GripeFileRegisters,s:GripeFileSymbols,io:GripeFileServices<W>):Generator<W,void,void>{
  if(r.x2===19n&&file.memory.read(s.linbuf)===0n){yield*cleanupGripe(file,state,r,s,io);return;}
  if(file.memory.read(s.linbuf)!==0n)yield*io.ocrl();
  yield*writeGripeFile(file,state,job,r,s,io);
}

// WARMAC GRIP.3..GRIP.8:4922-4976. Preserve full-word carries in X2/T1
// and actual low-memory TMP descriptors, including mutations during file calls.
export function* writeGripeFile<W>(file:FileBlock,state:GripeFileState,job:{jbrel:bigint},r:GripeFileRegisters,s:GripeFileSymbols,io:GripeFileServices<W>):Generator<W,void,void>{
  const m=file.memory,dbuf=file.address('dbuf',0);
  const cleanup=()=>cleanupGripe(file,state,r,s,io);
  r.p1=rightHalf(s.separator);yield*io.ostr();yield*io.ocrl();
  r.x2=m.read(dbuf+s.bufferPointerOffset);r.x2=signed36(halfWords(rightHalf(r.x2),rightHalf(r.x2)));
  for(;;){
    r.x1=signed36(halfWords(s.grpfil,s.grpfil));if(yield*io.open())break;
    r.t1=rightHalf(file.read('leblk',1));
    if(r.t1!==rightHalf(s.fileBusyCode)){yield*fileWarning(state,"Can't write DECWAR.GRP",io);yield*cleanup();return;}
    yield*fileWarning(state,'DECWAR.GRP being modified; trying again',io);
    r.t1=3000n;if(!(yield*io.hibernate()))yield*io.halt();
    if(state.ccflg!==0n){yield*cleanup();return;}
  }
  r.t4=file.read('leblk',3);
  if(r.t4>=0n)file.write('leblk',0n,3);
  else{
    r.t1=BigInt.asIntN(18,leftHalf(r.t4));r.t1=signed36(-r.t1);
    r.x2=add36(r.x2,rightHalf(r.t1));r.t1=rightHalf(r.x2);
    if(r.t1>job.jbrel&&!(yield*io.core())){yield*fileWarning(state,"Can't get core to read DECWAR.GRP",io);yield*cleanup();return;}
    r.t4=signed36(halfWords(leftHalf(r.t4),leftHalf(r.x2)));file.write('tmp',r.t4,0);file.write('tmp',0n,1);
    if(yield*io.input(file.address('tmp',0))){yield*fileWarning(state,"Can't read DECWAR.GRP",io);yield*cleanup();return;}
  }
  r.t1=m.read(dbuf+s.bufferAddressOffset);r.t1=add36(r.t1,-rightHalf(1n+rightHalf(r.x2)));
  r.t1=signed36(halfWords(rightHalf(m.read(dbuf+s.bufferAddressOffset)),rightHalf(r.t1)));
  r.t1=add36(r.t1,-halfWords(1n,0n));file.write('tmp',signed36(halfWords(rightHalf(r.t1),leftHalf(r.t1))),0);file.write('tmp',0n,1);
  yield*io.useto(1n);
  if(yield*io.output(file.address('tmp',0)))yield*fileWarning(state,"Can't write DECWAR.GRP",io);
  yield*cleanup();
}
