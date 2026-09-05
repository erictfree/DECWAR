import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,rightHalf,signed36 } from '../src/compat/word36.ts';
function fixture(){const f=pregameRuntimeFixture([]),b=f.getHit.initialize,q=f.getHit.queues;b.events.length=0;return {...f,b,q,run:(entry:'setqh'|'setqm')=>finish(b.run(entry))};}
for(const entry of ['setqh','setqm'] as const)test(`Raw ${entry.toUpperCase()} clears only its own links and header`,()=>{
  const f=fixture(),target=entry==='setqh'?f.q.hit:f.q.message,other=entry==='setqh'?f.q.message:f.q.hit,p=f.r.p,s=f.r.s;target.header=123n;target.links.fill(456n);other.header=789n;other.links.fill(654n);f.run(entry);assert.equal(target.header,-1n);assert.ok(target.links.every(w=>w===0n));assert.equal(other.header,789n);assert.ok(other.links.every(w=>w===654n));assert.equal(f.r.p,p);assert.equal(f.r.s,s);
});
test('Raw SETQH retains HITSER, all hit payload words and HITFLG',()=>{
  const f=fixture();f.q.hit.serial=123n;for(let i=0;i<400;i++)f.q.hit.data[i].fill(BigInt(i+1));f.high.write('hitflg',9n,1);f.run('setqh');assert.equal(f.q.hit.serial,123n);for(let i=0;i<400;i++)assert.deepEqual([...f.q.hit.data[i]],Array<bigint>(4).fill(BigInt(i+1)));assert.equal(f.high.read('hitflg',1),9n);
});
test('Raw SETQM retains message payload words and MSGFLG',()=>{
  const f=fixture();for(let i=0;i<32;i++)f.q.message.data[i].fill(BigInt(i+1));f.high.write('msgflg',9n,1);f.run('setqm');for(let i=0;i<32;i++)assert.deepEqual([...f.q.message.data[i]],Array<bigint>(17).fill(BigInt(i+1)));assert.equal(f.high.read('msgflg',1),9n);
});
for(const entry of ['setqh','setqm'] as const)test(`Raw ${entry.toUpperCase()} passes the exact link endpoint and retains BLT register effects`,()=>{
  const f=fixture(),hit=entry==='setqh',base=hit?f.b.symbols.hitql:f.b.symbols.msgql,n=hit?400n:32n;f.b.io.blt=function*(last){assert.equal(last,base+n-1n);assert.equal(f.r.t1,signed36(halfWords(base,base+1n)));f.r.t1=-99n;};f.run(entry);assert.equal(f.r.t1,-99n);
});
for(const entry of ['setqh','setqm'] as const)test(`Raw ${entry.toUpperCase()} exposes header and first link before suspended BLT`,()=>{
  const f=fixture(),target=entry==='setqh'?f.q.hit:f.q.message,blt=f.b.io.blt;target.header=123n;target.links.fill(456n);f.b.io.blt=function*(last){yield 'reset';yield*blt(last);};const g=f.b.run(entry);assert.equal(g.next().value,'reset');assert.equal(target.header,-1n);assert.equal(target.links[0],0n);assert.equal(target.links[1],456n);finish(g);assert.ok(target.links.every(w=>w===0n));
});
test('Raw queue initializer loads the current literal after its unconditional stores',()=>{
  const f=fixture();f.b.symbols.hitLiteral=f.b.symbols.hitql;f.b.io.blt=function*(){assert.equal(f.r.t1,0n);};f.q.hit.links[0]=123n;f.run('setqh');assert.equal(f.q.hit.links[0],0n);
});
test('Raw queue initializer literal read failure preserves header and first-link writes',()=>{
  const f=fixture();f.q.message.header=123n;f.q.message.links.fill(456n);f.b.symbols.messageLiteral=100000n;assert.throws(()=>f.run('setqm'),/Unmapped/);assert.equal(f.q.message.header,-1n);assert.equal(f.q.message.links[0],0n);assert.equal(f.q.message.links[1],456n);
});
test('Raw queue initializer BLT failure retains copied prefix without rollback',()=>{
  const f=fixture();f.q.hit.links.fill(456n);f.b.io.blt=function*(){f.m.write(rightHalf(f.r.t1),0n);throw new Error('reset fault');};assert.throws(()=>f.run('setqh'),/reset fault/);assert.equal(f.q.hit.header,-1n);assert.equal(f.q.hit.links[0],0n);assert.equal(f.q.hit.links[1],0n);assert.equal(f.q.hit.links[2],456n);
});
test('Raw SETQH ordinary BLT propagates a changed first link rather than imposing zero',()=>{
  const f=fixture(),blt=f.b.io.blt;f.b.io.blt=function*(last){f.q.hit.links[0]=123n;yield*blt(last);};f.run('setqh');assert.ok(f.q.hit.links.every(w=>w===123n));
});
test('Raw queue initialization retains JOBSTA sequence table and JSQTIM in the shared block',()=>{
  const f=fixture();assert.equal(f.jobStatus.symbols.jsqtab,f.q.address('jsqtab'));f.low.write('who',2n);f.jobStatus.monitor.sequenceJob=17n;finish(f.jobStatus.run());assert.equal(f.m.read(f.q.address('jsqtab')+1n),17n);f.m.write(f.q.address('jsqtim'),123n);f.run('setqh');f.run('setqm');assert.equal(f.m.read(f.q.address('jsqtab')+1n),17n);assert.equal(f.m.read(f.q.address('jsqtim')),123n);
});
test('Raw SETQH leaves stale counts for GETHIT to decrement after pending links disappear',()=>{
  const f=fixture();f.low.write('who',1n);f.low.write('dbits',1n);f.low.write('iwhat',14n);f.high.write('hitflg',0n,1);finish(f.makeHit.run());assert.equal(f.high.read('hitflg',1),1n);const payload=[...f.q.hit.data[0]],serial=f.q.hit.serial;f.run('setqh');assert.equal(f.high.read('hitflg',1),1n);assert.deepEqual([...f.q.hit.data[0]],payload);assert.equal(f.q.hit.serial,serial);f.low.write('dbits',77n);finish(f.getHit.run());assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.low.read('dbits'),77n);assert.equal(f.low.read('iwhat'),0n);
});
test('Raw SETQM leaves stale counts and payload for GETMSG miss handling',()=>{
  const f=fixture();f.low.write('dbits',1n);f.low.write('dispfr',201n);f.high.write('msgflg',0n,1);finish(f.makeMessage.run());const payload=[...f.q.message.data[0]];f.run('setqm');assert.equal(f.high.read('msgflg',1),1n);assert.deepEqual([...f.q.message.data[0]],payload);f.m.write(f.getMessage.buffer,777n);finish(f.getMessage.run());assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.m.read(f.getMessage.buffer),777n);assert.equal(f.low.read('dbits'),0n);
});
test('Raw MAKHIT after SETQH continues HITSER and does not correct counts for discarded records',()=>{
  const f=fixture();f.low.write('who',1n);f.high.write('hitflg',0n,1);for(let i=0;i<2;i++){f.low.write('dbits',1n);f.low.write('iwhat',14n);finish(f.makeHit.run());if(i===0)f.run('setqh');}assert.equal(f.q.hit.serial,2n);assert.equal(f.high.read('hitflg',1),2n);assert.equal(f.q.hit.links[0],halfWords(2n,1n));assert.equal(f.q.hit.links[1],0n);
});
test('Raw MAKMSG can reserve a reset queue while preserving its retained payload until writing',()=>{
  const f=fixture();f.low.write('dbits',1n);f.high.write('msgflg',0n,1);finish(f.makeMessage.run());const payload=[...f.q.message.data[0]];f.run('setqm');f.r.x1=f.makeMessage.symbols.queuePointer;finish(f.queueProducer.run('rsrv'));assert.equal(f.r.x2,0n);assert.equal(f.q.message.links[0],-1n);assert.deepEqual([...f.q.message.data[0]],payload);
});
test('Composed runtime initialization uses both raw SETQ entries and retains their final pointer state',()=>{
  const f=pregameRuntimeFixture([]),b=f.getHit.initialize;assert.deepEqual(b.events,[`blt:${b.symbols.hitql+399n}`,`blt:${b.symbols.msgql+31n}`]);assert.equal(f.r.t1,signed36(halfWords(b.symbols.msgql+31n,b.symbols.msgql+32n)));assert.equal(f.getHit.queues.hit.header,-1n);assert.equal(f.getHit.queues.message.header,-1n);
});
