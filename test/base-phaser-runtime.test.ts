import test from 'node:test';
import assert from 'node:assert/strict';
import { basePhaserRuntimeFixture as fixture,finish } from './fixtures/base-phaser-runtime.ts';
import { turnStatements } from '../src/game/turn-statements.ts';
import type { TurnStatementServices } from '../src/game/turn-statements.ts';
import { rebuildBaseStatements } from '../src/game/base-rebuild-statements.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
function draws(f:ReturnType<typeof fixture>,count=1){f.damage.draws.push(...Array<string>(count*2).fill('0'));}
function ship(f:ReturnType<typeof fixture>,i:number,v=10,h=20){Object.assign(f.views.high.players[i].ship,{v,h,energy:50000n,damage:0n,shieldCondition:-1n});f.high.write('alive',-1n,i);f.views.high.board.setdsp(v,h,i<=5?100+i:200+i);}
test('BASPHA shared runtime composes raw board/distance, PHADAM/PWR and hit delivery',()=>{
  const f=fixture();ship(f,6,12,20);draws(f);finish(f.run());
  assert.deepEqual(f.calls,[[1n,1n,2n,100n,0n]]);assert.equal(f.high.read('shpcon',1,K.KSDAM),6480n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),43520n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),6480n);
  assert.equal(f.queued.length,1);assert.equal(f.queued[0].dispfr,401n);assert.equal(f.queued[0].dispto,101n);assert.equal(f.queued[0].shstfr,1000n);assert.equal(f.queued[0].shcnfr,1n);assert.equal(f.queued[0].dbits,33n);assert.equal(f.hit.dbits,0n);
  assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('hitflg',6),1n);assert.equal(f.low.read('tpoint',K.KPEDAM),0n);assert.equal(f.high.read('rsr',K.KPEDAM),0n);assert.equal(f.damage.draws.length,0);assert.equal(f.r.s,f.s.initialStackWord);
});
for(const team of [1n,2n])test(`BASPHA player team ${team} fires only opposing bases`,()=>{
  const f=fixture();f.low.write('team',team);f.base(1);ship(f,6,11,20);draws(f);finish(f.run());assert.equal(f.queued.length,1);assert.equal(f.queued[0].dispfr,team===1n?401n:301n);assert.equal(f.m.read(f.locals.i),4n-team);
});
test('BASPHA nonplayer selects both base teams and physical opposing player halves',()=>{
  const f=fixture();f.low.write('player',0n);f.base(1);ship(f,6,11,20);draws(f,2);finish(f.run());assert.deepEqual(f.queued.map(h=>[h.dispfr,h.dispto]),[[301n,206n],[401n,101n]]);assert.equal(f.m.read(f.locals.i),3n);
});
for(const mode of ['count','strength','dead','cloaked','sentinel','outside','edge'] as const)test(`BASPHA source eligibility gate: ${mode}`,()=>{
  const f=fixture();if(mode==='count')f.high.write('nbase',0n,2);if(mode==='strength')f.high.write('base',0n,1,3,2);if(mode==='dead')f.high.write('alive',0n,1);if(mode==='cloaked')f.views.high.board.setdsp(10,20,0);if(mode==='sentinel')f.views.high.board.setdsp(10,20,-1);if(mode==='outside'||mode==='edge')f.high.write('base',mode==='edge'?14n:15n,1,1,2);
  if(mode==='edge')draws(f);finish(f.run());assert.equal(f.calls.length,mode==='edge'?1:0);if(mode==='count'||mode==='strength'||mode==='dead')assert.ok(!f.events.includes('disp'));if(mode==='cloaked'||mode==='sentinel')assert.ok(!f.events.includes('ldis'));
});
for(const [population,power] of [[3n,66n],[201n,0n],[-2n,-100n]] as const)test(`BASPHA keeps signed/truncated power 200/${population}`,()=>{
  const f=fixture();f.high.write('numply',population);f.io.phadam=function*(kind,k,id,p){f.calls.push([yield*kind(),f.m.read(k),f.m.read(id),yield*p()]);};finish(f.run());assert.equal(f.calls[0][3],power);
});
test('BASPHA division failure retains metadata and ID but does not score or queue a hit',()=>{
  const f=fixture();f.high.write('numply',0n);f.low.write('shstfr',77n);assert.throws(()=>finish(f.run()),/zero/i);assert.equal(f.low.read('dispfr'),401n);assert.equal(f.low.read('dispto'),101n);assert.equal(f.low.read('iwhat'),1n);assert.equal(f.m.read(f.locals.id),2n);assert.equal(f.low.read('shstfr'),77n);assert.equal(f.calls.length,0);assert.equal(f.high.read('tmscor',2,K.KPEDAM),0n);
});
test('BASPHA no eligible attack does not evaluate 200/NUMPLY',()=>{
  const f=fixture();f.high.write('numply',0n);f.high.write('alive',0n,1);finish(f.run());assert.equal(f.calls.length,0);
});
test('BASPHA reads NUMPLY only when the PHADAM call evaluates power after PDIST',()=>{
  const f=fixture(),pd=f.io.pdist;f.io.pdist=function*(...a){const d=yield*pd(...a);yield 'distance';return d;};draws(f);const g=f.run();assert.equal(g.next().value,'distance');f.high.write('numply',4n);finish(g);assert.equal(f.calls[0][3],50n);
});
test('BASPHA reads current coordinates after raw visibility and distance calls',()=>{
  const f=fixture(),disp=f.io.disp;draws(f);f.io.disp=function*(v,h){const n=yield*disp(v,h);f.high.write('shpcon',11n,1,K.KVPOS);return n;};finish(f.run());assert.equal(f.calls[0][2],1n);assert.equal(f.queued[0].vto,11n);assert.ok(f.events.includes('pridis:11,20,10,1,0'));
});
test('BASPHA damage completes before scoring and rereads base strength and target position',()=>{
  const f=fixture(),damage=f.io.phadam;draws(f);f.io.phadam=function*(...a){yield*damage(...a);yield 'damage';};const g=f.run();assert.equal(g.next().value,'damage');assert.equal(f.high.read('tmscor',2,K.KPEDAM),0n);
  f.high.write('base',700n,1,3,2);f.high.write('shpcon',20n,1,K.KVPOS);finish(g);assert.equal(f.queued[0].shstfr,700n);assert.equal(f.queued[0].vto,10n);assert.ok(f.events.includes('pridis:20,20,10,1,0'));
});
test('BASPHA sends actual mutable K and ID local words to PHADAM',()=>{
  const f=fixture();f.io.phadam=function*(_kind,k,id){assert.equal(k,f.locals.k);assert.equal(id,f.locals.id);f.m.write(k,2n);f.m.write(id,77n);f.low.write('ihita',3n);};f.high.write('shpcon',40n,2,K.KVPOS);f.high.write('shpcon',40n,2,K.KHPOS);finish(f.run());
  assert.equal(f.m.read(f.locals.id),77n);assert.equal(f.queued[0].dispto,101n);assert.ok(f.events.includes('pridis:40,40,10,1,0'));assert.ok((f.queued[0].dbits&2n)!==0n);
});
test('BASPHA captures team bound but rereads future bases after hit delivery',()=>{
  const f=fixture(),send=f.io.makhit;f.low.write('player',0n);f.base(1);ship(f,6,11,20);draws(f,3);let first=true;
  f.io.makhit=function*(){yield*send();if(first){first=false;f.m.write(f.locals.je,1n);f.base(2,10);}};finish(f.run());assert.deepEqual(f.queued.map(h=>h.dispfr),[301n,401n,410n]);assert.equal(f.m.read(f.locals.i),3n);
});
test('BASPHA does not retest current base strength between eligible targets',()=>{
  const f=fixture(),send=f.io.makhit;ship(f,2,11,20);draws(f,2);f.io.makhit=function*(){yield*send();f.high.write('base',0n,1,3,2);};finish(f.run());assert.equal(f.queued.length,2);assert.equal(f.queued[1].shstfr,0n);
});
test('BASPHA actual PHADAM kill credits the base team and still notifies the dead victim',()=>{
  const f=fixture();f.high.write('shpcon',1n,1,K.KSNRGY);draws(f);finish(f.run());assert.equal(f.high.read('alive',1),0n);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.high.read('tmscor',2,K.KPEDAM),6480n);assert.equal(f.high.read('tmscor',2,K.KPEKIL),5000n);assert.equal(f.queued[0].klflg,2n);assert.ok((f.queued[0].dbits&1n)!==0n);
});
test('BASPHA first recipient flag is current job TEAM, not firing base team',()=>{
  const f=fixture(),damage=f.io.phadam;draws(f);f.io.phadam=function*(...a){yield*damage(...a);f.low.write('team',0n);};finish(f.run());assert.ok(f.events.includes('pridis:10,20,10,0,0'));assert.equal(f.high.read('tmscor',2,K.KPEDAM),6480n);
});
test('BASPHA rereads target and BITS after second recipient call',()=>{
  const f=fixture(),pridis=f.io.pridis;draws(f);f.io.pridis=function*(...a){yield*pridis(...a);if(a[4]===1){f.m.write(f.locals.k,3n);f.high.write('bits',512n,3);}};finish(f.run());assert.ok((f.queued[0].dbits&512n)!==0n);assert.equal(f.queued[0].dispto,101n);
});
test('BASPHA score assignment retains required compiler evaluation and 36-bit wrap',()=>{
  const f=fixture();f.high.write('tmscor',MAX_INTEGER,2,K.KPEDAM);f.io.phadam=function*(){f.low.write('ihita',1n);};finish(f.run());assert.equal(f.high.read('tmscor',2,K.KPEDAM),MIN_INTEGER);
});
test('BASPHA player interpretation follows supplied compiler LOGICAL policy',()=>{
  const f=fixture();f.low.write('player',1n);f.base(1);ship(f,6,11,20);draws(f,2);finish(f.run());assert.deepEqual(f.queued.map(h=>h.dispfr),[301n,401n]);
});
test('BASPHA uses required compiler DO policy for a reversed selected team interval',()=>{
  const f=fixture();f.low.write('player',0n);const bounds=f.io.bounds;let first=true;f.io.bounds=function*(s,l){if(first){first=false;return {start:2n,limit:1n};}return yield*bounds(s,l);};f.io.enterLoop=(s,l)=>{assert.equal(s,2n);assert.equal(l,1n);return false;};finish(f.run());assert.equal(f.m.read(f.locals.i),2n);assert.equal(f.calls.length,0);
});
test('BASPHA attacks eligible ships before Romulan and updates Romulan score after PRIDIS',()=>{
  const f=fixture();ship(f,2,11,20);f.world.rom=-1n;f.world.locr.v=12;f.world.locr.h=21;draws(f,2);f.damage.integers.push(100n);
  const pridis=f.io.pridis;f.io.pridis=function*(...a){if(a[3]===null&&a[4]===0)assert.equal(f.high.read('tmscor',2,K.KPRKIL),0n);yield*pridis(...a);};finish(f.run());assert.deepEqual(f.queued.map(h=>h.dispto),[101n,102n,500n]);assert.equal(f.queued[2].shstto,801n);assert.equal(f.high.read('tmscor',2,K.KPRKIL),2000n);
});
test('BASPHA actual PHAROM death clears raw board and credits damage plus kill to KPRKIL',()=>{
  const f=fixture();f.high.write('alive',0n,1);f.world.rom=-1n;f.world.erom=1n;f.world.locr.v=10;f.world.locr.h=20;f.views.high.board.setdsp(10,20,500);f.damage.integers.push(100n);finish(f.run());
  assert.deepEqual(f.calls,[[500n,100n,2n]]);assert.equal(f.world.rom,0n);assert.equal(f.world.erom,-99n);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.high.read('tmscor',2,K.KPRKIL),6000n);assert.equal(f.queued[0].shcnto,1n);assert.equal(f.queued[0].klflg,2n);
});
test('BASPHA reads ROM again after recipient selection for the death bonus',()=>{
  const f=fixture();f.high.write('alive',0n,1);f.world.rom=-1n;f.world.locr.v=10;f.world.locr.h=20;f.damage.integers.push(100n);const pridis=f.io.pridis;f.io.pridis=function*(...a){yield*pridis(...a);f.world.rom=0n;};finish(f.run());assert.equal(f.high.read('tmscor',2,K.KPRKIL),6000n);
});
test('Turn runtime executes actual BASPHA before planet call, base rebuilding and score commits',()=>{
  const f=fixture();f.high.write('numply',1n);f.high.write('numsid',5n,1);f.low.write('tpoint',9n,1);draws(f);const order:string[]=[];
  const io:TurnStatementServices<string>={logical:f.io.logical,integer:f.io.integer,assign:f.io.assign,*repair(){assert.fail();},*debugLine(op,r){order.push(`${op}:${r}`);},*baspha(){order.push('baspha');yield*f.run();},*plnatk(){order.push('plnatk');assert.equal(f.queued.length,1);},*basbld(){order.push('basbld');yield*rebuildBaseStatements(f.high,f.low,{ib:13100n,ie:13101n,n:13102n,j:13103n,i:13104n},{logical:f.io.logical,assign:f.io.assign,enterTeams:f.io.enterLoop,*integer(op,l,r){if(op==='min'){const a=yield*l(),b=yield*r();return a<b?a:b;}return yield*f.io.integer(op,l,r);}});},*romdrv(){assert.fail();},*out(){assert.fail();},*odec(){assert.fail();}};
  finish(turnStatements(f.high,f.low,false,{i:13110n,d1:13111n,d2:13112n},io));assert.equal(f.high.read('score',1,1),9n);assert.equal(f.high.read('shpcon',1,K.KNTURN),18n);assert.equal(f.high.read('dotime'),0n);assert.equal(f.high.read('base',1,3,2),1000n);assert.deepEqual(order,['timin:BASPHA','baspha','timout:BASPHA','timin:PLNATK','plnatk','timout:PLNATK','timin:BASBLD','basbld','timout:BASBLD']);
});
