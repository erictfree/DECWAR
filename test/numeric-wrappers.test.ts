import test from 'node:test';
import assert from 'node:assert/strict';
import { outputDecimalArgument,outputTenthsArgument,outputTwoDigits } from '../src/compat/numeric-wrappers.ts';
import type { FixedPointServices } from '../src/compat/numeric-wrappers.ts';
import { outputNumber } from '../src/compat/field-output.ts';
import type { NumberServices,NumberSign } from '../src/compat/field-output.ts';
import { outputSpace } from '../src/compat/text-output.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { divide36,halfWords,leftHalf,rightHalf,signed36,MIN_INTEGER } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(value=123n,width=0n){
  const r={x1:91n,x2:92n,x3:93n,x4:94n,t1:95n,t2:96n,c:97n},state={oflg:0n},stack:bigint[]=[],out=new TerminalOutput(),args=[value,width],reads:number[]=[],calls:bigint[]=[],divisions:bigint[]=[];
  const s={onum:1001n,osn1:1002n,osn2:1003n,osn3:1004n}; // Explicit linked-address fixture.
  const io:FixedPointServices<string> & NumberServices<string>={
    *pushData(word){stack.push(word);},*popData(){assert.ok(stack.length);return stack.pop()!;},
    argument(index){reads.push(index);return args[index];},
    *callNumber(target){calls.push(target);const entry=Object.entries(s).find(([,address])=>address===target)?.[0];assert.ok(entry);yield*outputNumber(r,entry as NumberSign,io);},
    // Explicit CPU fixture; actual flags/traps and stack addressing remain required services.
    *movm(destination,word){if(word===MIN_INTEGER)throw new Error('Fixture MOVM overflow');r[destination]=word<0n?-word:word;},
    *aobjn(){r.x4=signed36(halfWords(leftHalf(r.x4)+1n,rightHalf(r.x4)+1n));return r.x4<0n;},
    *idivi(divisor){const d=divide36(r.t1,divisor);r.t1=d.quotient;r.t2=d.remainder;},
    *idiviX1(divisor){divisions.push(divisor);const d=divide36(r.x1,divisor);r.x1=d.quotient;r.x2=d.remainder;},
    *space(){yield*outputSpace(r,io);},*ochr(){out.character(r.c);},
  };
  return {r,state,stack,out,args,reads,calls,divisions,s,io};
}
for(const [entry,value,text] of [['odec',-12n,'  -12'],['osdec',12n,'  +12'],['osdec',0n,'    0']] as const)
test(`${entry} calls raw numeric output for ${value} and restores caller width/radix`,()=>{
  const f=fixture(value,5n);done(outputDecimalArgument(f.r,entry,f.s,f.io));assert.equal(f.out.drain(),text);
  assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4],[91n,92n,93n,94n]);assert.deepEqual(f.stack,[]);assert.deepEqual(f.reads,[0,1]);
  assert.deepEqual(f.calls,[entry==='odec'?f.s.onum:f.s.osn1]);
});
test('decimal argument reads see register writes and follow actual argument alias order',()=>{
  const f=fixture();f.io.argument=index=>index===0?5n:f.r.x1;
  done(outputDecimalArgument(f.r,'odec',f.s,f.io));assert.equal(f.out.drain(),'    5');assert.equal(f.r.x1,91n);
});
test('decimal entry calls live T1 after an argument-stack suspension',()=>{
  const f=fixture(8n),push=f.io.pushData;let first=true;f.io.pushData=function*(word){yield*push(word);if(first){first=false;yield 'save';}};
  const g=outputDecimalArgument(f.r,'odec',f.s,f.io);assert.equal(g.next().value,'save');assert.deepEqual(f.stack,[91n]);
  f.r.t1=halfWords(7n,f.s.osn1);f.r.x2=222n;done(g);assert.equal(f.out.drain(),'+8');assert.equal(f.r.x2,222n);assert.deepEqual(f.calls,[f.s.osn1]);
});
test('failed decimal argument read leaves saved registers and prior argument assignment intact',()=>{
  const f=fixture();f.io.argument=index=>{if(index===1)throw new Error('Argument fault');return 8n;};
  assert.throws(()=>done(outputDecimalArgument(f.r,'odec',f.s,f.io)),/Argument fault/);
  assert.equal(f.r.x1,8n);assert.equal(f.r.x3,93n);assert.deepEqual(f.stack,[91n,92n,93n]);
});
for(const [entry,value,format,width,text] of [
  ['oflt',-7n,0n,0n,'0.7'],['osflt',-7n,0n,0n,'-0.7'],['osflt',7n,1n,0n,'+0.7'],
  ['osflt',0n,0n,0n,'-0.0'],['oflt',-123n,0n,5n,'  -12.3'],['osflt',-7n,-1n,0n,'-0'],
  ['oflt',-7n,-1n,0n,'0'],['oflt',1234n,0n,2n,'**.4'],['osflt',1234n,0n,1n,'+.4'],
] as const)test(`${entry} integer tenths ${value}, width ${width}, format ${format} yields ${text}`,()=>{
  const f=fixture(value,width);f.state.oflg=format;done(outputTenthsArgument(f.r,f.state,entry,f.s,f.io));
  assert.equal(f.out.drain(),text);assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4],[91n,92n,93n,94n]);assert.deepEqual(f.stack,[]);
  assert.deepEqual(f.reads,entry==='oflt'?[0,1]:[0,0,1]);assert.deepEqual(f.divisions,[10n]);
});
test('OSFLT chooses sign from its first read but divides the second argument value',()=>{
  const f=fixture(7n);let count=0;f.io.argument=index=>index===0?(count++===0?-7n:7n):0n;
  done(outputTenthsArgument(f.r,f.state,'osflt',f.s,f.io));assert.equal(f.out.drain(),'-0.7');assert.deepEqual(f.calls,[f.s.osn3]);
});
test('OSFLT initial argument failure precedes target selection and all saves',()=>{
  const f=fixture();f.io.argument=()=>{throw new Error('Argument fault');};
  assert.throws(()=>done(outputTenthsArgument(f.r,f.state,'osflt',f.s,f.io)),/Argument fault/);assert.equal(f.r.t1,95n);assert.deepEqual(f.stack,[]);
});
test('fixed-point split suspension precedes width read and magnitude operation',()=>{
  const f=fixture(-123n),divide=f.io.idiviX1;f.io.idiviX1=function*(d){yield 'divide';yield*divide(d);};
  const g=outputTenthsArgument(f.r,f.state,'oflt',f.s,f.io);assert.equal(g.next().value,'divide');assert.deepEqual(f.reads,[0]);
  assert.deepEqual(f.stack,[91n,92n,93n,94n]);f.args[1]=5n;done(g);assert.equal(f.out.drain(),'  -12.3');
});
test('split failure preserves caller saves without invoking numeric output',()=>{
  const f=fixture();f.io.idiviX1=function*(){throw new Error('Divide trap');};
  assert.throws(()=>done(outputTenthsArgument(f.r,f.state,'oflt',f.s,f.io)),/Divide trap/);
  assert.deepEqual(f.stack,[91n,92n,93n,94n]);assert.deepEqual(f.calls,[]);assert.deepEqual(f.reads,[0]);
});
test('format is read after integer output and can suppress the fraction during suspension',()=>{
  const f=fixture(123n);f.io.ochr=function*(){f.out.character(f.r.c);yield 'char';};
  const g=outputTenthsArgument(f.r,f.state,'oflt',f.s,f.io);assert.equal(g.next().value,'char');f.state.oflg=-1n;
  done(g);assert.equal(f.out.drain(),'12');assert.deepEqual(f.stack,[]);
});
test('fraction digit rereads X4 after decimal output and masks MOVEI to an address',()=>{
  const f=fixture(123n);f.io.ochr=function*(){f.out.character(f.r.c);if(f.r.c===46n)yield 'dot';};
  const g=outputTenthsArgument(f.r,f.state,'oflt',f.s,f.io);assert.equal(g.next().value,'dot');assert.deepEqual(f.stack,[91n,92n,93n,94n]);
  f.r.x4=halfWords(5n,9n);f.state.oflg=-1n;done(g);assert.equal(f.out.drain(),'12.9');assert.equal(f.r.c,57n);assert.equal(f.r.x4,94n);
});
test('nonreturning fraction output leaves wrapper saves unrestored',()=>{
  const f=fixture(123n);f.io.ochr=function*(){if(f.r.c===46n)throw new Error('Output transfer');f.out.character(f.r.c);};
  assert.throws(()=>done(outputTenthsArgument(f.r,f.state,'oflt',f.s,f.io)),/Output transfer/);
  assert.deepEqual(f.stack,[91n,92n,93n,94n]);assert.equal(f.r.x1,12n);assert.equal(f.r.x2,2n);assert.equal(f.r.x4,3n);
});
for(const [entry,value,text] of [['o2dg',123n,'23'],['o2dg',5n,'05'],['o2db',5n,' 5'],['o2db',123n,'<3'],['o2db',-1n,' /']] as const)
test(`${entry} ${value} preserves source two-character formatting`,()=>{
  const f=fixture();f.r.x1=value;done(outputTwoDigits(f.r,entry,f.io));assert.equal(f.out.drain(),text);
  assert.equal(f.r.x1,value);assert.equal(f.r.x2,92n);assert.deepEqual(f.stack,[]);assert.deepEqual(f.divisions,entry==='o2dg'?[100n,10n]:[10n]);
});
test('O2DG masks a negative remainder before second division and retains non-ASCII C accounting',()=>{
  const f=fixture();f.r.x1=-1n;const codes:bigint[]=[];f.io.ochr=function*(){codes.push(f.r.c);};
  done(outputTwoDigits(f.r,'o2dg',f.io));assert.deepEqual(codes,[26262n,51n]);assert.equal(f.r.x1,-1n);
});
test('two-digit output reads the live remainder after first character suspension',()=>{
  const f=fixture();f.r.x1=12n;f.io.ochr=function*(){f.out.character(f.r.c);yield 'char';};
  const g=outputTwoDigits(f.r,'o2db',f.io);assert.equal(g.next().value,'char');assert.deepEqual(f.stack,[12n,92n]);f.r.x2=9n;
  done(g);assert.equal(f.out.drain(),'19');assert.equal(f.r.x2,92n);
});
