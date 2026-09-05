import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { createTokenFloating,tokenTenLeftHalf } from '../src/runtime/token-floating.ts';
import { nearestDecimalFloat36,unroundedPositiveFloat36 } from '../src/compat/float-arithmetic36.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { bindRoundedNumericRuntime } from './fixtures/rounded-numeric-runtime.ts';
function fixture(line:string){
  const f=mainCommandFixture(line);f.tokens.symbols.tenLeftHalf=tokenTenLeftHalf;
  Object.assign(f.tokens.io,createTokenFloating(f.r,function*(){throw new Error('selected token arithmetic transfer');}));
  return f;
}
// Independent Fraction calculation of ANUM's per-digit FDV/FAD truncation and
// FMPRI rounding is retained in logs/decwar-d151-independent-vectors.log.
for(const [text,word] of [['12.5',0o204620000000n],['.3',0o177463146314n],['-0.3',-0o177463146314n],['1.25',0o201477777777n],['0.123456',0o175771531774n],['12.',0o204600000000n],['10.75',0o204527777777n]] as const)test(`GTKN native floating parsing preserves ANUM arithmetic for ${text}`,()=>{
  const f=fixture(text);finish(f.tokens.run());assert.equal(f.low.read('typlst',1),BigInt(K.KFLT));assert.equal(f.low.read('vallst',1),word);
});
test('Source decimal parsing of 1.25 differs from nearest compiler literal conversion',()=>{
  const f=fixture('1.25');finish(f.tokens.run());assert.equal(nearestDecimalFloat36('1.25').word-f.low.read('vallst',1),1n);
});
test('Parsed negative decimal reaches native comparison and integer conversion',()=>{
  const f=fixture('-1.25'),{numeric}=bindRoundedNumericRuntime(f);finish(f.tokens.run());
  const value={type:'real' as const,evaluate:function*(){return f.low.read('vallst',1);}};
  assert.equal(finish(numeric.convert('integer','int',value)),-1n);
  assert.equal(finish(numeric.compare('lt',value,{type:'integer',evaluate:function*(){return -1n;}})),true);
});
test('Unsupported negative ANUM accumulator does not silently select signed unrounded CPU behavior',()=>{
  assert.throws(()=>unroundedPositiveFloat36('add',-0o201400000000n,0o201400000000n),/nonnegative/);
});
test('ANUM scale overflow stores the rounded wrapped result before delivering its fault',()=>{
  const r={x2:0n,t1:0n,t2:0o377400000000n},seen:bigint[]=[];
  const io=createTokenFloating<string>(r,function*(result){seen.push(r.t2);assert.equal(result.word,r.t2);throw new Error('token scale overflow');});
  assert.throws(()=>finish(io.fmpri()),/token scale overflow/);assert.equal(seen.length,1);assert.notEqual(r.t2,0o377400000000n);
});
