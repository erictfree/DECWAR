import test from 'node:test';
import assert from 'node:assert/strict';
import { outputTextField,outputSixbit,outputNumber,outputRadix } from '../src/compat/field-output.ts';
import type { NumberServices,NumberSign,SixbitServices } from '../src/compat/field-output.ts';
import { outputSpace } from '../src/compat/text-output.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { halfWords,leftHalf,rightHalf,signed36,unsigned36,packSixbit,divide36,MIN_INTEGER } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function numeric(){
  const r={x1:123n,x2:0n,x3:10n,x4:77n,t1:0n,t2:0n,c:0n},out=new TerminalOutput(),stack:bigint[]=[],events:string[]=[];
  // Explicit instruction/stack fixture: actual AOBJN, MOVM overflow and IDIVI
  // failure/flags are required production CPU services, not inferred defaults.
  const io:NumberServices<string>={*pushData(word){stack.push(word);},*popData(){assert.ok(stack.length);return stack.pop()!;},
    *movm(destination,value){if(value===MIN_INTEGER)throw new Error('Fixture MOVM overflow');r[destination]=value<0n?-value:value;},
    *aobjn(){r.x4=signed36(halfWords(leftHalf(r.x4)+1n,rightHalf(r.x4)+1n));return r.x4<0n;},
    *idivi(divisor){events.push(`divide:${divisor}`);const d=divide36(r.t1,divisor);r.t1=d.quotient;r.t2=d.remainder;},
    *space(){yield*outputSpace(r,io);},*ochr(){out.character(r.c);},
  };
  return {r,out,stack,events,io};
}
const cases:[NumberSign,bigint,bigint,string,bigint][]=[
  ['onum',0n,0n,'0',1n],['onum',123n,5n,'  123',5n],['onum',-123n,6n,'  -123',6n],
  ['onum',123n,-2n,'123',3n],['onum',123n,2n,'**',2n],['onum',-123n,3n,'-**',3n],['onum',-123n,1n,'-',1n],
  ['osn1',0n,0n,'0',1n],['osn1',7n,0n,'+7',2n],['osn1',-7n,0n,'-7',2n],
  ['osn2',0n,0n,'+0',2n],['osn3',0n,0n,'-0',2n],['osn3',7n,4n,'  +7',4n],
];
for(const [entry,value,width,text,actualWidth] of cases)test(`${entry} ${value} width ${width} preserves text, used width and saved registers`,()=>{
  const f=numeric();f.r.x1=value;f.r.x2=width;done(outputNumber(f.r,entry,f.io));assert.equal(f.out.drain(),text);assert.equal(f.r.x2,actualWidth);
  assert.equal(f.r.x1,value);assert.equal(f.r.x4,77n);assert.equal(f.r.c,-1n);assert.deepEqual(f.stack,[]);
});
test('numeric width magnitude is masked by MOVNI/MOVEI halfword operations before packing X4',()=>{
  const f=numeric();f.r.x2=halfWords(1n,2n);done(outputNumber(f.r,'onum',f.io));assert.equal(f.out.drain(),'**');assert.equal(f.r.x2,2n);
});
test('sign exhausts a one-column field before dividing or pushing any digit',()=>{
  const f=numeric();f.r.x2=1n;done(outputNumber(f.r,'osn2',f.io));assert.equal(f.out.drain(),'+');assert.deepEqual(f.events,[]);assert.deepEqual(f.stack,[]);
});
test('IDIVI uses radix right half and digits use ASCII addition rather than hexadecimal letters',()=>{
  const f=numeric();f.r.x1=26n;f.r.x3=halfWords(9n,16n);done(outputNumber(f.r,'onum',f.io));assert.equal(f.out.drain(),'1:');assert.deepEqual(f.events,['divide:16','divide:16']);
});
test('MOVM trap retains saved registers and sentinel at their precise source boundary',()=>{
  const f=numeric();f.r.x1=MIN_INTEGER;assert.throws(()=>done(outputNumber(f.r,'onum',f.io)),/MOVM overflow/);
  assert.deepEqual(f.stack,[MIN_INTEGER,77n,-1n]);assert.equal(f.out.drain(),'');
});
test('divide failure does not pop saved data or emit a placeholder',()=>{
  const f=numeric();f.r.x3=0n;assert.throws(()=>done(outputNumber(f.r,'onum',f.io)),/divide by zero/);assert.deepEqual(f.stack,[123n,77n,-1n]);assert.equal(f.out.drain(),'');
});
test('output suspension leaves remaining digits on the source stack and width flags live',()=>{
  const f=numeric();f.io.ochr=function*(){f.out.character(f.r.c);yield 'char';};const g=outputNumber(f.r,'onum',f.io);
  assert.equal(g.next().value,'char');assert.equal(f.out.drain(),'1');assert.deepEqual(f.stack,[123n,77n,-1n,3n,2n]);f.r.x2=-1n;
  done(g);assert.equal(f.out.drain(),'**');assert.equal(f.r.x2,3n);assert.deepEqual(f.stack,[]);
});
test('nonreturning numeric output leaves source sign register and saved caller registers unrestored',()=>{
  const f=numeric();f.io.ochr=function*(){throw new Error('Output transfer');};assert.throws(()=>done(outputNumber(f.r,'osn2',f.io)),/Output transfer/);
  assert.equal(f.r.x1,43n);assert.deepEqual(f.stack,[123n,77n,-1n,3n,2n,1n]);
});
test('ODEC. and OOCT. restore X3 but return ONUM actual width',()=>{
  const f=numeric();f.r.x1=63n;f.r.x3=99n;done(outputRadix(f.r,8,f.io));assert.equal(f.out.drain(),'77');assert.equal(f.r.x3,99n);assert.equal(f.r.x2,2n);
  f.r.x2=0n;done(outputRadix(f.r,10,f.io));assert.equal(f.out.drain(),'63');assert.equal(f.r.x3,99n);assert.deepEqual(f.stack,[]);
});

function stringField(text:string){
  const r={p1:halfWords(0o444400n,123n),c:0n,x1:31n,x2:44n},out=new TerminalOutput(),stack:bigint[]=[],chars=[...text].map(c=>BigInt(c.charCodeAt(0))).concat(0n);let reads=0;
  // Sequenced ILDB fixture. Encoding/address behavior is tested separately in
  // text-output tests; this fixture deliberately supplies only returned words.
  const io={*pushData(word:bigint){stack.push(word);},*popData(){assert.ok(stack.length);return stack.pop()!;},
    *ildb():Generator<string,bigint,void>{reads++;assert.ok(chars.length);return chars.shift()!;},*ochr():Generator<string,void,void>{out.character(r.c);}};
  return {r,out,stack,io,reads:()=>reads};
}
for(const [input,text] of [['','         '],['HELLO WORLD','HELLO    '],['ABCDEFGHI','ABCDEFGHI'],['ABCDEFGHIJK','ABCDEFGHIJ']] as const)
test(`OSTBX field ${JSON.stringify(input)} retains source padding and read limit`,()=>{
  const f=stringField(input);done(outputTextField(f.r,'ostbx',0o440700n,f.io));assert.equal(f.out.drain(),text);assert.equal(f.r.p1,signed36(halfWords(0o440700n,123n)));
  assert.equal(f.r.x1,31n);assert.equal(f.r.x2,44n);assert.deepEqual(f.stack,[]);assert.ok(f.reads()<=10);
});
test('OSTB.X retains caller pointer encoding and ends on space without padding',()=>{
  const f=stringField('AB CD'),pointer=f.r.p1;done(outputTextField(f.r,'ostb.x',0o440700n,f.io));assert.equal(f.out.drain(),'AB');assert.equal(f.r.p1,pointer);assert.equal(f.reads(),3);
});
test('OSTB sets seven-bit pointer but does not pad',()=>{
  const f=stringField('A');done(outputTextField(f.r,'ostb',0o440700n,f.io));assert.equal(f.out.drain(),'A');assert.equal(f.r.p1,signed36(halfWords(0o440700n,123n)));
});
test('field output reads live X1/X2 after OCHR, including a changed padding selector',()=>{
  const f=stringField('A');f.io.ochr=function*(){f.out.character(f.r.c);f.r.x1=1n;f.r.x2=0n;};done(outputTextField(f.r,'ostbx',0o440700n,f.io));assert.equal(f.out.drain(),'A');assert.equal(f.reads(),1);assert.deepEqual(f.stack,[]);
});
test('field pointer failure does not restore the saved X1/X2 words',()=>{
  const f=stringField('A');f.io.ildb=function*(){throw new Error('Pointer trap');};assert.throws(()=>done(outputTextField(f.r,'ostbx',0o440700n,f.io)),/Pointer trap/);assert.deepEqual(f.stack,[31n,44n]);assert.equal(f.r.x2,-1n);
});
function sixbit(){
  const r={x1:signed36(packSixbit('ABC')),c:7n,cNext:888n,x2:1n},out=new TerminalOutput(),stack:bigint[]=[];
  const io:SixbitServices<string>={*pushData(word){stack.push(word);},*popData(){assert.ok(stack.length);return stack.pop()!;},
    *lshc(){assert.equal(r.c,0n);r.c=unsigned36(r.cNext)>>30n;r.cNext=signed36(r.cNext<<6n);},*ochr(){out.character(r.c);}};
  return {r,out,stack,io};
}
test('OSIX emits exactly six characters regardless of X2 and restores X1 and C+1',()=>{
  const f=sixbit(),value=f.r.x1;done(outputSixbit(f.r,f.io));assert.equal(f.out.drain(),'ABC   ');assert.equal(f.r.x1,value);assert.equal(f.r.cNext,888n);assert.equal(f.r.x2,1n);assert.deepEqual(f.stack,[]);
});
test('OSIX rereads live shifting register after output rather than decoding the initial word',()=>{
  const f=sixbit();let once=true;f.io.ochr=function*(){f.out.character(f.r.c);if(once){once=false;f.r.cNext=signed36(packSixbit('ZZZZZZ'));}};
  done(outputSixbit(f.r,f.io));assert.equal(f.out.drain(),'AZZZZZ');assert.equal(f.r.cNext,888n);
});
