import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K,messages } from '../src/generated/source-data.ts';
import { halfWords,packAscii,rightHalf } from '../src/compat/word36.ts';
import { emptyHit } from '../src/game/hit-queue.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<2000;i++){const step=g.next();if(step.done)return step.value;}throw new Error('test schedule exhausted');}
function fixture(){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),b=main.defenses;
  main.policy.debug='omit';main.policy.quit=function*(w){return w<0n?'leave':'next';};main.policy.movement=function*(alive){return alive()<0n?'repair':'leave';};
  for(const [key,w] of [['who',1n],['team',1n],['player',-1n],['hungup',0n],['ccflg',0n],['addrck',0n],['ptime',0n],['pasflg',0n],['oflg',0n],['hcpos',0n],['blank',0n],['ocflg',BigInt(K.KABS)],['prtype',0n]] as const)f.low.write(key,w);
  f.high.write('numply',2n);f.high.write('numsid',2n,1);f.high.write('numsid',1n,2);f.high.write('numshp',1n,1);f.high.write('numshp',1n,2);f.high.write('nomsg',0n);f.high.write('rom',0n);f.high.write('romopt',0n);f.high.write('endflg',0n);f.high.write('dotime',1n);f.high.write('tim0',0n);f.high.write('nplnet',0n);
  for(let team=1;team<=2;team++){f.high.write('nbase',0n,team);for(let i=1;i<=K.KNBASE;i++)f.high.write('base',0n,i,3,team);}
  for(let i=1;i<=K.KNPLAY;i++){f.high.write('alive',1n,i);f.high.write('hitflg',0n,i);f.high.write('msgflg',0n,i);}
  const ship=(id:number,v=10,h=20)=>{f.high.write('alive',-1n,id);f.high.write('docked',0n,id);Object.assign(f.views.high.players[id].ship,{v,h,energy:50000n,damage:0n,shieldCondition:-1n});for(let d=1;d<=K.KNDEV;d++)f.high.write('shpdam',0n,id,d);f.high.write('shpcon',BigInt(K.GREEN),id,K.KSPCON);f.high.write('shpcon',1n,id,K.KNTURN);f.views.high.board.setdsp(v,h,id<=5?100+id:200+id);};ship(1);ship(6,14,20);
  const base=(team=2,index=1,strength=900n,v=12,h=20)=>{f.high.write('nbase',BigInt(index),team);f.high.write('base',BigInt(v),index,K.KVPOS,team);f.high.write('base',BigInt(h),index,K.KHPOS,team);f.high.write('base',strength,index,3,team);};base();
  const planet=(code=801,builds=5n,v=10,h=22)=>{f.high.write('nplnet',1n);f.high.write('locpln',BigInt(v),1,K.KVPOS);f.high.write('locpln',BigInt(h),1,K.KHPOS);f.high.write('locpln',builds,1,3);f.views.high.board.setdsp(v,h,code);};
  f.file.write('seed',1n);f.damage.draws.length=0;f.damage.integers.length=0;f.getCommand.trapAddress.value=0n;
  const before=f.text().length,receive=(who=1n)=>{f.m.write(f.getHit.player,who);done(f.getHit.run());return {...f.hit};};
  return {...f,main,b,ship,base,planet,receive,draws:(n=1)=>f.damage.draws.push(...Array<string>(2*n).fill('0')),turn:(repair=false)=>done(main.io.finishTurn(repair)),output:()=>f.text().slice(before)};
}
test('Main timed turn runs BASPHA, PLNATK and BASBLD through actual damage and packed hit queue',()=>{
  const f=fixture();f.planet();f.draws(2);f.low.write('tpoint',123n,1);f.turn();
  assert.deepEqual(f.b.calls,[[1n,1n,2n,100n,0n],[2n,1n,2n,100n,0n]]);assert.equal(f.high.read('shpcon',1,K.KSDAM),12960n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),37040n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),12960n);
  assert.deepEqual(f.b.hits.map(h=>h.dispfr),[401n,801n]);assert.equal(f.high.read('hitflg',1),2n);assert.equal(f.high.read('hitflg',6),2n);assert.equal(f.m.read(f.getHit.queues.address('hitser')),2n);assert.equal(f.high.read('base',1,3,2),912n);assert.equal(f.high.read('dotime'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.high.read('score',1,1),123n);assert.equal(f.low.read('tpoint',1),0n);assert.equal(f.low.read('dbits'),0n);assert.deepEqual({...f.hit},{...emptyHit(),dbits:0n});assert.equal(f.damage.draws.length,0);assert.equal(f.r.s,f.s.initialStackWord);
  assert.deepEqual(f.main.events,['turn:false','timin:BASPHA','baspha','timout:BASPHA','timin:PLNATK','plnatk','timout:PLNATK','timin:BASBLD','basbld','timout:BASBLD']);
});
test('Base and planet notifications retain distinct packed fields through raw GETHIT for two recipients',()=>{
  const f=fixture();f.planet();f.draws(2);f.turn();const base=f.receive(),planet=f.receive();assert.equal(base.dispfr,401n);assert.equal(base.ihita,6480n);assert.equal(base.shstfr,900n);assert.equal(base.shcnfr,1n);assert.equal(base.dispto,101n);assert.equal(planet.dispfr,801n);assert.equal(planet.ihita,6480n);assert.equal(planet.shstfr,5n);assert.equal(planet.shcnfr,-1n);
  assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.high.read('hitflg',6),2n);assert.equal(f.receive(6n).dispfr,401n);assert.equal(f.receive(6n).dispfr,801n);assert.equal(f.high.read('hitflg',6),0n);assert.equal(rightHalf(f.m.read(f.getHit.queues.address('hitql'))),0n);assert.equal(rightHalf(f.m.read(f.getHit.queues.address('hitql')+1n)),0n);
});
test('Defense hit output runs through raw OUTHIT with the original damage scaling',()=>{
  const f=fixture();f.draws();done(f.b.base());done(f.outHit.run());assert.equal(f.output(),')( @12-20, +90.0%  648.0 unit P  L @10-20, -100.0%\r\n');assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.high.read('hitflg',6),1n);
});
test('Main REPAIR defense cycle delivers notifications on the next GETCMD before confirmed QUIT',()=>{
  const f=fixture();f.planet();f.draws(2);f.high.write('shpdam',1000n,1,1);f.high.write('job',halfWords(12n,34n),1,K.KPPN);f.clock.splice(0,f.clock.length,100n,500n,3000n);f.editor.feed('REPAIR\n');
  let commands=0;const get=f.main.io.getcmd;f.main.io.getcmd=function*(a){if(commands++){assert.equal(f.high.read('hitflg',1),2n);f.editor.feed('QUIT\n');}yield*get(a);};const clear=f.main.io.clear;f.main.io.clear=function*(){yield*clear();f.editor.feed('YES\n');};f.endgame.io.etim=function*(){return 2000n;};f.endgame.io.points=function*(){f.m.write(f.endgame.total,456n);};
  assert.throws(()=>done(f.main.run()),/EXIT transfer/);assert.equal(commands,2);assert.ok(f.getCommand.events.includes('outhit'));assert.ok(f.output().includes('648'));assert.ok(f.output().includes(messages.sure00.text));assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.statistics.writes.length,1);assert.equal(f.statistics.files.stared[9],456n);assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('base',1,3,2),912n);
});
test('Main defense scheduling skips all three routines below NUMPLY but still commits turns',()=>{const f=fixture();f.high.write('dotime',0n);f.turn();assert.deepEqual(f.b.events,[]);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.high.read('dotime'),1n);assert.equal(f.high.read('base',1,3,2),900n);});
test('Main automatic repair occurs before defense damage and later life-support/score accounting',()=>{
  const f=fixture();f.high.write('shpdam',1000n,1,K.KDLIFE);f.draws();const base=f.main.turnIO.baspha;f.main.turnIO.baspha=function*(){assert.equal(f.high.read('shpdam',1,K.KDLIFE),700n);yield*base();};f.turn(true);assert.equal(f.main.events[1],'automatic-repair');assert.equal(f.high.read('shpcon',1,K.KSDAM),6480n);assert.equal(f.high.read('dotime'),0n);
});
test('Defense PHADAM critical integer draw consumes shared raw SEED while REAL draws remain explicit',()=>{
  const f=fixture();f.damage.draws.push('0.5','0','0','0.5');done(f.b.base());assert.equal(f.file.read('seed'),260543n);assert.ok(f.b.events.includes('weapon-iran:5'));assert.equal(f.damage.integers.length,0);assert.equal(f.low.read('critdm'),0n);const hit=f.receive();assert.equal(hit.critdv,1n);assert.equal(hit.critdm,3240n);assert.equal(f.high.read('shpdam',1,1),3240n);
});
test('Neutral planet skip consumes exactly one raw IRAN draw before any attack or publication',()=>{
  const f=fixture();f.planet(601);f.file.write('seed',5n);done(f.b.planet());assert.equal(f.file.read('seed'),1302715n);assert.deepEqual(f.b.events,['dispc','planet-iran:2']);assert.equal(f.b.hits.length,0);assert.equal(f.high.read('hitflg',1),0n);
});
test('Neutral planet non-skip continues with the same shared seed and no owner damage score',()=>{
  const f=fixture();f.planet(601);f.draws();done(f.b.planet());assert.equal(f.file.read('seed'),260543n);assert.equal(f.b.hits.length,1);assert.equal(f.high.read('shpcon',1,K.KSDAM),6480n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),0n);
});
test('Captured friendly planet compiler short-circuit choice controls the raw random schedule',()=>{
  const f=fixture();f.planet(701);done(f.b.planet());assert.equal(f.file.read('seed'),1n);assert.equal(f.b.hits.length,0);
  const eager=fixture();eager.planet(701);eager.b.planetIO.and=function*(l,r){const a=yield*l(),b=yield*r();return a&&b;};done(eager.b.planet());assert.equal(eager.file.read('seed'),260543n);assert.equal(eager.b.hits.length,0);
});
test('Base PHAROM uses raw integer RNG and queues the saved Romulan damage fields',()=>{
  const f=fixture();f.high.write('alive',1n,1);f.high.write('rom',-1n);f.high.write('erom',1000n);f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.views.high.board.setdsp(10,20,500);done(f.b.base());assert.deepEqual(f.b.calls,[[500n,100n,2n]]);assert.equal(f.file.read('seed'),260543n);assert.equal(f.high.read('erom'),943n);assert.equal(f.high.read('tmscor',2,K.KPRKIL),570n);assert.equal(f.b.hits[0].dispto,500n);assert.equal(f.b.hits[0].ihita,570n);assert.equal(f.b.hits[0].shstto,943n);
});
test('Planet PHAROM retains full power instead of the player population divisor',()=>{
  const f=fixture();f.planet();f.high.write('alive',1n,1);f.high.write('rom',-1n);f.high.write('erom',1000n);f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.views.high.board.setdsp(10,20,500);done(f.b.planet());assert.deepEqual(f.b.calls,[[500n,200n,2n]]);assert.equal(f.file.read('seed'),260543n);assert.equal(f.high.read('erom'),886n);assert.equal(f.high.read('tmscor',2,K.KPRKIL),1140n);assert.equal(f.b.hits[0].ihita,1140n);
});
test('Romulan destruction clears the actual board before queue publication and adds the death bonus',()=>{
  const f=fixture();f.high.write('alive',1n,1);f.high.write('rom',-1n);f.high.write('erom',1n);f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.views.high.board.setdsp(10,20,500);const make=f.b.baseIO.makhit;f.b.baseIO.makhit=function*(){assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.high.read('rom'),0n);yield*make();};done(f.b.base());assert.equal(f.high.read('tmscor',2,K.KPRKIL),5570n);assert.equal(f.b.hits[0].klflg,2n);assert.equal(f.b.hits[0].shstto,-56n);
});
test('Base publication failure retains damage/score but blocks planet, rebuild and stardate work',()=>{
  const f=fixture();f.planet();f.draws();f.b.baseIO.makhit=function*(){throw new Error('publication fault');};assert.throws(()=>f.turn(),/publication fault/);assert.equal(f.high.read('shpcon',1,K.KSDAM),6480n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),6480n);assert.equal(f.high.read('dotime'),0n);assert.equal(f.high.read('base',1,3,2),900n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.b.hits.length,0);assert.ok(!f.main.events.includes('plnatk'));assert.notEqual(f.low.read('dbits'),0n);
});
test('Planet publication failure preserves the already published base hit',()=>{
  const f=fixture();f.planet();f.draws(2);f.b.planetIO.makhit=function*(){throw new Error('planet publication fault');};assert.throws(()=>f.turn(),/planet publication fault/);assert.equal(f.high.read('shpcon',1,K.KSDAM),12960n);assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('base',1,3,2),900n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.receive().dispfr,401n);
});
test('Raw MAKHIT suspension after publication retains partial per-recipient notification counts',()=>{
  const f=fixture();f.draws();const aos=f.makeHit.io.aosHit;let first=true;f.makeHit.io.aosHit=function*(a){yield*aos(a);if(first){first=false;yield 'recipient';}};const g=f.b.base();assert.equal(g.next().value,'recipient');assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('hitflg',6),0n);assert.equal(rightHalf(f.m.read(f.getHit.queues.address('hitql'))),33n);assert.equal(f.low.read('dbits'),0n);done(g);assert.equal(f.high.read('hitflg',6),1n);
});
test('BASBLD zero player-side divisor faults after prior attacks and before score/turn commits',()=>{
  const f=fixture();f.planet();f.draws(2);f.high.write('numsid',0n,1);f.low.write('tpoint',99n,1);assert.throws(()=>f.turn(),/zero/i);assert.equal(f.high.read('hitflg',1),2n);assert.equal(f.high.read('base',1,3,2),900n);assert.equal(f.m.read(f.b.buildLocals.n),16n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.low.read('tpoint',1),99n);
});
test('BASBLD live NUMSID read after the initial division controls actual repair increment',()=>{
  const f=fixture();f.draws();const integer=f.b.buildIO.integer;let first=true;f.b.buildIO.integer=function*(op,l,r){const word=yield*integer(op,l,r);if(op==='div'&&first){first=false;yield 'initial-build-division';}return word;};const g=f.main.io.finishTurn(false);assert.equal(g.next().value,'initial-build-division');assert.equal(f.high.read('hitflg',1),1n);f.high.write('numsid',5n,1);done(g);assert.equal(f.high.read('base',1,3,2),905n);
});
test('Nonplayer defense cycle selects both base teams and rebuilds using NUMPLY',()=>{
  const f=fixture();f.low.write('player',0n);f.base(1,1,900n,12,20);f.draws(2);f.turn();assert.deepEqual(f.b.hits.map(h=>[h.dispfr,h.dispto]),[[301n,206n],[401n,101n]]);assert.equal(f.high.read('base',1,3,1),916n);assert.equal(f.high.read('base',1,3,2),916n);
});
test('Nonreturning ROMDRV call retains all three defenses before turn counters',()=>{
  const f=fixture();f.draws();f.high.write('romopt',-1n);f.main.turnIO.romdrv=function*(){throw new Error('ROMDRV transfer');};assert.throws(()=>f.turn(),/ROMDRV transfer/);assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('base',1,3,2),912n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.high.read('dotime'),0n);
});
test('Lethal base fire reports destruction then GETCMD records death and requests pregame',()=>{
  const f=fixture();f.high.write('shpcon',BigInt(K.KENDAM)-1n,1,K.KSDAM);f.high.write('job',halfWords(12n,34n),1,K.KPPN);f.draws();f.turn();assert.equal(f.high.read('alive',1),0n);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.high.read('tmscor',2,K.KPEKIL),5000n);assert.equal(f.high.read('hitflg',1),1n);
  f.endgame.io.etim=function*(){return 2000n;};f.endgame.io.points=function*(){f.m.write(f.endgame.total,789n);};f.clock.splice(0,f.clock.length,3000n);assert.equal(done(f.main.run()),'pregame');assert.equal(f.low.read('who'),0n);assert.equal(f.statistics.writes.length,1);assert.equal(f.statistics.files.stared[9],789n);assert.equal(f.statistics.files.stared[12],0n);assert.equal(f.high.read('hitflg',1),0n);assert.ok(f.output().includes(messages.destry.text));assert.deepEqual(f.main.calls,[]);
});
test('Neutral selection and PHAROM share the integer seed in their source call order',()=>{
  const f=fixture();f.planet(601);f.high.write('alive',1n,1);f.high.write('rom',-1n);f.high.write('erom',1000n);f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.views.high.board.setdsp(10,20,500);done(f.b.planet());assert.deepEqual(f.b.events.filter(e=>e.includes('iran:')),['planet-iran:2','romulan-iran:100']);assert.equal(f.file.read('seed'),33522916481n);assert.equal(f.b.hits.length,1);assert.equal(f.damage.integers.length,0);assert.equal(f.high.read('tmscor',2,K.KPRKIL),0n);
});
