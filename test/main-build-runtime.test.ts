import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
function fixture(line='BUILD 10 21',commands=1){const f=mainCommandFixture(line,K.SHORT,commands),b=f.main.build;
  f.high.write('slwest',2n);f.high.write('tim0',0n);f.clock.splice(0,f.clock.length,1000n,1100n);f.high.write('nplnet',2n);f.high.write('numcap',2n,1);f.high.write('nbase',0n,1);f.high.write('shpcon',10n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);
  for(const [i,h] of [[1,21],[2,60]]){f.high.write('locpln',10n,i,1);f.high.write('locpln',BigInt(h),i,2);f.high.write('locpln',0n,i,3);f.high.write('locpln',3n,i,4);f.views.high.board.setdsp(10,h,700+i);}
  for(let i=1;i<=K.KNBASE;i++)for(const side of [1,2])f.high.write('base',0n,i,3,side);f.high.write('plnlok',0n);f.low.write('tpoint',0n,K.KPBBAS);f.high.write('score',0n,K.KPBBAS,1);f.high.write('tmscor',0n,1,K.KPBBAS);return {...f,b};}
test('Main BUILD fortifies friendly planet, scores and charges source command time',()=>{
  const f=fixture();f.run();assert.equal(f.high.read('locpln',1,3),1n);assert.equal(f.high.read('score',K.KPBBAS,1),500n);assert.equal(f.low.read('ptime'),5900n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.deepEqual(f.reports,['1'+M.build3.text+'\r\n']);
});
test('Main BUILD fifth stage removes planet and creates shared starbase with discovery flags',()=>{
  const f=fixture();f.high.write('locpln',4n,1,3);f.run();assert.equal(f.high.read('nplnet'),1n);assert.equal(f.high.read('nbase',1),1n);assert.equal(f.high.read('numcap',1),1n);assert.equal(f.high.read('base',1,1,1),10n);assert.equal(f.high.read('base',1,2,1),21n);assert.equal(f.high.read('base',1,3,1),1000n);assert.equal(f.high.read('base',1,4,1),3n);assert.equal(f.views.high.board.disp(10,21),301);assert.equal(f.views.high.board.disp(10,60),701);assert.equal(f.high.read('score',K.KPBBAS,1),5000n);assert.equal(f.high.read('plnlok'),0n);assert.deepEqual(f.b.events,['locate','lock','plnrmv','unlock','setdsp','build1','build2']);
});
test('Main BUILD fifth stage refuses full base count before increment or score',()=>{
  const f=fixture();f.high.write('locpln',4n,1,3);f.high.write('nbase',BigInt(K.KNBASE),1);f.run();assert.equal(f.high.read('locpln',1,3),4n);assert.equal(f.low.read('tpoint',K.KPBBAS),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.ok(f.reports[0].includes(M.build4.text));
});
test('Main BUILD lock failure keeps fifth build and its initial score',()=>{
  const f=fixture();f.high.write('locpln',4n,1,3);f.b.io.lock=function*(){f.low.write('lkfail',-1n);};f.run();assert.equal(f.high.read('locpln',1,3),5n);assert.equal(f.low.read('tpoint',K.KPBBAS),2500n);assert.equal(f.high.read('nbase',1),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.ok(f.reports[0].includes('busy with repairs at the moment.'));
});
test('Main BUILD full physical slots rolls back fifth build but retains earned score',()=>{
  const f=fixture();f.high.write('locpln',4n,1,3);for(let i=1;i<=K.KNBASE;i++)f.high.write('base',1000n,i,3,1);f.run();assert.equal(f.high.read('locpln',1,3),4n);assert.equal(f.low.read('tpoint',K.KPBBAS),2500n);assert.equal(f.high.read('plnlok'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
for(const [kind,key] of [['neutral','build7'],['empty','noplnt'],['far','captu5']] as const)test(`Main BUILD rejects ${kind} sector`,()=>{
  const f=fixture(kind==='far'?'BUILD 10 60':'BUILD 10 21');if(kind==='neutral')f.views.high.board.setdsp(10,21,601);if(kind==='empty')f.views.high.board.setdsp(10,21,0);f.run();assert.ok(f.reports[0].includes(M[key].text));assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.low.read('tpoint',K.KPBBAS),0n);
});
test('Main BUILD output failure after increment precedes score and turn',()=>{
  const f=fixture();f.b.io.out=function*(){throw new Error('build output failure');};assert.throws(f.run,/build output failure/);assert.equal(f.high.read('locpln',1,3),1n);assert.equal(f.low.read('tpoint',K.KPBBAS),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
test('Main BUILD creates a base that a following DOCK can use in the same session',()=>{
  const f=fixture('BUILD 10 21/DOCK',2);f.high.write('locpln',4n,1,3);f.high.write('numply',10n);f.high.write('shpcon',20000n,1,K.KSNRGY);f.clock.push(1200n,1300n);f.run();assert.deepEqual(f.main.calls.map(c=>c.routine),['build','dock']);assert.equal(f.high.read('docked',1),-1n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),30000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),3n);
});
test('Main BUILD late output failure leaves completed base and released lock',()=>{
  const f=fixture(),out=f.b.io.out;f.high.write('locpln',4n,1,3);f.b.io.out=function*(key,n){if(key==='build1')throw new Error('completion output failure');yield*out(key,n);};assert.throws(f.run,/completion output failure/);assert.equal(f.views.high.board.disp(10,21),301);assert.equal(f.high.read('nplnet'),1n);assert.equal(f.high.read('plnlok'),0n);assert.equal(f.low.read('tpoint',K.KPBBAS),5000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
