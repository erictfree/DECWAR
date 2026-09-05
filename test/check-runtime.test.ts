import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRuntimeFixture } from './fixtures/check-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { orderedRational as real } from './support/rational-real.ts';
import { MIN_INTEGER } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
function fixture(h=10n,v=20n,dh=4n,dv=2n,dist=4n,displ='0'){
  const f=checkRuntimeFixture();[h,v,dh,dv,dist,f.realWord(displ)].forEach((w,i)=>f.m.write(14000n+BigInt(i),w));
  ['h1','v1','h2','v2','dcode'].forEach((name,i)=>f.out.write(name,91n+BigInt(i)));f.out.write('dhs',f.realWord('96'));f.out.write('dvs',f.realWord('97'));
  f.damage.draws.push('.75','.75');return f;
}
const coordinates=(f:ReturnType<typeof fixture>)=>['h1','v1','h2','v2','dcode'].map(n=>f.out.read(n));
const reads=(f:ReturnType<typeof fixture>)=>f.events.filter(e=>e==='ran'||e.startsWith('disp:'));
const pointArgs={c:14030n,c1:14031n,c2:14032n};
for(const [text,c1,c2] of [['12.40',12n,0n],['12.4099',12n,0n],['12.41',12n,13n],['12.5',12n,13n],['12.5999',12n,13n],['12.60',13n,0n],['-12.5',-12n,0n],['-.5',0n,0n],['.5',0n,1n],['0',0n,0n]] as const)test(`Memory CHKPNT ${text} preserves strict hundredths, INT and signed MOD`,()=>{
  const f=fixture();f.m.write(pointArgs.c,f.realWord(text));finish(f.point(pointArgs.c,pointArgs.c1,pointArgs.c2));assert.deepEqual([f.m.read(pointArgs.c1),f.m.read(pointArgs.c2)],[c1,c2]);
});
for(const [text,result] of [['12.5',13n],['12.2',0n]] as const)test(`Memory CHKPNT aliased C1/C2 writes ${text} in source order`,()=>{
  const f=fixture();f.m.write(pointArgs.c,f.realWord(text));finish(f.point(pointArgs.c,pointArgs.c1,pointArgs.c1));assert.equal(f.m.read(pointArgs.c1),result);
});
test('CHKPNT C alias to C1 retains the first integer store and uses it for C2',()=>{
  const f=fixture();f.m.write(pointArgs.c,f.realWord('12.5'));finish(f.point(pointArgs.c,pointArgs.c,pointArgs.c2));assert.equal(f.m.read(pointArgs.c),12n);assert.equal(f.m.read(pointArgs.c2),13n);
});
test('CHKPNT reads current C after the branch comparison resumes',()=>{
  const f=fixture(),compare=f.io.compare;f.m.write(pointArgs.c,f.realWord('12.5'));f.io.compare=function*(...a){const r=yield*compare(...a);yield 'branch';return r;};
  const g=f.point(pointArgs.c,pointArgs.c1,pointArgs.c2);assert.equal(g.next().value,'branch');f.m.write(pointArgs.c,f.realWord('20.2'));finish(g);assert.deepEqual([f.m.read(pointArgs.c1),f.m.read(pointArgs.c2)],[20n,21n]);
});
test('CHKPNT second candidate rereads C1 after a suspended assignment',()=>{
  const f=fixture(),assign=f.io.assign;f.m.write(pointArgs.c,f.realWord('12.5'));f.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===pointArgs.c1)yield 'first';};
  const g=f.point(pointArgs.c,pointArgs.c1,pointArgs.c2);assert.equal(g.next().value,'first');f.m.write(pointArgs.c1,70n);finish(g);assert.equal(f.m.read(pointArgs.c2),71n);
});
test('CHKPNT MOD failure precedes both output stores',()=>{
  const f=fixture();f.m.write(pointArgs.c,f.realWord('12.5'));f.m.write(pointArgs.c1,77n);f.m.write(pointArgs.c2,88n);f.io.mod=function*(){throw new Error('MOD trap');};assert.throws(()=>finish(f.point(pointArgs.c,pointArgs.c1,pointArgs.c2)),/MOD trap/);assert.deepEqual([f.m.read(pointArgs.c1),f.m.read(pointArgs.c2)],[77n,88n]);
});
test('CHKPNT C2 store failure preserves the completed C1 conversion',()=>{
  const f=fixture();f.m.write(pointArgs.c,f.realWord('12.5'));assert.throws(()=>finish(f.point(pointArgs.c,pointArgs.c1,250000n)),/Unmapped/);assert.equal(f.m.read(pointArgs.c1),12n);
});
test('Memory CHECK first branch visits both candidates before each RAN and uses physical board order',()=>{
  const f=fixture();finish(f.run());assert.deepEqual(coordinates(f),[14n,22n,14n,22n,0n]);
  assert.deepEqual(reads(f),['disp:11,20','disp:11,21','ran','disp:12,21','disp:13,21','disp:13,22','ran','disp:14,22']);
  assert.equal(real.compare(f.realAt(f.out.address('dhs')),real.literal('1')),0);assert.equal(real.compare(f.realAt(f.out.address('dvs')),real.literal('.5')),0);assert.equal(f.m.read(f.locals.i),5n);assert.equal(f.damage.draws.length,0);
});
test('Memory CHECK second branch preserves symmetric board/random order',()=>{
  const f=fixture(20n,10n,2n,4n);finish(f.run());assert.deepEqual(coordinates(f),[22n,14n,22n,14n,0n]);assert.deepEqual(reads(f),['disp:20,11','disp:21,11','ran','disp:21,12','disp:21,13','disp:22,13','ran','disp:22,14']);assert.equal(f.damage.draws.length,0);
});
for(const [dh,dv,h,v] of [[4n,0n,14n,20n],[0n,4n,10n,24n],[-4n,0n,6n,20n],[0n,-4n,10n,16n],[4n,4n,14n,24n],[-4n,-4n,6n,16n]] as const)test(`Memory CHECK direction ${dh}/${dv} retains axis choice and ISIGN`,()=>{
  const f=fixture(10n,20n,dh,dv);finish(f.run());assert.deepEqual(coordinates(f),[h,v,h,v,0n]);assert.equal(reads(f).length,4);assert.ok(!reads(f).includes('ran'));assert.equal(f.m.read(f.locals.iv1)!==0n,dh!==0n);
});
for(const vertical of [false,true])for(const second of [false,true])test(`Memory CHECK collision vertical=${vertical}, second=${second} rereads DISP before returning`,()=>{
  const f=vertical?fixture(20n,10n,2n,4n):fixture();const h=vertical?(second?21:20):11,v=vertical?11:(second?21:20);f.views.high.board.setdsp(h,v,501);finish(f.run());
  assert.deepEqual(coordinates(f),vertical?[20n,10n,BigInt(h),BigInt(v),501n]:[10n,20n,BigInt(h),BigInt(v),501n]);assert.equal(reads(f).length,second?3:2);assert.ok(!reads(f).includes('ran'));
});
test('Memory CHECK collision result comes from the second live board read',()=>{
  const f=fixture(),disp=f.io.disp;f.views.high.board.setdsp(11,20,102);let count=0;
  f.io.disp=function*(...a){const n=yield*disp(...a);if(++count===1)f.views.high.board.setdsp(11,20,203);return n;};finish(f.run());assert.equal(f.out.read('dcode'),203n);assert.equal(count,2);
});
test('Memory CHECK traverses a negative sentinel and retains the prior clear cell on a later hit',()=>{
  const f=fixture(10n,20n,4n,0n);f.views.high.board.setdsp(11,20,-1);f.views.high.board.setdsp(13,20,301);finish(f.run());assert.deepEqual(coordinates(f),[12n,20n,13n,20n,301n]);assert.equal(f.m.read(f.locals.i),3n);
});
for(const vertical of [false,true])test(`Memory CHECK dominant boundary vertical=${vertical} restores object coordinates`,()=>{
  const f=vertical?fixture(20n,74n,0n,4n):fixture(74n,20n,4n,0n);finish(f.run());assert.deepEqual([f.out.read('h2'),f.out.read('v2')],[f.out.read('h1'),f.out.read('v1')]);assert.equal(f.out.read('dcode'),0n);assert.equal(reads(f).length,1);
});
for(const vertical of [false,true])test(`Memory CHECK second candidate outside galaxy vertical=${vertical} abandons the clear candidate`,()=>{
  const f=vertical?fixture(75n,10n,2n,4n):fixture(10n,75n,4n,2n);finish(f.run());assert.deepEqual(coordinates(f),vertical?[75n,10n,75n,10n,0n]:[10n,75n,10n,75n,0n]);assert.equal(reads(f).length,1);assert.ok(!reads(f).includes('ran'));
});
test('Memory CHECK first fractional candidate outside galaxy makes no board read',()=>{
  const f=fixture(10n,1n,4n,-4n);finish(f.run());assert.deepEqual(coordinates(f),[10n,1n,10n,1n,0n]);assert.deepEqual(reads(f),[]);
});
test('Memory CHECK displacement is added on every minor-axis step despite negative direction',()=>{
  const f=fixture(10n,20n,-4n,0n,4n,'.25');finish(f.run());assert.deepEqual(coordinates(f),[6n,21n,6n,21n,0n]);assert.equal(reads(f).filter(e=>e==='ran').length,1);
});
for(const draw of ['0','.75'])test(`Memory CHECK random result ${draw} affects final location only after both candidate checks`,()=>{
  const f=fixture(10n,20n,2n,1n,1n);f.damage.draws.splice(0,2,draw);finish(f.run());assert.deepEqual(coordinates(f),[11n,draw==='0'?20n:21n,11n,draw==='0'?20n:21n,0n]);assert.deepEqual(reads(f),['disp:11,20','disp:11,21','ran']);
});
for(const vertical of [false,true])for(const oneTrip of [false,true])test(`Memory CHECK nonpositive DIST vertical=${vertical}, one trip=${oneTrip} follows required DO policy`,()=>{
  const f=vertical?fixture(10n,20n,0n,4n,0n):fixture(10n,20n,4n,0n,0n);f.io.enterLoop=(s,l)=>oneTrip||s<=l;finish(f.run());
  const h=vertical||!oneTrip?10n:11n,v=!vertical||!oneTrip?20n:21n;assert.deepEqual(coordinates(f),[h,v,h,v,0n]);assert.equal(f.m.read(f.locals.i),oneTrip?2n:1n);assert.equal(reads(f).length,oneTrip?1:0);
});
test('Memory CHECK zero direction reaches the required division failure after its source writes',()=>{
  const f=fixture(10n,20n,0n,0n);assert.throws(()=>finish(f.run()),/division by zero/);assert.deepEqual(coordinates(f),[10n,20n,93n,94n,0n]);assert.equal(real.compare(f.realAt(f.out.address('dhs')),real.literal('1')),0);assert.equal(f.m.read(f.locals.i),0n);
});
test('CHECK IABS minimum stays a required numeric policy and can trap after initial output stores',()=>{
  const f=fixture();f.m.write(f.args.dv,MIN_INTEGER);assert.throws(()=>finish(f.run()),/IABS minimum/);assert.deepEqual(coordinates(f),[10n,20n,93n,94n,0n]);assert.equal(f.m.read(f.locals.inc),0n);
});
test('CHECK input V alias to H1 observes the preceding output assignment',()=>{
  const f=fixture(10n,20n,4n,0n,1n);f.args.v=f.out.address('h1');finish(f.run());assert.deepEqual(coordinates(f),[11n,10n,11n,10n,0n]);
});
test('CHECK direction arguments aliasing DCODE see its reset before axis selection',()=>{
  const f=fixture();f.args.dv=f.out.address('dcode');finish(f.run());assert.deepEqual(coordinates(f),[14n,20n,14n,20n,0n]);assert.ok(!reads(f).includes('ran'));
});
test('CHECK missing V argument preserves H1 before V1 and DCODE writes',()=>{
  const f=fixture();f.args.v=250000n;assert.throws(()=>finish(f.run()),/Unmapped/);assert.deepEqual(coordinates(f),[10n,92n,93n,94n,95n]);
});
test('CHECK direction setup uses live displacement after a suspended divide',()=>{
  const f=fixture(10n,20n,4n,0n,1n),binary=f.io.binary;f.io.binary=function*(op,l,r){const n=yield*binary(op,l,r);if(op==='div')yield 'slope';return n;};const g=f.run();assert.equal(g.next().value,'slope');
  f.m.write(f.args.displ,f.realWord('.5'));finish(g);assert.equal(real.compare(f.realAt(f.out.address('dvs')),real.literal('.5')),0);assert.deepEqual(coordinates(f),[11n,21n,11n,21n,0n]);
});
test('CHECK captures DIST at DO entry rather than before slope evaluation',()=>{
  const f=fixture(10n,20n,4n,0n,4n),binary=f.io.binary;f.io.binary=function*(op,l,r){const n=yield*binary(op,l,r);if(op==='div')yield 'slope';return n;};const g=f.run();assert.equal(g.next().value,'slope');f.m.write(f.args.dist,1n);finish(g);assert.equal(f.out.read('h1'),11n);assert.equal(f.m.read(f.locals.i),2n);
});
test('CHECK captured DO limit survives changes during a suspended board read',()=>{
  const f=fixture(10n,20n,4n,0n),disp=f.io.disp;let first=true;f.io.disp=function*(...a){if(first){first=false;yield 'board';}return yield*disp(...a);};const g=f.run();assert.equal(g.next().value,'board');f.m.write(f.args.dist,1n);finish(g);assert.equal(f.out.read('h1'),14n);assert.equal(f.m.read(f.locals.i),5n);
});
test('CHECK rereads the shared minor-axis increment on each iteration',()=>{
  const f=fixture(10n,20n,4n,0n,2n),disp=f.io.disp;let first=true;f.io.disp=function*(...a){const n=yield*disp(...a);if(first){first=false;f.out.write('dvs',f.realWord('1'));}return n;};finish(f.run());assert.deepEqual(coordinates(f),[12n,21n,12n,21n,0n]);
});
test('CHECK CHKPNT call arguments are actual REAL and candidate local addresses',()=>{
  const f=fixture(10n,20n,4n,0n,1n),point=f.io.chkpnt;f.io.chkpnt=function*(c,c1,c2){assert.deepEqual([c,c1,c2],[f.locals.rv,f.locals.iv1,f.locals.iv2]);yield 'point';yield*point(c,c1,c2);};const g=f.run();assert.equal(g.next().value,'point');f.m.write(f.locals.rv,f.realWord('22.5'));finish(g);assert.deepEqual(reads(f),['disp:11,22','disp:11,23','ran']);
});
test('CHECK candidate locals are reread after a yielded CHKPNT call',()=>{
  const f=fixture(10n,20n,4n,0n,1n),point=f.io.chkpnt;f.io.chkpnt=function*(...a){yield*point(...a);yield 'point';};const g=f.run();assert.equal(g.next().value,'point');f.m.write(f.locals.iv1,0n);finish(g);assert.deepEqual(coordinates(f),[10n,20n,10n,20n,0n]);assert.deepEqual(reads(f),[]);
});
test('CHECK raw board suspension reads current H2/V2 addresses rather than coordinate copies',()=>{
  const f=fixture(10n,20n,4n,0n,1n),disp=f.io.disp;let first=true;f.io.disp=function*(...a){if(first){first=false;yield 'board';}return yield*disp(...a);};
  f.views.high.board.setdsp(13,23,501);const g=f.run();assert.equal(g.next().value,'board');f.out.write('h2',13n);f.out.write('v2',23n);finish(g);assert.deepEqual(coordinates(f),[10n,20n,13n,23n,501n]);
});
for(const rightFirst of [false,true])test(`CHECK random expression observes operand order: right first ${rightFirst}`,()=>{
  const f=fixture(10n,20n,2n,1n,1n),binary=f.io.binary,ran=f.io.ran;f.io.ran=function*(z){yield 'random';return yield*ran(z);};
  if(rightFirst)f.io.binary=function*(op,l,r){if(op==='add'&&l.type==='real'&&r.type==='real'){const n=yield*r.evaluate();return yield*binary(op,l,{...r,evaluate:function*(){return n;}});}return yield*binary(op,l,r);};
  const g=f.run();assert.equal(g.next().value,'random');f.m.write(f.locals.rv,f.realWord('30.5'));finish(g);assert.equal(f.out.read('v1'),rightFirst?31n:21n);assert.deepEqual(reads(f),['disp:11,20','disp:11,21','ran']);
});
test('CHECK collision reread failure retains candidate coordinates with zero DCODE',()=>{
  const f=fixture(),disp=f.io.disp;let count=0;f.views.high.board.setdsp(11,20,501);f.io.disp=function*(...a){if(++count===2)throw new Error('collision reread');return yield*disp(...a);};assert.throws(()=>finish(f.run()),/collision reread/);assert.deepEqual(coordinates(f),[10n,20n,11n,20n,0n]);
});
test('CHECK RAN failure occurs after both board candidates without advancing the clear position',()=>{
  const f=fixture(10n,20n,2n,1n,1n);f.damage.draws.length=0;assert.throws(()=>finish(f.run()),/Unscheduled RAN/);assert.deepEqual(coordinates(f),[10n,20n,11n,21n,0n]);assert.equal(f.m.read(f.locals.i),1n);assert.deepEqual(reads(f),['disp:11,20','disp:11,21','ran']);
});
test('CHECK raw board fault preserves the candidate and completed CHKPNT stores',()=>{
  const f=fixture();f.rawBoard.io.ldb=function*(){throw new Error('load fault');};assert.throws(()=>finish(f.run()),/load fault/);assert.deepEqual(coordinates(f),[10n,20n,11n,20n,0n]);assert.deepEqual([f.m.read(f.locals.iv1),f.m.read(f.locals.iv2)],[20n,21n]);
});
test('CHECK first galaxy-boundary restore is committed before failure of the second',()=>{
  const f=fixture(75n,20n,4n,0n),assign=f.io.assign;f.io.assign=function*(d,t,v){if(d()===f.out.address('v2'))throw new Error('restore fault');yield*assign(d,t,v);};assert.throws(()=>finish(f.run()),/restore fault/);assert.deepEqual(coordinates(f),[75n,20n,75n,94n,0n]);
});

test('CHECK keeps the selected branch but rereads direction arguments after ISIGN',()=>{
  const f=fixture(10n,20n,4n,0n,1n),isign=f.io.isign;f.io.isign=function*(...a){const n=yield*isign(...a);yield 'sign';return n;};const g=f.run();assert.equal(g.next().value,'sign');f.m.write(f.args.dh,1n);f.m.write(f.args.dv,4n);finish(g);assert.deepEqual(coordinates(f),[11n,24n,11n,24n,0n]);assert.equal(f.m.read(f.locals.iv1),24n);assert.equal(f.m.read(f.locals.ih1),0n);
});
test('CHECK DIST alias to I is evaluated before the DO control word is initialized',()=>{
  const f=fixture(10n,20n,4n,0n);f.args.dist=f.locals.i;f.m.write(f.locals.i,2n);finish(f.run());assert.deepEqual(coordinates(f),[12n,20n,12n,20n,0n]);assert.equal(f.m.read(f.locals.i),3n);
});
test('CHECK candidate-local aliases preserve both source DISP calls',()=>{
  const f=fixture(10n,20n,2n,1n,1n);f.locals.iv2=f.locals.iv1;finish(f.run());assert.deepEqual(reads(f),['disp:11,21','disp:11,21','ran']);assert.deepEqual(coordinates(f),[11n,21n,11n,21n,0n]);
});
test('CHECK retains inactive REAL locals across calls on different dominant axes',()=>{
  const f=fixture();finish(f.run());assert.equal(real.compare(f.realAt(f.locals.rh),real.literal('99')),0);assert.equal(real.compare(f.realAt(f.locals.rv),real.literal('22')),0);
  [20n,10n,2n,4n,1n].forEach((n,i)=>f.m.write(14000n+BigInt(i),n));f.damage.draws.push('.75');finish(f.run());assert.equal(real.compare(f.realAt(f.locals.rh),real.literal('20.5')),0);assert.equal(real.compare(f.realAt(f.locals.rv),real.literal('22')),0);
});
for(const changed of [0,-1])test(`CHECK collision reread ${changed} returns immediately without resuming clear-path traversal`,()=>{
  const f=fixture(),disp=f.io.disp;f.views.high.board.setdsp(11,20,501);let calls=0;f.io.disp=function*(...a){const n=yield*disp(...a);if(++calls===1)f.views.high.board.setdsp(11,20,changed);return n;};finish(f.run());assert.deepEqual(coordinates(f),[10n,20n,11n,20n,BigInt(changed)]);assert.equal(calls,2);assert.equal(f.damage.draws.length,2);
});
for(const blackHole of [false,true])test(`Resumable CHECK→TORDAM→JUMP shares physical CHKOUT and draw order, black hole=${blackHole}`,()=>{
  const f=fixture();const target=f.views.high.players[6].ship;Object.assign(target,{v:12,h:21,damage:0n,energy:50000n,shieldCondition:-1n,shieldStrength:1000n});f.high.write('alive',-1n,6);f.views.high.board.setdsp(12,21,206);
  if(blackHole)f.views.high.board.setdsp(13,21,1000);
  f.damage.draws.splice(0,2,'.75','0','0','.5');finish(f.run());assert.deepEqual(coordinates(f),[11n,21n,12n,21n,206n]);assert.equal(f.damage.draws.length,3);
  f.m.write(14100n,2n);f.m.write(14101n,6n);f.m.write(14102n,-1n);const args={nplc:14100n,j:14101n,id:250000n,phit:250001n,ship:14102n};
  const dpb=f.rawBoard.io.dpb;f.rawBoard.io.dpb=function*(){yield 'deposit';yield*dpb();};const g=f.weapon.run('tordam',args);assert.equal(g.next().value,'deposit');assert.equal(target.damage,6000n);assert.equal(f.high.read('alive',6),-1n);assert.equal(f.damage.draws.length,0);finish(g);
  assert.equal(f.hit.shjump,1n);assert.equal(f.hit.klflg,blackHole?1n:0n);assert.equal(target.v,blackHole?12:13);assert.equal(target.h,21);assert.equal(f.views.high.board.disp(12,21),0);assert.equal(f.views.high.board.disp(13,21),blackHole?1000:206);
  assert.equal(f.high.read('alive',6),blackHole?0n:-1n);assert.equal(f.low.read('tpoint',K.KPEDAM),6000n);assert.equal(f.low.read('tpoint',K.KPEKIL),blackHole?5000n:0n);assert.deepEqual(f.damage.events,['ran','ran','ran','ran','shield-if:false','jump']);
});
