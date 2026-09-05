import test from 'node:test';
import assert from 'node:assert/strict';
import { outputRuntimeFixture } from './fixtures/output-runtime.ts';
import { bindBlockRuntime } from './fixtures/block-runtime.ts';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
function fixture(){const f=outputRuntimeFixture(),b=bindBlockRuntime(f);f.m.write(b.symbols.value,17n);f.m.write(b.symbols.count,4n);for(let i=0;i<8;i++){f.m.write(b.symbols.from+BigInt(i),BigInt(i+1));f.m.write(b.symbols.to+BigInt(i),99n);}return {...f,b,s:b.symbols,set:()=>finish(b.run('blkset',[b.symbols.to,b.symbols.value,b.symbols.count])),move:()=>finish(b.run('blkmov',[b.symbols.from,b.symbols.to,b.symbols.count])),words:(a:bigint,n=5)=>Array.from({length:n},(_,i)=>f.m.read(a+BigInt(i)))};}
test('Raw BLKSET composes its first write and overlapping forward BLT',()=>{
  const f=fixture(),s=f.r.s,p=f.r.p;f.set();assert.deepEqual(f.words(f.s.to),[17n,17n,17n,17n,99n]);assert.equal(f.r.t2,f.s.to+3n);assert.equal(f.r.t1,signed36(halfWords(f.s.to+3n,f.s.to+4n)));assert.equal(f.r.s,s);assert.equal(f.r.p,p);
});
test('Raw BLKMOV copies source words and passes the destination endpoint to BLT',()=>{
  const f=fixture();f.move();assert.deepEqual(f.words(f.s.to),[1n,2n,3n,4n,99n]);assert.equal(f.r.t2,f.s.to+3n);assert.equal(f.r.t1,signed36(halfWords(f.s.from+4n,f.s.to+4n)));
});
test('Raw BLKMOV overlapping destination follows sequential fixture copies rather than snapshot copying',()=>{
  const f=fixture();finish(f.b.run('blkmov',[f.s.from,f.s.from+1n,f.s.count]));assert.deepEqual(f.words(f.s.from),[1n,1n,1n,1n,1n]);
});
test('Raw BLKMOV earlier destination preserves the ordinary forward-copy result',()=>{
  const f=fixture();finish(f.b.run('blkmov',[f.s.from+1n,f.s.from,f.s.count]));assert.deepEqual(f.words(f.s.from),[2n,3n,4n,5n,5n]);
});
for(const count of [0n,1n,-1n])test(`Raw BLKSET size ${count} still writes first word and invokes BLT`,()=>{
  const f=fixture();f.m.write(f.s.count,count);let called=false;f.b.io.blt=function*(last){called=true;assert.equal(last,rightHalf(f.s.to-1n+count));assert.equal(f.r.t1,signed36(halfWords(f.s.to,f.s.to+1n)));};f.set();assert.equal(called,true);assert.deepEqual(f.words(f.s.to,2),[17n,99n]);
});
for(const count of [0n,-1n])test(`Raw BLKMOV size ${count} still reaches required BLT with its computed bound`,()=>{
  const f=fixture();f.m.write(f.s.count,count);let bound:bigint|undefined;f.b.io.blt=function*(last){bound=last;};f.move();assert.equal(bound,rightHalf(f.s.to-1n+count));assert.deepEqual(f.words(f.s.to),[99n,99n,99n,99n,99n]);
});
test('Raw BLKSET size alias sees the first stored value before ADD',()=>{
  const f=fixture();f.m.write(f.s.value,3n);finish(f.b.run('blkset',[f.s.to,f.s.value,f.s.to]));assert.deepEqual(f.words(f.s.to),[3n,3n,3n,99n,99n]);
});
test('Raw BLKSET destination descriptor alias changes the second address resolution',()=>{
  const f=fixture();f.m.write(f.s.value,f.s.to);f.m.write(f.s.to,42n);finish(f.b.run('blkset',[f.s.header+1n,f.s.value,f.s.count]));assert.equal(f.m.read(f.s.header+1n),f.s.to);assert.deepEqual(f.words(f.s.to),[42n,42n,42n,42n,99n]);
});
test('Raw BLKSET reads the value before writing a destination that aliases it',()=>{
  const f=fixture();finish(f.b.run('blkset',[f.s.value,f.s.value,f.s.count]));assert.equal(f.m.read(f.s.value),17n); // Count is the next word, so the initial value propagates over it.
  assert.equal(f.m.read(f.s.count),17n);
});
test('Raw BLKSET AOJ uses a full 36-bit increment at the address-space boundary',()=>{
  const f=fixture();f.m.map(0o777777n,[0n]);f.b.io.blt=function*(last){assert.equal(f.r.t1,0n);assert.equal(last,2n);};finish(f.b.run('blkset',[0o777777n,f.s.value,f.s.count]));assert.equal(f.m.read(0o777777n),17n);
});
test('Raw BLKSET CPU suspension follows the first write and precedes the count read',()=>{
  const f=fixture(),aoj=f.b.io.aojT1;f.b.io.aojT1=function*(){yield 'aoj';yield*aoj();};const g=f.b.run('blkset',[f.s.to,f.s.value,f.s.count]);assert.equal(g.next().value,'aoj');assert.deepEqual(f.words(f.s.to,2),[17n,99n]);f.m.write(f.s.count,2n);finish(g);assert.deepEqual(f.words(f.s.to,3),[17n,17n,99n]);
});
test('Raw BLKSET current ARG after AOJ controls the later count reference',()=>{
  const f=fixture(),aoj=f.b.io.aojT1;f.b.io.aojT1=function*(){yield*aoj();yield 'new-arg';};const g=f.b.run('blkset',[f.s.to,f.s.value,f.s.count]);assert.equal(g.next().value,'new-arg');f.m.write(25020n,2n);loadArgumentBlock(f.m,25030n,[f.s.to,f.s.value,25020n]);selectArgumentBlock(f.r,25030n);finish(g);assert.deepEqual(f.words(f.s.to,3),[17n,17n,99n]);
});
test('Raw block ADD receives the current size word and its result controls the BLT bound',()=>{
  const f=fixture();f.b.io.addT2=function*(n){assert.equal(n,4n);yield 'addition';f.r.t2=f.s.to+1n;};const g=f.b.run('blkmov',[f.s.from,f.s.to,f.s.count]);assert.equal(g.next().value,'addition');finish(g);assert.deepEqual(f.words(f.s.to,3),[1n,2n,99n]);
});
test('Raw BLT service receives live T1 and retains its resulting accumulator state',()=>{
  const f=fixture();f.b.io.blt=function*(last){assert.equal(last,f.s.to+3n);assert.equal(f.r.t1,signed36(halfWords(f.s.from,f.s.to)));f.r.t1=-99n;f.r.t2=-88n;};f.move();assert.equal(f.r.t1,-99n);assert.equal(f.r.t2,-88n);
});
test('Raw BLKSET AOJ failure preserves first write and prepared pointer',()=>{
  const f=fixture();f.b.io.aojT1=function*(){throw new Error('aoj fault');};assert.throws(f.set,/aoj fault/);assert.equal(f.m.read(f.s.to),17n);assert.equal(f.r.t1,signed36(halfWords(f.s.to,f.s.to)));
});
test('Raw BLKSET ADD failure preserves the first write without performing BLT',()=>{
  const f=fixture();f.b.io.addT2=function*(){throw new Error('add fault');};assert.throws(f.set,/add fault/);assert.deepEqual(f.words(f.s.to,2),[17n,99n]);assert.equal(f.r.t2,f.s.to-1n);
});
test('Raw BLKMOV BLT failure retains its partial writes without rollback',()=>{
  const f=fixture();f.b.io.blt=function*(){f.m.write(rightHalf(f.r.t1),f.m.read(leftHalf(f.r.t1)));throw new Error('blt fault');};assert.throws(f.move,/blt fault/);assert.deepEqual(f.words(f.s.to,2),[1n,99n]);
});
test('Raw BLKSET unmapped value fails before the destination write',()=>{
  const f=fixture();assert.throws(()=>finish(f.b.run('blkset',[f.s.to,100000n,f.s.count])),/Unmapped/);assert.equal(f.m.read(f.s.to),99n);
});
test('Raw BLKSET unmapped size fails after the initial destination write',()=>{
  const f=fixture();assert.throws(()=>finish(f.b.run('blkset',[f.s.to,f.s.value,100000n])),/Unmapped/);assert.equal(f.m.read(f.s.to),17n);
});
test('Raw BLKSET T1 destination alias is observed before destination-address reload',()=>{
  const f=fixture();f.b.io.blt=function*(){assert.equal(leftHalf(f.r.t1),1n);assert.equal(rightHalf(f.r.t1),2n);};finish(f.b.run('blkset',[1n,f.s.value,f.s.count]));assert.equal(f.r.t2,4n);
});
test('Raw LOCF returns the resolved address without reading the destination word',()=>{
  const f=fixture();f.r.t1=55n;f.r.t2=66n;finish(f.b.run('locf',[100000n]));assert.equal(f.r.t0,100000n);assert.equal(f.r.t1,55n);assert.equal(f.r.t2,66n);assert.deepEqual(f.b.events,[]);
});
test('Raw LOCF supports indexed argument resolution through actual ACs',()=>{
  const f=fixture();f.r.x1=3n;finish(f.b.run('locf',[halfWords(5n,f.s.to)]));assert.equal(f.r.t0,f.s.to+3n);
});
test('Raw LOCF uses live ARG selection at entry',()=>{
  const f=fixture(),g=f.b.run('locf',[f.s.from]);loadArgumentBlock(f.m,25030n,[f.s.to]);selectArgumentBlock(f.r,25030n);finish(g);assert.equal(f.r.t0,f.s.to);
});
test('POINTS raw BLKSET clears only TOTAL before the unresolved final continuation',()=>{
  const f=pregameRuntimeFixture([]);f.m.write(f.points.dflg,-1n);for(let c=1;c<=4;c++)f.points.po.write('total',99n,c);f.points.po.write('owidth',77n);assert.throws(()=>finish(f.points.run()),/uninitialized POINTS DO/);assert.deepEqual([1,2,3,4].map(c=>f.points.po.read('total',c)),[0n,0n,0n,0n]);assert.equal(f.points.po.read('owidth'),77n);assert.ok(f.points.block.events.some(e=>e.startsWith('blt:')));
});
test('POINTS BLKSET suspension exposes only the first cleared total before BLT',()=>{
  const f=pregameRuntimeFixture([]);for(let c=1;c<=4;c++)f.points.po.write('total',99n,c);f.m.write(f.points.dflg,-1n);const blt=f.points.block.io.blt;f.points.block.io.blt=function*(last){yield 'total-copy';yield*blt(last);};const g=f.points.run();assert.equal(g.next().value,'total-copy');assert.deepEqual([1,2,3,4].map(c=>f.points.po.read('total',c)),[0n,99n,99n,99n]);assert.throws(()=>finish(g),/uninitialized POINTS DO/);assert.deepEqual([1,2,3,4].map(c=>f.points.po.read('total',c)),[0n,0n,0n,0n]);
});
