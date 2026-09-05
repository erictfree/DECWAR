import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace } from '../src/compat/memory.ts';
import { FileBlock } from '../src/compat/files.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { halfWords,rightHalf,packAscii,signed36,MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';
import { outputString,outputPointer,outputArgument,skipLines,outputSpaces,outputTab,outputSpace,outputCrLf,outputCharacters,outputWords } from '../src/compat/text-output.ts';
import type { TextOutputServices } from '../src/compat/text-output.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const m=new AddressSpace();m.map(0n,Array<bigint>(16).fill(0n));m.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));
  m.map(20000n,[packAscii('ABCDE'),packAscii('F'),0n]);m.map(20100n,[20000n]);m.map(21000n,[65n,-1n,0n]);
  const file=new FileBlock(m),r={p1:20000n,c:99n,t1:88n,x1:0n},out=new TerminalOutput(),reads:bigint[]=[];
  const state={get blank(){return BigInt(out.blank);},set blank(v:bigint){out.blank=Number(v);},get hcpos(){return BigInt(out.hcpos);},set hcpos(v:bigint){out.hcpos=Number(v);}};
  const io:TextOutputServices<string>={
    // Explicit simple-pointer CPU fixture; production ILDB effective-address,
    // index/indirection, overflow and AC effects remain a required operation.
    *ildb(){let p=r.p1,pos=Number((p>>30n)&63n),address=rightHalf(p);const size=Number((p>>24n)&63n);assert.ok(size===7||size===36);
      if(pos<size){address=rightHalf(address+1n);pos=36;}pos-=size;r.p1=signed36((p&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|address);
      reads.push(address);return signed36((m.read(address)>>BigInt(pos))&((1n<<BigInt(size))-1n));},
    *ochr(){out.character(r.c);},
  };
  return {m,file,r,out,state,reads,io};
}
test('OSTR replaces pointer left half and consumes the NUL byte after crossing a word',()=>{
  const f=fixture();f.r.p1=halfWords(0o777777n,20000n);done(outputString(f.r,0o440700n,f.io));assert.equal(f.out.drain(),'ABCDEF');assert.equal(f.r.c,0n);
  assert.deepEqual(f.reads,[20000n,20000n,20000n,20000n,20000n,20001n,20001n]);
});
test('OSTR.X retains POINT 36 and emits full character words until the zero word',()=>{
  const f=fixture();f.r.p1=halfWords(0o444400n,21000n);done(outputPointer(f.r,f.io));assert.equal(f.out.drain(),'A\x7f');assert.deepEqual(f.reads,[21000n,21001n,21002n]);assert.equal(f.r.c,0n);
});
test('OSTR.X follows a pointer changed while OCHR is suspended',()=>{
  const f=fixture();let first=true;f.io.ochr=function*(){f.out.character(f.r.c);if(first){first=false;yield 'char';}};
  const g=outputString(f.r,0o440700n,f.io);assert.equal(g.next().value,'char');f.r.p1=halfWords(0o440700n,20001n);done(g);assert.equal(f.out.drain(),'AF');
});
test('ILDB failure retains its pointer changes and previous C without synthetic cleanup',()=>{
  const f=fixture();f.io.ildb=function*(){f.r.p1=77n;throw new Error('Pointer trap');};assert.throws(()=>done(outputString(f.r,0o440700n,f.io)),/Pointer trap/);
  assert.equal(f.r.p1,77n);assert.equal(f.r.c,99n);assert.equal(f.out.drain(),'');
});
test('OUT null effective argument address returns before any data or line-count read',()=>{
  const f=fixture();done(outputArgument(f.m,f.r,0o440700n,()=>halfWords(7n,0n),()=>assert.fail(),f.io));assert.equal(f.r.p1,0n);assert.equal(f.r.t1,88n);assert.deepEqual(f.reads,[]);
});
test('OUT dereferences a first word with zero left half exactly once',()=>{
  const f=fixture();done(outputArgument(f.m,f.r,0o440700n,()=>20100n,()=>0n,f.io));assert.equal(f.out.drain(),'ABCDEF');assert.equal(f.r.t1,-1n);
});
test('OUT does not return early when the address-of-address word itself contains zero',()=>{
  const f=fixture();f.m.write(20100n,0n);f.m.write(0n,packAscii('R'));done(outputArgument(f.m,f.r,0o440700n,()=>20100n,()=>0n,f.io));assert.equal(f.out.drain(),'R');assert.equal(f.reads[0],0n);
});
test('OUT reads line count only after string output completes and uses unconditional SKIP',()=>{
  const f=fixture();let count=0n,first=true;f.io.ochr=function*(){f.out.character(f.r.c);if(first){first=false;yield 'char';}};
  const g=outputArgument(f.m,f.r,0o440700n,()=>20000n,()=>count,f.io);g.next();count=2n;done(g);assert.equal(f.out.drain(),'ABCDEF\r\n\r\n');assert.equal(f.r.t1,-1n);
});
test('OUT2C rereads argument storage for its second byte after output',()=>{
  const f=fixture();let word=packAscii('AB');f.io.ochr=function*(){f.out.character(f.r.c);word=packAscii('XY');};
  done(outputCharacters(f.r,()=>word,2,f.io));assert.equal(f.out.drain(),'AY');
});
test('OUTW stops at an embedded NUL and zeros only its one following TMP word',()=>{
  const f=fixture();f.file.write('tmp',123n,2);done(outputWords(f.file,f.r,0o440700n,()=>packAscii('A\0B'),undefined,f.io));
  assert.equal(f.out.drain(),'A');assert.equal(f.file.read('tmp',1),0n);assert.equal(f.file.read('tmp',2),123n);
});
test('OUT2W stores the first argument before evaluating a second argument aliasing TMP',()=>{
  const f=fixture();done(outputWords(f.file,f.r,0o440700n,()=>packAscii('ABCDE'),()=>f.file.read('tmp',0),f.io));
  assert.equal(f.out.drain(),'ABCDEABCDE');assert.equal(f.file.read('tmp',2),0n);
});
test('OUTW rereads current TMP bytes after output suspends',()=>{
  const f=fixture();let first=true;f.io.ochr=function*(){f.out.character(f.r.c);if(first){first=false;yield 'char';}};
  const g=outputWords(f.file,f.r,0o440700n,()=>packAscii('ABC'),undefined,f.io);g.next();f.file.write('tmp',packAscii('XYZ'),0);done(g);assert.equal(f.out.drain(),'AYZ');
});
test('CRLF and OCRL suppression leaves C untouched when already on a blank line',()=>{
  const f=fixture();f.state.blank=1n;f.state.hcpos=0n;done(outputCrLf(f.state,f.r,f.io));assert.equal(f.r.c,99n);assert.equal(f.out.drain(),'');
  f.state.hcpos=2n;done(outputCrLf(f.state,f.r,f.io));assert.equal(f.out.drain(),'\r\n');assert.equal(f.r.c,10n);
});
test('OCRL commits to both characters once admitted, without rechecking state after CR',()=>{
  const f=fixture();f.io.ochr=function*(){f.out.character(f.r.c);yield 'char';};const g=outputCrLf(f.state,f.r,f.io);
  assert.equal(g.next().value,'char');f.state.blank=10n;f.state.hcpos=0n;assert.equal(g.next().value,'char');done(g);assert.equal(f.out.drain(),'\r\n');
});
test('SKIP preserves a changed T1 across output and leaves the final negative count',()=>{
  const f=fixture();f.r.t1=2n;let first=true;f.io.ochr=function*(){f.out.character(f.r.c);if(first){first=false;f.r.t1=0n;}};
  done(skipLines(f.r,f.io));assert.equal(f.out.drain(),'\r\n');assert.equal(f.r.t1,-1n);
});
test('SPACES loads C only once, so a changed C is used on subsequent iterations',()=>{
  const f=fixture();f.r.x1=3n;f.io.ochr=function*(){f.out.character(f.r.c);f.r.c=88n;};done(outputSpaces(f.r,f.io));assert.equal(f.out.drain(),' XX');assert.equal(f.r.x1,-1n);
});
test('TAB uses a one-based target and live signed counter, while SPACE emits once',()=>{
  const f=fixture();f.state.hcpos=2n;f.r.x1=6n;done(outputTab(f.state,f.r,f.io));assert.equal(f.out.drain(),'   ');assert.equal(f.r.x1,0n);
  done(outputSpace(f.r,f.io));assert.equal(f.out.drain(),' ');
});
test('SKIP signed underflow wraps before its negative test',()=>{
  const f=fixture();f.r.t1=MIN_INTEGER;f.io.ochr=function*(){yield 'char';};const g=skipLines(f.r,f.io);assert.equal(g.next().value,'char');assert.equal(f.r.t1,MAX_INTEGER);g.return();
});
