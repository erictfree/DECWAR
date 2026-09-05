import test from 'node:test';
import assert from 'node:assert/strict';
import { rawIngal } from '../src/compat/ingal.ts';
import { outputRuntimeFixture } from './fixtures/output-runtime.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
for(const [v,h,valid] of [[1n,1n,true],[BigInt(K.KGALV),BigInt(K.KGALH),true],[0n,1n,false],[-1n,1n,false],[BigInt(K.KGALV+1),1n,false],[1n,0n,false],[1n,-1n,false],[1n,BigInt(K.KGALH+1),false],[MAX_INTEGER,1n,false],[MIN_INTEGER,1n,false]] as const)test(`Raw INGAL ${v},${h} retains full-word limits and final T1`,()=>{
  const f=outputRuntimeFixture();f.args(v,h);assert.equal(rawIngal(f.r,f.rt.args).next().done,true);assert.equal(f.r.f,valid?-1n:0n);assert.equal(f.r.t1,v<=0n||v>BigInt(K.KGALV)?v:h);
});
test('Raw INGAL skips an unmapped horizontal argument after vertical rejection',()=>{
  const f=outputRuntimeFixture();f.m.write(5500n,0n);loadArgumentBlock(f.m,5400n,[5500n,250000n]);selectArgumentBlock(f.r,5400n);assert.equal(rawIngal(f.r,f.rt.args).next().done,true);assert.equal(f.r.f,0n);
});
test('Raw INGAL horizontal T1 alias reads the preceding vertical load',()=>{
  const f=outputRuntimeFixture();f.r.t1=0n;f.m.write(5500n,2n);loadArgumentBlock(f.m,5400n,[5500n,1n]);selectArgumentBlock(f.r,5400n);rawIngal(f.r,f.rt.args).next();assert.equal(f.r.f,-1n);assert.equal(f.r.t1,2n);
});
test('Raw INGAL horizontal read failure preserves T1 and the old result register',()=>{
  const f=outputRuntimeFixture();f.r.f=77n;f.m.write(5500n,1n);loadArgumentBlock(f.m,5400n,[5500n,250000n]);selectArgumentBlock(f.r,5400n);assert.throws(()=>rawIngal(f.r,f.rt.args).next(),/Unmapped/);assert.equal(f.r.t1,1n);assert.equal(f.r.f,77n);
});
