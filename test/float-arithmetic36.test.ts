import test from 'node:test';
import assert from 'node:assert/strict';
import { roundedFloat36,floatInteger36,fixFloat36,nearestDecimalFloat36 } from '../src/compat/float-arithmetic36.ts';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { bindRoundedNumericRuntime } from './fixtures/rounded-numeric-runtime.ts';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { bindSharedSessionRandom } from './fixtures/shared-session-random.ts';
import { ranFractionWord } from '../src/compat/ran-float36.ts';
import { constants as K } from '../src/generated/source-data.ts';
const clear={trap1:false,overflow:false,floatingOverflow:false,floatingUnderflow:false,noDivide:false};
for(const [op,a,b,w] of [
  ['add',0o201400000000n,0o201400000000n,0o202400000000n],
  ['add',0o201400000000n,0o146400000000n,0o201400000001n],
  ['add',-0o201400000000n,-0o146400000000n,-0o201400000001n],
  ['add',0o201400000000n,0o145400000000n,0o201400000000n],
  ['add',0o377400000000n,-0o000400000000n,0o377400000000n],
  ['sub',0o201400000001n,0o201400000000n,0o147400000000n],
  ['sub',0o201400000000n,0o146400000000n,0o200777777777n],
  ['sub',-0o201400000000n,-0o201400000000n,0n],
  ['div',0o201400000000n,0o202600000000n,0o177525252525n],
  ['div',-0o201400000000n,0o202600000000n,-0o177525252525n],
  ['div',0n,0o201400000000n,0n],
] as const)test(`Rounded ${op} literal word vector ${a}/${b}`,()=>assert.deepEqual(roundedFloat36(op,a,b),{word:w,...clear}));
test('FDVR zero divisor preserves destination and reports the no-divide condition',()=>{
  assert.deepEqual(roundedFloat36('div',0o201600000000n,0n),{word:0o201600000000n,trap1:true,overflow:true,floatingOverflow:true,floatingUnderflow:false,noDivide:true});
});
test('FADR overflow and FDVR underflow retain wrapped destination words',()=>{
  assert.equal(roundedFloat36('add',0o377400000000n,0o377400000000n).word,0o000400000000n);
  const tiny=roundedFloat36('div',0o000400000000n,0o202400000000n);assert.equal(tiny.word,0o377400000000n);assert.equal(tiny.floatingUnderflow,true);
});
for(const [s,word] of [['0.9',0o200714631463n],['0.02',0o173507534122n],['.001',0o167406111565n],['1e-3',0o167406111565n],['1.000000007450580596923828125',0o201400000001n],['-1.000000007450580596923828125',-0o201400000001n]] as const)test(`Explicit nearest decimal literal policy ${s}`,()=>assert.deepEqual(nearestDecimalFloat36(s),{word,...clear}));
test('FLTR preserves small integers and rounds large signed integer midpoints away',()=>{
  for(const n of [-1000n,-1n,0n,1n,1000n])assert.equal(fixFloat36(floatInteger36(n),77n).word,n);
  for(const sign of [-1n,1n])assert.equal(floatInteger36(sign*((1n<<27n)+1n)),sign*0o234400000001n);
});
test('FIX truncates negative fractions toward zero and rejects exponent 36 before storing',()=>{
  for(const [s,n] of [['-1.75',-1n],['-0.75',0n],['1.75',1n]] as const)assert.equal(fixFloat36(nearestDecimalFloat36(s).word,77n).word,n);
  assert.deepEqual(fixFloat36(0o244400000000n,77n),{word:77n,...clear,trap1:true,overflow:true});
});
test('PHADAM runs its full floating expressions and PWR with physical 36-bit words',()=>{
  const f=basePhaserRuntimeFixture(),native=bindRoundedNumericRuntime(f),args={nplc:13940n,j:13941n,id:13942n,phit:13943n,ship:13944n};
  [2n,6n,2n,200n,-1n].forEach((v,i)=>f.m.write(13940n+BigInt(i),v));
  const target=f.views.high.players[6].ship;
  Object.assign(target,{v:12,h:20,energy:50000n,damage:0n,shieldStrength:1000n,shieldCondition:-1n});f.high.write('alive',-1n,6);f.views.high.board.setdsp(12,20,206);
  const draws=[native.literal('0'),native.literal('.5')];f.weapon.random.ran=function*(){assert.ok(draws.length);return draws.shift()!;};
  finish(f.weapon.run('phadam',args));
  assert.deepEqual([f.hit.ihita,target.damage,target.energy,f.low.read('tpoint',K.KPEDAM)],[13249n,13249n,36750n,13249n]);
  assert.equal(f.m.read(f.weapon.locals.hita),0o216636031463n);assert.equal(draws.length,0);
});
test('Main PHASERS uses shared raw RAN, physical floats and rounded PWR through copied services',()=>{
  const f=mainCommandFixture('PHASERS 50 10 21');bindRoundedNumericRuntime(f);
  const random=bindSharedSessionRandom(f,function*(raw,scale){assert.equal(scale,0o200n);return ranFractionWord(raw);});finish(random.setran(1n));
  f.high.write('numply',10n);f.high.write('slwest',2n);f.high.write('shpcon',-1n,1,K.KSHCON);f.low.write('phbank',0n,1);f.low.write('phbank',0n,2);f.low.write('klflg',0n);
  f.low.write('player',-1n);f.high.write('alive',-1n,6);Object.assign(f.views.high.players[6].ship,{v:10,h:21,energy:50000n,damage:0n,shieldStrength:1000n,shieldCondition:-1n});f.views.high.board.setdsp(10,21,206);
  f.run();assert.ok(f.high.read('shpcon',6,K.KSDAM)>0n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),49500n);
  assert.equal(f.damage.draws.length,0);assert.ok(f.file.read('seed')!==1n);assert.equal(f.high.read('hitflg',6),1n);
});
test('Rounded compiler service preserves source evaluation and resolves assignment address last',()=>{
  const f=basePhaserRuntimeFixture(),{numeric}=bindRoundedNumericRuntime(f),events:string[]=[];
  const left={type:'integer' as const,evaluate:function*(){events.push('left');return 3n;}};
  const right={type:'real' as const,evaluate:function*(){events.push('right');return floatInteger36(2n);}};
  const sum={type:'real' as const,evaluate:()=>numeric.binary('add',left,right)};
  finish(numeric.assign(()=>{events.push('address');return 13940n;},'integer',sum));
  assert.deepEqual(events,['left','right','address']);assert.equal(f.m.read(13940n),5n);
});
test('Mixed comparison rounds the integer operand to single precision before comparing',()=>{
  const f=basePhaserRuntimeFixture(),{numeric}=bindRoundedNumericRuntime(f);
  const a={type:'integer' as const,evaluate:function*(){return (1n<<27n)+1n;}};
  const b={type:'real' as const,evaluate:function*(){return floatInteger36((1n<<27n)+2n);}};
  assert.equal(finish(numeric.compare('eq',a,b)),true);
});
test('FIX overflow transfer preserves destination and prevents its address evaluation',()=>{
  const f=basePhaserRuntimeFixture(),{numeric}=bindRoundedNumericRuntime(f);f.m.write(13940n,77n);let addressed=false;
  assert.throws(()=>finish(numeric.assign(()=>{addressed=true;return 13940n;},'integer',{type:'real',evaluate:function*(){return 0o244400000000n;}})),/FIX overflow/);
  assert.equal(f.m.read(13940n),77n);assert.equal(addressed,false);
});
