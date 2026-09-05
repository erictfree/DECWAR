import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<3000;i++){const s=g.next();if(s.done)return s.value;}throw new Error('test schedule exhausted');}
function fixture(){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),b=main.romulan,p=b.placement;main.policy.debug='omit';
  f.file.write('seed',1n);f.m.write(p.s.object,900n);f.m.write(p.s.n,1n);
  f.high.write('nplnet',0n);for(let team=1;team<=2;team++){f.high.write('nbase',0n,team);f.high.write('numcap',0n,team);for(let i=1;i<=K.KNBASE;i++){f.high.write('base',70n,i,K.KVPOS,team);f.high.write('base',70n,i,K.KHPOS,team);f.high.write('base',0n,i,3,team);}}
  const schedule=(...values:bigint[])=>{const draws=[...values];p.io.iran=function*(max){assert.equal(max,75);assert.ok(draws.length,'unscheduled PLACE draw');const w=draws.shift()!;p.draws.push(w);return w;};return draws;};
  return {...f,main,b,p,schedule,run:()=>done(p.run())};
}
test('PLACE composes raw IRAN and board insertion using the shared SEED',()=>{
  const f=fixture();f.run();assert.deepEqual(f.p.draws,[39n,39n]);assert.equal(f.file.read('seed'),33522916481n);assert.equal(f.views.high.board.disp(39,39),900);assert.equal(f.m.read(f.p.locals.k),2n);assert.equal(f.m.read(f.p.locals.i),77n);assert.equal(f.m.read(f.p.locals.pteam),77n);
});
test('PLACE retries occupied coordinates within K and preserves identical object codes for multiple placements',()=>{
  const f=fixture();f.m.write(f.p.s.object,901n);f.m.write(f.p.s.n,2n);f.views.high.board.setdsp(2,3,800);f.schedule(2n,3n,4n,5n,6n,7n);const count=f.p.s.n,iran=f.p.io.iran;f.p.io.iran=function*(n){f.m.write(count,99n);return yield*iran(n);};f.run();assert.deepEqual(f.p.draws,[2n,3n,4n,5n,6n,7n]);assert.equal(f.views.high.board.disp(2,3),800);assert.equal(f.views.high.board.disp(4,5),901);assert.equal(f.views.high.board.disp(6,7),901);assert.equal(f.m.read(f.p.locals.k),3n);assert.deepEqual([f.m.read(f.p.s.v),f.m.read(f.p.s.h)],[6n,7n]);
});
test('PLACE rejects a negative DISP result before object classification',()=>{
  const f=fixture();f.schedule(2n,3n,4n,5n);const disp=f.p.io.disp;let calls=0;f.p.io.disp=function*(v,h){return calls++===0?-1n:yield*disp(v,h);};f.run();assert.equal(f.views.high.board.disp(2,3),0);assert.equal(f.views.high.board.disp(4,5),900);assert.equal(f.m.read(f.p.locals.pteam),77n);
});
test('PLACE base exclusion scans all slots including zero-strength slot ten at inclusive radius four',()=>{
  const f=fixture();f.m.write(f.p.s.object,101n);f.high.write('nbase',1n,2);f.high.write('base',10n,10,K.KVPOS,2);f.high.write('base',10n,10,K.KHPOS,2);f.schedule(14n,14n,15n,15n);f.run();assert.equal(f.views.high.board.disp(14,14),0);assert.equal(f.views.high.board.disp(15,15),101);assert.equal(f.m.read(f.p.locals.pteam),2n);assert.equal(f.m.read(f.p.locals.i),11n);assert.equal(f.p.events.filter(x=>x.startsWith('ldis:')).length,20);
});
test('PLACE skips all stale base positions when the enemy base count is nonpositive',()=>{
  const f=fixture();f.m.write(f.p.s.object,201n);f.high.write('nbase',-1n,1);f.high.write('base',10n,1,K.KVPOS,1);f.high.write('base',10n,1,K.KHPOS,1);f.schedule(12n,12n);f.run();assert.equal(f.m.read(f.p.locals.pteam),1n);assert.equal(f.views.high.board.disp(12,12),201);assert.ok(!f.p.events.some(x=>x.startsWith('ldis:')));
});
for(const [code,used,last] of [[K.DXEPLN*100+1,2,12],[201,4,13]] as const)test(`PLACE planet code ${code} uses raw class comparison with PTEAM`,()=>{
  const f=fixture();f.m.write(f.p.s.object,101n);f.high.write('nplnet',1n);f.high.write('numcap',1n,2);f.high.write('locpln',10n,1,K.KVPOS);f.high.write('locpln',10n,1,K.KHPOS);f.views.high.board.setdsp(10,10,code);f.schedule(12n,12n,13n,13n);f.run();assert.equal(f.p.draws.length,used);assert.equal(f.views.high.board.disp(last,last),101);assert.equal(f.m.read(f.p.locals.i),2n);
});
test('PLACE planet OR policy controls whether NUMCAP is evaluated after NPLNET is zero',()=>{
  for(const eager of [false,true]){const f=fixture();f.m.write(f.p.s.object,101n);f.schedule(4n,5n);const read=f.m.read.bind(f.m),cap=f.high.address('numcap',2);let reads=0;f.m.read=a=>{if(a===cap)reads++;return read(a);};if(eager)f.p.io.or=function*(a,b){const left=yield*a(),right=yield*b();return left||right;};f.run();assert.equal(reads,eager?1:0);}
});
test('PLACE snapshots each planet DO limit even if DISPC changes NPLNET',()=>{
  const f=fixture();f.m.write(f.p.s.object,101n);f.high.write('nplnet',2n);f.high.write('numcap',1n,2);f.schedule(4n,5n);let calls=0;f.p.io.dispc=function*(){calls++;f.high.write('nplnet',0n);return 8n;};f.run();assert.equal(calls,2);assert.equal(f.m.read(f.p.locals.i),3n);assert.equal(f.high.read('nplnet'),0n);
});
test('PLACE V/H alias retains the second draw in both actual coordinates',()=>{
  const f=fixture();f.schedule(4n,5n);done(f.p.run({...f.p.s,h:f.p.s.v}));assert.equal(f.views.high.board.disp(5,5),900);assert.equal(f.m.read(f.p.s.v),5n);assert.equal(f.m.read(f.p.s.h),77n);
});
test('PLACE N/V alias retains the captured count while later draws overwrite N',()=>{
  const f=fixture();f.m.write(f.p.s.v,2n);f.schedule(3n,4n,5n,6n);done(f.p.run({...f.p.s,n:f.p.s.v}));assert.equal(f.views.high.board.disp(3,4),900);assert.equal(f.views.high.board.disp(5,6),900);assert.equal(f.m.read(f.p.s.v),5n);assert.equal(f.m.read(f.p.locals.k),3n);
});
test('PLACE OBJECT/V alias changes both classification and the eventual display code',()=>{
  const f=fixture();f.high.write('nbase',0n,3);f.schedule(5n,6n);done(f.p.run({...f.p.s,object:f.p.s.v}));assert.equal(f.m.read(f.p.locals.pteam),3n);assert.ok(f.p.events.includes('setdsp:5,6,5'));assert.equal(f.views.high.board.disp(5,6),5);
});
test('PLACE rereads OBJECT after DISP before classifying the successful coordinates',()=>{
  const f=fixture();f.schedule(4n,5n);const disp=f.p.io.disp;f.p.io.disp=function*(v,h){const code=yield*disp(v,h);f.m.write(f.p.s.object,201n);return code;};f.run();assert.equal(f.m.read(f.p.locals.pteam),1n);assert.equal(f.views.high.board.disp(4,5),201);
});
test('PLACE recomputes OBJECT division for PTEAM after the classification expression',()=>{
  const f=fixture();f.m.write(f.p.s.object,101n);f.schedule(4n,5n);const integer=f.p.io.integer;let divisions=0;f.p.io.integer=function*(op,a,b){const value=yield*integer(op,a,b);if(op==='div'&&++divisions===1)f.m.write(f.p.s.object,201n);return value;};f.run();assert.equal(divisions,2);assert.equal(f.m.read(f.p.locals.pteam),1n);assert.equal(f.views.high.board.disp(4,5),201);
});
test('PLACE signed integer division preserves truncation toward zero and physical team aliases',()=>{
  const f=fixture();f.m.write(f.p.s.object,-99n);f.high.write('nbase',0n,3);f.schedule(4n,5n);f.p.io.setdsp=function*(v,h,object){assert.deepEqual([f.m.read(v),f.m.read(h),f.m.read(object)],[4n,5n,-99n]);};f.run();assert.equal(f.m.read(f.p.locals.pteam),3n);
});
test('PLACE nonpositive count uses the explicit compiler DO entry policy',()=>{
  const f=fixture();f.m.write(f.p.s.n,0n);f.run();assert.equal(f.m.read(f.p.locals.k),1n);assert.equal(f.p.draws.length,0);assert.equal(f.m.read(f.p.s.v),77n);f.p.io.enterLoop=()=>true;f.schedule(4n,5n);f.run();assert.equal(f.views.high.board.disp(4,5),900);assert.equal(f.m.read(f.p.locals.k),2n);
});
test('PLACE IRAN suspension exposes seed changes before the corresponding coordinate assignment',()=>{
  const f=fixture(),iran=f.p.io.iran;let calls=0;f.p.io.iran=function*(n){const value=yield*iran(n);yield `draw ${++calls}`;return value;};const g=f.p.run();assert.equal(g.next().value,'draw 1');assert.equal(f.file.read('seed'),260543n);assert.equal(f.m.read(f.p.s.v),77n);assert.equal(g.next().value,'draw 2');assert.equal(f.m.read(f.p.s.v),39n);assert.equal(f.m.read(f.p.s.h),77n);done(g);assert.equal(f.views.high.board.disp(39,39),900);
});
test('PLACE keeps retrying occupied space without advancing K or adding a source attempt limit',()=>{
  const f=fixture();f.schedule(2n,3n,4n,5n,6n,7n);f.p.io.disp=function*(){yield 'occupied';return 800n;};const g=f.p.run();for(const coord of [[2n,3n],[4n,5n],[6n,7n]]){assert.equal(g.next().value,'occupied');assert.deepEqual([f.m.read(f.p.s.v),f.m.read(f.p.s.h)],coord);assert.equal(f.m.read(f.p.locals.k),1n);}g.return();assert.ok(!f.p.events.some(x=>x.startsWith('setdsp:')));
});
test('PLACE second coordinate draw failure retains the first assignment without insertion',()=>{
  const f=fixture();let calls=0;f.p.io.iran=function*(){if(++calls===2)throw new Error('IRAN transfer');return 4n;};assert.throws(f.run,/IRAN transfer/);assert.deepEqual([f.m.read(f.p.s.v),f.m.read(f.p.s.h)],[4n,77n]);assert.equal(f.m.read(f.p.locals.k),1n);assert.ok(!f.p.events.some(x=>x.startsWith('disp:')));
});
test('PLACE SETDSP failure preserves accepted coordinates and K without increment',()=>{
  const f=fixture();f.schedule(4n,5n);f.p.io.setdsp=function*(){throw new Error('SETDSP transfer');};assert.throws(f.run,/SETDSP transfer/);assert.deepEqual([f.m.read(f.p.s.v),f.m.read(f.p.s.h)],[4n,5n]);assert.equal(f.m.read(f.p.locals.k),1n);assert.equal(f.views.high.board.disp(4,5),0);
});
test('PLACE passes actual coordinate and object words to SETDSP across suspension',()=>{
  const f=fixture();f.schedule(4n,5n);const setdsp=f.p.io.setdsp;f.p.io.setdsp=function*(v,h,object){assert.deepEqual([v,h,object],[f.p.s.v,f.p.s.h,f.p.s.object]);yield 'insert';yield*setdsp(v,h,object);};const g=f.p.run();assert.equal(g.next().value,'insert');f.m.write(f.p.s.v,6n);f.m.write(f.p.s.object,901n);done(g);assert.equal(f.views.high.board.disp(4,5),0);assert.equal(f.views.high.board.disp(6,5),901);
});
function spawn(f:ReturnType<typeof fixture>,targetV:number,targetH:number){
  f.low.write('who',1n);f.low.write('team',1n);f.low.write('pasflg',-1n);f.low.write('hungup',0n);f.low.write('hcpos',0n);f.low.write('blank',0n);
  f.high.write('rom',0n);f.high.write('romcnt',5n);f.high.write('romopt',-1n);f.high.write('erom',300n);f.high.write('numrom',0n);f.high.write('numply',2n);f.high.write('tmturn',0n,3);f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.high.write('tim0',0n);f.high.write('rppaus',0n);f.high.write('rtpaus',2000n);f.high.write('slwest',1n);
  for(let i=1;i<=K.KNPLAY;i++){f.high.write('alive',0n,i);f.high.write('shpcon',0n,i,K.KVPOS);f.high.write('shpcon',0n,i,K.KHPOS);f.high.write('hitflg',0n,i);}
  Object.assign(f.views.high.players[6].ship,{v:targetV,h:targetH,energy:50000n,damage:0n,shieldCondition:-1n});f.high.write('alive',-1n,6);f.views.high.board.setdsp(targetV,targetH,206);f.clock.splice(0,f.clock.length,1000n,2000n);f.damage.draws.splice(0,f.damage.draws.length,'0','0');f.damage.integers.length=0;
}
test('Main turn composes actual Romulan placement, appearance, DIST and distant return with raw seed order',()=>{
  const f=fixture();spawn(f,1,1);f.high.write('dotime',1n);f.high.write('numsid',1n,1);const turns=f.high.read('shpcon',1,K.KNTURN);done(f.main.io.finishTurn(false));assert.deepEqual(f.p.draws,[39n,31n]);assert.equal(f.file.read('seed'),18323161279n);assert.deepEqual([f.high.read('locr',K.KVPOS),f.high.read('locr',K.KHPOS)],[39n,31n]);assert.equal(f.views.high.board.disp(39,31),501);assert.equal(f.high.read('rom'),-1n);assert.equal(f.high.read('erom'),280n);assert.equal(f.high.read('numrom'),1n);assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+1n);assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.main.defenses.hits[0].iwhat,11n);assert.equal(f.main.defenses.hits[0].dispfr,500n);assert.equal(f.clock.length,2);
});
test('ROMDRV placement can continue directly through DIST, phaser damage and another defense cycle',()=>{
  const f=fixture();spawn(f,40,31);done(f.b.run());assert.deepEqual(f.p.draws,[39n,31n]);assert.equal(f.views.high.board.disp(39,31),501);assert.equal(f.high.read('erom'),280n);assert.deepEqual(f.b.calls,[[2n,6n,1n,200n,-1n]]);assert.equal(f.high.read('shpcon',6,K.KSDAM),14400n);assert.deepEqual(f.main.defenses.hits.map(h=>h.iwhat),[11n,1n]);assert.equal(f.high.read('rppaus'),3500n);assert.ok(f.b.events.includes('basbld'));
});
test('ROMDRV placement draw failure retains partial LOCR before ROM and energy initialization',()=>{
  const f=fixture();spawn(f,1,1);const iran=f.p.io.iran;let calls=0;f.p.io.iran=function*(n){if(++calls===2)throw new Error('placement draw transfer');return yield*iran(n);};assert.throws(()=>done(f.b.run()),/placement draw transfer/);assert.equal(f.file.read('seed'),33522916481n);assert.deepEqual([f.high.read('locr',K.KVPOS),f.high.read('locr',K.KHPOS)],[39n,20n]);assert.equal(f.high.read('rom'),0n);assert.equal(f.high.read('erom'),300n);assert.equal(f.high.read('romcnt'),0n);assert.equal(f.main.defenses.hits.length,0);assert.equal(f.m.read(f.p.locals.k),1n);
});
