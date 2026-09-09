import test from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticRecords,withDiagnosticRecords,MAX_DIAGNOSTIC_RECORDS} from '../src/runtime/diagnostic-records.ts';

test('unit fixture histories remain ordinary full arrays outside live composition',()=>{
  const records=diagnosticRecords<number>();records.push(1,2,3);assert.deepEqual(records,[1,2,3]);
  assert.equal(records.push,Array.prototype.push);
});
test('disabled history retains nothing and preserves the policy after composition returns',()=>{
  const records=withDiagnosticRecords(0,()=>diagnosticRecords<object>());
  for(let i=0;i<10000;i++)assert.equal(records.push({i}),0);
  assert.deepEqual(records,[]);
});
test('bounded history retains newest records in order across batched appends',()=>{
  const records=withDiagnosticRecords(3,()=>diagnosticRecords<number>());
  assert.equal(records.push(1,2),2);assert.equal(records.push(3,4),3);assert.deepEqual(records,[2,3,4]);
  records.push(5,6,7,8,9);assert.deepEqual(records,[7,8,9]);
  assert.equal(records.push(),3);records.length=0;records.push(10);assert.deepEqual(records,[10]);
});
test('nested and interleaved sessions retain their own history policy',async()=>{
  const a=withDiagnosticRecords(1,()=>diagnosticRecords<number>()),b=withDiagnosticRecords(0,()=>diagnosticRecords<number>());
  await withDiagnosticRecords(2,async()=>{
    await Promise.resolve();const c=diagnosticRecords<number>();
    withDiagnosticRecords(0,()=>{const d=diagnosticRecords<number>();d.push(9);assert.deepEqual(d,[]);});
    c.push(1,2,3);assert.deepEqual(c,[2,3]);
  });
  a.push(1,2);b.push(1,2);assert.deepEqual(a,[2]);assert.deepEqual(b,[]);
  assert.equal(diagnosticRecords<number>().push,Array.prototype.push);
});
for(const limit of [-1,0.5,NaN,Infinity,MAX_DIAGNOSTIC_RECORDS+1])test(`reject invalid history limit ${limit}`,()=>{
  let composed=false;assert.throws(()=>withDiagnosticRecords(limit,()=>{composed=true;}),RangeError);assert.equal(composed,false);
});

test('wrapped ring preserves array inspection and explicit test mutations',()=>{
  const records=withDiagnosticRecords(3,()=>diagnosticRecords<number>());
  records.push(1,2,3,4,5);
  assert.ok(Array.isArray(records));assert.deepEqual([...records],[3,4,5]);
  assert.deepEqual(records.slice(1),[4,5]);assert.equal(records.includes(3),true);
  assert.equal(JSON.stringify(records),'[3,4,5]');
  assert.deepEqual(Object.values(records),[3,4,5]);
  records[0]=7;assert.deepEqual(records,[7,4,5]);
  records.push(6);assert.deepEqual(records,[4,5,6]);
  records.length=0;records.push(8,9);assert.deepEqual(records,[8,9]);
});

test('many wraps match an ordinary newest-records reference',()=>{
  for(const limit of [1,2,8,127]){
    const records=withDiagnosticRecords(limit,()=>diagnosticRecords<number>());
    let expected:number[]=[];
    for(let i=0;i<2000;i++){
      const batch=Array.from({length:i%7},(_,j)=>i*10+j);
      records.push(...batch);expected=expected.concat(batch).slice(-limit);
      assert.deepEqual(records.slice(),expected);
    }
  }
});
