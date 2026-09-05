import test from 'node:test';
import assert from 'node:assert/strict';
import { planetAttackRuntimeFixture as fixture } from './fixtures/planet-attack-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { turnStatements } from '../src/game/turn-statements.ts';
import type { TurnStatementServices } from '../src/game/turn-statements.ts';
import { rebuildBaseStatements } from '../src/game/base-rebuild-statements.ts';
import { outHit } from '../src/game/out-hit.ts';
function draws(f:ReturnType<typeof fixture>,n=1){f.damage.draws.push(...Array<string>(n*2).fill('0'));}
function ship(f:ReturnType<typeof fixture>,i:number,v=11,h=20){Object.assign(f.views.high.players[i].ship,{v,h,energy:50000n,damage:0n,shieldCondition:-1n});f.high.write('alive',-1n,i);f.views.high.board.setdsp(v,h,i<=5?100+i:200+i);}
for(const n of [0n,-1n])test(`PLNATK NPLNET ${n} returns before locals, calls or hit writes`,()=>{
  const f=fixture();f.high.write('nplnet',n);f.m.write(f.locals.k,77n);f.low.write('iwhat',99n);finish(f.run());assert.equal(f.m.read(f.locals.k),77n);assert.equal(f.low.read('iwhat'),99n);assert.deepEqual(f.events,[]);
});
test('PLNATK composes raw board/distances, fixed-kind PHADAM, team score and resumable PRIDIS',()=>{
  const f=fixture();draws(f);finish(f.run());assert.deepEqual(f.calls,[[2n,1n,2n,100n,0n]]);assert.equal(f.high.read('shpcon',1,K.KSDAM),6480n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),6480n);assert.equal(f.queued[0].dispfr,801n);assert.equal(f.queued[0].dispto,101n);assert.equal(f.queued[0].shstfr,5n);assert.equal(f.queued[0].shcnfr,0n);assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.m.read(f.locals.k),2n);assert.equal(f.m.read(f.locals.j),11n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('PLNATK neutral draw can skip the entire planet before PLAYER filtering',()=>{
  const f=fixture();f.planet(1,601);f.integerDraws.push(1n);f.world.rom=-1n;finish(f.run());assert.equal(f.calls.length,0);assert.deepEqual(f.events,['dispc','planet-iran:2']);assert.equal(f.m.read(f.locals.pteam),0n);
});
test('PLNATK eager compiler AND consumes a neutral-test draw for a friendly captured planet',()=>{
  const f=fixture();f.planet(1,701);f.integerDraws.push(2n);f.io.and=function*(l,r){const a=yield*l(),b=yield*r();return a&&b;};finish(f.run());assert.deepEqual(f.events,['dispc','planet-iran:2']);assert.equal(f.calls.length,0);
});
test('PLNATK compound evaluation order controls a live PCODE read across IRAN suspension',()=>{
  for(const rightFirst of [false,true]){
    const f=fixture();f.planet(1,601);f.integerDraws.push(1n);const iran=f.io.iran;f.io.iran=function*(n){const d=yield*iran(n);yield 'random';return d;};
    if(rightFirst)f.io.and=function*(l,r){const b=yield*r();return (yield*l())&&b;};
    const g=f.run();assert.equal(g.next().value,'random');f.m.write(f.locals.pcode,801n);
    if(rightFirst){ // Later ANDs are restored after testing the first predicate.
      const and=f.io.and;let first=true;f.io.and=function*(l,r){if(first){first=false;return (yield*l())&&(yield*r());}return yield*and(l,r);};draws(f);
    }
    finish(g);assert.equal(f.calls.length,rightFirst?1:0);
  }
});
test('PLNATK reads PLAYER and TEAM after the neutral random operation returns',()=>{
  const f=fixture();f.planet(1,601);f.integerDraws.push(2n);const iran=f.io.iran;f.io.iran=function*(n){const d=yield*iran(n);yield 'random';return d;};const g=f.run();assert.equal(g.next().value,'random');f.low.write('team',0n);finish(g);assert.equal(f.calls.length,0);
});
test('PLNATK neutral planet attacks both ship halves without adding team scores',()=>{
  const f=fixture();f.planet(1,601);ship(f,6,13,20);f.integerDraws.push(2n);draws(f,2);finish(f.run());assert.deepEqual(f.queued.map(h=>h.dispto),[101n,206n]);assert.ok(f.views.high.scores.teamWords.every(n=>n===0n));
});
test('PLNATK friendly activation suppresses its Romulan attack; nonplayer activation permits it',()=>{
  const f=fixture();f.planet(1,701);f.world.rom=-1n;f.world.locr.v=11;f.world.locr.h=20;finish(f.run());assert.equal(f.calls.length,0);
  f.low.write('player',0n);f.damage.integers.push(100n);finish(f.run());assert.deepEqual(f.calls,[[500n,200n,1n]]);assert.equal(f.high.read('tmscor',1,K.KPRKIL),4000n);
});
for(const mode of ['friendly','dead','invisible','sentinel','far','edge'] as const)test(`PLNATK target gate ${mode}`,()=>{
  const f=fixture();f.low.write('player',0n);if(mode==='friendly')f.planet(1,701);if(mode==='dead')f.high.write('alive',0n,1);if(mode==='invisible'||mode==='sentinel')f.views.high.board.setdsp(10,20,mode==='sentinel'?-1:0);if(mode==='far')ship(f,1,9,20);if(mode==='edge')draws(f);finish(f.run());assert.equal(f.calls.length,mode==='edge'?1:0);
});
test('PLNATK OR policy may evaluate ALIVE even when PCODE already matches JTYPE',()=>{
  const f=fixture();f.planet(1,701);f.low.write('player',0n);let seen=0;
  f.io.or=function*(l,r){const a=yield*l(),b=yield*r();seen++;return a||b;};finish(f.run());assert.equal(seen,10);assert.equal(f.calls.length,0);
});
test('PLNATK scales ship power by population but leaves Romulan power undivided',()=>{
  const f=fixture();f.planet(1,801,4n);f.high.write('numply',3n);f.world.rom=-1n;f.world.locr.v=10;f.world.locr.h=21;draws(f);f.damage.integers.push(100n);finish(f.run());assert.deepEqual(f.calls,[[2n,1n,2n,56n,0n],[500n,170n,2n]]);assert.equal(f.high.read('tmscor',2,K.KPEDAM),3628n);assert.equal(f.high.read('tmscor',2,K.KPRKIL),1700n);
});
test('PLNATK division failure retains metadata and previous PHIT/ID before any PDIST call',()=>{
  const f=fixture();f.high.write('numply',0n);f.m.write(f.locals.phit,99n);f.m.write(f.locals.id,88n);assert.throws(()=>finish(f.run()),/zero/i);assert.equal(f.low.read('dispfr'),801n);assert.equal(f.low.read('dispto'),101n);assert.equal(f.low.read('iwhat'),1n);assert.equal(f.low.read('shstfr'),5n);assert.equal(f.m.read(f.locals.phit),99n);assert.equal(f.m.read(f.locals.id),88n);assert.ok(!f.events.includes('pdist'));
});
test('PLNATK Romulan-only path does not read NUMPLY for power',()=>{
  const f=fixture();f.high.write('numply',0n);f.high.write('alive',0n,1);f.world.rom=-1n;f.world.locr.v=10;f.world.locr.h=20;f.damage.integers.push(100n);finish(f.run());assert.deepEqual(f.calls,[[500n,200n,2n]]);
});
for(const [builds,population,expected] of [[0n,100n,0n],[-2n,2n,-5n],[5n,-2n,-100n]] as const)test(`PLNATK signed power for builds ${builds} and population ${population}`,()=>{
  const f=fixture();f.planet(1,801,builds);f.high.write('numply',population);f.io.phadam=function*(_kind,_j,_id,p){assert.equal(f.m.read(p),expected);};finish(f.run());assert.equal(f.m.read(f.locals.phit),expected);
});
test('PLNATK passes J, ID and PHIT as actual mutable compiler-local arguments',()=>{
  const f=fixture();f.io.phadam=function*(kind,j,id,phit,ship){assert.equal(kind,2);assert.equal(ship,false);assert.deepEqual([j,id,phit],[f.locals.j,f.locals.id,f.locals.phit]);f.m.write(j,2n);f.m.write(id,77n);f.m.write(phit,66n);};f.high.write('shpcon',40n,2,K.KVPOS);f.high.write('shpcon',40n,2,K.KHPOS);finish(f.run());assert.equal(f.m.read(f.locals.id),77n);assert.equal(f.m.read(f.locals.phit),66n);assert.ok(f.events.includes('pridis:40,40,10,2,0'));
});
test('PLNATK ship PHIT is stored before PDIST and is not recalculated after a distance suspension',()=>{
  const f=fixture(),pd=f.io.pdist;draws(f);f.io.pdist=function*(...a){const d=yield*pd(...a);yield 'distance';return d;};const g=f.run();assert.equal(g.next().value,'distance');assert.equal(f.m.read(f.locals.phit),100n);f.high.write('locpln',50n,1,3);f.high.write('numply',10n);finish(g);assert.equal(f.calls[0][3],100n);assert.equal(f.queued[0].shstfr,5n);
});
test('PLNATK uses later raw DISP results for codes and reads metadata afterward',()=>{
  const f=fixture(),disp=f.io.disp;let n=0;draws(f);f.io.disp=function*(v,h){const d=yield*disp(v,h);if(++n===1)f.views.high.board.setdsp(10,20,102);if(n===2){f.high.write('locpln',3n,1,3);f.high.write('shpcon',11n,1,K.KVPOS);f.views.high.board.setdsp(11,20,103);}return d;};finish(f.run());assert.equal(f.queued[0].dispto,103n);assert.equal(f.queued[0].vto,11n);assert.equal(f.queued[0].shstfr,3n);
});
test('PLNATK retains stale SHCNFR and KLFLG instead of initializing them',()=>{
  const f=fixture();f.low.write('shcnfr',77n);f.low.write('klflg',1n);draws(f);finish(f.run());assert.equal(f.queued[0].shcnfr,77n);assert.equal(f.queued[0].klflg,1n);assert.equal(f.high.read('alive',1),0n);assert.equal(f.high.read('tmscor',2,K.KPEKIL),5000n);
});
test('PLNATK owner score uses current PCODE/PTEAM after PHADAM returns',()=>{
  const f=fixture(),damage=f.io.phadam;draws(f);f.io.phadam=function*(...a){yield*damage(...a);f.m.write(f.locals.pteam,1n);};finish(f.run());assert.equal(f.high.read('tmscor',1,K.KPEDAM),6480n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),0n);assert.ok(f.events.includes('pridis:10,20,10,1,0'));
});
test('PLNATK does not force the victim bit after recipient searches',()=>{
  const f=fixture();draws(f);f.io.pridis=function*(){f.low.write('dbits',0n);};finish(f.run());assert.equal(f.queued[0].dbits,0n);assert.equal(f.high.read('hitflg',1),0n);
});
test('PLNATK captures NPLNET but reads future planet rows after delivery',()=>{
  const f=fixture(),send=f.io.makhit;f.planet(2,802,1n,30,30);draws(f,2);f.io.makhit=function*(){yield*send();f.high.write('nplnet',1n);f.high.write('locpln',11n,2,K.KVPOS);f.high.write('locpln',20n,2,K.KHPOS);f.views.high.board.setdsp(11,20,802);};finish(f.run());assert.deepEqual(f.queued.map(h=>h.dispfr),[801n,802n]);assert.equal(f.m.read(f.locals.k),3n);
});
test('PLNATK saved PCODE/PTEAM remain selected while display and power change for later targets',()=>{
  const f=fixture(),send=f.io.makhit;f.planet(1,601);ship(f,2);f.integerDraws.push(2n);draws(f,2);f.io.makhit=function*(){yield*send();f.high.write('locpln',1n,1,3);f.views.high.board.setdsp(12,20,801);};finish(f.run());assert.equal(f.calls[1][3],40n);assert.equal(f.queued[1].dispfr,801n);assert.equal(f.m.read(f.locals.pteam),0n);assert.ok(f.views.high.scores.teamWords.every(n=>n===0n));
});
test('PLNATK Romulan recipients can suspend before power and damage with earlier metadata retained',()=>{
  const f=fixture();f.high.write('alive',0n,1);f.world.rom=-1n;f.world.locr.v=10;f.world.locr.h=20;f.damage.integers.push(100n);const ldis=f.priority.io.ldis;let first=true;f.priority.io.ldis=function*(...a){const n=yield*ldis(...a);if(first){first=false;yield 'recipient';}return n;};
  const g=f.run();assert.equal(g.next().value,'recipient');assert.equal(f.calls.length,0);f.high.write('locpln',1n,1,3);finish(g);assert.equal(f.calls[0][1],80n);assert.equal(f.queued[0].shstfr,5n);assert.ok(f.events.indexOf('pridis:10,20,10,2,0')<f.events.indexOf('pharom'));
});
test('PLNATK Romulan score and metadata are read after PHAROM suspension',()=>{
  const f=fixture(),damage=f.io.pharom;f.high.write('alive',0n,1);f.world.rom=-1n;f.world.locr.v=10;f.world.locr.h=20;f.damage.integers.push(100n);f.io.pharom=function*(...a){yield*damage(...a);yield 'damage';};const g=f.run();assert.equal(g.next().value,'damage');assert.equal(f.high.read('tmscor',2,K.KPRKIL),0n);f.world.erom=99n;f.world.rom=0n;finish(g);assert.equal(f.queued[0].shstto,99n);assert.equal(f.queued[0].shcnto,1n);assert.equal(f.high.read('tmscor',2,K.KPRKIL),7000n);
});
for(const code of [601,801])test(`PLNATK Romulan death with planet ${code} preserves owner scoring`,()=>{
  const f=fixture();f.planet(1,code);f.high.write('alive',0n,1);f.world.rom=-1n;f.world.erom=1n;f.world.locr.v=10;f.world.locr.h=20;f.views.high.board.setdsp(10,20,500);if(code===601)f.integerDraws.push(2n);f.damage.integers.push(100n);finish(f.run());assert.equal(f.world.rom,0n);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.high.read('tmscor',2,K.KPRKIL),code===601?0n:7000n);assert.equal(f.queued[0].klflg,2n);
});
test('PLNATK actual hit delivery preserves original planet-hit output bytes',()=>{
  const f=fixture();draws(f);finish(f.run());finish(outHit({who:1,team:1,oflg:0,ocflg:K.KABS,nomsg:0n,ship:f.views.high.players[1].ship},f.hit,f.views.high.players,f.views.low.output,function*(who){f.queue.get(who,f.hit,f.views.high.players);}));assert.equal(f.views.low.output.drain(),'-@5 @12-20  648.0 unit P  L @10-20, -100.0%\r\n');
});
test('Turn composes actual BASPHA, PLNATK and BASBLD before committing scores',()=>{
  const f=fixture();f.high.write('dotime',1n);f.base(2,1,12,20,900n);f.high.write('numsid',1n,1);f.low.write('tpoint',123n,K.KPRKIL);draws(f,2);const order:string[]=[];
  const io:TurnStatementServices<string>={logical:f.io.logical,integer:f.io.integer,assign:f.io.assign,*repair(){assert.fail();},*debugLine(op,r){order.push(`${op}:${r}`);},*baspha(){yield*f.baseRun();},*plnatk(){yield*f.run();},*basbld(){yield*rebuildBaseStatements(f.high,f.low,{ib:13100n,ie:13101n,n:13102n,j:13103n,i:13104n},{logical:f.io.logical,assign:f.io.assign,enterTeams:f.io.enterLoop,*integer(op,l,r){if(op==='min'){const a=yield*l(),b=yield*r();return a<b?a:b;}return yield*f.io.integer(op,l,r);}});},*romdrv(){assert.fail();},*out(){assert.fail();},*odec(){assert.fail();}};
  finish(turnStatements(f.high,f.low,false,{i:13110n,d1:13111n,d2:13112n},io));assert.deepEqual(f.queued.map(h=>h.dispfr),[401n,801n]);assert.equal(f.high.read('base',1,3,2),925n);assert.equal(f.high.read('shpcon',1,K.KSDAM),12960n);assert.equal(f.high.read('score',K.KPRKIL,1),123n);assert.equal(f.high.read('tmscor',1,K.KPRKIL),123n);assert.equal(f.high.read('dotime'),0n);assert.deepEqual(order,['timin:BASPHA','timout:BASPHA','timin:PLNATK','timout:PLNATK','timin:BASBLD','timout:BASBLD']);
});
