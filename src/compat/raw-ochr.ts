import type { WordBlock } from './memory.ts';
import type { CharacterOutputState,BufferedOutputServices } from './ochr.ts';
import type { FieldStack } from './field-output.ts';
import { add36,rightHalf,signed36,HALF_MASK } from './word36.ts';

// WARMAC OCHR.:1576. Resolve the actual @OC operand on every invocation.
// The transfer service handles target execution/CPU effects, with no default sink.
export function* dispatchCharacter<W>(block:WordBlock,io:{
  indirectAddress(address:bigint):Generator<W,bigint,void>;transfer(target:bigint):Generator<W,void,void>;
}):Generator<W,void,void>{yield*io.transfer(rightHalf(yield*io.indirectAddress(block.address('oc'))));}

// WARMAC OCHR.X/common tail:1599-1627. This raw entry uses SAVE/RESTOR C.
// The component accountCharacter helper deliberately has a synchronous contract.
export function* rawAccountCharacter<W>(state:Pick<CharacterOutputState,'hcpos'|'blank'>,r:{c:bigint},io:FieldStack<W>):Generator<W,void,void>{
  state.hcpos=add36(state.hcpos,1n);if((r.c&0o140n)!==0n)return;
  yield*io.pushData(r.c);r.c=rightHalf(r.c);state.hcpos=add36(state.hcpos,-1n);
  if(r.c===13n){if(state.hcpos!==0n)state.blank=-1n;state.hcpos=0n;}
  else{
    if(r.c===10n)state.blank=add36(state.blank,1n);
    if(r.c===8n)state.hcpos=add36(state.hcpos,-1n);
    if(r.c===9n){r.c=state.hcpos;r.c=add36(r.c,0o10n);r.c&=HALF_MASK&~0o37n;state.hcpos=r.c;}
  }
  r.c=signed36(yield*io.popData());
}
export type RawDepositServices<W>=FieldStack<W>&Pick<BufferedOutputServices<W>,'indirect'|'idpb'>;
// WARMAC OCHR.X:1598-1627. Deposit precedes the stack/cursor operations.
export function* rawOchrDeposit<W>(block:WordBlock,state:CharacterOutputState,r:{c:bigint},io:RawDepositServices<W>):Generator<W,void,void>{
  io.idpb(r.c,io.indirect(block.address('obfptr')));yield*rawAccountCharacter(state,r,io);
}
export type RawBufferedServices<W>=FieldStack<W>&BufferedOutputServices<W>&{
  pushP(word:bigint):Generator<W,void,void>;popP():Generator<W,bigint,void>;
};
// WARMAC OCHR.B:1578-1592. PUSH/POP P,0 occur after XCT OUTPUT and before
// retrying the live HUNGUP/count path. No synthetic restoration on transfer.
export function* rawOchrBuffered<W>(block:WordBlock,state:CharacterOutputState,r:{c:bigint;f:bigint},io:RawBufferedServices<W>):Generator<W,void,void>{
  for(;;){
    if(state.hungup!==0n)return;
    const address=io.indirect(block.address('obfctr')),count=add36(block.memory.read(address),-1n);block.memory.write(address,count);
    if(count>=0n){yield*rawOchrDeposit(block,state,r,io);return;}
    yield*io.executeOutput(block.read('obfins'));yield*io.pushP(r.f);r.f=80n;
    block.memory.write(io.indirect(block.address('obfctr')),r.f);r.f=signed36(yield*io.popP());
  }
}
// WARMAC OCHR.T:1593-1596. Hung-up direct output still enters accounting.
export function* rawOchrTerminal<W>(state:CharacterOutputState,r:{c:bigint},io:FieldStack<W>&{
  outchr(character:bigint):Generator<W,void,void>;
}):Generator<W,void,void>{if(state.hungup===0n)yield*io.outchr(r.c);yield*rawAccountCharacter(state,r,io);}
