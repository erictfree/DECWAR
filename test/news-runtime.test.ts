import test from 'node:test';
import assert from 'node:assert/strict';
import { newsRuntimeFixture } from './fixtures/news-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,rightHalf,signed36,packAscii } from '../src/compat/word36.ts';
import { newsText } from '../src/generated/source-data.ts';
// Expected bytes exclude terminal monitor echo, which this fixture does not emulate.
const saved=(f:ReturnType<typeof newsRuntimeFixture>)=>[f.r.x1,f.r.x2,f.r.x3,f.r.s];

test('Raw NEWS composes OPEN, buffered bytes, OCHR, CLOSE and input restoration',()=>{
  const f=newsRuntimeFixture('Hi\r\n');f.r.x1=77n;f.r.x2=88n;f.r.x3=99n;const before=saved(f);finish(f.news.run());
  assert.equal(f.text(),'Hi\r\n');assert.deepEqual(saved(f),before);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);assert.equal(f.ini.block.read('ibflb'),f.ini.symbols.ttyFile);assert.ok(f.news.events.includes('filop'));assert.ok(f.news.events.includes('close'));
});
test('Raw NEWS NUL skipping comes from ICHR.B while CR is output literally',()=>{
  const f=newsRuntimeFixture('A\0B\rC');finish(f.news.run());assert.equal(f.text(),'AB\rC');assert.equal(f.news.events.filter(e=>e==='ochr:0').length,0);
});
test('Raw NEWS a dot at file start or after CR does not page',()=>{
  const f=newsRuntimeFixture('.A\r.B');finish(f.news.run());assert.equal(f.text(),'.A\r.B');assert.ok(!f.news.events.includes('gtkn'));
});
for(const eol of ['\n','\v','\f'])test(`Raw NEWS ${JSON.stringify(eol)} dot pages through raw GTKN and EQUAL YES abbreviation`,()=>{
  const f=newsRuntimeFixture('A'+eol+'.B');f.editor.feed('Y\n');finish(f.news.run());assert.equal(f.text(),'A'+eol+newsText[1].text+'\rB');assert.equal(f.news.events.filter(e=>e==='gtkn').length,1);assert.deepEqual(f.news.events.filter(e=>e.startsWith('seti:')),[`seti:${f.news.symbols.nwsfil}`,`seti:${f.ini.symbols.ttyFile}`,`seti:${f.news.symbols.nwsfil}`,`seti:${f.ini.symbols.ttyFile}`]);
});
test('Raw NEWS negative page answer restores the file before EQUAL and CLOSE',()=>{
  const f=newsRuntimeFixture('A\n.HIDDEN');f.editor.feed('NO\n');finish(f.news.run());assert.equal(f.text(),'A\n'+newsText[1].text+'\r');assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);const e=f.news.events;assert.ok(e.indexOf('equal')>e.indexOf('gtkn'));assert.ok(e.indexOf('close')>e.indexOf('equal'));
});
test('Raw NEWS page continuation can consume a slash tail without another terminal read',()=>{
  const f=newsRuntimeFixture('A\n.B\n.C');f.editor.feed('YES/NO\n');finish(f.news.run());assert.equal(f.news.events.filter(e=>e==='gtkn').length,2);assert.equal(f.editor.events.filter(e=>e==='inchwl').length,7);assert.ok(!f.text().endsWith('C'));assert.equal(f.input.tokens[0].text,'NO');
});
for(const alive of [-1n,0n,1n])test(`Raw NEWS line ending resets ACTIVE only for negative ALIVE ${alive}`,()=>{
  const f=newsRuntimeFixture('A\n');f.high.write('alive',alive,1);f.high.write('active',55n,1);finish(f.news.run());assert.equal(f.high.read('active',1),alive<0n?0n:55n);
});
test('Raw NEWS WHO zero bypasses player arrays and leaves T1 zero',()=>{
  const f=newsRuntimeFixture('\n');f.low.write('who',0n);f.high.write('active',55n,1);const close=f.news.io.close;f.news.io.close=function*(){assert.equal(f.r.t1,0n);yield*close();};finish(f.news.run());assert.equal(f.high.read('active',1),55n);
});
test('Raw NEWS WHO index uses its right half while retaining full T1',()=>{
  const f=newsRuntimeFixture('\n');f.low.write('who',signed36(halfWords(7n,1n)));f.high.write('active',55n,1);finish(f.news.run());assert.equal(f.high.read('active',1),0n);
});
test('Raw NEWS output yields before classifying the live C and reading Ctrl-C',()=>{
  const f=newsRuntimeFixture('AHIDDEN'),ochr=f.news.io.ochr;f.news.io.ochr=function*(){yield*ochr();yield 'output';};const g=f.news.run();assert.equal(g.next().value,'output');assert.equal(f.text(),'A');f.r.c=10n;f.ini.state.ccflg=-1n;finish(g);assert.equal(f.text(),'A');assert.equal(f.ini.state.ccflg,0n);
});
test('Raw NEWS changing an output LF to ordinary C skips cancellation until later EOL',()=>{
  const f=newsRuntimeFixture('\nB\nHIDDEN'),ochr=f.news.io.ochr;let first=true;f.news.io.ochr=function*(){yield*ochr();if(first){first=false;f.r.c=65n;f.ini.state.ccflg=-1n;}};finish(f.news.run());assert.equal(f.text(),'\nB\n');assert.equal(f.ini.state.ccflg,0n);
});
test('Raw NEWS current X3 after ICHR controls paging rather than an earlier host boolean',()=>{
  const f=newsRuntimeFixture('.HIDDEN'),ichr=f.news.io.ichr;f.editor.feed('NO\n');let first=true;f.news.io.ichr=function*(){yield*ichr();if(first){first=false;f.r.x3=-1n;}};finish(f.news.run());assert.equal(f.text(),newsText[1].text+'\r');
});
test('Raw NEWS OPEN failure warns directly and restores S saves without clearing CCFLG',()=>{
  const f=newsRuntimeFixture();f.ini.state.ccflg=-1n;f.m.write(f.news.symbols.jbren,signed36(halfWords(-1n,123n)));f.news.openIO.filop=function*(){return false;};f.r.x1=77n;f.r.x2=88n;f.r.x3=99n;const before=saved(f);finish(f.news.run());assert.equal(f.text(),newsText[0].text);assert.equal(f.m.read(f.news.symbols.jbren),123n);assert.equal(f.ini.state.ccflg,-1n);assert.deepEqual(saved(f),before);assert.ok(!f.news.events.includes('close'));assert.ok(!f.news.events.some(e=>e.startsWith('seti:')));
});
test('Raw NEWS warning rechecks hangup after OUTPUT yields',()=>{
  const f=newsRuntimeFixture();f.news.io.open=function*(){return false;};f.news.io.output=function*(){yield 'output';};const g=f.news.run();assert.equal(g.next().value,'output');f.ini.state.hungup=-1n;finish(g);assert.equal(f.text(),'');assert.ok(!f.news.events.includes('warning'));
});
test('Raw NEWS normal EOF clears flags before a failed CLOSE but retains input and saved frames',()=>{
  const f=newsRuntimeFixture('');f.ini.state.ccflg=-1n;f.news.io.close=function*(){throw new Error('close fault');};const stack=f.r.s;assert.throws(()=>finish(f.news.run()),/close fault/);assert.equal(f.ini.state.ccflg,0n);assert.equal(f.ini.block.read('ibflb'),f.news.symbols.nwsfil);assert.notEqual(f.r.s,stack);assert.ok(!f.news.events.includes('restore'));
});
test('Raw NEWS OPEN exception leaves entry saves and the already-cleared JBREN half',()=>{
  const f=newsRuntimeFixture();f.m.write(f.news.symbols.jbren,signed36(halfWords(-1n,123n)));f.news.io.open=function*(){throw new Error('open fault');};const stack=f.r.s;assert.throws(()=>finish(f.news.run()),/open fault/);assert.equal(f.m.read(f.news.symbols.jbren),123n);assert.notEqual(f.r.s,stack);assert.equal(f.r.x1,f.news.symbols.nwsfil);
});
test('Raw NEWS failed third SAVE precedes JBREN and descriptor changes',()=>{
  const f=newsRuntimeFixture();f.m.write(f.news.symbols.jbren,-1n);f.r.x1=77n;const push=f.news.io.pushData;let n=0;f.news.io.pushData=function*(w){if(++n===3)throw new Error('save fault');yield*push(w);};assert.throws(()=>finish(f.news.run()),/save fault/);assert.equal(f.m.read(f.news.symbols.jbren),-1n);assert.equal(f.r.x1,77n);assert.ok(!f.news.events.includes('open'));
});
test('Raw NEWS paused final selection restores current saved words rather than snapshots',()=>{
  const f=newsRuntimeFixture(''),seti=f.news.io.setInput;let n=0;f.news.io.setInput=function*(){yield*seti();if(++n===2)yield 'selected';};const g=f.news.run();assert.equal(g.next().value,'selected');const top=rightHalf(f.r.s);f.m.write(top,303n);f.m.write(top-1n,202n);f.m.write(top-2n,101n);finish(g);assert.deepEqual([f.r.x1,f.r.x2,f.r.x3],[101n,202n,303n]);
});
test('Raw NEWS failed page GTKN keeps terminal selection and preserves pre-cleanup flags',()=>{
  const f=newsRuntimeFixture('\n.');f.news.io.gtkn=function*(){f.ini.state.ccflg=-1n;throw new Error('gtkn fault');};assert.throws(()=>finish(f.news.run()),/gtkn fault/);assert.equal(f.ini.block.read('ibflb'),f.ini.symbols.ttyFile);assert.equal(f.ini.state.ccflg,-1n);assert.ok(!f.news.events.includes('close'));
});
test('Raw NEWS EQUAL suspension observes current T0 on return',()=>{
  const f=newsRuntimeFixture('\n.HIDDEN'),equal=f.news.io.equal;f.editor.feed('YES\n');f.news.io.equal=function*(){yield*equal();yield 'equal';};const g=f.news.run();assert.equal(g.next().value,'equal');assert.ok(f.r.t0<0n);f.r.t0=0n;finish(g);assert.ok(!f.text().endsWith('HIDDEN'));
});
test('Raw NEWS JBREN interrupt at a line ending clears only the left half',()=>{
  const f=newsRuntimeFixture('A\nHIDDEN'),ochr=f.news.io.ochr;f.news.io.ochr=function*(){yield*ochr();if(f.r.c===10n)f.m.write(f.news.symbols.jbren,signed36(halfWords(-1n,321n)));};finish(f.news.run());assert.equal(f.text(),'A\n');assert.equal(f.m.read(f.news.symbols.jbren),321n);
});
test('Raw NEWS raw EQUAL reads changed YES literal after GTKN',()=>{
  const f=newsRuntimeFixture('\n.HIDDEN'),gtkn=f.news.io.gtkn;f.editor.feed('YES\n');f.news.io.gtkn=function*(){yield*gtkn();f.m.write(f.news.symbols.yes,packAscii('NO'));};finish(f.news.run());assert.ok(!f.text().endsWith('HIDDEN'));
});

test('Raw NEWS hangup while awaiting a page answer returns through raw GTKN and cleanup',()=>{
  const f=newsRuntimeFixture('\n.HIDDEN'),g=f.news.run();assert.equal(g.next().value,'input');assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);f.ini.state.hungup=-1n;finish(g);assert.equal(f.input.tokens[0].text,'QUIT');assert.ok(!f.text().endsWith('HIDDEN'));assert.equal(f.ini.block.read('ibflb'),f.ini.symbols.ttyFile);assert.ok(f.news.events.includes('close'));
});
test('Raw NEWS page reply preserves P1/P2 clobbers while restoring X1/X2/X3',()=>{
  const f=newsRuntimeFixture('\n.');f.editor.feed('NO\n');f.r.x1=101n;f.r.x2=202n;f.r.x3=303n;f.r.p1=404n;f.r.p2=505n;finish(f.news.run());assert.deepEqual([f.r.x1,f.r.x2,f.r.x3],[101n,202n,303n]);assert.deepEqual([f.r.p1,f.r.p2],[f.news.symbols.token,f.news.symbols.yes]);
});
test('Raw NEWS restore fault follows successful close and original input restoration',()=>{
  const f=newsRuntimeFixture('');f.news.io.popData=function*(){throw new Error('restore fault');};assert.throws(()=>finish(f.news.run()),/restore fault/);assert.ok(f.news.events.includes('close'));assert.equal(f.ini.block.read('ibflb'),f.ini.symbols.ttyFile);
});
test('DECWAR NEWS dispatch composes raw file paging and leaves PTIME unchanged',async()=>{
  const {dispatchCommand}=await import('../src/game/command-loop.ts');const f=newsRuntimeFixture('Hello\n.');f.editor.feed('NO\n');
  const ctx={who:1,player:-1n,ptime:99n,shared:{players:f.views.high.players}};
  finish(dispatchCommand(ctx,12,{
    *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},
    *invoke(call){assert.deepEqual(call,{routine:'news'});yield*f.news.run();},
    *leave(){throw new Error('unexpected leave');},*finishTurn(){throw new Error('NEWS must not repair or finish a timed turn');},movementContinuation(){throw new Error('unexpected movement');},
  }));assert.equal(ctx.ptime,99n);assert.equal(f.text(),'Hello\n'+newsText[1].text+'\r');assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);
});

test('Raw NEWS emits the complete supplied DECWAR.NWS byte-for-byte through multiple packed refills',async()=>{
  const {sourceFile}=await import('../tools/source.ts');const file=sourceFile('DECWAR.NWS'),f=newsRuntimeFixture(file.slice(0,200));
  f.ini.refills.length=0;for(let i=200;i<file.length;i+=200)f.ini.refills.push({text:file.slice(i,i+200)});f.ini.refills.push({eof:true});
  const cell=f.views.high.board.disp(10,20);f.high.write('active',55n,1);finish(f.news.run());assert.equal(f.text(),file);assert.equal(f.views.high.board.disp(10,20),cell);assert.equal(f.high.read('active',1),0n);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);assert.equal(f.ini.events.filter(e=>e.startsWith('in:')).length,Math.ceil(file.length/200));
});
