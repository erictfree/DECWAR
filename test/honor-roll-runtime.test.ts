import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,packAscii,packSixbit,signed36,MAX_INTEGER,MIN_INTEGER,rightHalf } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { honorRollText as T } from '../src/generated/source-data.ts';
function row(words:bigint[],at=3,ppn=halfWords(0o123n,0o4567n)){
  words.splice(at,10,ppn,packSixbit('ALICE '),packSixbit('SMITH '),packAscii('Lexin'),packAscii('gton '),23130n,680n,90000n,123n,halfWords(1n,5n));
}
function fixture(arg=0n,width=79n){
  const f=pregameRuntimeFixture([]),b=f.honorRoll,s=b.symbols,stats=f.statistics;
  f.low.write('ccflg',0n);f.low.write('hungup',0n);f.low.write('terwid',width);f.low.write('hcpos',0n);f.low.write('blank',0n);f.locks.write('frebie',0n);f.m.write(b.argument,arg);
  const before=f.text().length;
  const load=(words:bigint[])=>words.forEach((w,i)=>f.file.write('stabuf',w,i));
  const display=(offset=3)=>{f.r.x1=s.stabuf+BigInt(offset);return finish(b.run('dspsta'));};
  return {...f,b,hs:s,stats,load,display,show:()=>finish(b.run()),output:()=>f.text().slice(before)};
}
const header='\r\nCaptain        Service # Credits',wideHeader=' Ship        Runtm Date',record=' ALICE SMITH     123-4567      1',wideTail=' Lexington    2    05/03/26';
for(const arg of [-1n,0n,1n])for(const width of [79n,80n])test(`Raw DSPSTA exact bytes at argument ${arg}, width ${width}`,()=>{
  const f=fixture(arg,width);row(f.stats.files.stared);f.load(f.stats.files.stared);f.display();assert.equal(f.output(),header+(arg<=0n?wideHeader:'')+'\r\n'+record+(arg>0n||width>=80n?wideTail:'')+'\r\n');assert.equal(f.b.events.filter(e=>e==='flush').length,1);
});
for(const [score,expected] of [[679n,'     0'],[680n,'     1'],[-1319n,'     0'],[-1320n,'    -1'],[MAX_INTEGER,'-*****'],[MIN_INTEGER,'-*****']] as const)test(`Raw DSPSTA credits ${score} retain octal rounding and signed truncation`,()=>{
  const f=fixture();row(f.stats.files.stared);f.stats.files.stared[9]=score;f.load(f.stats.files.stared);f.display();assert.equal(f.output().split('\r\n')[2].slice(-6),expected);assert.ok(f.b.events.includes('idivi:x1:1000'));
});
for(const [runtime,expected] of [[29999n,'0'],[30000n,'1'],[-30001n,'0'],[-90000n,'-1']] as const)test(`Raw DSPSTA elapsed ${runtime} uses ADDI 30000 then IDIVI 60000`,()=>{
  const f=fixture(1n);row(f.stats.files.stared);f.stats.files.stared[10]=runtime;f.stats.files.stared[8]=0n;f.load(f.stats.files.stared);f.display();assert.ok(f.output().endsWith('Lexington'+expected.padStart(5)+'    01/01/\x128\r\n'));
});
for(const [ppn,text] of [[1n,'1    '],[0o12345n,'12345 '],[0o777777n,'777777 ']] as const)test(`Raw DSPSTA programmer ${ppn} preserves OOCT X2 and AOJL spacing`,()=>{
  const f=fixture();row(f.stats.files.stared,3,halfWords(0o777777n,ppn));f.load(f.stats.files.stared);f.display();assert.ok(f.output().includes('777777-'+text+'     1'));
});
for(const [date,expected] of [[23130n,[5n,3n,26n]],[0n,[1n,1n,-36n]],[31n,[1n,2n,-36n]],[371n,[31n,12n,-36n]],[-1n,[0n,1n,-36n]]] as const)test(`Raw DACON ${date} executes two divisions and separate year adjustments`,()=>{
  const f=fixture();f.r.t1=date;finish(f.b.date());assert.deepEqual([f.m.read(f.hs.day),f.m.read(f.hs.month),f.m.read(f.hs.year)],expected);assert.equal(f.r.t1,expected[2]);assert.equal(f.r.t2,expected[1]);assert.deepEqual(f.b.events,['idivi:t1:31','idivi:t1:12']);
});
test('Raw DACON day output may alias T1 and change the second dividend',()=>{
  const f=fixture();f.hs.day=1n;f.r.t1=23130n;finish(f.b.date());assert.equal(f.m.read(f.hs.month),6n);assert.equal(f.m.read(f.hs.year),-36n);assert.equal(f.r.t1,-36n);
});
test('Raw DACON failed second division leaves day stored and old month/year',()=>{
  const f=fixture();f.r.t1=23130n;f.m.write(f.hs.month,88n);f.m.write(f.hs.year,99n);const divide=f.b.io.idivi;f.b.io.idivi=function*(reg,n){if(n===12n)throw new Error('IDIVI fault');yield*divide(reg,n);};assert.throws(()=>finish(f.b.date()),/IDIVI fault/);assert.equal(f.m.read(f.hs.day),5n);assert.equal(f.m.read(f.hs.month),88n);assert.equal(f.m.read(f.hs.year),99n);assert.equal(f.r.t1,746n);
});
test('Raw DSPSTA reads all twelve SIXBIT letters and reason left half',()=>{
  const f=fixture();row(f.stats.files.stared);f.stats.files.stared[4]=packSixbit('ABCDEF');f.stats.files.stared[5]=packSixbit('GHIJKL');f.stats.files.stared[12]=5n;f.load(f.stats.files.stared);f.display();assert.ok(f.output().includes('*ABCDEFGHIJKL '));
});
test('Raw DSPSTA skips physical gaps, includes tenth row and excludes next table',()=>{
  const f=fixture();for(const i of [13,93,103])row(f.stats.files.stared,i);f.load(f.stats.files.stared);f.display();assert.equal(f.output(),header+wideHeader+'\r\n'+record+'\r\n'+record+'\r\n');
});
test('Raw DSPSTA preserves saved X1-X4, S and P on successful return',()=>{
  const f=fixture(1n);row(f.stats.files.stared);f.load(f.stats.files.stared);f.r.x1=f.hs.stabuf+3n;f.r.x2=77n;f.r.x3=88n;f.r.x4=99n;const before=[f.r.x1,f.r.x2,f.r.x3,f.r.x4,f.r.s,f.r.p];finish(f.b.run('dspsta'));assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4,f.r.s,f.r.p],before);
});
test('Raw DSPSTA pending Ctrl-C returns before SAVE, output or flag clearing',()=>{
  const f=fixture();f.low.write('ccflg',1n);f.r.x1=123n;f.r.x2=456n;const before=[f.r.x1,f.r.x2,f.r.s,f.r.p];finish(f.b.run('dspsta'));assert.deepEqual([f.r.x1,f.r.x2,f.r.s,f.r.p],before);assert.equal(f.low.read('ccflg'),1n);assert.equal(f.output(),'');assert.deepEqual(f.b.events,[]);
});
test('Raw DSPSTA does not check Ctrl-C within the table',()=>{
  const f=fixture();row(f.stats.files.stared);row(f.stats.files.stared,13);f.load(f.stats.files.stared);const osix=f.b.io.osix;f.b.io.osix=function*(){yield*osix();f.low.write('ccflg',-1n);};f.display();assert.equal(f.output(),header+wideHeader+'\r\n'+record+'\r\n'+record+'\r\n');assert.equal(f.low.read('ccflg'),-1n);
});
test('Raw DSPSTA rereads each name word after output changes it',()=>{
  const f=fixture();row(f.stats.files.stared);f.load(f.stats.files.stared);let n=0;const osix=f.b.io.osix;f.b.io.osix=function*(){yield*osix();if(++n===1)f.file.write('stabuf',packSixbit('JONES '),5);};f.display();assert.ok(f.output().includes('ALICE JONES '));
});
test('Raw DSPSTA retains the marker selected before output changes the reason',()=>{
  const f=fixture();row(f.stats.files.stared);f.load(f.stats.files.stared);const ochr=f.b.io.ochr;let n=0;f.b.io.ochr=function*(){if(++n===1)f.file.write('stabuf',0n,12);yield*ochr();};f.display();assert.ok(f.output().includes(record));assert.equal(f.file.read('stabuf',12),0n);
});
test('Raw DSPSTA row width rereads argument after credits and can differ from header',()=>{
  const f=fixture();row(f.stats.files.stared);f.load(f.stats.files.stared);const decimal=f.b.io.odec;f.b.io.odec=function*(){yield*decimal();f.m.write(f.b.argument,1n);};f.display();assert.equal(f.output(),header+wideHeader+'\r\n'+record+wideTail+'\r\n');
});
test('Raw DSPSTA copies TERWID into T1 before resolving the row argument',()=>{
  const f=fixture(1n,80n);row(f.stats.files.stared);f.load(f.stats.files.stared);const address=f.cpu.argumentAddress;let count=0;f.cpu.argumentAddress=a=>{if(a===f.b.header+1n&&++count===2){f.low.write('terwid',0n);f.m.write(f.b.argument,0n);}return address(a);};f.display();assert.equal(count,2);assert.equal(f.output(),header+'\r\n'+record+wideTail+'\r\n');
});
test('Raw DSPSTA argument changes to a new descriptor remain visible after header',()=>{
  const f=fixture();row(f.stats.files.stared);f.load(f.stats.files.stared);const crlf=f.b.io.crlf;let n=0;f.b.io.crlf=function*(){yield*crlf();if(++n===1){f.m.write(39520n,1n);loadArgumentBlock(f.m,39500n,[39520n]);selectArgumentBlock(f.r,39500n);}};f.display();assert.equal(f.output(),header+wideHeader+'\r\n'+record+wideTail+'\r\n');assert.equal(f.r.arg,39501n);
});
test('Raw DSPSTA date storage is live between individual two-digit calls',()=>{
  const f=fixture(1n);row(f.stats.files.stared);f.load(f.stats.files.stared);const digits=f.b.io.o2dg;let n=0;f.b.io.o2dg=function*(){yield*digits();if(++n===1)f.m.write(f.hs.month,12n);if(n===2)f.m.write(f.hs.year,7n);};f.display();assert.ok(f.output().endsWith('05/12/07\r\n'));
});
test('Raw DSPSTA current X4 changes after marker output and redirects remaining fields',()=>{
  const f=fixture();row(f.stats.files.stared);row(f.stats.files.stared,13);f.stats.files.stared[14]=packSixbit('BOB   ');f.load(f.stats.files.stared);const output=f.b.io.ochr;let n=0;f.b.io.ochr=function*(){yield*output();if(++n===1)f.r.x4+=10n;};f.display();assert.ok(f.output().includes(' BOB   SMITH '));assert.ok(!f.output().includes('ALICE'));
});
test('Raw DSPSTA failed header leaves real SAVE words and pending return address',()=>{
  const f=fixture(),s=f.r.s,p=f.r.p;f.r.x1=f.hs.stabuf+3n;f.r.x2=77n;f.r.x3=88n;f.r.x4=99n;f.b.io.ostr=function*(){throw new Error('OSTR fault');};assert.throws(()=>finish(f.b.run('dspsta')),/OSTR fault/);assert.equal(rightHalf(f.r.s),rightHalf(s)+4n);assert.equal(rightHalf(f.r.p),rightHalf(p)+1n);assert.deepEqual([1n,2n,3n,4n].map(i=>f.m.read(rightHalf(s)+i)),[f.hs.stabuf+3n,77n,88n,99n]);assert.ok(!f.b.events.includes('flush'));
});
test('Raw DSPSTA division wait exposes partial terminal bytes and register pair',()=>{
  const f=fixture();row(f.stats.files.stared);f.load(f.stats.files.stared);const divide=f.b.io.idivi;f.b.io.idivi=function*(reg,n){if(n===1000n)yield 'divide';yield*divide(reg,n);};f.r.x1=f.hs.stabuf+3n;const g=f.b.run('dspsta');assert.equal(g.next().value,'divide');assert.equal(f.r.x1,1000n);assert.ok(f.output().endsWith('123-4567 '));finish(g);assert.ok(f.output().endsWith(record+'\r\n'));
});
test('Raw DSPSTA still computes and restores when HUNGUP suppresses selected terminal output',()=>{
  const f=fixture(1n);row(f.stats.files.stared);f.load(f.stats.files.stared);f.low.write('hungup',-1n);f.display();assert.equal(f.output(),'');assert.ok(f.b.events.includes('o2dg:26'));assert.ok(!f.b.events.includes('flush'));assert.equal(f.m.read(f.hs.year),26n);
});
test('Raw DSPSTA wide-header literal continuation remains required',()=>{const f=fixture();f.b.io.continuation=function*(site){throw new Error(site+' unresolved');};assert.throws(()=>f.display(),/wide-header unresolved/);assert.equal(f.output(),header+wideHeader);});
test('Raw SHOSTA single-table bytes compose file input and formatter bookkeeping',()=>{
  const f=fixture();row(f.stats.files.stared);f.show();assert.equal(f.output(),T[0].text+T[2].text+header+wideHeader+'\r\n'+record+'\r\n');assert.equal(f.low.read('hcpos'),0n);assert.equal(f.low.read('blank'),0n);assert.equal(f.b.events.filter(e=>e==='flush').length,2);assert.ok(!f.stats.events.includes('lock'));
});
test('Raw SHOSTA only checks table heads when deciding whether to print headings',()=>{const f=fixture();row(f.stats.files.stared,13);f.show();assert.equal(f.output(),'');assert.deepEqual(f.stats.events.filter(e=>!e.startsWith('filop:')),['open:stared','input:'+f.stats.symbols.staiow,'close']);});
test('Raw SHOSTA no LE.PPN guard or buffer clear precedes INPUT',()=>{
  const f=fixture();f.file.write('stabuf',123n,600);f.stats.opens.stared={success:true,lePpn:0n};f.b.io.inputSTA=function*(d){assert.equal(d,f.hs.staiow);assert.equal(f.file.read('stabuf',600),123n);};f.show();assert.equal(f.file.read('stabuf',600),123n);assert.ok(!f.stats.events.includes('blt'));
});
test('Raw SHOSTA failed OPEN leaves pending Ctrl-C and old buffer',()=>{const f=fixture();f.low.write('ccflg',1n);f.file.write('stabuf',123n,600);f.stats.opens.stared={success:false,lePpn:0n};f.show();assert.equal(f.low.read('ccflg'),1n);assert.equal(f.file.read('stabuf',600),123n);assert.equal(f.output(),'');assert.ok(!f.stats.events.includes('close'));});
for(const empire of [679n,680n,681n])test(`Raw SHOSTA team order for Empire score ${empire}`,()=>{
  const f=fixture();for(const i of [3,103,259,359])row(f.stats.files.stared,i);f.stats.files.stared[265]=empire;f.show();let previous=-1;for(const heading of empire>680n?[4,5,2,3]:[2,3,4,5]){const at=f.output().indexOf(T[heading].text);assert.ok(at>previous);previous=at;}assert.equal(f.b.events.filter(e=>e==='flush').length,5);
});
for(const table of [103,359])test(`Raw SHOSTA memorial-only table ${table} is displayed`,()=>{const f=fixture();row(f.stats.files.stared,table);f.show();assert.ok(f.output().includes(T[table===103?3:5].text));assert.ok(!f.output().includes(T[table===103?2:4].text));assert.ok(f.output().endsWith(record+'\r\n'));});
for(const argument of [-1n,0n,1n])test(`Raw SHOSTA free-user argument ${argument} controls paid continuation`,()=>{
  const f=fixture(argument);f.locks.write('frebie',-1n);row(f.stats.files.stfred);row(f.stats.files.stared);f.show();assert.equal(f.stats.events.filter(e=>e==='open:stared').length,argument===0n?0:1);assert.equal(f.stats.events.filter(e=>e==='open:stfred').length,1);assert.equal(f.output().split('non-paying').length,2);
});
test('Raw SHOPAY entry bypasses FREE initial selection',()=>{const f=fixture();f.locks.write('frebie',-1n);finish(f.b.run('shopay'));assert.ok(f.stats.events.includes('open:stared'));assert.ok(!f.stats.events.includes('open:stfred'));});
test('Raw SHOSTA reads current LE.NAM after output rather than caching OPEN metadata',()=>{
  const f=fixture(1n);f.locks.write('frebie',-1n);row(f.stats.files.stfred);const ostr=f.b.io.ostr;f.b.io.ostr=function*(){const a=f.r.p1;yield*ostr();if(a===f.hs.text[0])f.file.write('le.nam',packSixbit('DECWAR'));};f.show();assert.ok(!f.output().includes('non-paying'));assert.ok(!f.stats.events.includes('open:stared'));
});
test('Raw SHOSTA paid continuation rereads LE.NAM after table output',()=>{
  const f=fixture(1n);f.locks.write('frebie',-1n);row(f.stats.files.stfred);const flush=f.b.io.outputTTY;let n=0;f.b.io.outputTTY=function*(){yield*flush();if(++n===2)f.file.write('le.nam',packSixbit('DECWAR'));};f.show();assert.ok(f.output().includes('non-paying'));assert.ok(!f.stats.events.includes('open:stared'));
});
test('Raw SHOSTA changed pooled comparison literal is read for both label and continuation',()=>{const f=fixture(1n);f.locks.write('frebie',-1n);row(f.stats.files.stfred);f.m.write(f.hs.freeLabelLiteral,packSixbit('OTHER'));f.show();assert.ok(!f.output().includes('non-paying'));assert.ok(!f.stats.events.includes('open:stared'));});
test('Raw SHOSTA allows separate literal addresses for label and continuation comparisons',()=>{
  const f=fixture(1n);f.hs.freeContinueLiteral=39022n;f.m.write(f.hs.freeContinueLiteral,packSixbit('OTHER'));f.locks.write('frebie',-1n);row(f.stats.files.stfred);f.show();assert.ok(f.output().includes('non-paying'));assert.ok(!f.stats.events.includes('open:stared'));
});
test('Raw SHOSTA live FREE change after table display prevents paid continuation',()=>{
  const f=fixture(1n);f.locks.write('frebie',-1n);row(f.stats.files.stfred);const flush=f.b.io.outputTTY;let n=0;f.b.io.outputTTY=function*(){yield*flush();if(++n===2)f.locks.write('frebie',0n);};f.show();assert.ok(!f.stats.events.includes('open:stared'));
});
test('Raw SHOSTA team ordering reads head scores after honor-roll heading output',()=>{
  const f=fixture();row(f.stats.files.stared);row(f.stats.files.stared,259);const out=f.b.io.ostr;f.b.io.ostr=function*(){const a=f.r.p1;yield*out();if(a===f.hs.text[0])f.file.write('stabuf',999n,265);};f.show();assert.ok(f.output().indexOf(T[4].text)<f.output().indexOf(T[2].text));
});
test('Raw DOFED checks memorial head after live-table output changes it',()=>{
  const f=fixture();row(f.stats.files.stared);f.load(f.stats.files.stared);const flush=f.b.io.outputTTY;f.b.io.outputTTY=function*(){yield*flush();f.file.write('stabuf',1n,103);};finish(f.b.run('dofed'));assert.ok(f.output().includes(T[3].text));assert.ok(!f.output().includes(T[0].text));
});
test('Raw DSPSTA uses 18-bit effective addresses while retaining the full saved table pointer',()=>{
  const f=fixture();row(f.stats.files.stared);f.load(f.stats.files.stared);const pointer=signed36(halfWords(0o123456n,f.hs.stabuf+3n));f.r.x1=pointer;finish(f.b.run('dspsta'));assert.equal(f.r.x1,pointer);assert.ok(f.output().endsWith(record+'\r\n'));
});
test('Raw DSPSTA does not clamp X3 when a service changes the source loop counter',()=>{
  const f=fixture();row(f.stats.files.stared);row(f.stats.files.stared,13);f.load(f.stats.files.stared);const crlf=f.b.io.crlf;let n=0;f.b.io.crlf=function*(){yield*crlf();if(++n===2)f.r.x3=10n;};f.display();assert.equal(f.output(),header+wideHeader+'\r\n'+record+'\r\n');
});
test('Raw DSPSTA suspends after restoring X1-X4 before the final monitor flush',()=>{
  const f=fixture(),s=f.r.s;f.r.x1=f.hs.stabuf+3n;f.r.x2=77n;f.r.x3=88n;f.r.x4=99n;f.b.io.outputTTY=function*(){yield 'flush';};const g=f.b.run('dspsta');assert.equal(g.next().value,'flush');assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4,f.r.s],[f.hs.stabuf+3n,77n,88n,99n,s]);finish(g);
});
test('Raw SHOSTA Ctrl-C skips memorials, still calls other side and clears before continuation',()=>{
  const f=fixture(1n);f.locks.write('frebie',-1n);for(const i of [3,103,259,359])row(f.stats.files.stfred,i);const flush=f.b.io.outputTTY;let n=0;f.b.io.outputTTY=function*(){yield*flush();if(++n===2)f.low.write('ccflg',-1n);};f.show();assert.ok(f.output().includes(T[2].text));assert.ok(f.output().includes(T[4].text));assert.ok(!f.output().includes(T[3].text));assert.ok(!f.output().includes(T[5].text));assert.equal(f.output().split(header).length,2);assert.equal(f.low.read('ccflg'),0n);assert.ok(!f.stats.events.includes('open:stared'));
});
test('Raw SHOSTA pending Ctrl-C still calls headings but no row renderer work',()=>{
  const f=fixture();row(f.stats.files.stared);f.low.write('ccflg',-1n);f.show();assert.equal(f.output(),T[0].text+T[2].text);assert.equal(f.low.read('ccflg'),0n);assert.ok(!f.b.events.includes('osix'));
});
test('Raw SHOSTA zero heads still clears pending Ctrl-C without argument or filename reads',()=>{const f=fixture();f.low.write('ccflg',-1n);f.cpu.argumentAddress=()=>{throw new Error('unexpected argument');};f.show();assert.equal(f.low.read('ccflg'),0n);assert.equal(f.output(),'');});
test('Raw SHOSTA second OPEN failure preserves first output and current buffer',()=>{
  const f=fixture(1n);f.locks.write('frebie',-1n);row(f.stats.files.stfred);f.stats.opens.stared={success:false,lePpn:0n};f.show();assert.ok(f.output().includes('non-paying'));assert.equal(f.file.read('stabuf',3),halfWords(0o123n,0o4567n));assert.equal(f.stats.events.filter(e=>e==='close').length,1);
});
test('Raw SHOSTA failed INPUT does not close, render or clear Ctrl-C',()=>{
  const f=fixture();f.low.write('ccflg',1n);f.b.io.inputSTA=function*(){f.file.write('stabuf',98n,0);throw new Error('INPUT fault');};assert.throws(f.show,/INPUT fault/);assert.equal(f.file.read('stabuf',0),98n);assert.equal(f.low.read('ccflg'),1n);assert.ok(!f.stats.events.includes('close'));assert.equal(f.output(),'');
});
test('Raw SHOSTA nonpay literal continuation can fail after its emitted label',()=>{
  const f=fixture(1n);f.locks.write('frebie',-1n);row(f.stats.files.stfred);f.b.io.continuation=function*(site){throw new Error(site+' unresolved');};assert.throws(f.show,/nonpay-label unresolved/);assert.equal(f.output(),T[0].text+T[1].text);
});
test('Raw UPDSTA file is rendered by SHOSTA with original packed names, date, reason and score',()=>{
  const f=fixture(1n),values=[halfWords(0o123n,0o4567n),packSixbit('ALICE '),packSixbit('SMITH '),packAscii('Lexin'),packAscii('gton '),680n,90000n,0n,0n,1n];values.forEach((w,i)=>f.m.write(f.stats.actuals[i],w));f.stats.date.value=23130n;finish(f.stats.run('updsta'));for(let i=0;i<640;i++)f.file.write('stabuf',0n,i);const before=f.text().length;f.show();assert.ok(f.text().slice(before).endsWith('*'+record.slice(1)+wideTail+'\r\n'));assert.equal(f.stats.writes.length,1);
});
test('Statement PREGAM HONORROLL composes raw JOBSTA, GTKN, SHOSTA and file output',()=>{
  const f=pregameRuntimeFixture(['HONORROLL','']);row(f.statistics.files.stfred);driveInitial(f);assert.ok(f.pregame.events.includes('shosta'));assert.ok(f.statistics.events.includes('open:stfred'));assert.ok(f.honorRoll.events.includes('dofed'));assert.ok(f.text().includes('ALICE SMITH'));assert.equal(f.m.read(f.honorRoll.argument),-1n);
});
