import test from 'node:test';
import assert from 'node:assert/strict';
import { helpCommandRuntimeFixture as fixture,sourceHelpCommandFixture } from './fixtures/help-command-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,helpText,commands,extraHelpWords } from '../src/generated/source-data.ts';
import { halfWords,signed36 } from '../src/compat/word36.ts';
import { sourceFile } from '../tools/source.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
const board=(f:ReturnType<typeof fixture>)=>f.views.high.board.disp(10,20);

test('Raw HELP composes ESHP, list search, SHLP and PSHP over the same board',()=>{
  const f=fixture(),open=f.help.io.open;f.help.io.open=function*(){assert.equal(board(f),1000);return yield*open();};finish(f.command.run());assert.equal(f.text(),'\r\nBody\n');assert.equal(board(f),101);assert.equal(f.ini.state.ccflg,0n);assert.deepEqual(f.command.events,['alert-return','eshp','equal','slst',`shlp:${f.list.symbols.table+10n}`,'pshp']);
});
test('Raw HELP RED rejection leaves flags, tokens and board unchanged',()=>{
  const f=fixture();f.ship.condition=K.RED;f.ini.state.ccflg=-1n;f.m.write(f.help.symbols.jbren,-1n);const x3=f.r.x3,s=f.r.s;finish(f.command.run());assert.equal(f.text(),helpText[0].text);assert.equal(board(f),101);assert.equal(f.ini.state.ccflg,-1n);assert.equal(f.m.read(f.help.symbols.jbren),-1n);assert.deepEqual([f.r.x3,f.r.s],[x3,s]);assert.deepEqual(f.command.events,['red-warning']);
});
test('Raw HELP RED OUTSTR is unguarded even with HUNGUP set',()=>{
  const f=fixture();f.ship.condition=K.RED;f.ini.state.hungup=-1n;finish(f.command.run());assert.equal(f.text(),helpText[0].text);
});
test('Raw HELP non-RED literal transfer can suspend or fail before ESHP',()=>{
  const f=fixture();f.command.io.afterAlertCheck=function*(){yield 'literal';throw new Error('unresolved transfer');};const g=f.command.run();assert.equal(g.next().value,'literal');assert.equal(board(f),101);assert.throws(()=>finish(g),/unresolved transfer/);assert.ok(!f.command.events.includes('eshp'));
});
test('Raw HELP WHO zero skips the alert transfer and ship deposit',()=>{
  const f=fixture('HELP');f.low.write('who',0n);finish(f.command.run());assert.equal(board(f),101);assert.ok(!f.command.events.includes('alert-return'));assert.ok(f.text().includes('HELP *'));
});
test('Raw HELP negative WHO still checks its physical condition alias before ESHP skips it',()=>{
  const f=fixture('HELP');f.low.write('who',-1n);f.m.write(f.command.symbols.condition-2n,BigInt(K.RED));finish(f.command.run());assert.equal(f.text(),helpText[0].text);assert.deepEqual(f.command.events,['red-warning']);
});
test('Raw HELP condition compares the full source word to RED',()=>{
  const f=fixture('HELP');f.high.write('shpcon',signed36(halfWords(1n,BigInt(K.RED))),1,K.KSPCON);finish(f.command.run());assert.ok(f.text().includes('HELP *'));assert.equal(board(f),101);
});
test('Raw HELP no modifiers calls HLPXTR even with a pending Ctrl-C then clears it',()=>{
  const f=fixture('HELP');f.ini.state.ccflg=-1n;finish(f.command.run());assert.ok(f.text().includes('Besides commands'));assert.equal(f.ini.state.ccflg,0n);assert.deepEqual(f.command.events,['alert-return','eshp','hlpxtr','pshp']);
});
test('Raw HELP ignores NTOK and accepts nonnegative modifier types',()=>{
  const f=fixture();f.input.ntok=0;f.low.write('typlst',BigInt(K.KINT),2);finish(f.command.run());assert.equal(f.text(),'\r\nBody\n');assert.equal(f.input.ntok,0);
});
test('Raw HELP negative modifier type terminates before parsing later tokens',()=>{
  const f=fixture('HELP ENERGY UNKNOWN');f.low.write('typlst',-7n,3);finish(f.command.run());assert.equal(f.text(),'\r\nBody\n');assert.equal(f.command.events.filter(e=>e==='equal').length,1);
});
test('Raw HELP pending Ctrl-C with a modifier skips matching but still restores the ship',()=>{
  const f=fixture();f.ini.state.ccflg=-1n;finish(f.command.run());assert.equal(f.text(),'');assert.deepEqual(f.command.events,['alert-return','eshp','pshp']);assert.equal(board(f),101);
});
test('Raw HELP ambiguous command does not fall through to extra topics; unknown command does',()=>{
  const f=fixture('HELP P UNKNOWN INPUT','\n.INPUT\r\nInput body\n.END');finish(f.command.run());assert.equal(f.text(),"P is ambiguous.  Could be:\r\nPHasers, PLanets, POints\r\nI don't know the term UNKNOINPUT\r\n\r\nInput body\n");assert.equal(f.command.events.filter(e=>e==='slst').length,5);assert.equal(board(f),101);
});
test('Raw HELP multiple file topics reopen from byte zero and preserve the modifier index',()=>{
  const f=fixture('HELP ENERGY NEWS','\n.ENERGY\r\nEnergy body\n.NEWS\r\nNews body\n.END');finish(f.command.run());assert.equal(f.text(),'\r\nEnergy body\n\r\nNews body\n');assert.equal(f.help.events.filter(e=>e==='close').length,2);assert.equal(f.r.x3,3n);
});
for(const flag of [-1n,0n,1n])test(`Raw HELP star privilege ${flag} uses HLPALL and resumes the next modifier`,()=>{
  const f=fixture('HELP * ENERGY');f.low.write('pasflg',flag);finish(f.command.run());assert.ok(f.text().startsWith('\r\nCommands are:\r\n\r\nBAses'));assert.ok(f.text().endsWith('\r\nBody\n'));assert.equal(f.text().includes('*Debug'),flag<0n);assert.equal(f.r.x3,3n);
});
test('Raw HELP privileged command visibility uses negative PASFLG',()=>{
  const f=fixture('HELP *DEBUG','\n.*DEBUG\r\nSecret\n.END');f.low.write('pasflg',1n);finish(f.command.run());assert.equal(f.text(),"I don't know the term *DEBU\r\n");const g=fixture('HELP *DEBUG','\n.*DEBUG\r\nSecret\n.END');g.low.write('pasflg',-1n);finish(g.command.run());assert.equal(g.text(),'\r\nSecret\n');
});
test('Raw HELP star EQUAL result is read after the call returns',()=>{
  const f=fixture(),equal=f.command.io.equal;f.command.io.equal=function*(){yield*equal();yield 'equal';};const g=f.command.run();assert.equal(g.next().value,'equal');f.r.t0=-1n;finish(g);assert.ok(f.text().includes('Commands are:'));assert.ok(!f.command.events.includes('slst'));
});
test('Raw HELP reads PASFLG after EQUAL before selecting the command table',()=>{
  const f=fixture('HELP *DEBUG','\n.*DEBUG\r\nSecret\n.END'),equal=f.command.io.equal;f.command.io.equal=function*(){yield*equal();f.low.write('pasflg',-1n);};finish(f.command.run());assert.equal(f.text(),'\r\nSecret\n');
});
test('Raw HELP current X1 after a nonunique SLST decides whether extra topics are searched',()=>{
  const f=fixture('HELP INPUT','\n.INPUT\r\nInput body\n.END'),search=f.command.io.search;let first=true;f.command.io.search=function*(){const result=yield*search();if(first){first=false;yield 'search';}return result;};const g=f.command.run();assert.equal(g.next().value,'search');f.r.x1=0n;finish(g);assert.equal(f.text(),'');assert.equal(f.command.events.filter(e=>e==='slst').length,1);
});
test('Raw HELP current P2 after a unique SLST is passed to SHLP',()=>{
  const f=fixture('HELP ENERGY','\n.NEWS\r\nNews body\n.END'),search=f.command.io.search;f.command.io.search=function*(){const result=yield*search();f.r.p2=f.list.symbols.table+22n;return result;};finish(f.command.run());assert.equal(f.text(),'\r\nNews body\n');
});
test('Raw HELP current X3 after SHLP controls the next modifier address',()=>{
  const f=fixture('HELP ENERGY UNKNOWN'),show=f.command.io.show;f.command.io.show=function*(){yield*show();f.r.x3=2n;};finish(f.command.run());assert.equal(f.text(),'\r\nBody\n');assert.equal(f.r.x3,3n);
});
test('Raw HELP checks changed token type after ADDI yields',()=>{
  const f=fixture(),addi=f.command.io.addiX3;f.command.io.addiX3=function*(){yield*addi();yield 'index';};const g=f.command.run();assert.equal(g.next().value,'index');f.low.write('typlst',-1n,2);finish(g);assert.equal(f.text(),'');assert.equal(board(f),101);
});
test('Raw HELP clears Ctrl-C before yielded PSHP; a later interrupt remains set',()=>{
  const f=fixture('HELP'),pshp=f.command.io.pshp;f.command.io.pshp=function*(){yield 'restore';yield*pshp();};const g=f.command.run();assert.equal(g.next().value,'restore');assert.equal(f.ini.state.ccflg,0n);assert.equal(board(f),1000);f.ini.state.ccflg=-1n;finish(g);assert.equal(f.ini.state.ccflg,-1n);assert.equal(board(f),101);
});
for(const alive of [0n,1n])test(`Raw HELP does not restore a nonnegative ALIVE ${alive} ship after file output`,()=>{
  const f=fixture(),show=f.command.io.show;f.command.io.show=function*(){yield*show();f.high.write('alive',alive,1);};finish(f.command.run());assert.equal(board(f),1000);
});
test('Raw HELP SHLP clears an interrupt before the following modifier is processed',()=>{
  const f=fixture('HELP ENERGY NEWS','\n.ENERGY\r\nABC\nDiscard\n.NEWS\r\nNews body\n.END'),ichr=f.help.io.ichr;let interrupted=false;f.help.io.ichr=function*(){yield*ichr();if(!interrupted&&f.r.c===65n){interrupted=true;f.ini.state.ccflg=-1n;}};finish(f.command.run());assert.equal(f.text(),'\r\nABC\n\r\nNews body\n');assert.equal(f.ini.state.ccflg,0n);
});
test('Raw HELP failed file output leaves the ship removed and skips common cleanup',()=>{
  const f=fixture();f.help.io.ochr=function*(){f.ini.state.ccflg=-1n;throw new Error('output fault');};assert.throws(()=>finish(f.command.run()),/output fault/);assert.equal(board(f),1000);assert.equal(f.ini.state.ccflg,-1n);assert.ok(!f.command.events.includes('pshp'));
});
test('Raw HELP failed erase happens before X3 initialization or modifier reads',()=>{
  const f=fixture();f.r.x3=55n;f.command.io.eshp=function*(){throw new Error('erase fault');};assert.throws(()=>finish(f.command.run()),/erase fault/);assert.equal(f.r.x3,55n);assert.ok(!f.command.events.includes('equal'));
});
test('Raw HELP raw terminal GTKN input composes into list matching, file output and board restoration',()=>{
  const f=fixture('HELP');f.input.pointer=-1n;f.editor.feed('HELP ENERGY\n');finish(f.tokens.run());const before=f.text();finish(f.command.run());assert.equal(f.text().slice(before.length),'Body\n');assert.equal(board(f),101);assert.equal(f.input.tokens[1].text,'ENERG');
});
test('DECWAR HELP dispatch invokes the raw command without changing PTIME or finishing a timed turn',()=>{
  const f=fixture(),ctx={who:1,player:-1n,ptime:99n,shared:{players:f.views.high.players}};finish(dispatchCommand(ctx,8,{
    *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},*invoke(call){assert.deepEqual(call,{routine:'help'});yield*f.command.run();},*leave(){throw new Error('unexpected leave');},*finishTurn(){throw new Error('unexpected timed turn');},movementContinuation(){throw new Error('unexpected movement');},
  }));assert.equal(ctx.ptime,99n);assert.equal(f.text(),'\r\nBody\n');assert.equal(board(f),101);
});
test('Raw HELP command resolves and emits all 38 public source topics and restores the ship each time',()=>{
  const file=sourceFile('DECWAR.HLP'),headings=[...file.matchAll(/(?:\n|\f)\.([^\r\n]*)/g)];const terms=[...commands.slice(0,31).map(c=>c.words.join('').trim()),...extraHelpWords.map(w=>w.join('').trim()).filter(Boolean)];assert.equal(terms.length,38);
  for(const term of terms){const index=headings.findIndex(m=>m[1].slice(0,5).toUpperCase()===term.slice(0,5).toUpperCase());assert.ok(index>=0,term);const start=file.indexOf('\n',headings[index].index+1)+1,end=headings[index+1]?headings[index+1].index+1:file.length;const f=sourceHelpCommandFixture('HELP '+term);finish(f.command.run());assert.equal(f.text(),'\r\n'+file.slice(start,end).replaceAll('\f',''),term);assert.equal(board(f),101,term);}
});

test('Raw HELP unknown token output spans the following token word after actual terminal parsing',()=>{
  const f=fixture('HELP');f.input.pointer=-1n;f.editor.feed('HELP ZZZZZ ENERGY\n');finish(f.tokens.run());finish(f.command.run());assert.ok(f.text().includes("I don't know the term ZZZZZENERG\r\n"));assert.ok(f.text().endsWith('\r\nBody\n'));assert.equal(board(f),101);
});
test('Raw HELP unknown five-character token stops at the following EOL word',()=>{
  const f=fixture('HELP ZZZZZ');finish(f.command.run());assert.equal(f.text(),"I don't know the term ZZZZZ\r\n");
});
test('Raw HELP PSHP rereads changed WHO and restores the current ship instead of the entry ship',()=>{
  const f=fixture(),show=f.command.io.show;f.high.write('alive',-1n,6);f.high.write('shpcon',12n,6,K.KVPOS);f.high.write('shpcon',20n,6,K.KHPOS);f.command.io.show=function*(){yield*show();f.low.write('who',6n);};finish(f.command.run());assert.equal(board(f),1000);assert.equal(f.views.high.board.disp(12,20),206);
});
test('Raw HELP SHLP failure during CLOSE retains the removed ship and saved data frame',()=>{
  const f=fixture();const stack=f.r.s;f.help.io.close=function*(){throw new Error('close fault');};assert.throws(()=>finish(f.command.run()),/close fault/);assert.equal(board(f),1000);assert.notEqual(f.r.s,stack);assert.ok(!f.command.events.includes('pshp'));
});
