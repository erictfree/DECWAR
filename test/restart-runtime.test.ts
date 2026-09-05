import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { packSixbit,signed36,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';

function fixture(player=1){
  const f=pregameRuntimeFixture([]),r=f.restart,fr=f.free.fr;f.m.write(f.free.snum,BigInt(player));f.low.write('who',BigInt(player));f.high.write('shpcon',0n,player,K.KVPOS);f.high.write('alive',1n,player);f.views.high.board.setdsp(10,20,0);f.high.write('numply',1n);f.high.write('numsid',1n,1);f.high.write('numsid',1n,2);
  const ship=Array.from({length:10},(_,i)=>BigInt(201+i)),devices=Array.from({length:K.KNDEV},(_,i)=>BigInt(301+i)),job=Array.from({length:K.KNJBST},(_,i)=>BigInt(401+i));ship[K.KVPOS-1]=10n;ship[K.KHPOS-1]=20n;
  ship.forEach((n,i)=>fr.write('tshpco',n,i+1));devices.forEach((n,i)=>fr.write('tshpda',n,i+1));job.forEach((n,i)=>{fr.write('tjob',n,i+1);f.high.write('job',99n,player,i+1);});fr.write('tship',BigInt(player)+(player>K.KNPLAY/2?200n:100n));
  f.h.put(f.jobStatus.symbols.uscbh,'NEWNAMESECOND');
  return {...f,r,fr,ship,devices,job,run:()=>finish(r.run()),shared:(field:string,n:number,p=player)=>Array.from({length:n},(_,i)=>f.high.read(field,p,i+1))};
}
for(const player of [1,K.KNPLAY/2,K.KNPLAY/2+1,K.KNPLAY])test(`Statement RSTART restores ship ${player} using its computed team and raw services`,()=>{
  const f=fixture(player);f.run();const team=player>K.KNPLAY/2?2:1;assert.equal(f.high.read('alive',player),-1n);assert.equal(f.high.read('numply'),2n);assert.equal(f.high.read('numsid',team),2n);assert.equal(f.high.read('numsid',3-team),1n);assert.equal(f.m.read(f.r.locals.tteam),BigInt(team));assert.equal(f.views.high.board.disp(10,20),team*100+player);assert.deepEqual(f.r.events,['disp','lock:RSTART','jobsta','setdsp','unlock']);assert.equal(f.lockState.locked,0n);
});
test('Statement RSTART restores all ten ship words and every device from actual FRLOCL',()=>{
  const f=fixture();f.run();assert.deepEqual(f.shared('shpcon',10),f.ship);assert.deepEqual(f.shared('shpdam',K.KNDEV),f.devices);assert.deepEqual(Array.from({length:10},(_,i)=>f.fr.read('tshpco',i+1)),f.ship);assert.equal(f.r.locals.i,f.free.locals.i);assert.equal(f.m.read(f.r.locals.i),BigInt(K.KNDEV+1));
});
test('Statement RSTART refreshes monitor identity then restores only the five saved JOB fields',()=>{
  const f=fixture();f.run();const expected=f.job.slice();expected[K.KJOB-1]=7n;expected[K.KPPN-1]=9n;expected[K.KTTYN-1]=10n;expected[K.KTTYSP-1]=1200n;assert.deepEqual(f.shared('job',K.KNJBST),expected);assert.equal(f.m.read(f.r.locals.dummy),signed36(packSixbit('ESECON')));assert.equal(f.m.read(f.jobStatus.symbols.jsqtab),7n);assert.equal(f.m.read(f.jobStatus.symbols.jsqwho),1n);assert.deepEqual(f.clock,[100n,500n]);
});
test('Statement RSTART passes the same DUMMY address twice and actual shared JOB destinations',()=>{
  const f=fixture(),jobsta=f.r.io.jobsta;f.r.io.jobsta=function*(a){assert.deepEqual(a,[f.high.address('job',1,K.KJOB),f.r.locals.dummy,f.r.locals.dummy,f.high.address('job',1,K.KPPN),f.high.address('job',1,K.KTTYN),f.high.address('job',1,K.KTTYSP)]);assert.deepEqual(f.shared('shpcon',10),f.ship);assert.deepEqual(f.shared('shpdam',K.KNDEV),f.devices);yield*jobsta(a);};f.run();
});
test('Statement RSTART occupied ship emits original bytes before required MONIT without checking board or locking',()=>{
  const f=fixture();f.high.write('shpcon',1n,1,K.KVPOS);assert.throws(f.run,/requires RSTART MONIT/);assert.equal(f.text(),M.free01.text+'\r\n');assert.deepEqual(f.r.events,['free01','monit']);assert.equal(f.high.read('numply'),1n);assert.equal(f.high.read('alive',1),1n);
});
test('Statement RSTART negative ship VPOS is also occupied',()=>{
  const f=fixture();f.high.write('shpcon',-1n,1,K.KVPOS);assert.throws(f.run,/requires RSTART MONIT/);assert.equal(f.text(),M.free01.text+'\r\n');
});
test('Statement RSTART occupied saved position emits original bytes before required MONIT',()=>{
  const f=fixture();f.views.high.board.setdsp(10,20,201);assert.throws(f.run,/requires RSTART MONIT/);assert.equal(f.text(),M.free02.text+'\r\n');assert.deepEqual(f.r.events,['disp','free02','monit']);assert.equal(f.high.read('numply'),1n);
});
test('Statement RSTART accepts raw DISP negative sentinel and replaces it with the saved ship code',()=>{
  const f=fixture();f.views.high.board.setdsp(10,20,4095);f.run();assert.equal(f.views.high.board.disp(10,20),101);assert.equal(f.text(),'');
});
test('Statement RSTART returned MONIT resumes both availability checks at label 800',()=>{
  const f=fixture();f.high.write('shpcon',1n,1,K.KVPOS);f.views.high.board.setdsp(10,20,201);let calls=0;f.r.io.monit=function*(){if(++calls===1)f.high.write('shpcon',0n,1,K.KVPOS);else f.views.high.board.setdsp(10,20,0);yield 'monitor-return';};const g=f.r.run();assert.equal(g.next().value,'monitor-return');assert.equal(g.next().value,'monitor-return');finish(g);assert.equal(calls,2);assert.equal(f.text(),M.free01.text+'\r\n'+M.free02.text+'\r\n');assert.equal(f.high.read('alive',1),-1n);
});
test('Statement RSTART error-output failure prevents MONIT and retains unavailable state',()=>{
  const f=fixture();f.high.write('shpcon',1n,1,K.KVPOS);f.r.io.out=function*(){throw new Error('error-output fault');};assert.throws(f.run,/error-output fault/);assert.ok(!f.r.events.includes('monit'));assert.equal(f.high.read('numply'),1n);
});
test('Statement RSTART rereads SNUM after MONIT returns',()=>{
  const f=fixture();f.high.write('shpcon',1n,1,K.KVPOS);f.r.io.monit=function*(){f.m.write(f.free.snum,2n);};f.run();assert.equal(f.high.read('shpcon',1,K.KVPOS),1n);assert.deepEqual(f.shared('shpcon',10,2),f.ship);assert.equal(f.high.read('alive',2),-1n);assert.equal(f.views.high.board.disp(10,20),101);
});
test('Statement RSTART LOCK retry does not revisit board or ship availability',()=>{
  const f=fixture(),lock=f.r.io.lock;let calls=0;f.r.io.lock=function*(a,label){if(++calls===1){f.low.write('lkfail',-1n);f.high.write('shpcon',22n,1,K.KVPOS);f.views.high.board.setdsp(10,20,201);yield 'retry';return;}yield*lock(a,label);};const g=f.r.run();assert.equal(g.next().value,'retry');finish(g);assert.equal(calls,2);assert.equal(f.r.events.filter(e=>e==='disp').length,1);assert.equal(f.views.high.board.disp(10,20),101);assert.equal(f.high.read('shpcon',1,K.KVPOS),10n);
});
test('Statement RSTART changed SNUM after lock controls later ALIVE, counts and restores',()=>{
  const f=fixture(),lock=f.r.io.lock;f.r.io.lock=function*(...a){yield*lock(...a);f.m.write(f.free.snum,6n);};f.run();assert.equal(f.high.read('alive',1),1n);assert.equal(f.high.read('alive',6),-1n);assert.equal(f.high.read('numsid',2),2n);assert.deepEqual(f.shared('shpcon',10,6),f.ship);assert.equal(f.views.high.board.disp(10,20),101);
});
test('Statement RSTART compiler policy controls logical true assignment',()=>{
  const f=fixture();f.r.io.assignAliveTrue=function*(d){f.m.write(d(),-123n);};f.run();assert.equal(f.high.read('alive',1),-123n);
});
test('Statement RSTART count increments retain 36-bit overflow',()=>{
  const f=fixture();f.high.write('numply',MAX_INTEGER);f.high.write('numsid',MAX_INTEGER,1);f.run();assert.equal(f.high.read('numply'),MIN_INTEGER);assert.equal(f.high.read('numsid',1),MIN_INTEGER);
});
test('Statement RSTART restores from current saved words instead of an entry snapshot',()=>{
  const f=fixture(),assign=f.r.io.assign;f.r.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.high.address('shpcon',1,1))f.fr.write('tshpco',999n,2);};f.run();assert.equal(f.high.read('shpcon',1,2),999n);
});
test('Statement RSTART changed loop index after an assignment determines the next restored word',()=>{
  const f=fixture(),assign=f.r.io.assign;f.high.write('shpcon',777n,1,2);f.r.io.assign=function*(d,t,v){const a=d();yield*assign(d,t,v);if(a===f.high.address('shpcon',1,1))f.m.write(f.r.locals.i,2n);};f.run();assert.equal(f.high.read('shpcon',1,2),777n);assert.equal(f.high.read('shpcon',1,3),f.ship[2]);
});
test('Statement RSTART copy failure preserves ALIVE, counts and completed words without unlocking',()=>{
  const f=fixture(),assign=f.r.io.assign;f.r.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.high.address('shpcon',1,2))throw new Error('restore fault');};assert.throws(f.run,/restore fault/);assert.equal(f.high.read('alive',1),-1n);assert.equal(f.high.read('numply'),2n);assert.equal(f.high.read('shpcon',1,2),f.ship[1]);assert.equal(f.high.read('job',1,1),99n);assert.equal(f.views.high.board.disp(10,20),0);assert.ok(!f.r.events.includes('unlock'));
});
test('Statement RSTART raw JOBSTA suspension exposes restored ship before refreshed identity',()=>{
  const f=fixture(),output=f.jobStatus.io.output;f.jobStatus.io.output=function*(){yield*output();yield 'identity';};const g=f.r.run();assert.equal(g.next().value,'identity');assert.deepEqual(f.shared('shpcon',10),f.ship);assert.equal(f.high.read('job',1,K.KJOB),99n);assert.equal(f.views.high.board.disp(10,20),0);finish(g);assert.equal(f.high.read('job',1,K.KJOB),7n);
});
test('Statement RSTART raw JOBSTA failure preserves partial monitor updates and skips saved JOB restoration',()=>{
  const f=fixture();f.jobStatus.io.getlin=function*(){throw new Error('getlin fault');};assert.throws(f.run,/getlin fault/);assert.equal(f.high.read('job',1,K.KJOB),7n);assert.equal(f.high.read('job',1,K.KPPN),9n);assert.equal(f.high.read('job',1,K.KNAM1),99n);assert.equal(f.views.high.board.disp(10,20),0);assert.ok(!f.r.events.includes('unlock'));
});
test('Statement RSTART restores saved identity even when JOBSTA returns early after control-C',()=>{
  const f=fixture();f.h.put(f.jobStatus.symbols.uscbh,'');f.editor.feed('\x03');f.run();assert.equal(f.high.read('job',1,K.KNAM1),f.job[K.KNAM1-1]);assert.equal(f.m.read(f.r.locals.dummy),0n);assert.equal(f.views.high.board.disp(10,20),101);assert.ok(f.text().includes('Your name please: '));
});
test('Statement RSTART JOBSTA mutation of SNUM affects subsequent saved JOB assignments',()=>{
  const f=fixture(),jobsta=f.r.io.jobsta;f.r.io.jobsta=function*(args){yield*jobsta(args);f.m.write(f.free.snum,2n);};f.run();assert.equal(f.high.read('job',1,K.KJOB),7n);assert.equal(f.high.read('job',1,K.KNAM1),99n);assert.equal(f.high.read('job',2,K.KNAM1),f.job[K.KNAM1-1]);assert.equal(f.high.read('shpcon',2,K.KVPOS),0n);
});
test('Statement RSTART saved JOB assignments reread SNUM separately',()=>{
  const f=fixture(),assign=f.r.io.assign;f.r.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.high.address('job',1,K.KNAM1))f.m.write(f.free.snum,2n);};f.run();assert.equal(f.high.read('job',1,K.KNAM1),f.job[K.KNAM1-1]);assert.equal(f.high.read('job',1,K.KNAM2),99n);assert.equal(f.high.read('job',2,K.KNAM2),f.job[K.KNAM2-1]);
});
test('Statement RSTART final board call uses live saved position and code instead of restored ship fields',()=>{
  const f=fixture(),jobsta=f.r.io.jobsta;f.r.io.jobsta=function*(args){yield*jobsta(args);f.fr.write('tshpco',11n,K.KVPOS);f.fr.write('tshpco',21n,K.KHPOS);f.fr.write('tship',202n);};f.run();assert.equal(f.high.read('shpcon',1,K.KVPOS),10n);assert.equal(f.high.read('shpcon',1,K.KHPOS),20n);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.views.high.board.disp(11,21),202);
});
test('Statement RSTART SETDSP receives actual FRLOCL addresses and failure prevents unlock',()=>{
  const f=fixture();f.r.io.setdsp=function*(v,h,s){assert.deepEqual([v,h,s],[f.fr.address('tshpco',K.KVPOS),f.fr.address('tshpco',K.KHPOS),f.fr.address('tship')]);throw new Error('board fault');};assert.throws(f.run,/board fault/);assert.equal(f.high.read('job',1,K.KNAM1),f.job[K.KNAM1-1]);assert.ok(!f.r.events.includes('unlock'));
});
test('Statement RSTART unlock failure retains restored board, identity and counts',()=>{
  const f=fixture();f.r.io.unlock=function*(){throw new Error('unlock fault');};assert.throws(f.run,/unlock fault/);assert.equal(f.views.high.board.disp(10,20),101);assert.equal(f.high.read('numply'),2n);assert.equal(f.high.read('alive',1),-1n);
});
test('FREE then RSTART shares FRLOCL and restores old identity with fresh monitor job details',()=>{
  const f=pregameRuntimeFixture([]);f.low.write('who',1n);f.high.write('numply',2n);f.high.write('numsid',2n,1);const original=Array.from({length:K.KNJBST},(_,i)=>BigInt(601+i));original.forEach((n,i)=>f.high.write('job',n,1,i+1));const ship=Array.from({length:10},(_,i)=>f.high.read('shpcon',1,i+1));finish(f.free.run());const killed=Array.from({length:5},(_,i)=>f.high.read('kilque',1,i+1));assert.equal(f.high.read('alive',1),1n);finish(f.restart.run());assert.deepEqual(Array.from({length:10},(_,i)=>f.high.read('shpcon',1,i+1)),ship);assert.equal(f.high.read('alive',1),-1n);assert.equal(f.high.read('numply'),2n);assert.equal(f.high.read('numsid',1),2n);assert.equal(f.high.read('job',1,K.KNAM1),original[K.KNAM1-1]);assert.equal(f.high.read('job',1,K.KJOB),7n);assert.equal(f.views.high.board.disp(10,20),101);assert.deepEqual(Array.from({length:5},(_,i)=>f.high.read('kilque',1,i+1)),killed);
});
