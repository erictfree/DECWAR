import type { WordMemory } from './memory.ts';
import type { FieldStack } from './field-output.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
import { characterBits } from '../generated/character-bits.ts';
// WARMAC.MAC:594-600, radix eight. These are token flags, not CF.* bits.
export const tokenFlags={num:0o1n,nnm:0o2n,eol:0o4n,chr:0o10n,sgn:0o20n,pnt:0o40n,neg:0o100n} as const;
export type TokenRegisters={f:bigint;c:bigint;t1:bigint;t2:bigint;x1:bigint;x2:bigint;x3:bigint;p1:bigint};
export type TokenSymbols={tknlst:bigint;vallst:bigint;ptrlst:bigint;cbits:bigint;scale:bigint;point7LeftHalf:bigint;tenLeftHalf:bigint};
export type TokenServices<W>=FieldStack<W>&{
  readCharacter():Generator<W,bigint,void>; // MOVE/HRRZ through current @BUFPTR; required effective-address/CPU binding.
  idpb():Generator<W,void,void>; // IDPB C,P1, including byte-pointer updates and faults.
  fltr(register:'x2'|'t1'):Generator<W,void,void>;
  fdv():Generator<W,void,void>; // FDV T1,T2
  fad():Generator<W,void,void>; // FAD X2,T1
  fmpri():Generator<W,void,void>; // FMPRI T2,(10.0), required immediate encoding.
  imuli():Generator<W,void,void>; // IMULI X2,decimal 10
  addi(operand:bigint):Generator<W,void,void>; // ADDI X2,effective address
  movn():Generator<W,void,void>; // MOVN X2,X2, including flags (also used for floating tokens).
};
const cf=characterBits.flags,has=(c:bigint,flag:number)=>(leftHalf(c)&BigInt(flag))!==0n;
const at=(base:bigint,index:bigint)=>rightHalf(base+rightHalf(index));
const classify=(m:WordMemory,r:TokenRegisters,s:TokenSymbols)=>{r.c=signed36(halfWords(rightHalf(m.read(at(s.cbits,r.c))),rightHalf(r.c)));};
// WARMAC.MAC:1799-1805. Full MOVE before indexing CBITS; no seven-bit guard.
export function* skipTokenBlanks<W>(m:WordMemory,state:{bufptr:bigint},r:TokenRegisters,s:TokenSymbols,io:TokenServices<W>):Generator<W,void,void>{
  for(;;){r.c=yield*io.readCharacter();classify(m,r,s);if(!has(r.c,cf['cf.spc']))return;state.bufptr=add36(state.bufptr,1n);}
}
// WARMAC.MAC:1811-1848. X3 is overwritten by the floating 10.0 immediate;
// NXTT's subsequent SOJL therefore no longer uses its original five-byte count.
export function* addTokenNumber<W>(m:WordMemory,r:TokenRegisters,s:TokenSymbols,io:TokenServices<W>):Generator<W,void,void>{
  if(has(r.c,cf['cf.sgn'])){
    const prior=r.f;r.f|=tokenFlags.sgn|tokenFlags.chr;
    if((prior&(tokenFlags.sgn|tokenFlags.chr))!==0n){illegal();return;}
    r.t1=rightHalf(r.c);if(r.t1===45n)r.f|=tokenFlags.neg;return;
  }
  if(has(r.c,cf['cf.pnt'])){
    const prior=r.f;r.f|=tokenFlags.pnt;if((prior&tokenFlags.pnt)!==0n){illegal();return;}
    yield*io.fltr('x2');r.x3=signed36(halfWords(s.tenLeftHalf,0n));m.write(s.scale,r.x3);return;
  }
  r.f|=tokenFlags.num;
  if((r.f&tokenFlags.pnt)===0n){yield*io.imuli();yield*io.addi(rightHalf(r.c-48n));return;}
  r.t1=rightHalf(r.c-48n);yield*io.fltr('t1');r.t2=m.read(s.scale);
  yield*io.fdv();yield*io.fad();yield*io.fmpri();m.write(s.scale,r.t2);
  function illegal(){r.f|=tokenFlags.nnm;r.x2=0n;}
}
// WARMAC.MAC:1747-1793. Table bases correspond to zero-based assembler labels;
// FORTRAN's first token word is at base+0. All saves use the shared S stack.
export function* nextToken<W>(m:WordMemory,state:{bufptr:bigint},r:TokenRegisters,s:TokenSymbols,io:TokenServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.x2);yield*io.pushData(r.x3);yield*io.pushData(r.p1);
  r.f=signed36(halfWords(leftHalf(r.f),0n));r.p1=signed36(halfWords(s.point7LeftHalf,at(s.tknlst,r.x1)));
  m.write(rightHalf(r.p1),0n);r.x3=5n;r.x2=0n;
  yield*skipTokenBlanks(m,state,r,s,io);r.t1=state.bufptr;m.write(at(s.ptrlst,r.x1),r.t1);
  r.c=rightHalf(r.c);let load=false;
  for(;;){
    if(load)r.c=rightHalf(yield*io.readCharacter());load=true;
    if(r.c>0o137n)r.c=add36(r.c,-0o40n);classify(m,r,s);
    if(has(r.c,cf['cf.eoc'])){r.f|=tokenFlags.eol;break;}
    if(has(r.c,cf['cf.dlm'])){
      yield*skipTokenBlanks(m,state,r,s,io);
      if(has(r.c,cf['cf.dlm']))state.bufptr=add36(state.bufptr,1n);
      if(has(r.c,cf['cf.eoc']))r.f|=tokenFlags.eol;break;
    }
    if((r.f&tokenFlags.nnm)!==0n||!has(r.c,cf['cf.num']))r.f|=tokenFlags.nnm;
    else yield*addTokenNumber(m,r,s,io);
    r.x3=add36(r.x3,-1n);if(r.x3>=0n)yield*io.idpb();
    r.f|=tokenFlags.chr;state.bufptr=add36(state.bufptr,1n);
  }
  if(has(r.c,cf['cf.eol']|cf['cf.com']))state.bufptr=-1n;
  if((r.f&tokenFlags.nnm)!==0n){r.x2=0n;r.f&=~(tokenFlags.num|tokenFlags.sgn|tokenFlags.neg|tokenFlags.pnt);}
  if((r.f&tokenFlags.neg)!==0n)yield*io.movn();m.write(at(s.vallst,r.x1),r.x2);
  r.p1=yield*io.popData();r.x3=yield*io.popData();r.x2=yield*io.popData();
}
