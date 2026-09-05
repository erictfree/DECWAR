import test from 'node:test';
import assert from 'node:assert/strict';
import { utcDateWord } from '../src/runtime/date-word.ts';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';

for(const date of ['1964-01-01','2000-02-29','2026-09-05','2100-12-31'])test(`Host date ${date} decodes through source DACON`,()=>{
  const input=new Date(date+'T23:59:59Z'),f=pregameRuntimeFixture([]),s=f.honorRoll.symbols;
  f.r.t1=utcDateWord(input);const run=f.honorRoll.date();assert.equal(run.next().done,true);
  assert.equal(f.m.read(s.day),BigInt(input.getUTCDate()));assert.equal(f.m.read(s.month),BigInt(input.getUTCMonth()+1));
  assert.equal(f.m.read(s.year),BigInt(input.getUTCFullYear()-2000));
});
test('Host date encoding rejects missing dates and years before its supported epoch',()=>{
  assert.throws(()=>utcDateWord(new Date(NaN)),/Unsupported host date/);
  assert.throws(()=>utcDateWord(new Date('1963-12-31T00:00:00Z')),/Unsupported host date/);
});
