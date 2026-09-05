import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
function fixture(line='CAPTURE 10 21',commands=1){const f=mainCommandFixture(line,K.SHORT,commands),b=f.main.capture;
  f.high.write('nplnet',2n);f.high.write('numcap',0n,1);f.high.write('numcap',1n,2);f.high.write('numply',10n);f.high.write('nbase',1n,2);
  f.high.write('shpcon',10n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);f.high.write('shpcon',-1n,1,K.KSHCON);f.high.write('plnlok',0n);f.low.write('klflg',0n);f.low.write('tpoint',0n,K.KPPCAP);f.high.write('score',0n,K.KPPCAP,1);
  for(const [i,h] of [[1,21],[2,60]]){f.high.write('locpln',10n,i,1);f.high.write('locpln',BigInt(h),i,2);f.high.write('locpln',0n,i,3);f.views.high.board.setdsp(10,h,600+i);}
  f.clock.splice(0,f.clock.length,1000n,1100n);f.damage.draws.push('0','.5');return {...f,b};}
test('Main CAPTURE changes neutral planet ownership before actual defensive fire',()=>{
  const f=fixture(),fire=f.b.io.phadam;f.b.io.phadam=function*(...a){assert.equal(f.views.high.board.disp(10,21),701);assert.equal(f.high.read('plnlok'),0n);yield*fire(...a);};f.run();assert.equal(f.high.read('numcap',1),1n);assert.equal(f.high.read('locpln',1,3),0n);assert.equal(f.high.read('score',K.KPPCAP,1),1000n);assert.equal(f.low.read('ptime'),4900n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.b.hits[0].dispfr,601n);assert.equal(f.b.hits[0].dispto,101n);assert.ok(f.high.read('shpcon',1,K.KSDAM)>0n);assert.equal(f.damage.draws.length,0);
});
test('Main CAPTURE fortified enemy planet charges energy, delay and enemy damage score',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,801);f.high.write('locpln',2n,1,3);f.high.write('tmscor',0n,2,K.KPEDAM);f.run();assert.equal(f.high.read('numcap',2),0n);assert.equal(f.high.read('numcap',1),1n);assert.equal(f.m.read(f.b.locals.phit),110n);assert.equal(f.low.read('ptime'),6900n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),f.b.hits[0].ihita);assert.equal(f.b.hits[0].shstfr,2n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),49000n-f.b.hits[0].ihita);
});
test('Main CAPTURE lock failure leaves ownership and scores unchanged',()=>{
  const f=fixture();f.b.io.lock=function*(){f.low.write('lkfail',-1n);};f.run();assert.equal(f.views.high.board.disp(10,21),601);assert.equal(f.high.read('numcap',1),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.deepEqual(f.reports,["The planet's government refuses to surrender.\r\n"]);
});
for(const [object,key] of [[701,'captu7'],[0,'noplnt'],[301,'nosur1'],[401,'nosur2'],[500,'nosur3'],[900,'nosur4']] as const)test(`Main CAPTURE rejects object ${object} with original message`,()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,object);f.run();assert.deepEqual(f.reports,[M[key].text+'\r\n']);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.b.hits.length,0);
});
test('Main CAPTURE death retains captured planet, capture score and normal turn return',()=>{
  const f=fixture();f.high.write('shpcon',1000n,1,K.KSNRGY);f.run();assert.equal(f.views.high.board.disp(10,21),701);assert.equal(f.high.read('alive',1),0n);assert.equal(f.high.read('score',K.KPPCAP,1),1000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.ok(f.reports[0].includes(M.captu1.text));assert.ok(f.reports[0].includes(M.captu4.text));
});
test('Main CAPTURE notification failure preserves ownership and damage but precedes capture score',()=>{
  const f=fixture();f.b.io.makhit=function*(){throw new Error('capture notification failure');};assert.throws(f.run,/capture notification failure/);assert.equal(f.views.high.board.disp(10,21),701);assert.ok(f.high.read('shpcon',1,K.KSDAM)>0n);assert.equal(f.low.read('tpoint',K.KPPCAP),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
test('Main CAPTURE followed by BUILD fortifies the newly acquired planet',()=>{
  const f=fixture('CAPTURE 10 21/BUILD 10 21',2);f.high.write('slwest',2n);f.clock.push(1200n,1300n);f.run();assert.deepEqual(f.main.calls.map(c=>c.routine),['captur','build']);assert.equal(f.views.high.board.disp(10,21),701);assert.equal(f.high.read('locpln',1,3),1n);assert.equal(f.high.read('shpcon',1,K.KNTURN),3n);
});
test('Main CAPTURE credits former enemy team for killing the capturing ship',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,801);f.high.write('tmscor',0n,2,K.KPEKIL);f.high.write('shpcon',1000n,1,K.KSNRGY);f.run();assert.equal(f.high.read('tmscor',2,K.KPEKIL),5000n);assert.equal(f.views.high.board.disp(10,21),701);assert.equal(f.views.high.board.disp(10,20),0);
});
