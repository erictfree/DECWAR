import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace } from '../src/compat/memory.ts';
import { LockBlock,releaseLock,zapLocks,killAllLocks,unlockArgument } from '../src/compat/unlock.ts';
import type { UnlockServices } from '../src/compat/unlock.ts';
import { lockLayout } from '../src/generated/lock-layout.ts';
import { lockLayout as extract } from '../tools/lock-layout.ts';
import { monit } from '../src/compat/monit.ts';
import type { MonitServices } from '../src/compat/monit.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
class Exit extends Error{}
function fixture(){
  const memory=new AddressSpace();memory.map(BigInt(lockLayout.address),Array<bigint>(lockLayout.words).fill(0n));
  memory.map(30000n,[halfWords(1n,5n),halfWords(2n,9n),halfWords(3n,0n)]);memory.map(31000n,Array<bigint>(12).fill(55n));
  const block=new LockBlock(memory),state={gameno:73n,hungup:0n},r={t1:123n,t2:44n,x2:55n,arg:66n};
  const symbols={queue:30000n,quereq:30001n,queuen:30002n,frelok:700n,staupd:800n};const events:(string|bigint)[]=[];
  const io:UnlockServices<string>={*deq(){events.push('deq');yield 'deq';return true;},*outstr(t){events.push(t);},*outchr(n){events.push(n);},*deboct(){events.push(`oct:${r.t1}`);},*fndlok(){events.push(`find:${r.t1}`);r.t1=3n;}};
  return {memory,block,state,r,symbols,events,io};
}
test('lock span uses both neighboring anchors and retains original 20-slot storage',()=>{
  assert.deepEqual(lockLayout,extract());assert.equal(lockLayout.words,174);assert.equal(lockLayout.maximum,20);assert.equal(lockLayout.fields.ttyBuffer.words,40);
  const f=fixture();f.block.write('loktab',1n,20);assert.equal(f.block.read('jsqwho'),1n);
});
test('UNLO masks key, clears highest match and preserves other duplicates/LOCKED before DEQ',()=>{
  const f=fixture();f.r.t1=signed36(halfWords(0o765432n,123n));f.block.write('loktab',123n,2);f.block.write('loktab',123n,18);f.block.write('locked',999n);
  const g=releaseLock(f.block,f.state,f.r,f.symbols,f.io);assert.equal(g.next().value,'deq');
  assert.equal(f.r.t1,123n);assert.equal(f.r.t2,30000n);assert.equal(f.block.read('loktab',18),0n);assert.equal(f.block.read('loktab',2),123n);assert.equal(f.block.read('locked'),999n);
  assert.equal(rightHalf(f.memory.read(30001n)),123n);assert.equal(leftHalf(f.memory.read(30001n)),2n);assert.equal(leftHalf(f.memory.read(30002n))&63n,9n);done(g);
});
for(const key of [700n,800n])test(`UNLO universal key ${key} clears only the six game-number bits`,()=>{
  const f=fixture();f.r.t1=key;f.memory.write(30002n,halfWords(0o765432n,0n));done(releaseLock(f.block,f.state,f.r,f.symbols,f.io));
  assert.equal(leftHalf(f.memory.read(30002n)),0o765400n);assert.equal(rightHalf(f.memory.read(30002n)),key);
});
test('UNLO compares full table words after masking T1 and still DEQs an unremembered key',()=>{
  const f=fixture();f.block.write('loktab',halfWords(1n,123n),19);done(releaseLock(f.block,f.state,f.r,f.symbols,f.io));assert.equal(f.block.read('loktab',19),halfWords(1n,123n));assert.deepEqual(f.events,['deq']);
});
test('UNLO DEQ error octal 24 returns silently; other errors keep the source diagnostic order',()=>{
  const f=fixture();f.io.deq=function*(){f.r.t2=0o24n;return false;};done(releaseLock(f.block,f.state,f.r,f.symbols,f.io));assert.deepEqual(f.events,[]);
  f.io.deq=function*(){f.r.t2=7n;return false;};done(releaseLock(f.block,f.state,f.r,f.symbols,f.io));
  assert.deepEqual(f.events,['\r\nFailure ','oct:123',' releasing ','find:123',35n,'\r\n']);
});
test('UNLO diagnostic initial strings are unguarded, while final character/newline honor HUNGUP',()=>{
  const f=fixture();f.state.hungup=-1n;f.io.deq=function*(){f.r.t2=1n;return false;};done(releaseLock(f.block,f.state,f.r,f.symbols,f.io));
  assert.deepEqual(f.events,['\r\nFailure ','oct:123',' releasing ','find:123']);
});
test('UNLO rereads queue name after diagnostic output and HUNGUP after character output',()=>{
  const f=fixture();f.io.deq=function*(){f.r.t2=1n;return false;};f.io.outstr=function*(s){f.events.push(s);if(s===' releasing ')f.memory.write(30002n,456n);};
  f.io.outchr=function*(n){f.events.push(n);yield 'char';f.state.hungup=-1n;};done(releaseLock(f.block,f.state,f.r,f.symbols,f.io));assert.ok(f.events.includes('find:456'));assert.equal(f.events.at(-1),35n);
});
test('ZAPLOK scans descending and sees slots changed during a suspended release',()=>{
  const f=fixture();f.block.write('loktab',200n,19);f.block.write('loktab',100n,3);
  const keys:bigint[]=[];const g=zapLocks(f.block,f.r,function*(){keys.push(f.r.t1);yield 'release';});
  assert.equal(g.next().value,'release');assert.equal(f.r.x2,19n);f.block.write('loktab',300n,18);done(g);
  assert.deepEqual(keys,[200n,300n,100n]);assert.equal(f.r.x2,-1n);assert.equal(f.r.t1,0n);
});
test('KILALL restores X2 while ZAPLOK leaves its final decrement visible',()=>{
  const f=fixture();f.block.write('loktab',1n,0);done(killAllLocks(f.block,f.r,function*(){yield 'release';}));assert.equal(f.r.x2,55n);
});
test('UNLOCK resolves the argument before clearing LOCKED and entering UNLO',()=>{
  const f=fixture();f.block.write('locked',91n);done(unlockArgument(f.block,f.r,()=>{assert.equal(f.block.read('locked'),91n);return halfWords(2n,123n);},function*(){assert.equal(f.r.t1,123n);assert.equal(f.block.read('locked'),0n);}));
});
test('actual ZAPLOK/UNLO releases each remembered key with live table updates',()=>{
  const f=fixture();f.block.write('loktab',123n,19);f.block.write('loktab',456n,0);done(zapLocks(f.block,f.r,()=>releaseLock(f.block,f.state,f.r,f.symbols,f.io)));
  assert.equal(f.block.read('loktab',19),0n);assert.equal(f.block.read('loktab',0),0n);assert.deepEqual(f.events,['deq','deq']);assert.equal(f.r.x2,-1n);
});
function monitorFixture(){
  const f=fixture(),state={hungup:0n,jbsa:signed36(halfWords(0o654321n,777n)),who:1n,jsqwho:2n};
  const symbols={whoArgumentList:32000n,jsqtab:31000n};
  const io:MonitServices<string>={*outputTTY(){f.events.push('output');yield 'output';},*zaplok(){f.events.push('zap');yield 'zap';},*reset(){f.events.push('reset');yield 'reset';},*free(){f.events.push('free');yield 'free';},
    // Explicit branch-target fixture; not evidence about assembler dot-in-literal semantics.
    *afterFreeJump(){return 'sequence-cleanup';},*monrt(){f.events.push('monrt');throw new Exit();}};
  return {...f,monitorState:state,monitorSymbols:symbols,monitorIo:io};
}
test('MONIT flushes before disabling restart, then zaps/resets before reading WHO',()=>{
  const f=monitorFixture(),g=monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo);
  assert.equal(g.next().value,'output');assert.equal(rightHalf(f.monitorState.jbsa),777n);
  assert.equal(g.next().value,'zap');assert.equal(rightHalf(f.monitorState.jbsa),0n);assert.equal(leftHalf(f.monitorState.jbsa),0o654321n);
  assert.equal(g.next().value,'reset');f.monitorState.who=0n;assert.throws(()=>done(g),Exit);assert.deepEqual(f.events,['output','zap','reset','monrt']);assert.equal(f.r.arg,66n);
});
test('MONIT zero WHO skips FREE and leaves stale JSQTAB entry even when JSQWHO is set',()=>{
  const f=monitorFixture();f.monitorState.who=0n;assert.throws(()=>done(monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo)),Exit);assert.equal(f.memory.read(31001n),55n);assert.ok(!f.events.includes('free'));
});
test('MONIT active WHO sets ARG before FREE and rereads JSQWHO after its wait',()=>{
  const f=monitorFixture(),g=monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo);g.next();g.next();g.next();assert.equal(g.next().value,'free');
  assert.equal(f.r.arg,32000n);f.monitorState.who=0n;f.monitorState.jsqwho=3n;assert.throws(()=>done(g),Exit);
  assert.equal(f.memory.read(31001n),55n);assert.equal(f.memory.read(31002n),0n);assert.equal(f.monitorState.jsqwho,3n);assert.equal(f.r.t1,3n);
});
test('MONIT hungup skips only the initial OUTPUT, retaining cleanup',()=>{
  const f=monitorFixture();f.monitorState.hungup=-1n;assert.throws(()=>done(monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo)),Exit);
  assert.deepEqual(f.events,['zap','reset','free','monrt']);assert.equal(f.memory.read(31001n),0n);
});
test('MONIT JSQWHO indexing can reach surrounding words without a player-range check',()=>{
  const f=monitorFixture();f.monitorState.jsqwho=12n;assert.throws(()=>done(monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo)),Exit);assert.equal(f.memory.read(31011n),0n);
});
test('MONIT with actual ZAPLOK/UNLO clears remembered locks before RESET and FREE',()=>{
  const f=monitorFixture();f.block.write('loktab',123n,19);
  f.monitorIo.zaplok=function*(){yield*zapLocks(f.block,f.r,()=>releaseLock(f.block,f.state,f.r,f.symbols,f.io));};
  f.monitorIo.reset=function*(){assert.equal(f.block.read('loktab',19),0n);f.events.push('reset');};
  assert.throws(()=>done(monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo)),Exit);assert.deepEqual(f.events,['output','deq','reset','free','monrt']);
});
test('FORTRAN leaveGame can yield into MONIT after clearing WHO, retaining source JSQTAB behavior',async()=>{
  const {leaveGame}=await import('../src/game/quit.ts');const {initialShip}=await import('../src/game/ship.ts');
  const f=monitorFixture();const player={ship:initialShip(),active:0n,hitflg:0n,msgflg:0n,ppn:1n,name1:2n,name2:3n,shipName1:4n,shipName2:5n,started:0n};
  const ctx={who:1,team:1,hungup:0n,ccflg:0n,addrck:0n,shared:{players:[player,player]}};
  Object.defineProperty(f.monitorState,'who',{get:()=>BigInt(ctx.who),set:(n:bigint)=>{ctx.who=Number(n);}});
  assert.throws(()=>done(leaveGame(ctx,{cctrap(){},daytime:()=>1n,*points(){return 9n;},*updsta(){},*free(){f.events.push('fortran-free');},
    *exit(){return yield*monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo);},
  })),Exit);
  assert.equal(ctx.who,0);assert.deepEqual(f.events,['fortran-free','output','zap','reset','monrt']);assert.equal(f.memory.read(31001n),55n);
});

test('START returning RUN composes MONIT and actual lock cleanup before monitor exit',async()=>{
  const {reloadRuntime}=await import('../src/compat/reset.ts');const {FileBlock}=await import('../src/compat/files.ts');const {fileLayout}=await import('../src/generated/file-layout.ts');
  const {CommonBlock}=await import('../src/compat/memory.ts');const {MemoryCommandInput}=await import('../src/compat/input-memory.ts');const {inputRuntimeLayout}=await import('../src/generated/input-runtime-layout.ts');const {packAscii}=await import('../src/compat/word36.ts');
  const f=monitorFixture();f.memory.map(0o140n,Array<bigint>(128).fill(0n));f.memory.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));
  f.memory.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));f.memory.map(32000n,[1n,2n,3n]);
  const input=new MemoryCommandInput(new CommonBlock(f.memory,'lowseg'),packAscii),file=new FileBlock(f.memory);f.block.write('loktab',123n,19);
  f.monitorIo.zaplok=function*(){yield*zapLocks(f.block,f.r,()=>releaseLock(f.block,f.state,f.r,f.symbols,f.io));};
  assert.throws(()=>done(reloadRuntime(input,file,f.r,{programName:32000n,programPpn:32001n,programDevice:32002n},{
    *run(){f.events.push('run-failed');assert.equal(f.r.t1,file.address('tmp',0));yield 'run';},
    *monit(){yield*monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo);},
  })),Exit);
  assert.deepEqual(f.events,['run-failed','output','deq','reset','free','monrt']);assert.equal(f.block.read('loktab',19),0n);assert.equal(f.memory.read(31001n),0n);
});

test('resolved post-FREE jump to MONRT bypasses appended JSQWHO code',()=>{
  const f=monitorFixture();f.monitorIo.afterFreeJump=function*(){return 'resume-monit';};
  assert.throws(()=>done(monit(f.memory,f.monitorState,f.r,f.monitorSymbols,f.monitorIo)),Exit);
  assert.equal(f.memory.read(31001n),55n);assert.equal(f.r.t1,1n);assert.deepEqual(f.events,['output','zap','reset','free','monrt']);
});
