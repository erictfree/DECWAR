import test from 'node:test';
import assert from 'node:assert/strict';
import { multiplyRoundedFloat36 } from '../src/compat/float-multiply36.ts';
import { createSessionPower } from '../src/runtime/power.ts';
import { normalizedFloatDyadic } from '../src/compat/ran-float36.ts';
import { outputRuntimeFixture } from './fixtures/output-runtime.ts';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';

function done<T>(g:Generator<string,T,void>):T{for(;;){const s=g.next();if(s.done)return s.value;}}
const clear={trap1:false,overflow:false,floatingOverflow:false,floatingUnderflow:false};
// Direct exponent/fraction vectors. 1.5 * (1 + 2^-26) is exactly halfway
// between adjacent results; its negative must round away from zero too.
for(const [name,a,b,word] of [
  ['one',0o201400000000n,0o201400000000n,0o201400000000n],
  ['half squared',0o200400000000n,0o200400000000n,0o177400000000n],
  ['one and a half squared',0o201600000000n,0o201600000000n,0o202440000000n],
  ['positive midpoint',0o201600000000n,0o201400000001n,0o201600000002n],
  ['negative midpoint',-0o201600000000n,0o201400000001n,-0o201600000002n],
  ['below midpoint',0o201400000001n,0o201400000001n,0o201400000002n],
  ['rounding carries into exponent',0o201400000001n,0o201777777776n,0o202400000000n],
  ['negative times negative',-0o201600000000n,-0o201600000000n,0o202440000000n],
  ['zero',0n,-0o201600000000n,0n],
] as const)test(`FMPR ${name}`,()=>assert.deepEqual(multiplyRoundedFloat36(a,b),{word,...clear}));
test('FMPR overflow stores a wrapped exponent and raises three conditions',()=>{
  assert.deepEqual(multiplyRoundedFloat36(0o377600000000n,0o202400000000n),{word:0o000600000000n,trap1:true,overflow:true,floatingOverflow:true,floatingUnderflow:false});
});
test('FMPR underflow wraps and additionally raises Floating Underflow',()=>{
  assert.deepEqual(multiplyRoundedFloat36(0o000400000000n,0o200400000000n),{word:0o377400000000n,trap1:true,overflow:true,floatingOverflow:true,floatingUnderflow:true});
});
test('FMPR rejects unsupported non-normalized input rather than silently normalizing it',()=>{
  assert.throws(()=>multiplyRoundedFloat36(0o201200000000n,0o201400000000n),/Normalized/);
});
function powerFixture(){
  const f=outputRuntimeFixture(),s={base:8500n,header:8510n},exponent=8520n;
  const power=createSessionPower(f.m,f.r,f.rt.args,s,f.rt.stack,function*(){throw new Error('arithmetic trap');});
  return {...f,s,exponent,power};
}
// 29/32 is exactly represented. Expected words were independently calculated
// with Python Fraction using the source's multiplication tree and 27-bit
// midpoint rounding. At power 12, rounding only once would end in octal 254.
for(const [exponent,word] of [
  [-1n,0o201400000000n],[0n,0o201400000000n],[1n,0o200720000000n],
  [2n,0o200644400000n],[3n,0o200575050000n],[4n,0o200531264200n],
  [5n,0o200470763264n],[6n,0o200433504423n],[7n,0o200401026071n],
  [12n,0o177472200253n],[20n,0o176435746367n],[63n,0o170411426065n],
] as const)test(`Public PWR preserves rounded multiplication order at exponent ${exponent}`,()=>{
  const f=powerFixture();f.m.write(f.exponent,exponent);
  for(const [i,k] of (['x1','x2','x3','x4'] as const).entries())f.r[k]=BigInt(21+i);
  const stack=f.r.s;
  assert.equal(done(f.power.call(0o200720000000n,f.exponent)),word);
  assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4,f.r.s],[21n,22n,23n,24n,stack]);
});
test('PWR fault delivery observes FMPR destination before a transfer prevents restoration',()=>{
  const f=powerFixture();f.m.write(f.exponent,2n);const stack=f.r.s;
  assert.throws(()=>done(f.power.call(0o377400000000n,f.exponent)),/arithmetic trap/);
  assert.equal(f.r.t1,0o175400000000n);assert.notEqual(f.r.s,stack);
});
test('PWR caller may resume after recording wrapped arithmetic result',()=>{
  const f=powerFixture(),faults:bigint[]=[];f.m.write(f.exponent,2n);
  const power=createSessionPower(f.m,f.r,f.rt.args,f.s,f.rt.stack,function*(result){faults.push(result.word);});
  assert.equal(done(power.call(0o377400000000n,f.exponent)),0o175400000000n);
  assert.deepEqual(faults,[0o175400000000n]);
});
test('PHADAM consumes physical rounded PWR result through an explicit remaining-rational boundary',()=>{
  const f=basePhaserRuntimeFixture(),args={nplc:13940n,j:13941n,id:13942n,phit:13943n,ship:13944n};
  [2n,6n,12n,20n,-1n].forEach((v,i)=>f.m.write(13940n+BigInt(i),v));
  const target=f.views.high.players[6].ship;
  Object.assign(target,{v:12,h:20,energy:50000n,damage:0n,shieldStrength:1000n,shieldCondition:-1n});
  f.high.write('alive',-1n,6);f.views.high.board.setdsp(12,20,206);
  f.m.map(72000n,Array<bigint>(32).fill(0n));
  const power=createSessionPower(f.m,f.r,f.rt.args,{base:72000n,header:72010n},f.rt.stack,function*(){throw new Error('unexpected FMPR trap');});
  let result:bigint|undefined;
  f.weapon.io.pwr=function*(base,exponent){
    // RAN .3125 makes the current rational expression .9 + .02*RAN = 29/32.
    // This case deliberately avoids an unresolved decimal-literal conversion.
    const value=f.rawPower.decode(yield*base.evaluate());assert.equal(value.n*32n,value.d*29n);
    result=yield*power.call(0o200720000000n,exponent);
    const d=normalizedFloatDyadic(result);return f.rawPower.encode({n:d.sign*d.significand,d:1n<<(-d.exponent)});
  };
  f.damage.draws.push('0','.3125');finish(f.weapon.run('phadam',args));
  assert.equal(result,0o177472200253n);
  assert.deepEqual([f.hit.ihita,target.damage,target.energy,f.low.read('tpoint',K.KPEDAM)],[491n,491n,49508n,491n]);
});
