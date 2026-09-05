import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { FileBlock } from '../src/compat/files.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { inputRuntime } from '../src/compat/input-runtime.ts';
import { interceptInterrupt,setControlTrap } from '../src/compat/interrupt.ts';
import type { InterruptServices } from '../src/compat/interrupt.ts';
import { add36,halfWords,leftHalf,rightHalf,packAscii,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
import { ichrTerminal } from '../src/compat/ichr.ts';
import { LockBlock } from '../src/compat/unlock.ts';
import { lockLayout } from '../src/generated/lock-layout.ts';
import { acquireLock } from '../src/compat/lock.ts';
import type { LockServices } from '../src/compat/lock.ts';
import { lockState } from '../src/compat/lock-state.ts';

function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const memory=new AddressSpace();memory.map(0n,Array.from({length:16},(_,i)=>BigInt(100+i)));
  memory.map(0o140n,Array<bigint>(128).fill(0n));
  memory.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));
  memory.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));
  const file=new FileBlock(memory),input=new MemoryCommandInput(new CommonBlock(memory,'lowseg'),packAscii),state=inputRuntime(input).state;
  file.write('intadr',halfWords(5n,700n));file.write('intflg',-1n);
  const events:string[]=[],returns:bigint[]=[],stack:bigint[]=[];
  // Explicit stack/BLT fixture, not a production CPU or PC-transfer implementation.
  const io:InterruptServices<string>={
    *pushReturn(word){events.push('push');stack.push(word);},
    *incrementReturn(){events.push('aos');stack[stack.length-1]=add36(stack.at(-1)!,1n);},
    *popReturn(){events.push('pop');returns.push(stack.pop()!);},
    *blt(ac,end){events.push(`blt:${ac}:${end}`);let from=leftHalf(memory.read(ac)),to=rightHalf(memory.read(ac));
      while(to<=end)memory.write(to++,memory.read(from++));},
    *callTrap(address){events.push(`trap:${address}`);yield 'trap';},
  };
  return {memory,file,input,state,events,returns,stack,io};
}
test('CCTRAP resolves an address into T1/TRPADR and clears only CCFLG',()=>{
  const f=fixture();f.state.ccflg=9n;f.state.ccflgDot=-1n;f.file.write('intflg',7n);
  setControlTrap(f.file,f.state,()=>halfWords(77n,400n));
  assert.equal(f.memory.read(1n),400n);assert.equal(f.file.read('trpadr'),400n);assert.equal(f.state.ccflg,0n);
  assert.equal(f.state.ccflgDot,-1n);assert.equal(f.file.read('intflg'),7n);
});
test('CCTRAP argument resolution failure does not invent a null trap or clear flags',()=>{
  const f=fixture();f.file.write('trpadr',9n);f.state.ccflg=7n;
  assert.throws(()=>setControlTrap(f.file,f.state,()=>{throw new Error('Missing argument address');}),/Missing argument/);
  assert.equal(f.file.read('trpadr'),9n);assert.equal(f.memory.read(1n),101n);assert.equal(f.state.ccflg,7n);
});
test('INTH pushes interrupted PC before flag changes and clears aliased INTBLK+2 before return',()=>{
  const f=fixture();f.io.pushReturn=function*(word){assert.equal(f.state.ccflg,0n);f.stack.push(word);yield 'push';};
  const g=interceptInterrupt(f.file,f.state,f.io);assert.equal(g.next().value,'push');assert.equal(f.file.read('intadr'),halfWords(5n,700n));
  done(g);assert.equal(f.state.ccflg,-1n);assert.equal(f.state.ccflgDot,-1n);assert.equal(f.file.read('intblk',2),0n);
  assert.deepEqual(f.returns,[halfWords(5n,700n)]);assert.equal(f.file.read('intflg'),-1n);
});
test('negative CCFLG. suppresses processing, including INWAIT increment and callback',()=>{
  const f=fixture();f.state.ccflgDot=-2n;f.state.ccflg=6n;f.state.inwait=-1n;f.file.write('trpadr',400n);
  done(interceptInterrupt(f.file,f.state,f.io));assert.deepEqual(f.events,['push','pop']);
  assert.equal(f.state.ccflg,6n);assert.equal(f.state.ccflgDot,-2n);assert.equal(f.file.read('intflg'),-1n);
  assert.equal(f.file.read('intadr'),0n);assert.deepEqual(f.returns,[halfWords(5n,700n)]);
});
test('positive CCFLG. enters processing and sets flags to minus one rather than decrementing',()=>{
  const f=fixture();f.state.ccflgDot=2n;f.state.ccflg=-30n;done(interceptInterrupt(f.file,f.state,f.io));
  assert.equal(f.state.ccflg,-1n);assert.equal(f.state.ccflgDot,-1n);assert.deepEqual(f.events,['push','pop']);
});
for(const waiting of [-1n,1n])test(`INWAIT ${waiting} increments full return word, including right-half carry`,()=>{
  const f=fixture();f.state.inwait=waiting;f.file.write('intadr',halfWords(5n,0o777777n));
  done(interceptInterrupt(f.file,f.state,f.io));assert.deepEqual(f.returns,[halfWords(6n,0n)]);assert.equal(f.state.inwait,waiting);
  assert.equal(f.memory.read(0o11n),109n); // No injected Ctrl-C in character AC.
});
test('INTH does not read or classify INTTYP or INTSAV despite fatal-error comments',()=>{
  const f=fixture();f.file.write('inttyp',-1n);f.file.write('intsav',999n);
  done(interceptInterrupt(f.file,f.state,f.io));assert.equal(f.file.read('inttyp'),-1n);assert.equal(f.file.read('intsav'),999n);
  assert.equal(f.memory.read(1n),101n);assert.deepEqual(f.events,['push','pop']);
});
for(const [before,after] of [[0n,1n],[-2n,-1n],[MAX_INTEGER,MIN_INTEGER]] as const)test(`INTFLG ${before} increments and skips callback when result is nonzero`,()=>{
  const f=fixture();f.file.write('intflg',before);f.file.write('trpadr',400n);
  done(interceptInterrupt(f.file,f.state,f.io));assert.equal(f.file.read('intflg'),after);assert.deepEqual(f.events,['push','pop']);
});
test('INTFLG minus one admits callback, saves octal AC0..16, then restores using required BLT',()=>{
  const f=fixture();f.file.write('trpadr',400n);const before=Array.from({length:15},(_,i)=>f.memory.read(BigInt(i)));
  const g=interceptInterrupt(f.file,f.state,f.io);assert.equal(g.next().value,'trap');
  assert.equal(f.file.read('intflg'),0n);assert.equal(f.memory.read(1n),400n);
  assert.deepEqual(Array.from({length:15},(_,i)=>f.file.read('savr',i)),before);
  for(let i=0;i<16;i++)f.memory.write(BigInt(i),BigInt(800+i));done(g);
  assert.deepEqual(Array.from({length:15},(_,i)=>f.memory.read(BigInt(i))),before);
  assert.equal(f.memory.read(0o17n),815n);assert.equal(f.file.read('intflg'),-1n);
  assert.deepEqual(f.events,['push',`blt:0:${f.file.address('savr',14)}`,'trap:400','blt:14:14','pop']);
});
test('TRPADR is reread after saving and zero then skips trap but still restores',()=>{
  const f=fixture();f.file.write('trpadr',400n);const blt=f.io.blt;f.io.blt=function*(ac,end){yield*blt(ac,end);if(ac===0n)f.file.write('trpadr',0n);};
  done(interceptInterrupt(f.file,f.state,f.io));assert.ok(!f.events.some(e=>e.startsWith('trap:')));assert.ok(f.events.includes('blt:14:14'));
  assert.equal(f.memory.read(1n),101n);assert.equal(f.file.read('intflg'),-1n);
});
test('nonzero full-word TRPADR uses its right half for PUSHJ, even when that is zero',()=>{
  const f=fixture();f.file.write('trpadr',halfWords(3n,0n));done(interceptInterrupt(f.file,f.state,f.io));assert.ok(f.events.includes('trap:0'));
});
test('callback CCTRAP changes persist after saved registers restore',()=>{
  const f=fixture();f.file.write('trpadr',400n);f.io.callTrap=function*(){setControlTrap(f.file,f.state,()=>500n);};
  done(interceptInterrupt(f.file,f.state,f.io));assert.equal(f.file.read('trpadr'),500n);assert.equal(f.state.ccflg,0n);
  assert.equal(f.state.ccflgDot,-1n);assert.equal(f.memory.read(1n),101n);
});
test('a callback that clears CCFLG. permits a nested entry but INTFLG prevents recursive callback',()=>{
  const f=fixture();f.file.write('trpadr',400n);let callbacks=0;f.io.callTrap=function*(){
    callbacks++;f.state.ccflgDot=0n;f.file.write('intadr',900n);yield*interceptInterrupt(f.file,f.state,f.io);
    assert.equal(f.file.read('intflg'),1n);
  };
  done(interceptInterrupt(f.file,f.state,f.io));assert.equal(callbacks,1);assert.equal(f.file.read('intflg'),-1n);
  assert.deepEqual(f.returns,[900n,halfWords(5n,700n)]);
});
test('a nonreturning callback does not run restoration or reset INTFLG through a finally block',()=>{
  const f=fixture();f.file.write('trpadr',400n);f.io.callTrap=function*(){f.memory.write(2n,999n);throw new Error('Transfer');};
  assert.throws(()=>done(interceptInterrupt(f.file,f.state,f.io)),/Transfer/);assert.equal(f.file.read('intflg'),0n);
  assert.equal(f.memory.read(2n),999n);assert.deepEqual(f.returns,[]);assert.ok(!f.events.includes('blt:14:14'));
});
test('the return address remains on the required stack and can be changed by the trap',()=>{
  const f=fixture();f.file.write('trpadr',400n);f.io.callTrap=function*(){f.stack[f.stack.length-1]=901n;};
  done(interceptInterrupt(f.file,f.state,f.io));assert.deepEqual(f.returns,[901n]);
});
test('INTH composes with suspended ICHR.T using shared INWAIT/CCFLG and preserves source LF fallback',()=>{
  const f=fixture();const r={get c(){return f.memory.read(0o11n);},set c(v){f.memory.write(0o11n,v);}};let clears=0;
  const g=ichrTerminal(f.state,r,{*inchwl(){yield 'inchwl';return 65n;},clearInput(){clears++;}});
  assert.equal(g.next().value,'inchwl');assert.equal(f.input.low.read('inflag'),-1n);
  done(interceptInterrupt(f.file,f.state,f.io));assert.deepEqual(f.returns,[halfWords(5n,701n)]);
  assert.equal(done(g),10n);assert.equal(clears,1);assert.equal(f.state.inwait,0n);assert.equal(f.state.ccflgDot,-1n);
});
test('INTH composes with busy LOCK cancellation without fabricating a grant or waking it itself',()=>{
  const f=fixture();f.memory.map(BigInt(lockLayout.address),Array<bigint>(lockLayout.words).fill(0n));
  f.memory.map(0o400010n,Array<bigint>(2922).fill(0n));f.memory.map(30000n,[0n,0n,0n]);
  const locks=new LockBlock(f.memory),grant={value:0n},state=lockState(f.input,new CommonBlock(f.memory,'hiseg'),locks,grant);
  const r={get t0(){return f.memory.read(0n);},set t0(v){f.memory.write(0n,v);},get t1(){return f.memory.read(1n);},set t1(v){f.memory.write(1n,v);},get t2(){return f.memory.read(2n);},set t2(v){f.memory.write(2n,v);}};
  r.t1=123n;const io:LockServices<string>={*enq(){r.t2=1n;return false;},*hibernate(n){yield `sleep:${n}`;},
    *uct(ac){r[ac]=ac==='t1'?100n:112n;return true;},*outstr(){},*outchr(){},*fndlok(){r.t1=1n;},*debdec(){},*enqc(){return false;},
    *unlo(){assert.equal(r.t1,123n);yield 'unlo';},*monit(){throw new Error('Unexpected MONIT');},
  };
  const g=acquireLock(locks,state,r,{queue:30000n,quereq:30001n,queuen:30002n,frelok:700n,staupd:800n},io);
  assert.equal(g.next().value,'sleep:100');assert.equal(g.next().value,'sleep:5000');
  done(interceptInterrupt(f.file,f.state,f.io));assert.equal(state.hvLok,0n);assert.equal(state.ccflg,-1n);
  assert.equal(g.next().value,'unlo');assert.equal(state.lkfail,0n);done(g);assert.equal(state.lkfail,-1n);
});
