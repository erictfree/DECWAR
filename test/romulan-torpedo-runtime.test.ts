import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<4000;i++){const s=g.next();if(s.done)return s.value;}throw new Error('test schedule exhausted');}
function fixture(){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),b=main.romulan,r=b.torpedoes;main.policy.debug='omit';
  for(const [key,w] of [['who',1n],['team',1n],['player',0n],['pasflg',0n],['hungup',0n],['hcpos',0n],['blank',0n],['oflg',0n],['ocflg',BigInt(K.KABS)],['klflg',0n],['dispfr',0n],['iwhat',0n]] as const)f.low.write(key,w);
  for(const [key,w] of [['rom',-1n],['romopt',0n],['erom',1001n],['numply',2n],['slwest',2n],['tim0',0n],['rtpaus',77n],['rppaus',0n],['nomsg',0n],['nplnet',0n],['romcnt',0n]] as const)f.high.write(key,w);
  f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.high.write('tmturn',0n,3);f.views.high.board.setdsp(10,20,500);
  for(let i=1;i<=K.KNPLAY;i++){f.high.write('alive',0n,i);f.high.write('hitflg',0n,i);f.high.write('trstat',0n,i);f.high.write('docked',0n,i);f.high.write('shpcon',0n,i,K.KVPOS);f.high.write('shpcon',0n,i,K.KHPOS);}
  for(let team=1;team<=2;team++){f.high.write('nbase',0n,team);f.high.write('numcap',0n,team);for(let j=1;j<=K.KNBASE;j++)f.high.write('base',0n,j,3,team);}
  const ship=(i:number,v:number,h:number)=>{Object.assign(f.views.high.players[i].ship,{v,h,energy:50000n,damage:0n,shieldStrength:1000n,shieldCondition:-1n});f.high.write('alive',-1n,i);f.views.high.board.setdsp(v,h,(i<=5?100:200)+i);};ship(1,50,50);ship(6,12,20);
  f.m.write(r.s.dv,2n);f.m.write(r.s.dh,0n);f.file.write('seed',1n);f.clock.splice(0,f.clock.length,1000n);f.damage.draws.length=0;f.damage.integers.length=0;
  const integers=(...draws:bigint[])=>{r.io.iran=function*(max){assert.equal(max,100);r.events.push('iran:100');assert.ok(draws.length,'unscheduled ROMTOR integer draw');return draws.shift()!;};return draws;};
  const far=()=>{r.io.dist=function*(_i,_k,n){r.events.push('dist');f.m.write(n,99n);};};
  const hit=(code:number,aran=1n)=>{f.damage.draws.push('.5','.5');integers(1n,aran);r.io.check=function*(){r.events.push('check');f.out.write('dcode',BigInt(code));f.out.write('h2',12n);f.out.write('v2',20n);};far();};
  return {...f,main,b,r,ship,integers,far,collision:hit,run:()=>done(r.run())};
}
test('ROMTOR silent misses consume three shots, preserve metadata and recharge through raw ETIM',()=>{
  const f=fixture();f.damage.draws.push(...Array(6).fill('.5'));f.low.write('iwhat',9n);f.r.io.check=function*(){f.r.events.push('check');f.out.write('dcode',0n);};f.run();assert.equal(f.m.read(f.r.locals.id),4n);assert.equal(f.m.read(f.r.locals.tpaus),9000n);assert.equal(f.high.read('rtpaus'),10000n);assert.equal(f.low.read('iwhat'),9n);assert.equal(f.main.defenses.hits.length,0);assert.ok(!f.r.events.includes('dist'));assert.equal(f.r.events.filter(x=>x==='iran:100').length,3);assert.notEqual(f.file.read('seed'),1n);assert.equal(f.damage.draws.length,0);
});
test('ROMTOR prior misfire abort occurs after the next deflection draw',()=>{
  const f=fixture();f.damage.draws.push('.5','.5','.5','.5');f.integers(97n);f.r.io.check=function*(){f.r.events.push('check');f.out.write('dcode',0n);};f.run();assert.equal(f.m.read(f.r.locals.id),2n);assert.equal(f.m.read(f.r.locals.misfir),-1n);assert.equal(f.m.read(f.r.locals.tpaus),3000n);assert.equal(f.high.read('rtpaus'),4000n);assert.deepEqual(f.r.events,['ran','iran:100','ran','ran','check','ran','etim']);
});
test('ROMTOR misfire threshold 96 and signed range truncation preserve exact boundary values',()=>{
  const f=fixture();f.damage.draws.push('.5','0','.5','.625','.5','.999');f.integers(96n,96n,96n);const ranges:bigint[]=[];f.r.io.check=function*(_v,_h,_dv,_dh,range){ranges.push(f.m.read(range));f.out.write('dcode',0n);};f.run();assert.deepEqual(ranges,[7n,9n,10n]);assert.equal(f.m.read(f.r.locals.misfir),0n);
});
test('ROMTOR actual CHECK follows three shots through TORDAM, JUMP, DIST, ROMSTR and raw hit publication',()=>{
  const f=fixture();for(let i=0;i<3;i++)f.damage.draws.push('.5','.5','0','0','.5');f.integers(1n,1n,1n,1n,1n,1n);f.run();assert.equal(f.high.read('shpcon',6,K.KVPOS),15n);assert.equal(f.high.read('shpcon',6,K.KSDAM),18000n);assert.equal(f.high.read('rsr',K.KPEDAM),18000n);assert.equal(f.r.events.filter(x=>x==='dist').length,3);assert.equal(f.r.events.filter(x=>x==='romstr').length,3);assert.deepEqual(f.main.defenses.hits.map(h=>[h.iwhat,h.vto,h.dispfr]),[[2n,13n,500n],[2n,14n,500n],[2n,15n,500n]]);assert.equal(f.high.read('hitflg',6),3n);assert.deepEqual([f.m.read(f.r.s.dv),f.m.read(f.r.s.dh)],[5n,0n]);assert.equal(f.high.read('rtpaus'),10000n);assert.equal(f.damage.draws.length,0);
});
test('ROMTOR actual CHECK overwrites ROMDRV aliased direction words before tracing',()=>{
  const f=fixture();f.views.high.board.setdsp(12,20,0);f.out.write('h1',2n);f.out.write('v1',0n);f.damage.draws.push(...Array(8).fill('.5'));f.integers(97n);done(f.r.run(f.out.address('h1'),f.out.address('v1')));assert.deepEqual([f.out.read('h2'),f.out.read('v2')],[14n,28n]);assert.deepEqual([f.out.read('h1'),f.out.read('v1')],[14n,28n]);assert.equal(f.damage.draws.length,0);assert.equal(f.high.read('rtpaus'),4000n);assert.equal(f.r.checks[0][2],f.out.address('h1'));
});
test('ROMTOR TORDAM actual IDUM is passed twice and post-call source fields stay live',()=>{
  const f=fixture();f.collision(206);f.low.write('dispfr',77n);f.r.io.tordam=function*(kind,j,id,size,ship){assert.deepEqual([kind,j,id,size,ship],[f.r.locals.nplc,f.r.locals.j,f.r.locals.idum,f.r.locals.idum,true]);assert.equal(f.low.read('dispfr'),77n);f.m.write(id,123n);yield 'damage';};const g=f.r.run();assert.equal(g.next().value,'damage');f.high.write('erom',333n);done(g);assert.equal(f.m.read(f.r.locals.idum),123n);assert.equal(f.main.defenses.hits[0].shstfr,333n);assert.equal(f.main.defenses.hits[0].dispfr,500n);
});
test('ROMTOR actual tractor release publishes after damage and before retargeting',()=>{
  const f=fixture();f.collision(206);f.damage.draws.push('0','0','.5');f.high.write('trstat',1n,6);f.high.write('trstat',6n,1);f.out.write('dhs',f.realWord('1'));f.out.write('dvs',f.realWord('0'));f.run();assert.equal(f.high.read('trstat',6),0n);assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('hitflg',6),2n);assert.ok(f.r.events.indexOf('makhit')<f.r.events.indexOf('trcoff'));assert.ok(f.r.events.indexOf('trcoff')<f.r.events.indexOf('dist'));f.m.write(f.getHit.player,6n);done(f.getHit.run());assert.equal(f.hit.iwhat,2n);done(f.getHit.run());assert.equal(f.hit.iwhat,14n);
});
test('ROMTOR full-base help precedes damage with source DISPFR left unset',()=>{
  const f=fixture();f.collision(401);f.high.write('nomsg',f.high.read('bits',6));Object.assign(f.views.high.bases[2][1],{v:12,h:20,strength:1000n});f.views.high.board.setdsp(12,20,401);f.damage.draws.push('0','0','.5');f.run();assert.deepEqual(f.main.defenses.hits.map(h=>h.iwhat),[9n,2n]);assert.equal(f.main.defenses.hits[0].dispfr,0n);assert.equal(f.main.defenses.hits[1].dispfr,500n);assert.equal(f.high.read('base',1,3,2),819n);assert.equal(f.main.defenses.hits[0].dbits,960n);assert.equal(f.main.defenses.hits[1].dbits,f.high.read('bits',6));
});
test('ROMTOR actual base destruction publishes damage before the distinct destruction report',()=>{
  const f=fixture();f.collision(401);Object.assign(f.views.high.bases[2][1],{v:12,h:20,strength:50n});f.high.write('nbase',1n,2);f.views.high.board.setdsp(12,20,401);f.damage.draws.push('0','0','.5','.2');f.run();assert.deepEqual(f.main.defenses.hits.map(h=>h.iwhat),[2n,10n]);assert.equal(f.main.defenses.hits[1].dispfr,0n);assert.equal(f.high.read('rsr',K.KPBDAM),15700n);assert.equal(f.high.read('nbase',2),0n);assert.equal(f.views.high.board.disp(12,20),0);
});
test('ROMTOR black-hole collision still consumes ARAN and retargets silently',()=>{
  const f=fixture();f.collision(1000);f.run();assert.equal(f.main.defenses.hits.length,0);assert.ok(f.r.events.includes('dist'));assert.equal(f.m.read(f.r.locals.aran),1n);assert.equal(f.high.read('rtpaus'),4000n);
});
test('ROMTOR star threshold 81 skips nova and star penalty',()=>{
  const f=fixture();f.collision(900,81n);f.run();assert.equal(f.main.defenses.hits.length,0);assert.equal(f.high.read('rsr',K.KNSDES),0n);assert.ok(f.r.events.includes('dist'));assert.equal(f.high.read('rtpaus'),4000n);
});
test('ROMTOR actual SNOVA clears the struck star and returns to retarget and recharge',()=>{
  const f=fixture();f.collision(900,80n);f.views.high.board.setdsp(12,20,900);f.run();assert.equal(f.main.defenses.hits[0].iwhat,7n);assert.equal(f.main.defenses.hits[0].dispfr,900n);assert.equal(f.high.read('rsr',K.KNSDES),-500n);assert.equal(f.views.high.board.disp(12,20),0);assert.equal(f.high.read('rtpaus'),4000n);assert.ok(f.r.events.includes('snova'));assert.ok(f.r.events.includes('dist'));assert.ok(f.r.events.includes('etim'));
});
test('ROMTOR nova death return skips both retargeting and the recharge store',()=>{
  const f=fixture();f.collision(900,80n);f.r.io.snova=function*(){f.high.write('rom',0n);};f.run();assert.equal(f.high.read('rtpaus'),77n);assert.equal(f.m.read(f.r.locals.tpaus),3000n);assert.equal(f.clock.length,1);assert.ok(!f.r.events.includes('dist'));
});
for(const aran of [74n,75n])test(`ROMTOR planet ARAN ${aran} uses the inclusive threshold through raw locks`,()=>{
  const f=fixture();f.collision(601,aran);f.high.write('nplnet',1n);f.high.write('locpln',1n,1,3);f.run();assert.equal(f.high.read('locpln',1,3),aran===75n?0n:1n);assert.equal(f.main.defenses.hits[0].shstto,aran===75n?0n:1n);assert.ok(f.events.includes('enq'));assert.ok(f.events.includes('deq'));assert.ok(f.r.events.indexOf('unlock')<f.r.events.indexOf('makhit'));assert.equal(f.high.read('rtpaus'),4000n);
});
test('ROMTOR nonreturning PLNRMV retains the board clear and penalty while locked',()=>{
  const f=fixture();f.collision(801,75n);f.high.write('nplnet',1n);f.high.write('locpln',0n,1,3);f.views.high.board.setdsp(12,20,801);f.r.io.plnrmv=function*(){throw new Error('PLNRMV transfer');};assert.throws(f.run,/PLNRMV transfer/);assert.equal(f.m.read(f.r.locals.pteam),2n);assert.equal(f.views.high.board.disp(12,20),0);assert.equal(f.high.read('rsr',K.KNPDES),-1000n);assert.equal(f.low.read('klflg'),2n);assert.ok(!f.r.events.includes('unlock'));assert.equal(f.main.defenses.hits.length,0);assert.equal(f.high.read('rtpaus'),77n);
});
test('ROMTOR stale KLFLG enters removal even for a surviving positive-build planet',()=>{
  const f=fixture();f.collision(601,74n);f.high.write('locpln',5n,1,3);f.low.write('klflg',1n);let actuals:bigint[]=[];f.r.io.plnrmv=function*(i,team){actuals=[i,team];};f.run();assert.deepEqual(actuals,[f.r.locals.i,f.r.locals.pteam]);assert.equal(f.high.read('locpln',1,3),5n);assert.equal(f.high.read('rsr',K.KNPDES),-1000n);assert.equal(f.main.defenses.hits[0].klflg,1n);
});
test('ROMTOR failed planet locks advance shots without unlock, retargeting or publication',()=>{
  const f=fixture();f.collision(601,75n);f.damage.draws.push('.5','.5','.5','.5');f.integers(1n,75n,1n,75n,1n,75n);f.high.write('locpln',5n,1,3);f.r.io.lockPlanet=function*(caller){assert.equal(caller,'ROMTOR');f.low.write('lkfail',-1n);};f.run();assert.equal(f.m.read(f.r.locals.id),4n);assert.equal(f.m.read(f.r.locals.tpaus),9000n);assert.equal(f.high.read('rtpaus'),10000n);assert.equal(f.high.read('locpln',1,3),5n);assert.equal(f.main.defenses.hits.length,0);assert.ok(!f.r.events.includes('unlock'));assert.ok(!f.r.events.includes('dist'));
});
test('ROMTOR reads current collision code and ARAN after a suspended planet lock',()=>{
  const f=fixture();f.collision(601,74n);f.high.write('locpln',5n,1,3);f.high.write('locpln',1n,2,3);f.r.io.lockPlanet=function*(){f.low.write('lkfail',0n);yield 'lock';};f.r.io.unlockPlanet=function*(){};const g=f.r.run();assert.equal(g.next().value,'lock');f.out.write('dcode',802n);f.m.write(f.r.locals.aran,75n);done(g);assert.equal(f.high.read('locpln',1,3),5n);assert.equal(f.high.read('locpln',2,3),0n);assert.equal(f.m.read(f.r.locals.i),2n);assert.equal(f.main.defenses.hits[0].dispto,601n);
});
test('ROMTOR retarget branch stays selected while actual index and coordinate values remain live',()=>{
  const f=fixture();f.collision(1000);f.r.io.dist=function*(i,k,n){f.m.write(i,6n);f.m.write(k,2n);f.m.write(n,1n);};f.high.write('shpcon',44n,7,K.KHPOS);const assign=f.r.io.assign;f.r.io.assign=function*(a,type,e){yield*assign(a,type,e);if(a()===f.r.locals.iv2){f.m.write(f.r.locals.iob,7n);f.m.write(f.r.locals.nplc,4n);}};f.r.io.romstr=function*(v,h){assert.equal(f.m.read(v),12n);assert.equal(f.m.read(h),44n);throw new Error('retarget transfer');};assert.throws(f.run,/retarget transfer/);assert.equal(f.high.read('rtpaus'),77n);
});
test('ROMTOR recharge reads TPAUS after suspended elapsed call returns',()=>{
  const f=fixture();f.collision(1000);const etim=f.r.io.etim;f.r.io.etim=function*(a){const t=yield*etim(a);yield 'clock';return t;};const g=f.r.run();assert.equal(g.next().value,'clock');f.m.write(f.r.locals.tpaus,7000n);done(g);assert.equal(f.high.read('rtpaus'),8000n);
});
test('ROMTOR CHECK failure retains deflection, range and accumulated pause without recharge',()=>{
  const f=fixture();f.damage.draws.push('.5','.5');f.integers(1n);f.r.io.check=function*(){throw new Error('CHECK transfer');};assert.throws(f.run,/CHECK transfer/);assert.equal(f.m.read(f.r.locals.idis),8n);assert.equal(f.m.read(f.r.locals.tpaus),3000n);assert.equal(f.high.read('rtpaus'),77n);assert.equal(f.clock.length,1);
});
test('ROMTOR raw hit delivery renders the original torpedo damage line',()=>{
  const f=fixture();f.far();f.damage.draws.push('.5','.5','0','0','.5');f.integers(1n,1n);f.run();f.low.write('who',6n);f.low.write('team',2n);const start=f.text().length;done(f.outHit.run());assert.equal(f.text().slice(start),'?? @10-20 +100.1%  600.0 unit T  C -->13-20, -100.0%\r\n');
});
test('Main turn runs ROMDRV and actual aliased ROMTOR before the extra defenses and accounting',()=>{
  const f=fixture();f.high.write('romopt',-1n);f.high.write('rtpaus',0n);f.high.write('rppaus',1000n);f.high.write('dotime',1n);f.high.write('numsid',1n,1);f.ship(6,11,20);f.clock.splice(0,f.clock.length,1000n,2000n);f.damage.draws.push(...Array(8).fill('.5'));f.integers(97n);f.b.io.iran=function*(){return 2n;};const turns=f.high.read('shpcon',1,K.KNTURN);done(f.main.io.finishTurn(false));assert.ok(f.b.events.includes('romtor'));assert.ok(f.b.events.includes('basbld'));assert.equal(f.high.read('rtpaus'),5000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+1n);assert.equal(f.high.read('tmturn',3),1n);assert.deepEqual(f.r.checks[0].slice(2,4),[f.out.address('h1'),f.out.address('v1')]);assert.equal(f.damage.draws.length,0);
});
