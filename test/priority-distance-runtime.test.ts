import test from 'node:test';
import assert from 'node:assert/strict';
import { statusRuntimeFixture } from './fixtures/status-runtime.ts';
import { priorityDistanceRuntimeFixture } from './fixtures/priority-distance-runtime.ts';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';
function fixture(){
  const f=statusRuntimeFixture(),p=priorityDistanceRuntimeFixture(f,f.high,f.low),a={iv:13800n,ih:13801n,ilim:13802n,iflag:13803n,zero:13804n};
  [10n,20n,4n,0n,0n].forEach((v,i)=>f.m.write(13800n+BigInt(i),v));
  for(let i=1;i<=K.KNPLAY;i++){f.high.write('bits',1n<<BigInt(i-1),i);f.high.write('shpcon',10n,i,K.KVPOS);f.high.write('shpcon',20n,i,K.KHPOS);}
  return {...f,p,a,run:()=>p.run(a)};
}
for(const [flag,mask,start,end] of [[0n,1023n,1n,11n],[1n,31n,1n,6n],[2n,992n,6n,11n],[3n,1023n,1n,11n],[-1n,1023n,1n,11n]] as const)test(`PRIDIS flag ${flag} selects source physical range`,()=>{
  const f=fixture();f.m.write(f.a.iflag,flag);finish(f.run());assert.equal(f.low.read('dbits'),mask);assert.equal(f.m.read(f.p.locals.li),start);assert.equal(f.m.read(f.p.locals.i),end);assert.equal(f.p.events.length,Number(end-start));
});
for(const zero of [0n,1n,-1n,7n])test(`PRIDIS ZERO ${zero} controls clearing by equality to zero`,()=>{
  const f=fixture();f.low.write('dbits',2048n);f.m.write(f.a.zero,zero);finish(f.run());assert.equal(f.low.read('dbits'),zero===0n?1023n:3071n);
});
test('PRIDIS tests ALIVE numerically and includes zero and negative words',()=>{
  const f=fixture();[1n,0n,-1n,MIN_INTEGER,MAX_INTEGER].forEach((v,i)=>f.high.write('alive',v,i+1));f.m.write(f.a.iflag,1n);finish(f.run());assert.equal(f.low.read('dbits'),14n);assert.equal(f.p.events.length,3);
});
test('PRIDIS does not consult board visibility, player count or ACTIVE',()=>{
  const f=fixture();f.high.write('numply',0n);for(let i=1;i<=10;i++)f.high.write('active',1n,i);finish(f.run());assert.equal(f.low.read('dbits'),1023n);
});
test('PRIDIS inclusive raw distance applies on each axis and keeps a negative limit',()=>{
  const f=fixture();f.high.write('shpcon',14n,1,K.KVPOS);f.high.write('shpcon',24n,1,K.KHPOS);f.high.write('shpcon',15n,2,K.KVPOS);f.high.write('shpcon',25n,3,K.KHPOS);finish(f.run());assert.equal(f.low.read('dbits'),1017n);
  f.m.write(f.a.ilim,-1n);finish(f.run());assert.equal(f.low.read('dbits'),0n);
});
test('PRIDIS keeps full 36-bit BITS values rather than restricting to player bits',()=>{
  const f=fixture();f.high.write('bits',MIN_INTEGER,1);f.high.write('bits',0n,2);finish(f.run());assert.equal(f.low.read('dbits'),MIN_INTEGER+1020n);
});
test('PRIDIS clears DBITS after flag decisions and before DO bound evaluation',()=>{
  const f=fixture();f.low.write('dbits',2n);f.a.iflag=f.low.address('dbits');const bounds=f.p.io.bounds;
  f.p.io.bounds=function*(s,l){assert.equal(f.low.read('dbits'),0n);return yield*bounds(s,l);};finish(f.run());assert.equal(f.low.read('dbits'),992n);
});
test('PRIDIS initial local stores precede an aliased IFLAG read',()=>{
  const f=fixture();f.m.write(f.p.locals.li,2n);f.a.iflag=f.p.locals.li;finish(f.run());assert.equal(f.low.read('dbits'),31n);
});
test('PRIDIS ZERO can alias LJ and observe its entry initialization',()=>{
  const f=fixture();f.m.write(f.p.locals.lj,0n);f.a.zero=f.p.locals.lj;f.low.write('dbits',2048n);finish(f.run());assert.equal(f.low.read('dbits'),3071n);
});
test('PRIDIS passes original coordinate and limit addresses to every raw LDIS',()=>{
  const f=fixture();finish(f.run());for(let i=0;i<10;i++)assert.deepEqual(f.p.events[i],[f.a.iv,f.a.ih,f.high.address('shpcon',i+1,K.KVPOS),f.high.address('shpcon',i+1,K.KHPOS),f.a.ilim]);
});
test('PRIDIS reads future ALIVE and coordinate words after suspension',()=>{
  const f=fixture(),ldis=f.p.io.ldis;let first=true;f.p.io.ldis=function*(...a){const v=yield*ldis(...a);if(first){first=false;yield 'distance';}return v;};
  const g=f.run();assert.equal(g.next().value,'distance');assert.equal(f.low.read('dbits'),0n);f.high.write('alive',1n,2);f.high.write('shpcon',60n,3,K.KVPOS);finish(g);assert.equal(f.low.read('dbits'),1017n);
});
test('PRIDIS reads DBITS and current BITS(I) after LDIS returns',()=>{
  const f=fixture(),ldis=f.p.io.ldis;f.m.write(f.a.iflag,1n);let first=true;f.p.io.ldis=function*(...a){const v=yield*ldis(...a);if(first){first=false;f.low.write('dbits',2048n);f.high.write('bits',1024n,1);}return v;};finish(f.run());assert.equal(f.low.read('dbits'),3102n);
});
test('PRIDIS I and LJ are actual saved words while the DO upper bound is captured',()=>{
  const f=fixture(),ldis=f.p.io.ldis;let first=true;f.p.io.ldis=function*(...a){const v=yield*ldis(...a);if(first){first=false;f.m.write(f.p.locals.lj,1n);}return v;};finish(f.run());assert.equal(f.low.read('dbits'),1023n);assert.equal(f.m.read(f.p.locals.lj),1n);assert.equal(f.m.read(f.p.locals.i),11n);
});
test('PRIDIS keeps its selected interval when IFLAG changes during distance',()=>{
  const f=fixture(),ldis=f.p.io.ldis;f.m.write(f.a.iflag,1n);f.p.io.ldis=function*(...a){const v=yield*ldis(...a);f.m.write(f.a.iflag,2n);return v;};finish(f.run());assert.equal(f.low.read('dbits'),31n);
});
test('PRIDIS rereads IV for each target even when IV aliases the DBITS output',()=>{
  const f=fixture();f.a.iv=f.low.address('dbits');f.m.write(f.a.ih,0n);f.m.write(f.a.ilim,0n);
  for(let i=1;i<=10;i++){f.high.write('shpcon',i<=4?(1n<<BigInt(i-1))-1n:100n,i,K.KVPOS);f.high.write('shpcon',0n,i,K.KHPOS);}finish(f.run());assert.equal(f.low.read('dbits'),15n);
});
test('PRIDIS raw LDIS can suspend between axis comparisons and observe a changed ILIM',()=>{
  const f=fixture(),sub=f.p.cpu.subT1;f.m.write(f.a.iflag,1n);let n=0;f.p.cpu.subT1=function*(w){yield*sub(w);if(++n===2)yield 'horizontal';};
  const g=f.run();assert.equal(g.next().value,'horizontal');f.m.write(f.a.ilim,-1n);finish(g);assert.equal(f.low.read('dbits'),0n);
});
test('PRIDIS required compiler LOGICAL policy determines the LDIS result test',()=>{
  const f=fixture();f.p.io.ldis=function*(){return 1n;};finish(f.run());assert.equal(f.low.read('dbits'),0n);f.p.io.logical=w=>w!==0n;finish(f.run());assert.equal(f.low.read('dbits'),1023n);
});
test('PRIDIS required compiler OR policy controls operand order across suspension',()=>{
  const f=fixture();f.m.write(f.a.iflag,1n);let first=true;f.p.io.integerOr=function*(l,r){const right=yield*r();if(first){first=false;yield 'or';}return (yield*l())|right;};
  const g=f.run();assert.equal(g.next().value,'or');f.low.write('dbits',2048n);f.high.write('bits',1024n,1);finish(g);assert.equal(f.low.read('dbits'),2079n);
});
test('PRIDIS later LDIS failure leaves earlier recipient bits and current I',()=>{
  const f=fixture(),ldis=f.p.io.ldis;f.p.io.ldis=function*(...a){if(f.m.read(f.p.locals.i)===3n)throw new Error('distance fault');return yield*ldis(...a);};assert.throws(()=>finish(f.run()),/distance fault/);assert.equal(f.low.read('dbits'),3n);assert.equal(f.m.read(f.p.locals.i),3n);
});
test('PRIDIS assignment suspension exposes computed bit value before its store',()=>{
  const f=fixture();let first=true;f.p.io.assign=function*(d,v){const n=yield*v();if(first){first=false;yield 'assignment';}f.m.write(d(),n);};const g=f.run();assert.equal(g.next().value,'assignment');f.low.write('dbits',2048n);finish(g);assert.equal(f.low.read('dbits'),1023n);
});
test('PRIDIS empty compiler loop policy retains DBITS clearing and initial I',()=>{
  const f=fixture();f.low.write('dbits',77n);f.p.io.bounds=function*(){return {start:6n,limit:5n};};finish(f.run());assert.equal(f.low.read('dbits'),0n);assert.equal(f.m.read(f.p.locals.i),6n);assert.equal(f.p.events.length,0);
});
test('BASPHA waits for resumable PRIDIS before selecting next recipients and queueing',()=>{
  const f=basePhaserRuntimeFixture();f.damage.draws.push('0','0');const ldis=f.priority.io.ldis;let first=true;
  f.priority.io.ldis=function*(...a){const result=yield*ldis(...a);if(first){first=false;yield 'recipient';}return result;};const g=f.run();assert.equal(g.next().value,'recipient');assert.equal(f.queued.length,0);assert.equal(f.high.read('tmscor',2,K.KPEDAM),6480n);
  f.high.write('shpcon',10n,6,K.KVPOS);f.high.write('shpcon',20n,6,K.KHPOS);finish(g);assert.equal(f.queued.length,1);assert.equal(f.queued[0].dbits,33n);assert.equal(f.m.read(f.priority.locals.i),11n);
});
