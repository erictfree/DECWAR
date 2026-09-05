import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace } from '../src/compat/memory.ts';
import { beginFortran5Do,continueFortran5Do } from '../src/compat/fortran5-do.ts';
import { MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
function memory(){const m=new AddressSpace();m.map(100n,[77n]);return m;}
for(const [start,limit,step,want] of [
  [1n,4n,1n,[1n,2n,3n,4n]],
  [5n,2n,1n,[5n]],
  [7n,1n,-2n,[7n,5n,3n,1n]],
  [1n,7n,-2n,[1n]],
  [1n,6n,2n,[1n,3n,5n]],
] as const)test(`FORTRAN V5 DO ${start},${limit},${step} uses a saved one-trip-minimum count`,()=>{
  const m=memory(),frame=beginFortran5Do(m,100n,start,limit,step),indices:bigint[]=[];
  do{indices.push(m.read(100n));}while(continueFortran5Do(m,frame));
  assert.deepEqual(indices,want);assert.equal(frame.counter,0n);
});
test('Changing a DO index through shared memory changes subsequent indices without shortening count',()=>{
  const m=memory(),frame=beginFortran5Do(m,100n,1n,3n);m.write(100n,200n);
  assert.equal(continueFortran5Do(m,frame),true);assert.equal(m.read(100n),201n);
  assert.equal(continueFortran5Do(m,frame),true);assert.equal(m.read(100n),202n);
  assert.equal(continueFortran5Do(m,frame),false);assert.equal(m.read(100n),203n);
});
test('Unsupported DO zero divisor and arithmetic overflow leave policy choice explicit',()=>{
  const m=memory();assert.throws(()=>beginFortran5Do(m,100n,1n,4n,0n),/divide-check/);
  assert.throws(()=>beginFortran5Do(m,100n,MIN_INTEGER,MAX_INTEGER),/overflow/);
  assert.throws(()=>beginFortran5Do(m,100n,MIN_INTEGER,0n,-1n),/overflow/);
  assert.equal(m.read(100n),77n);
});
