import test from 'node:test';
import assert from 'node:assert/strict';
import { loadArgumentBlock,selectArgumentBlock,sourceArguments,commonReturn } from '../src/compat/fortran-call.ts';
import { fortranText } from '../src/compat/fortran-text.ts';
import type { FortranTextEntry } from '../src/compat/fortran-text.ts';
import { outputDecimalArgument,outputTenthsArgument } from '../src/compat/numeric-wrappers.ts';
import { outputNumber } from '../src/compat/field-output.ts';
import type { NumberServices,NumberSign } from '../src/compat/field-output.ts';
import type { FixedPointServices } from '../src/compat/numeric-wrappers.ts';
import { outputSpace } from '../src/compat/text-output.ts';
import { AddressSpace } from '../src/compat/memory.ts';
import { FileBlock } from '../src/compat/files.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { machineRegisters } from '../src/compat/registers.ts';
import { halfWords,leftHalf,rightHalf,signed36,packAscii,divide36,add36,MIN_INTEGER } from '../src/compat/word36.ts';
import { TerminalOutput } from '../src/compat/output.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const m=new AddressSpace();m.map(0n,Array<bigint>(16).fill(77n));m.map(1000n,Array<bigint>(1000).fill(0n));m.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));
  const r=machineRegisters(m),file=new FileBlock(m),out=new TerminalOutput(),addresses:bigint[]=[],stack:bigint[]=[];
  const args=sourceArguments(m,r,address=>{
    addresses.push(address);
    // Explicit effective-address fixture, including one index register and indirect chains.
    for(let n=0;n<8;n++){const word=m.read(address),index=(word>>18n)&15n;assert.ok(index===0n||index===1n);
      address=rightHalf(rightHalf(word)+(index===1n?r.t1:0n));if((word&(1n<<22n))===0n)return address;}
    throw new Error('Fixture indirection limit');
  });
  const textIO={*ildb():Generator<string,bigint,void>{let pos=Number((r.p1>>30n)&63n),address=rightHalf(r.p1);assert.equal((r.p1>>24n)&63n,7n);
    if(pos<7){pos=36;address=rightHalf(address+1n);}pos-=7;r.p1=signed36((r.p1&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|address);return(m.read(address)>>BigInt(pos))&127n;},
    *ochr():Generator<string,void,void>{out.character(r.c);}};
  const state={get hcpos(){return BigInt(out.hcpos);},get blank(){return BigInt(out.blank);}};
  function select(header:bigint,words:bigint[]){loadArgumentBlock(m,header,words);selectArgumentBlock(r,header);}
  const run=(entry:FortranTextEntry)=>fortranText(entry,m,file,r,state,0o440700n,args,textIO);
  const targets={onum:1800n,osn1:1801n,osn2:1802n,osn3:1803n};
  const numeric:NumberServices<string>&FixedPointServices<string>={*pushData(word){stack.push(word);},*popData(){assert.ok(stack.length);return stack.pop()!;},
    argument:index=>args.read(index),*callNumber(address){const entry=Object.entries(targets).find(([,a])=>a===address)?.[0];assert.ok(entry);yield*outputNumber(r,entry as NumberSign,numeric);},
    *movm(dest,word){assert.notEqual(word,MIN_INTEGER);r[dest]=word<0n?-word:word;},
    *aobjn(){r.x4=signed36(halfWords(leftHalf(r.x4)+1n,rightHalf(r.x4)+1n));return r.x4<0n;},
    *idivi(divisor){const d=divide36(r.t1,divisor);r.t1=d.quotient;r.t2=d.remainder;},
    *idiviX1(divisor){const d=divide36(r.x1,divisor);r.x1=d.quotient;r.x2=d.remainder;},
    *space(){yield*outputSpace(r,numeric);},*ochr(){yield*textIO.ochr();},
  };
  return {m,r,file,out,args,addresses,textIO,select,run,numeric,targets,stack};
}
test('ARGBLK loads a negative count before full EXP words and selects the first argument separately',()=>{
  const f=fixture(),words=[halfWords(3n,1200n),-1n];loadArgumentBlock(f.m,1000n,words);
  assert.equal(f.r.arg,77n);assert.equal(f.m.read(1000n),signed36(halfWords(-2n,0n)));assert.equal(f.m.read(1001n),words[0]);assert.equal(f.m.read(1002n),-1n);
  selectArgumentBlock(f.r,halfWords(7n,1000n));assert.equal(f.r.arg,1001n);assert.equal(f.m.read(1000n),signed36(halfWords(-2n,0n)));
});
test('argument selection is only MOVEI and does not read or rebuild the literal block',()=>{
  const f=fixture();selectArgumentBlock(f.r,0o777777n);assert.equal(f.r.arg,0n);
});
test('argument reads resolve current indexed and indirect words with current ARG',()=>{
  const f=fixture();f.select(1000n,[(1n<<22n)|1100n]);f.m.write(1100n,(1n<<18n)|1200n);f.r.t1=2n;f.m.write(1202n,99n);
  assert.equal(f.args.address(0),1202n);assert.equal(f.args.read(0),99n);
  f.select(1010n,[1300n]);f.m.write(1300n,88n);assert.equal(f.args.read(0),88n);assert.deepEqual(f.addresses,[1001n,1001n,1011n]);
});
test('source argument access does not use header count as a missing-argument default',()=>{
  const f=fixture();f.select(1000n,[1200n]);f.m.write(1002n,1300n);f.m.write(1300n,42n);assert.equal(f.args.read(1),42n);
});
test('effective-address zero is preserved; only callers decide whether to skip a read',()=>{
  const f=fixture();f.select(1000n,[0n]);f.r.f=123n;assert.equal(f.args.address(0),0n);assert.equal(f.args.read(0),123n);
});
test('OUT reads its newline argument from the current ARG after string suspension',()=>{
  const f=fixture();f.select(1000n,[1200n,1300n]);f.m.write(1200n,packAscii('AB'));f.m.write(1300n,0n);
  loadArgumentBlock(f.m,1010n,[1200n,1301n]);f.m.write(1301n,1n);f.textIO.ochr=function*(){f.out.character(f.r.c);yield 'char';};
  const g=f.run('out');assert.equal(g.next().value,'char');selectArgumentBlock(f.r,1010n);done(g);assert.equal(f.out.drain(),'AB\r\n');assert.deepEqual(f.addresses,[1001n,1012n]);
});
test('OUT zero effective address avoids both the AC0 data and missing newline argument',()=>{
  const f=fixture();f.select(1000n,[0n]);done(f.run('out'));assert.equal(f.out.drain(),'');assert.deepEqual(f.addresses,[1001n]);
});
test('OUT preserves the first-word address heuristic through source arguments',()=>{
  const f=fixture();f.select(1000n,[1200n,1300n]);f.m.write(1200n,1250n);f.m.write(1250n,packAscii('LINK'));f.m.write(1300n,0n);done(f.run('out'));assert.equal(f.out.drain(),'LINK');
});
for(const [entry,n,expected] of [['skip',2n,'\r\n\r\n'],['tab',4n,'   '],['spaces',3n,'   ']] as const)
test(`FORTRAN ${entry} loads argument into the source counter`,()=>{
  const f=fixture();f.select(1000n,[1200n]);f.m.write(1200n,n);done(f.run(entry));assert.equal(f.out.drain(),expected);assert.deepEqual(f.addresses,[1001n]);
});
test('SPACE and CRLF do not access ARG even when it points outside memory',()=>{
  const f=fixture();f.r.arg=99000n;done(f.run('space'));done(f.run('crlf'));assert.equal(f.out.drain(),' \r\n');assert.deepEqual(f.addresses,[]);
});
test('OUT2C resolves the second character through the changed ARG',()=>{
  const f=fixture();f.select(1000n,[1200n]);loadArgumentBlock(f.m,1010n,[1300n]);f.m.write(1200n,packAscii('AB'));f.m.write(1300n,packAscii('XY'));
  f.textIO.ochr=function*(){f.out.character(f.r.c);yield 'char';};const g=f.run('out2c');assert.equal(g.next().value,'char');selectArgumentBlock(f.r,1010n);done(g);assert.equal(f.out.drain(),'AY');
});
test('OUT2W first TMP store can change the value named by the second argument',()=>{
  const f=fixture();f.select(1000n,[1200n,f.file.address('tmp',0)]);f.m.write(1200n,packAscii('ABCDE'));done(f.run('out2w'));assert.equal(f.out.drain(),'ABCDEABCDE');
});
test('OUTW zeroes only its source terminator, retaining later TMP words',()=>{
  const f=fixture();f.select(1000n,[1200n]);f.m.write(1200n,packAscii('HELLO'));f.file.write('tmp',88n,2);done(f.run('outw'));
  assert.equal(f.out.drain(),'HELLO');assert.equal(f.file.read('tmp',1),0n);assert.equal(f.file.read('tmp',2),88n);
});
test('ODEC composes memory arguments and raw numeric output with register restoration',()=>{
  const f=fixture();f.select(1000n,[1200n,1300n]);f.m.write(1200n,-12n);f.m.write(1300n,5n);
  done(outputDecimalArgument(f.r,'odec',f.targets,f.numeric));assert.equal(f.out.drain(),'  -12');assert.equal(f.r.x1,77n);assert.equal(f.r.x2,77n);assert.deepEqual(f.stack,[]);
});
test('OSFLT repeats the actual argument read after its first SAVE suspension',()=>{
  const f=fixture();f.select(1000n,[1200n,1300n]);f.m.write(1200n,-7n);f.m.write(1300n,0n);const push=f.numeric.pushData;let first=true;
  f.numeric.pushData=function*(word){yield*push(word);if(first){first=false;yield 'save';}};
  const g=outputTenthsArgument(f.r,{oflg:0n},'osflt',f.targets,f.numeric);assert.equal(g.next().value,'save');f.m.write(1200n,7n);done(g);
  assert.equal(f.out.drain(),'-0.7');assert.deepEqual(f.addresses,[1001n,1001n,1002n]);
});
test('CPOPJ leaves the return word unchanged and delegates actual POPJ transfer',()=>{
  const f=fixture();f.r.p=halfWords(-2n,1500n);f.m.write(1500n,halfWords(5n,1800n));let pc=0n;
  done(commonReturn(f.r,'cpopj',{*aos(){assert.fail();},*popjP(){pc=rightHalf(f.m.read(rightHalf(f.r.p)));}}));assert.equal(pc,1800n);assert.equal(f.m.read(1500n),halfWords(5n,1800n));
});
test('CPOPJ1 increments the full return word before POPJ, including right-half carry',()=>{
  const f=fixture();f.r.p=1500n;f.m.write(1500n,halfWords(5n,0o777777n));let popped=0n;
  done(commonReturn(f.r,'cpopj1',{*aos(address){f.m.write(address,add36(f.m.read(address),1n));},*popjP(){popped=f.m.read(rightHalf(f.r.p));}}));assert.equal(popped,halfWords(6n,0n));
});
test('CPOPJ1 uses live P after AOS suspension and preserves the original incremented word',()=>{
  const f=fixture();f.r.p=1500n;f.m.write(1500n,10n);f.m.write(1501n,99n);let popped=0n;
  const g=commonReturn(f.r,'cpopj1',{*aos(address){f.m.write(address,add36(f.m.read(address),1n));yield 'aos';},*popjP(){popped=f.m.read(rightHalf(f.r.p));}});
  assert.equal(g.next().value,'aos');f.r.p=1501n;done(g);assert.equal(popped,99n);assert.equal(f.m.read(1500n),11n);
});
test('CPOPJ1 AOS failure cannot fall through to POPJ',()=>{
  const f=fixture();assert.throws(()=>done(commonReturn(f.r,'cpopj1',{*aos(){throw new Error('AOS trap');},*popjP(){assert.fail();}})),/AOS trap/);
});
