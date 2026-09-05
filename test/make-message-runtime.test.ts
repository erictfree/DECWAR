import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { messageText } from '../src/game/message-queue.ts';
import { halfWords,rightHalf,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
function fixture(text='HELLO'){
  const f=pregameRuntimeFixture([]),b=f.makeMessage,q=f.getHit.queues.message;f.low.write('dispfr',201n);f.low.write('dbits',3n);f.low.write('ccflg',0n);for(let i=1;i<=10;i++)f.high.write('msgflg',0n,i);f.h.put(b.string,text);
  return {...f,b,q,run:()=>finish(b.run()),content:(i=0)=>messageText(q.data[i].slice(1))};
}
test('Raw MAKMSG zero DBITS returns before reading argument descriptors or touching metadata',()=>{
  const f=fixture();f.low.write('dbits',0n);f.r.p1=123n;const g=f.b.run();f.r.arg=100000n;finish(g);assert.equal(f.low.read('dispfr'),201n);assert.equal(f.r.p1,123n);assert.equal(f.q.header,-1n);assert.deepEqual(f.b.events,[]);
});
test('Raw MAKMSG packed explicit text composes raw reservation and publication',()=>{
  const f=fixture(),p=f.r.p;f.run();assert.equal(f.content(),'HELLO\r\n');assert.equal(f.q.data[0][0],halfWords(201n,3n));assert.equal(rightHalf(f.q.links[0]),3n);assert.equal(f.high.read('msgflg',1),1n);assert.equal(f.high.read('msgflg',2),1n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.low.read('dispfr'),201n);assert.equal(f.r.p,p);
});
test('Raw MAKMSG follows one additional address when the argument first word has zero left half',()=>{
  const f=fixture();finish(f.b.run([f.b.indirect]));assert.equal(f.content(),'HELLO\r\n');
});
test('Raw MAKMSG no-argument path scans from LINBUF to its first semicolon',()=>{
  const f=fixture();f.input.acceptLine('RADIO;HELLO;SECOND');finish(f.b.run([]));assert.equal(f.content(),'HELLO;SECOND\r\n');assert.ok(!f.b.events.includes('inli'));assert.equal(f.text(),'');
});
test('Raw MAKMSG prompts and calls actual INLI when the current line has no semicolon',()=>{
  const f=fixture();f.input.acceptLine('RADIO');f.editor.feed('HELLO\n');finish(f.b.run([]));assert.equal(f.content(),'HELLO\r\n');assert.ok(f.b.events.includes('inli'));assert.ok(f.text().startsWith('Msg: '));assert.equal(f.input.pointer,-1n);
});
for(const text of ['', 'A'])test(`Raw MAKMSG short text ${JSON.stringify(text)} cancels its reservation through raw REMV`,()=>{
  const f=fixture(text);finish(f.b.run([f.b.indirect]));assert.equal(f.text(),'No message sent\r\n');assert.equal(f.q.header,-1n);assert.equal(f.q.links[0],0n);assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.low.read('dbits'),0n);assert.ok(f.b.events.includes('remove'));assert.ok(!f.b.events.includes('publish'));
});
test('Raw MAKMSG two characters plus terminator are long enough to publish',()=>{
  const f=fixture('AB');f.run();assert.equal(f.content(),'AB\r\n');assert.equal(rightHalf(f.q.links[0]),3n);
});
for(const length of [74,75,76,100,200])test(`Raw MAKMSG length ${length} reads all input while retaining at most 75 text bytes`,()=>{
  const f=fixture('X'.repeat(length));f.run();assert.equal(f.content(),'X'.repeat(Math.min(length,75))+'\r\n');assert.equal(f.b.events.filter(e=>e==='ildb').length,length+1);assert.equal(f.b.events.filter(e=>e==='idpb').length,Math.min(length+1,76)+2);
});
test('Raw MAKMSG uses current CBITS to terminate copying',()=>{
  const f=fixture('ABZTAIL');f.m.write(f.b.symbols.cbits+90n,f.b.symbols.eol);f.run();assert.equal(f.content(),'AB\r\n');assert.equal(f.b.events.filter(e=>e==='ildb').length,3);
});
test('Raw MAKMSG CR is stored as content until an actual CF.EOL character follows',()=>{
  const f=fixture('AB\rCD\nTAIL');f.run();assert.equal(f.content(),'AB\rCD\r\n');assert.equal(f.b.events.filter(e=>e==='ildb').length,6);
});
test('Raw MAKMSG lock retry resumes with the same source pointer',()=>{
  const f=fixture(),reserve=f.b.io.reserve;let calls=0;f.b.io.reserve=function*(){if(++calls===1){f.low.write('lkfail',1n);yield 'retry';return;}yield*reserve();};const g=f.b.run();assert.equal(g.next().value,'retry');assert.ok(!f.b.events.includes('ildb'));finish(g);assert.equal(calls,2);assert.equal(f.content(),'HELLO\r\n');
});
test('Raw MAKMSG input Ctrl-C follows stale X2 into removal without first reserving',()=>{
  const f=fixture();f.input.acceptLine('RADIO');f.b.io.inli=function*(){f.low.write('ccflg',1n);f.r.x2=0n;f.m.write(0n,halfWords(7n,42n));};finish(f.b.run([]));assert.equal(f.text(),'Msg: No message sent\r\n');assert.ok(!f.b.events.includes('reserve'));assert.ok(f.b.events.includes('remove'));assert.equal(f.m.read(0n),42n);assert.equal(f.low.read('dbits'),0n);
});
test('Raw MAKMSG Ctrl-C cancellation failure retains DBITS and skips publication',()=>{
  const f=fixture();f.input.acceptLine('RADIO');f.b.io.inli=function*(){f.low.write('ccflg',1n);};f.b.io.remove=function*(){throw new Error('stale removal fault');};assert.throws(()=>finish(f.b.run([])),/stale removal fault/);assert.equal(f.low.read('dbits'),3n);assert.ok(!f.b.events.includes('publish'));
});
test('Raw MAKMSG writes header before the first input-byte service',()=>{
  const f=fixture(),ildb=f.b.io.ildb;let first=true;f.b.io.ildb=function*(){if(first){first=false;yield 'input';}yield*ildb();};const g=f.b.run();assert.equal(g.next().value,'input');assert.equal(f.q.links[0],-1n);assert.equal(f.q.data[0][0],halfWords(201n,3n));assert.equal(f.high.read('msgflg',1),0n);finish(g);
});
test('Raw MAKMSG deposit failure retains reservation, header and DBITS',()=>{
  const f=fixture();f.b.io.idpb=function*(){throw new Error('deposit fault');};assert.throws(f.run,/deposit fault/);assert.equal(f.q.links[0],-1n);assert.equal(f.q.header,-1n);assert.equal(f.q.data[0][0],halfWords(201n,3n));assert.equal(f.low.read('dbits'),3n);
});
test('Raw MAKMSG retains current shared-field changes between header and publication',()=>{
  const f=fixture(),dpb=f.b.io.dpb;f.b.io.dpb=function*(){yield*dpb();f.low.write('dbits',4n);f.low.write('dispfr',301n);};f.run();assert.equal(f.q.data[0][0],halfWords(201n,3n));assert.equal(rightHalf(f.q.links[0]),4n);assert.equal(f.high.read('msgflg',3),1n);assert.equal(f.low.read('dispfr'),301n);
});
test('Raw MAKMSG publication service can change DBITS before counter iteration',()=>{
  const f=fixture(),publish=f.b.io.publish;f.b.io.publish=function*(){yield*publish();f.low.write('dbits',4n);};f.run();assert.equal(rightHalf(f.q.links[0]),3n);assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.high.read('msgflg',3),1n);
});
test('Raw MAKMSG retains DBITS during counters and clears it only after they finish',()=>{
  const f=fixture(),count=f.b.io.aosMessage;f.b.io.aosMessage=function*(a){assert.equal(f.low.read('dbits'),3n);yield*count(a);};f.run();assert.equal(f.low.read('dbits'),0n);
});
test('Raw MAKMSG full-word recipient scan can increment storage beyond the ten player flags',()=>{
  const f=fixture();f.low.write('dbits',1n<<35n);let address:bigint|undefined;f.b.io.aosMessage=function*(a){address=a;};f.run();assert.equal(address,f.b.symbols.msgflg+35n);assert.equal(f.r.t2,36n);assert.equal(rightHalf(f.q.links[0]),0n);
});
test('Raw MAKMSG message counter overflow retains 36-bit wrap',()=>{
  const f=fixture();f.high.write('msgflg',MAX_INTEGER,1);f.run();assert.equal(f.high.read('msgflg',1),MIN_INTEGER);
});
test('Raw MAKMSG counter failure retains published record and uncleared DBITS',()=>{
  const f=fixture();f.b.io.aosMessage=function*(){throw new Error('counter fault');};assert.throws(f.run,/counter fault/);assert.equal(rightHalf(f.q.links[0]),3n);assert.equal(f.low.read('dbits'),3n);assert.equal(f.content(),'HELLO\r\n');
});
test('Raw MAKMSG length decision uses required AOJGE results and current T2',()=>{
  const f=fixture(),aoj=f.b.io.aojgeT2;f.b.io.aojgeT2=function*(){yield*aoj();return true;};f.b.io.dpb=function*(){};f.b.io.idpb=function*(){};f.run();assert.equal(rightHalf(f.q.links[0]),3n);assert.equal(f.b.events.filter(e=>e==='idpb').length,0);
});
test('Raw MAKMSG GETMSG round trip uses raw packing, linked operations and copy',()=>{
  const f=fixture('ROUND TRIP');f.run();finish(f.getMessage.run());assert.equal(messageText(Array.from({length:16},(_,i)=>f.m.read(f.getMessage.buffer+BigInt(i)))),'ROUND TRIP\r\n');assert.equal(f.low.read('dispfr'),201n);assert.equal(f.high.read('msgflg',1),0n);assert.equal(rightHalf(f.q.links[0]),2n);
});
test('Raw MAKMSG feeds FREE message cleanup without a component producer',()=>{
  const f=fixture('SAVED BUFFER');f.high.write('numply',2n);f.high.write('trstat',0n,1);f.high.write('hitflg',0n,1);f.run();finish(f.free.run());assert.equal(messageText(Array.from({length:16},(_,i)=>f.free.fr.read('dum',i+1))),'SAVED BUFFER\r\n');assert.equal(f.high.read('alive',1),1n);assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.high.read('msgflg',2),1n);assert.equal(rightHalf(f.q.links[0]),2n);
});
