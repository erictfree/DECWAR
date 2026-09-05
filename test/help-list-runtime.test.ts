import test from 'node:test';
import assert from 'node:assert/strict';
import { helpListRuntimeFixture as fixture } from './fixtures/help-list-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,rightHalf,signed36,packAscii } from '../src/compat/word36.ts';
import { commands,extraHelpWords } from '../src/generated/source-data.ts';

test('Raw SLST returns the unique physical entry address and zero-based index',()=>{
  const f=fixture(['ALPHA','BETA','CHARLIE'],'B');f.r.x3=33n;f.r.x4=44n;const p1=f.r.p1,s=f.r.s;assert.equal(finish(f.list.search()),true);assert.equal(f.r.x1,1n);assert.equal(f.r.p2,f.list.symbols.table+2n);assert.deepEqual([f.r.p1,f.r.x3,f.r.x4,f.r.s],[p1,33n,44n,s]);assert.equal(f.text(),'');assert.equal(f.list.events.filter(e=>e==='aobjp').length,6);
});
test('Raw SLST unknown with no warning returns negative X1 without output',()=>{
  const f=fixture(['ALPHA','BETA'],'X');assert.equal(finish(f.list.search()),false);assert.equal(f.r.x1,-1n);assert.equal(f.text(),'');assert.ok(!f.list.events.includes('success'));
});
test('Raw SLST unknown warning reads X2 right half and original input bytes',()=>{
  const f=fixture(['ALPHA'],'UNKNOWNLONG');f.r.x2=signed36(halfWords(-1n,f.list.symbols.unknown));assert.equal(finish(f.list.search()),false);assert.equal(f.text(),"I don't know the term UNKNOWNLON\r\n");assert.equal(f.r.x1,-1n);
});
test('Raw SLST ambiguity prints input and all candidates in physical order',()=>{
  const f=fixture(['ALPHA','ALPINE','BETA','ALPS'],'AL');assert.equal(finish(f.list.search()),false);assert.equal(f.r.x1,0n);assert.equal(f.text(),'AL is ambiguous.  Could be:\r\nALPHA, ALPINE, ALPS\r\n');assert.equal(f.list.events.filter(e=>e.startsWith('equal:')).length,4);
});
test('Raw SLST negative X2 stops at the second match and suppresses candidates',()=>{
  const f=fixture(['ALPHA','ALPINE','ALPS'],'AL');f.r.x2=-1n;assert.equal(finish(f.list.search()),false);assert.equal(f.text(),'AL is ambiguous.\r\n');assert.equal(f.list.events.filter(e=>e.startsWith('equal:')).length,2);
});
test('Raw SLST uses raw EQUAL lowercase-input behavior rather than a host case-folding match',()=>{
  const f=fixture(['Energy'],'energy');assert.equal(finish(f.list.search()),false);assert.equal(f.r.x1,-1n);const g=fixture(['Energy'],'ENERG');assert.equal(finish(g.list.search()),true);
});
test('Raw SLST padded blank entry does not match an empty token',()=>{
  const f=fixture(['','ENERGY'],'');assert.equal(finish(f.list.search()),false);assert.equal(f.r.x1,-1n);
});
test('Raw SLST has no zero-count guard before its first comparison',()=>{
  const f=fixture(['ALPHA'],'A');f.r.x1=f.list.symbols.table;assert.equal(finish(f.list.search()),true);assert.equal(f.list.events.filter(e=>e.startsWith('equal:')).length,1);assert.equal(f.list.events.filter(e=>e==='aobjp').length,1);
});
test('Raw SLST odd negative table count stops on first AOBJP without the second',()=>{
  const f=fixture(['ALPHA','BETA'],'B');f.r.x1=signed36(halfWords(-3n,f.list.symbols.table));assert.equal(finish(f.list.search()),true);assert.equal(f.r.x1,1n);assert.equal(f.list.events.filter(e=>e==='aobjp').length,3);
});
test('Raw SLST reads changed table storage after an earlier EQUAL yields',()=>{
  const f=fixture(['ALPHA','BETA'],'G'),equal=f.list.io.equal;let first=true;f.list.io.equal=function*(){yield*equal();if(first){first=false;yield 'equal';}};const g=f.list.search();assert.equal(g.next().value,'equal');f.m.write(f.list.symbols.table+2n,packAscii('GAMMA'));assert.equal(finish(g),true);assert.equal(f.r.x1,1n);
});
test('Raw SLST uses current T0 and P2 after EQUAL returns',()=>{
  const f=fixture(['ALPHA'],'X'),equal=f.list.io.equal;f.list.io.equal=function*(){yield*equal();yield 'equal';};const g=f.list.search();assert.equal(g.next().value,'equal');f.r.t0=-1n;f.r.p2=19900n;assert.equal(finish(g),true);assert.equal(f.r.p2,19900n);
});
test('Raw SLST unique return skip occurs before restoring the saved frame',()=>{
  const f=fixture();const stack=f.r.s;f.list.io.successReturn=function*(){yield 'return-skip';};const g=f.list.search();assert.equal(g.next().value,'return-skip');assert.equal(f.r.x1,1n);assert.equal(f.r.p2,f.list.symbols.table+2n);assert.notEqual(f.r.s,stack);const top=rightHalf(f.r.s);f.m.write(top,111n);f.m.write(top-1n,222n);f.m.write(top-2n,333n);assert.equal(finish(g),true);assert.deepEqual([f.r.p1,f.r.x4,f.r.x3],[111n,222n,333n]);
});
test('Raw SLST failed return skip retains matched results and saved registers',()=>{
  const f=fixture();f.list.io.successReturn=function*(){throw new Error('AOS fault');};const stack=f.r.s;assert.throws(()=>finish(f.list.search()),/AOS fault/);assert.equal(f.r.x1,1n);assert.notEqual(f.r.s,stack);assert.ok(!f.list.events.includes('restore'));
});
test('Raw SLST failed EQUAL retains entry saves and initialized match state',()=>{
  const f=fixture();f.list.io.equal=function*(){throw new Error('equal fault');};assert.throws(()=>finish(f.list.search()),/equal fault/);assert.equal(f.r.x3,-1n);assert.equal(f.r.x4,0n);assert.equal(f.r.p2,f.list.symbols.table);
});
test('Raw SLST negative X2 after the candidate heading does not skip the current hit',()=>{
  const f=fixture(['ALPHA','ALPINE','ALPS'],'AL'),output=f.list.io.output;f.list.io.output=function*(entry){const heading=entry==='ostr.'&&f.r.p1===f.list.symbols.candidates;yield*output(entry);if(heading)f.r.x2=-1n;};assert.equal(finish(f.list.search()),false);assert.equal(f.text(),'AL is ambiguous.  Could be:\r\nALPHA, ALPINE\r\n');assert.equal(f.list.events.filter(e=>e.startsWith('equal:')).length,2);
});
test('Raw SLST current P2 after comma output selects the candidate text',()=>{
  const f=fixture(['ALPHA','ALPINE'],'AL'),output=f.list.io.output;f.h.put(19900n,'Changed');f.list.io.output=function*(entry){yield*output(entry);if(entry==='ospc.')f.r.p2=19900n;};finish(f.list.search());assert.equal(f.text(),'AL is ambiguous.  Could be:\r\nALPHA, Changed\r\n');
});
test('Raw SLST current X3 after unknown prefix selects the unknown input text',()=>{
  const f=fixture(['ALPHA'],'UNKNOWN'),output=f.list.io.output;f.r.x2=f.list.symbols.unknown;f.h.put(19900n,'Changed');f.list.io.output=function*(entry){yield*output(entry);if(entry==='ostr.')f.r.x3=19900n;};finish(f.list.search());assert.equal(f.text(),"I don't know the term Changed\r\n");
});
test('Raw SLST ambiguity output failure retains its nested saved P1',()=>{
  const f=fixture(['ALPHA','ALPINE'],'AL'),output=f.list.io.output,stack=f.r.s;f.list.io.output=function*(entry){if(entry==='ostr.')throw new Error('output fault');yield*output(entry);};assert.throws(()=>finish(f.list.search()),/output fault/);assert.equal(rightHalf(f.r.s),rightHalf(stack)+4n);assert.equal(f.r.x3,1n);assert.equal(f.text(),'AL');
});
test('Raw SLST to SHLP passes the actual matched two-word keyword address',()=>{
  const f=fixture(['ALPHA','Energy'],'ENE','\n.ENERGY\r\nBody\n.NEXT');assert.equal(finish(f.list.search()),true);f.r.p1=rightHalf(f.r.p2);finish(f.help.run());assert.equal(f.text(),'\r\nBody\n');assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);
});
for(const count of [1,7,8,14])test(`Raw OLST ${count} entries retain ten-byte padding and seven columns`,()=>{
  const words=Array.from({length:count},(_,i)=>String(i));const f=fixture(words),x1=f.r.x1;f.r.x2=55n;finish(f.list.output());let expected='';for(let i=0;i<count;i++){expected+=String(i).padEnd(10);if((i+1)%7===0||i+1===count)expected+='\r\n';}assert.equal(f.text(),expected);assert.equal(f.r.x1,x1);assert.equal(f.r.x2,55n);assert.equal(f.list.events.filter(e=>e==='aobjp').length,count*2);
});
test('Raw OLST uses current pair and TMP words across yielded CPU operations',()=>{
  const f=fixture(['ABCDEFGHIJ']),dmove=f.list.listIO.dmove;f.list.listIO.dmove=function*(){yield*dmove();yield 'pair';};const g=f.list.output();assert.equal(g.next().value,'pair');f.r.t2=packAscii('KLMNO');finish(g);assert.equal(f.text(),'ABCDEKLMNO\r\n');
});
test('Raw OLST clear failure preserves already-deposited TMP pair',()=>{
  const f=fixture(['ABCDEFGHIJ']);f.m.write(f.list.symbols.tmp+2n,99n);f.list.listIO.clearTerminator=function*(){throw new Error('clear fault');};assert.throws(()=>finish(f.list.output()),/clear fault/);assert.equal(f.m.read(f.list.symbols.tmp),signed36(packAscii('ABCDE')));assert.equal(f.m.read(f.list.symbols.tmp+1n),signed36(packAscii('FGHIJ')));assert.equal(f.m.read(f.list.symbols.tmp+2n),99n);assert.equal(f.text(),'');
});
test('Raw OLST current X2 after output changes the row boundary',()=>{
  const f=fixture(['ONE','TWO']),output=f.list.listIO.output;let first=true;f.list.listIO.output=function*(entry){yield*output(entry);if(entry==='ostr.'&&first){first=false;f.r.x2=1n;}};finish(f.list.output());assert.equal(f.text(),'ONE       \r\nTWO       \r\n');
});
test('Raw OLST zero-count pointer still emits one entry before AOBJP exits',()=>{
  const f=fixture(['ONE']);f.r.x1=f.list.symbols.table;finish(f.list.output());assert.equal(f.text(),'ONE       \r\n');assert.equal(f.list.events.filter(e=>e==='aobjp').length,1);
});
test('Raw OLST final OCRL failure leaves both saved words and advanced X1',()=>{
  const f=fixture(['ONE']),output=f.list.listIO.output,stack=f.r.s;f.list.listIO.output=function*(entry){if(entry==='ocrl.')throw new Error('newline fault');yield*output(entry);};assert.throws(()=>finish(f.list.output()),/newline fault/);assert.equal(rightHalf(f.r.s),rightHalf(stack)+2n);assert.equal(f.r.x1,f.list.symbols.table+2n);assert.equal(f.text(),'ONE       ');
});
test('Raw OLST restore rereads changed saved X2/X1 after final output',()=>{
  const f=fixture(['ONE']),output=f.list.listIO.output;f.list.listIO.output=function*(entry){yield*output(entry);if(entry==='ocrl.')yield 'newline';};const g=f.list.output();assert.equal(g.next().value,'newline');f.m.write(rightHalf(f.r.s),22n);f.m.write(rightHalf(f.r.s)-1n,11n);finish(g);assert.deepEqual([f.r.x1,f.r.x2],[11n,22n]);
});
test('Raw OLST prints the supplied public command and extra-help tables without trimming blank slots',()=>{
  for(const words of [commands.slice(0,31).map(c=>c.words.join('')),extraHelpWords.map(w=>w.join(''))]){const f=fixture(words);finish(f.list.output());const expected=words.map((w,i)=>w+((i+1)%7===0||i+1===words.length?'\r\n':'')).join('');assert.equal(f.text(),expected);}
});

for(const flag of [-1n,0n,1n])test(`Raw HLPALL ${flag} lists source command words with signed privilege selection`,()=>{
  const f=fixture(commands.map(c=>c.words.join('')));f.low.write('pasflg',flag);finish(f.list.summary('hlpall'));const words=commands.slice(0,flag<0n?33:31).map(c=>c.words.join(''));const rows=words.map((w,i)=>w+((i+1)%7===0||i+1===words.length?'\r\n':'')).join('');assert.equal(f.text(),'\r\nCommands are:\r\n\r\n'+rows);
});
test('Raw HLPXTR composes exact introduction, blank table slot and closing text',()=>{
  const f=fixture();finish(f.list.summary('hlpxtr'));assert.equal(f.text(),'\r\nFor a list of commands type HELP *\r\nFor help on a particular command type HELP command\r\n\r\nBesides commands, help is also available for:\r\n\r\nCTL-C               INTRO     HInts     INput     Output    PAuses    \r\nPRegame   \r\n\r\nUpper case letters mark the shortest acceptable abbreviation.\r\n\r\n');
});
test('Raw HLPALL reads PASFLG after its second OCRL has returned',()=>{
  const f=fixture(commands.map(c=>c.words.join(''))),output=f.list.summaryIO.output;let n=0;f.list.summaryIO.output=function*(entry){yield*output(entry);if(entry==='ocrl.'&&++n===2)yield 'newline';};const g=f.list.summary('hlpall');assert.equal(g.next().value,'newline');f.low.write('pasflg',-1n);finish(g);assert.ok(f.text().endsWith('*Password \r\n'));
});
test('Raw HLPXTR list failure retains its table pointer without printing the closing text',()=>{
  const f=fixture();f.list.summaryIO.list=function*(){throw new Error('list fault');};assert.throws(()=>finish(f.list.summary('hlpxtr')),/list fault/);assert.equal(f.r.x1,f.list.summarySymbols.extraPointer);assert.ok(!f.text().includes('Upper case letters'));
});

test('Raw SLST to SHLP resolves and emits all 38 public topics from source tables and help bytes',async()=>{
  const {sourceFile}=await import('../tools/source.ts');const file=sourceFile('DECWAR.HLP'),headings=[...file.matchAll(/(?:\n|\f)\.([^\r\n]*)/g)];let checked=0;
  for(const table of [commands.slice(0,31).map(c=>c.words.join('')),extraHelpWords.map(w=>w.join(''))])for(const [i,word] of table.entries()){
    const term=word.trim();if(!term)continue;const f=fixture(table,term.toUpperCase(),file);assert.equal(finish(f.list.search()),true,term);assert.equal(f.r.x1,BigInt(i),term);assert.equal(f.r.p2,f.list.symbols.table+BigInt(i*2));f.r.p1=rightHalf(f.r.p2);finish(f.help.run());
    const index=headings.findIndex(m=>m[1].slice(0,5).toUpperCase()===term.slice(0,5).toUpperCase());assert.ok(index>=0,term);const start=file.indexOf('\n',headings[index].index+1)+1,end=headings[index+1]?headings[index+1].index+1:file.length;assert.equal(f.text(),'\r\n'+file.slice(start,end).replaceAll('\f',''),term);checked++;
  }assert.equal(checked,38);
});
