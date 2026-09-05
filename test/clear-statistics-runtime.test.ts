import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,clearStatisticsText as T,gripeText,honorRollText } from '../src/generated/source-data.ts';
import { lockLayout } from '../src/generated/lock-layout.ts';
import { add36,halfWords,leftHalf,rightHalf,packAscii,packSixbit,signed36 } from '../src/compat/word36.ts';
function fixture(){
  const f=pregameRuntimeFixture([]),b=f.clearStatistics,s=b.symbols;
  f.low.write('who',0n);f.low.write('hungup',0n);f.low.write('addrck',0n);f.low.write('ccflg',0n);f.low.write('hcpos',0n);f.low.write('blank',0n);f.low.write('terwid',80n);f.locks.write('frebie',0n);f.high.write('gameno',12n);f.high.write('versio',21n);
  const before=f.text().length;
  return {...f,b,ss:s,run:()=>finish(b.run()),output:()=>f.text().slice(before),held:()=>Array.from({length:lockLayout.maximum},(_,i)=>f.locks.read('loktab',i)).includes(s.stabuf)};
}
function isolated(){const f=fixture();f.b.io.gripe=function*(){f.b.events.push('gripe');};return f;}
function populate(words:bigint[],serial=44n,name='ALICE '){words[0]=serial;words.splice(3,10,halfWords(0o123n,0o4567n),packSixbit(name),packSixbit('SMITH '),packAscii('Lexin'),packAscii('gton '),23130n,680n,90000n,0n,halfWords(1n,5n));}
test('Raw STAZAP clears indices 639 through 1 and preserves zero after GRIPE',()=>{
  const f=isolated();for(let i=0;i<640;i++)f.file.write('stabuf',BigInt(i+1),i);f.run();assert.equal(f.statistics.writes.length,2);for(const w of f.statistics.writes){assert.equal(w.words[0],1n);assert.ok(w.words.slice(1).every(v=>v===0n));assert.equal(w.descriptor,f.ss.staiow);}assert.deepEqual(f.statistics.writes.map(w=>w.key),['staupd','stfupd']);assert.equal(f.output(),T[0].text+T[1].text);assert.equal(f.low.read('addrck'),0n);assert.equal(f.held(),false);
});
test('Raw STAZAP uses STABUF lock and retains game-specific queue number',()=>{
  const f=isolated(),lock=f.b.io.lock;f.b.io.lock=function*(){assert.equal(f.r.t1,f.ss.stabuf);yield*lock();assert.equal(rightHalf(f.m.read(f.symbols.queuen)),f.ss.stabuf);assert.equal((f.m.read(f.symbols.queuen)>>18n)&63n,12n);};f.run();assert.notEqual(f.ss.stabuf,f.statistics.symbols.staupd);assert.equal(f.locks.read('locked'),0n);
});
test('Raw STAZAP retry does not repeat initial announcement or touch buffer',()=>{
  const f=isolated();f.file.write('stabuf',99n,639);let tries=0;const lock=f.b.io.lock;f.b.io.lock=function*(){yield 'lock';if(++tries===1)f.low.write('lkfail',-1n);else yield*lock();};const g=f.b.run();assert.equal(g.next().value,'lock');assert.equal(f.output(),T[0].text);assert.equal(f.file.read('stabuf',639),99n);assert.equal(g.next().value,'lock');assert.equal(f.file.read('stabuf',639),99n);finish(g);assert.equal(tries,2);assert.equal(f.output(),T[0].text+T[1].text);
});
test('Raw STAZAP GRIPE sees ADDRCK=1 and can replace the retained serial',()=>{
  const f=isolated();f.file.write('stabuf',99n,0);f.b.io.gripe=function*(){assert.equal(f.low.read('addrck'),1n);assert.equal(f.r.t1,1n);assert.equal(f.held(),true);f.file.write('stabuf',123n,0);f.low.write('addrck',-1n);};f.run();assert.equal(f.statistics.writes[0].words[0],123n);assert.equal(f.low.read('addrck'),0n);
});
test('Raw STAZAP suspended GRIPE precedes every clear and output',()=>{
  const f=isolated();f.file.write('stabuf',99n,639);f.b.io.gripe=function*(){yield 'gripe';};const g=f.b.run();assert.equal(g.next().value,'gripe');assert.equal(f.file.read('stabuf',639),99n);assert.equal(f.low.read('addrck'),1n);assert.equal(f.held(),true);assert.equal(f.statistics.writes.length,0);finish(g);assert.equal(f.file.read('stabuf',639),0n);
});
test('Raw STAZAP clearing suspends with current T1 and only the highest word changed',()=>{
  const f=isolated();for(let i=0;i<640;i++)f.file.write('stabuf',99n,i);const decrement=f.b.io.sojgT1;let first=true;f.b.io.sojgT1=function*(){if(first){first=false;yield 'clear';}return yield*decrement();};const g=f.b.run();assert.equal(g.next().value,'clear');assert.equal(f.r.t1,639n);assert.equal(f.file.read('stabuf',639),0n);assert.equal(f.file.read('stabuf',638),99n);finish(g);
});
test('Raw STAZAP follows live T1 changes instead of a host clear loop',()=>{
  const f=isolated();for(let i=0;i<640;i++)f.file.write('stabuf',99n,i);let first=true;const decrement=f.b.io.sojgT1;f.b.io.sojgT1=function*(){if(first){first=false;f.r.t1=2n;}return yield*decrement();};f.run();assert.equal(f.file.read('stabuf',639),0n);assert.equal(f.file.read('stabuf',1),0n);assert.equal(f.file.read('stabuf',2),99n);assert.equal(f.file.read('stabuf',638),99n);
});
test('Raw STAZAP effective clearing address wraps to physical AC memory',()=>{
  const f=isolated();f.file.write('stabuf',99n,638);let first=true;f.b.io.sojgT1=function*(){if(first){first=false;f.r.x1=77n;f.r.t1=signed36(halfWords(1n,5n-f.ss.stabuf));return true;}assert.equal(f.r.x1,0n);return false;};f.run();assert.equal(f.statistics.writes.length,2);assert.equal(f.file.read('stabuf',638),99n);
});
for(const fail of ['staupd','stfupd'] as const)test(`Raw STAZAP failed ${fail} OPEN reports then unlocks and clears ADDRCK`,()=>{
  const f=isolated();f.file.write('stabuf',77n,0);f.statistics.opens[fail]={success:false,lePpn:0n};f.run();assert.equal(f.output(),T[0].text+T[2].text+T[1].text);assert.equal(f.statistics.writes.length,fail==='staupd'?0:1);assert.equal(f.statistics.events.filter(e=>e==='close').length,fail==='staupd'?0:1);assert.equal(f.held(),false);assert.equal(f.low.read('addrck'),0n);if(fail==='staupd')assert.ok(!f.statistics.events.includes('open:stfupd'));
});
test('Raw STAZAP reloads free OPEN literal after first CLOSE',()=>{
  const f=isolated(),close=f.b.io.closeSTA;let n=0;f.b.io.closeSTA=function*(){yield*close();if(++n===1)f.m.write(f.ss.freeLiteral,halfWords(f.statistics.symbols.staupd,f.statistics.symbols.staupd));};f.run();assert.deepEqual(f.statistics.writes.map(w=>w.key),['staupd','staupd']);
});
test('Raw STAZAP second write sees buffer mutations from first CLOSE',()=>{
  const f=isolated(),close=f.b.io.closeSTA;let n=0;f.b.io.closeSTA=function*(){yield*close();if(++n===1)f.file.write('stabuf',88n,5);};f.run();assert.equal(f.statistics.writes[0].words[5],0n);assert.equal(f.statistics.writes[1].words[5],88n);
});
test('Raw STAZAP direct announcements are unguarded after HUNGUP',()=>{const f=isolated();f.low.write('hungup',-1n);f.run();assert.equal(f.output(),T[0].text+T[1].text);});
test('Raw STAZAP failed initial OUTSTR reaches neither lock nor ADDRCK',()=>{const f=isolated();f.low.write('addrck',77n);f.b.io.outstr=function*(){throw new Error('OUTSTR fault');};assert.throws(f.run,/OUTSTR fault/);assert.equal(f.low.read('addrck'),77n);assert.equal(f.held(),false);assert.equal(f.statistics.writes.length,0);});
test('Raw STAZAP failed GRIPE retains ADDRCK, buffer and held lock',()=>{const f=isolated();f.file.write('stabuf',99n,639);f.b.io.gripe=function*(){throw new Error('GRIPE fault');};assert.throws(f.run,/GRIPE fault/);assert.equal(f.low.read('addrck'),1n);assert.equal(f.file.read('stabuf',639),99n);assert.equal(f.held(),true);assert.equal(f.statistics.writes.length,0);});
test('Raw STAZAP second OUTPUT failure preserves first file and leaves lock held',()=>{
  const f=isolated(),output=f.b.io.outputSTA;let n=0;f.b.io.outputSTA=function*(a){if(++n===2)throw new Error('OUTPUT fault');yield*output(a);};assert.throws(f.run,/OUTPUT fault/);assert.equal(f.statistics.writes.length,1);assert.equal(f.held(),true);assert.equal(f.low.read('addrck'),1n);assert.equal(f.output(),T[0].text);
});
test('Raw STAZAP failed error message prevents unlock and final output',()=>{
  const f=isolated();f.statistics.opens.staupd={success:false,lePpn:0n};const out=f.b.io.outstr;f.b.io.outstr=function*(a){if(a===f.ss.text[2])throw new Error('error text fault');yield*out(a);};assert.throws(f.run,/error text fault/);assert.equal(f.held(),true);assert.equal(f.low.read('addrck'),1n);
});
test('Raw STAZAP final OUTSTR happens after unlock but before ADDRCK clearing',()=>{
  const f=isolated(),out=f.b.io.outstr;f.b.io.outstr=function*(a){if(a===f.ss.text[1]){assert.equal(f.held(),false);assert.equal(f.low.read('addrck'),1n);yield 'finished';}yield*out(a);};const g=f.b.run();assert.equal(g.next().value,'finished');assert.equal(f.low.read('addrck'),1n);finish(g);assert.equal(f.low.read('addrck'),0n);
});
test('Raw STAZAP final output failure leaves ADDRCK set after both writes and unlock',()=>{const f=isolated(),out=f.b.io.outstr;f.b.io.outstr=function*(a){if(a===f.ss.text[1])throw new Error('final text fault');yield*out(a);};assert.throws(f.run,/final text fault/);assert.equal(f.statistics.writes.length,2);assert.equal(f.held(),false);assert.equal(f.low.read('addrck'),1n);});
test('Raw STAZAP composes GRIPE and SHOSTA before wiping the statistics files',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.file.write('stabuf',999n,0);f.run();assert.ok(f.gripe.text().startsWith('[V2.1  05-SEP-78 12:34  Pre-game'));assert.ok(f.gripe.text().includes(honorRollText[0].text));assert.ok(f.gripe.text().includes(' ALICE SMITH     123-4567      1 Lexington    2    05/03/26\r\n'));assert.ok(!f.gripe.text().includes(' Ship        Runtm Date'));assert.ok(f.gripe.text().includes('----------\r\n'));assert.equal(f.output(),T[0].text+T[1].text);assert.equal(f.statistics.writes[0].words[0],44n);assert.equal(f.statistics.writes[1].words[0],44n);assert.ok(f.statistics.writes[0].words.slice(1).every(w=>w===0n));assert.equal(f.gripe.writes.length,1);assert.equal(f.low.read('addrck'),0n);
});
test('Raw free-user STAZAP logs both files and retains serial from the final paid read',()=>{
  const f=fixture();f.locks.write('frebie',-1n);populate(f.statistics.files.stfred,11n,'FREE  ');populate(f.statistics.files.stared,22n,'PAID  ');f.run();const log=f.gripe.text();assert.ok(log.indexOf('FREE  SMITH')<log.indexOf('PAID  SMITH'));assert.ok(log.includes('non-paying'));assert.equal(f.statistics.writes[0].words[0],22n);assert.equal(f.statistics.writes[1].words[0],22n);
});
test('Raw STAZAP retains free serial when GRIPE cannot open the paid file',()=>{
  const f=fixture();f.locks.write('frebie',-1n);populate(f.statistics.files.stfred,11n);f.statistics.opens.stared={success:false,lePpn:0n};f.run();assert.equal(f.statistics.writes[0].words[0],11n);assert.equal(f.statistics.writes[1].words[0],11n);
});
test('Raw STAZAP continues clearing after a returning GRIPE file-open failure',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.gripe.openResults.push({success:false,error:1n});f.run();assert.equal(f.gripe.writes.length,0);assert.equal(f.statistics.writes.length,2);assert.ok(f.output().includes(gripeText[9].text));assert.equal(f.held(),false);assert.equal(f.low.read('addrck'),0n);
});
test('Raw STAZAP log OUTPUT failure warns then still clears both statistics files',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.gripe.monitor.outputError=true;f.run();assert.equal(f.gripe.writes.length,0);assert.equal(f.statistics.writes.length,2);assert.ok(f.output().includes(gripeText[13].text));
});
test('Raw STAZAP busy GRIPE waits with statistics lock held and buffer un-erased',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.gripe.openResults.push({success:false,error:23n},{success:true});const g=f.b.run();assert.equal(g.next().value,'gripe-hibernate');assert.equal(f.held(),true);assert.equal(f.file.read('stabuf',3),halfWords(0o123n,0o4567n));assert.equal(f.statistics.writes.length,0);finish(g);assert.equal(f.statistics.writes.length,2);
});
test('Raw STAZAP GRIPE Ctrl-C cleanup still returns into statistics clearing',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.gripe.openResults.push({success:false,error:23n});const g=f.b.run();assert.equal(g.next().value,'gripe-hibernate');f.low.write('ccflg',-1n);finish(g);assert.equal(f.gripe.writes.length,0);assert.equal(f.low.read('ccflg'),0n);assert.equal(f.statistics.writes.length,2);
});
test('Raw GRIPE prepends a new log with original whole-word old-file preservation',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.low.write('addrck',1n);finish(f.gripe.run());const old=[...f.gripe.disk];f.statistics.files.stared[4]=packSixbit('BOB   ');finish(f.gripe.run());assert.equal(f.gripe.writes.length,2);assert.deepEqual(f.gripe.disk.slice(-old.length),old);assert.ok(f.gripe.text().indexOf('BOB   SMITH')<f.gripe.text().indexOf('ALICE SMITH'));assert.ok(f.gripe.events.includes('input'));assert.ok(f.gripe.events.includes('grow:60020'));
});
test('Raw GRIPE statistics file output is packed memory, not the terminal sink',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.low.write('addrck',1n);finish(f.gripe.run());assert.equal(f.output(),'');assert.equal(f.gripe.disk[0],signed36(packAscii('[V2.1')));assert.equal(rightHalf(f.editor.runtime.block.read('obflb')),f.gripe.symbols.ttyfil);assert.equal(f.editor.runtime.block.read('oc'),201n);assert.equal(f.job.jbff,60000n);
});
test('Raw GRIPE selected log sink retains statistics even when terminal is hung up',()=>{const f=fixture();populate(f.statistics.files.stared);f.low.write('hungup',-1n);f.low.write('addrck',1n);finish(f.gripe.run());assert.ok(f.gripe.text().includes('ALICE SMITH'));assert.equal(f.output(),'');});
test('Raw GRIPE preserves actual GRIP.Z argument through SHOSTA calls',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.low.write('addrck',1n);const show=f.gripe.io.shosta;f.gripe.io.shosta=function*(){assert.equal(f.r.arg,f.gripe.symbols.statisticsArgument);assert.equal(f.rt.args.read(0),1n);yield*show();};finish(f.gripe.run());assert.equal(f.r.arg,f.gripe.symbols.statisticsArgument);
});
test('Raw GRIPE temporarily erases and restores a current non-RED ship',()=>{
  const f=fixture();f.low.write('who',6n);f.low.write('addrck',1n);f.high.write('alive',-1n,6);f.high.write('shpcon',12n,6,K.KVPOS);f.high.write('shpcon',34n,6,K.KHPOS);f.high.write('shpcon',BigInt(K.GREEN),6,K.KSPCON);f.views.high.board.setdsp(12,34,206);const header=f.gripe.io.osts;f.gripe.io.osts=function*(){assert.equal(f.views.high.board.disp(12,34),1000);yield*header();};finish(f.gripe.run());assert.equal(f.views.high.board.disp(12,34),206);
});
test('Raw GRIPE RED refusal returns before allocation or logging even during STAZAP',()=>{
  const f=fixture();f.low.write('who',1n);f.high.write('shpcon',BigInt(K.RED),1,K.KSPCON);f.file.write('stabuf',999n,0);f.run();assert.ok(f.output().includes(gripeText[0].text));assert.equal(f.gripe.writes.length,0);assert.equal(f.statistics.writes[0].words[0],999n);assert.equal(f.statistics.writes.length,2);
});
test('Raw GRIPE interactive input composes INLI, OSTR.X and packed file output',()=>{
  const f=fixture();f.editor.feed('hello\x1a');finish(f.gripe.run());assert.ok(f.output().startsWith(gripeText[1].text));assert.ok(f.gripe.text().includes('hello\r\n----------\r\n'));assert.ok(f.gripe.events.includes('inli'));assert.equal(f.gripe.writes.length,1);
});
test('Raw GRIPE empty first EOF closes without writing a file',()=>{const f=fixture();f.editor.feed('\x1a');finish(f.gripe.run());assert.equal(f.gripe.writes.length,0);assert.ok(f.gripe.events.includes('close'));assert.ok(!f.gripe.events.includes('open'));});
test('Raw GRIPE twenty-line input keeps warnings on terminal and all lines in the packed log',()=>{
  const f=fixture();for(let i=1;i<=20;i++)f.editor.feed('Line '+i+'\n');finish(f.gripe.run());assert.equal(f.gripe.events.filter(e=>e==='inli').length,20);assert.ok(f.output().includes(gripeText[2].text));assert.ok(f.output().includes(gripeText[3].text));assert.ok(f.gripe.text().includes('Line 20\r\n'));assert.ok(!f.gripe.text().includes(gripeText[2].text));assert.equal(f.gripe.writes.length,1);
});
test('Raw GRIPE first buffer word keeps its unused bit while later words are initialized',()=>{
  const f=fixture();f.m.write(60000n,-1n);f.low.write('addrck',1n);finish(f.gripe.run());assert.equal(f.gripe.disk[0],signed36(packAscii('[V2.1')|1n));assert.equal(f.gripe.disk[1]&1n,0n);
});
test('Raw GRIPE old-file read error preserves prior disk and returns through cleanup',()=>{
  const f=fixture();f.low.write('addrck',1n);finish(f.gripe.run());const old=[...f.gripe.disk];f.gripe.monitor.inputError=true;finish(f.gripe.run());assert.deepEqual(f.gripe.disk,old);assert.equal(f.gripe.writes.length,1);assert.ok(f.output().includes(gripeText[12].text));assert.equal(rightHalf(f.editor.runtime.block.read('obflb')),f.gripe.symbols.ttyfil);
});
test('Raw GRIPE old-file CORE failure retains old disk after warning and cleanup',()=>{
  const f=fixture();f.low.write('addrck',1n);finish(f.gripe.run());const old=[...f.gripe.disk],open=f.gripe.io.open;f.gripe.io.open=function*(){const ok=yield*open();f.job.jbrel=60000n;return ok;};f.gripe.monitor.coreSuccess=false;
  // Keep log construction in already mapped core; failure is selected only
  // for the later old-file expansion in GRIP.3.
  f.job.jbrel=69999n;finish(f.gripe.run());assert.deepEqual(f.gripe.disk,old);assert.ok(f.output().includes(gripeText[11].text));assert.equal(f.gripe.writes.length,1);
});
test('Raw GRIPE unresolved HIBER continuation stops before cleanup and statistics erasure',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.gripe.openResults.push({success:false,error:23n});f.gripe.monitor.hiberSkip=false;const g=f.b.run();assert.equal(g.next().value,'gripe-hibernate');assert.throws(()=>finish(g),/HIBER HALT continuation/);assert.equal(f.held(),true);assert.equal(f.statistics.writes.length,0);assert.equal(f.low.read('addrck'),1n);assert.equal(f.file.read('stabuf',0),44n);
});
test('Raw GRIPE cleanup failure leaves output selected to log and statistics untouched',()=>{
  const f=fixture();populate(f.statistics.files.stared);f.gripe.closeIO.executeClose=function*(){throw new Error('CLOSE transfer');};assert.throws(f.run,/CLOSE transfer/);assert.equal(f.gripe.writes.length,1);assert.equal(f.statistics.writes.length,0);assert.equal(f.held(),true);assert.equal(f.file.read('stabuf',3),halfWords(0o123n,0o4567n));assert.equal(rightHalf(f.editor.runtime.block.read('obflb')),f.gripe.symbols.grpfil);
});
test('Raw GRIPE log output wait preserves original words before STAZAP clears them',()=>{
  const f=fixture();populate(f.statistics.files.stared);const output=f.gripe.io.output;f.gripe.io.output=function*(a){yield 'log-output';return yield*output(a);};const g=f.b.run();assert.equal(g.next().value,'log-output');assert.equal(f.file.read('stabuf',3),halfWords(0o123n,0o4567n));assert.equal(f.held(),true);assert.equal(f.gripe.writes.length,0);finish(g);assert.equal(f.file.read('stabuf',3),0n);assert.equal(f.statistics.writes.length,2);
});
test('Statement PREGAM GRIPE uses raw editor and returns to the same command loop',()=>{
  const f=pregameRuntimeFixture(['PREGAME','GRIPE','hello\x1a','ACTIVATE']);driveInitial(f);assert.ok(f.pregame.events.includes('gripe'));assert.equal(f.gripe.writes.length,1);assert.ok(f.gripe.text().includes('hello\r\n'));assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('Statement PREGAM unprivileged star-ZAP does not log or change statistics',()=>{
  const f=pregameRuntimeFixture(['PREGAME','*ZAP','ACTIVATE']);f.low.write('pasflg',0n);populate(f.statistics.files.stared);driveInitial(f);assert.equal(f.gripe.writes.length,0);assert.equal(f.statistics.writes.length,0);assert.equal(f.statistics.files.stared[0],44n);
});
test('Raw GRIPE diagnostic composes GRIP.A and OCT.O over actual hit queue and stack',()=>{
  const f=fixture();f.low.write('addrck',-1n);f.input.block.write('linbuf',65n,0);f.input.block.write('linbuf',0n,1);f.file.write('stabuf',6100n,17);f.m.write(f.getHit.queues.address('hitql')-1n,123n);finish(f.gripe.run());assert.ok(f.gripe.text().includes('**** Command line:\r\nA^@\r\n'));assert.ok(f.gripe.text().includes('*** HITQL-1:'));assert.ok(f.gripe.text().includes('*** LOKTAB:'));assert.equal(f.r.s,f.s.initialStackWord);assert.equal(f.gripe.writes.length,1);
});
test('Statement PREGAM privileged ZAP composes raw logging and statistics writes',()=>{
  const f=pregameRuntimeFixture(['PREGAME','*ZAP','ACTIVATE']);f.low.write('pasflg',-1n);populate(f.statistics.files.stfred,11n);populate(f.statistics.files.stared,22n);driveInitial(f);assert.ok(f.pregame.events.includes('stazap'));assert.equal(f.gripe.writes.length,1);assert.equal(f.statistics.writes.length,2);assert.equal(f.statistics.writes[0].words[0],22n);assert.equal(f.low.read('addrck'),0n);
});
