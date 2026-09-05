import type { WordBlock } from './memory.ts';
import type { FileBlock } from './files.ts';
import { fileWarning } from './files.ts';
import { ochrDeposit } from './ochr.ts';
import { rawOchrDeposit } from './raw-ochr.ts';
import type { FieldStack } from './field-output.ts';
import type { CharacterOutputState,BufferedOutputServices } from './ochr.ts';
import { add36,halfWords,rightHalf,signed36 } from './word36.ts';

export type GripeBufferSymbols={bufferAddressOffset:bigint;bufferPointerOffset:bigint;bufferCountOffset:bigint;point7LeftHalf:bigint};
export type GripeOutputRegisters={t1:bigint;t2:bigint;t3:bigint;c:bigint};
export type GripeOutputJob={jbff:bigint;jbrel:bigint};
export type GripeOutputServices<W>=Pick<BufferedOutputServices<W>,'indirect'|'idpb'>&{
  core():Generator<W,boolean,void>; // CORE T3; monitor skip success.
  blt(lastAddress:bigint):Generator<W,void,void>; // Live T1; includes overlap and AC effects.
  outputTTY():Generator<W,void,void>;
  outstr(text:string):Generator<W,void,void>;
};

// WARMAC GRIPE:4727-4731. No allocation, pointer increment or word clearing.
export function initializeGripeBuffer(file:FileBlock,job:Pick<GripeOutputJob,'jbff'>,r:Pick<GripeOutputRegisters,'t1'>,s:GripeBufferSymbols):void{
  const dbuf=file.address('dbuf',0),m=file.memory;
  r.t1=job.jbff;m.write(dbuf+s.bufferAddressOffset,r.t1);
  r.t1=signed36(halfWords(s.point7LeftHalf,rightHalf(r.t1)));m.write(dbuf+s.bufferPointerOffset,r.t1);
  m.write(dbuf+s.bufferCountOffset,0n);
}

// WARMAC OGCH.:4983-5001. Reenter through live @OBFCTR after growth; the
// count reset targets DBUF, even if indirect output now points elsewhere.
export function* gripeCharacter<W>(output:WordBlock,file:FileBlock,job:GripeOutputJob,state:CharacterOutputState,
  r:GripeOutputRegisters,s:GripeBufferSymbols,io:GripeOutputServices<W>):Generator<W,void,void>{
  yield*gripeCharacterBody(output,file,job,r,s,io,state,function*(){ochrDeposit(output,state,r,io);});
}
// Same OGCH growth path with actual SAVE/RESTOR-aware OCHR.X accounting.
export function* rawGripeCharacter<W>(output:WordBlock,file:FileBlock,job:GripeOutputJob,state:CharacterOutputState,
  r:GripeOutputRegisters,s:GripeBufferSymbols,io:GripeOutputServices<W>&FieldStack<W>):Generator<W,void,void>{
  yield*gripeCharacterBody(output,file,job,r,s,io,state,()=>rawOchrDeposit(output,state,r,io));
}
function* gripeCharacterBody<W>(output:WordBlock,file:FileBlock,job:GripeOutputJob,r:GripeOutputRegisters,s:GripeBufferSymbols,
  io:GripeOutputServices<W>,state:CharacterOutputState,deposit:()=>Generator<W,void,void>):Generator<W,void,void>{
  const m=file.memory,dbuf=file.address('dbuf',0);
  for(;;){
    const countAddress=io.indirect(output.address('obfctr'));
    const count=add36(m.read(countAddress),-1n);m.write(countAddress,count);
    if(count>=0n){yield*deposit();return;}
    r.t1=rightHalf(m.read(dbuf+s.bufferPointerOffset));r.t2=rightHalf(r.t1+20n);
    if(r.t2>job.jbrel){
      r.t3=rightHalf(r.t2);
      if(!(yield*io.core())){yield*fileWarning(state,"Can't get more core",io);return;}
    }
    job.jbff=r.t2;
    m.write(rightHalf(rightHalf(r.t1)+1n),0n);r.t1=rightHalf(2n+rightHalf(r.t1));
    r.t1=signed36(halfWords(rightHalf(r.t1-1n),rightHalf(r.t1)));
    yield*io.blt(rightHalf(r.t2));
    r.t1=100n;m.write(dbuf+s.bufferCountOffset,r.t1);
  }
}
