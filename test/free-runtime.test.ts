import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { killedSearchStatements } from '../src/game/killed-search-statements.ts';
import { constants as K } from '../src/generated/source-data.ts';

function fixture(player=1){
  const f=pregameRuntimeFixture([]),b=f.free;f.m.write(b.snum,BigInt(player));f.high.write('alive',-1n,player);f.high.write('numply',2n);f.high.write('numsid',2n,1);f.high.write('numsid',2n,2);f.high.write('endflg',0n);
  const job=Array.from({length:K.KNJBST},(_,i)=>BigInt(101+i)),ship=Array.from({length:10},(_,i)=>BigInt(201+i)),devices=Array.from({length:K.KNDEV},(_,i)=>BigInt(301+i));
  ship[K.KVPOS-1]=10n;ship[K.KHPOS-1]=20n;
  job.forEach((n,i)=>f.high.write('job',n,player,i+1));ship.forEach((n,i)=>f.high.write('shpcon',n,player,i+1));devices.forEach((n,i)=>f.high.write('shpdam',n,player,i+1));
  f.high.write('trstat',0n,player);f.high.write('hitflg',0n,player);f.high.write('msgflg',0n,player);f.high.write('nkill',0n);f.high.write('kilndx',0n);
  for(let i=0;i<17;i++)f.m.write(f.low.address('iwhat')+BigInt(i),99n);f.low.write('dbits',55n);f.low.write('dispfr',66n);
  for(let i=1;i<=16;i++)b.fr.write('dum',88n,i);
  return {...f,b,job,ship,devices,run:()=>finish(b.run()),q:(row=1)=>Array.from({length:5},(_,i)=>f.high.read('kilque',row,i+1)),saved:(name:string,n:number)=>Array.from({length:n},(_,i)=>b.fr.read(name,i+1))};
}
test('Statement FREE already-released ship returns before locks, copies or count changes',()=>{
  const f=fixture();f.high.write('alive',1n,1);f.run();assert.deepEqual(f.b.events,[]);assert.equal(f.high.read('numply'),2n);assert.equal(f.high.read('job',1,1),f.job[0]);assert.equal(f.low.read('dbits'),55n);assert.equal(f.m.read(f.b.locals.tteam),77n);
});
for(const alive of [0n,-1n])test(`Statement FREE releases ALIVE ${alive} and composes raw board, clock, lock and BLKSET`,()=>{
  const f=fixture();f.high.write('alive',alive,1);f.run();assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.high.read('numply'),1n);assert.equal(f.high.read('numsid',1),1n);assert.equal(f.high.read('numsid',2),2n);assert.equal(f.high.read('alive',1),1n);
  assert.deepEqual(f.b.events,['lock','setdsp','kqsrch','daytim','blkset','unlock']);assert.equal(f.lockState.locked,0n);assert.equal(f.text(),'');assert.equal(f.m.read(f.b.locals.d),100n);
});
test('Statement FREE saves JOB individually and clears every corresponding shared JOB word',()=>{
  const f=fixture();f.run();assert.deepEqual(f.saved('tjob',K.KNJBST),f.job);assert.deepEqual(Array.from({length:K.KNJBST},(_,i)=>f.high.read('job',1,i+1)),Array<bigint>(K.KNJBST).fill(0n));
});
test('Statement FREE saves all ship words but clears only position and energy in shared storage',()=>{
  const f=fixture();f.run();assert.deepEqual(f.saved('tshpco',10),f.ship);const expected=f.ship.slice();for(const c of [K.KVPOS,K.KHPOS,K.KSNRGY])expected[c-1]=0n;assert.deepEqual(Array.from({length:10},(_,i)=>f.high.read('shpcon',1,i+1)),expected);
});
test('Statement FREE saves device words without clearing their shared counterparts or unused DUM',()=>{
  const f=fixture();f.run();assert.deepEqual(f.saved('tshpda',K.KNDEV),f.devices);assert.deepEqual(Array.from({length:K.KNDEV},(_,i)=>f.high.read('shpdam',1,i+1)),f.devices);assert.deepEqual(f.saved('dum',16),Array<bigint>(16).fill(88n));
});
for(const player of [1,K.KNPLAY/2,K.KNPLAY/2+1,K.KNPLAY])test(`Statement FREE packs killed identity and saved ship number for ship ${player}`,()=>{
  const f=fixture(player),team=player>K.KNPLAY/2?2n:1n;f.run();assert.equal(f.b.fr.read('tship'),team*100n+BigInt(player));assert.deepEqual(f.q(),[f.job[K.KJOB-1],f.job[K.KPPN-1],f.job[K.KTTYN-1],100n,BigInt(player)*262144n|team]);assert.equal(f.high.read('numsid',team),1n);
});
test('Statement FREE last-player retention and killed time use separate DAYTIM calls',()=>{
  const f=fixture();f.high.write('numply',1n);f.run();assert.equal(f.high.read('hitime'),300100n);assert.equal(f.q()[3],500n);assert.equal(f.m.read(f.b.locals.d),500n);assert.deepEqual(f.clock,[]);
});
test('Statement FREE ENDFLG logical policy suppresses retention but still records killed time',()=>{
  const f=fixture();f.high.write('numply',1n);f.high.write('endflg',-1n);f.high.write('hitime',777n);f.run();assert.equal(f.high.read('hitime'),777n);assert.equal(f.q()[3],100n);assert.deepEqual(f.clock,[500n]);
});
test('Statement FREE retention uses the supplied logical NOT policy',()=>{
  const f=fixture();f.high.write('numply',1n);f.high.write('endflg',1n);f.b.io.not=w=>w===0n;f.high.write('hitime',777n);f.run();assert.equal(f.high.read('hitime'),777n);assert.equal(f.q()[3],100n);
});
test('Statement FREE killed queue wraps its index while retaining the capped count',()=>{
  const f=fixture();f.high.write('nkill',BigInt(K.KQLEN));f.high.write('kilndx',BigInt(K.KQLEN));f.run();assert.equal(f.high.read('nkill'),BigInt(K.KQLEN));assert.equal(f.high.read('kilndx'),1n);assert.equal(f.m.read(f.b.locals.kindex),1n);assert.equal(f.q()[0],f.job[K.KJOB-1]);
});
test('Statement FREE existing job/project row is refreshed without advancing the ring',()=>{
  const f=fixture();f.high.write('nkill',2n);f.high.write('kilndx',2n);f.high.write('kilque',f.job[K.KJOB-1],1,1);f.high.write('kilque',f.job[K.KPPN-1],1,2);f.high.write('kilque',999n,1,3);f.run();assert.equal(f.high.read('nkill'),2n);assert.equal(f.high.read('kilndx'),2n);assert.equal(f.m.read(f.b.locals.kindex),1n);assert.equal(f.q()[2],f.job[K.KTTYN-1]);assert.equal(f.q()[3],100n);
});
test('Statement FREE retries LKFAIL without retesting ALIVE',()=>{
  const f=fixture(),lock=f.b.io.lock;let calls=0;f.b.io.lock=function*(a){if(++calls===1){f.high.write('alive',1n,1);f.low.write('lkfail',-1n);yield 'lock-retry';return;}yield*lock(a);};const g=f.b.run();assert.equal(g.next().value,'lock-retry');assert.equal(f.high.read('numply'),2n);finish(g);assert.equal(calls,2);assert.equal(f.high.read('numply'),1n);
});
test('Statement FREE evaluates SNUM again after a suspended lock',()=>{
  const f=fixture(),lock=f.b.io.lock;f.high.write('shpcon',11n,2,K.KVPOS);f.high.write('shpcon',21n,2,K.KHPOS);f.b.io.lock=function*(a){yield*lock(a);yield 'locked';};const g=f.b.run();assert.equal(g.next().value,'locked');f.m.write(f.b.snum,2n);finish(g);assert.equal(f.b.fr.read('tship'),102n);assert.equal(f.high.read('job',1,1),f.job[0]);assert.equal(f.high.read('alive',2),1n);assert.equal(f.views.high.board.disp(10,20),101);
});
test('Statement FREE failed TRCOFF stops after board/count changes without automatic unlocking',()=>{
  const f=fixture();f.high.write('trstat',1n,1);f.b.io.trcoff=function*(){throw new Error('TRCOFF fault');};assert.throws(f.run,/TRCOFF fault/);assert.equal(f.high.read('numply'),1n);assert.equal(f.high.read('numsid',1),1n);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.high.read('job',1,1),f.job[0]);assert.equal(f.high.read('nkill'),0n);assert.ok(!f.b.events.includes('unlock'));
});
test('Statement FREE TRCOFF receives actual SNUM and its mutations precede killed identity reads',()=>{
  const f=fixture();f.high.write('trstat',-1n,1);f.b.io.trcoff=function*(a){assert.equal(a,f.b.snum);f.high.write('job',1234n,1,K.KJOB);};f.run();assert.equal(f.q()[0],1234n);assert.equal(f.b.fr.read('tjob',K.KJOB),1234n);
});
test('Statement FREE killed timestamp destination is evaluated after DAYTIM returns',()=>{
  const f=fixture(),time=f.b.io.daytim;f.b.io.daytim=function*(a){const n=yield*time(a);yield 'time';return n;};const g=f.b.run();assert.equal(g.next().value,'time');f.m.write(f.b.locals.kindex,2n);finish(g);assert.equal(f.q(1)[3],0n);assert.equal(f.q(2)[3],100n);assert.equal(f.q(2)[4],262145n);
});
test('Statement FREE JOB clear rereads SNUM after saving the corresponding word',()=>{
  const f=fixture(),assign=f.b.io.assign;f.high.write('job',999n,2,1);f.b.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.b.fr.address('tjob',1))f.m.write(f.b.snum,2n);};f.run();assert.equal(f.b.fr.read('tjob',1),f.job[0]);assert.equal(f.high.read('job',1,1),f.job[0]);assert.equal(f.high.read('job',2,1),0n);assert.equal(f.high.read('alive',2),1n);
});
test('Statement FREE partial JOB copy failure preserves earlier clears and the saved failing word',()=>{
  const f=fixture(),assign=f.b.io.assign;f.b.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.b.fr.address('tjob',2))throw new Error('copy fault');};assert.throws(f.run,/copy fault/);assert.equal(f.high.read('job',1,1),0n);assert.equal(f.high.read('job',1,2),f.job[1]);assert.equal(f.b.fr.read('tjob',2),f.job[1]);assert.equal(f.high.read('alive',1),-1n);assert.ok(!f.b.events.includes('unlock'));
});
test('Statement FREE drains hits before messages and passes the actual FRLOCL DUM address',()=>{
  const f=fixture(),calls:string[]=[];f.high.write('hitflg',2n,1);f.high.write('msgflg',2n,1);f.b.io.gethit=function*(a){assert.equal(a,f.b.snum);calls.push('hit');assert.equal(f.high.read('shpcon',1,K.KVPOS),0n);f.high.write('hitflg',f.high.read('hitflg',1)-1n,1);};f.b.io.getmsg=function*(a,b){assert.equal(a,f.b.snum);assert.equal(b,f.b.fr.address('dum',1));calls.push('msg');f.m.write(b,123n);f.high.write('msgflg',f.high.read('msgflg',1)-1n,1);};f.run();assert.deepEqual(calls,['hit','hit','msg','msg']);assert.equal(f.b.fr.read('dum',1),123n);
});
test('Statement FREE does not return to draining hits after entering the message loop',()=>{
  const f=fixture();f.high.write('msgflg',1n,1);f.b.io.getmsg=function*(){f.high.write('msgflg',0n,1);f.high.write('hitflg',1n,1);};f.run();assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('alive',1),1n);
});
test('Statement FREE missing queue consumer preserves saved state before display cleanup',()=>{
  const f=fixture();f.high.write('hitflg',1n,1);f.b.io.gethit=function*(){throw new Error('GETHIT fault');};assert.throws(f.run,/GETHIT fault/);assert.deepEqual(f.saved('tjob',K.KNJBST),f.job);assert.deepEqual(f.saved('tshpda',K.KNDEV),f.devices);assert.equal(f.low.read('dbits'),55n);assert.equal(f.high.read('alive',1),-1n);
});
test('Statement FREE raw BLKSET suspension exposes first cleared IWHAT word before the remaining sixteen',()=>{
  const f=fixture(),blt=f.points.block.io.blt;f.points.block.io.blt=function*(last){yield 'clear-display';yield*blt(last);};const g=f.b.run();assert.equal(g.next().value,'clear-display');assert.equal(f.low.read('dbits'),0n);assert.equal(f.low.read('dispfr'),0n);assert.equal(f.low.read('iwhat'),0n);assert.equal(f.m.read(f.low.address('iwhat')+1n),99n);assert.equal(f.high.read('alive',1),-1n);finish(g);assert.deepEqual(Array.from({length:17},(_,i)=>f.m.read(f.low.address('iwhat')+BigInt(i))),Array<bigint>(17).fill(0n));assert.equal(f.high.read('alive',1),1n);
});
test('Statement FREE requires compiler assignment of integer one to logical ALIVE',()=>{
  const f=fixture();f.b.io.assignAliveOne=function*(d){f.m.write(d(),123n);};f.run();assert.equal(f.high.read('alive',1),123n);
});
test('Statement FREE unlock failure retains completed release state',()=>{
  const f=fixture();f.b.io.unlock=function*(){throw new Error('unlock fault');};assert.throws(f.run,/unlock fault/);assert.equal(f.high.read('alive',1),1n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.high.read('job',1,1),0n);
});

function searchFixture(){const f=fixture(),args={tty:25450n,job:25451n,ppn:25452n,index:25453n};f.m.write(args.tty,10n);f.m.write(args.job,20n);f.m.write(args.ppn,30n);f.m.write(args.index,99n);return {...f,args,search:()=>finish(killedSearchStatements(f.high,args,f.b.searchLocals,f.b.searchIO)),row:(i:number,job=20n,ppn=30n,tty=99n)=>{f.high.write('kilque',job,i,1);f.high.write('kilque',ppn,i,2);f.high.write('kilque',tty,i,3);f.high.write('kilque',777n,i,4);f.high.write('kilque',888n,i,5);}};}
test('Statement KQSRCH clears the result even when the queue is empty',()=>{
  const f=searchFixture();f.search();assert.equal(f.m.read(f.args.index),0n);
});
test('Statement KQSRCH first matching job/project wins regardless of terminal or age',()=>{
  const f=searchFixture();f.high.write('nkill',2n);f.row(1);f.row(2);f.search();assert.equal(f.m.read(f.args.index),1n);assert.deepEqual(f.q(1),[20n,30n,10n,777n,888n]);assert.deepEqual(f.q(2),[20n,30n,99n,777n,888n]);
});
test('Statement KQSRCH same terminal alone does not match the disabled time/terminal branch',()=>{
  const f=searchFixture();f.high.write('nkill',2n);f.row(1,21n,30n,10n);f.row(2,20n,31n,10n);f.search();assert.equal(f.m.read(f.args.index),0n);assert.equal(f.m.read(f.b.searchLocals.ii),3n);
});
test('Statement KQSRCH result alias can zero NKILL before its empty test',()=>{
  const f=searchFixture();f.high.write('nkill',2n);f.row(1);f.args.index=f.high.address('nkill');f.search();assert.equal(f.high.read('nkill'),0n);assert.equal(f.q()[2],99n);
});
test('Statement KQSRCH writing KINDEX can change the job argument before refreshing the row',()=>{
  const f=searchFixture();f.high.write('nkill',1n);f.row(1,0n);f.args.index=f.args.job;f.search();assert.equal(f.m.read(f.args.index),1n);assert.equal(f.q()[0],1n);
});
test('Statement KQSRCH captures its DO limit but reads each row and argument when reached',()=>{
  const f=searchFixture();f.high.write('nkill',2n);f.row(1,21n);f.row(2);const compare=f.b.searchIO.compare;let n=0;f.b.searchIO.compare=function*(...a){const result=yield*compare(...a);if(++n===1){f.high.write('nkill',1n);f.m.write(f.args.job,22n);f.high.write('kilque',22n,2,1);}return result;};f.search();assert.equal(f.m.read(f.args.index),2n);assert.equal(f.q(2)[0],22n);
});
test('Statement KQSRCH exposes partial matched-row changes on assignment failure',()=>{
  const f=searchFixture();f.high.write('nkill',1n);f.row(1);const assign=f.b.searchIO.assign;f.b.searchIO.assign=function*(d,t,v){if(d()===f.high.address('kilque',1,3))throw new Error('tty fault');yield*assign(d,t,v);};assert.throws(f.search,/tty fault/);assert.equal(f.m.read(f.args.index),1n);assert.equal(f.q()[2],99n);
});
test('ENDGAM composes POINTS and FREE over shared totals and saved identity under explicit final/statistics policies',()=>{
  // Explicit nonzero reporting denominators; production POINTS retains divide faults.
  const f=fixture();for(let i=1;i<=2;i++)f.high.write('numshp',2n,i);f.high.write('numrom',2n);for(let i=1;i<=3;i++)f.high.write('tmturn',2n,i);f.low.write('who',1n);f.high.write('endflg',-1n);f.high.write('nplnet',1n);f.high.write('nbase',1n,1);f.high.write('nbase',1n,2);f.points.final.continuation=function*(){return false;};let recorded=false;f.endgame.io.updsta=function*(args){recorded=true;assert.equal(f.m.read(args[0]),f.job[K.KPPN-1]);assert.equal(f.m.read(args[5]),f.points.po.read('total',1));assert.equal(f.high.read('alive',1),-1n);};assert.throws(()=>finish(f.endgame.run()),/EXIT transfer/);assert.equal(recorded,true);assert.equal(f.low.read('who'),0n);assert.deepEqual(f.saved('tjob',K.KNJBST),f.job);assert.equal(f.high.read('alive',1),1n);assert.equal(f.q()[3],500n);assert.ok(f.b.events.includes('unlock'));
});
