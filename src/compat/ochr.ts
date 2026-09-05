import type { WordBlock } from './memory.ts';
import type { CharacterRegister,SetInputRegisters } from './ichr.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36,HALF_MASK } from './word36.ts';

export type CharacterOutputState={hungup:bigint;hcpos:bigint;blank:bigint};
export type OutputRegisters=CharacterRegister&{ac0:bigint};
export type BufferedOutputServices<W>={
  indirect(wordAddress:bigint):bigint;
  idpb(character:bigint,pointerAddress:bigint):void;
  executeOutput(instruction:bigint):Generator<W,void,void>;
};

// WARMAC:1599-1627. This is the common tail after IDPB or direct OUTCHR.
// C is saved only for control-character accounting, then restored on return.
export function accountCharacter(state:Pick<CharacterOutputState,'hcpos'|'blank'>,r:CharacterRegister):void{
  state.hcpos=add36(state.hcpos,1n);
  if((r.c&0o140n)!==0n)return;
  const saved=r.c;r.c=rightHalf(r.c);
  state.hcpos=add36(state.hcpos,-1n);
  if(r.c===13n){
    if(state.hcpos!==0n)state.blank=-1n;
    state.hcpos=0n;
  }else{
    if(r.c===10n)state.blank=add36(state.blank,1n);
    if(r.c===8n)state.hcpos=add36(state.hcpos,-1n);
    if(r.c===9n){
      r.c=state.hcpos;r.c=add36(r.c,0o10n);
      r.c&=HALF_MASK&~0o37n; // ANDI immediate mask clears C's left half.
      state.hcpos=r.c;
    }
  }
  r.c=saved;
}

// WARMAC OCHR.X:1598-1627. Byte deposition precedes all bookkeeping.
export function ochrDeposit(block:WordBlock,state:CharacterOutputState,r:CharacterRegister,
  io:Pick<BufferedOutputServices<never>,'indirect'|'idpb'>):void{
  io.idpb(r.c,io.indirect(block.address('obfptr')));
  accountCharacter(state,r);
}

// WARMAC OCHR.B:1578-1592. After OUTPUT the source forces the *current*
// indirect count to 80, restores AC0, and retries (consuming one count).
export function* ochrBuffered<W>(block:WordBlock,state:CharacterOutputState,r:OutputRegisters,
  io:BufferedOutputServices<W>):Generator<W,void,void>{
  for(;;){
    if(state.hungup!==0n)return;
    const address=io.indirect(block.address('obfctr'));
    const count=add36(block.memory.read(address),-1n);block.memory.write(address,count);
    if(count>=0n){ochrDeposit(block,state,r,io);return;}
    yield*io.executeOutput(block.read('obfins'));
    const saved=r.ac0;r.ac0=80n;
    block.memory.write(io.indirect(block.address('obfctr')),r.ac0);
    r.ac0=saved;
  }
}

// WARMAC OCHR.T:1593-1596. Unlike OCHR.B, a hung-up call still accounts C.
export function* ochrTerminal<W>(state:CharacterOutputState,r:CharacterRegister,
  outchr:(character:bigint)=>Generator<W,void,void>):Generator<W,void,void>{
  if(state.hungup===0n)yield*outchr(r.c);
  accountCharacter(state,r);
}

export type OutputMachineConstants={bufferCountOffset:bigint;bufferPointerOffset:bigint;outputInstructionLeftHalf:bigint};
// WARMAC SETO:1522-1541; file offsets .FBCIO/.FBBRH/.FBFNC:604-609.
// Monitor buffer offsets and the assembler's OUTPUT left half are required.
export function setOutput(block:WordBlock,r:SetInputRegisters,machine:OutputMachineConstants):void{
  r.t1=leftHalf(r.x1);
  r.x1=signed36(halfWords(rightHalf(block.read('obflb')),rightHalf(r.x1)));
  block.write('obflb',signed36(halfWords(leftHalf(block.read('obflb')),r.t1)));
  r.t2=leftHalf(block.memory.read(r.t1));block.write('oc',r.t2);
  r.t2=leftHalf(block.memory.read(r.t1+5n));
  r.t3=rightHalf(machine.bufferCountOffset+r.t2);block.write('obfctr',r.t3);
  r.t3=rightHalf(machine.bufferPointerOffset+r.t2);block.write('obfptr',r.t3);
  r.t2=signed36(halfWords(machine.outputInstructionLeftHalf,0n));block.write('obfins',r.t2);
  r.t2=leftHalf(block.memory.read(r.t1+2n));
  block.write('obfins',signed36((block.read('obfins')&~(15n<<23n))|((r.t2&15n)<<23n)));
}
