import test from 'node:test';
import assert from 'node:assert/strict';
import { statusRuntimeFixture } from './fixtures/status-runtime.ts';
import { powerRuntimeFixture } from './fixtures/power-runtime.ts';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { planetAttackRuntimeFixture } from './fixtures/planet-attack-runtime.ts';
import { orderedRational as real } from './support/rational-real.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { halfWords,rightHalf,MIN_INTEGER } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
function fixture(){const f=statusRuntimeFixture(),pwr=powerRuntimeFixture(f);return {...f,pwr};}
function value(f:ReturnType<typeof fixture>,word:bigint){const r=f.pwr.decode(word);return r.n/r.d;}
for(const n of [MIN_INTEGER,-1n,0n,1n,2n,3n,4n,5n,6n,7n,8n,9n,16n])test(`PWR exponent ${n} preserves source result and public saved registers`,()=>{
  const f=fixture();f.m.write(13900n,n);f.r.x1=71n;f.r.x2=72n;f.r.x3=73n;f.r.x4=74n;const result=finish(f.pwr.call(real.literal('2'),13900n));assert.equal(result.n/result.d,n<0n?1n:2n**n);assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4],[71n,72n,73n,74n]);assert.equal(f.r.s,f.s.initialStackWord);
});
for(const [n,ops] of [[4n,['t1*x2','t1*x2','t1*x2']],[5n,['divide','t1*x2','x1*x1','x1*x2']],[6n,['divide','t1*x2','t1*x2','x1*x1']],[10n,['divide','divide','t1*x2','x1*x1','x1*x2','x1*x1']]] as const)test(`PWR exponent ${n} retains exact multiply/recursion order`,()=>{
  const f=fixture();f.m.write(13900n,n);finish(f.pwr.call(real.literal('2'),13900n));assert.deepEqual(f.pwr.events,ops);
});
test('Internal PWR. reads registers without arguments, returns X1 and preserves X3/X4',()=>{
  const f=fixture();f.r.arg=250000n;f.r.x2=f.pwr.encode(real.literal('3'));f.r.x3=5n;f.r.x4=99n;f.r.t0=88n;finish(f.pwr.run('pwr.'));assert.equal(value(f,f.r.x1),243n);assert.equal(f.r.x3,5n);assert.equal(f.r.x4,99n);assert.equal(f.r.t0,88n);assert.equal(f.r.arg,250000n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('PWR constructs the small-power initial value with the resolved HRLZI immediate',()=>{
  const f=fixture();f.pwr.s.oneImmediate=262151n;f.r.x3=0n;finish(f.pwr.run('pwr.'));assert.equal(f.r.x1,halfWords(7n,0n));assert.equal(f.r.t1,f.r.x1);
});
test('PWR reads public arguments after all three outer SAVE operations',()=>{
  const f=fixture(),push=f.pwr.io.pushData;f.m.write(13900n,2n);f.pwr.prepare(real.literal('2'),13900n);let count=0;f.pwr.io.pushData=function*(w){yield*push(w);if(++count===3)yield 'saved';};
  const g=f.pwr.run('pwr');assert.equal(g.next().value,'saved');f.m.write(13780n,f.pwr.encode(real.literal('3')));finish(g);assert.equal(value(f,f.r.t0),9n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('PWR uses a changed ARG block after its outer saves resume',()=>{
  const f=fixture(),push=f.pwr.io.pushData;f.m.write(13900n,2n);f.pwr.prepare(real.literal('2'),13900n);f.m.write(13910n,f.pwr.encode(real.literal('3')));f.m.write(13911n,3n);loadArgumentBlock(f.m,13920n,[13910n,13911n]);let n=0;f.pwr.io.pushData=function*(w){yield*push(w);if(++n===3)yield 'saved';};
  const g=f.pwr.run('pwr');assert.equal(g.next().value,'saved');selectArgumentBlock(f.r,13920n);finish(g);assert.equal(value(f,f.r.t0),27n);assert.equal(f.r.arg,13921n);
});
test('PWR exponent alias to X2 sees the preceding base load',()=>{
  const f=fixture();f.pwr.values.set(4n,real.literal('2'));f.m.write(13900n,4n);loadArgumentBlock(f.m,13910n,[13900n,6n]);selectArgumentBlock(f.r,13910n);finish(f.pwr.run('pwr'));assert.equal(value(f,f.r.t0),16n);
});
test('PWR small path checks live X3 after each FMPR',()=>{
  const f=fixture(),multiply=f.pwr.io.fmpr;f.r.x2=f.pwr.encode(real.literal('2'));f.r.x3=4n;f.pwr.io.fmpr=function*(d,s){yield*multiply(d,s);f.r.x3=1n;};finish(f.pwr.run('pwr.'));assert.equal(value(f,f.r.x1),4n);assert.deepEqual(f.pwr.events,['t1*x2']);assert.equal(f.r.x3,4n);
});
test('PWR later multiplications read current X2 after suspension',()=>{
  const f=fixture(),multiply=f.pwr.io.fmpr;f.r.x2=f.pwr.encode(real.literal('2'));f.r.x3=3n;let first=true;f.pwr.io.fmpr=function*(d,s){yield*multiply(d,s);if(first){first=false;yield 'multiply';}};const g=f.pwr.run('pwr.');assert.equal(g.next().value,'multiply');f.r.x2=f.pwr.encode(real.literal('3'));finish(g);assert.equal(value(f,f.r.x1),12n);
});
test('PWR preserves the recursive odd remainder on actual S memory',()=>{
  const f=fixture(),divide=f.pwr.io.idiviX3;f.r.x2=f.pwr.encode(real.literal('2'));f.r.x3=5n;f.r.x4=99n;f.pwr.io.idiviX3=function*(n){yield*divide(n);yield 'divide';};const g=f.pwr.run('pwr.');assert.equal(g.next().value,'divide');assert.equal(f.r.x3,2n);assert.equal(f.r.x4,1n);assert.equal(f.m.read(rightHalf(f.r.s)),99n);assert.equal(f.m.read(rightHalf(f.r.s)-1n),5n);finish(g);assert.equal(value(f,f.r.x1),32n);assert.equal(f.r.x4,99n);
});
test('PWR tests live X4 after squaring rather than caching the oddness decision',()=>{
  const f=fixture(),multiply=f.pwr.io.fmpr;f.r.x2=f.pwr.encode(real.literal('2'));f.r.x3=5n;f.pwr.io.fmpr=function*(d,s){yield*multiply(d,s);if(d==='x1'&&s==='x1')f.r.x4=0n;};finish(f.pwr.run('pwr.'));assert.equal(value(f,f.r.x1),16n);assert.deepEqual(f.pwr.events,['divide','t1*x2','x1*x1']);
});
test('PWR recursive return restores a saved remainder changed through stack memory',()=>{
  const f=fixture(),multiply=f.pwr.io.fmpr;f.r.x2=f.pwr.encode(real.literal('2'));f.r.x3=5n;let first=true;f.pwr.io.fmpr=function*(d,s){yield*multiply(d,s);if(first){first=false;yield 'inner';}};const g=f.pwr.run('pwr.');assert.equal(g.next().value,'inner');assert.equal(f.m.read(rightHalf(f.r.s)),1n);f.m.write(rightHalf(f.r.s),0n);finish(g);assert.equal(value(f,f.r.x1),16n);
});
test('PWR writes T0 before restoring the public caller registers',()=>{
  const f=fixture(),pop=f.pwr.io.popData;f.m.write(13900n,2n);f.r.x1=77n;f.pwr.prepare(real.literal('2'),13900n);let n=0;f.pwr.io.popData=function*(){if(++n===3)yield 'restore';return yield*pop();};const g=f.pwr.run('pwr');assert.equal(g.next().value,'restore');assert.equal(value(f,f.r.t0),4n);assert.equal(value(f,f.r.x1),4n);finish(g);assert.equal(f.r.x1,77n);
});
test('PWR FMPR failure leaves both public and internal saves on S without rollback',()=>{
  const f=fixture();f.m.write(13900n,2n);f.r.x1=71n;f.r.x2=72n;f.r.x3=73n;f.r.x4=74n;f.pwr.io.fmpr=function*(){throw new Error('floating trap');};assert.throws(()=>finish(f.pwr.call(real.literal('2'),13900n)),/floating trap/);assert.equal(f.r.s&262143n,6004n);assert.deepEqual([6000n,6001n,6002n,6003n,6004n].map(a=>f.m.read(a)),[71n,72n,73n,2n,74n]);
});
test('PWR divide failure occurs after the internal SAVE and preserves prior accumulator effects',()=>{
  const f=fixture();f.r.x3=5n;f.r.x4=9n;f.pwr.io.idiviX3=function*(){f.r.x3=123n;throw new Error('divide trap');};assert.throws(()=>finish(f.pwr.run('pwr.')),/divide trap/);assert.equal(f.r.x3,123n);assert.equal(f.m.read(6000n),5n);assert.equal(f.m.read(6001n),9n);
});
test('PWR public argument failure retains its preceding caller-register saves',()=>{
  const f=fixture();f.r.arg=250000n;f.r.x1=11n;f.r.x2=12n;f.r.x3=13n;assert.throws(()=>finish(f.pwr.run('pwr')));assert.deepEqual([6000n,6001n,6002n].map(a=>f.m.read(a)),[11n,12n,13n]);assert.equal(rightHalf(f.r.s),6002n);
});
test('PWR uses the shared SAVE/RESTOR underflow path if S changes before restoration',()=>{
  const f=fixture(),multiply=f.pwr.io.fmpr;f.r.x2=f.pwr.encode(real.literal('2'));f.r.x3=2n;f.pwr.io.fmpr=function*(d,s){yield*multiply(d,s);f.r.s=f.s.initialStackWord;};assert.throws(()=>finish(f.pwr.run('pwr.')),/Underflow transfer/);assert.equal(value(f,f.r.x1),4n);
});
test('BASPHA PHADAM composes raw PWR and shared S under the explicit rational fixture',()=>{
  const f=basePhaserRuntimeFixture();f.damage.draws.push('0','0');finish(f.run());assert.equal(f.queued[0].ihita,6480n);assert.deepEqual(f.rawPower.events,['t1*x2']);assert.equal(f.r.s,f.s.initialStackWord);assert.equal(f.high.read('tmscor',2,K.KPEDAM),6480n);
});
test('PLNATK PHADAM composes raw PWR without changing the original hit output',()=>{
  const f=planetAttackRuntimeFixture();f.damage.draws.push('0','0');finish(f.run());assert.equal(f.queued[0].ihita,6480n);assert.deepEqual(f.rawPower.events,['t1*x2']);assert.equal(f.r.s,f.s.initialStackWord);
});
