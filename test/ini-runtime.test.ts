import test from 'node:test';
import assert from 'node:assert/strict';
import { moveRuntimeFixture } from './fixtures/move-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,rightHalf,signed36,MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';
function fixture(text='A'){const f=moveRuntimeFixture();f.ini.install();f.ini.load(text);return f;}
const count=(f:ReturnType<typeof fixture>)=>f.m.read(f.ini.symbols.buffer+2n);

test('Raw ICHR.B reads packed bytes and consumes NULs with count/pointer updates',()=>{
  const f=fixture('\0\0AB');finish(f.ini.buffered());assert.equal(f.r.c,65n);assert.equal(count(f),1n);finish(f.ini.buffered());assert.equal(f.r.c,66n);assert.equal(count(f),0n);assert.deepEqual(f.ini.events.filter(e=>e.startsWith('byte')),['byte:0','byte:0','byte:65','byte:66']);
});
test('Raw ICHR.B count underflow refills and rechecks actual buffer state',()=>{
  const f=fixture('');f.ini.refills.push({text:'X'});finish(f.ini.buffered());assert.equal(f.r.c,88n);assert.equal(count(f),0n);assert.equal(f.ini.events.filter(e=>e.startsWith('in:')).length,1);
});
test('Raw ICHR.B empty successful refill tries IN again before a later byte',()=>{
  const f=fixture('');f.ini.refills.push({text:''},{text:'Y'});finish(f.ini.buffered());assert.equal(f.r.c,89n);assert.equal(f.ini.events.filter(e=>e.startsWith('in:')).length,2);
});
test('Raw ICHR.B any IN skip produces EOF and retains decremented count',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});finish(f.ini.buffered());assert.equal(f.r.c,-1n);assert.equal(count(f),-1n);
});
test('Raw ICHR.B awaits count resolution before reading its live value',()=>{
  const f=fixture('AB'),address=f.ini.bufferedIO.indirectAddress;let first=true;f.ini.bufferedIO.indirectAddress=function*(a){if(first){first=false;yield 'count';}return yield*address(a);};const g=f.ini.buffered();assert.equal(g.next().value,'count');assert.equal(count(f),2n);f.m.write(f.ini.symbols.buffer+2n,1n);finish(g);assert.equal(f.r.c,65n);assert.equal(count(f),0n);
});
test('Raw ICHR.B pointer resolution can change after count decrement',()=>{
  const f=fixture('A'),address=f.ini.bufferedIO.indirectAddress;f.m.write(18300n,signed36(halfWords(0o440700n,18310n)));f.m.write(18310n,66n<<29n);
  f.ini.bufferedIO.indirectAddress=function*(a){if(a===f.ini.block.address('ibfptr'))yield 'pointer';return yield*address(a);};const g=f.ini.buffered();assert.equal(g.next().value,'pointer');assert.equal(count(f),0n);f.ini.block.write('ibfptr',18300n);finish(g);assert.equal(f.r.c,66n);
});
test('Raw ICHR.B awaits ILDB and reads current C on return',()=>{
  const f=fixture('A'),ildb=f.ini.bufferedIO.ildb;f.ini.bufferedIO.ildb=function*(a){yield*ildb(a);yield 'byte';};const g=f.ini.buffered();assert.equal(g.next().value,'byte');assert.equal(f.r.c,65n);f.r.c=99n;finish(g);assert.equal(f.r.c,99n);
});
test('Raw ICHR.B ILDB failure retains count and earlier character register',()=>{
  const f=fixture('A');f.r.c=77n;f.ini.bufferedIO.ildb=function*(){throw new Error('ILDB fault');};assert.throws(()=>finish(f.ini.buffered()),/ILDB fault/);assert.equal(count(f),0n);assert.equal(f.r.c,77n);
});
test('Raw ICHR.B IN failure retains underflow and previous C',()=>{
  const f=fixture('');f.r.c=77n;f.ini.bufferedIO.executeInput=function*(){throw new Error('IN fault');};assert.throws(()=>finish(f.ini.buffered()),/IN fault/);assert.equal(count(f),-1n);assert.equal(f.r.c,77n);
});
test('Raw ICHR.B signed count decrement wraps MIN_INTEGER before deciding whether to refill',()=>{
  const f=fixture('A');f.m.write(f.ini.symbols.buffer+2n,MIN_INTEGER);finish(f.ini.buffered());assert.equal(count(f),MAX_INTEGER);assert.equal(f.r.c,65n);assert.ok(!f.ini.events.some(e=>e.startsWith('in:')));
});
for(const char of ['A','\x07'])for(const echo of [-1n,0n,1n])test(`Raw IICH character ${JSON.stringify(char)} echo flag ${echo}`,()=>{
  const f=fixture(char);f.ini.state.echflg=echo;f.r.x1=77n;f.r.p1=88n;finish(f.ini.run());assert.equal(f.r.c,BigInt(char.charCodeAt(0)));assert.equal(f.text(),char!=='\x07'&&echo>=0n?char:'');assert.equal(f.ini.state.iniflg,-1n);assert.deepEqual([f.r.x1,f.r.p1],[77n,88n]);assert.ok(!f.ini.events.includes('close'));
});
test('Raw IICH positive CCFLG does not cancel a file character',()=>{
  const f=fixture('A');f.ini.state.ccflg=1n;finish(f.ini.run());assert.equal(f.r.c,65n);assert.equal(f.ini.state.ccflg,1n);assert.equal(f.text(),'A');
});
test('Raw IICH OCHR suspension happens before returning the live character',()=>{
  const f=fixture('A'),ochr=f.ini.io.ochr;f.ini.io.ochr=function*(){yield*ochr();yield 'echo';};const g=f.ini.run();assert.equal(g.next().value,'echo');assert.equal(f.text(),'A');f.r.c=66n;finish(g);assert.equal(f.r.c,66n);assert.equal(count(f),0n);
});
test('Raw IICH negative Ctrl-C clears before saves and close, then reads terminal input',()=>{
  const f=fixture('A');f.ini.state.ccflg=-1n;f.editor.feed('Z');f.r.x1=77n;f.r.p1=88n;const close=f.ini.closeIO.executeClose;f.ini.closeIO.executeClose=function*(){yield 'close';yield*close();};const stack=f.r.s,g=f.ini.run();assert.equal(g.next().value,'close');assert.equal(f.ini.state.ccflg,0n);assert.equal(f.ini.state.iniflg,-1n);assert.notEqual(f.r.s,stack);finish(g);assert.deepEqual([f.r.c,f.r.x1,f.r.p1,f.r.s],[90n,77n,88n,stack]);assert.equal(f.ini.state.iniflg,0n);assert.equal(f.ini.state.blank,-1n);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);assert.equal(f.text(),'');
});
test('Raw IICH EOF preserves negative Ctrl-C until terminal dispatch handles it',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});f.ini.state.ccflg=-1n;finish(f.ini.run());assert.equal(f.r.c,10n);assert.equal(f.ini.state.ccflg,-1n);assert.ok(f.editor.events.includes('clrbfi'));
});
test('Raw IICH EOF close/TTYON/DMPBUF/SETI/restore/dispatch follow source order',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});f.editor.feed('Z');f.r.x1=77n;f.r.p1=88n;finish(f.ini.run());assert.deepEqual(f.ini.events.filter(e=>!e.startsWith('address:')&&!e.startsWith('in:')),['save:77','save:88','close','ttyon','output','skpinl','dmpbuf','output','seti','restore','restore','dispatch']);assert.equal(f.r.c,90n);assert.equal(rightHalf(f.ini.block.read('ibflb')),f.ini.symbols.ttyFile);
});
test('Raw IICH save failure leaves the first frame word without closing or clearing INIFLG',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});f.r.x1=77n;const push=f.ini.io.pushData;let n=0;f.ini.io.pushData=function*(w){if(++n===2)throw new Error('save fault');yield*push(w);};assert.throws(()=>finish(f.ini.run()),/save fault/);assert.equal(f.m.read(rightHalf(f.r.s)),77n);assert.equal(f.ini.state.iniflg,-1n);assert.ok(!f.ini.events.includes('close'));
});
test('Raw IICH CLOSE failure leaves saved frames, EOF C and INI selection',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});f.ini.closeIO.executeClose=function*(){throw new Error('close fault');};const stack=f.r.s;assert.throws(()=>finish(f.ini.run()),/close fault/);assert.notEqual(f.r.s,stack);assert.equal(f.r.c,-1n);assert.equal(f.ini.state.iniflg,-1n);assert.equal(f.ini.block.read('ic'),f.ini.symbols.iniTarget);
});
test('Raw IICH waits through CLOSE core release before terminal selection',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});f.editor.feed('Z');f.file.write('fl.ff',6000n);f.job.jbrel=7500n;const core=f.ini.closeIO.core;f.ini.closeIO.core=function*(v){yield 'core';return yield*core(v);};const g=f.ini.run();assert.equal(g.next().value,'core');assert.equal(f.file.read('fl.ff'),0n);assert.equal(f.job.jbff,6000n);assert.equal(f.ini.state.iniflg,-1n);assert.ok(!f.ini.events.includes('seti'));finish(g);assert.equal(f.r.c,90n);
});
test('Raw IICH SETI failure retains input flags and saved frames after prior close/output',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});f.ini.io.setInput=function*(){throw new Error('seti fault');};f.ini.state.blank=33n;assert.throws(()=>finish(f.ini.run()),/seti fault/);assert.equal(f.ini.state.iniflg,-1n);assert.equal(f.ini.state.blank,33n);assert.equal(f.r.x1,f.ini.symbols.ttyFile);assert.ok(f.ini.events.includes('close'));assert.ok(!f.ini.events.includes('restore'));
});
test('Raw IICH restore sees changed saved P1 and X1 after SETI',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});f.editor.feed('Z');const seti=f.ini.io.setInput;f.ini.io.setInput=function*(){yield*seti();yield 'selected';};const g=f.ini.run();assert.equal(g.next().value,'selected');f.m.write(rightHalf(f.r.s),333n);f.m.write(rightHalf(f.r.s)-1n,444n);finish(g);assert.equal(f.r.p1,333n);assert.equal(f.r.x1,444n);
});
test('Raw IICH INIFLG and BLANK are set before a failed restore',()=>{
  const f=fixture('');f.ini.refills.push({eof:true});f.ini.io.popData=function*(){throw new Error('restore fault');};assert.throws(()=>finish(f.ini.run()),/restore fault/);assert.equal(f.ini.state.iniflg,0n);assert.equal(f.ini.state.blank,-1n);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);assert.ok(!f.ini.events.includes('dispatch'));
});
for(const entry of ['ttyon','dmpbuf'] as const)test(`Raw ${entry} waits for OUTPUT and honors hangup before later monitor operations`,()=>{
  const f=fixture(),output=f.ini.controlIO.output;f.ini.controlIO.output=function*(){yield 'output';yield*output();};const g=f.ini.control(entry);assert.equal(g.next().value,'output');f.ini.state.hungup=-1n;finish(g);assert.ok(!f.ini.events.includes('skpinl'));
});
test('Raw TTYON rereads HUNGUP after skipped initial OUTPUT',()=>{
  const f=fixture();let reads=0;const state={get hungup(){return ++reads===1?-1n:0n;}};
  // The raw routine owns the two separate guards even when an interrupt changes the word between reads.
  return import('../src/compat/character-input-runtime.ts').then(({terminalControl})=>{finish(terminalControl('ttyon',state,f.ini.controlIO));assert.deepEqual(f.ini.events,['skpinl']);});
});
test('Raw IICH echoed character is not rechecked for cancellation after output',()=>{
  const f=fixture('A'),ochr=f.ini.io.ochr;f.ini.io.ochr=function*(){yield*ochr();f.ini.state.ccflg=-1n;};finish(f.ini.run());assert.equal(f.r.c,65n);assert.equal(f.ini.state.ccflg,-1n);assert.equal(f.ini.state.iniflg,-1n);assert.ok(!f.ini.events.includes('close'));
});
test('MOVE prompts can consume a complete INI line through buffered I/O and raw editing',()=>{
  const f=moveRuntimeFixture('MOVE');f.ini.install();f.ini.load('12 20\n');assert.equal(finish(f.run()).alternateReturn,false);assert.deepEqual([f.ship.v,f.ship.h],[12,20]);assert.equal(f.ini.state.iniflg,-1n);assert.equal(f.editor.events.filter(e=>e==='inchwl').length,0);assert.ok(f.text().includes('12 20'));
});
test('MOVE INI EOF switches to terminal in the middle of the same edited coordinate line',()=>{
  const f=moveRuntimeFixture('MOVE');f.ini.install();f.ini.load('12 ');f.ini.refills.push({eof:true});f.editor.feed('20\n');assert.equal(finish(f.run()).alternateReturn,false);assert.equal(f.input.rawLine,'12 20');assert.deepEqual([f.ship.v,f.ship.h],[12,20]);assert.equal(f.ini.state.iniflg,0n);assert.ok(f.ini.events.includes('close'));assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);
});
test('MOVE INI read failure preserves original movement deadline and unmodified ship',()=>{
  const f=moveRuntimeFixture('MOVE');f.ini.install();f.ini.load('');f.ini.bufferedIO.executeInput=function*(){throw new Error('read fault');};assert.throws(()=>finish(f.run()),/read fault/);assert.equal(f.m.read(f.locals.v),3100n);assert.equal(f.ship.docked,true);assert.equal(f.ship.energy,10000n);assert.equal(f.low.read('ptime'),99n);
});
