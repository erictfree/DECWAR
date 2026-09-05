import type { WordMemory } from './memory.ts';
import { add36,halfWords,leftHalf,rightHalf,unsigned36 } from './word36.ts';

export type DiagnosticOutput<W>={
  ochr():Generator<W,void,void>; // Current C (octal AC11), including raw word accounting.
  ostr():Generator<W,void,void>; // Current P1 (octal AC12), assembled source literal.
  crlf():Generator<W,void,void>;
  space():Generator<W,void,void>;
};
export type OctalServices<W>=Pick<DiagnosticOutput<W>,'ochr'>&{
  pushData(word:bigint):Generator<W,void,void>; // SAVE on actual S stack.
  popData():Generator<W,bigint,void>; // RESTORE, including underflow behavior.
};

// WARMAC OCT.O:4896-4908. X2 is a live signed word counter; even a zero
// width pushes a digit before SOJG. Negative words shift logically. No JS
// formatting or local digit array replaces source stack/output side effects.
export function* octalStackOutput<W>(memory:WordMemory,io:OctalServices<W>):Generator<W,void,void>{
  yield*io.pushData(-1n);memory.write(1n,memory.read(5n));
  do{
    memory.write(2n,rightHalf(memory.read(1n)));yield*io.pushData(memory.read(2n));
    memory.write(1n,unsigned36(memory.read(1n))>>3n);
    memory.write(6n,add36(memory.read(6n),-1n));
  }while(memory.read(6n)>0n);
  for(;;){
    memory.write(0o11n,yield*io.popData());if(memory.read(0o11n)<0n)return;
    memory.write(0o11n,add36(memory.read(0o11n)&7n,48n));yield*io.ochr();
  }
}

export type DiagnosticSymbols={
  linbuf:bigint;stabuf:bigint;pdl:bigint;hitql:bigint;loktab:bigint;
  header:bigint;pdlLabel:bigint;hitLabel:bigint;lockLabel:bigint;
};
export type DiagnosticServices<W>=DiagnosticOutput<W>&{octal():Generator<W,void,void>};

// WARMAC GRIP.A (negative ADDRCK branch) through GRIPTU:4774-4894.
// AC numbers and source memory remain live across every output/stack service.
// Caller handles GRIP.Z and continuation to GRIP.3; no JS exception becomes APR.
export function* writeGripeDiagnostic<W>(m:WordMemory,s:DiagnosticSymbols,io:DiagnosticServices<W>):Generator<W,void,void>{
  const x1=5n,x2=6n,x3=7n,c=0o11n,p1=0o12n;
  const indexed=(base:bigint,ac:bigint)=>rightHalf(base+rightHalf(m.read(ac)));
  const oct=function*(word:bigint,width:bigint){m.write(x1,word);m.write(x2,width);yield*io.octal();};
  m.write(p1,rightHalf(s.header));yield*io.ostr();m.write(x1,0n);
  for(;;){
    m.write(c,m.read(indexed(s.linbuf,x1)));
    if(m.read(c)<=0o37n){m.write(c,94n);yield*io.ochr();m.write(c,m.read(indexed(s.linbuf,x1)));m.write(c,add36(m.read(c),64n));}
    yield*io.ochr();m.write(x1,add36(m.read(x1),1n));
    if(m.read(x1)>=80n||m.read(indexed(s.linbuf-1n,x1))===0n)break;
  }
  yield*io.crlf();yield*io.crlf();
  yield*oct(rightHalf(m.read(s.stabuf)),6n);yield*io.space();yield*io.space();
  yield*oct(m.read(s.stabuf+1n),12n);yield*io.space();yield*io.space();
  yield*oct((m.read(s.stabuf+1n)>>27n)&511n,3n);yield*io.space();
  yield*oct((m.read(s.stabuf+1n)>>23n)&15n,2n);m.write(c,44n);yield*io.ochr();
  m.write(1n,halfWords(1n<<4n,0n));m.write(c,64n);
  if((m.read(1n)&m.read(s.stabuf+1n))!==0n)yield*io.ochr();
  yield*oct(rightHalf(m.read(s.stabuf+1n)),6n);
  m.write(x1,(m.read(s.stabuf+1n)>>18n)&15n);
  if(m.read(x1)!==0n){m.write(c,40n);yield*io.ochr();m.write(x2,2n);yield*io.octal();m.write(c,41n);yield*io.ochr();}
  yield*io.crlf();m.write(x1,leftHalf(m.read(s.stabuf)));m.write(x2,6n);
  if(m.read(x1)!==0n)yield*io.octal();yield*io.crlf();m.write(x3,0n);
  for(;;){
    yield*oct(m.read(indexed(s.stabuf+2n,x3)),12n);yield*io.space();m.write(x3,add36(m.read(x3),1n));
    if((m.read(x3)&7n)===0n)yield*io.crlf();if(m.read(x3)===16n)break;
  }
  yield*io.crlf();m.write(p1,rightHalf(s.pdlLabel));yield*io.ostr();yield*oct(rightHalf(s.pdl),6n);yield*io.crlf();m.write(x3,0n);
  for(;;){
    yield*oct(m.read(indexed(s.pdl,x3)),12n);yield*io.space();m.write(x3,add36(m.read(x3),1n));
    if((m.read(x3)&7n)===0n)yield*io.crlf();
    m.write(1n,indexed(s.pdl,x3));m.write(2n,rightHalf(m.read(s.stabuf+2n+0o17n)));
    if(m.read(1n)>m.read(2n))break;
  }
  yield*io.crlf();m.write(p1,rightHalf(s.hitLabel));yield*io.ostr();yield*oct(rightHalf(s.hitql-1n),6n);yield*io.crlf();m.write(x3,1n);
  for(;;){
    yield*oct(m.read(indexed(s.hitql-2n,x3)),12n);yield*io.space();
    if((m.read(x3)&7n)===0n)yield*io.crlf();if(m.read(x3)===403n)break;m.write(x3,add36(m.read(x3),1n));
  }
  yield*io.crlf();m.write(p1,rightHalf(s.lockLabel));yield*io.ostr();yield*io.crlf();m.write(x3,1n);
  for(;;){
    yield*oct(m.read(indexed(s.loktab-1n,x3)),12n);yield*io.space();
    if((m.read(x3)&7n)===0n)yield*io.crlf();if(m.read(x3)===20n)break;m.write(x3,add36(m.read(x3),1n));
  }
  yield*io.crlf();
}
