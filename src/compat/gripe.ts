import type { FileBlock } from './files.ts';
import { cleanupGripe,finishGripeInput,writeGripeFile } from './gripe-file.ts';
import type { GripeFileRegisters,GripeFileState,GripeFileSymbols,GripeFileServices } from './gripe-file.ts';
import { initializeGripeBuffer } from './ogch.ts';
import type { GripeBufferSymbols,GripeOutputRegisters,GripeOutputJob } from './ogch.ts';
import { add36,halfWords,rightHalf,signed36 } from './word36.ts';
import { constants as K,gripeText } from '../generated/source-data.ts';
import { characterBits } from '../generated/character-bits.ts';

export type GripeRegisters=GripeFileRegisters&GripeOutputRegisters&{f:bigint;arg:bigint};
export type GripeState=GripeFileState&{who:bigint;addrck:bigint};
export type GripeSymbols=GripeFileSymbols&GripeBufferSymbols&{
  shpcon:bigint;alive:bigint;active:bigint;prompt:bigint;onlyTwo:bigint;tooMany:bigint;
  linePointer:bigint; // Assembled [POINT 36,LINBUF].
  statisticsArgument:bigint; // Address of [[1]] for GRIP.Z's ARG.
};
export type GripeServices<W>=GripeFileServices<W>&{
  // The non-RED branch ends with a literal JRST .+1. Return only when its
  // resolved machine transfer resumes at ESHP; do not assume literal fallthrough.
  afterAlertCheck():Generator<W,void,void>;
  eshp():Generator<W,void,void>;
  osts():Generator<W,void,void>;
  inli():Generator<W,void,void>;
  ostrx():Generator<W,void,void>;
  diagnostic():Generator<W,void,void>;
  shosta():Generator<W,void,void>;
};

// WARMAC GRIPE..GRIP.1:4715-4768; GRIP.A/Z:4771-4774,4910-4912.
// This driver uses actual register/word state; the older game/gripe component
// remains useful for isolated fixtures but is not this runtime entry.
export function* rawGripe<W>(file:FileBlock,state:GripeState,job:GripeOutputJob,r:GripeRegisters,s:GripeSymbols,io:GripeServices<W>):Generator<W,void,void>{
  const m=file.memory;
  r.t3=state.who;
  if(r.t3!==0n){
    r.t1=m.read(s.shpcon+BigInt((K.KSPCON-1)*K.KNPLAY)-1n+rightHalf(r.t3));
    if(r.t1===BigInt(K.RED)){yield*io.outstr(gripeText[0].text);return;}
    yield*io.afterAlertCheck();
  }
  yield*io.eshp();initializeGripeBuffer(file,job,r,s);
  r.p1=rightHalf(s.prompt);if(state.addrck===0n)yield*io.ostr();
  r.x1=signed36(halfWords(s.grpfil,s.grpfil));yield*io.seto();yield*io.osts();
  if(state.addrck!==0n){
    if(state.addrck<0n)yield*io.diagnostic();
    else{r.arg=rightHalf(s.statisticsArgument);yield*io.shosta();}
    yield*writeGripeFile(file,state,job,r,s,io);return;
  }
  r.x2=20n;
  for(;;){
    r.x2=add36(r.x2,-1n);yield*io.inli();
    if(state.ccflg!==0n){yield*cleanupGripe(file,state,r,s,io);return;}
    r.p1=signed36(s.linePointer);yield*io.ostrx();
    if((r.f&BigInt(characterBits.flags['cf.eof']))!==0n){yield*finishGripeInput(file,state,job,r,s,io);return;}
    yield*io.ocrl();r.t1=state.who;
    if(r.t1!==0n&&m.read(s.alive-1n+rightHalf(r.t1))<0n)m.write(s.active-1n+rightHalf(r.t1),0n);
    r.p1=0n;if(r.x2===2n)r.p1=rightHalf(s.onlyTwo);if(r.x2===0n)r.p1=rightHalf(s.tooMany);
    if(r.p1===0n)continue;
    yield*io.seto();yield*io.ostr();yield*io.seto();
    if(r.x2!==0n)continue;
    yield*writeGripeFile(file,state,job,r,s,io);return;
  }
}

export type TextShipSymbols=Pick<GripeSymbols,'shpcon'|'alive'>;
export type TextShipRegisters=Pick<GripeRegisters,'t1'|'t2'|'t3'>;
// WARMAC ESHP.:5295-5306 and PSHP.:5316-5327. SDSP consumes live T1/T2/T3.
export function* eraseTextShip<W>(file:FileBlock,state:{who:bigint},r:TextShipRegisters,s:TextShipSymbols,sdsp:()=>Generator<W,void,void>):Generator<W,void,void>{
  r.t3=state.who;if(r.t3<=0n)return;
  r.t1=file.memory.read(s.shpcon+BigInt((K.KSPCON-1)*K.KNPLAY)-1n+rightHalf(r.t3));if(r.t1===BigInt(K.RED))return;
  r.t1=file.memory.read(s.shpcon+BigInt((K.KVPOS-1)*K.KNPLAY)-1n+rightHalf(r.t3));
  r.t2=file.memory.read(s.shpcon+BigInt((K.KHPOS-1)*K.KNPLAY)-1n+rightHalf(r.t3));r.t3=1000n;yield*sdsp();
}
export function* restoreTextShip<W>(file:FileBlock,state:{who:bigint},r:TextShipRegisters,s:TextShipSymbols,sdsp:()=>Generator<W,void,void>):Generator<W,void,void>{
  r.t3=state.who;if(r.t3<=0n||file.memory.read(s.alive-1n+rightHalf(r.t3))>=0n)return;
  r.t1=file.memory.read(s.shpcon+BigInt((K.KVPOS-1)*K.KNPLAY)-1n+rightHalf(r.t3));
  r.t2=file.memory.read(s.shpcon+BigInt((K.KHPOS-1)*K.KNPLAY)-1n+rightHalf(r.t3));
  r.t3=add36(r.t3,100n);if(r.t3>BigInt(100+K.KNPLAY/2))r.t3=add36(r.t3,100n);yield*sdsp();
}
