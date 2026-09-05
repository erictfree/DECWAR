import test from 'node:test';
import assert from 'node:assert/strict';
import { clearBufferStatements } from '../src/game/clear-buffer-statements.ts';
import { unpackAscii } from '../src/compat/word36.ts';

test('CLRBUF preserves the packed octal bells and completes OUT before CLEAR',()=>{
  const calls:unknown[]=[];
  const run=clearBufferStatements({
    *out(word,lines){calls.push([word,lines]);assert.equal(unpackAscii(word),'\x07\x07\x07\x07\0');yield 'output';},
    *clear(){calls.push('clear');yield 'clear';},
  });
  assert.deepEqual(run.next(),{value:'output',done:false});assert.deepEqual(calls,[[0o034160703400n,0n]]);
  assert.deepEqual(run.next(),{value:'clear',done:false});assert.deepEqual(calls,[[0o034160703400n,0n],'clear']);
  assert.equal(run.next().done,true);
});
