import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
function fixture(line='TRACTOR TESTSHIP',commands=1){const f=mainCommandFixture(line,K.SHORT,commands),b=f.main.tractor;f.h.put(f.high.address('names',2,1),'TESTSHIP');f.high.write('alive',-1n,2);
  for(const p of [1,2]){f.high.write('trstat',0n,p);f.high.write('shpcon',-1n,p,K.KSHCON);f.high.write('shpcon',10n,p,K.KVPOS);f.high.write('shpcon',20n,p,K.KHPOS);}return {...f,b};}
test('Main TRACTOR pairs friendly ships and sends type 13 to both actual queues',()=>{
  const f=fixture('TRACTOR TEST');f.run();assert.equal(f.high.read('trstat',1),2n);assert.equal(f.high.read('trstat',2),1n);assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('hitflg',2),1n);assert.equal(f.b.hits[0].iwhat,13n);assert.deepEqual(f.reports,['\r\n']);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
for(const line of ['TRACTOR','TRACTOR OFF'])test(`Main ${line} releases an active pair through explicit IP binding`,()=>{
  const f=fixture(line);f.high.write('trstat',2n,1);f.high.write('trstat',1n,2);f.b.policy.ip=f.b.s.ip;f.run();assert.equal(f.m.read(f.b.s.ip),1n);assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',2),0n);assert.deepEqual(f.b.events,['trcoff']);assert.equal(f.high.read('hitflg',2),1n);
});
test('Main TRACTOR OFF requires missing compiler argument binding exactly when IP is assigned',()=>{
  const f=fixture('TRACTOR OFF');assert.throws(f.run,/zero-argument IP binding/);assert.equal(f.m.read(f.b.s.ip),77n);
});
test('Main TRACTOR OFF inactive pair preserves original notice after assigning IP',()=>{
  const f=fixture('TRACTOR OFF');f.b.policy.ip=f.b.s.ip;f.run();assert.deepEqual(f.reports,['\r\n'+M.tract2.text+'\r\n']);assert.equal(f.m.read(f.b.s.ip),1n);
});
for(const [kind,key] of [['active','tract3'],['unknown','unkshp'],['self','tract4'],['enemy','tract5'],['dead','noship'],['far','energ3'],['shields','tract7']] as const)test(`Main TRACTOR rejects ${kind} without pairing`,()=>{
  const f=fixture();if(kind==='active')f.high.write('trstat',3n,1);if(kind==='unknown')f.h.put(f.high.address('names',2,1),'CHANGED');if(kind==='self')f.h.put(f.high.address('names',1,1),'TESTSHIP');if(kind==='enemy')f.low.write('team',2n);if(kind==='dead')f.high.write('alive',0n,2);if(kind==='far')f.high.write('shpcon',30n,2,K.KVPOS);if(kind==='shields')f.high.write('shpcon',0n,1,K.KSHCON);
  f.run();assert.deepEqual(f.reports,['\r\n'+M[key].text+'\r\n']);assert.equal(f.high.read('trstat',2),0n);assert.equal(f.b.hits.length,0);
});
for(const [kind,key] of [['active','tract6'],['shields','tract8']] as const)test(`Main TRACTOR prints destination identity for ${kind} rejection`,()=>{
  const f=fixture();if(kind==='active')f.high.write('trstat',3n,2);else f.high.write('shpcon',0n,2,K.KSHCON);f.run();assert.deepEqual(f.b.events,['odisp',key]);assert.ok(f.reports[0].endsWith(' '+M[key].text+'\r\n'));assert.equal(f.high.read('trstat',1),0n);
});
test('Main TRACTOR prompted ship input retains raw prefix matching',()=>{
  const f=fixture('TRACTOR'),gtkn=f.b.io.gtkn;f.b.io.gtkn=function*(){f.editor.feed('TEST\n');yield*gtkn();};f.run();assert.equal(f.m.read(f.b.locals.index),1n);assert.equal(f.high.read('trstat',1),2n);assert.deepEqual(f.b.events,['tract1','gtkn','makhit']);
});
test('Main TRACTOR then SHIELD UP releases the same pair',()=>{
  const f=fixture('TRACTOR TEST/SHIELD UP',2);f.high.write('shpdam',0n,1,K.KDSHLD);f.run();assert.deepEqual(f.main.calls.map(c=>c.routine),['tractr','shield']);assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',2),0n);assert.equal(f.high.read('shpcon',1,K.KSHCON),1n);
});
test('Main TRACTOR queue failure leaves established pair and hit metadata',()=>{
  const f=fixture();f.b.io.makhit=function*(){throw new Error('queue failure');};assert.throws(f.run,/queue failure/);assert.equal(f.high.read('trstat',1),2n);assert.equal(f.high.read('trstat',2),1n);assert.equal(f.low.read('iwhat'),13n);
});
