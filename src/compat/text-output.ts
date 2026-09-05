import type { WordMemory } from './memory.ts';
import type { FileBlock } from './files.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';

export type TextRegisters={p1:bigint;c:bigint;t1:bigint;x1:bigint};
export type TextOutputServices<W>={
  ildb():Generator<W,bigint,void>; // ILDB C,P1; updates live P1, including CPU addressing.
  ochr():Generator<W,void,void>; // Current C and selected character routine.
};

// WARMAC OSTR./OSTR.X:2135-2139. OSTR replaces the pointer's left half;
// OSTR.X preserves it, enabling GRIPE's 36-bit LINBUF character words.
export function* outputString<W>(r:Pick<TextRegisters,'p1'|'c'>,point7LeftHalf:bigint,io:TextOutputServices<W>):Generator<W,void,void>{
  r.p1=signed36(halfWords(point7LeftHalf,rightHalf(r.p1)));yield*outputPointer(r,io);
}
export function* outputPointer<W>(r:Pick<TextRegisters,'p1'|'c'>,io:TextOutputServices<W>):Generator<W,void,void>{
  for(;;){r.c=signed36(yield*io.ildb());if(r.c===0n)return;yield*io.ochr();}
}

// WARMAC OUT:1987-1996. Effective argument address and value reads are
// separate required operations; missing FORTRAN arguments have no defaults.
export function* outputArgument<W>(m:WordMemory,r:TextRegisters,point7LeftHalf:bigint,
  argumentAddress:()=>bigint,lineCount:()=>bigint,io:TextOutputServices<W>):Generator<W,void,void>{
  r.p1=rightHalf(argumentAddress());if(r.p1===0n)return;
  r.t1=m.read(rightHalf(r.p1));if(leftHalf(r.t1)===0n)r.p1=m.read(rightHalf(r.p1));
  yield*outputString(r,point7LeftHalf,io);r.t1=lineCount();yield*skipLines(r,io);
}

// WARMAC SKIP.1:2002-2006. Unlike OCRL, this emits unconditional CR/LF.
export function* skipLines<W>(r:Pick<TextRegisters,'t1'|'c'>,io:Pick<TextOutputServices<W>,'ochr'>):Generator<W,void,void>{
  for(;;){r.t1=add36(r.t1,-1n);if(r.t1<0n)return;r.c=13n;yield*io.ochr();r.c=10n;yield*io.ochr();}
}
// WARMAC SPCs.:2028-2032 and TAB.:2014-2019. C is loaded only once;
// the source backward jump resumes at SOJL/SOJLE, not at MOVEI.
export function* outputSpaces<W>(r:Pick<TextRegisters,'x1'|'c'>,io:Pick<TextOutputServices<W>,'ochr'>):Generator<W,void,void>{
  r.c=32n;for(;;){r.x1=add36(r.x1,-1n);if(r.x1<0n)return;yield*io.ochr();}
}
export function* outputTab<W>(state:{hcpos:bigint},r:Pick<TextRegisters,'x1'|'c'>,io:Pick<TextOutputServices<W>,'ochr'>):Generator<W,void,void>{
  r.x1=add36(r.x1,-state.hcpos);r.c=32n;
  for(;;){r.x1=add36(r.x1,-1n);if(r.x1<=0n)return;yield*io.ochr();}
}
// WARMAC SPACE/OSPC.:2040-2043 and shared CRLF/OCRL.:2053-2064.
export function* outputSpace<W>(r:Pick<TextRegisters,'c'>,io:Pick<TextOutputServices<W>,'ochr'>):Generator<W,void,void>{r.c=32n;yield*io.ochr();}
export function* outputCrLf<W>(state:{blank:bigint;hcpos:bigint},r:Pick<TextRegisters,'c'>,io:Pick<TextOutputServices<W>,'ochr'>):Generator<W,void,void>{
  if(state.blank>0n&&state.hcpos===0n)return;r.c=13n;yield*io.ochr();r.c=10n;yield*io.ochr();
}

// WARMAC OUTC/OUT2C:2071-2085. Argument contents are reread for byte two.
export function* outputCharacters<W>(r:Pick<TextRegisters,'c'>,readWord:()=>bigint,count:1|2,io:Pick<TextOutputServices<W>,'ochr'>):Generator<W,void,void>{
  r.c=(readWord()>>29n)&127n;yield*io.ochr();
  if(count===2){r.c=(readWord()>>22n)&127n;yield*io.ochr();}
}
// WARMAC OUTW/OUT2W:2090-2108. Preserve TMP aliasing and the read/store
// order of separate arguments; the terminator is another real source word.
export function* outputWords<W>(file:FileBlock,r:TextRegisters,point7LeftHalf:bigint,
  first:()=>bigint,second:(()=>bigint)|undefined,io:TextOutputServices<W>):Generator<W,void,void>{
  r.t1=first();file.write('tmp',r.t1,0);
  if(second){r.t1=second();file.write('tmp',r.t1,1);file.write('tmp',0n,2);}else file.write('tmp',0n,1);
  r.p1=file.address('tmp',0);yield*outputString(r,point7LeftHalf,io);
}
