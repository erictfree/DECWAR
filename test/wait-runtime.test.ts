import test from 'node:test';
import assert from 'node:assert/strict';
import { moveRuntimeFixture } from './fixtures/move-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { add36,halfWords,rightHalf,signed36,MAX_INTEGER,MIN_INTEGER,packAscii } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
function fixture(ms=2000n){const f=moveRuntimeFixture();f.m.write(f.wait.argument,ms);return f;}
function held(f:ReturnType<typeof fixture>,key=777n){f.locks.write('locked',key);f.locks.write('loktab',key,19);return key;}
const sleep=(n:bigint)=>({value:`hiber:${n}`,done:false});

for(const n of [-1n,0n,MIN_INTEGER])test(`Raw PAUSE ${n} leaves accumulators and remembered wait lock unchanged`,()=>{
  const f=fixture(n);held(f);f.wait.state.svlock=88n;f.r.t1=11n;f.r.t2=12n;f.r.t3=13n;assert.equal(f.wait.pause().next().done,true);assert.deepEqual([f.r.t1,f.r.t2,f.r.t3,f.wait.state.svlock],[11n,12n,13n,88n]);assert.deepEqual(f.wait.events,[]);
});
for(const n of [1n,10000n,10001n,MAX_INTEGER])test(`Raw PAUSE ${n} caps both deadline contribution and first HIBER`,()=>{
  const f=fixture(n),duration=n>10000n?10000n:n;f.wait.clocks.splice(0,2,1000n,1000n+duration);const g=f.wait.pause();assert.deepEqual(g.next(),sleep(duration));assert.equal(f.r.t3,1000n+duration);assert.equal(g.next().done,true);assert.equal(f.r.t1,0n);assert.deepEqual(f.wait.events,[`mstime:t3`,`hiber:${duration}`,'mstime:t2']);
});
test('Raw PAUSE releases actual lock before wait and reacquires through raw ENQ after deadline',()=>{
  const f=fixture(),key=held(f);f.wait.clocks.splice(0,2,1000n,3000n);const g=f.wait.pause();assert.deepEqual(g.next(),sleep(2000n));assert.equal(f.locks.read('locked'),key);assert.equal(f.locks.read('svlock'),key);assert.equal(f.locks.read('loktab',19),0n);assert.equal(f.events.filter(e=>e==='deq').length,1);assert.equal(g.next().done,true);assert.equal(f.locks.read('loktab',19),key);assert.deepEqual(f.wait.events,[`unlo:${key}`,'mstime:t3','hiber:2000','mstime:t2',`lock:${key}`,'branch:success']);assert.equal(f.events.filter(e=>e==='enq').length,1);
});
test('Raw PAUSE awaits DEQ before rereading the actual duration and retains LOCKED',()=>{
  const f=fixture(20n),key=held(f),deq=f.unlockIO.deq;f.unlockIO.deq=function*(){yield 'deq';return yield*deq();};const g=f.wait.pause();assert.equal(g.next().value,'deq');assert.equal(f.wait.state.svlock,key);assert.equal(f.wait.state.locked,key);assert.equal(f.locks.read('loktab',19),0n);f.m.write(f.wait.argument,40n);assert.deepEqual(g.next(),sleep(40n));assert.equal(f.r.t3,1040n);finish(g);
});
test('Raw PAUSE duration becoming nonpositive during release skips clocks but reacquires',()=>{
  const f=fixture(20n),key=held(f),unlo=f.wait.io.unlo;f.wait.io.unlo=function*(){yield*unlo();f.m.write(f.wait.argument,-5n);};finish(f.wait.pause());assert.deepEqual(f.wait.events,[`unlo:${key}`,`lock:${key}`,'branch:success']);assert.equal(f.locks.read('loktab',19),key);
});
test('Raw PAUSE rereads current ARG after release rather than a captured duration address',()=>{
  const f=fixture(),unlo=f.wait.io.unlo;held(f);f.m.write(16301n,33n);f.wait.io.unlo=function*(){yield*unlo();loadArgumentBlock(f.m,16320n,[16301n]);selectArgumentBlock(f.r,16320n);};const g=f.wait.pause();assert.deepEqual(g.next(),sleep(33n));assert.equal(f.r.t3,1033n);finish(g);
});
test('Raw PAUSE last duration read can be negative while the previously computed deadline is positive',()=>{
  const f=fixture(10n),clock=f.wait.io.mstime;f.wait.io.mstime=function*(reg){yield*clock(reg);if(reg==='t3')f.m.write(f.wait.argument,-7n);};const g=f.wait.pause();assert.deepEqual(g.next(),sleep(-7n));assert.equal(f.r.t3,1010n);finish(g);
});
test('Raw PAUSE MSTIME effects on T1 are included in the subsequent deadline ADD',()=>{
  const f=fixture(),clock=f.wait.io.mstime;f.wait.io.mstime=function*(reg){yield*clock(reg);if(reg==='t3'){yield 'clock';f.r.t1=15n;}};const g=f.wait.pause();assert.equal(g.next().value,'clock');assert.equal(f.r.t3,1000n);assert.deepEqual(g.next(),sleep(2000n));assert.equal(f.r.t3,1015n);finish(g);
});
test('Raw PAUSE deadline ADD uses supplied CPU policy and preserves overflow state',()=>{
  const f=fixture(10n);f.wait.clocks.splice(0,2,MAX_INTEGER,MIN_INTEGER+9n);const g=f.wait.pause();assert.deepEqual(g.next(),sleep(10n));assert.equal(f.r.t3,MIN_INTEGER+9n);assert.equal(g.next().done,true);
});
test('Raw PAUSE ADD failure preserves clock and duration registers without hibernating',()=>{
  const f=fixture(),key=held(f);f.wait.io.addT3=function*(){throw new Error('ADD fault');};assert.throws(()=>finish(f.wait.pause()),/ADD fault/);assert.equal(f.r.t3,1000n);assert.equal(f.r.t1,2000n);assert.equal(f.wait.state.svlock,key);assert.equal(f.locks.read('loktab',19),0n);assert.deepEqual(f.wait.operands,[]);
});
test('Raw PAUSE early wakes reread live T3 and use one-second HIBER operands',()=>{
  const f=fixture(20n);f.wait.clocks.splice(0,2,1000n,1019n,1020n);const g=f.wait.pause();assert.deepEqual(g.next(),sleep(20n));assert.deepEqual(g.next(),sleep(1000n));assert.equal(g.next().done,true);assert.deepEqual(f.wait.operands,[20n,1000n]);
});
test('Raw PAUSE hibernation can change T3 and the post-wake comparison sees it',()=>{
  const f=fixture();f.wait.clocks.splice(0,2,1000n,1001n);const g=f.wait.pause();assert.deepEqual(g.next(),sleep(2000n));f.r.t3=1001n;assert.equal(g.next().done,true);
});
test('Raw PAUSE retains midnight rewait behavior without ETIM correction',()=>{
  const f=fixture();f.wait.clocks.splice(0,2,86399000n,1000n,2000n,86399999n);const g=f.wait.pause();assert.deepEqual(g.next(),sleep(2000n));for(let i=0;i<3;i++)assert.deepEqual(g.next(),sleep(1000n));assert.equal(f.r.t3,86401000n);g.return();
});
test('Raw PAUSE HIBER failure calls HALT before a subsequent clock read',()=>{
  const f=fixture();f.wait.io.hiber=function*(){yield 'hiber-fail';return false;};const g=f.wait.pause();assert.equal(g.next().value,'hiber-fail');assert.throws(()=>g.next(),/HALT transfer/);assert.deepEqual(f.wait.events,['mstime:t3','halt']);assert.equal(f.wait.clocks.length,1);
});
test('Raw PAUSE returning HALT resumes at MSTIME with live registers',()=>{
  const f=fixture();f.wait.io.hiber=function*(){return false;};f.wait.io.halt=function*(){yield 'halt';};const g=f.wait.pause();assert.equal(g.next().value,'halt');f.r.t3=500n;assert.equal(g.next().done,true);assert.equal(f.r.t2,11000n);
});
test('Raw PAUSE failed MSTIME after HIBER leaves the lock released and old register contents',()=>{
  const f=fixture(),key=held(f),clock=f.wait.io.mstime;f.wait.io.mstime=function*(reg){if(reg==='t2')throw new Error('clock fault');yield*clock(reg);};const g=f.wait.pause();g.next();f.r.t2=88n;assert.throws(()=>g.next(),/clock fault/);assert.equal(f.r.t2,88n);assert.equal(f.r.t1,2000n);assert.equal(f.wait.state.locked,key);assert.equal(f.locks.read('loktab',19),0n);
});
test('Raw PAUSE reacquisition uses current SVLOCK rather than the initially released key',()=>{
  const f=fixture(),key=held(f);const g=f.wait.pause();g.next();f.wait.state.svlock=778n;finish(g);assert.equal(f.wait.state.locked,key);assert.equal(f.locks.read('loktab',19),778n);assert.ok(f.wait.events.includes('lock:778'));
});
test('Raw wait reacquisition failure uses the required jump policy before reloading SVLOCK',()=>{
  const f=fixture();held(f);const lock=f.wait.io.lock,jump=f.wait.io.lockJump;let first=true;f.wait.io.lock=function*(){if(first){first=false;f.wait.state.lkfail=-1n;f.r.t1=999n;}else yield*lock();};f.wait.io.lockJump=function*(branch){if(branch==='failure')yield 'branch';return yield*jump(branch);};const g=f.wait.pause();g.next();assert.equal(g.next().value,'branch');assert.equal(f.r.t1,999n);f.wait.state.svlock=779n;finish(g);assert.equal(f.locks.read('loktab',19),779n);assert.deepEqual(f.wait.events.slice(-3),['branch:failure','lock:779','branch:success']);
});
test('Raw wait jump policy can repeat the test without another lock call',()=>{
  const f=fixture();held(f);let locks=0;f.wait.io.lock=function*(){locks++;f.wait.state.lkfail=1n;};f.wait.io.lockJump=function*(branch){if(branch==='failure'){yield 'jump';return 'test-lkfail';}return 'return';};const g=f.wait.pause();g.next();assert.equal(g.next().value,'jump');assert.equal(locks,1);f.wait.state.lkfail=0n;assert.equal(g.next().done,true);assert.equal(locks,1);
});
test('Raw wait unresolved literal transfer remains an error after successful reacquisition',()=>{
  const f=fixture(),key=held(f);f.wait.io.lockJump=function*(){throw new Error('literal target required');};assert.throws(()=>finish(f.wait.pause()),/literal target required/);assert.equal(f.locks.read('loktab',19),key);assert.equal(f.wait.state.lkfail,0n);
});
for(const mode of ['tail','ini'] as const)test(`Raw INPUT ${mode} skips duration access but executes source SAVE/RESTORE`,()=>{
  const f=fixture();if(mode==='tail')f.wait.state.bufptr=1n;else{f.wait.state.bufptr=0n;f.wait.state.iniflg=-1n;}f.r.t1=123n;const stack=f.r.s;assert.equal(f.wait.input(0o377777n).next().done,true);assert.equal(f.r.f,-1n);assert.equal(f.r.t1,123n);assert.equal(f.r.s,stack);assert.deepEqual(f.wait.events,['save:-1','restore']);
});
for(const [ms,pending,ctrl,expected] of [[0n,false,0n,0n],[-1n,false,1n,-1n],[0n,true,0n,-1n]] as const)test(`Raw INPUT poll ${ms}, pending ${pending}, Ctrl-C ${ctrl}`,()=>{
  const f=fixture(ms);f.wait.state.bufptr=-1n;f.wait.state.ccflg=ctrl;f.wait.io.skpinc=function*(){f.wait.events.push('skpinc');return pending;};finish(f.wait.input());assert.equal(f.r.f,expected);assert.equal(f.r.t1,ms);assert.deepEqual(f.wait.events,['skpinc',`save:${expected}`,'restore']);
});
for(const ms of [20000n,262144n,MAX_INTEGER])test(`Raw INPUT ${ms} is uncapped and HRLI replaces the duration left half`,()=>{
  const f=fixture(ms);f.wait.state.bufptr=-1n;const operand=signed36(halfWords(f.wait.wakeInputLeftHalf,rightHalf(ms))),g=f.wait.input();assert.deepEqual(g.next(),sleep(operand));assert.equal(g.next().done,true);assert.equal(f.r.f,0n);assert.deepEqual(f.wait.operands,[operand]);
});
test('Raw INPUT reacquires the actual lock before hungup bypasses SKPINC',()=>{
  const f=fixture(),key=held(f);f.wait.state.bufptr=-1n;const g=f.wait.input();g.next();f.wait.state.hungup=-1n;finish(g);assert.equal(f.r.f,-1n);assert.equal(f.locks.read('loktab',19),key);assert.ok(!f.wait.events.includes('skpinc'));assert.deepEqual(f.wait.events.slice(-4),[`lock:${key}`,'branch:success','save:-1','restore']);
});
test('Raw INPUT awaits DEQ then rereads timeout without another positivity check',()=>{
  const f=fixture(20n);held(f);f.wait.state.bufptr=-1n;const unlo=f.wait.io.unlo;f.wait.io.unlo=function*(){yield*unlo();yield 'released';};const g=f.wait.input();assert.equal(g.next().value,'released');f.m.write(f.wait.argument,-1n);assert.deepEqual(g.next(),sleep(signed36(halfWords(f.wait.wakeInputLeftHalf,0o777777n))));finish(g);
});
test('Raw INPUT SKPINC suspension observes Ctrl-C after returning without a skip',()=>{
  const f=fixture(0n);f.wait.state.bufptr=-1n;f.wait.io.skpinc=function*(){yield 'poll';return false;};const g=f.wait.input();assert.equal(g.next().value,'poll');assert.equal(f.r.f,0n);f.wait.state.ccflg=-1n;finish(g);assert.equal(f.r.f,-1n);
});
test('Raw INPUT save and restore retain real S stack and permit changed saved result',()=>{
  const f=fixture();f.wait.state.bufptr=1n;const push=f.wait.io.pushData;f.wait.io.pushData=function*(w){yield*push(w);yield 'saved';};const original=f.r.s,g=f.wait.input();assert.equal(g.next().value,'saved');assert.equal(f.m.read(rightHalf(f.r.s)),-1n);f.m.write(rightHalf(f.r.s),17n);finish(g);assert.equal(f.r.s,original);assert.equal(f.r.f,17n);
});
test('Raw INPUT HALT failure prevents reacquisition and input polling',()=>{
  const f=fixture(),key=held(f);f.wait.state.bufptr=-1n;f.wait.io.hiber=function*(){return false;};assert.throws(()=>finish(f.wait.input()),/HALT transfer/);assert.equal(f.locks.read('loktab',19),0n);assert.equal(f.wait.state.locked,key);assert.ok(!f.wait.events.includes('skpinc'));
});
test('Raw CLEAR waits for CLRBFi before setting BUFPTR and preserves tokens',()=>{
  const f=fixture();f.wait.state.bufptr=77n;const before=f.input.tokens.map(t=>({...t})),g=f.wait.clear(function*(){yield 'clear';});assert.equal(g.next().value,'clear');assert.equal(f.wait.state.bufptr,77n);finish(g);assert.equal(f.wait.state.bufptr,-1n);assert.deepEqual(f.input.tokens.map(t=>({...t})),before);
});
test('Raw CLEAR preexisting hangup skips CLRBFi but still discards command tail',()=>{
  const f=fixture();f.wait.state.hungup=1n;finish(f.wait.clear(function*(){throw new Error('unexpected clear');}));assert.equal(f.wait.state.bufptr,-1n);
});
test('Raw CLEAR failure retains prior command pointer',()=>{
  const f=fixture();f.wait.state.bufptr=77n;assert.throws(()=>finish(f.wait.clear(function*(){throw new Error('clear fault');})),/clear fault/);assert.equal(f.wait.state.bufptr,77n);
});
test('MOVE COMPUTED now awaits raw PAUSE before token shifts and uses the original movement deadline',()=>{
  const f=moveRuntimeFixture('MOVE COMPUTED N');f.high.write('names',packAscii('NIMIT'),2,1);f.high.write('alive',-1n,2);f.high.write('shpcon',14n,2,K.KVPOS);f.high.write('shpcon',20n,2,K.KHPOS);f.views.high.board.setdsp(14,20,102);f.high.write('job',9600n,1,K.KTTYSP);
  f.wait.clocks.splice(0,2,1000n,11000n);f.clock[1]=12000n;const g=f.run();assert.deepEqual(g.next(),sleep(10000n));assert.equal(f.m.read(f.wait.argument),19200n);assert.equal(f.low.read('ntok'),3n);assert.equal(f.input.tokens[0].text,'MOVE');assert.equal(f.ship.docked,true);assert.equal(f.m.read(f.locals.v),3100n);assert.equal(finish(g).pause,-8900n);assert.equal(f.ship.v,13);assert.equal(f.ship.energy,9360n);
});

test('Raw PAUSE duration aliasing T1 sees the remembered-lock MOVE before its second read',()=>{
  const f=fixture();f.r.t1=20n;assert.equal(f.wait.pause(1n).next().done,true);assert.equal(f.r.t1,0n);assert.deepEqual(f.wait.events,[]);
});
test('Raw PAUSE duration aliasing T3 sees its new deadline at the third read',()=>{
  const f=fixture();f.r.t3=20n;const g=f.wait.pause(3n);assert.deepEqual(g.next(),sleep(1020n));assert.equal(f.r.t3,1020n);finish(g);
});
test('Raw INPUT duration aliasing T1 sees the saved key at the post-release read',()=>{
  const f=fixture(),key=held(f);f.wait.state.bufptr=-1n;f.r.t1=20n;const g=f.wait.input(1n);assert.deepEqual(g.next(),sleep(signed36(halfWords(f.wait.wakeInputLeftHalf,key))));finish(g);
});
test('Raw INPUT hungup changes during SKPINC do not cause an added hangup recheck',()=>{
  const f=fixture(0n);f.wait.state.bufptr=-1n;f.wait.io.skpinc=function*(){yield 'poll';return false;};const g=f.wait.input();g.next();f.wait.state.hungup=-1n;finish(g);assert.equal(f.r.f,0n);
});
test('Raw INPUT SKPINC effects on AC0 survive a no-input/no-Ctrl-C return',()=>{
  const f=fixture(0n);f.wait.state.bufptr=-1n;f.wait.io.skpinc=function*(){f.r.f=19n;return false;};finish(f.wait.input());assert.equal(f.r.f,19n);assert.deepEqual(f.wait.events,['save:19','restore']);
});
test('Raw wait lock-entry target repeats current T1 without an implicit SVLOCK reload',()=>{
  const f=fixture();held(f);const keys:bigint[]=[];f.wait.io.lock=function*(){keys.push(f.r.t1);f.wait.state.lkfail=keys.length===1?-1n:0n;f.r.t1=779n;};f.wait.io.lockJump=function*(branch){return branch==='failure'?'lock':'return';};finish(f.wait.pause());assert.deepEqual(keys,[777n,779n]);assert.equal(f.wait.state.svlock,777n);
});
test('MOVE computed PAUSE failure leaves tokens and original deadline before undocking',()=>{
  const f=moveRuntimeFixture('MOVE COMPUTED N');f.high.write('job',9600n,1,K.KTTYSP);f.wait.io.hiber=function*(){return false;};assert.throws(()=>finish(f.run()),/HALT transfer/);assert.equal(f.input.tokens[0].text,'MOVE');assert.equal(f.low.read('ntok'),3n);assert.equal(f.m.read(f.locals.v),3100n);assert.equal(f.ship.docked,true);assert.equal(f.ship.energy,10000n);
});
