import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from '../src/compat/word36.ts';
function fixture(){
  const f=pregameRuntimeFixture([]),b=f.queueProducer,q=f.getHit.queues.message,base=f.getMessage.symbols.msgql;f.r.x1=signed36(halfWords(-32n,base));f.r.x2=99n;f.r.x3=777n;
  return {...f,b,q,base,reserve:()=>finish(b.run('rsrv')),update:()=>finish(b.run('updt')),publish:(index:number,bits=1n)=>q.publish(index,bits)};
}
test('Raw RSRV reserves the first physical zero word without publishing it or changing payload',()=>{
  const f=fixture(),p=f.r.p,s=f.r.s;f.q.data[0][0]=123n;f.reserve();assert.equal(f.r.x2,0n);assert.equal(f.q.links[0],-1n);assert.equal(f.q.header,-1n);assert.equal(f.q.data[0][0],123n);assert.equal(f.r.x3,777n);assert.equal(f.r.p,p);assert.equal(f.r.s,s);assert.deepEqual(f.b.events,['lock','unlo']);
});
test('Raw RSRV treats nonzero unlinked words as occupied and scans to the first zero',()=>{
  const f=fixture();f.q.links[0]=1n;f.q.links[1]=signed36(halfWords(7n,0n));f.q.links[2]=-1n;f.reserve();assert.equal(f.r.x2,3n);assert.equal(f.q.links[3],-1n);assert.equal(f.q.links[1],signed36(halfWords(7n,0n)));
});
test('Raw RSRV checks the final entry in the requested AOBJN span',()=>{
  const f=fixture();for(let i=0;i<31;i++)f.q.links[i]=-1n;f.reserve();assert.equal(f.r.x2,31n);assert.equal(f.q.links[31],-1n);
});
test('Raw RSRV lock failure returns without reservation, scan, or unlock',()=>{
  const f=fixture();f.b.io.lock=function*(){f.low.write('lkfail',1n);};f.reserve();assert.equal(f.r.x2,99n);assert.equal(f.q.links[0],0n);assert.deepEqual(f.b.events,[]);
});
test('Raw RSRV reads the current X1 after the lock returns',()=>{
  const f=fixture(),lock=f.b.io.lock;f.b.io.lock=function*(){yield*lock();f.r.x1=signed36(halfWords(-2n,f.base+4n));};f.reserve();assert.equal(f.r.x2,0n);assert.equal(f.q.links[4],-1n);assert.equal(f.q.links[0],0n);
});
test('Raw QRSRV tests its first word even for a zero-length descriptor',()=>{
  const f=fixture();f.r.x1=f.base;finish(f.b.run('qrsrv'));assert.equal(f.q.links[0],-1n);assert.equal(f.r.x2,0n);
});
test('Raw RSRV scan follows required AOBJN register changes',()=>{
  const f=fixture();f.q.links[0]=-1n;f.b.io.aobjnT1=function*(){f.r.t1=signed36(halfWords(-1n,f.base+7n));return true;};f.reserve();assert.equal(f.r.x2,7n);assert.equal(f.q.links[7],-1n);
});
test('Raw RSRV exposes the marked reservation before its index subtraction',()=>{
  const f=fixture(),subi=f.b.io.subi;f.b.io.subi=function*(reg,n){yield 'reserved';yield*subi(reg,n);};const g=f.b.run('rsrv');assert.equal(g.next().value,'reserved');assert.equal(f.q.links[0],-1n);assert.equal(f.r.x2,99n);finish(g);assert.equal(f.r.x2,0n);
});
test('Raw RSRV subtraction failure retains the reserved slot and acquired lock',()=>{
  const f=fixture();f.b.io.subi=function*(){throw new Error('index fault');};assert.throws(f.reserve,/index fault/);assert.equal(f.q.links[0],-1n);assert.equal(f.r.x2,99n);assert.ok(!f.b.events.includes('unlo'));
});
test('Raw RSRV unlock failure leaves its completed reservation and index',()=>{
  const f=fixture();f.b.io.unlo=function*(){throw new Error('unlo fault');};assert.throws(f.reserve,/unlo fault/);assert.equal(f.q.links[0],-1n);assert.equal(f.r.x2,0n);
});
test('Raw full RSRV removes one recipient from every entry without reconciling counters',()=>{
  const f=fixture(),s=f.r.s;for(let i=0;i<32;i++)f.publish(i,2n);f.high.write('msgflg',32n,2);f.reserve();assert.equal(f.q.header,-1n);assert.equal(f.q.links[0],-1n);assert.ok(f.q.links.slice(1).every(w=>w===0n));assert.equal(f.high.read('msgflg',2),32n);assert.equal(f.r.x3,777n);assert.equal(f.r.s,s);assert.equal(f.b.events.filter(e=>e==='lock').length,1);assert.equal(f.b.events.filter(e=>e==='remove').length,32);assert.equal(f.b.events.filter(e=>e==='unlo').length,1);
});
test('Raw full RSRV selects the low recipient bit from the oldest linked entry',()=>{
  const f=fixture();f.publish(31,12n);for(let i=0;i<31;i++)f.publish(i,i===7?4n:1n);f.reserve();assert.equal(f.r.x2,7n);assert.equal(f.q.links[7],-1n);assert.equal(rightHalf(f.q.links[31]),8n);assert.equal(leftHalf(f.q.header),31n);assert.equal(rightHalf(f.q.links[0]),1n);assert.equal(f.r.x3,777n);
});
test('Raw full RSRV chooses another recipient if the first eviction does not free a slot',()=>{
  const f=fixture();for(let i=0;i<32;i++)f.publish(i,3n);f.reserve();assert.equal(f.r.x2,0n);assert.equal(f.q.header,-1n);assert.equal(f.b.events.filter(e=>e==='save').length,2);assert.equal(f.b.events.filter(e=>e==='restore').length,2);assert.equal(f.b.events.filter(e=>e==='remove').length,64);
});
test('Raw full RSRV keeps original X3 on the actual SAVE stack while evicting',()=>{
  const f=fixture(),search=f.b.io.searchInner,s=f.r.s;for(let i=0;i<32;i++)f.publish(i,2n);let first=true;f.b.io.searchInner=function*(){if(first){first=false;assert.equal(f.m.read(rightHalf(f.r.s)),777n);assert.equal(f.r.x3,2n);yield 'eviction';}return yield*search();};const g=f.b.run('rsrv');assert.equal(g.next().value,'eviction');assert.notEqual(f.r.s,s);finish(g);assert.equal(f.r.s,s);assert.equal(f.r.x3,777n);
});
test('Raw full RSRV required MOVNI result and current T1 determine the eviction bit',()=>{
  const f=fixture();for(let i=0;i<32;i++)f.publish(i,4n);f.b.io.movniX3=function*(n){assert.equal(n,4n);f.r.x3=12n;};f.reserve();assert.equal(f.q.header,-1n);assert.equal(f.r.x3,777n);
});
test('Raw full RSRV removal failure retains SAVE state and completed link changes',()=>{
  const f=fixture(),remove=f.b.io.removeInner,s=f.r.s;for(let i=0;i<32;i++)f.publish(i,1n);f.b.io.removeInner=function*(){yield*remove();throw new Error('eviction fault');};assert.throws(f.reserve,/eviction fault/);assert.equal(f.q.links[0],0n);assert.equal(leftHalf(f.q.header),1n);assert.notEqual(f.r.s,s);assert.equal(f.m.read(rightHalf(f.r.s)),777n);assert.equal(f.r.x3,1n);assert.ok(!f.b.events.includes('restore'));assert.ok(!f.b.events.includes('unlo'));
});
test('Raw full RSRV retries unlinked reservations without adding a host progress exception',()=>{
  const f=fixture(),save=f.b.io.pushData;for(let i=0;i<32;i++)f.q.links[i]=-1n;let passes=0;f.b.io.pushData=function*(w){if(++passes===3)throw new Error('scheduled stop');yield*save(w);};assert.throws(f.reserve,/scheduled stop/);assert.equal(passes,3);assert.equal(f.b.events.filter(e=>e==='restore').length,2);assert.ok(f.q.links.every(w=>w===-1n));
});
test('Raw full RSRV retries zero-recipient linked entries without inventing eviction',()=>{
  const f=fixture(),save=f.b.io.pushData;for(let i=0;i<32;i++)f.publish(i,0n);let passes=0;f.b.io.pushData=function*(w){if(++passes===3)throw new Error('scheduled stop');yield*save(w);};assert.throws(f.reserve,/scheduled stop/);assert.equal(f.b.events.filter(e=>e==='remove').length,0);assert.equal(passes,3);
});
test('Raw UPDT publishes an empty queue through signed header tail addressing',()=>{
  const f=fixture();f.reserve();f.r.x3=3n;f.update();assert.equal(f.q.header,0n);assert.equal(f.q.links[0],signed36(halfWords(-1n,3n)));assert.equal(f.r.x2,0n);assert.equal(f.r.x3,3n);
});
test('Raw UPDT appends using the old tail and preserves its recipient bits',()=>{
  const f=fixture();f.publish(7,5n);f.r.x2=3n;f.r.x3=2n;f.q.links[3]=-1n;f.update();assert.equal(f.q.links[7],signed36(halfWords(3n,5n)));assert.equal(f.q.header,signed36(halfWords(7n,3n)));assert.equal(f.q.links[3],signed36(halfWords(-1n,2n)));
});
test('Raw UPDT publishes only the low half of X3 and permits a zero recipient half',()=>{
  const f=fixture();f.r.x2=0n;f.r.x3=halfWords(777n,0n);f.update();assert.equal(f.q.links[0],signed36(halfWords(-1n,0n)));assert.equal(f.q.header,0n);
});
test('Raw UPDT does not require a previously reserved slot',()=>{
  const f=fixture();f.r.x2=5n;f.r.x3=4n;f.q.links[5]=123n;f.update();assert.equal(f.q.header,signed36(halfWords(5n,5n)));assert.equal(f.q.links[5],signed36(halfWords(-1n,4n)));
});
test('Raw UPDT retries nonzero LKFAIL before changing the chain',()=>{
  const f=fixture(),lock=f.b.io.lock;f.r.x2=0n;f.r.x3=1n;let calls=0;f.b.io.lock=function*(){if(++calls===1){f.low.write('lkfail',1n);yield 'retry';return;}yield*lock();};const g=f.b.run('updt');assert.equal(g.next().value,'retry');assert.equal(f.q.header,-1n);finish(g);assert.equal(calls,2);assert.equal(f.q.header,0n);
});
test('Raw UPDT second ADDI suspension exposes linked tail/header before storing recipients',()=>{
  const f=fixture(),addi=f.b.io.addi;f.r.x2=0n;f.r.x3=1n;let n=0;f.b.io.addi=function*(...a){if(++n===2)yield 'publish';yield*addi(...a);};const g=f.b.run('updt');assert.equal(g.next().value,'publish');assert.equal(f.q.header,0n);assert.equal(f.q.links[0],0n);finish(g);assert.equal(f.q.links[0],signed36(halfWords(-1n,1n)));
});
test('Raw UPDT publication reads X3 after the address arithmetic returns',()=>{
  const f=fixture(),addi=f.b.io.addi;f.r.x2=0n;f.r.x3=1n;let n=0;f.b.io.addi=function*(...a){yield*addi(...a);if(++n===2)f.r.x3=8n;};f.update();assert.equal(rightHalf(f.q.links[0]),8n);
});
test('Raw UPDT address failure preserves the previously written chain and header',()=>{
  const f=fixture(),addi=f.b.io.addi;f.r.x2=0n;f.r.x3=1n;let n=0;f.b.io.addi=function*(...a){if(++n===2)throw new Error('publish fault');yield*addi(...a);};assert.throws(f.update,/publish fault/);assert.equal(f.q.header,0n);assert.equal(f.q.links[0],0n);assert.ok(!f.b.events.includes('unlo'));
});
test('Raw RSRVHQ only clears LKFAIL and leaves queue, argument storage and working registers unchanged',()=>{
  const f=fixture();f.low.write('lkfail',-1n);f.r.t1=123n;f.m.write(27050n,999n);f.r.arg=27050n;finish(f.b.run('rsrvhq'));assert.equal(f.low.read('lkfail'),0n);assert.equal(f.r.t1,123n);assert.equal(f.r.x2,99n);assert.equal(f.m.read(27050n),999n);assert.equal(f.q.header,-1n);assert.deepEqual(f.b.events,[]);
});
test('Raw reserve and publication feed GETMSG through the same physical queue',()=>{
  const f=fixture();f.reserve();const slot=Number(f.r.x2);f.q.data[slot][0]=halfWords(201n,1n);for(let i=1;i<=16;i++)f.q.data[slot][i]=BigInt(100+i);f.r.x3=1n;f.update();f.high.write('msgflg',1n,1);finish(f.getMessage.run());assert.deepEqual(Array.from({length:16},(_,i)=>f.m.read(f.getMessage.buffer+BigInt(i))),Array.from({length:16},(_,i)=>BigInt(101+i)));assert.equal(f.q.header,-1n);assert.equal(f.q.links[slot],0n);
});
test('Raw reserve/publication feed FREE message drain without a component linked-list producer',()=>{
  const f=fixture();f.high.write('numply',2n);f.high.write('trstat',0n,1);f.high.write('hitflg',0n,1);f.reserve();f.q.data[0][0]=halfWords(201n,3n);for(let i=1;i<=16;i++)f.q.data[0][i]=BigInt(200+i);f.r.x3=3n;f.update();f.high.write('msgflg',1n,1);finish(f.free.run());assert.equal(f.free.fr.read('dum',1),201n);assert.equal(f.free.fr.read('dum',16),216n);assert.equal(rightHalf(f.q.links[0]),2n);assert.equal(f.high.read('alive',1),1n);
});
