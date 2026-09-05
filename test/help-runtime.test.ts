import test from 'node:test';
import assert from 'node:assert/strict';
import { helpRuntimeFixture as fixture } from './fixtures/help-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,rightHalf,signed36,packAscii } from '../src/compat/word36.ts';
import { helpText,commands,extraHelpWords } from '../src/generated/source-data.ts';
import { sourceFile } from '../tools/source.ts';
const saved=(f:ReturnType<typeof fixture>)=>[f.r.x2,f.r.x3,f.r.p1,f.r.p2,f.r.s];

test('Raw SHLP composes packed file reads, output, CLOSE and original input restoration',()=>{
  const f=fixture();f.r.x1=99n;f.r.x2=22n;f.r.x3=33n;f.r.p2=44n;const before=saved(f);finish(f.help.run());assert.equal(f.text(),'\r\nBody\n');assert.deepEqual(saved(f),before);assert.equal(f.r.x1,f.help.symbols.hl2fil);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);
});
for(const flag of [-1n,0n,1n])test(`Raw SHLP signed PASFLG ${flag} selects the source file`,()=>{
  const f=fixture();f.low.write('pasflg',flag);finish(f.help.run());assert.deepEqual(f.help.events.filter(e=>e.startsWith('open:')),[`open:${flag<0n?f.help.symbols.hl1fil:f.help.symbols.hl2fil}`]);
});
test('Raw SHLP special OPEN failure tries standard file with current state',()=>{
  const f=fixture();f.low.write('pasflg',-1n);const open=f.help.io.open;f.help.io.open=function*(){if(f.r.x1===f.help.symbols.hl1fil){f.help.events.push('special-failed');return false;}return yield*open();};finish(f.help.run());assert.equal(f.text(),'\r\nBody\n');assert.ok(f.help.events.includes('special-failed'));assert.equal(f.r.x1,f.help.symbols.hl2fil);
});
test('Raw SHLP successful special file without a match does not try standard file',()=>{
  const f=fixture('\n.OTHER\nNothing','Energy');f.low.write('pasflg',-1n);finish(f.help.run());assert.equal(f.text(),"\r\n%Can't find help on Energy\r\n");assert.deepEqual(f.help.events.filter(e=>e.startsWith('open:')),[`open:${f.help.symbols.hl1fil}`]);
});
test('Raw SHLP heading at byte zero is ignored and only LF/FF introduce sections',()=>{
  const f=fixture('.ENERGY\nWrong\r.ENERGY\nWrong again\f.ENERGY\nRight\n.NEXT');finish(f.help.run());assert.equal(f.text(),'\r\nRight\n');
});
test('Raw SHLP folds only the first five matched bytes',()=>{
  const f=fixture('\n.eNeRgDifferent\nBody\n.NEXT','eNERGy');finish(f.help.run());assert.equal(f.text(),'\r\nBody\n');assert.equal(f.help.events.filter(e=>e.startsWith('key:')).length,5);
});
test('Raw SHLP short-keyword lookahead consumes heading LF and skips first body line',()=>{
  const f=fixture('\n.N\nFirst body line\nSecond\n.NEXT','N ');finish(f.help.run());assert.equal(f.text(),'\r\nSecond\n');
});
test('Raw SHLP matched heading without a subsequent boundary reports not found',()=>{
  const f=fixture('\n.ENERGY','Energy');finish(f.help.run());assert.equal(f.text(),"\r\n%Can't find help on Energy\r\n");
});
test('Raw SHLP keyword terminator can consume EOF then retry before reporting not found',()=>{
  const f=fixture('\n.N','N');f.ini.refills.push({eof:true});finish(f.help.run());assert.equal(f.text(),"\r\n%Can't find help on N\r\n");assert.equal(f.help.events.filter(e=>e==='char:-1').length,2);
});
test('Raw SHLP buffered input removes NUL, prints CR/VT, and suppresses FF',()=>{
  const f=fixture('\n.ENERGY\nA\0B\rC\vD\fE\n.NEXT');finish(f.help.run());assert.equal(f.text(),'\r\nAB\rC\vDE\n');
});
for(const alive of [-1n,0n,1n])test(`Raw SHLP resets activity only for negative ALIVE ${alive}`,()=>{
  const f=fixture();f.high.write('alive',alive,1);f.high.write('active',55n,1);finish(f.help.run());assert.equal(f.high.read('active',1),alive<0n?0n:55n);
});
test('Raw SHLP zero WHO bypasses activity writes',()=>{
  const f=fixture();f.low.write('who',0n);f.high.write('active',55n,1);finish(f.help.run());assert.equal(f.high.read('active',1),55n);
});
for(const flag of ['ccflg','jbren'] as const)test(`Raw SHLP ${flag} interrupt survives CLOSE and restores before clearing`,()=>{
  const f=fixture('\n.ENERGY\nABC\nHIDDEN'),ichr=f.help.io.ichr,close=f.help.io.close;f.help.io.ichr=function*(){yield*ichr();if(f.r.c===65n)f.m.write(f.help.symbols[flag],-1n);};f.help.io.close=function*(){yield 'close';yield*close();};const g=f.help.run();assert.equal(g.next().value,'close');assert.equal(f.m.read(f.help.symbols[flag]),-1n);assert.equal(f.text(),'\r\nABC\n');finish(g);assert.equal(f.ini.state.ccflg,0n);assert.equal(f.m.read(f.help.symbols.jbren),flag==='jbren'?0o777777n:0n);
});
test('Raw SHLP PASFLG is read after initial OCRL returns',()=>{
  const f=fixture(),ocrl=f.help.io.ocrl;let first=true;f.help.io.ocrl=function*(){yield*ocrl();if(first){first=false;yield 'ocrl';}};const g=f.help.run();assert.equal(g.next().value,'ocrl');f.low.write('pasflg',-1n);finish(g);assert.deepEqual(f.help.events.filter(e=>e.startsWith('open:')),[`open:${f.help.symbols.hl1fil}`]);
});
test('Raw SHLP uses changed P1 after SETI instead of an entry keyword snapshot',()=>{
  const f=fixture('\n.NEWS\r\nNews body\n.NEXT'),seti=f.help.io.setInput;f.h.put(19420n,'News');let first=true;f.help.io.setInput=function*(){yield*seti();if(first){first=false;f.r.p1=19420n;}};finish(f.help.run());assert.equal(f.text(),'\r\nNews body\n');assert.equal(f.r.p1,f.help.symbols.keyword);
});
test('Raw SHLP reads C after output returns before deciding to test interruption',()=>{
  const f=fixture('\n.ENERGY\nAHIDDEN'),ochr=f.help.io.ochr;f.help.io.ochr=function*(){yield*ochr();yield 'output';};const g=f.help.run();assert.equal(g.next().value,'output');f.r.c=10n;f.ini.state.ccflg=-1n;finish(g);assert.equal(f.text(),'\r\nA');assert.equal(f.ini.state.ccflg,0n);
});
test('Raw SHLP retains C across yielded keyword ILDB and compares current value afterward',()=>{
  const f=fixture('\n.XNERGY\nBody\n.NEXT'),ildb=f.help.io.ildbKeyword;let first=true;f.help.io.ildbKeyword=function*(){yield*ildb();if(first){first=false;yield 'keyword';}};const g=f.help.run();assert.equal(g.next().value,'keyword');assert.equal(f.r.c,88n);f.r.c=69n;finish(g);assert.equal(f.text(),'\r\nBody\n');
});
test('Raw SHLP missing-key output rereads P2 after OSTR returns',()=>{
  const f=fixture('','Old'),ostr=f.help.io.ostr;f.h.put(19420n,'Changed');f.help.io.ostr=function*(){yield*ostr();f.r.p2=19420n;};finish(f.help.run());assert.equal(f.text(),"\r\n%Can't find help on Changed\r\n");
});
test('Raw SHLP not-found OSTB reads ten source bytes across two packed words',()=>{
  const f=fixture('','ABCDEFGHIJKLMNO');finish(f.help.run());assert.equal(f.text(),"\r\n%Can't find help on ABCDEFGHIJ\r\n");
});
test('Raw SHLP failed initial save leaves flags and keyword unchanged',()=>{
  const f=fixture();f.ini.state.ccflg=-1n;f.m.write(f.help.symbols.jbren,-1n);f.help.io.pushData=function*(){throw new Error('save fault');};assert.throws(()=>finish(f.help.run()),/save fault/);assert.equal(f.ini.state.ccflg,-1n);assert.equal(f.m.read(f.help.symbols.jbren),-1n);assert.equal(f.r.p1,f.help.symbols.keyword);
});
test('Raw SHLP initial OCRL failure retains cleared flags and completed saves',()=>{
  const f=fixture();f.ini.state.ccflg=-1n;f.m.write(f.help.symbols.jbren,signed36(halfWords(-1n,123n)));const stack=f.r.s;f.help.io.ocrl=function*(){throw new Error('output fault');};assert.throws(()=>finish(f.help.run()),/output fault/);assert.equal(f.ini.state.ccflg,0n);assert.equal(f.m.read(f.help.symbols.jbren),123n);assert.notEqual(f.r.s,stack);assert.ok(!f.help.events.some(e=>e.startsWith('open:')));
});
test('Raw SHLP failed OPEN warns and clears new flags only after restoring',()=>{
  const f=fixture();f.help.io.open=function*(){f.ini.state.ccflg=-1n;f.m.write(f.help.symbols.jbren,-1n);return false;};const pop=f.help.io.popData;let first=true;f.help.io.popData=function*(){if(first){first=false;yield 'restore';}return yield*pop();};const g=f.help.run();assert.equal(g.next().value,'restore');assert.equal(f.text(),'\r\n'+helpText[6].text);assert.equal(f.ini.state.ccflg,-1n);assert.ok(!f.help.events.includes('close'));finish(g);assert.equal(f.ini.state.ccflg,0n);assert.equal(f.m.read(f.help.symbols.jbren),0o777777n);
});
test('Raw SHLP warning checks hangup again after monitor OUTPUT',()=>{
  const f=fixture();f.help.io.open=function*(){return false;};f.help.io.output=function*(){yield 'warning';};const g=f.help.run();assert.equal(g.next().value,'warning');f.ini.state.hungup=-1n;finish(g);assert.equal(f.text(),'\r\n');assert.ok(!f.help.events.includes('warning'));
});
test('Raw SHLP failed CLOSE retains flags and selected help file',()=>{
  const f=fixture();f.help.io.close=function*(){f.ini.state.ccflg=-1n;throw new Error('close fault');};assert.throws(()=>finish(f.help.run()),/close fault/);assert.equal(f.ini.state.ccflg,-1n);assert.equal(f.ini.block.read('ibflb'),f.help.symbols.hl2fil);assert.ok(!f.help.events.includes('restore'));
});
test('Raw SHLP restore failure happens after file selection but before final flag clear',()=>{
  const f=fixture(),seti=f.help.io.setInput;let n=0;f.help.io.setInput=function*(){yield*seti();if(++n===2)f.ini.state.ccflg=-1n;};f.help.io.popData=function*(){throw new Error('restore fault');};assert.throws(()=>finish(f.help.run()),/restore fault/);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);assert.equal(f.ini.state.ccflg,-1n);
});
test('Raw SHLP restore uses changed saved words after final SETI',()=>{
  const f=fixture(),seti=f.help.io.setInput;let n=0;f.help.io.setInput=function*(){yield*seti();if(++n===2)yield 'selected';};const g=f.help.run();assert.equal(g.next().value,'selected');const top=rightHalf(f.r.s);for(let i=0n;i<4n;i++)f.m.write(top-i,100n+i);finish(g);assert.deepEqual([f.r.p2,f.r.p1,f.r.x3,f.r.x2],[100n,101n,102n,103n]);
});
test('Raw SHLP keyword ILDB failure retains the consumed file byte and pointer update',()=>{
  const f=fixture(),ildb=f.help.io.ildbKeyword;f.help.io.ildbKeyword=function*(){yield*ildb();throw new Error('ILDB fault');};assert.throws(()=>finish(f.help.run()),/ILDB fault/);assert.equal(f.r.c,69n);assert.equal(f.r.t1,69n);assert.equal(f.r.x3,5n);assert.equal(f.r.x2,-1n);assert.ok(!f.help.events.includes('close'));
});
test('Raw SHLP source keyword storage is reread after a yielded file character',()=>{
  const f=fixture('\n.NEWS\r\nNews body\n.NEXT','Other'),ichr=f.help.io.ichr;let changed=false;f.help.io.ichr=function*(){yield*ichr();if(!changed&&f.r.c===78n){changed=true;yield 'file';}};const g=f.help.run();assert.equal(g.next().value,'file');f.m.write(f.help.symbols.keyword,packAscii('News'));finish(g);assert.equal(f.text(),'\r\nNews body\n');
});
test('Raw SHLP emits all 38 public topics from the supplied help file through packed refills',()=>{
  const file=sourceFile('DECWAR.HLP'),headings=[...file.matchAll(/(?:\n|\f)\.([^\r\n]*)/g)];
  const terms=[...commands.slice(0,31).map(c=>c.words.join('').trim()),...extraHelpWords.map(w=>w.join('').trim()).filter(Boolean)];assert.equal(terms.length,38);
  for(const term of terms){const index=headings.findIndex(m=>m[1].slice(0,5).toUpperCase()===term.slice(0,5).toUpperCase());assert.ok(index>=0,term);const start=file.indexOf('\n',headings[index].index+1)+1,end=headings[index+1]?headings[index+1].index+1:file.length;
    const f=fixture(file,term);finish(f.help.run());assert.equal(f.text(),'\r\n'+file.slice(start,end).replaceAll('\f',''),term);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);}
});

test('Raw SHLP current X2 after character input controls whether text is printed',()=>{
  const f=fixture('A\n.NEXT'),ichr=f.help.io.ichr;let first=true;f.help.io.ichr=function*(){yield*ichr();if(first){first=false;f.r.x2=1n;}};finish(f.help.run());assert.equal(f.text(),'\r\nA\n');
});
test('Raw SHLP compares C with the keyword effective value but retains full T1 until folding',()=>{
  const f=fixture('\n.ENERGY\nBody\n.NEXT'),ildb=f.help.io.ildbKeyword;let first=true;f.help.io.ildbKeyword=function*(){yield*ildb();if(first){first=false;f.r.t1=signed36(halfWords(-1n,69n));}};finish(f.help.run());assert.equal(f.text(),'\r\nBody\n');
});
test('Raw SHLP SOJG uses the current X3 after keyword input returns',()=>{
  const f=fixture('\n.ELSE\nBody\n.NEXT'),ildb=f.help.io.ildbKeyword;f.help.io.ildbKeyword=function*(){yield*ildb();f.r.x3=0n;};finish(f.help.run());assert.equal(f.text(),'\r\nBody\n');assert.equal(f.help.events.filter(e=>e.startsWith('key:')).length,1);
});
