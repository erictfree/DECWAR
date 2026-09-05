import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<20000;i++){const s=g.next();if(s.done)return s.value;}throw new Error('test schedule exhausted');}
function fixture(){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),r=main.romulan.torpedoes,b=r.nova;
  f.views.high.board.setdsp(10,20,0); // Remove the parent fixture's unrelated ship.
  for(const [key,w] of [['who',1n],['team',1n],['player',-1n],['hungup',0n],['hcpos',0n],['blank',0n],['oflg',0n],['ocflg',BigInt(K.KABS)],['klflg',0n],['dispfr',0n],['iwhat',0n]] as const)f.low.write(key,w);
  for(const [key,w] of [['rom',-1n],['erom',1001n],['nplnet',3n],['endflg',0n],['dead',0n],['nomsg',0n],['slwest',2n],['rtpaus',77n],['tim0',0n]] as const)f.high.write(key,w);
  for(let i=1;i<=K.KNPLAY;i++){
    f.high.write('alive',0n,i);f.high.write('hitflg',0n,i);f.high.write('trstat',0n,i);f.high.write('docked',0n,i);
    Object.assign(f.views.high.players[i].ship,{v:50,h:50,energy:50000n,damage:0n,shieldStrength:1000n,shieldCondition:-1n});
    for(let d=1;d<=K.KNDEV;d++)f.high.write('shpdam',0n,i,d);
  }
  for(let team=1;team<=2;team++){f.high.write('nbase',1n,team);f.high.write('numcap',0n,team);for(let j=1;j<=K.KNBASE;j++)f.high.write('base',0n,j,3,team);}
  f.high.write('locr',20n,K.KVPOS);f.high.write('locr',30n,K.KHPOS);f.views.high.board.setdsp(20,30,500);
  f.out.write('h2',11n);f.out.write('v2',20n);f.out.write('h1',12n);f.out.write('v1',20n);f.out.write('dhs',f.realWord('1'));f.out.write('dvs',f.realWord('0'));
  f.m.write(b.s.kind,2n);f.m.write(b.s.index,6n);f.file.write('seed',1n);f.damage.draws.length=0;f.damage.integers.length=0;f.clock.splice(0,f.clock.length,1000n);
  const ship=(i=6,v=12,h=20)=>{Object.assign(f.views.high.players[i].ship,{v,h});f.high.write('alive',-1n,i);f.views.high.board.setdsp(v,h,(i<=5?100:200)+i);};
  const planet=(i:number,v:number,h:number,builds:bigint,code=600+i)=>{f.high.write('locpln',BigInt(v),i,K.KVPOS);f.high.write('locpln',BigInt(h),i,K.KHPOS);f.high.write('locpln',builds,i,3);f.views.high.board.setdsp(v,h,code);};
  const ints=(...draws:bigint[])=>{b.io.iran=function*(max){b.events.push('iran:'+max);assert.ok(draws.length,'unscheduled NOVA IRAN');return draws.shift()!;};return draws;};
  const shipDraws=(device='0',energy='0',hit=1n)=>{f.damage.draws.push(...Array(K.KNDEV).fill(device),energy);ints(hit);};
  return {...f,main,r,b,ship,planet,ints,shipDraws,run:(kind=2n,index=6n)=>{f.m.write(b.s.kind,kind);f.m.write(b.s.index,index);done(b.run());},explode:()=>done(b.supernova())};
}

test('SNOVA main binding resets only pointers, clears the star and retains physical stack words',()=>{
  const f=fixture();f.views.high.board.setdsp(11,20,900);f.explode();assert.equal(f.views.high.board.disp(11,20),0);assert.equal(f.m.read(f.b.superLocals.objptr),0n);assert.equal(f.m.read(f.b.superLocals.strptr),0n);for(let i=0n;i<192n;i++)assert.equal(f.m.read(f.b.stack.base+i),77n);assert.equal(f.main.defenses.hits.length,0);
});
test('SNOVA raw board traversal pops victims LIFO with integer-to-REAL displacement stores',()=>{
  const f=fixture();f.views.high.board.setdsp(10,19,101);f.views.high.board.setdsp(10,21,206);f.views.high.board.setdsp(12,21,601);const calls:unknown[][]=[];
  f.b.superIO.nova=function*(kind,index){calls.push([yield*kind.evaluate(),yield*index.evaluate(),f.out.read('h1'),f.out.read('v1'),f.realAt(f.out.address('dhs')),f.realAt(f.out.address('dvs'))]);};f.explode();
  const q=(n:bigint)=>({n,d:1n});assert.deepEqual(calls,[[6n,1n,12n,21n,q(1n),q(1n)],[2n,6n,10n,21n,q(-1n),q(1n)],[1n,1n,10n,19n,q(-1n),q(-1n)]]);assert.equal(f.m.read(f.b.superLocals.v),13n);assert.equal(f.m.read(f.b.superLocals.h),22n);
});
test('SNOVA rereads pending victim identities after a suspended NOVA changes the board',()=>{
  const f=fixture();f.views.high.board.setdsp(10,19,601);f.views.high.board.setdsp(10,21,602);f.views.high.board.setdsp(12,21,603);const ids:bigint[]=[];
  f.b.superIO.nova=function*(_kind,index){ids.push(yield*index.evaluate());yield 'victim';};const g=f.b.supernova();assert.equal(g.next().value,'victim');f.views.high.board.setdsp(10,21,601);f.views.high.board.setdsp(10,19,-1);done(g);assert.deepEqual(ids,[3n,1n]);
});
test('SNOVA queued stars clear immediately and announce LIFO through raw MAKHIT',()=>{
  const f=fixture();f.views.high.board.setdsp(10,20,900);f.views.high.board.setdsp(11,21,900);f.b.superIO.iran=function*(max){assert.equal(max,5);return 1n;};const hit=f.b.superIO.makhit;
  f.b.superIO.makhit=function*(){assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.views.high.board.disp(11,21),0);yield*hit();};f.explode();assert.deepEqual(f.main.defenses.hits.map(h=>[h.iwhat,h.vfrom,h.hfrom]),[[7n,11n,21n],[7n,10n,20n]]);assert.equal(f.low.read('tpoint',K.KNSDES),-1000n);assert.equal(f.high.read('rsr',K.KNSDES),0n);
});
test('SNOVA explicit short-circuit OR skips empty-cell draws while eager OR changes the seed schedule',()=>{
  const a=fixture(),b=fixture();a.explode();assert.equal(a.file.read('seed'),1n);
  b.b.superIO.or=function*(...terms){let result=false;for(const term of terms){const next=yield*term();result=result||next;}return result;};b.explode();assert.equal(b.b.events.filter(e=>e==='iran:5').length,9);assert.notEqual(b.file.read('seed'),1n);
});
test('SNOVA random exclusion 5 retains the star without a hit or penalty',()=>{
  const f=fixture();f.views.high.board.setdsp(10,20,900);let count=0;f.b.superIO.iran=function*(){count++;return 5n;};f.explode();assert.equal(count,1);assert.equal(f.views.high.board.disp(10,20),900);assert.equal(f.low.read('tpoint',K.KNSDES),0n);assert.equal(f.main.defenses.hits.length,0);
});
test('SNOVA pending-star limit remains 29 and consumes IRAN before the capacity check',()=>{
  const f=fixture();f.out.write('h2',15n);f.out.write('v2',15n);for(let v=8;v<=23;v++)for(let h=8;h<=23;h++)f.views.high.board.setdsp(v,h,900);let peak=0n,atCapacity=0;
  f.b.superIO.iran=function*(){const ptr=f.m.read(f.b.superLocals.strptr);if(ptr>peak)peak=ptr;if(ptr===29n)atCapacity++;return 1n;};f.b.superIO.pridis=function*(){};f.b.superIO.makhit=function*(){};f.explode();assert.equal(peak,29n);assert.ok(atCapacity>0);assert.equal(f.b.stack.read('strstk',30,1),77n);assert.equal(f.b.stack.read('strstk',30,2),77n);
});
test('SNOVA center repopulation exposes ninth-victim physical column aliases',()=>{
  const f=fixture(),clear=f.b.superIO.setdsp;for(let v=10;v<=12;v++)for(let h=19;h<=21;h++)f.views.high.board.setdsp(v,h,101);
  f.b.superIO.setdsp=function*(...a){yield*clear(...a);f.views.high.board.setdsp(11,20,101);};f.b.superIO.disp=function*(){return 0n;};f.explode();assert.equal(f.b.stack.read('objstk',1,2),12n);assert.equal(f.b.stack.read('objstk',1,3),21n);assert.equal(f.b.stack.read('strstk',1,1),1n);
});
test('SNOVA corner scan captures bounded DO limits and preserves post-loop values',()=>{
  const f=fixture();f.out.write('h2',1n);f.out.write('v2',1n);f.explode();assert.equal(f.b.events.filter(e=>e==='dispc').length,4);assert.equal(f.m.read(f.b.superLocals.v),3n);assert.equal(f.m.read(f.b.superLocals.h),3n);
});
test('SNOVA score selection rereads PLAYER after hit publication suspends',()=>{
  const f=fixture();f.views.high.board.setdsp(10,20,900);f.b.superIO.iran=function*(){return 1n;};const hit=f.b.superIO.makhit;f.b.superIO.makhit=function*(){yield*hit();yield 'hit';};const g=f.b.supernova();assert.equal(g.next().value,'hit');assert.equal(f.low.read('tpoint',K.KNSDES),0n);f.low.write('player',0n);done(g);assert.equal(f.high.read('rsr',K.KNSDES),-500n);
});
test('SNOVA composes NOVA device damage, JUMP, raw hit queue and original OUTHIT output',()=>{
  const f=fixture();f.ship();f.shipDraws('.25','.5',100n);f.explode();assert.deepEqual(f.b.calls,[[2n,6n]]);assert.equal(f.high.read('shpcon',6,K.KSDAM),8100n);assert.equal(f.high.read('shpcon',6,K.KSNRGY),45950n);assert.equal(f.high.read('shpcon',6,K.KVPOS),13n);for(let i=1;i<=K.KNDEV;i++)assert.equal(f.high.read('shpdam',6,i),1000n);assert.equal(f.low.read('tpoint',K.KPEDAM),8100n);assert.equal(f.damage.draws.length,0);
  f.low.write('who',6n);f.low.write('team',2n);const start=f.text().length;done(f.outHit.run());assert.equal(f.text().slice(start),'* @11-20  810.0 unit N  C -->13-20, -100.0%\r\n');
});
for(const shield of [800n,801n])test(`NOVA shield ${shield} preserves the discontinuous D floor`,()=>{
  const f=fixture();f.ship();f.high.write('shpcon',1n,6,K.KSHCON);f.high.write('shpcon',shield,6,K.KSSHPC);f.shipDraws();f.ints(1n,50n);f.run();const d=shield===800n?200n:250n;assert.equal(f.m.read(f.b.locals.d),d);assert.equal(f.high.read('shpcon',6,K.KSDAM),8n*d+1n);assert.equal(f.high.read('shpcon',6,K.KSSHPC),shield-250n);
});
test('NOVA critical shield device disables shields before the shield-loss random branch',()=>{
  const f=fixture();f.ship();f.high.write('shpcon',1n,6,K.KSHCON);f.high.write('shpdam',BigInt(K.KCRIT),6,K.KDSHLD);f.shipDraws();f.run();assert.equal(f.high.read('shpcon',6,K.KSHCON),-1n);assert.ok(!f.b.events.includes('iran:100'));
});
for(const [player,kind,damage,kills] of [[-1n,2n,8001n,5000n],[-1n,1n,-8001n,-5000n],[0n,2n,8001n,5000n]])test(`NOVA death scoring player=${player} kind=${kind} uses direct team/RSR words`,()=>{
  const f=fixture();f.ship();f.low.write('player',player);f.high.write('alive',0n,6);f.high.write('shpcon',1n,6,K.KSNRGY);f.shipDraws('0','1');f.run(kind);assert.equal(f.views.high.board.disp(12,20),0);assert.equal(f.high.read('alive',6),0n);assert.equal(f.main.defenses.hits[0].klflg,2n);assert.equal(f.low.read('tpoint',K.KPEKIL),0n);
  assert.equal(player<0n?f.low.read('tpoint',K.KPEDAM):f.high.read('rsr',K.KPEDAM),damage);assert.equal(player<0n?f.high.read('tmscor',1,K.KPEKIL):f.high.read('rsr',K.KPEKIL),kills);
});
test('NOVA black-hole JUMP retains old stored coordinates in the later hit record',()=>{
  const f=fixture();f.ship();f.views.high.board.setdsp(13,20,1000);f.shipDraws();f.run();const hit=f.main.defenses.hits[0];assert.equal(hit.klflg,1n);assert.equal(hit.shjump,1n);assert.equal(hit.vto,12n);assert.equal(f.high.read('tmscor',1,K.KPEKIL),5000n);
});
test('NOVA composes tractor release after the damage notification',()=>{
  const f=fixture();f.ship();f.high.write('trstat',1n,6);f.high.write('trstat',6n,1);f.shipDraws();f.run();assert.equal(f.high.read('trstat',6),0n);assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('hitflg',6),2n);f.m.write(f.getHit.player,6n);done(f.getHit.run());assert.equal(f.hit.iwhat,8n);done(f.getHit.run());assert.equal(f.hit.iwhat,14n);
});
test('NOVA full-base distress clears IHITA before damage and recomputes the star origin',()=>{
  const f=fixture();Object.assign(f.views.high.bases[2][1],{v:12,h:20,strength:1000n});f.views.high.board.setdsp(12,20,401);f.ints(1n,50n);f.run(4n,1n);assert.equal(f.high.read('base',1,3,2),750n);assert.equal(f.high.read('base',1,K.KVPOS,2),13n);assert.deepEqual(f.main.defenses.hits.map(h=>[h.iwhat,h.ihita,h.vfrom]),[[9n,2001n,11n],[8n,0n,11n]]);assert.equal(f.low.read('tpoint',K.KPBDAM),2001n);
});
test('NOVA base destruction announces before board clearing and composes actual BASKIL',()=>{
  const f=fixture();Object.assign(f.views.high.bases[2][1],{v:12,h:20,strength:100n});f.views.high.board.setdsp(12,20,401);f.ints(1n,1n);const baskil=f.b.io.baskil;f.b.io.baskil=function*(a){assert.equal(a,f.b.locals.jbase);assert.equal(f.high.read('nbase',2),0n);assert.equal(f.views.high.board.disp(12,20),401);yield*baskil(a);};f.run(4n,1n);assert.equal(f.views.high.board.disp(12,20),0);assert.equal(f.low.read('tpoint',K.KPBDAM),17201n);assert.deepEqual(f.main.defenses.hits.map(h=>[h.iwhat,h.dispfr,h.ihita]),[[8n,900n,7201n],[10n,900n,0n]]);
});
test('NOVA Romulan survival uses actual JUMP, halves energy and consumes no random draw',()=>{
  const f=fixture();f.run(5n,0n);assert.equal(f.high.read('erom'),500n);assert.equal(f.high.read('locr',K.KVPOS),21n);assert.equal(f.low.read('tpoint',K.KPRKIL),500n);assert.equal(f.file.read('seed'),1n);assert.equal(f.views.high.board.disp(21,30),501);assert.equal(f.main.defenses.hits[0].dispto,500n);
});
test('NOVA actual Romulan black-hole death skips halving and charges RSR after the hit',()=>{
  const f=fixture();f.low.write('player',0n);f.views.high.board.setdsp(21,30,1000);f.run(5n,1n);assert.equal(f.high.read('rom'),0n);assert.equal(f.high.read('erom'),1001n);assert.equal(f.high.read('rsr',K.KPRKIL),-6001n);assert.equal(f.main.defenses.hits[0].klflg,1n);assert.equal(f.main.defenses.hits[0].vto,20n);
});
test('NOVA failed planet lock retains metadata but makes no damage or unlock',()=>{
  const f=fixture();f.planet(1,12,20,5n);f.b.io.lockPlanet=function*(){f.low.write('lkfail',-1n);yield 'lock';};const g=f.b.run();f.m.write(f.b.s.kind,6n);f.m.write(f.b.s.index,1n);assert.equal(g.next().value,'lock');assert.equal(f.low.read('iwhat'),8n);done(g);assert.equal(f.high.read('locpln',1,3),5n);assert.equal(f.main.defenses.hits.length,0);assert.ok(!f.b.events.includes('unlock'));
});
test('NOVA zero-build planet survives and unlocks after publication',()=>{
  const f=fixture();f.planet(1,12,20,3n);f.run(6n,1n);assert.equal(f.high.read('locpln',1,3),0n);assert.equal(f.high.read('nplnet'),3n);assert.ok(f.b.events.indexOf('makhit')<f.b.events.indexOf('unlock'));assert.equal(f.main.defenses.hits[0].klflg,0n);
});
test('SNOVA planet destruction composes PLNRMV compaction before popping the next victim',()=>{
  const f=fixture();f.planet(1,10,19,2n);f.planet(2,10,21,2n);f.planet(3,12,21,2n);f.explode();assert.deepEqual(f.b.calls,[[6n,3n],[6n,2n],[6n,1n]]);assert.equal(f.high.read('nplnet'),0n);assert.equal(f.low.read('tpoint',K.KNPDES),-3000n);assert.equal(f.main.defenses.hits.length,3);for(const h of f.main.defenses.hits)assert.equal(h.klflg,2n);assert.equal(f.b.events.filter(x=>x==='unlock').length,3);
});
test('NOVA planet ownership and builds are reread after raw notification returns',()=>{
  const f=fixture();f.planet(1,12,20,2n);f.planet(2,40,40,5n);f.planet(3,41,41,5n);f.high.write('numcap',1n,2);f.low.write('player',0n);const hit=f.b.io.makhit;
  f.b.io.makhit=function*(){yield*hit();f.views.high.board.setdsp(12,20,801);};f.run(6n,1n);assert.equal(f.m.read(f.b.locals.pteam),2n);assert.equal(f.high.read('numcap',2),0n);assert.equal(f.high.read('rsr',K.KNPDES),-1000n);assert.equal(f.high.read('nplnet'),2n);assert.equal(f.views.high.board.disp(40,40),601);
});
test('NOVA healed planet after suspended notification skips removal despite published kill',()=>{
  const f=fixture();f.planet(1,12,20,2n);const hit=f.b.io.makhit;f.b.io.makhit=function*(){yield*hit();yield 'hit';};f.m.write(f.b.s.kind,6n);f.m.write(f.b.s.index,1n);const g=f.b.run();assert.equal(g.next().value,'hit');f.high.write('locpln',1n,1,3);done(g);assert.equal(f.high.read('nplnet'),3n);assert.equal(f.low.read('tpoint',K.KNPDES),0n);assert.equal(f.main.defenses.hits[0].klflg,2n);
});
test('NOVA final-planet ENDGAM transfer occurs after its hit and before unlocking',()=>{
  const f=fixture();f.planet(1,12,20,2n);f.high.write('nplnet',1n);f.high.write('nbase',0n,1);f.r.removal.killHigh.policy.open=false;
  const hit=f.b.io.makhit;f.b.io.makhit=function*(){yield*hit();f.low.write('who',0n);};assert.throws(()=>f.run(6n,1n),/fixture EXIT transfer/);assert.equal(f.main.defenses.hits[0].klflg,2n);assert.equal(f.high.read('endflg'),-1n);assert.equal(f.high.read('nplnet'),0n);assert.equal(f.views.high.board.disp(12,20),0);assert.ok(!f.b.events.includes('unlock'));
});
test('ROMTOR enters actual SNOVA/NOVA ship damage then retargets and recharges',()=>{
  const f=fixture();f.low.write('player',0n);f.views.high.board.setdsp(11,20,900);f.ship();f.damage.draws.push('.5','.5');f.shipDraws();const draws=[1n,80n];f.r.io.iran=function*(){return draws.shift()!;};f.r.io.check=function*(){f.out.write('dcode',900n);f.out.write('h2',11n);f.out.write('v2',20n);};f.r.io.dist=function*(_i,_k,n){f.m.write(n,99n);};done(f.r.run());assert.deepEqual(f.main.defenses.hits.map(h=>h.iwhat),[7n,8n]);assert.equal(f.high.read('rsr',K.KNSDES),-500n);assert.equal(f.high.read('rsr',K.KPEDAM),8001n);assert.equal(f.high.read('shpcon',6,K.KVPOS),13n);assert.equal(f.high.read('rtpaus'),4000n);assert.equal(f.damage.draws.length,0);
});
test('NOVA integer damage draw consumes the shared raw IRAN seed',()=>{
  const f=fixture();f.ship();f.damage.draws.push(...Array(K.KNDEV+1).fill('0'));f.run();assert.equal(f.file.read('seed'),260543n);assert.equal(f.high.read('shpcon',6,K.KSDAM),8014n);assert.equal(f.low.read('tpoint',K.KPEDAM),8014n);assert.equal(f.main.defenses.hits[0].ihita,8014n);
});
test('NOVA suspended device draw retains preceding writes and the live J argument',()=>{
  const f=fixture();f.ship();f.ship(7,30,30);const ran=f.b.io.ran;f.damage.draws.push('.25',...Array(K.KNDEV).fill('0'));f.ints(1n);let draws=0;
  f.b.io.ran=function*(z){if(++draws===2)yield 'draw';return yield*ran(z);};const g=f.b.run();assert.equal(g.next().value,'draw');assert.equal(f.high.read('shpdam',6,1),1000n);assert.equal(f.high.read('shpcon',6,K.KSDAM),0n);f.m.write(f.b.s.index,7n);done(g);assert.equal(f.high.read('shpcon',6,K.KSDAM),0n);assert.equal(f.high.read('shpcon',7,K.KSDAM),8001n);assert.equal(f.main.defenses.hits[0].dispto,207n);
});
test('SNOVA REAL conversion suspension preserves earlier CHKOUT stores before pointer decrement',()=>{
  const f=fixture();f.views.high.board.setdsp(12,21,601);const assign=f.b.superIO.assign;f.b.superIO.assign=function*(a,type,e){if(a()===f.out.address('dhs'))yield 'conversion';yield*assign(a,type,e);};f.b.superIO.nova=function*(){};const g=f.b.supernova();assert.equal(g.next().value,'conversion');assert.equal(f.out.read('h1'),12n);assert.equal(f.out.read('v1'),21n);assert.equal(f.m.read(f.b.superLocals.objptr),1n);done(g);assert.equal(f.m.read(f.b.superLocals.objptr),0n);assert.deepEqual(f.realAt(f.out.address('dvs')),{n:1n,d:1n});
});
test('SNOVA failed initial SETDSP leaves both saved stack pointers untouched',()=>{
  const f=fixture();f.m.write(f.b.superLocals.objptr,5n);f.m.write(f.b.superLocals.strptr,8n);f.b.superIO.setdsp=function*(){throw new Error('board transfer');};assert.throws(f.explode,/board transfer/);assert.equal(f.m.read(f.b.superLocals.objptr),5n);assert.equal(f.m.read(f.b.superLocals.strptr),8n);
});
