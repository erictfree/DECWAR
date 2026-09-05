import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { emptyHit } from '../src/game/hit-queue.ts';
import type { HitRegisters } from '../src/game/hit-queue.ts';
import { hitTranscripts } from './support/out-hit-transcripts.ts';
import { rightHalf } from '../src/compat/word36.ts';
function fixture(format=0n){
  const f=pregameRuntimeFixture([]),b=f.outHit,q=f.getHit.queues.hit;for(const [key,value] of [['who',1n],['team',1n],['oflg',format],['ocflg',BigInt(K.KABS)],['hcpos',0n],['blank',0n],['pasflg',0n]] as const)f.low.write(key,value);
  f.high.write('nomsg',0n);for(let i=1;i<=10;i++)f.high.write('hitflg',0n,i);f.high.write('shpdam',0n,1,K.KDRAD);
  const before=f.text().length;
  const payload=(type:bigint):HitRegisters=>({...emptyHit(),dbits:0n,iwhat:type,dispfr:[6n,7n,8n].includes(type)?900n:type===11n?500n:101n,dispto:[9n,10n].includes(type)?400n:210n,ihita:1234n,critdv:2n,critdm:345n,vfrom:1n,hfrom:2n,vto:3n,hto:4n,shcnfr:1n,shstfr:1000n,shcnto:-1n,shstto:450n});
  const queue=(type=1n,change:Partial<HitRegisters>={},bits=1n)=>{Object.assign(f.hit,payload(type),change,{dbits:bits});finish(f.makeHit.run());};
  const decoded=(type:bigint,change:Partial<HitRegisters>={})=>{f.high.write('hitflg',1n,1);b.io.gethit=function*(){Object.assign(f.hit,payload(type),change);f.high.write('hitflg',0n,1);};};
  return {...f,b,q,payload,queue,decoded,run:()=>finish(b.run()),output:()=>f.text().slice(before)};
}
for(const [type,...texts] of hitTranscripts)for(const [index,format] of [-1n,0n,1n].entries())test(`Raw MAKHIT GETHIT OUTHIT event ${type} verbosity ${format} matches source byte transcript`,()=>{
  const f=fixture(format);f.queue(BigInt(type));f.run();assert.equal(f.output(),(format===1n?'\r\n':'')+texts[index]);assert.equal(f.high.read('hitflg',1),0n);assert.equal(rightHalf(f.q.links[0]),0n);assert.deepEqual({...f.hit},{...emptyHit(),dbits:0n});assert.equal(f.low.read('dbits'),0n);
});
test('Statement OUTHIT initial BLKSET clears all seventeen words even with no pending hit',()=>{
  const f=fixture();for(let i=0;i<17;i++)f.m.write(f.low.address('iwhat')+BigInt(i),99n);f.run();for(let i=0;i<17;i++)assert.equal(f.m.read(f.low.address('iwhat')+BigInt(i)),0n);assert.deepEqual(f.b.events,['blkset']);assert.equal(f.m.read(f.b.locals.nplcf),77n);
});
for(const count of [1n])test(`Statement OUTHIT count ${count} with empty queue retains only the LONG pre-read newline`,()=>{
  const f=fixture(1n);f.high.write('hitflg',count,1);f.run();assert.equal(f.output(),'\r\n');assert.equal(f.high.read('hitflg',1),0n);assert.equal(f.b.events.filter(e=>e==='blkset').length,2);
});
test('Statement OUTHIT negative count continues decrementing and clearing without a host repair',()=>{
  const f=fixture(1n);f.high.write('hitflg',-1n,1);const get=f.b.io.gethit;f.b.io.gethit=function*(a){yield*get(a);yield 'after-gethit';};const g=f.b.run();for(const count of [-2n,-3n,-4n]){assert.equal(g.next().value,'after-gethit');assert.equal(f.high.read('hitflg',1),count);assert.deepEqual({...f.hit},{...emptyHit(),dbits:0n});}assert.equal(f.b.events.filter(e=>e==='crlf').length,3);assert.equal(f.output(),'\r\n');g.return();assert.equal(f.high.read('hitflg',1),-4n);
});
for(const type of [0n,16n,-1n])test(`Statement OUTHIT invalid IWHAT ${type} falls through computed GOTO without event output`,()=>{
  const f=fixture();f.decoded(type);f.run();assert.equal(f.output(),'');assert.equal(f.b.events.filter(e=>e==='blkset').length,2);
});
test('Statement OUTHIT drains multiple physical hit slots in source order',()=>{
  const f=fixture();f.queue(13n);f.queue(14n);f.run();assert.equal(f.output(),M.outh24.text+'\r\n'+M.outh26.text+'\r\n');assert.equal(f.high.read('hitflg',1),0n);
});
test('Statement OUTHIT consumes only this recipient bit from a shared hit',()=>{
  const f=fixture();f.queue(14n,{},3n);f.run();assert.equal(f.high.read('hitflg',2),1n);assert.equal(rightHalf(f.q.links[0]),2n);
});
test('Statement OUTHIT critical device output composes raw ODEV OFLT and spacing at all verbosity settings',()=>{
  for(const [i,format] of [-1n,0n,1n].entries()){const f=fixture(format);f.queue(1n,{dispto:101n});f.run();assert.ok(f.output().endsWith(['; WA  34\r\n','; Warp dam 34.5\r\n','; Warp Engines damaged 34.5 units\r\n'][i]));}
});
test('Statement OUTHIT displacement uses arithmetic format branches and forces short target coordinates',()=>{
  for(const [format,prefix] of [[-1n,'>'],[0n,'-->'],[1n,'displaced to ']] as const){const f=fixture(format);f.queue(2n,{shjump:1n});f.run();assert.ok(f.output().includes(prefix+'3-4'));}
});
test('Statement OUTHIT PRLOC uses live ship coordinates for relative output',()=>{
  const f=fixture();f.low.write('ocflg',BigInt(K.KBOTH));f.queue();f.run();assert.ok(f.output().includes('@1-2 -9,-18'));assert.ok(f.output().includes('@3-4 -7,-16'));
});
test('Statement OUTHIT planet strength is an unscaled integer and omits hit magnitude',()=>{
  const f=fixture(1n);f.queue(2n,{dispfr:600n,dispto:700n,shstfr:7n,shstto:9n});f.run();assert.equal(f.output(),'\r\nNeu planet(7) @1-2 makes torpedo hit on Fed planet(9) @3-4\r\n');
});
test('Statement OUTHIT base critical paths retain detailed surviving and destruction messages',()=>{
  for(const killed of [0n,2n]){const f=fixture(1n);f.queue(1n,{dispto:400n,critdm:30n,klflg:killed});f.run();assert.ok(f.output().includes(M.outh31.text));assert.ok(f.output().includes(M.outh32.text));assert.ok(f.output().includes(killed===0n?M.outh33.text:M.outh34.text));assert.equal(f.output().includes(M.destry.text),killed!==0n);}
});
test('Statement OUTHIT black-hole destruction precedes final destruction output',()=>{
  const f=fixture();f.queue(2n,{klflg:1n});f.run();assert.ok(f.output().indexOf(M.outh10.text)<f.output().indexOf(M.destry.text));assert.ok(!f.output().includes('-45.0%'));
});
for(const damage of [BigInt(K.KCRIT),BigInt(K.KCRIT+1)])test(`Statement OUTHIT base radio damage threshold ${damage} uses strict greater-than`,()=>{
  const f=fixture(1n);f.queue(9n);f.high.write('shpdam',damage,1,K.KDRAD);f.run();assert.equal(f.output().includes(M.outh16.text),damage===BigInt(K.KCRIT));assert.equal(f.high.read('hitflg',1),0n);if(damage>BigInt(K.KCRIT))assert.equal(f.output(),'\r\n');
});
test('Statement OUTHIT base radio filter reads current BITS WHO after raw GETHIT',()=>{
  const f=fixture();f.queue(9n);const get=f.b.io.gethit;f.b.io.gethit=function*(a){yield*get(a);f.high.write('bits',8n,1);};f.high.write('nomsg',8n);f.run();assert.equal(f.output(),'');assert.equal(rightHalf(f.q.links[0]),0n);
});
test('Statement OUTHIT receiver radio state does not suppress direct combat events',()=>{
  const f=fixture();f.queue(1n);f.high.write('shpdam',99999n,1,K.KDRAD);f.high.write('nomsg',1n);f.run();assert.ok(f.output().includes('123.4 unit P'));
});
test('Statement OUTHIT computes classes after sender ODISP returns',()=>{
  const f=fixture(),obj=f.b.io.odisp;f.queue(7n,{dispfr:101n});let first=true;f.b.io.odisp=function*(a,n){yield*obj(a,n);if(first){first=false;f.low.write('dispfr',900n);}};f.run();assert.equal(f.m.read(f.b.locals.nplcf),9n);assert.ok(f.output().startsWith('L @1-2 N'));assert.ok(!f.output().includes('%'));
});
test('Statement OUTHIT rereads IWHAT after sender location output before selecting the event text',()=>{
  const f=fixture(),loc=f.b.io.prloc;f.queue(1n);let first=true;f.b.io.prloc=function*(...a){yield*loc(...a);if(first){first=false;f.low.write('iwhat',7n);}};f.run();assert.ok(f.output().endsWith(' N\r\n'));assert.ok(!f.output().includes('unit'));
});
test('Statement OUTHIT preserves saved target class while displaying a changed DISpto word',()=>{
  const f=fixture(),out=f.b.io.out;f.queue(1n);f.b.io.out=function*(key,n){yield*out(key,n);if(key==='outh03')f.low.write('dispto',700n);};f.run();assert.equal(f.m.read(f.b.locals.nplct),2n);assert.ok(f.output().includes('+@'));assert.ok(f.output().includes('-45.0%'));
});
test('Statement OUTHIT rereads OFLG after base alarm text before optional long continuation',()=>{
  const f=fixture(1n),out=f.b.io.out;f.queue(1n,{dispto:400n,critdm:30n});f.b.io.out=function*(key,n){yield*out(key,n);if(key==='outh31')f.low.write('oflg',0n);};f.run();assert.ok(f.output().includes(M.outh31.text));assert.ok(!f.output().includes(M.outh32.text));
});
test('Statement OUTHIT stale fields are cleared before failed GETHIT',()=>{
  const f=fixture();f.high.write('hitflg',1n,1);Object.assign(f.hit,f.payload(1n));f.b.io.gethit=function*(){throw new Error('gethit fault');};assert.throws(f.run,/gethit fault/);assert.deepEqual({...f.hit},{...emptyHit(),dbits:0n});assert.equal(f.output(),'');
});
test('Statement OUTHIT output failure leaves consumed event fields until next loop cleanup',()=>{
  const f=fixture();f.queue(1n);f.b.io.odisp=function*(){throw new Error('display fault');};assert.throws(f.run,/display fault/);assert.equal(f.low.read('iwhat'),1n);assert.equal(f.high.read('hitflg',1),0n);assert.equal(rightHalf(f.q.links[0]),0n);assert.equal(f.low.read('dispfr'),101n);
});
test('Statement OUTHIT BLKSET failure preserves the uncleared tail and does not test hit count',()=>{
  const f=fixture();f.low.write('dbits',77n);f.b.io.blkset=function*(a){f.m.write(a,0n);throw new Error('clear fault');};assert.throws(f.run,/clear fault/);assert.equal(f.low.read('dbits'),77n);assert.ok(!f.b.events.includes('gethit'));
});
test('Statement OUTHIT long initial newline can suspend before GETHIT reads the queue',()=>{
  const f=fixture(1n);f.queue(13n);const crlf=f.b.io.crlf;let first=true;f.b.io.crlf=function*(){yield*crlf();if(first){first=false;yield 'before-hit';}};const g=f.b.run();assert.equal(g.next().value,'before-hit');assert.equal(f.high.read('hitflg',1),1n);assert.equal(f.low.read('iwhat'),0n);finish(g);assert.equal(f.high.read('hitflg',1),0n);
});
test('Raw MAKHIT OUTHIT GETCMD composition displays combat notification before the command prompt',()=>{
  const f=fixture();f.queue(14n);f.getCommand.trapAddress.value=0n;f.high.write('nplnet',1n);f.low.write('ptime',0n);f.low.write('prtype',0n);f.editor.feed('TIME\n');finish(f.getCommand.run());assert.equal(f.m.read(f.getCommand.cmd),27n);assert.ok(f.output().startsWith(M.outh26.text+'\r\n'));assert.ok(f.output().indexOf(M.outh26.text)<f.output().indexOf(M.comlin.text));assert.equal(f.high.read('hitflg',1),0n);
});
