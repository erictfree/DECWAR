import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,leftHalf,rightHalf,signed36,MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
function fixture(){
  const f=pregameRuntimeFixture([]),b=f.getMessage,q=f.getHit.queues.message;f.high.write('msgflg',1n,1);f.low.write('dispfr',77n);f.low.write('dbits',88n);for(let i=0;i<17;i++)f.m.write(b.buffer+BigInt(i),99n);
  const payload=Array.from({length:16},(_,i)=>BigInt(101+i));
  const slot=(index:number,recipients=3n)=>{q.data[index][0]=signed36(halfWords(201n,recipients));payload.forEach((n,i)=>q.data[index][i+1]=n);q.publish(index,recipients);};
  return {...f,b,q,payload,slot,run:()=>finish(b.run()),buffer:(a=b.buffer)=>Array.from({length:17},(_,i)=>f.m.read(a+BigInt(i))),search:()=>{f.r.x1=b.symbols.msgql;f.r.x3=1n;return finish(b.call('srch'));},remove:()=>finish(b.call('remv'))};
}
test('Raw GETMSG copies sixteen physical payload words and retains other recipients',()=>{
  const f=fixture(),p=f.r.p;f.slot(4);f.run();assert.deepEqual(f.buffer(),[...f.payload,99n]);assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.low.read('dispfr'),201n);assert.equal(f.low.read('dbits'),3n);assert.equal(rightHalf(f.q.links[4]),2n);assert.equal(rightHalf(f.r.x2),4n);assert.equal(leftHalf(f.r.x2),f.b.symbols.msgql-1n);assert.equal(f.r.p,p);assert.equal(f.r.x4,f.b.buffer);assert.deepEqual(f.b.events.filter(e=>!e.startsWith('aos:')),['search','lock','unlo','blt','remove','lock','unlo']);
});
test('Raw GETMSG negative decrement reloads count and clears metadata without reading buffer argument',()=>{
  const f=fixture();f.high.write('msgflg',0n,1);f.r.x4=123n;finish(f.b.run(f.b.player,100000n));assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.low.read('dispfr'),0n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.r.x4,123n);assert.deepEqual(f.b.events,[]);assert.deepEqual(f.buffer(),Array<bigint>(17).fill(99n));
});
test('Raw GETMSG search miss clears count and metadata but leaves the buffer untouched',()=>{
  const f=fixture();f.high.write('msgflg',4n,1);f.run();assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.low.read('dispfr'),0n);assert.equal(f.low.read('dbits'),0n);assert.deepEqual(f.buffer(),Array<bigint>(17).fill(99n));assert.deepEqual(f.b.events,['search','lock','unlo']);
});
test('Raw GETMSG SOSL fixture preserves 36-bit overflow before search',()=>{
  const f=fixture();f.high.write('msgflg',MIN_INTEGER,1);f.slot(0);f.run();assert.equal(f.high.read('msgflg',1),MAX_INTEGER);
});
test('Raw GETMSG follows linked order rather than physical message slot order',()=>{
  const f=fixture();f.slot(9,1n);f.slot(1,1n);f.q.data[9][1]=999n;f.run();assert.equal(f.buffer()[0],999n);assert.equal(f.q.links[9],0n);assert.equal(leftHalf(f.q.header),1n);assert.equal(rightHalf(f.q.links[1]),1n);
});
test('Raw GETMSG defensive all-ones metadata halves become zero including SETZM AC2',()=>{
  const f=fixture();f.slot(0);f.q.data[0][0]=-1n;const remove=f.b.io.remove;let t2:bigint|undefined;f.b.io.remove=function*(){t2=f.r.t2;yield*remove();};f.run();assert.equal(f.low.read('dispfr'),0n);assert.equal(f.low.read('dbits'),0n);assert.equal(t2,0n);
});
test('Raw GETMSG miss reloads changed actual player argument after search',()=>{
  const f=fixture();f.high.write('msgflg',5n,2);f.b.io.search=function*(){f.m.write(f.b.player,2n);return false;};f.run();assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.r.t1,2n);
});
test('Raw GETMSG miss uses live ARG after the search service returns',()=>{
  const f=fixture();f.high.write('msgflg',5n,2);f.b.io.search=function*(){f.m.write(26650n,2n);loadArgumentBlock(f.m,26660n,[26650n,f.b.buffer]);selectArgumentBlock(f.r,26660n);return false;};f.run();assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.r.t1,2n);
});
test('Raw GETMSG negative-count path rereads player after suspended SOSL',()=>{
  const f=fixture(),sosl=f.b.io.sosl;f.high.write('msgflg',0n,1);f.high.write('msgflg',5n,2);f.b.io.sosl=function*(a){const skip=yield*sosl(a);f.m.write(f.b.player,2n);return skip;};f.run();assert.equal(f.high.read('msgflg',1),-1n);assert.equal(f.high.read('msgflg',2),0n);
});
test('Raw GETMSG captures destination address before searching even when argument descriptor changes',()=>{
  const f=fixture(),search=f.b.io.search;f.slot(0);f.b.io.search=function*(){const found=yield*search();f.m.write(f.b.header+2n,26800n);return found;};f.run();assert.deepEqual(f.buffer(),[...f.payload,99n]);assert.equal(f.m.read(26800n),0n);
});
test('Raw GETMSG search may change X4 and redirect the subsequent BLT',()=>{
  const f=fixture(),search=f.b.io.search;f.slot(0);f.b.io.search=function*(){const found=yield*search();f.r.x4=26800n;return found;};f.run();assert.deepEqual(f.buffer(26800n).slice(0,16),f.payload);assert.equal(f.buffer()[0],99n);
});
test('Raw GETMSG uses live BITS rather than a synthesized player bit',()=>{
  const f=fixture();f.high.write('bits',8n,1);f.slot(0,1n);f.slot(1,24n);f.run();assert.equal(rightHalf(f.q.links[0]),1n);assert.equal(rightHalf(f.q.links[1]),16n);assert.equal(f.low.read('dbits'),24n);
});
test('Raw GETMSG search unlock precedes payload reads and later removal lock',()=>{
  const f=fixture(),unlo=f.b.qio.unlo;f.slot(0);let n=0;f.b.qio.unlo=function*(){yield*unlo();if(++n===1){f.q.data[0][0]=halfWords(301n,7n);f.q.data[0][1]=555n;yield 'between-locks';}};const g=f.b.run();assert.equal(g.next().value,'between-locks');assert.equal(f.low.read('dispfr'),77n);assert.equal(f.buffer()[0],99n);finish(g);assert.equal(f.low.read('dispfr'),301n);assert.equal(f.low.read('dbits'),7n);assert.equal(f.buffer()[0],555n);
});
test('Raw GETMSG BLT failure leaves copied prefix, metadata and pending recipient',()=>{
  const f=fixture();f.slot(0);f.b.io.blt=function*(){f.m.write(rightHalf(f.r.t1),f.m.read(leftHalf(f.r.t1)));throw new Error('copy fault');};assert.throws(f.run,/copy fault/);assert.equal(f.buffer()[0],101n);assert.equal(f.buffer()[1],99n);assert.equal(f.low.read('dispfr'),201n);assert.equal(rightHalf(f.q.links[0]),3n);assert.ok(!f.b.events.includes('remove'));
});
test('Raw GETMSG ordinary forward BLT preserves overlap propagation',()=>{
  const f=fixture();f.slot(0);const payload=f.b.symbols.msgq+1n;finish(f.b.run(f.b.player,payload+1n));assert.deepEqual(Array.from({length:16},(_,i)=>f.m.read(payload+1n+BigInt(i))),Array<bigint>(16).fill(101n));
});
test('Raw GETMSG removal failure retains the completed buffer and metadata',()=>{
  const f=fixture();f.slot(0);f.b.io.remove=function*(){throw new Error('remove fault');};assert.throws(f.run,/remove fault/);assert.deepEqual(f.buffer(),[...f.payload,99n]);assert.equal(f.low.read('dispfr'),201n);assert.equal(rightHalf(f.q.links[0]),3n);
});
test('Raw SRCH returns through two actual AOS return-word increments on a match',()=>{
  const f=fixture();f.slot(3);const p=rightHalf(f.r.p);assert.equal(f.search(),true);assert.deepEqual(f.b.events.filter(e=>e.startsWith('aos:')),[`aos:${p+2n}`,`aos:${p+1n}`]);assert.equal(f.m.read(p+1n),1001n);assert.equal(f.m.read(p+2n),1001n);assert.equal(leftHalf(f.r.x2),f.b.symbols.msgql-1n);assert.equal(rightHalf(f.r.x2),3n);
});
test('Raw SRCH retains the physical predecessor address when earlier entries do not match',()=>{
  const f=fixture();f.slot(7,2n);f.slot(2,1n);assert.equal(f.search(),true);assert.equal(leftHalf(f.r.x2),f.b.symbols.msgql+7n);assert.equal(rightHalf(f.r.x2),2n);
});
test('Raw SRCH lock failure returns without searching or unlocking',()=>{
  const f=fixture();f.slot(0);f.r.x2=999n;f.b.qio.lock=function*(){f.low.write('lkfail',1n);};assert.equal(f.search(),false);assert.equal(f.r.x2,999n);assert.ok(!f.b.events.includes('unlo'));assert.equal(f.b.events.filter(e=>e.startsWith('aos:')).length,0);
});
test('Raw SRCH empty signed header returns normally without a skip',()=>{
  const f=fixture(),p=f.r.p;assert.equal(f.search(),false);assert.equal(leftHalf(f.r.x2),f.b.symbols.msgql-1n);assert.equal(rightHalf(f.r.x2),0n);assert.equal(f.r.p,p);assert.deepEqual(f.b.events,['lock','unlo']);
});
test('Raw SRCH reads a changed chain after suspended ADDI',()=>{
  const f=fixture(),addi=f.b.qio.addi;f.slot(4,2n);f.b.qio.addi=function*(reg,n){yield*addi(reg,n);yield 'chain';};f.r.x1=f.b.symbols.msgql;f.r.x3=1n;const g=f.b.call('srch.x');assert.equal(g.next().value,'chain');f.q.links[4]=signed36(halfWords(-1n,3n));assert.equal(finish(g),true);assert.equal(rightHalf(f.r.x2),4n);
});
test('Raw SRCH required return-address mutation controls the caller skip',()=>{
  const f=fixture();f.slot(0);f.b.qio.aos=function*(){};assert.equal(f.search(),false);assert.equal(rightHalf(f.r.x2),0n);assert.equal(f.b.events.filter(e=>e==='unlo').length,1);
});
test('Raw REMV keeps the entry linked when other recipient bits remain',()=>{
  const f=fixture();f.slot(0);assert.equal(f.search(),true);const header=f.q.header;f.remove();assert.equal(f.q.header,header);assert.equal(rightHalf(f.q.links[0]),2n);
});
test('Raw REMV removes the only entry and restores both signed header sentinels',()=>{
  const f=fixture();f.slot(0,1n);assert.equal(f.search(),true);f.remove();assert.equal(f.q.links[0],0n);assert.equal(f.q.header,-1n);
});
test('Raw REMV removes the head without changing the final entry',()=>{
  const f=fixture();f.slot(4,1n);f.slot(7,2n);assert.equal(f.search(),true);f.remove();assert.equal(f.q.links[4],0n);assert.equal(f.q.header,signed36(halfWords(7n,7n)));assert.equal(rightHalf(f.q.links[7]),2n);
});
test('Raw REMV rewires a middle predecessor and retains the tail',()=>{
  const f=fixture();f.slot(4,2n);f.slot(1,1n);f.slot(7,2n);assert.equal(f.search(),true);f.remove();assert.equal(leftHalf(f.q.links[4]),7n);assert.equal(f.q.links[1],0n);assert.equal(f.q.header,signed36(halfWords(4n,7n)));
});
test('Raw REMV tail removal writes predecessor index to header',()=>{
  const f=fixture();f.slot(4,2n);f.slot(1,1n);assert.equal(f.search(),true);f.remove();assert.equal(leftHalf(f.q.links[4]),0o777777n);assert.equal(f.q.header,signed36(halfWords(4n,4n)));
});
test('Raw REMV repeats its lock request on any nonzero LKFAIL before changing links',()=>{
  const f=fixture(),lock=f.b.qio.lock;f.slot(0,1n);assert.equal(f.search(),true);let n=0;f.b.qio.lock=function*(){if(++n===1){f.low.write('lkfail',1n);yield 'retry';return;}yield*lock();};const g=f.b.call('remv');assert.equal(g.next().value,'retry');assert.equal(rightHalf(f.q.links[0]),1n);finish(g);assert.equal(n,2);assert.equal(f.q.header,-1n);
});
test('Raw REMV failure after predecessor relink retains partial removal without unlocking',()=>{
  const f=fixture();f.slot(0,1n);assert.equal(f.search(),true);f.b.qio.subi=function*(){throw new Error('tail fault');};const unlo=f.b.events.filter(e=>e==='unlo').length;assert.throws(f.remove,/tail fault/);assert.equal(f.q.header,signed36(halfWords(-1n,0n)));assert.equal(f.q.links[0],signed36(halfWords(-1n,0n)));assert.equal(f.b.events.filter(e=>e==='unlo').length,unlo);
});
test('Raw REMV takes X3 from the current registers after locking',()=>{
  const f=fixture(),lock=f.b.qio.lock;f.slot(0);assert.equal(f.search(),true);f.b.qio.lock=function*(){yield*lock();f.r.x3=2n;};f.remove();assert.equal(rightHalf(f.q.links[0]),1n);
});
test('FREE drains actual message queue into FRLOCL DUM and leaves other recipients pending',()=>{
  const f=fixture();f.high.write('numply',2n);f.high.write('trstat',0n,1);f.high.write('hitflg',0n,1);f.slot(0);f.slot(1,1n);f.q.data[1][1]=999n;f.high.write('msgflg',3n,1);finish(f.free.run());assert.equal(f.high.read('msgflg',1),0n);assert.equal(rightHalf(f.q.links[0]),2n);assert.equal(f.q.links[1],0n);assert.equal(f.free.fr.read('dum',1),999n);assert.equal(f.free.fr.read('dum',16),116n);assert.equal(f.low.read('dispfr'),0n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.high.read('alive',1),1n);assert.equal(f.b.events.filter(e=>e==='getmsg').length,3);
});
test('FREE message copy failure occurs after ship saving and before final release',()=>{
  const f=fixture();f.high.write('numply',2n);f.high.write('trstat',0n,1);f.high.write('hitflg',0n,1);f.slot(0);f.b.io.blt=function*(){throw new Error('message fault');};assert.throws(()=>finish(f.free.run()),/message fault/);assert.equal(f.high.read('alive',1),-1n);assert.equal(f.high.read('shpcon',1,1),0n);assert.equal(rightHalf(f.q.links[0]),3n);assert.ok(!f.free.events.includes('unlock'));
});
