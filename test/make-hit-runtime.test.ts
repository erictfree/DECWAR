import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { emptyHit,packHit } from '../src/game/hit-queue.ts';
import { halfWords,leftHalf,rightHalf,signed36,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
function fixture(who=1){
  const f=pregameRuntimeFixture([]),b=f.makeHit,q=f.getHit.queues.hit;f.low.write('who',BigInt(who));f.low.write('pasflg',0n);
  const payload={...emptyHit(),dispfr:101n,dispto:201n,ihita:500n,critdm:30n,iwhat:14n,critdv:7n,vfrom:12n,hfrom:23n,vto:24n,hto:25n,klflg:2n,shcnfr:1n,shcnto:-1n,shstfr:345n,shstto:678n,shjump:1n};Object.assign(f.hit,payload,{dbits:3n});
  for(let i=1;i<=10;i++)f.high.write('hitflg',0n,i);q.serial=10n;
  return {...f,b,q,payload,run:()=>finish(b.run()),decoded:()=>Object.fromEntries(Object.entries(b.symbols.fields).map(([k,a])=>[k,f.m.read(a)]))};
}
test('Raw MAKHIT with zero DBITS clears fields without touching serial, queue, or working registers',()=>{
  const f=fixture();f.low.write('dbits',0n);f.r.x1=99n;f.r.x2=88n;f.r.t1=77n;f.run();assert.deepEqual(f.decoded(),emptyHit());assert.equal(f.q.serial,10n);assert.equal(f.q.links[0],0n);assert.equal(f.r.x1,99n);assert.equal(f.r.x2,88n);assert.equal(f.r.t1,77n);assert.deepEqual(f.b.events,[]);
});
for(const who of [1,2,10])test(`Raw MAKHIT sender ${who} writes its own forty-slot region`,()=>{
  const f=fixture(who),index=(who-1)*40;f.run();assert.equal(f.r.x2,BigInt(index));assert.equal(f.q.links[index],signed36(halfWords(11n,3n)));assert.deepEqual([...f.q.data[index]],packHit(f.payload));assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.high.read('hitflg',2),1n);assert.equal(f.low.read('dbits'),0n);assert.deepEqual(f.decoded(),emptyHit());
});
test('Raw MAKHIT first recipient-empty slot wins regardless of serial half',()=>{
  const f=fixture();f.q.links[0]=halfWords(2n,1n);f.q.links[1]=halfWords(999n,0n);f.q.links[2]=halfWords(1n,0n);f.run();assert.equal(f.r.x2,1n);assert.equal(f.q.links[2],halfWords(1n,0n));
});
test('Raw MAKHIT full sender region selects the first strictly oldest serial',()=>{
  const f=fixture();for(let i=0;i<40;i++)f.q.links[i]=halfWords(9n,1n);f.q.links[5]=halfWords(2n,1n);f.q.links[8]=halfWords(2n,1n);f.run();assert.equal(f.r.x2,5n);assert.equal(f.r.x1,40n);assert.equal(f.q.links[8],halfWords(2n,1n));assert.ok(f.b.events.includes('oldest-continuation'));
});
test('Raw MAKHIT defaults to the first sender slot when no serial is less than HITSER',()=>{
  const f=fixture();f.q.serial=-1n;for(let i=0;i<40;i++)f.q.links[i]=halfWords(BigInt(i),1n);f.run();assert.equal(f.r.x2,0n);assert.equal(f.q.serial,0n);assert.ok(!f.b.events.includes('oldest-continuation'));
});
test('Raw MAKHIT overwrite does not reconcile the old recipients hit counts',()=>{
  const f=fixture();for(let i=0;i<40;i++)f.q.links[i]=halfWords(9n,4n);f.high.write('hitflg',40n,3);f.run();assert.equal(f.high.read('hitflg',3),40n);assert.equal(f.high.read('hitflg',1),1n);assert.equal(rightHalf(f.q.links[0]),3n);
});
test('Raw MAKHIT serial increment retains 36-bit overflow and deposits only its low half',()=>{
  const f=fixture();f.q.serial=MAX_INTEGER;f.run();assert.equal(f.q.serial,MIN_INTEGER);assert.equal(leftHalf(f.q.links[0]),rightHalf(MIN_INTEGER));
});
test('Raw MAKHIT takes source POINT spellings through its required DPB service',()=>{
  const f=fixture();f.run();assert.deepEqual(f.b.events.filter(e=>e.startsWith('point:')),['point:4,2,3','point:4,2,7','point:7,2,14','point:7,2,21','point:7,2,28','point:7,2,35','point:2,3,1','point:1,3,2','point:1,3,3','point:10,3,13','point:10,3,23','point:1,3,24']);
});
test('Raw MAKHIT individual DPB preserves unused bits of the fourth word',()=>{
  const f=fixture();f.q.data[0][3]=-1n;f.run();assert.equal(f.q.data[0][3]&2047n,2047n);assert.deepEqual([...f.q.data[0]],packHit(f.payload,[0n,0n,0n,-1n]));
});
for(const [value,bit] of [[-3n,0n],[0n,0n],[2n,0n],[3n,1n]] as const)test(`Raw MAKHIT shield condition ${value} follows SKIPG then low-bit DPB`,()=>{
  const f=fixture();f.low.write('shcnfr',value);f.run();assert.equal((f.q.data[0][3]>>33n)&1n,bit);
});
for(const code of [0n,16n])test(`Raw MAKHIT illegal code ${code} emits exact privileged diagnostic and then publishes`,()=>{
  const f=fixture(),s=f.r.s;f.low.write('iwhat',code);f.low.write('pasflg',1n);f.run();assert.equal(f.text(),'\r\n%Illegal IWHAT code in MAKHIT: '+code+'\r\n');assert.equal(f.r.s,s);assert.equal((f.q.data[0][2]>>32n)&15n,code&15n);assert.equal(rightHalf(f.q.links[0]),3n);
});
test('Raw MAKHIT invalid code without password still deposits its truncated field',()=>{
  const f=fixture();f.low.write('iwhat',31n);f.run();assert.equal(f.text(),'');assert.equal((f.q.data[0][2]>>32n)&15n,15n);
});
test('Raw MAKHIT diagnostic restores the saved hit code rather than rereading changed IWHAT',()=>{
  const f=fixture(),ostr=f.b.io.ostr;f.low.write('iwhat',17n);f.low.write('pasflg',-1n);f.b.io.ostr=function*(){yield*ostr();f.low.write('iwhat',14n);};f.run();assert.equal((f.q.data[0][2]>>32n)&15n,1n);assert.equal(f.text(),'\r\n%Illegal IWHAT code in MAKHIT: 17\r\n');
});
test('Raw MAKHIT diagnostic failure retains serial, written halves and SAVE stack',()=>{
  const f=fixture(),s=f.r.s;f.low.write('iwhat',16n);f.low.write('pasflg',1n);f.b.io.ostr=function*(){throw new Error('diagnostic fault');};assert.throws(f.run,/diagnostic fault/);assert.notEqual(f.r.s,s);assert.equal(f.q.serial,11n);assert.equal(rightHalf(f.q.links[0]),0n);assert.equal(f.q.data[0][0],halfWords(101n,201n));assert.equal(f.low.read('dbits'),3n);
});
test('Raw MAKHIT oldest literal continuation remains a required control-transfer policy',()=>{
  const f=fixture();f.q.links[0]=halfWords(2n,1n);f.b.io.afterOldestUpdate=function*(){throw new Error('unresolved oldest transfer');};assert.throws(f.run,/unresolved oldest transfer/);assert.equal(f.r.x2,0n);assert.equal(f.r.t3,2n);assert.equal(f.q.serial,10n);
});
test('Raw MAKHIT DPB suspension exposes serial-only link before publication',()=>{
  const f=fixture(),dpb=f.b.io.dpbT2;let first=true;f.b.io.dpbT2=function*(p){if(first){first=false;yield 'deposit';}yield*dpb(p);};const g=f.b.run();assert.equal(g.next().value,'deposit');assert.equal(f.q.links[0],halfWords(11n,0n));assert.equal(f.high.read('hitflg',1),0n);finish(g);assert.equal(rightHalf(f.q.links[0]),3n);
});
test('Raw MAKHIT later fields are loaded after earlier DPB service changes shared words',()=>{
  const f=fixture(),dpb=f.b.io.dpbT2;f.b.io.dpbT2=function*(p){yield*dpb(p);if(p.offset===2&&p.end==='3')f.low.write('critdv',9n);};f.run();assert.equal((f.q.data[0][2]>>28n)&15n,9n);
});
test('Raw MAKHIT takes publication recipients from current DBITS after deposits',()=>{
  const f=fixture(),dpb=f.b.io.dpbT2;f.b.io.dpbT2=function*(p){yield*dpb(p);if(p.end==='24')f.low.write('dbits',4n);};f.run();assert.equal(rightHalf(f.q.links[0]),4n);assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.high.read('hitflg',3),1n);
});
test('Raw MAKHIT final deposit can change X2 and redirect publication alone',()=>{
  const f=fixture(),dpb=f.b.io.dpbT2;f.b.io.dpbT2=function*(p){yield*dpb(p);if(p.end==='24')f.r.x2=1n;};f.run();assert.equal(f.q.links[0],halfWords(11n,0n));assert.equal(f.q.links[1],3n);assert.equal(f.q.data[1][0],0n);
});
test('Raw MAKHIT clears DBITS before incrementing flags and retains full-word recipient bits',()=>{
  const f=fixture(),aos=f.b.io.aosHit;f.low.write('dbits',1n<<35n);let address:bigint|undefined;f.b.io.aosHit=function*(a){address=a;assert.equal(f.low.read('dbits'),0n);yield*aos(a);};f.run();assert.equal(address,f.b.symbols.hitflg+35n);assert.equal(f.r.t2,36n);assert.equal(f.r.t1,0n);assert.notEqual(f.q.links[0]&MIN_INTEGER,0n);
});
test('Raw MAKHIT flag overflow wraps and does not prevent cleanup',()=>{
  const f=fixture();f.high.write('hitflg',MAX_INTEGER,1);f.run();assert.equal(f.high.read('hitflg',1),MIN_INTEGER);assert.deepEqual(f.decoded(),emptyHit());
});
test('Raw MAKHIT flag failure retains published link, cleared DBITS and uncleared fields',()=>{
  const f=fixture();f.b.io.aosHit=function*(){throw new Error('counter fault');};assert.throws(f.run,/counter fault/);assert.equal(rightHalf(f.q.links[0]),3n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.low.read('iwhat'),14n);assert.equal(f.low.read('dispfr'),101n);
});
test('Raw MAKHIT and GETHIT round trip actual queue words under the declared POINT policy',()=>{
  const f=fixture();f.run();finish(f.getHit.run());assert.deepEqual(f.decoded(),f.payload);assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.high.read('hitflg',2),1n);assert.equal(rightHalf(f.q.links[0]),2n);
});
test('FREE composes TRCOFF raw MAKHIT and raw GETHIT using caller WHO sender slots',()=>{
  const f=fixture(2);f.high.write('numply',2n);f.high.write('trstat',3n,1);f.high.write('trstat',1n,3);f.high.write('msgflg',0n,1);finish(f.free.run());assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',3),0n);assert.equal(f.high.read('alive',1),1n);assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.high.read('hitflg',3),1n);assert.equal(rightHalf(f.q.links[40]),4n);assert.equal(f.q.links[0],0n);assert.ok(f.b.events.includes('makhit'));
});
