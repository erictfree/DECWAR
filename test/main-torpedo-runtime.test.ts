import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
function fixture(line='TORPEDO 1 10 21'){const f=mainCommandFixture(line),b=f.main.torpedo;
  for(let v=1;v<=K.KGALV;v++)for(let h=1;h<=K.KGALH;h++)f.views.high.board.setdsp(v,h,0);
  f.high.write('numply',10n);f.high.write('slwest',2n);f.high.write('shpcon',10n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);f.high.write('shpcon',-1n,1,K.KSHCON);f.high.write('shpcon',10n,1,K.KNTORP);f.high.write('shpdam',0n,1,K.KDTORP);f.high.write('shpdam',0n,1,K.KDCOMP);f.high.write('docked',0n,1);f.low.write('tobank',0n);f.low.write('klflg',0n);f.views.high.board.setdsp(10,20,101);f.high.write('plnlok',0n);f.clock.splice(0,f.clock.length,1000n,1100n);f.damage.draws.push('.5','.5');return {...f,b};}
test('Main TORPEDO miss consumes one round and sets burst recharge after actual CHECK',()=>{
  const f=fixture();f.run();assert.equal(f.high.read('shpcon',1,K.KNTORP),9n);assert.equal(f.low.read('tobank'),4100n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.deepEqual(f.b.hits.map(h=>h.iwhat),[4n]);assert.equal(f.b.torps.read('torpl',1,1),10n);assert.equal(f.b.torps.read('torpl',1,2),21n);
});
test('Main TORPEDO three-shot burst repeats last target and accumulates recharge',()=>{
  const f=fixture('TORPEDO 3 10 21');f.damage.draws.push('.5','.5','.5','.5');f.b.io.iran=function*(){return 1n;};f.run();assert.equal(f.high.read('shpcon',1,K.KNTORP),7n);assert.equal(f.low.read('tobank'),10100n);assert.equal(f.b.hits.length,3);assert.equal(f.b.torps.read('torpl',3,2),21n);assert.equal(f.m.read(f.b.locals.id),4n);
});
test('Main TORPEDO docked firing preserves ammunition',()=>{
  const f=fixture();f.high.write('docked',-1n,1);f.run();assert.equal(f.high.read('shpcon',1,K.KNTORP),10n);
});
for(const [kind,key] of [['critical','torp00'],['ammo','torp07'],['far','phacn1']] as const)test(`Main TORPEDO rejects ${kind}`,()=>{
  const f=fixture(kind==='far'?'TORPEDO 1 10 50':'TORPEDO 1 10 21');if(kind==='critical')f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDTORP);if(kind==='ammo')f.high.write('shpcon',0n,1,K.KNTORP);f.run();assert.ok(f.reports[0].includes(M[key].text));assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.low.read('tobank'),0n);
});
test('Main TORPEDO own-coordinate error returns normally and sets bank before firing',()=>{
  const f=fixture('TORPEDO 1 10 20');f.run();assert.deepEqual(f.reports,[M.error2.text+'\r\n']);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.high.read('shpcon',1,K.KNTORP),10n);assert.equal(f.low.read('tobank'),1000n);
});
for(const [object,type] of [[1000,5n],[102,15n],[701,15n],[900,6n]] as const)test(`Main TORPEDO collision ${object} publishes source notification ${type}`,()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,object);const draws=[1n,100n];f.b.io.iran=function*(){return draws.shift()!;};f.run();assert.equal(f.b.hits[0].iwhat,type);assert.equal(f.views.high.board.disp(10,21),object);
});
test('Main TORPEDO misfire completes current shot then stops burst and adds tube damage delay',()=>{
  const f=fixture('TORPEDO 3 10 21');f.damage.draws.push('.5');const draws=[100n,5n,100n];f.b.io.iran=function*(){return draws.shift()!;};f.run();assert.equal(f.high.read('shpcon',1,K.KNTORP),9n);assert.equal(f.high.read('shpdam',1,K.KDTORP),600n);assert.equal(f.low.read('tobank'),4700n);assert.equal(f.b.hits.length,1);assert.equal(f.m.read(f.b.locals.id),2n);assert.ok(f.reports[0].includes(M.torp06.text));
});
test('Main TORPEDO planet lock failure returns alternate after firing but before bank recharge',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,801);f.b.io.lockPlanet=function*(){f.low.write('lkfail',-1n);};f.run();assert.equal(f.high.read('shpcon',1,K.KNTORP),9n);assert.equal(f.low.read('tobank'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.deepEqual(f.reports,['Sorry, Captain, but the torpedo tubes are empty!\r\n']);
});
test('Main TORPEDO enemy ship hit executes TORDAM and releases its existing tractor beam',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,206);f.high.write('alive',-1n,6);for(const [col,v] of [[K.KVPOS,10n],[K.KHPOS,21n],[K.KSNRGY,50000n],[K.KSDAM,0n],[K.KSHCON,-1n],[K.KSSHPC,1000n]] as const)f.high.write('shpcon',v,6,col);f.high.write('trstat',7n,6);f.high.write('trstat',6n,7);f.damage.draws.push('0','0','.5');f.b.io.iran=function*(){return 1n;};f.run();assert.ok(f.high.read('shpcon',6,K.KSDAM)>0n);assert.equal(f.high.read('trstat',6),0n);assert.equal(f.high.read('trstat',7),0n);assert.equal(f.b.hits[0].dispto,206n);assert.ok(f.main.romulan.torpedoes.events.includes('tordam'));
});
test('Main TORPEDO destroys planet through actual removal and reindexes remaining planets',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,801);f.high.write('nplnet',2n);f.high.write('numcap',1n,2);f.high.write('nbase',1n,2);for(const [i,h] of [[1,21],[2,60]]){f.high.write('locpln',10n,i,1);f.high.write('locpln',BigInt(h),i,2);f.high.write('locpln',0n,i,3);}f.views.high.board.setdsp(10,60,602);const draws=[1n,1n,4n];f.b.io.iran=function*(){return draws.shift()!;};f.run();assert.equal(f.views.high.board.disp(10,21),0);assert.equal(f.views.high.board.disp(10,60),601);assert.equal(f.high.read('nplnet'),1n);assert.equal(f.high.read('plnlok'),0n);assert.equal(f.b.hits[0].klflg,2n);
});
test('Main TORPEDO star reaction executes actual supernova and nearby ship damage',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,900);f.damage.draws.push(...Array<string>(10).fill('0'));f.b.io.iran=function*(){return 1n;};f.run();assert.equal(f.views.high.board.disp(10,21),0);assert.ok(f.main.romulan.torpedoes.events.includes('snova'));assert.ok(f.high.read('shpcon',1,K.KSDAM)>0n);
});
test('Main TORPEDO Romulan hit uses TOROM and publishes current Romulan location',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,500);f.high.write('rom',-1n);f.high.write('erom',1000n);f.high.write('locr',10n,1);f.high.write('locr',21n,2);f.b.io.iran=function*(){return 1n;};f.run();assert.ok(f.b.events.includes('torom'));assert.equal(f.b.hits[0].dispto,500n);assert.ok(f.high.read('erom')<1000n);assert.equal(f.b.hits[0].shstto,f.high.read('erom'));
});
test('Main TORPEDO base distress precedes actual damage',()=>{
  const f=fixture();f.views.high.board.setdsp(10,21,401);f.high.write('base',10n,1,1,2);f.high.write('base',21n,1,2,2);f.high.write('base',1000n,1,3,2);f.damage.draws.push('0','0','.5');f.b.io.iran=function*(){return 1n;};f.run();assert.equal(f.b.hits[0].iwhat,9n);assert.equal(f.b.hits[1].dispto,401n);assert.ok(f.high.read('base',1,3,2)<1000n);
});
test('Main TORPEDO notification failure retains fired ammunition without recharge',()=>{
  const f=fixture();f.b.io.makhit=function*(){throw new Error('torpedo notification failure');};assert.throws(f.run,/torpedo notification failure/);assert.equal(f.high.read('shpcon',1,K.KNTORP),9n);assert.equal(f.low.read('tobank'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
