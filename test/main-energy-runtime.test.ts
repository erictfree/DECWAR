import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
function fixture(line='ENERGY TESTSHIP 100',format:number=K.SHORT){
  const f=mainCommandFixture(line,format),b=f.main.energy;
  f.h.put(f.high.address('names',2,1),'TESTSHIP');f.high.write('alive',-1n,2);
  for(const [col,value] of [[K.KVPOS,10],[K.KHPOS,20]] as const){f.high.write('shpcon',BigInt(value),1,col);f.high.write('shpcon',BigInt(value),2,col);}
  f.high.write('shpcon',20000n,1,K.KSNRGY);f.high.write('shpcon',10000n,2,K.KSNRGY);return {...f,b};
}
test('Main ENERGY uses loaded names, original output and actual recipient queue',()=>{
  const f=fixture('ENERGY TEST 100');f.run();assert.equal(f.high.read('shpcon',1,K.KSNRGY),19000n);assert.equal(f.high.read('shpcon',2,K.KSNRGY),10900n);
  assert.deepEqual(f.reports,['\r\n'+M.energ6.text+'\r\n']);assert.equal(f.high.read('hitflg',2),1n);assert.equal(f.b.hits[0].ihita,900n);assert.equal(f.b.hits[0].iwhat,12n);assert.equal(f.b.hits[0].dispto,102n);assert.equal(f.b.hits[0].dispfr,101n);
  assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
for(const [reserve,sender,received] of [[49995n,19995n,5n],[50000n,20000n,0n],[50010n,20011n,-10n]] as const)test(`Main ENERGY preserves capacity arithmetic at ${reserve}`,()=>{
  const f=fixture();f.high.write('shpcon',reserve,2,K.KSNRGY);f.run();assert.equal(f.high.read('shpcon',1,K.KSNRGY),sender);assert.equal(f.high.read('shpcon',2,K.KSNRGY),50000n);assert.equal(f.b.hits[0].ihita,received);
});
for(const [amount,key] of [['2000','ener4s'],['0','energ5'],['-1','energ5']] as const)test(`Main ENERGY rejects amount ${amount} without energy mutation`,()=>{
  const f=fixture('ENERGY TESTSHIP '+amount);f.run();assert.deepEqual(f.reports,['\r\n'+M[key].text+'\r\n']);assert.equal(f.high.read('shpcon',1,K.KSNRGY),20000n);assert.equal(f.b.hits.length,0);
});
for(const [kind,key] of [['unknown','unkshp'],['self','energ7'],['dead','noship'],['enemy','energ2'],['far','energ3']] as const)test(`Main ENERGY rejects ${kind} recipient`,()=>{
  const f=fixture();if(kind==='unknown')f.h.put(f.high.address('names',2,1),'CHANGED');if(kind==='self')f.h.put(f.high.address('names',1,1),'TESTSHIP');if(kind==='dead')f.high.write('alive',0n,2);if(kind==='enemy')f.low.write('team',2n);if(kind==='far')f.high.write('shpcon',25n,2,K.KVPOS);
  f.run();assert.deepEqual(f.reports,['\r\n'+M[key].text+'\r\n']);assert.equal(f.b.hits.length,0);
});
test('Main ENERGY prompted input uses first ship token and second amount token',()=>{
  const f=fixture('ENERGY'),gtkn=f.b.io.gtkn;f.b.io.gtkn=function*(){f.editor.feed('TESTSHIP 1\n');yield*gtkn();};f.run();assert.equal(f.m.read(f.b.locals.index),1n);assert.equal(f.b.hits[0].ihita,9n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),19990n);assert.deepEqual(f.b.events,['ener1s','gtkn','ldis','energ6','makhit']);
});
test('Main ENERGY empty prompted input cancels',()=>{
  const f=fixture('ENERGY'),gtkn=f.b.io.gtkn;f.b.io.gtkn=function*(){f.editor.feed('\n');yield*gtkn();};f.run();assert.deepEqual(f.b.events,['ener1s','gtkn']);assert.equal(f.b.hits.length,0);
});
test('Main ENERGY uses actual BITS table after sender output',()=>{
  const f=fixture(),out=f.b.io.out;f.b.io.out=function*(...args){yield*out(...args);f.high.write('bits',f.high.read('bits',3),2);};f.run();assert.equal(f.high.read('hitflg',2),0n);assert.equal(f.high.read('hitflg',3),1n);
});
test('Main ENERGY sender output failure retains energy changes before notification',()=>{
  const f=fixture();f.b.io.out=function*(key){assert.equal(key,'energ6');throw new Error('energy output failure');};assert.throws(f.run,/energy output failure/);assert.equal(f.high.read('shpcon',1,K.KSNRGY),19000n);assert.equal(f.high.read('shpcon',2,K.KSNRGY),10900n);assert.equal(f.b.hits.length,0);
});
