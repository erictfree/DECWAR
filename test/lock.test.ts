import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { LockBlock,releaseLock } from '../src/compat/unlock.ts';
import { lockLayout } from '../src/generated/lock-layout.ts';
import { acquireLock,lockArgument,findLockName } from '../src/compat/lock.ts';
import type { LockServices } from '../src/compat/lock.ts';
import { halfWords,leftHalf,rightHalf,signed36,packSixbit,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
class Exit extends Error{}
function fixture(){
  const memory=new AddressSpace();memory.map(BigInt(lockLayout.address),Array<bigint>(lockLayout.words).fill(0n));memory.map(30000n,[0n,halfWords(3n,4n),halfWords(5n,6n)]);
  const block=new LockBlock(memory),state={lkfail:8n,hvLok:9n,ccflg:5n,ccflgDot:6n,gameno:73n,hungup:0n},r={t0:10n,t1:123n,t2:11n,t3:12n,x2:13n};
  const symbols={queue:30000n,quereq:30001n,queuen:30002n,frelok:700n,staupd:800n};const events:(string|bigint)[]=[];
  const io:LockServices<string>={*enq(){events.push('enq');yield 'enq';return true;},*hibernate(n){events.push(n);yield `sleep:${n}`;},
    *uct(register){events.push(`uct:${register}`);r[register]=register==='t1'?100n:112n;return true;},
    *outstr(text){events.push(text);},*outchr(n){events.push(`char:${n}`);},*fndlok(){events.push(`find:${r.t1}`);r.t1=3n;},
    *debdec(){events.push(`decimal:${r.t1}`);},*enqc(){events.push('enqc');block.write('whohas',44n,0);return true;},
    *unlo(){events.push(`unlo:${r.t1}`);yield 'unlo';},*monit(){events.push('monit');throw new Exit();},
  };
  return {memory,block,state,r,symbols,events,io};
}
function busy(f:ReturnType<typeof fixture>){f.io.enq=function*(){f.events.push('enq');f.r.t2=1n;return false;};}
test('LOCK clears failure/grant flags, masks key and remembers highest empty slot before ENQ',()=>{
  const f=fixture();f.r.t1=halfWords(5n,123n);const g=acquireLock(f.block,f.state,f.r,f.symbols,f.io);assert.equal(g.next().value,'enq');
  assert.equal(f.state.lkfail,0n);assert.equal(f.state.hvLok,0n);assert.equal(f.state.ccflg,5n);assert.equal(f.state.ccflgDot,6n);assert.equal(f.block.read('loktab',19),123n);
  assert.equal(f.r.t1,123n);assert.equal(f.r.t2,halfWords(2n,30000n));assert.equal(leftHalf(f.memory.read(30002n))&63n,9n);assert.equal(rightHalf(f.memory.read(30001n)),123n);done(g);
});
test('already-remembered key returns without touching queue words or ENQ, after flag clears',()=>{
  const f=fixture();f.block.write('loktab',123n,4);done(acquireLock(f.block,f.state,f.r,f.symbols,f.io));assert.deepEqual(f.events,[]);assert.equal(f.r.t2,4n);assert.equal(f.state.lkfail,0n);assert.equal(f.state.hvLok,0n);assert.equal(f.memory.read(30002n),halfWords(5n,6n));
});
test('zero key matches an empty slot and takes already-active return',()=>{
  const f=fixture();f.r.t1=0n;done(acquireLock(f.block,f.state,f.r,f.symbols,f.io));assert.deepEqual(f.events,[]);assert.equal(f.r.t2,19n);
});
for(const key of [700n,800n])test(`LOCK universal key ${key} clears only game-number bits`,()=>{
  const f=fixture();f.r.t1=key;f.memory.write(30002n,halfWords(0o765432n,0n));done(acquireLock(f.block,f.state,f.r,f.symbols,f.io));assert.equal(leftHalf(f.memory.read(30002n)),0o765400n);
});
test('full table executes the source address read; unresolved APR read retains prior state',()=>{
  const f=fixture();for(let i=0;i<20;i++)f.block.write('loktab',BigInt(i+1),i);assert.throws(()=>done(acquireLock(f.block,f.state,f.r,f.symbols,f.io)),/Unmapped source address 200000/);
  assert.equal(f.r.t2,-1n);assert.equal(f.r.t0,10n);assert.equal(f.state.lkfail,0n);assert.equal(f.block.read('whohas',2),0n);
});
test('a returning full-table read continues into LOKTAB(-1), aliasing WHOHAS',()=>{
  const f=fixture();for(let i=0;i<20;i++)f.block.write('loktab',BigInt(i+1),i);f.memory.map(0o200000n,[999n]);done(acquireLock(f.block,f.state,f.r,f.symbols,f.io));assert.equal(f.r.t0,999n);assert.equal(f.block.read('whohas',2),123n);
});
test('ENQ out-of-memory octal 13 waits 1000 then reissues ENQ without clearing flags again',()=>{
  const f=fixture();let calls=0;f.io.enq=function*(){f.events.push('enq');if(calls++===0){f.r.t2=0o13n;return false;}return true;};
  const g=acquireLock(f.block,f.state,f.r,f.symbols,f.io);assert.equal(g.next().value,'sleep:1000');f.state.hvLok=7n;done(g);assert.deepEqual(f.events,['enq',1000n,'enq']);assert.equal(f.state.hvLok,7n);
});
test('other ENQ errors print current error and enter MONIT, without undoing remembered lock',()=>{
  const f=fixture();f.state.hungup=-1n;f.io.enq=function*(){f.r.t2=13n;return false;};
  assert.throws(()=>done(acquireLock(f.block,f.state,f.r,f.symbols,f.io)),Exit);assert.deepEqual(f.events,['\r\nFatal ENQ. error code ','decimal:13','monit']);assert.equal(f.block.read('loktab',19),123n);
});
test('busy path hibernates 100, reads UCT, clears both Ctrl-C flags and waits 5000',()=>{
  const f=fixture();busy(f);const g=acquireLock(f.block,f.state,f.r,f.symbols,f.io);assert.equal(g.next().value,'sleep:100');assert.equal(f.state.ccflg,5n);
  assert.equal(g.next().value,'sleep:5000');assert.equal(f.r.t1,112n);assert.equal(f.state.ccflg,0n);assert.equal(f.state.ccflgDot,0n);
  f.state.hvLok=-1n;f.state.ccflg=-1n;done(g);assert.equal(f.state.lkfail,0n);assert.equal(f.state.ccflg,-1n);assert.deepEqual(f.events,['enq',100n,'uct:t1',5000n]);
});
test('early wake extends by 1000 using UCT deadline without issuing another ENQ',()=>{
  const f=fixture();busy(f);let clock=0;f.io.uct=function*(register){f.r[register]=register==='t1'?100n:110n+BigInt(clock++);return true;};
  const g=acquireLock(f.block,f.state,f.r,f.symbols,f.io);g.next();g.next();assert.equal(g.next().value,'sleep:1000');assert.equal(g.next().value,'sleep:1000');f.state.hvLok=1n;done(g);
  assert.deepEqual(f.events,['enq',100n,5000n,1000n,1000n]);
});
test('initial UCT failure uses zero and deadline twelve; grant still wins after a wait',()=>{
  const f=fixture();busy(f);f.io.uct=function*(){return false;};const g=acquireLock(f.block,f.state,f.r,f.symbols,f.io);g.next();assert.equal(g.next().value,'sleep:5000');assert.equal(f.r.t1,12n);f.state.hvLok=1n;done(g);
});
test('deadline addition wraps as a word',()=>{
  const f=fixture();busy(f);f.io.uct=function*(register){f.r[register]=MAX_INTEGER;return true;};const g=acquireLock(f.block,f.state,f.r,f.symbols,f.io);g.next();g.next();assert.equal(f.r.t1,MIN_INTEGER+11n);f.state.hvLok=1n;done(g);
});
test('expired wait reports owner then cancellation releases current queue and sets LKFAIL afterward',()=>{
  const f=fixture();busy(f);f.io.debdec=function*(){f.events.push(`decimal:${f.r.t1}`);f.state.ccflg=-1n;};
  const g=acquireLock(f.block,f.state,f.r,f.symbols,f.io);g.next();g.next();assert.equal(g.next().value,'unlo');assert.equal(f.state.lkfail,0n);assert.equal(f.r.t1,123n);done(g);assert.equal(f.state.lkfail,-1n);
  assert.deepEqual(f.events,['enq',100n,'uct:t1',5000n,'uct:t2','\r\n**** Lockup on queue ','find:123','char:35',' by job ','enqc','decimal:44','\r\n','unlo:123']);
});
test('current UCT failure uses 10000 and ENQC failure zeros only WHOHAS first word',()=>{
  const f=fixture();busy(f);f.io.uct=function*(register){if(register==='t1'){f.r.t1=0n;return true;}return false;};
  f.block.write('whohas',99n,0);f.block.write('whohas',88n,1);f.io.enqc=function*(){return false;};f.io.debdec=function*(){assert.equal(f.r.t1,0n);f.state.ccflg=1n;};
  done(acquireLock(f.block,f.state,f.r,f.symbols,f.io));assert.equal(f.block.read('whohas',0),0n);assert.equal(f.block.read('whohas',1),88n);
});
test('owner right half all ones prints zero; initial lockup text remains unguarded while hungup',()=>{
  const f=fixture();busy(f);f.state.hungup=-1n;f.io.enqc=function*(){f.block.write('whohas',-1n,0);return true;};f.io.debdec=function*(){f.events.push(`decimal:${f.r.t1}`);f.state.ccflg=1n;};
  done(acquireLock(f.block,f.state,f.r,f.symbols,f.io));assert.ok(f.events.includes('decimal:0'));assert.ok(f.events.includes('\r\n**** Lockup on queue '));assert.ok(!f.events.includes(' by job '));
});
test('without Ctrl-C timeout diagnostics reenter LOCK.0 using T2 left by DEBDEC, not another ENQ',()=>{
  const f=fixture();busy(f);let calls=0;f.io.debdec=function*(){f.events.push(`decimal:${f.r.t1}`);if(calls++===0)f.r.t2=7n;};
  assert.throws(()=>done(acquireLock(f.block,f.state,f.r,f.symbols,f.io)),Exit);
  assert.equal(f.events.filter(e=>e==='enq').length,1);assert.deepEqual(f.events.slice(-3),['\r\nFatal ENQ. error code ','decimal:7','monit']);
});
test('LOCK argument binding remembers key before raw acquisition; raw entry leaves LOCKED intact',()=>{
  const f=fixture();done(lockArgument(f.block,f.r,()=>halfWords(1n,123n),()=>acquireLock(f.block,f.state,f.r,f.symbols,f.io)));assert.equal(f.block.read('locked'),123n);
});
test('cancellation composes actual UNLO and leaves LOCKED while removing the remembered slot',()=>{
  const f=fixture();busy(f);f.block.write('locked',123n);f.io.debdec=function*(){f.state.ccflg=-1n;};
  f.io.unlo=function*(){yield*releaseLock(f.block,f.state,f.r,f.symbols,{*deq(){yield 'deq';return true;},*outstr(){assert.fail();},*outchr(){assert.fail();},*deboct(){assert.fail();},*fndlok(){assert.fail();}});};
  done(acquireLock(f.block,f.state,f.r,f.symbols,f.io));assert.equal(f.state.lkfail,-1n);assert.equal(f.block.read('loktab',19),0n);assert.equal(f.block.read('locked'),123n);
});
for(const [key,expected] of [[123n,'PPP'],[1000n,'BBB'],[1099n,'BBB'],[999n,'???'],[1100n,'???']] as const)test(`FNDLOK key ${key} returns ${expected} and restores T2/T3`,()=>{
  const f=fixture();f.memory.map(32000n,[halfWords(leftHalf(packSixbit('PPP')),123n),0n]);f.r.t1=key;
  findLockName(f.memory,f.r,{loknam:32000n,board:1000n,brdsiz:100n});assert.equal(f.r.t1,leftHalf(packSixbit(expected)));assert.equal(f.r.t2,11n);assert.equal(f.r.t3,12n);
});

async function bindFixture(f:ReturnType<typeof fixture>){
  const {MemoryCommandInput}=await import('../src/compat/input-memory.ts');const {inputRuntimeLayout}=await import('../src/generated/input-runtime-layout.ts');
  const {lockState}=await import('../src/compat/lock-state.ts');const {packAscii}=await import('../src/compat/word36.ts');
  f.memory.map(0o140n,Array<bigint>(128).fill(0n));f.memory.map(0o400010n,Array<bigint>(2922).fill(0n));
  f.memory.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));f.memory.map(31000n,[7n]);
  const input=new MemoryCommandInput(new CommonBlock(f.memory,'lowseg'),packAscii),high=new CommonBlock(f.memory,'hiseg');high.write('gameno',73n);
  const bound=lockState(input,high,f.block,{get value(){return f.memory.read(31000n);},set value(v){f.memory.write(31000n,v);}});
  return {input,high,bound};
}
test('lock state binds LOWSEG, HISEG, private locks and supplied HV.LOK without initializing them',async()=>{
  const f=fixture(),{input,high,bound}=await bindFixture(f);assert.equal(bound.hvLok,7n);assert.equal(bound.gameno,73n);
  bound.lkfail=-1n;assert.equal(input.low.read('lkfail'),-1n);input.low.write('ccflg',8n);assert.equal(bound.ccflg,8n);
  bound.ccflgDot=-1n;assert.equal(input.ccflgDot,-1n);bound.hvLok=-1n;assert.equal(f.memory.read(31000n),-1n);
  bound.locked=123n;bound.svlock=456n;assert.equal(f.block.read('locked'),123n);assert.equal(f.block.read('svlock'),456n);high.write('gameno',2n);assert.equal(bound.gameno,2n);
});
test('GTKN composes yielding UNLO, edited input and actual LOCK reacquisition over live state',async()=>{
  const {gtkn}=await import('../src/compat/gtkn.ts');const {inli}=await import('../src/compat/inli.ts');const {inputRuntime}=await import('../src/compat/input-runtime.ts');
  const {lowState}=await import('../src/game/common-state.ts');
  const f=fixture(),{input,bound}=await bindFixture(f),editor=inputRuntime(input).state,r=Object.assign(f.r,{c:0n,f:0n});
  bound.locked=123n;input.pointer=-1n;f.block.write('loktab',123n,19);const chars=[84n,73n,77n,69n,27n];let n=0;const out=lowState(input.low).output;
  const g=gtkn(bound,input,out,{inliOwnsMemory:true,daytime:()=>0n,inputPending:()=>false,*hibernate(){},
    *unlo(key){r.t1=key;yield*releaseLock(f.block,bound,r,f.symbols,{*deq(){yield 'deq';return true;},*outstr(){assert.fail();},*outchr(){assert.fail();},*deboct(){assert.fail();},*fndlok(){assert.fail();}});},
    *lock(key){r.t1=key;yield*acquireLock(f.block,bound,r,f.symbols,f.io);return bound.lkfail===0n;},
    *inli(){return yield*inli(input,editor,r,{flush(){},*ichr(){return chars[n++];},ochr:c=>out.character(c),outstr(){},outchr(){},aobjp(){assert.fail();}});},
  });
  assert.equal(g.next().value,'deq');assert.equal(input.pointer,0n);assert.equal(n,0);assert.equal(f.block.read('loktab',19),0n);
  assert.equal(g.next().value,'enq');assert.equal(input.pointer,-1n);assert.equal(input.rawLine,'TIME');assert.equal(f.block.read('loktab',19),123n);
  done(g);assert.equal(input.tokens[0].text,'TIME');assert.equal(bound.lkfail,0n);assert.equal(bound.locked,123n);assert.equal(bound.svlock,123n);
});
