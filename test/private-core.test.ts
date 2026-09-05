import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace } from '../src/compat/memory.ts';
import { PrivateCore } from '../src/runtime/private-core.ts';

test('Private CORE grows by pages, preserves retained words and clears reallocated pages',()=>{
  const m=new AddressSpace(),job={jbff:0n,jbrel:0n},core=new PrivateCore(m,job,1024n,4096n);
  assert.equal(job.jbff,1024n);assert.equal(job.jbrel,1023n);assert.throws(()=>m.read(1024n),/Unmapped/);
  assert.equal(core.request(1025n),true);assert.equal(job.jbrel,1535n);m.write(1030n,123n);
  assert.equal(core.request(2048n),true);assert.equal(job.jbrel,2559n);m.write(2100n,-1n);
  assert.equal(core.request(1024n),true);assert.equal(m.read(1030n),123n);assert.throws(()=>m.read(2100n),/Unmapped/);
  assert.equal(core.request(2048n),true);assert.equal(m.read(2100n),0n);assert.equal(job.jbff,1024n);
});
test('Private CORE failure preserves allocation and cannot overwrite another mapped region',()=>{
  const m=new AddressSpace(),job={jbff:0n,jbrel:0n},core=new PrivateCore(m,job,1024n,4096n);m.map(3072n,[99n]);
  assert.equal(core.request(2048n),true);m.write(2100n,45n);
  for(const address of [0n,3072n,4096n,-1n])assert.equal(core.request(address),false);
  assert.equal(job.jbrel,2559n);assert.equal(m.read(2100n),45n);assert.equal(m.read(3072n),99n);
});
