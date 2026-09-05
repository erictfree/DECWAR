import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K,messages } from '../src/generated/source-data.ts';
import { MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<2000;i++){const step=g.next();if(step.done)return step.value;}throw new Error('test schedule exhausted');}
function fixture(){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),b=main.romulan;main.policy.debug='omit';
  for(const [key,w] of [['who',1n],['team',1n],['player',-1n],['hungup',0n],['pasflg',0n],['hcpos',0n],['blank',0n],['oflg',0n],['ocflg',BigInt(K.KABS)]] as const)f.low.write(key,w);
  f.high.write('rom',-1n);f.high.write('romopt',0n);f.high.write('romcnt',0n);f.high.write('erom',300n);f.high.write('numply',2n);f.high.write('numrom',0n);f.high.write('rtpaus',2000n);f.high.write('rppaus',0n);f.high.write('slwest',1n);f.high.write('tim0',0n);f.high.write('tmturn',0n,3);f.high.write('nomsg',0n);f.high.write('nplnet',0n);
  f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.views.high.board.setdsp(10,20,500);
  for(let team=1;team<=2;team++){f.high.write('nbase',0n,team);for(let i=1;i<=K.KNBASE;i++)f.high.write('base',0n,i,3,team);}
  for(let i=1;i<=K.KNPLAY;i++){f.high.write('alive',1n,i);f.high.write('hitflg',0n,i);f.high.write('msgflg',0n,i);}
  Object.assign(f.views.high.players[6].ship,{v:11,h:20,energy:50000n,damage:0n,shieldCondition:-1n});f.high.write('alive',-1n,6);f.views.high.board.setdsp(11,20,206);f.high.write('shpcon',30n,1,K.KVPOS);f.high.write('shpcon',30n,1,K.KHPOS);
  f.file.write('seed',1n);f.clock.splice(0,f.clock.length,1000n,2000n);f.damage.draws.length=0;f.damage.draws.push('0','0');f.damage.integers.length=0;
  const before=f.text().length;
  return {...f,main,b,run:()=>done(b.run()),output:()=>f.text().slice(before)};
}
function target(f:ReturnType<typeof fixture>,distance=1n,kind=2n,index=6n){f.b.io.dist=function*(ip,np,num){f.b.events.push('dist');f.m.write(ip,index);f.m.write(np,kind);f.m.write(num,distance);};}
test('ROMDRV population throttle changes only counter and profiling, leaving caller arguments untouched',()=>{
  const f=fixture();f.high.write('numply',3n);f.run();assert.equal(f.high.read('romcnt'),1n);assert.equal(f.low.read('player'),-1n);assert.equal(f.high.read('tmturn',3),0n);assert.equal(f.m.read(f.b.s.phit),77n);assert.equal(f.m.read(f.b.s.id),88n);assert.deepEqual(f.b.events,['timin:ROMDRV','timout:ROMDRV']);
});
test('ROMDRV dead wait uses compiler OR policy, preserving raw integer draw effects',()=>{
  const f=fixture();f.high.write('rom',0n);f.run();assert.equal(f.high.read('romcnt'),1n);assert.equal(f.high.read('tmturn',3),1n);assert.equal(f.low.read('player'),0n);assert.equal(f.file.read('seed'),1n);
  const eager=fixture();eager.high.write('rom',0n);eager.b.io.or=function*(a,b){const left=yield*a(),right=yield*b();return left||right;};eager.run();assert.equal(eager.file.read('seed'),260543n);assert.ok(eager.b.events.includes('iran:5'));
});
test('ROMDRV main turn binding returns from a creation wait into source stardate accounting',()=>{
  const f=fixture();f.high.write('rom',0n);f.high.write('romopt',-1n);f.high.write('dotime',1n);f.high.write('numsid',1n,1);const before=f.high.read('shpcon',1,K.KNTURN);done(f.main.io.finishTurn(false));assert.ok(f.main.events.includes('romdrv'));assert.equal(f.high.read('tmturn',3),1n);assert.equal(f.low.read('player'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),before+1n);
});
test('ROMDRV nonreturning DIST stops after PLAYER and Romulan-turn stores',()=>{
  const f=fixture();f.b.io.dist=function*(){throw new Error('DIST transfer');};assert.throws(f.run,/DIST transfer/);assert.equal(f.high.read('romcnt'),1n);assert.equal(f.low.read('player'),0n);assert.equal(f.high.read('tmturn',3),1n);assert.equal(f.clock.length,2);assert.ok(!f.b.events.includes('timout:ROMDRV'));
});
test('ROMDRV point-blank phasers compose raw clocks, PHADAM, queue and all three defenses',()=>{
  const f=fixture();f.run();assert.deepEqual(f.b.calls,[[2n,6n,1n,200n,-1n]]);assert.equal(f.high.read('shpcon',6,K.KSDAM),14400n);assert.equal(f.high.read('shpcon',6,K.KSNRGY),35600n);assert.equal(f.high.read('rsr',K.KPEDAM),14400n);assert.equal(f.high.read('rppaus'),3500n);assert.equal(f.high.read('rtpaus'),2000n);assert.equal(f.m.read(f.b.s.id),1n);assert.equal(f.m.read(f.b.s.phit),77n);assert.equal(f.high.read('hitflg',6),1n);assert.equal(f.clock.length,0);assert.equal(f.damage.draws.length,0);assert.equal(f.file.read('seed'),260543n);assert.equal(f.r.s,f.s.initialStackWord);
  assert.deepEqual(f.b.events.filter(x=>x.startsWith('timin:')||x.startsWith('timout:')),['timin:ROMDRV','timout:ROMDRV','timin:BASPHA','timout:BASPHA','timin:PLNATK','timout:PLNATK','timin:BASBLD','timout:BASBLD']);
  f.m.write(f.getHit.player,6n);done(f.getHit.run());assert.equal(f.hit.dispfr,500n);assert.equal(f.hit.dispto,206n);assert.equal(f.hit.ihita,14400n);
});
test('ROMDRV bank-wait return retains counter after target coordinates and clock assignment',()=>{
  const f=fixture();target(f);f.high.write('rppaus',1001n);f.run();assert.equal(f.high.read('romcnt'),1n);assert.equal(f.m.read(f.b.locals.i),11n);assert.equal(f.m.read(f.b.locals.j),20n);assert.equal(f.m.read(f.b.locals.ctime),1000n);assert.equal(f.clock.length,1);assert.equal(f.file.read('seed'),1n);assert.equal(f.main.defenses.hits.length,0);
});
for(const [rt,rp,pick,expected] of [[2000n,1000n,0n,'torp'],[1000n,2000n,0n,'torp'],[1000n,999n,0n,'pha'],[999n,999n,1n,'torp'],[999n,999n,2n,'pha'],[999n,999n,3n,'pha']] as const)test(`ROMDRV strict bank selection ${rt}/${rp} with draw ${pick}`,()=>{
  const f=fixture();target(f);f.high.write('rtpaus',rt);f.high.write('rppaus',rp);let selected='';f.b.io.iran=function*(n){return n===2?pick:2n;};f.b.io.romstr=function*(){};f.b.io.romtor=function*(){selected='torp';};f.b.io.phadam=function*(){selected='pha';};f.run();assert.equal(selected,expected);assert.equal(f.high.read('romcnt'),0n);
});
test('ROMDRV torpedo call receives original CHKOUT words as live direction actuals',()=>{
  const f=fixture();target(f);f.high.write('rppaus',1000n);f.b.io.romstr=function*(v,h){assert.equal(v,f.b.locals.i);assert.equal(h,f.b.locals.j);f.m.write(v,13n);f.m.write(h,24n);};f.b.io.romtor=function*(dv,dh){assert.equal(dv,f.out.address('h1'));assert.equal(dh,f.out.address('v1'));assert.equal(f.m.read(dv),3n);assert.equal(f.m.read(dh),4n);f.m.write(dv,777n);yield 'torpedo';};const g=f.b.run();assert.equal(g.next().value,'torpedo');assert.equal(f.out.read('h1'),777n);done(g);
});
test('ROMDRV target branch stays selected while IPLACE and NPLC remain live between coordinate stores',()=>{
  const f=fixture();target(f);f.high.write('shpcon',44n,7,K.KHPOS);f.high.write('rppaus',1001n);const assign=f.b.io.assign;f.b.io.assign=function*(a,e){yield*assign(a,e);if(a()===f.b.locals.i){f.m.write(f.b.locals.iplace,7n);f.m.write(f.b.locals.nplc,4n);}};f.run();assert.equal(f.m.read(f.b.locals.i),11n);assert.equal(f.m.read(f.b.locals.j),44n);
});
test('ROMDRV actual ID may alias PHIT and receives PDIST only on the phaser path',()=>{const f=fixture();target(f);done(f.b.run(f.b.s.phit,f.b.s.phit));assert.equal(f.m.read(f.b.s.phit),1n);assert.equal(f.m.read(f.b.s.id),88n);});
test('ROMDRV spawn PLACE failure follows counter reset but precedes ROM and energy stores',()=>{
  const f=fixture();f.high.write('rom',0n);f.high.write('romcnt',5n);f.b.io.place=function*(){throw new Error('PLACE transfer');};assert.throws(f.run,/PLACE transfer/);assert.equal(f.high.read('romcnt'),0n);assert.equal(f.high.read('rom'),0n);assert.equal(f.high.read('erom'),300n);assert.equal(f.file.read('seed'),260543n);assert.equal(f.high.read('tmturn',3),1n);
});
test('ROMDRV spawn preserves 501 placement request, caller coordinates, notification and distant return',()=>{
  const f=fixture();f.high.write('rom',0n);f.high.write('romcnt',5n);target(f,99n);const draws=[1n,50n,2n];f.b.io.iran=function*(){return draws.shift()!;};f.b.io.place=function*(code,count,v,h){assert.equal(code,501);assert.equal(count,1);assert.equal(v,f.high.address('locr',K.KVPOS));assert.equal(h,f.high.address('locr',K.KHPOS));f.m.write(v,30n);f.m.write(h,30n);f.views.high.board.setdsp(30,30,code);};f.low.write('pasflg',-1n);f.run();assert.equal(f.high.read('rom'),-1n);assert.equal(f.high.read('erom'),250n);assert.equal(f.high.read('numrom'),1n);assert.equal(f.views.high.board.disp(30,30),501);assert.equal(f.main.defenses.hits[0].iwhat,11n);assert.equal(f.main.defenses.hits[0].dbits,1n);assert.equal(f.high.read('rppaus'),0n);assert.equal(f.clock.length,2);
});
test('ROMDRV spawn speech transfer happens after appearance publication and before DIST',()=>{
  const f=fixture();f.high.write('rom',0n);f.high.write('romcnt',5n);const draws=[1n,50n,1n];f.b.io.iran=function*(){return draws.shift()!;};f.b.io.place=function*(){};f.b.io.tell=function*(){throw new Error('speech transfer');};assert.throws(f.run,/speech transfer/);assert.equal(f.main.defenses.hits.length,1);assert.equal(f.high.read('rom'),-1n);assert.equal(f.clock.length,2);
});
test('ROMDRV successful movement composes raw CHECK and board stores before rereading DIST',()=>{
  const f=fixture();f.views.high.board.setdsp(11,20,0);f.high.write('shpcon',20n,6,K.KVPOS);f.views.high.board.setdsp(20,20,206);let scans=0;f.b.io.dist=function*(ip,np,num){f.m.write(ip,6n);f.m.write(np,2n);f.m.write(num,scans++?99n:10n);};f.run();assert.equal(f.high.read('locr',K.KVPOS),14n);assert.equal(f.high.read('locr',K.KHPOS),20n);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.views.high.board.disp(14,20),500);assert.equal(f.high.read('romcnt'),0n);assert.equal(scans,2);assert.equal(f.clock.length,2);assert.equal(f.m.read(f.b.locals.vt),9n);assert.equal(f.m.read(f.b.locals.l),4n);
});
test('ROMDRV collision tests vertical then horizontal detours using source dummy coordinate 5',()=>{
  const f=fixture();let scans=0;f.b.io.dist=function*(ip,np,num){f.m.write(ip,6n);f.m.write(np,2n);f.m.write(num,scans++?99n:2n);};f.b.io.check=function*(){f.out.write('h1',11n);f.out.write('v1',20n);f.out.write('dcode',900n);};f.run();assert.equal(f.high.read('locr',K.KVPOS),11n);assert.equal(f.high.read('locr',K.KHPOS),19n);assert.deepEqual(f.b.events.filter(e=>e.startsWith('ingal:')),['ingal:10,5','ingal:5,19']);assert.equal(f.m.read(f.b.locals.i1),1n);
});
test('ROMDRV privileged movement report uses raw ODISP and PRLOC after the second DIST',()=>{
  const f=fixture();f.low.write('pasflg',-1n);let scans=0;f.b.io.dist=function*(ip,np,num){f.m.write(ip,6n);f.m.write(np,2n);f.m.write(num,scans++?99n:2n);};f.b.io.check=function*(){f.out.write('h1',15n);f.out.write('v1',25n);f.out.write('dcode',0n);};f.run();assert.ok(f.output().includes(messages.romadv.text));assert.ok(f.output().startsWith('?? '));assert.ok(f.output().includes('15-25'));assert.equal(f.high.read('romcnt'),0n);
});
test('ROMDRV PHADAM failure leaves metadata and ID without publication or recharge',()=>{
  const f=fixture();target(f);f.b.io.phadam=function*(){throw new Error('phaser fault');};assert.throws(f.run,/phaser fault/);assert.equal(f.low.read('shstfr'),300n);assert.equal(f.low.read('shcnfr'),1n);assert.equal(f.m.read(f.b.s.id),1n);assert.equal(f.high.read('rppaus'),0n);assert.equal(f.main.defenses.hits.length,0);assert.ok(!f.b.events.includes('timout:ROMDRV'));
});
test('ROMDRV post-hit clock failure retains published hit but not a recharge store',()=>{
  const f=fixture();target(f);f.clock.splice(1);assert.throws(f.run,/unscheduled MSTIME/);assert.equal(f.high.read('hitflg',6),1n);assert.equal(f.high.read('rppaus'),0n);assert.equal(f.main.defenses.hits.length,1);assert.ok(!f.b.events.includes('baspha'));
});
test('ROMDRV recharge expression reads SLWEST after the elapsed call resumes',()=>{
  const f=fixture();target(f);const etim=f.b.io.etim;let calls=0;f.b.io.etim=function*(a){const t=yield*etim(a);if(++calls===2)yield 'recharge';return t;};const g=f.b.run();assert.equal(g.next().value,'recharge');assert.equal(f.high.read('rppaus'),0n);f.high.write('slwest',3n);done(g);assert.equal(f.high.read('rppaus'),5000n);
});
test('ROMDRV count arithmetic follows explicit wrapping before throttle comparison',()=>{const f=fixture();f.high.write('romcnt',MAX_INTEGER);f.run();assert.equal(f.high.read('romcnt'),MIN_INTEGER);assert.equal(f.low.read('player'),-1n);assert.equal(f.high.read('tmturn',3),0n);});
function baseTarget(f:ReturnType<typeof fixture>,strength:bigint){
  target(f,1n,3n,1n);f.high.write('base',11n,1,K.KVPOS,1);f.high.write('base',20n,1,K.KHPOS,1);f.high.write('base',strength,1,3,1);f.views.high.board.setdsp(11,20,301);
  for(const i of [1,2]){f.high.write('alive',-1n,i);f.high.write('shpcon',30n,i,K.KVPOS);f.high.write('shpcon',30n+BigInt(i),i,K.KHPOS);}
  f.high.write('nomsg',f.high.read('bits',1));
}
test('ROMDRV full base warning precedes actual phaser damage and honors NOMSG',()=>{
  const f=fixture();baseTarget(f,1000n);f.run();const hits=f.main.defenses.hits;
  assert.deepEqual(hits.map(h=>h.iwhat),[9n,1n]);assert.equal(hits[0].dispto,301n);assert.equal(hits[0].dispfr,500n);assert.equal(hits[0].dbits,f.high.read('bits',2));assert.equal(hits[0].vto,11n);assert.equal(hits[0].hto,20n);
  assert.equal(f.high.read('base',1,3,1),799n);assert.equal(hits[1].ihita,0n);assert.equal(hits[1].shstto,783n);assert.equal(f.high.read('rppaus'),3500n);
});
test('ROMDRV destroyed base report follows PHADAM, board removal, hit publication and recharge',()=>{
  const f=fixture();baseTarget(f,10n);f.high.write('nbase',1n,1);f.damage.draws.push('0');f.run();const hits=f.main.defenses.hits;
  assert.deepEqual(hits.map(h=>h.iwhat),[1n,10n]);assert.equal(hits[0].ihita,7128n);assert.equal(hits[0].klflg,2n);assert.equal(hits[1].dispto,301n);assert.equal(hits[1].dbits,f.high.read('bits',2));assert.equal(hits[1].dispfr,0n);
  assert.equal(f.high.read('base',1,3,1),0n);assert.equal(f.high.read('nbase',1),0n);assert.equal(f.views.high.board.disp(11,20),0);assert.equal(f.high.read('rsr',K.KPBDAM),17128n);assert.equal(f.high.read('rppaus'),3500n);assert.equal(f.damage.draws.length,0);
});
test('ROMDRV relocation passes coordinate variable addresses through the raw SETDSP binding',()=>{
  const f=fixture();let scans=0;f.b.io.dist=function*(ip,np,num){f.m.write(ip,6n);f.m.write(np,2n);f.m.write(num,scans++?99n:2n);};f.b.io.check=function*(){f.out.write('h1',15n);f.out.write('v1',25n);f.out.write('dcode',0n);};
  const setdsp=f.b.io.setdsp;const actuals:bigint[][]=[];f.b.io.setdsp=function*(v,h,code){assert.ok(v.address);assert.ok(h.address);actuals.push([v.address(),h.address()]);const unevaluated=function*():Generator<string,bigint,void>{throw new Error('variable actual copied into expression temporary');};yield*setdsp(Object.assign(unevaluated.bind(null),{address:v.address}),Object.assign(unevaluated.bind(null),{address:h.address}),code);};
  f.run();assert.deepEqual(actuals,[[f.high.address('locr',K.KVPOS),f.high.address('locr',K.KHPOS)],[f.b.locals.i,f.b.locals.j]]);assert.equal(f.views.high.board.disp(15,25),500);assert.equal(f.high.read('locr',K.KVPOS),15n);
});
