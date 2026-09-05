import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { emptyHit,packHit } from '../src/game/hit-queue.ts';
import { halfWords,signed36,rightHalf,MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { constants as K } from '../src/generated/source-data.ts';
function fixture(){
  const f=pregameRuntimeFixture([]),b=f.getHit,q=b.queues.hit;
  const payload={...emptyHit(),dispfr:101n,dispto:201n,ihita:500n,critdm:30n,iwhat:14n,critdv:7n,vfrom:12n,hfrom:23n,vto:24n,hto:25n,klflg:2n,shcnfr:1n,shcnto:-1n,shstfr:345n,shstto:678n,shjump:1n};
  for(const a of Object.values(b.symbols.fields))f.m.write(a,99n);f.low.write('dbits',77n);f.high.write('hitflg',1n,1);f.r.x2=55n;f.r.x3=66n;
  const slot=(i:number,recipients=3n,serial=5n)=>{q.links[i]=signed36(halfWords(serial,recipients));packHit(payload).forEach((n,j)=>q.data[i][j]=n);};
  return {...f,b,q,payload,slot,run:()=>finish(b.run()),decoded:()=>Object.fromEntries(Object.entries(b.symbols.fields).map(([k,a])=>[k,f.m.read(a)]))};
}
test('Raw GETHIT decrements first and preserves X2/X3 and DBITS on a negative-count return',()=>{
  const f=fixture();f.high.write('hitflg',0n,1);f.slot(0);f.run();assert.equal(f.high.read('hitflg',1),-1n);assert.deepEqual(f.decoded(),emptyHit());assert.equal(f.low.read('dbits'),77n);assert.equal(f.r.t1,1n);assert.equal(f.r.x2,55n);assert.equal(f.r.x3,66n);assert.equal(rightHalf(f.q.links[0]),3n);
});
test('Raw GETHIT no match clears sixteen fields but retains DBITS and the decremented count',()=>{
  const f=fixture();f.high.write('hitflg',3n,1);f.run();assert.equal(f.high.read('hitflg',1),2n);assert.deepEqual(f.decoded(),emptyHit());assert.equal(f.low.read('dbits'),77n);assert.equal(f.r.t1,0n);assert.equal(f.r.x2,399n);assert.equal(f.r.x3,1n);
});
test('Raw GETHIT decodes actual queue words and clears only its recipient bit',()=>{
  const f=fixture();f.slot(4);f.run();assert.deepEqual(f.decoded(),f.payload);assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.low.read('dbits'),3n);assert.equal(f.q.links[4],signed36(halfWords(5n,2n)));assert.equal(f.r.x2,4n);assert.equal(f.r.x3,1n);assert.equal(f.r.t1,f.b.symbols.hitq+16n);assert.equal(f.r.t2,3n);
});
test('Raw GETHIT finds the first physical matching slot rather than the oldest serial',()=>{
  const f=fixture();f.slot(2,1n,999n);f.slot(3,1n,1n);f.q.data[2][0]=halfWords(102n,202n);f.run();assert.equal(f.low.read('dispfr'),102n);assert.equal(f.r.x2,2n);assert.equal(rightHalf(f.q.links[3]),1n);
});
test('Raw GETHIT includes the final queue slot',()=>{
  const f=fixture();f.slot(399,1n);f.run();assert.equal(f.r.x2,399n);assert.equal(f.low.read('iwhat'),14n);assert.equal(rightHalf(f.q.links[399]),0n);
});
test('Raw GETHIT uses the current BITS word instead of synthesizing a player bit',()=>{
  const f=fixture();f.high.write('bits',8n,1);f.slot(0,1n);f.slot(1,24n);f.run();assert.equal(f.r.x2,1n);assert.equal(f.low.read('dbits'),24n);assert.equal(rightHalf(f.q.links[1]),16n);
});
test('Raw GETHIT zero BITS scans and misses even when pending links exist',()=>{
  const f=fixture();f.high.write('bits',0n,1);f.slot(0);f.run();assert.deepEqual(f.decoded(),emptyHit());assert.equal(rightHalf(f.q.links[0]),3n);assert.equal(f.low.read('dbits'),77n);
});
test('Raw GETHIT defensively maps all-ones source and destination halves to zero',()=>{
  const f=fixture();f.slot(0);f.q.data[0][0]=-1n;f.q.data[0][1]=-1n;f.run();assert.equal(f.low.read('dispfr'),0n);assert.equal(f.low.read('dispto'),0n);assert.equal(f.low.read('ihita'),0o777777n);assert.equal(f.low.read('critdm'),0o777777n);
});
test('Raw GETHIT forwards exact POINT spellings to the required assembler/CPU service',()=>{
  const f=fixture();f.slot(0);f.run();assert.deepEqual(f.b.events,['point:4,2,3','point:4,2,7','point:7,2,14','point:7,2,21','point:7,2,28','point:7,2,35','point:2,3,1','point:1,3,2','point:1,3,3','point:10,3,13','point:10,3,23','point:1,3,24']);
});
test('Raw GETHIT stores required LDB results and maps shield conditions using only bit zero',()=>{
  const f=fixture();f.slot(0);f.b.io.ldbT2=function*(p){f.r.t2=p.offset===3&&p.end==='2'?2n:p.offset===3&&p.end==='3'?3n:123n;};f.run();assert.equal(f.low.read('iwhat'),123n);assert.equal(f.low.read('shcnfr'),-1n);assert.equal(f.low.read('shcnto'),3n);assert.equal(f.low.read('shstfr'),123n);
});
test('Raw GETHIT SOSL receives a physical player-zero alias without adding a range check',()=>{
  const f=fixture();f.m.write(f.b.player,0n);let address:bigint|undefined;f.b.io.sosl=function*(a){address=a;return true;};f.run();assert.equal(address,f.b.symbols.hitflg-1n);assert.deepEqual(f.decoded(),emptyHit());
});
test('Raw GETHIT required SOSL skip result controls the branch independently of memory sign',()=>{
  const f=fixture();f.slot(0);f.b.io.sosl=function*(a){f.m.write(a,-99n);return false;};f.run();assert.equal(f.low.read('iwhat'),14n);assert.equal(f.high.read('hitflg',1),-99n);
});
test('Raw GETHIT SOSL fixture wraps the most negative count before scanning',()=>{
  const f=fixture();f.high.write('hitflg',MIN_INTEGER,1);f.slot(0);f.run();assert.equal(f.high.read('hitflg',1),MAX_INTEGER);assert.equal(f.low.read('iwhat'),14n);
});
test('Raw GETHIT reads BITS after a suspended decrement using then-current T1',()=>{
  const f=fixture(),sosl=f.b.io.sosl;f.slot(0,2n);f.b.io.sosl=function*(a){const skip=yield*sosl(a);yield 'count';return skip;};const g=f.b.run();assert.equal(g.next().value,'count');f.r.t1=2n;finish(g);assert.equal(f.r.x3,2n);assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.low.read('dbits'),2n);
});
test('Raw GETHIT scan observes links changed while its AOJA service is suspended',()=>{
  const f=fixture(),aoja=f.b.io.aojaX2;f.b.io.aojaX2=function*(){yield*aoja();yield 'scan';};const g=f.b.run();assert.equal(g.next().value,'scan');f.slot(1);finish(g);assert.equal(f.r.x2,1n);assert.equal(f.low.read('iwhat'),14n);
});
test('Raw GETHIT reads later payload fields after a suspended LDB rather than unpacking a snapshot',()=>{
  const f=fixture(),ldb=f.b.io.ldbT2;f.slot(0);f.b.io.ldbT2=function*(p){yield*ldb(p);if(p.end==='3'&&p.offset===2)yield 'first-field';};const g=f.b.run();assert.equal(g.next().value,'first-field');assert.equal(f.low.read('iwhat'),99n);f.q.data[0][2]=0n;finish(g);assert.equal(f.low.read('iwhat'),14n);assert.equal(f.low.read('critdv'),0n);assert.equal(f.low.read('vfrom'),0n);
});
test('Raw GETHIT LDB failure preserves earlier decoded words and leaves the link pending',()=>{
  const f=fixture();f.slot(0);f.b.io.ldbT2=function*(){throw new Error('ldb fault');};assert.throws(f.run,/ldb fault/);assert.equal(f.low.read('dispfr'),101n);assert.equal(f.low.read('critdm'),30n);assert.equal(f.low.read('iwhat'),99n);assert.equal(f.low.read('dbits'),77n);assert.equal(rightHalf(f.q.links[0]),3n);assert.equal(f.high.read('hitflg',1),0n);
});
test('Raw GETHIT later link address and recipient removal use changed X2/X3',()=>{
  const f=fixture(),ldb=f.b.io.ldbT2;f.slot(0);f.slot(1,12n);f.b.io.ldbT2=function*(p){yield*ldb(p);if(p.end==='24'){f.r.x2=1n;f.r.x3=4n;}};f.run();assert.equal(f.low.read('dbits'),12n);assert.equal(rightHalf(f.q.links[0]),3n);assert.equal(rightHalf(f.q.links[1]),8n);
});
test('Raw GETHIT argument changes after its first load do not replace the saved player register',()=>{
  const f=fixture(),sosl=f.b.io.sosl;f.slot(0);f.b.io.sosl=function*(a){const skip=yield*sosl(a);f.m.write(f.b.player,2n);return skip;};f.run();assert.equal(f.r.x3,1n);assert.equal(rightHalf(f.q.links[0]),2n);
});
test('Raw GETHIT selects live ARG before its first argument load',()=>{
  const f=fixture(),g=f.b.run();f.m.write(26220n,2n);f.high.write('hitflg',1n,2);loadArgumentBlock(f.m,26230n,[26220n]);selectArgumentBlock(f.r,26230n);f.slot(0,2n);finish(g);assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('hitflg',2),0n);assert.equal(f.r.x3,2n);
});
test('Raw GETHIT final DBITS store can alias X3 before ANDCAM',()=>{
  const f=fixture();f.slot(0,3n);f.b.symbols.dbits=7n;f.run();assert.equal(f.r.x3,3n);assert.equal(rightHalf(f.q.links[0]),0n);
});
test('FREE drains raw hit slots for its actual SNUM and preserves other recipients',()=>{
  const f=fixture();f.high.write('numply',2n);f.high.write('trstat',0n,1);f.high.write('msgflg',0n,1);f.slot(0);f.slot(1,1n);f.high.write('hitflg',3n,1);finish(f.free.run());assert.equal(f.high.read('hitflg',1),0n);assert.equal(rightHalf(f.q.links[0]),2n);assert.equal(rightHalf(f.q.links[1]),0n);assert.equal(f.b.events.filter(e=>e==='gethit').length,3);assert.deepEqual(f.decoded(),emptyHit());assert.equal(f.low.read('dbits'),0n);assert.equal(f.high.read('alive',1),1n);
});
test('FREE raw GETHIT failure retains saved ship state and prevents final release',()=>{
  const f=fixture();f.high.write('numply',2n);f.high.write('trstat',0n,1);f.slot(0);f.b.io.ldbT2=function*(){throw new Error('hit fault');};assert.throws(()=>finish(f.free.run()),/hit fault/);assert.equal(f.free.fr.read('tshpco',K.KVPOS),10n);assert.equal(f.high.read('shpcon',1,K.KVPOS),0n);assert.equal(f.high.read('alive',1),-1n);assert.ok(!f.free.events.includes('unlock'));assert.equal(rightHalf(f.q.links[0]),3n);
});
test('Statement TRCOFF clears both live beam partners before required MAKHIT',()=>{
  const f=fixture();f.high.write('trstat',2n,1);f.high.write('trstat',1n,2);f.b.tractorIO.makhit=function*(){assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',2),0n);assert.equal(f.low.read('dbits'),3n);assert.equal(f.low.read('iwhat'),14n);};finish(f.b.tractor());
});
test('Statement TRCOFF already-zero partner reads BITS(0) and clears physical TRSTAT(0)',()=>{
  const f=fixture();f.high.write('trstat',0n,1);f.high.write('bits',8n,0);f.high.write('trstat',777n,0);f.b.tractorIO.makhit=function*(){};finish(f.b.tractor());assert.equal(f.low.read('dbits'),9n);assert.equal(f.high.read('trstat',0),0n);
});
test('Statement TRCOFF IP alias observes the first nested clear before the second destination',()=>{
  const f=fixture();f.high.write('trstat',2n,1);f.high.write('trstat',1n,2);f.high.write('trstat',999n,0);f.b.tractorIO.makhit=function*(){};finish(f.b.tractor(f.high.address('trstat',2)));assert.equal(f.high.read('trstat',1),2n);assert.equal(f.high.read('trstat',2),0n);assert.equal(f.high.read('trstat',0),0n);
});
test('Statement TRCOFF requires integer OR and observes mutations before its following assignments',()=>{
  const f=fixture();f.high.write('trstat',2n,1);f.b.tractorIO.integerOr=function*(a,b){assert.equal(yield*a.evaluate(),1n);assert.equal(yield*b.evaluate(),2n);f.high.write('trstat',3n,1);return 99n;};f.b.tractorIO.makhit=function*(){};finish(f.b.tractor());assert.equal(f.low.read('dbits'),99n);assert.equal(f.high.read('trstat',3),0n);assert.equal(f.high.read('trstat',1),0n);
});
test('Statement TRCOFF required MAKHIT failure retains the already-cleared beams and hit registers',()=>{
  const f=fixture();f.high.write('trstat',2n,1);f.high.write('trstat',1n,2);f.b.tractorIO.makhit=function*(){throw new Error('MAKHIT fault');};assert.throws(()=>finish(f.b.tractor()),/MAKHIT fault/);assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',2),0n);assert.equal(f.low.read('iwhat'),14n);assert.equal(f.low.read('dbits'),3n);
});
test('FREE TRCOFF component producer and raw GETHIT share actual queue words and caller WHO',()=>{
  const f=fixture();f.high.write('numply',2n);f.low.write('who',2n);f.high.write('trstat',3n,1);f.high.write('trstat',1n,3);f.high.write('hitflg',0n,1);f.high.write('hitflg',0n,3);f.high.write('msgflg',0n,1);f.low.write('dbits',0n);
  // Explicit existing component MAKHIT fixture; no claim of raw producer/POINT parity.
  f.b.tractorIO.makhit=function*(){f.q.make(Number(f.low.read('who')),f.hit, f.views.high.players,0n,f.views.low.output);};
  finish(f.free.run());assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',3),0n);assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.high.read('hitflg',3),1n);assert.equal(rightHalf(f.q.links[40]),4n);assert.equal(rightHalf(f.q.links[0]),0n);assert.equal(f.high.read('alive',1),1n);
});
