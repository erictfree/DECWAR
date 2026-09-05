import test from 'node:test';
import assert from 'node:assert/strict';
import { romulanDamageStatements } from '../src/game/romulan-damage-statements.ts';
import type { RomulanDamageEntry } from '../src/game/romulan-damage-statements.ts';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { planetAttackRuntimeFixture } from './fixtures/planet-attack-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { MAX_INTEGER } from '../src/compat/word36.ts';
function fixture(){
  const f=basePhaserRuntimeFixture(),args={phit:13900n,id:13901n};f.m.write(args.phit,100n);f.m.write(args.id,2n);f.world.rom=-1n;f.world.locr.v=12;f.world.locr.h=20;f.views.high.board.setdsp(12,20,500);
  return {...f,args,run:(entry:RomulanDamageEntry='pharom')=>romulanDamageStatements(entry,f.high,f.low,args,f.romulanIO)};
}
test('PHAROM uses actual arguments, distinct integer truncations and shared hit/energy words',()=>{
  const f=fixture();f.damage.integers.push(99n);f.m.write(f.args.phit,17n);f.m.write(f.args.id,3n);finish(f.run());assert.equal(f.low.read('iwhat'),1n);assert.equal(f.low.read('ihita'),112n);assert.equal(f.world.erom,990n);assert.equal(f.world.rom,-1n);assert.equal(f.views.high.board.disp(12,20),500);assert.deepEqual(f.damage.events,['iran:100']);
});
for(const [draw,hit,energy] of [[1n,1n,1001n],[9n,9n,1001n],[10n,10n,1000n],[2000n,2000n,801n],[4000n,2000n,801n],[-10n,-10n,1002n]] as const)test(`TOROM IRAN result ${draw} preserves upper-only cap and energy truncation`,()=>{
  const f=fixture();f.args.phit=250000n;f.args.id=250001n;f.damage.integers.push(draw);finish(f.run('torom'));assert.equal(f.low.read('iwhat'),2n);assert.equal(f.low.read('ihita'),hit);assert.equal(f.world.erom,energy);assert.deepEqual(f.damage.events,['iran:4000']);
});
test('DEADRO ignores even unmapped arguments and preserves previous IWHAT/IHITA/EROM',()=>{
  const f=fixture();f.args.phit=250000n;f.args.id=250001n;f.low.write('iwhat',7n);f.low.write('ihita',88n);f.low.write('shcnfr',77n);finish(f.run('deadro'));assert.equal(f.low.read('iwhat'),7n);assert.equal(f.low.read('ihita'),88n);assert.equal(f.world.erom,1001n);assert.equal(f.low.read('shcnfr'),77n);assert.equal(f.low.read('klflg'),2n);assert.equal(f.world.rom,0n);assert.equal(f.views.high.board.disp(12,20),0);assert.deepEqual(f.damage.events,[]);
});
for(const entry of ['pharom','torom'] as const)test(`${entry} zero remaining energy takes the shared death path`,()=>{
  const f=fixture();f.world.erom=100n;f.damage.integers.push(entry==='pharom'?100n:1000n);finish(f.run(entry));assert.equal(f.world.erom,0n);assert.equal(f.world.rom,0n);assert.equal(f.low.read('klflg'),2n);assert.equal(f.views.high.board.disp(12,20),0);
});
test('PHAROM does not guard an already-false ROM or retain a minimum positive energy',()=>{
  const f=fixture();f.world.rom=0n;f.world.erom=-9n;f.damage.integers.push(100n);finish(f.run());assert.equal(f.world.erom,-109n);assert.equal(f.low.read('ihita'),1000n);assert.equal(f.views.high.board.disp(12,20),0);
});
test('Surviving PHAROM retains stale KLFLG without clearing the board',()=>{
  const f=fixture();f.low.write('klflg',2n);f.damage.integers.push(100n);finish(f.run());assert.equal(f.low.read('klflg'),2n);assert.equal(f.world.rom,-1n);assert.equal(f.views.high.board.disp(12,20),500);
});
for(const [phit,id,hit,energy] of [[0n,2n,0n,1001n],[-100n,2n,-1000n,1101n],[100n,-2n,-1000n,1101n]] as const)test(`PHAROM signed arguments ${phit},${id} retain source arithmetic`,()=>{
  const f=fixture();f.m.write(f.args.phit,phit);f.m.write(f.args.id,id);f.damage.integers.push(100n);finish(f.run());assert.equal(f.low.read('ihita'),hit);assert.equal(f.world.erom,energy);
});
test('PHAROM multiply wraps at 36 bits before the first division under the fixture',()=>{
  const f=fixture();f.m.write(f.args.phit,17179869184n);f.m.write(f.args.id,1n);f.world.erom=MAX_INTEGER;f.damage.integers.push(1n);finish(f.run());assert.equal(f.low.read('ihita'),1717986918n);assert.equal(f.world.erom,34187939676n);
});
test('PHAROM ID zero fails after IWHAT and the draw, retaining prior hit and energy',()=>{
  const f=fixture();f.m.write(f.args.id,0n);f.low.write('ihita',77n);f.damage.integers.push(100n);assert.throws(()=>finish(f.run()),/zero/i);assert.equal(f.low.read('iwhat'),1n);assert.equal(f.low.read('ihita'),77n);assert.equal(f.world.erom,1001n);assert.equal(f.damage.integers.length,0);assert.equal(f.views.high.board.disp(12,20),500);
});
test('PHAROM PHIT alias sees the IWHAT store before expression evaluation',()=>{
  const f=fixture();f.args.phit=f.low.address('iwhat');f.low.write('iwhat',99n);f.damage.integers.push(100n);finish(f.run());assert.equal(f.low.read('ihita'),10n);assert.equal(f.world.erom,1000n);
});
test('PHAROM PHIT alias to IHITA reads the old hit before assigning its result',()=>{
  const f=fixture();f.args.phit=f.low.address('ihita');f.low.write('ihita',17n);f.damage.integers.push(100n);finish(f.run());assert.equal(f.low.read('ihita'),170n);assert.equal(f.world.erom,984n);
});
test('PHAROM reads current PHIT after the random call resumes',()=>{
  const f=fixture(),iran=f.romulanIO.iran;f.damage.integers.push(100n);f.romulanIO.iran=function*(n){const d=yield*iran(n);yield 'random';return d;};const g=f.run();assert.equal(g.next().value,'random');assert.equal(f.low.read('iwhat'),1n);f.m.write(f.args.phit,200n);finish(g);assert.equal(f.low.read('ihita'),2000n);
});
for(const rightFirst of [false,true])test(`PHAROM compiler denominator order is explicit: right first ${rightFirst}`,()=>{
  const f=fixture(),iran=f.romulanIO.iran,integer=f.romulanIO.integer;f.m.write(f.args.id,1n);f.damage.integers.push(100n);f.romulanIO.iran=function*(n){const d=yield*iran(n);yield 'random';return d;};
  if(rightFirst)f.romulanIO.integer=function*(op,l,r){if(op==='div'){const right=yield*r();return yield*integer(op,l,function*(){return right;});}return yield*integer(op,l,r);};
  const g=f.run();assert.equal(g.next().value,'random');f.m.write(f.args.id,2n);finish(g);assert.equal(f.low.read('ihita'),rightFirst?2000n:1000n);
});
for(const rightFirst of [false,true])test(`PHAROM energy subtraction observes compiler operand order: right first ${rightFirst}`,()=>{
  const f=fixture(),integer=f.romulanIO.integer;f.damage.integers.push(100n);let divisions=0;
  f.romulanIO.integer=function*(op,l,r){if(op==='sub'&&rightFirst){const right=yield*r();return yield*integer(op,l,function*(){return right;});}const n=yield*integer(op,l,r);if(op==='div'&&++divisions===2)yield 'energy';return n;};
  const g=f.run();assert.equal(g.next().value,'energy');f.world.erom=500n;finish(g);assert.equal(f.world.erom,rightFirst?400n:901n);
});
test('PHAROM second assignment rereads shared IHITA after its first assignment resumes',()=>{
  const f=fixture(),assign=f.romulanIO.assign;f.damage.integers.push(100n);let first=true;f.romulanIO.assign=function*(d,v){yield*assign(d,v);if(first){first=false;yield 'hit';}};const g=f.run();assert.equal(g.next().value,'hit');f.low.write('ihita',10n);finish(g);assert.equal(f.world.erom,1000n);
});
test('PHAROM death predicate reads current EROM after assignment returns',()=>{
  const f=fixture(),assign=f.romulanIO.assign;f.damage.integers.push(100n);f.romulanIO.assign=function*(d,v){yield*assign(d,v);if(d()===f.high.address('erom'))f.world.erom=0n;};finish(f.run());assert.equal(f.world.rom,0n);assert.equal(f.views.high.board.disp(12,20),0);
});
test('DEADRO commits KLFLG and compiler false word before entering SETDSP',()=>{
  const f=fixture(),set=f.romulanIO.setdsp;f.romulanIO.falseWord=7n;f.romulanIO.setdsp=function*(v,h,z){assert.equal(f.low.read('klflg'),2n);assert.equal(f.world.rom,7n);assert.deepEqual([v,h,z],[f.high.address('locr',K.KVPOS),f.high.address('locr',K.KHPOS),0]);yield 'clear';yield*set(v,h,z);};const g=f.run('deadro');assert.equal(g.next().value,'clear');assert.equal(f.views.high.board.disp(12,20),500);finish(g);assert.equal(f.views.high.board.disp(12,20),0);
});
test('DEADRO raw board clear reads current coordinates after suspension',()=>{
  const f=fixture(),set=f.romulanIO.setdsp;f.views.high.board.setdsp(13,21,500);f.romulanIO.setdsp=function*(...a){yield 'clear';yield*set(...a);};const g=f.run('deadro');assert.equal(g.next().value,'clear');f.world.locr.v=13;f.world.locr.h=21;finish(g);assert.equal(f.views.high.board.disp(12,20),500);assert.equal(f.views.high.board.disp(13,21),0);
});
test('DEADRO raw SETDSP failure retains death flags and existing board data',()=>{
  const f=fixture();f.rawBoard.io.dpb=function*(){throw new Error('CPU deposit fault');};assert.throws(()=>finish(f.run('deadro')),/deposit fault/);assert.equal(f.world.rom,0n);assert.equal(f.low.read('klflg'),2n);assert.equal(f.views.high.board.disp(12,20),500);assert.equal(f.m.read(f.rawBoard.s.oldobj),500n);
});
test('TOROM random failure retains IWHAT and prior hit/energy',()=>{
  const f=fixture();f.low.write('ihita',77n);f.romulanIO.iran=function*(){throw new Error('random fault');};assert.throws(()=>finish(f.run('torom')),/random fault/);assert.equal(f.low.read('iwhat'),2n);assert.equal(f.low.read('ihita'),77n);assert.equal(f.world.erom,1001n);
});
test('BASPHA now waits for Romulan raw board clearing before metadata, recipients and score',()=>{
  const f=basePhaserRuntimeFixture();f.high.write('alive',0n,1);f.world.rom=-1n;f.world.erom=1n;f.world.locr.v=10;f.world.locr.h=20;f.views.high.board.setdsp(10,20,500);f.damage.integers.push(100n);const dpb=f.rawBoard.io.dpb;f.rawBoard.io.dpb=function*(){yield 'deposit';yield*dpb();};
  const g=f.run();assert.equal(g.next().value,'deposit');assert.equal(f.world.rom,0n);assert.equal(f.high.read('tmscor',2,K.KPRKIL),0n);assert.equal(f.queued.length,0);assert.ok(!f.events.some(e=>e.startsWith('pridis:')));finish(g);assert.equal(f.high.read('tmscor',2,K.KPRKIL),6000n);assert.equal(f.queued.length,1);
});
test('PLNATK retains pre-damage recipients while awaiting Romulan raw board clearing',()=>{
  const f=planetAttackRuntimeFixture();f.high.write('alive',0n,1);f.world.rom=-1n;f.world.erom=1n;f.world.locr.v=10;f.world.locr.h=20;f.views.high.board.setdsp(10,20,500);f.damage.integers.push(100n);const dpb=f.rawBoard.io.dpb;f.rawBoard.io.dpb=function*(){yield 'deposit';yield*dpb();};
  const g=f.run();assert.equal(g.next().value,'deposit');assert.equal(f.events.filter(e=>e.startsWith('pridis:')).length,2);assert.equal(f.high.read('tmscor',2,K.KPRKIL),0n);assert.equal(f.queued.length,0);finish(g);assert.equal(f.high.read('tmscor',2,K.KPRKIL),7000n);assert.equal(f.queued.length,1);
});
