import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,MAX_INTEGER,MIN_INTEGER,packAscii,rightHalf,signed36 } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { lockLayout } from '../src/generated/lock-layout.ts';
import { constants as K,statisticsText,commissionText } from '../src/generated/source-data.ts';
function fixture(){
  const f=pregameRuntimeFixture([]),b=f.statistics,s=b.symbols;
  for(const [key,w] of [['who',1n],['team',1n],['hungup',0n],['hcpos',0n],['blank',0n]] as const)f.low.write(key,w);
  f.high.write('gameno',0n);f.locks.write('frebie',0n);
  [77n,11n,22n,33n,44n,555n,2000n,1n,0n,1n].forEach((w,i)=>f.m.write(b.actuals[i],w));
  const before=f.text().length;
  return {...f,b,ss:s,record:(i:number,w:bigint)=>f.m.write(b.actuals[i],w),row:(rank=0,team=0)=>b.buffer().slice(3+team*256+rank*10,13+team*256+rank*10),run:()=>finish(b.run('updsta')),commission:()=>finish(b.run('updcap')),output:()=>f.text().slice(before)};
}
function ranking(words:bigint[],team=0){for(let i=0;i<10;i++)words.splice(3+team*256+i*10,10,BigInt(100+i),1n,2n,3n,4n,5n,BigInt(1000-i*100),2000n,BigInt(800+i),BigInt(900+i));}
const first='\r\nCongratulations, Captain! You\r\nare now in first place!\r\n',history='...at least the history books\r\nwill remember you....\r\nfor a while!\r\n';
for(const elapsed of [-1n,0n,999n])test(`Raw UPDSTA elapsed ${elapsed} exits with only T1 changed`,()=>{
  const f=fixture();f.record(6,elapsed);f.file.write('stabuf',98n,600);f.r.t2=97n;const arg=f.b.header+1n;f.run();assert.equal(f.r.t1,elapsed);assert.equal(f.r.t2,97n);assert.equal(f.r.arg,arg);assert.equal(f.file.read('stabuf',600),98n);assert.deepEqual(f.b.events,[]);
});
test('Raw UPDSTA accepts 1000 elapsed with negative score and writes exact ten-word record',()=>{
  const f=fixture(),sp=f.r.s,pp=f.r.p;f.record(6,1000n);f.record(5,-123n);f.record(7,-1n);f.b.files.stared[11]=999n;f.b.files.stared[513]=halfWords(8n,19n);f.b.files.stared[600]=87n;f.run();
  assert.deepEqual(f.row(),[77n,11n,22n,33n,44n,123456n,-123n,1000n,999n,signed36(halfWords(-1n,19n))]);assert.equal(f.file.read('stabuf',600),87n);assert.equal(f.output(),first);assert.equal(f.r.s,sp);assert.equal(f.r.p,pp);assert.equal(f.r.arg,f.b.header+1n);assert.equal(f.low.read('hcpos'),0n);assert.equal(f.b.writes.length,1);assert.equal(f.b.writes[0].descriptor,f.ss.staiow);
});
test('Raw UPDSTA composes real file descriptor copy, OPEN skip, LOCK and UNLO',()=>{
  const f=fixture();f.high.write('gameno',63n);f.run();assert.equal(f.file.read('le.nam'),signed36(BigInt('0o444543674162')));assert.equal(f.file.read('fo.fnc'),halfWords(6n,2n));assert.equal(rightHalf(f.m.read(f.symbols.queuen)),f.ss.staupd);assert.equal((f.m.read(f.symbols.queuen)>>18n)&63n,0n);assert.ok(f.events.includes('enq'));assert.ok(f.events.includes('deq'));for(let i=0;i<lockLayout.maximum;i++)assert.equal(f.locks.read('loktab',i),0n);
});
test('Raw UPDSTA shifts all ninety old words down and retains insertion word eight',()=>{
  const f=fixture();ranking(f.b.files.stared);const old=f.b.files.stared.slice(3,93);f.record(5,1001n);f.run();assert.deepEqual(f.b.buffer().slice(13,103),old);assert.equal(f.row()[8],800n);assert.equal(f.output(),first);
});
for(const [score,rank,text] of [[550n,5,'\r\nYou have placed as number 6!\r\n'],[150n,9,'\r\nWell, Captain, you at least\r\nmade tenth place!  Try harder\r\nnext time! \r\n']] as const)test(`Raw UPDSTA rank ${rank+1} bytes and raw decimal output`,()=>{
  const f=fixture();ranking(f.b.files.stared);f.record(5,score);f.run();assert.equal(f.row(rank)[0],77n);assert.equal(f.output(),text);assert.equal(f.low.read('hcpos'),rank===5?1n:0n);
});
for(const elapsed of [1999n,2000n,2001n])test(`Raw UPDSTA tied score uses elapsed ${elapsed}`,()=>{const f=fixture();ranking(f.b.files.stared);f.record(5,1000n);f.record(6,elapsed);f.run();assert.equal(f.row(elapsed>2000n?0:1)[0],77n);});
test('Raw UPDSTA empty PPN wins before stale score comparison',()=>{const f=fixture();f.record(5,MIN_INTEGER);f.b.files.stared[9]=MAX_INTEGER;f.run();assert.equal(f.row()[6],MIN_INTEGER);});
for(const team of [-1n,1n,7n])test(`Raw UPDSTA nonzero team ${team} selects offset 256 including deaths`,()=>{
  const f=fixture();ranking(f.b.files.stared);f.record(8,team);f.record(7,0n);const old=f.b.files.stared.slice(3,103);f.run();assert.deepEqual(f.b.buffer().slice(3,103),old);assert.equal(f.row(0,1)[0],77n);assert.equal(f.file.read('stabuf',359),0n);assert.equal(f.file.read('stabuf',523),1n);assert.equal(f.output(),first+history);
});
for(const why of [0n,1n,-1n])test(`Raw UPDSTA duplicate higher PPN with flag ${why} restores saved ACs and conditionally writes`,()=>{
  const f=fixture();ranking(f.b.files.stared);f.record(0,100n);f.record(7,why);const old=f.b.files.stared.slice(3,103),sp=f.r.s;f.run();assert.deepEqual(f.b.buffer().slice(3,103),old);assert.equal(f.r.s,sp);assert.equal(f.output(),'');assert.equal(f.b.writes.length,why===0n?1:0);assert.ok(!f.b.events.includes('date'));
});
test('Raw UPDSTA does not remove a lower entry for a newly higher PPN',()=>{const f=fixture();ranking(f.b.files.stared);f.record(0,105n);f.record(5,2000n);f.run();assert.equal(f.row()[0],105n);assert.equal(f.row(6)[0],105n);});
for(const why of [0n,1n])test(`Raw UPDSTA rejected list flag ${why} writes only death count`,()=>{const f=fixture();ranking(f.b.files.stared);f.record(5,-1n);f.record(7,why);f.run();assert.equal(f.b.writes.length,why===0n?1:0);assert.equal(f.output(),statisticsText[9].text);assert.equal(f.r.t1,f.ss.staupd);});
test('Raw UPDSTA repeated death composes previous kill count, mission count and monitor text',()=>{
  const f=fixture();f.record(7,0n);f.b.files.stared[523]=3n;f.b.files.stared[513]=12n;f.run();assert.equal(f.output(),"\r\n\r\nDon't feel bad; the Lexington\r\nhas been destroyed 3 times\r\nout of 12 missions!\r\n"+first+history);assert.equal(f.file.read('stabuf',523),4n);assert.equal(f.low.read('hcpos'),3n);
});
test('Raw UPDSTA killed AOS and previous-count SOS obey explicit 36-bit overflow fixture',()=>{const f=fixture();f.record(7,0n);f.b.files.stared[523]=MAX_INTEGER;f.run();assert.equal(f.file.read('stabuf',523),MIN_INTEGER);assert.ok(f.output().includes('destroyed '+MAX_INTEGER+' times'));});
test('Raw UPDSTA negative ship index aliases physical buffer without host validation',()=>{const f=fixture();f.record(7,0n);f.record(9,-522n);f.run();assert.equal(f.file.read('stabuf',0),1n);assert.equal(f.row()[9],0n);});
test('Raw UPDSTA negative WHO may address AC memory while packing missions',()=>{const f=fixture();f.record(9,-(f.ss.stacap-4n));f.b.io.dateT3=function*(){f.r.t3=123456n;};f.run();assert.equal(f.row()[9],halfWords(1n,rightHalf(-(f.ss.stacap-4n))));});
test('Raw UPDSTA failed normal read skips free read and uses free write',()=>{
  const f=fixture();f.locks.write('frebie',-1n);f.b.opens.stared={success:false,lePpn:0n};f.file.write('stabuf',98n,600);f.run();assert.ok(!f.b.events.includes('open:stfred'));assert.equal(f.b.writes[0].key,'stfupd');assert.equal(f.file.read('stabuf',600),0n);
});
for(const ppn of [0n,1n])test(`Raw UPDSTA LE.PPN ${ppn} skips INPUT but closes successful OPEN`,()=>{const f=fixture();f.b.opens.stared={success:true,lePpn:ppn};f.b.files.stared[600]=87n;f.run();assert.ok(!f.b.events.includes('input:'+f.ss.staiow));assert.equal(f.b.events.filter(e=>e==='close').length,2);assert.equal(f.file.read('stabuf',600),0n);});
test('Raw UPDSTA free-file read uses STFIOW and discards whole normal buffer',()=>{
  const f=fixture();f.locks.write('frebie',-1n);f.b.files.stared.fill(88n);f.b.files.stfred[0]=101n;f.b.files.stfred[513]=27n;f.run();assert.equal(f.row()[9],halfWords(1n,27n));assert.equal(f.file.read('stabuf',0),101n);assert.equal(f.file.read('stabuf',600),0n);assert.ok(f.b.events.includes('input:'+f.ss.stfiow));assert.equal(f.b.writes[0].descriptor,f.ss.staiow);
});
for(const success of [false,true])test(`Raw UPDSTA free read ${success} with nonnegative LE.PPN leaves cleared words`,()=>{const f=fixture();f.locks.write('frebie',-1n);f.b.files.stared.fill(88n);f.b.opens.stfred={success,lePpn:0n};f.run();assert.equal(f.file.read('stabuf',0),0n);assert.equal(f.file.read('stabuf',600),0n);assert.ok(!f.b.events.includes('input:'+f.ss.stfiow));});
test('Raw UPDSTA failed output OPEN preserves inserted memory and still unlocks',()=>{const f=fixture();f.b.opens.staupd={success:false,lePpn:0n};f.run();assert.equal(f.row()[0],77n);assert.equal(f.b.writes.length,0);assert.equal(f.b.events.at(-1),'unlo');assert.equal(f.output(),first);});
test('Raw UPDSTA hungup suppresses guarded text and flushes but invokes decimals',()=>{const f=fixture();f.low.write('hungup',-1n);f.record(7,0n);f.b.files.stared[523]=9n;f.run();assert.equal(f.output(),'');assert.ok(!f.b.events.includes('flush'));assert.deepEqual(f.b.events.filter(e=>e.startsWith('odec:')),['odec:9','odec:0']);});
test('Raw UPDSTA rechecks HUNGUP separately after monitor flush and text calls',()=>{
  const f=fixture();f.record(7,0n);f.b.files.stared[523]=3n;const out=f.b.io.outstr;f.b.io.outstr=function*(a){yield*out(a);if(a===f.ss.statisticsText[0])f.low.write('hungup',-1n);};f.run();assert.equal(f.output(),statisticsText[0].text);assert.ok(f.b.events.includes('odec:3'));assert.ok(f.b.events.includes('odec:0'));
});
test('Raw UPDSTA middle-place tail OUTPUT and OUTSTR remain unguarded after HUNGUP changes',()=>{
  const f=fixture();ranking(f.b.files.stared);const out=f.b.io.outstr;f.b.io.outstr=function*(a){yield*out(a);if(a===f.ss.statisticsText[6])f.low.write('hungup',-1n);};f.run();assert.equal(f.output(),statisticsText[6].text+statisticsText[7].text);assert.ok(f.b.events.includes('odec:6'));assert.equal(f.b.events.filter(e=>e==='flush').length,2);
});
test('Raw UPDSTA date suspension exposes shifted rows and five already-copied fields',()=>{
  const f=fixture();ranking(f.b.files.stared);f.record(5,2000n);f.b.io.dateT3=function*(){yield 'date';f.r.t3=987n;};const g=f.b.run('updsta');assert.equal(g.next().value,'date');assert.deepEqual(f.row().slice(0,5),[77n,11n,22n,33n,44n]);assert.equal(f.row()[5],5n);assert.equal(f.row(1)[0],100n);assert.equal(f.b.writes.length,0);f.record(5,2222n);f.record(6,3333n);f.record(7,-1n);f.record(9,2n);f.file.write('stabuf',29n,514);finish(g);assert.deepEqual(f.row().slice(5),[987n,2222n,3333n,800n,signed36(halfWords(-1n,29n))]);
});
test('Raw UPDSTA argument block is reread after DATE',()=>{
  const f=fixture();f.b.io.dateT3=function*(){const a=38000n;for(let i=0;i<10;i++)f.m.write(a+20n+BigInt(i),f.m.read(f.b.actuals[i]));f.m.write(a+25n,999n);loadArgumentBlock(f.m,a,Array.from({length:10},(_,i)=>a+20n+BigInt(i)));selectArgumentBlock(f.r,a);f.r.t3=123n;};f.run();assert.equal(f.row()[6],999n);assert.equal(f.r.arg,38001n);
});
test('Raw UPDSTA resolves indexed actuals before its elapsed threshold without count validation',()=>{
  const f=fixture();f.record(6,999n);loadArgumentBlock(f.m,f.b.header,f.b.actuals);selectArgumentBlock(f.r,f.b.header);f.r.x4=1n;f.m.write(f.b.header,0n);f.m.write(f.b.header+7n,(8n<<18n)|(f.b.actuals[6]-1n));finish(f.b.call('updsta'));assert.equal(f.r.t1,999n);assert.deepEqual(f.b.events,[]);
});
test('Raw UPDSTA ranking uses saved score but insertion rereads the caller score',()=>{
  const f=fixture();ranking(f.b.files.stared);const add=f.b.io.addi;f.b.io.addi=function*(reg,n){yield*add(reg,n);if(reg==='t2')f.record(5,2000n);};f.run();assert.equal(f.row(5)[0],77n);assert.equal(f.row(5)[6],2000n);assert.equal(f.row()[0],100n);
});
test('Raw UPDSTA tie comparisons reload elapsed at each physical row',()=>{
  const f=fixture();ranking(f.b.files.stared);f.b.files.stared[19]=1000n;f.record(5,1000n);f.record(6,2000n);const add=f.b.io.addi;f.b.io.addi=function*(reg,n){yield*add(reg,n);if(reg==='t2')f.record(6,2001n);};f.run();assert.equal(f.row(1)[0],77n);assert.equal(f.row(1)[7],2001n);
});
test('Raw UPDSTA chooses write file from current FREE flag after DATE',()=>{const f=fixture();f.b.io.dateT3=function*(){f.locks.write('frebie',-1n);f.r.t3=987n;};f.run();assert.equal(f.b.writes[0].key,'stfupd');assert.equal(f.b.files.stared[3],0n);assert.equal(f.b.files.stfred[3],77n);});
test('Raw UPDSTA rechecks death flag after rejected-list text before writing',()=>{
  const f=fixture();ranking(f.b.files.stared);f.record(5,-1n);const out=f.b.io.outstr;f.b.io.outstr=function*(a){yield*out(a);if(a===f.ss.statisticsText[9])f.record(7,0n);};f.run();assert.equal(f.b.writes.length,1);assert.equal(f.file.read('stabuf',523),0n);
});
test('Raw UPDSTA direct ship OUTSTR resolves the current indexed pointer word',()=>{
  const f=fixture();f.record(7,0n);f.b.files.stared[523]=1n;f.h.put(38010n,'CUSTOM');f.r.x4=10n;f.m.write(f.ss.lngshp,(8n<<18n)|38000n);f.run();assert.ok(f.output().startsWith(statisticsText[0].text+'CUSTOM'+statisticsText[1].text));
});
test('Raw UPDCAP increment can alias the statistics serial through a negative ship index',()=>{
  const f=fixture();f.record(9,-512n);f.b.io.outstr=function*(){};f.commission();assert.equal(f.high.read('gameno'),1n);assert.equal(f.file.read('stabuf',0),2n);assert.deepEqual(f.b.events.filter(e=>e.startsWith('odec:')),['odec:1','odec:2']);
});
test('Raw UPDSTA DATE may change live T2 destination without moving the first five copied words',()=>{
  const f=fixture();f.b.io.dateT3=function*(){f.r.t2=f.ss.stabuf+259n;f.r.t3=88n;};f.run();assert.equal(f.row()[0],77n);assert.equal(f.row()[5],0n);assert.equal(f.row(0,1)[0],0n);assert.deepEqual(f.row(0,1).slice(5),[88n,555n,2000n,0n,halfWords(1n,0n)]);
});
test('Raw UPDSTA failed DATE leaves partial record, held lock and no file write',()=>{const f=fixture();f.b.io.dateT3=function*(){throw new Error('DATE fault');};assert.throws(f.run,/DATE fault/);assert.equal(f.row()[0],77n);assert.equal(f.row()[5],0n);assert.equal(f.b.writes.length,0);assert.ok(!f.b.events.includes('unlo'));assert.ok(Array.from({length:lockLayout.maximum},(_,i)=>f.locks.read('loktab',i)).includes(f.ss.staupd));});
test('Raw UPDSTA output failure retains complete memory and held lock',()=>{const f=fixture();f.b.io.outputSTA=function*(){throw new Error('OUTPUT fault');};assert.throws(f.run,/OUTPUT fault/);assert.equal(f.row()[6],555n);assert.ok(!f.b.events.includes('unlo'));});
test('Raw UPDSTA interrupted placement output retains actual SAVE stack words',()=>{const f=fixture(),sp=f.r.s;f.b.io.outstr=function*(a){assert.equal(a,f.ss.statisticsText[4]);throw new Error('OUTSTR fault');};assert.throws(f.run,/OUTSTR fault/);assert.equal(rightHalf(f.r.s),rightHalf(sp)+3n);assert.equal(f.m.read(rightHalf(sp)+1n),f.ss.stabuf+3n);assert.ok(!f.b.events.includes('date'));});
test('Raw UPDSTA clear BLT executes loaded literal and can alias caller storage',()=>{const f=fixture();f.m.write(f.ss.clearLiteral,halfWords(f.b.actuals[0],f.ss.staend));f.b.opens.stared={success:false,lePpn:0n};f.run();assert.equal(f.file.read('stabuf',639),77n);});
for(const entry of ['updsta','updcap'] as const)test(`Raw ${entry} failed lock retries before clearing, exposes each wait`,()=>{
  const f=fixture();f.file.write('stabuf',99n,0);let n=0;const lock=f.b.io.lock;f.b.io.lock=function*(){yield 'lock';if(++n<2)f.low.write('lkfail',-1n);else yield*lock();};const g=f.b.run(entry);assert.equal(g.next().value,'lock');assert.equal(f.file.read('stabuf',0),99n);assert.equal(g.next().value,'lock');assert.equal(f.file.read('stabuf',0),99n);finish(g);assert.equal(n,2);assert.equal(f.b.events.filter(e=>e==='blt').length,1);assert.equal(f.b.events.filter(e=>e==='flush').length,entry==='updsta'?1:3);
});
test('Raw UPDCAP exact mission announcement has no trailing CRLF',()=>{
  const f=fixture();f.b.files.stared[0]=42n;f.b.files.stared[513]=5n;f.commission();assert.equal(f.high.read('gameno'),43n);assert.equal(f.file.read('stabuf',513),6n);assert.equal(f.output(),'\r\nDECWAR game #43\r\n\r\nThis is mission #6 for the\r\nLexington');assert.equal(f.low.read('hcpos'),3n);assert.equal(f.b.writes.length,1);assert.equal(f.b.events.at(-1),'text:37800');
});
test('Raw UPDCAP existing GAMENO is replaced by file serial without increment',()=>{const f=fixture();f.high.write('gameno',100n);f.b.files.stared[0]=78n;f.record(9,6n);f.commission();assert.equal(f.high.read('gameno'),78n);assert.equal(f.file.read('stabuf',518),1n);assert.ok(f.output().endsWith('Cobra'));});
test('Raw UPDCAP serial and mission wrap before unguarded decimal reaches required MOVM overflow policy',()=>{const f=fixture();f.record(9,10n);f.b.files.stared[0]=MAX_INTEGER;f.b.files.stared[522]=MAX_INTEGER;f.low.write('hungup',-1n);assert.throws(f.commission,/strictly unequal/);assert.equal(f.b.writes.length,1);assert.ok(f.b.events.includes('unlo'));assert.equal(f.high.read('gameno'),MIN_INTEGER);assert.equal(f.file.read('stabuf',522),MIN_INTEGER);});
for(const gameno of [0n,100n])for(const success of [false,true])test(`Raw UPDCAP unread normal file with GAMENO ${gameno}, OPEN ${success}`,()=>{const f=fixture();f.high.write('gameno',gameno);f.b.opens.stared={success,lePpn:0n};f.b.files.stared.fill(99n);f.commission();assert.equal(f.high.read('gameno'),gameno===0n?1n:0n);assert.equal(f.file.read('stabuf',513),1n);assert.equal(f.file.read('stabuf',600),0n);assert.equal(f.b.events.filter(e=>e==='close').length,success?2:1);});
test('Raw UPDCAP free branch saves normal serial then increments only free mission count',()=>{const f=fixture();f.locks.write('frebie',-1n);f.b.files.stared[0]=20n;f.b.files.stared[513]=12n;f.b.files.stfred[0]=3n;f.b.files.stfred[513]=4n;f.b.files.stfred[600]=987n;f.commission();assert.equal(f.b.writes.length,2);assert.equal(f.b.writes[0].words[0],21n);assert.equal(f.b.writes[0].words[513],12n);assert.equal(f.b.writes[1].words[0],21n);assert.equal(f.b.writes[1].words[513],5n);assert.equal(f.b.writes[1].words[600],987n);assert.equal(f.b.events.filter(e=>e==='input:'+f.ss.staiow).length,2);assert.ok(!f.b.events.includes('input:'+f.ss.stfiow));});
for(const lePpn of [-1n,0n])test(`Raw UPDCAP failed intermediate OPEN with LE.PPN ${lePpn} executes selected continuation`,()=>{const f=fixture();f.locks.write('frebie',-1n);f.b.opens.staupd={success:false,lePpn:0n};f.b.opens.stfred={success:false,lePpn};f.b.files.stfred[513]=9n;f.commission();assert.ok(f.b.events.includes('updcap-write-open'));assert.ok(f.b.events.includes('updcap-read-open'));assert.ok(f.b.events.includes('updcap-free-exit'));assert.equal(f.file.read('stabuf',513),lePpn<0n?10n:1n);assert.equal(f.b.writes.length,2);});
test('Raw UPDCAP failed final OPEN unlocks and announces its in-memory count',()=>{const f=fixture();f.b.opens.staupd={success:false,lePpn:0n};f.commission();assert.equal(f.b.writes.length,0);assert.ok(f.b.events.includes('unlo'));assert.ok(f.output().includes('mission #1'));});
test('Raw UPDCAP HUNGUP still executes first OUTSTR and both ODEC calls',()=>{const f=fixture();f.low.write('hungup',-1n);f.commission();assert.equal(f.output(),commissionText[0].text);assert.deepEqual(f.b.events.filter(e=>e.startsWith('odec:')),['odec:1','odec:1']);assert.ok(!f.b.events.includes('flush'));});
test('Raw UPDCAP rereads actual ship separately for increment, mission number and name',()=>{
  const f=fixture();f.b.files.stared[514]=8n;const out=f.b.io.outstr;f.b.io.outstr=function*(a){yield*out(a);if(a===f.ss.commissionText[1])f.record(9,2n);if(a===f.ss.commissionText[2])f.record(9,6n);};f.commission();assert.equal(f.file.read('stabuf',513),1n);assert.equal(f.file.read('stabuf',514),8n);assert.ok(f.output().includes('mission #8'));assert.ok(f.output().endsWith('Cobra'));
});
test('Raw UPDCAP rechecks FREE status at final write after normal input',()=>{const f=fixture();const close=f.b.io.closeSTA;let n=0;f.b.io.closeSTA=function*(){yield*close();if(++n===2)f.locks.write('frebie',0n);};f.locks.write('frebie',-1n);f.commission();assert.deepEqual(f.b.writes.map(w=>w.key),['staupd','staupd']);});
test('Raw UPDCAP required failed-open continuation may stop before OUTPUT',()=>{const f=fixture();f.locks.write('frebie',-1n);f.b.opens.staupd={success:false,lePpn:0n};f.b.io.continuation=function*(site){throw new Error(site+' unresolved');};assert.throws(f.commission,/updcap-write-open unresolved/);assert.equal(f.high.read('gameno'),1n);assert.equal(f.b.writes.length,0);assert.ok(!f.b.events.includes('unlo'));});
test('Raw UPDSTA required first-kill continuation preserves count on failure',()=>{const f=fixture();f.record(7,0n);f.b.io.continuation=function*(site){throw new Error(site+' unresolved');};assert.throws(f.run,/updsta-first-kill unresolved/);assert.equal(f.file.read('stabuf',523),1n);assert.equal(f.row()[0],0n);assert.ok(!f.b.events.includes('unlo'));});
test('Raw UPDCAP followed by UPDSTA uses the same actual STABUF and saved files',()=>{const f=fixture();f.commission();f.record(7,0n);f.run();assert.equal(f.file.read('stabuf',0),1n);assert.equal(f.file.read('stabuf',513),1n);assert.equal(f.file.read('stabuf',523),1n);assert.equal(f.row()[9],1n);assert.equal(f.b.writes.length,2);});
test('Statement GETCMD death reaches raw UPDSTA before actual FREE clears JOB and WHO',()=>{
  const f=fixture();f.getCommand.trapAddress.value=0n;f.high.write('shpcon',BigInt(K.KENDAM),1,K.KSDAM);f.high.write('job',456n,1,K.KPPN);f.high.write('job',12n,1,K.KNAM1);f.high.write('job',34n,1,K.KNAM2);f.high.write('names',packAscii('LEXIN'),1,1);f.endgame.io.etim=function*(){return 2000n;};f.endgame.io.points=function*(){f.m.write(f.endgame.total,789n);};
  finish(f.getCommand.run());assert.deepEqual(f.row().slice(0,3),[456n,12n,34n]);assert.equal(f.row()[6],789n);assert.equal(f.row()[7],2000n);assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('job',1,K.KPPN),0n);assert.equal(f.high.read('alive',1),1n);assert.equal(f.free.fr.read('tjob',K.KPPN),456n);assert.equal(f.b.writes.length,1);
});
test('Statement ENDGAM reaches raw UPDSTA and FREE before required EXIT transfer',()=>{
  const f=fixture();f.high.write('endflg',-1n);f.high.write('nplnet',1n);f.high.write('nbase',1n,1);f.high.write('nbase',0n,2);f.high.write('job',87n,1,K.KPPN);f.endgame.io.etim=function*(){return 2001n;};f.endgame.io.points=function*(){f.m.write(f.endgame.total,901n);};assert.throws(()=>finish(f.endgame.run()),/EXIT transfer/);assert.equal(f.row()[0],87n);assert.equal(f.row()[6],901n);assert.equal(f.row()[9],halfWords(1n,0n));assert.equal(f.low.read('who'),0n);assert.equal(f.b.writes.length,1);
});
