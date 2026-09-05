import test from 'node:test';
import assert from 'node:assert/strict';
import { dataStack } from '../src/compat/data-stack.ts';
import type { DataStackServices } from '../src/compat/data-stack.ts';
import { rawAccountCharacter,rawOchrBuffered,rawOchrTerminal,dispatchCharacter } from '../src/compat/raw-ochr.ts';
import { rawGripeCharacter,initializeGripeBuffer } from '../src/compat/ogch.ts';
import { machineRegisters } from '../src/compat/registers.ts';
import { AddressSpace,WordBlock } from '../src/compat/memory.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { FileBlock } from '../src/compat/files.ts';
import { halfWords,leftHalf,rightHalf,signed36,divide36 } from '../src/compat/word36.ts';
import { outputNumber } from '../src/compat/field-output.ts';
import type { NumberServices } from '../src/compat/field-output.ts';
import { outputSpace } from '../src/compat/text-output.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const m=new AddressSpace();m.map(0n,Array<bigint>(16).fill(0n));m.map(500n,Array<bigint>(300).fill(0n));
  m.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));
  const r=machineRegisters(m),block=new WordBlock(m,inputRuntimeLayout),state={hungup:0n,hcpos:0n,blank:0n},events:string[]=[],bytes:bigint[]=[];
  const initial=signed36(halfWords(-40n,599n));r.s=initial;r.p=signed36(halfWords(-40n,699n));r.c=13n;r.f=88n;
  const cpu:DataStackServices<string>={
    // Explicit ordinary PUSH/POP fixture. Overflow, flags and exceptional aliases remain CPU responsibilities.
    *pushS(word){r.s=signed36(halfWords(leftHalf(r.s)+1n,rightHalf(r.s)+1n));m.write(rightHalf(r.s),word);},
    *popS(){const word=m.read(rightHalf(r.s));r.s=signed36(halfWords(leftHalf(r.s)-1n,rightHalf(r.s)-1n));return word;},
    *outstrUnderflow(){events.push('underflow-message');yield 'warning';},*haltUnderflow(){events.push('halt');throw new Error('Underflow transfer');},
  };
  const stack=dataStack(r,state,initial,cpu);
  block.write('obfctr',500n);block.write('obfptr',501n);block.write('obfins',123n);m.write(500n,10n);m.write(501n,502n);
  const io={...stack,indirect(address:bigint){return rightHalf(m.read(address));},idpb(c:bigint){bytes.push(c);},
    *executeOutput(instruction:bigint){events.push(`output:${instruction}`);yield 'output';},
    *pushP(word:bigint){r.p=signed36(halfWords(leftHalf(r.p)+1n,rightHalf(r.p)+1n));m.write(rightHalf(r.p),word);yield 'push-p';},
    *popP(){const word=m.read(rightHalf(r.p));r.p=signed36(halfWords(leftHalf(r.p)-1n,rightHalf(r.p)-1n));return word;},
    *outchr(c:bigint){bytes.push(c);yield 'outchr';},
  };
  return {m,r,block,state,events,bytes,initial,cpu,stack,io};
}
test('RESTOR empty-stack check occurs before POP and warning precedes halt transfer',()=>{
  const f=fixture();f.cpu.popS=function*(){assert.fail('POP must not execute');};const g=f.stack.popData();assert.equal(g.next().value,'warning');
  assert.deepEqual(f.events,['underflow-message']);assert.throws(()=>done(g),/Underflow transfer/);assert.deepEqual(f.events,['underflow-message','halt']);assert.equal(f.r.s,f.initial);
});
test('hung-up RESTOR underflow skips warning but retains halt transfer',()=>{
  const f=fixture();f.state.hungup=-1n;assert.throws(()=>done(f.stack.popData()),/Underflow transfer/);assert.deepEqual(f.events,['halt']);
});
test('RESTOR compares the complete S word rather than only its address',()=>{
  const f=fixture();f.r.s=halfWords(0n,rightHalf(f.initial));f.m.write(rightHalf(f.initial),77n);assert.equal(done(f.stack.popData()),77n);assert.deepEqual(f.events,[]);
});
test('underflow warning changing S does not resume the skipped POP path',()=>{
  const f=fixture();const g=f.stack.popData();g.next();f.r.s=halfWords(-39n,600n);f.m.write(600n,99n);
  assert.throws(()=>done(g),/Underflow transfer/);assert.equal(f.r.s,signed36(halfWords(-39n,600n)));
});
test('SAVE and RESTOR use actual retained stack words without clearing popped storage',()=>{
  const f=fixture();done(f.stack.pushData(123n));assert.equal(f.m.read(600n),123n);assert.equal(done(f.stack.popData()),123n);
  assert.equal(f.r.s,f.initial);assert.equal(f.m.read(600n),123n);
});
test('printable OCHR accounting avoids all data-stack operations',()=>{
  const f=fixture();f.r.c=65n;done(rawAccountCharacter(f.state,f.r,{*pushData(){assert.fail();},*popData(){assert.fail();}}));assert.equal(f.state.hcpos,1n);
});
test('control accounting increments HCPOS before suspended SAVE and uses live C afterward',()=>{
  const f=fixture(),push=f.cpu.pushS;f.state.hcpos=8n;f.cpu.pushS=function*(word){yield*push(word);yield 'save';};
  const g=rawAccountCharacter(f.state,f.r,f.stack);assert.equal(g.next().value,'save');assert.equal(f.state.hcpos,9n);assert.equal(f.m.read(600n),13n);
  f.r.c=8n;done(g);assert.equal(f.state.hcpos,7n);assert.equal(f.r.c,13n);assert.equal(f.r.s,f.initial);
});
test('raw tab accounting exposes scratch C until a suspended RESTOR returns',()=>{
  const f=fixture();f.r.c=9n;f.state.hcpos=31n;const pop=f.cpu.popS;f.cpu.popS=function*(){yield 'restore';return yield*pop();};
  const g=rawAccountCharacter(f.state,f.r,f.stack);assert.equal(g.next().value,'restore');assert.equal(f.r.c,32n);assert.equal(f.state.hcpos,32n);
  done(g);assert.equal(f.r.c,9n);
});
test('control RESTOR underflow retains completed cursor changes and scratch C',()=>{
  const f=fixture();f.r.c=halfWords(7n,13n);f.state.hcpos=10n;f.cpu.pushS=function*(){};
  const g=rawAccountCharacter(f.state,f.r,f.stack);assert.equal(g.next().value,'warning');assert.equal(f.state.hcpos,0n);assert.equal(f.state.blank,-1n);assert.equal(f.r.c,13n);
  assert.throws(()=>done(g),/Underflow transfer/);
});
test('raw terminal hangup still accounts and pushes/pops a control character',()=>{
  const f=fixture();f.state.hungup=-1n;f.r.c=10n;done(rawOchrTerminal(f.state,f.r,f.io));assert.deepEqual(f.bytes,[]);assert.equal(f.state.blank,1n);assert.equal(f.m.read(600n),10n);assert.equal(f.r.s,f.initial);
});
test('raw terminal accounting follows live C after OUTCHR suspension',()=>{
  const f=fixture();f.r.c=65n;const g=rawOchrTerminal(f.state,f.r,f.io);assert.equal(g.next().value,'outchr');f.r.c=10n;done(g);
  assert.deepEqual(f.bytes,[65n]);assert.equal(f.state.hcpos,0n);assert.equal(f.state.blank,1n);assert.equal(f.r.c,10n);
});
test('raw buffered output saves AC0 on P only after OUTPUT and retries live hungup state',()=>{
  const f=fixture();f.m.write(500n,0n);const p=f.r.p,g=rawOchrBuffered(f.block,f.state,f.r,f.io);
  assert.equal(g.next().value,'output');f.r.f=99n;assert.equal(g.next().value,'push-p');assert.equal(f.m.read(700n),99n);assert.equal(f.m.read(500n),-1n);
  f.state.hungup=-1n;done(g);assert.equal(f.m.read(500n),80n);assert.equal(f.r.f,99n);assert.equal(f.r.p,p);assert.deepEqual(f.bytes,[]);
});
test('raw buffered control output deposits before SAVE and uses the same data stack',()=>{
  const f=fixture();const push=f.cpu.pushS;f.cpu.pushS=function*(word){yield*push(word);yield 'save';};
  const g=rawOchrBuffered(f.block,f.state,f.r,f.io);assert.equal(g.next().value,'save');assert.deepEqual(f.bytes,[13n]);assert.equal(f.m.read(500n),9n);assert.equal(f.state.hcpos,1n);done(g);
});
test('buffer-count write failure after PUSH P does not fabricate AC0 or P restoration',()=>{
  const f=fixture();f.m.write(500n,0n);const g=rawOchrBuffered(f.block,f.state,f.r,f.io);g.next();g.next();f.block.write('obfctr',9000n);
  assert.throws(()=>done(g),/Unmapped/);assert.equal(f.r.f,80n);assert.equal(rightHalf(f.r.p),700n);assert.equal(f.m.read(700n),88n);
});
test('OCHR dispatch resolves current OC every call and executes the resolved target',()=>{
  const f=fixture();f.r.c=65n;f.block.write('oc',100n);
  const io={*indirectAddress(a:bigint){assert.equal(a,f.block.address('oc'));return f.m.read(a);},
    *transfer(target:bigint){if(target===100n)yield*rawOchrTerminal(f.state,f.r,f.io);else if(target===200n)yield*rawOchrBuffered(f.block,f.state,f.r,f.io);else assert.fail();}};
  done(dispatchCharacter(f.block,io));f.block.write('oc',halfWords(7n,200n));done(dispatchCharacter(f.block,io));assert.deepEqual(f.bytes,[65n,65n]);assert.equal(f.m.read(500n),9n);
});
test('ONUM and raw OCHR share actual S memory during a control-character output callback',()=>{
  const f=fixture();f.r.x1=12n;f.r.x2=0n;f.r.x3=10n;f.r.x4=77n;
  const io:NumberServices<string>={...f.stack,*movm(dest,v){f.r[dest]=v<0n?-v:v;},
    *aobjn(){f.r.x4=signed36(halfWords(leftHalf(f.r.x4)+1n,rightHalf(f.r.x4)+1n));return f.r.x4<0n;},
    *idivi(divisor){const d=divide36(f.r.t1,divisor);f.r.t1=d.quotient;f.r.t2=d.remainder;},
    *space(){yield*outputSpace(f.r,io);},*ochr(){yield*rawOchrTerminal(f.state,f.r,{...f.io,*outchr(c){f.bytes.push(c);f.r.c=10n;}});},
  };
  done(outputNumber(f.r,'onum',io));assert.deepEqual(f.bytes,[49n,50n]);assert.equal(f.state.blank,2n);assert.equal(f.r.s,f.initial);assert.equal(f.r.x1,12n);assert.equal(f.r.x4,77n);
});
test('raw OGCH retries growth and enters the SAVE-aware OCHR.X tail',()=>{
  const f=fixture();f.m.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));f.m.map(40000n,Array<bigint>(30).fill(-1n));
  const file=new FileBlock(f.m),job={jbff:40000n,jbrel:40000n},s={bufferAddressOffset:0n,bufferPointerOffset:1n,bufferCountOffset:2n,point7LeftHalf:0o440700n};
  initializeGripeBuffer(file,job,f.r,s);f.block.write('obfctr',file.address('dbuf',2));f.block.write('obfptr',file.address('dbuf',1));
  const io={...f.io,*core(){yield 'core';return true;},*blt(end:bigint){let from=leftHalf(f.r.t1),to=rightHalf(f.r.t1);while(to<=end)f.m.write(to++,f.m.read(from++));},
    *outputTTY(){assert.fail();},*outstr(){assert.fail();}};
  const g=rawGripeCharacter(f.block,file,job,f.state,f.r,s,io);assert.equal(g.next().value,'core');done(g);
  assert.deepEqual(f.bytes,[13n]);assert.equal(f.m.read(600n),13n);assert.equal(f.r.s,f.initial);assert.equal(f.state.hcpos,0n);
});
