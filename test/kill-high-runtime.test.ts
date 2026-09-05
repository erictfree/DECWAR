import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindKillHighRuntime } from './fixtures/kill-high-runtime.ts';
import { packSixbit,signed36 } from '../src/compat/word36.ts';
const six=(s:string)=>signed36(packSixbit(s));
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<1000;i++){const s=g.next();if(s.done)return s.value;}throw new Error('test schedule exhausted');}
function fixture(){const f=pregameRuntimeFixture([]),b=bindKillHighRuntime(f);f.high.write('dead',0n);f.low.write('hungup',0n);f.low.write('hcpos',0n);f.low.write('blank',0n);f.m.write(b.s.device,six('DSK'));f.m.write(b.s.name,six('DECWAR'));f.m.write(b.s.ppn,123n);return {...f,b,run:()=>done(b.run())};}
for(const word of [-1n,1n,77n])test(`KILHGH returns for any nonzero DEAD word ${word}`,()=>{const f=fixture();f.high.write('dead',word);f.r.t1=99n;f.run();assert.equal(f.r.t1,99n);assert.deepEqual(f.b.events,[]);});
for(const failure of ['open','lookup','rename'] as const)test(`KILHGH ${failure} failure emits WARN without setting DEAD`,()=>{
  const f=fixture();Object.assign(f.b.policy,{open:true,lookup:true,rename:true});f.b.policy[failure]=false;const start=f.text().length;f.run();assert.equal(f.high.read('dead'),0n);assert.equal(f.text().slice(start),"%Can't remove DECWAR high segment from swapper\r\n");assert.deepEqual(f.b.events,[...['open','lookup','rename'].slice(0,['open','lookup','rename'].indexOf(failure)+1),'flush','warning']);
});
test('KILHGH monitor register sequence includes source SETZB effect and rereads P.PPN',()=>{
  const f=fixture();f.r.f=999n;f.b.io.openREN=function*(){assert.deepEqual([f.r.t1,f.r.t2,f.r.t3],[0n,six('DSK'),0n]);return true;};f.b.io.lookupREN=function*(){assert.deepEqual([f.r.t1,f.r.t2,f.r.t3,f.r.t4,f.r.f],[six('DECWAR'),six('SHR'),0n,123n,0n]);f.m.write(f.b.s.ppn,456n);return true;};f.b.io.renameREN=function*(){assert.equal(f.r.t4,456n);return true;};f.run();assert.equal(f.high.read('dead'),-1n);assert.ok(f.text().endsWith('[DECWAR high segment removed from swapper]\r\n'));
});
test('KILHGH rereads filename and device state across the OPEN suspension',()=>{
  const f=fixture();f.b.io.openREN=function*(){yield 'open';return true;};f.b.io.lookupREN=function*(){assert.equal(f.r.t1,six('OTHER'));return false;};const g=f.b.run();assert.equal(g.next().value,'open');f.m.write(f.b.s.name,six('OTHER'));done(g);assert.equal(f.high.read('dead'),0n);
});
test('KILHGH WARN retests HUNGUP after flush before direct warning output',()=>{
  const f=fixture();f.b.policy.open=false;f.b.io.outputTTY=function*(){f.low.write('hungup',-1n);};f.run();assert.ok(!f.b.events.includes('warning'));assert.equal(f.high.read('dead'),0n);
});
test('KILHGH success prints before setting DEAD and stores DEAD before flushing',()=>{
  const f=fixture();Object.assign(f.b.policy,{open:true,lookup:true,rename:true});const ostr=f.b.io.ostr;f.b.io.ostr=function*(){assert.equal(f.high.read('dead'),0n);yield*ostr();yield 'printed';};f.b.io.outputTTY=function*(){assert.equal(f.high.read('dead'),-1n);throw new Error('flush transfer');};const g=f.b.run();assert.equal(g.next().value,'printed');assert.equal(f.high.read('dead'),0n);assert.throws(()=>done(g),/flush transfer/);assert.equal(f.high.read('dead'),-1n);
});
test('KILHGH buffered output failure precedes DEAD and can be retried',()=>{
  const f=fixture();Object.assign(f.b.policy,{open:true,lookup:true,rename:true});f.b.io.ostr=function*(){throw new Error('OSTR transfer');};assert.throws(f.run,/OSTR transfer/);assert.equal(f.high.read('dead'),0n);assert.ok(!f.b.events.includes('flush'));
});
test('KILHGH requires monitor outcomes rather than assuming successful segment removal',()=>{const f=fixture();assert.throws(f.run,/KILHGH OPEN monitor result required/);assert.equal(f.high.read('dead'),0n);assert.equal(f.r.t1,0n);assert.equal(f.r.t2,six('DSK'));});
