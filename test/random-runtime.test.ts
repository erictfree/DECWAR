import test from 'node:test';
import assert from 'node:assert/strict';
import { DecwarRandom } from '../src/compat/random.ts';
import { statusRuntimeFixture } from './fixtures/status-runtime.ts';
import { randomRuntimeFixture } from './fixtures/random-runtime.ts';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { planetAttackRuntimeFixture } from './fixtures/planet-attack-runtime.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { halfWords,leftHalf,rightHalf,signed36,MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';
function fixture(){const f=statusRuntimeFixture(),rng=randomRuntimeFixture(f);f.file.write('seed',1n);return {...f,rng};}
test('Raw IRAN seed-one vector matches source integer recurrence and stores the actual private SEED',()=>{
  const f=fixture();assert.equal(f.rng.s.seed,f.file.address('seed'));assert.deepEqual(Array.from({length:8},()=>finish(f.rng.iran(100n))),[14n,64n,56n,80n,48n,75n,84n,43n]);assert.equal(f.file.read('seed'),32111981057n);
});
test('RAN. leaves quotient and remainder in the accumulator pair without reading arguments',()=>{
  const f=fixture();f.r.arg=250000n;finish(f.rng.run('ran.'));assert.equal(f.r.t0,1013n);assert.equal(f.r.t1,202n);assert.equal(f.file.read('seed'),260543n);assert.equal(f.r.arg,250000n);
});
for(const seed of [0n,halfWords(1n,0n),MIN_INTEGER])test(`RAN. repairs only the empty right half of seed ${seed}`,()=>{
  const f=fixture(),multiply=f.rng.io.imuliT1;f.file.write('seed',seed);let operand=0n;f.rng.io.imuliT1=function*(w){operand=f.r.t1;yield*multiply(w);};finish(f.rng.run('ran.'));assert.equal(rightHalf(operand),260543n);assert.equal(leftHalf(operand),leftHalf(seed));
});
test('RAN. retains nonzero low seed bits and clears only the product sign bit',()=>{
  const f=fixture();f.file.write('seed',-1n);let before=0n;f.rng.io.imuliT1=function*(){before=f.r.t1;f.r.t1=-2n;};finish(f.rng.run('ran.'));assert.equal(before,-1n);assert.equal(f.file.read('seed'),MAX_INTEGER-1n);
});
test('SETRAN explicit nonzero seeds preserve the supplied word without using the clock',()=>{
  const f=fixture();for(const n of [1n,-1n,MIN_INTEGER,halfWords(4n,0n)]){f.r.t0=88n;finish(f.rng.setran(n));assert.equal(f.file.read('seed'),signed36(n));assert.equal(f.r.t1,signed36(n));assert.equal(f.r.t0,88n);}assert.deepEqual(f.rng.events,[]);
});
test('SETRAN zero seed uses MSTIME in T1 and stores only after monitor completion',()=>{
  const f=fixture(),clock=f.rng.io.mstimeT1;f.rng.clock.push(12345n);f.rng.io.mstimeT1=function*(){yield 'clock';yield*clock();};const g=f.rng.setran(0n);assert.equal(g.next().value,'clock');assert.equal(f.file.read('seed'),1n);f.m.write(13750n,999n);finish(g);assert.equal(f.file.read('seed'),12345n);assert.equal(f.r.t1,12345n);
});
test('SETRAN stores live T1 after MSTIME rather than snapshotting a returned host value',()=>{
  const f=fixture();f.rng.io.mstimeT1=function*(){f.r.t1=123n;yield 'clock';};const g=f.rng.setran(0n);assert.equal(g.next().value,'clock');f.r.t1=-7n;finish(g);assert.equal(f.file.read('seed'),-7n);
});
test('SETRAN clock failure retains its T1 zero load and previous seed',()=>{
  const f=fixture();f.rng.io.mstimeT1=function*(){throw new Error('monitor fault');};assert.throws(()=>finish(f.rng.setran(0n)),/monitor fault/);assert.equal(f.r.t1,0n);assert.equal(f.file.read('seed'),1n);
});
test('RAN. reads the seed before multiply and overwrites a concurrent seed change on return',()=>{
  const f=fixture(),mul=f.rng.io.imuliT1;f.rng.io.imuliT1=function*(w){yield 'multiply';yield*mul(w);};const g=f.rng.run('ran.');assert.equal(g.next().value,'multiply');f.file.write('seed',999n);finish(g);assert.equal(f.file.read('seed'),260543n);
});
test('RAN. retains the newly stored seed if its final IDIVI fails',()=>{
  const f=fixture();f.rng.io.idiviT0=function*(){throw new Error('CPU divide fault');};assert.throws(()=>finish(f.rng.run('ran.')),/divide fault/);assert.equal(f.file.read('seed'),260543n);assert.equal(f.r.t0,260543n);assert.equal(f.r.t1,260543n);
});
test('RAN. failed multiply leaves old seed and does not reach sign clearing',()=>{
  const f=fixture();f.rng.io.imuliT1=function*(){f.r.t1=-3n;throw new Error('CPU multiply fault');};assert.throws(()=>finish(f.rng.run('ran.')),/multiply fault/);assert.equal(f.file.read('seed'),1n);assert.equal(f.r.t1,-3n);
});
test('IRAN range zero reaches IDIV after seed advancement, with no host guard',()=>{
  const f=fixture();assert.throws(()=>finish(f.rng.iran(0n)),/divide by zero/);assert.equal(f.file.read('seed'),260543n);assert.equal(f.r.t0,1013n);assert.equal(f.r.t1,202n);assert.equal(f.rng.events.at(-1),'idiv:0');
});
test('IRAN negative divisor reaches the CPU and returns the ordinary remainder plus one',()=>{
  const f=fixture();assert.equal(finish(f.rng.iran(-100n)),14n);assert.equal(f.rng.events.at(-1),'idiv:-100');assert.equal(f.r.t1,13n);
});
test('IRAN reads range after RAN. completes, including an alias to updated SEED',()=>{
  const f=fixture();loadArgumentBlock(f.m,13740n,[f.file.address('seed')]);selectArgumentBlock(f.r,13740n);finish(f.rng.run('iran'));assert.equal(f.r.t0,1014n);assert.equal(f.r.t1,1013n);
});
for(const [address,expected] of [[0n,1n],[1n,4n]] as const)test(`IRAN argument alias to AC${address} observes the preceding division`,()=>{
  const f=fixture();loadArgumentBlock(f.m,13740n,[address]);selectArgumentBlock(f.r,13740n);finish(f.rng.run('iran'));assert.equal(f.r.t0,expected);
});
test('IRAN resolves a newly selected ARG block after the random division resumes',()=>{
  const f=fixture(),divide=f.rng.io.idiviT0;f.rng.prepare(100n);f.m.write(13770n,7n);loadArgumentBlock(f.m,13760n,[13770n]);f.rng.io.idiviT0=function*(w){yield*divide(w);yield 'random';};const g=f.rng.run('iran');assert.equal(g.next().value,'random');selectArgumentBlock(f.r,13760n);finish(g);assert.equal(f.r.t0,6n);assert.equal(f.r.arg,13761n);
});
test('IRAN missing range argument fails after storing its new seed',()=>{
  const f=fixture();f.r.arg=250000n;assert.throws(()=>finish(f.rng.run('iran')));assert.equal(f.file.read('seed'),260543n);
});
test('IRAN MOVEI masks the current post-IDIV remainder to eighteen bits',()=>{
  const f=fixture();f.rng.io.idivT0=function*(){f.r.t1=262143n;yield 'divide';};const g=f.rng.iran(100n);assert.equal(g.next().value,'divide');assert.equal(finish(g),0n);
  f.rng.io.idivT0=function*(){f.r.t1=-2n;};assert.equal(finish(f.rng.iran(100n)),262143n);
});
test('Public RAN ignores its dummy argument and delegates FSC T0,200 with the live integer quotient',()=>{
  const f=fixture();f.r.arg=250000n;f.rng.io.fscT0=function*(scale){assert.equal(scale,0o200n);assert.equal(f.r.t0,1013n);assert.equal(f.r.t1,202n);yield 'fsc';f.r.t0=123456n;};const g=f.rng.run('ran');assert.equal(g.next().value,'fsc');assert.equal(f.file.read('seed'),260543n);finish(g);assert.equal(f.r.t0,123456n);assert.equal(f.r.t1,202n);
});
test('Public RAN requires a CPU floating-point service and preserves seed on its failure',()=>{
  const f=fixture();assert.throws(()=>finish(f.rng.run('ran')),/FSC requires/);assert.equal(f.file.read('seed'),260543n);assert.equal(f.r.t0,1013n);
});
test('Random private state remains isolated between two sessions with identical addresses',()=>{
  const a=fixture(),b=fixture();assert.equal(a.rng.s.seed,b.rng.s.seed);finish(a.rng.iran(100n));assert.equal(b.file.read('seed'),1n);assert.equal(finish(b.rng.iran(100n)),14n);assert.equal(a.file.read('seed'),b.file.read('seed'));
});
test('BASPHA PHAROM composes an actual seeded IRAN draw instead of a scheduled result',()=>{
  const f=basePhaserRuntimeFixture(),rng=randomRuntimeFixture(f);f.file.write('seed',1n);f.high.write('alive',0n,1);f.world.rom=-1n;f.world.locr.v=10;f.world.locr.h=20;f.romulanIO.iran=function*(n){return yield*rng.iran(BigInt(n));};finish(f.run());assert.equal(f.queued[0].ihita,570n);assert.equal(f.world.erom,944n);assert.equal(f.file.read('seed'),260543n);assert.equal(f.damage.integers.length,0);assert.equal(f.queued.length,1);
});
test('PLNATK neutral activation and PHAROM consume the same live seed in source call order',()=>{
  const f=planetAttackRuntimeFixture(),rng=randomRuntimeFixture(f);f.file.write('seed',1n);f.planet(1,601);f.high.write('alive',0n,1);f.world.rom=-1n;f.world.locr.v=10;f.world.locr.h=20;f.io.iran=function*(n){return yield*rng.iran(BigInt(n));};f.romulanIO.iran=function*(n){return yield*rng.iran(BigInt(n));};finish(f.run());assert.equal(f.queued[0].ihita,1640n);assert.equal(f.world.erom,837n);assert.equal(f.queued.length,1);assert.equal(f.file.read('seed'),33522916481n);assert.deepEqual(rng.events,['imuli','idivi:257','idiv:2','imuli','idivi:257','idiv:100']);
});
test('PLNATK seeded IRAN suspension delays activation and uses a changed seed only on the next call',()=>{
  const f=planetAttackRuntimeFixture(),rng=randomRuntimeFixture(f);f.file.write('seed',1n);f.planet(1,601);f.high.write('alive',0n,1);f.world.rom=-1n;f.world.locr.v=10;f.world.locr.h=20;f.io.iran=function*(n){return yield*rng.iran(BigInt(n));};f.romulanIO.iran=function*(n){return yield*rng.iran(BigInt(n));};
  const div=rng.io.idiviT0;let first=true;rng.io.idiviT0=function*(w){yield*div(w);if(first){first=false;yield 'draw';}};const g=f.run();assert.equal(g.next().value,'draw');assert.equal(f.calls.length,0);f.file.write('seed',1n);finish(g);assert.equal(f.queued[0].ihita,1140n);assert.equal(f.file.read('seed'),260543n);
});

test('Older integer RNG component also preserves signed divisors and seed advancement on zero',()=>{
  const r=new DecwarRandom(1n);assert.equal(r.iran(-100n),14n);const zero=new DecwarRandom(1n);assert.throws(()=>zero.iran(0n),RangeError);assert.equal(zero.seed,260543n);
});
