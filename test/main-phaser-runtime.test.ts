import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
function fixture(line='PHASERS 10 21'){const f=mainCommandFixture(line),b=f.main.phaser;
  f.high.write('numply',10n);f.high.write('slwest',2n);f.high.write('shpcon',10n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);f.high.write('shpcon',-1n,1,K.KSHCON);f.high.write('shpdam',0n,1,K.KDPHAS);f.low.write('phbank',0n,1);f.low.write('phbank',0n,2);f.low.write('klflg',0n);
  f.high.write('alive',-1n,6);f.high.write('shpcon',10n,6,K.KVPOS);f.high.write('shpcon',21n,6,K.KHPOS);f.high.write('shpcon',50000n,6,K.KSNRGY);f.high.write('shpcon',0n,6,K.KSDAM);f.high.write('shpcon',-1n,6,K.KSHCON);f.high.write('shpcon',1000n,6,K.KSSHPC);f.views.high.board.setdsp(10,21,206);
  f.clock.splice(0,f.clock.length,1000n,1100n);f.damage.draws.push('0','.5');return {...f,b};}
test('Main PHASERS fires actual PHADAM, charges energy, queues hit and recharges one bank',()=>{
  const f=fixture();f.run();assert.ok(f.high.read('shpcon',6,K.KSDAM)>0n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),48000n);assert.equal(f.low.read('phbank',1),5600n);assert.equal(f.low.read('phbank',2),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.b.hits[0].dispto,206n);assert.equal(f.b.hits[0].dispfr,101n);assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('hitflg',6),1n);
});
test('Main PHASERS selects earlier second bank and accepts minimum explicit power',()=>{
  const f=fixture('PHASERS 50 10 21');f.low.write('phbank',500n,1);f.low.write('phbank',100n,2);f.run();assert.equal(f.m.read(f.b.locals.bank),2n);assert.equal(f.m.read(f.b.locals.phit),50n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),49500n);assert.equal(f.low.read('phbank',2),5600n);
});
test('Main PHASERS charges shield control without lowering shields',()=>{
  const f=fixture();f.high.write('shpcon',1n,1,K.KSHCON);f.run();assert.equal(f.high.read('shpcon',1,K.KSNRGY),46000n);assert.equal(f.high.read('shpcon',1,K.KSHCON),1n);
});
for(const [kind,key] of [['critical','phacn0'],['empty','phacn7'],['ally','phacn9'],['self','error2'],['far','phacn1'],['size','phacn8']] as const)test(`Main PHASERS rejects ${kind} without charging a turn`,()=>{
  const f=fixture(kind==='self'?'PHASERS 10 20':kind==='far'?'PHASERS 10 50':kind==='size'?'PHASERS 49 10 21':'PHASERS 10 21');if(kind==='critical')f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDPHAS);if(kind==='empty')f.views.high.board.setdsp(10,21,0);if(kind==='ally')f.views.high.board.setdsp(10,21,102);if(kind==='ally')f.high.write('alive',-1n,2);if(kind==='far')f.views.high.board.setdsp(10,50,206);
  f.run();assert.deepEqual(f.reports,[M[key].text+'\r\n']);assert.equal(f.high.read('shpcon',1,K.KSNRGY),50000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.low.read('phbank',1),0n);
});
test('Main PHASERS overheating uses mixed REAL expression and delays recharge by device damage',()=>{
  const f=fixture('PHASERS 500 10 21'),draws=[100n,51n];f.damage.draws.push('0','.5');f.b.io.iran=function*(){return draws.shift()!;};f.run();assert.equal(f.high.read('shpdam',1,K.KDPHAS),2662n);assert.equal(f.low.read('phbank',1),8262n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),45000n);assert.ok(f.reports[0].includes(M.phacn4.text));
});
test('Main PHASERS planet hit changes fortifications and publishes planet metadata',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,801);f.high.write('locpln',3n,1,3);const draws=[1n,100n];f.b.io.iran=function*(){return draws.shift()!;};f.run();assert.equal(f.high.read('locpln',1,3),2n);assert.equal(f.b.hits[0].shstto,2n);assert.equal(f.b.hits[0].dispto,801n);assert.ok(!f.b.events.includes('phadam'));
});
test('Main PHASERS notification failure preserves damage before final firing charge and bank update',()=>{
  const f=fixture();f.b.io.makhit=function*(){throw new Error('phaser notification failure');};assert.throws(f.run,/phaser notification failure/);assert.ok(f.high.read('shpcon',6,K.KSDAM)>0n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),50000n);assert.equal(f.low.read('phbank',1),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
test('Main PHASERS intact base sends distress before the actual hit',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,401);f.high.write('base',10n,1,1,2);f.high.write('base',21n,1,2,2);f.high.write('base',1000n,1,3,2);f.run();assert.deepEqual(f.b.hits.map(h=>h.iwhat),[9n,1n]);assert.ok(f.high.read('base',1,3,2)<1000n);assert.equal(f.b.hits[0].dispto,401n);
});
test('Main PHASERS base destruction publishes hit then galaxy loss announcement',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,401);f.high.write('base',10n,1,1,2);f.high.write('base',21n,1,2,2);f.high.write('base',1n,1,3,2);f.high.write('nbase',1n,2);f.damage.draws.push('.5');f.run();assert.deepEqual(f.b.hits.map(h=>h.iwhat),[1n,10n]);assert.equal(f.views.high.board.disp(10,21),0);assert.equal(f.high.read('nbase',2),0n);
});
test('Main PHASERS Romulan target uses actual PHAROM and publishes current strength',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,500);f.high.write('rom',-1n);f.high.write('erom',1000n);f.high.write('locr',10n,1);f.high.write('locr',21n,2);f.run();assert.ok(f.b.events.includes('pharom'));assert.equal(f.b.hits[0].dispto,500n);assert.equal(f.b.hits[0].shstto,f.high.read('erom'));assert.ok(f.high.read('erom')<1000n);
});
