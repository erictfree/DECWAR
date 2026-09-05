import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { messages as M,terminalWords,extraHelpWords,constants as K } from '../src/generated/source-data.ts';
import { packAscii } from '../src/compat/word36.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';

function fixture(kind=0n,line='TYPE OUTPUT',responses:string[]=[]){
  const f=pregameRuntimeFixture([]);for(const s of [line,...responses])f.editor.feed(s+'\n');finish(f.tokens.run());
  f.m.write(f.type.symbols.kind,kind);for(const key of ['oflg','prtype','scnflg','icflg','ocflg'])f.low.write(key,0n);f.low.write('ttytyp',1n);
  f.high.write('romopt',0n);f.high.write('blhopt',0n);
  const before=f.text().length;return {...f,run:()=>finish(f.type.run(f.type.symbols.kind)),output:()=>f.text().slice(before)};
}
const outputReport=(terminal=terminalWords[0].join(''))=>M.type02.text+'\r\n\r\n'+M.medfrm.text+M.type03.text+'\r\n'+M.normal.text+M.type04.text+'\r\n'+M.lngfrm.text+M.type05.text+'\r\n'+M.bthfrm.text+M.type08.text+'\r\n'+M.bthfrm.text+M.type09.text+'\r\n'+M.set008.text+terminal+'\r\n';
const optionReport=(newline=false)=> (newline?'\r\n':'')+M.decver.text+'\r\n'+M.type06.text+'\r\n'+M.type07.text+'\r\n';

test('Statement TYPE OUTPUT prints source fields and both padded terminal words through raw output',()=>{
  const f=fixture();f.run();assert.equal(f.output(),outputReport());assert.equal(f.m.read(f.type.symbols.p),2n);assert.deepEqual(f.type.events.slice(0,2),['equal:O','equal:OUTPUT']);
});
test('Statement TYPE OPTION prints the original version and option strings',()=>{const f=fixture(0n,'TYPE OPTION');f.run();assert.equal(f.output(),optionReport());assert.deepEqual(f.type.events.slice(0,3),['equal:O','equal:OUTPUT','equal:OPTION']);});
for(const kind of [1n,2n])test(`Statement TYPE explicit KIND ${kind} bypasses all token checks`,()=>{
  const f=fixture(kind,'TYPE WRONG');f.run();assert.equal(f.output(),kind===1n?outputReport():optionReport());assert.ok(!f.type.events.some(e=>e.startsWith('equal:')));
});
for(const kind of [-1n,3n,999n])test(`Statement TYPE unexpected KIND ${kind} still parses the switch`,()=>{
  const f=fixture(kind,'TYPE OUTPUT');f.run();assert.equal(f.output(),outputReport());assert.equal(f.type.events[0],'equal:O');
});
test('Statement TYPE exact O warns of ambiguity before prompting and reading the first response token',()=>{
  const f=fixture(0n,'TYPE O',['OPTION']);f.run();assert.equal(f.output(),M.ambswi.text+'\r\n'+M.type01.text+'\r'+optionReport(true));assert.equal(f.m.read(f.type.symbols.p),1n);
});
test('Statement TYPE blank response returns before assigning P=1',()=>{
  const f=fixture(0n,'TYPE',['']);f.run();assert.equal(f.output(),M.type01.text+'\r');assert.equal(f.m.read(f.type.symbols.p),2n);
});
test('Statement TYPE retries nonalphabetic and unknown responses without an extra ambiguity warning',()=>{
  const f=fixture(0n,'TYPE 17',['WRONG','42','OUTPUT']);f.run();assert.equal(f.type.events.filter(e=>e==='type01').length,3);assert.ok(!f.type.events.includes('ambswi'));assert.ok(f.output().endsWith(outputReport()));assert.equal(f.m.read(f.type.symbols.p),1n);
});
test('Statement TYPE slash tail supplies the requested switch to raw GTKN',()=>{
  const f=fixture(0n,'TYPE/OPTION');f.run();assert.equal(f.type.events.filter(e=>e==='gtkn').length,1);assert.ok(f.output().endsWith(optionReport()));assert.equal(f.wait.operands.length,0);
});
test('Statement TYPE does not use NTOK to guard its second token',()=>{const f=fixture();f.low.write('ntok',0n);f.run();assert.equal(f.output(),outputReport());});
for(const field of ['oflg','icflg','ocflg'] as const)for(const n of [-3n,3n])test(`Statement TYPE signed ${field}=${n} selects the source arithmetic IF branch`,()=>{
  const f=fixture(1n);f.low.write(field,n);f.run();const message=field==='oflg'?(n<0n?'shtfrm':'lngfrm'):(n<0n?'relfrm':'absfrm');assert.ok(f.type.events.includes(message));
  const suffix=field==='oflg'?'type03':field==='icflg'?'type08':'type09';assert.equal(f.type.events[f.type.events.indexOf(suffix)-1],message);
});
for(const field of ['prtype','scnflg'] as const)test(`Statement TYPE ${field} two-label IF uses the supplied compiler branch`,()=>{
  const f=fixture(1n),branch=f.type.io.twoLabelIf;f.type.io.twoLabelIf=function*(name,v){if(name===field){assert.equal(yield*v.evaluate(),0n);return 'first';}return yield*branch(name,v);};f.run();assert.equal(f.type.events[f.type.events.indexOf(field==='prtype'?'type04':'type05')-1],field==='prtype'?'inform':'shtfrm');
});
test('Statement TYPE output settings are reread after preceding suspended output',()=>{
  const f=fixture(1n),out=f.type.io.out;f.type.io.out=function*(key,n){yield*out(key,n);if(key==='type02')yield 'heading';};const g=f.type.run(f.type.symbols.kind);assert.equal(g.next().value,'heading');f.low.write('oflg',-1n);finish(g);assert.equal(f.type.events[f.type.events.indexOf('type03')-1],'shtfrm');
});
for(const [field,on,off] of [['romopt','setu06','type06'],['blhopt','setu07','type07']] as const)test(`Statement TYPE rereads ${field} after the affirmative line and can print both lines`,()=>{
  const f=fixture(2n);f.high.write(field,-1n);const out=f.type.io.out;f.type.io.out=function*(key,n){yield*out(key,n);if(key===on)f.high.write(field,0n);};f.run();assert.ok(f.output().includes(M[on].text+'\r\n'+M[off].text+'\r\n'));
});
test('Statement TYPE logical NOT remains an explicit policy separate from logical interpretation',()=>{
  const f=fixture(2n);f.type.io.not=()=>false;f.run();assert.equal(f.output(),M.decver.text+'\r\n');
});
test('Statement TYPE zero terminal index reads the preceding XHELP words',()=>{
  const f=fixture(1n);f.low.write('ttytyp',0n);f.run();assert.equal(f.output(),outputReport(extraHelpWords.at(-1)!.join('')));
});
test('Statement TYPE terminal argument expressions can see different TTYTYP values',()=>{
  const f=fixture(1n),out=f.type.io.out2w;f.type.io.out2w=function*(first,second){const a=first();f.low.write('ttytyp',2n);const b=second();assert.equal(a,f.high.address('ttydat',1,1));assert.equal(b,f.high.address('ttydat',2,2));yield*out(()=>a,()=>b);};f.run();assert.equal(f.output(),outputReport(terminalWords[0][0]+terminalWords[1][1]));
});
test('Statement TYPE reads current terminal words rather than a captured names array',()=>{
  const f=fixture(1n);f.high.write('ttydat',packAscii('ABCDE'),1,1);f.high.write('ttydat',packAscii('FGHIJ'),2,1);f.run();assert.equal(f.output(),outputReport('ABCDEFGHIJ'));
});
test('Statement TYPE KIND can alias P and therefore observe the entry assignment',()=>{
  const f=fixture();finish(f.type.run(f.type.symbols.p));assert.equal(f.output(),optionReport());assert.equal(f.m.read(f.type.symbols.p),2n);
});
test('Statement TYPE second KIND comparison reads an argument changed after the first comparison',()=>{
  const f=fixture(0n),compare=f.type.io.compare;let calls=0;f.type.io.compare=function*(...a){const result=yield*compare(...a);if(++calls===1)yield 'kind-compared';return result;};const g=f.type.run(f.type.symbols.kind);assert.equal(g.next().value,'kind-compared');f.m.write(f.type.symbols.kind,2n);finish(g);assert.equal(f.output(),optionReport());
});
test('Statement TYPE P is reread between raw EQUAL calls',()=>{
  const f=fixture(0n,'TYPE WRONG OPTION'),equal=f.type.io.equal;f.type.io.equal=function*(a,key){const result=yield*equal(a,key);if(key==='O')f.m.write(f.type.symbols.p,3n);return result;};f.run();assert.equal(f.output(),optionReport());
});
test('Statement TYPE assignment failure precedes any KIND or output processing',()=>{
  const f=fixture(1n);f.type.io.assign=function*(){throw new Error('assignment fault');};assert.throws(f.run,/assignment fault/);assert.equal(f.m.read(f.type.symbols.p),88n);assert.equal(f.output(),'');
});
test('Statement TYPE raw EQUAL failure preserves the entry P assignment',()=>{
  const f=fixture();f.type.io.equal=function*(){throw new Error('equal fault');};assert.throws(f.run,/equal fault/);assert.equal(f.m.read(f.type.symbols.p),2n);assert.equal(f.output(),'');
});
test('Statement TYPE GTKN failure retains the already-written prompt and P',()=>{
  const f=fixture(0n,'TYPE');f.type.io.gtkn=function*(){throw new Error('input fault');};assert.throws(f.run,/input fault/);assert.equal(f.output(),M.type01.text);assert.equal(f.m.read(f.type.symbols.p),2n);
});
test('Statement TYPE terminal output failure preserves the preceding report',()=>{
  const f=fixture(1n);f.type.io.out2w=function*(){throw new Error('terminal words fault');};assert.throws(f.run,/terminal words fault/);assert.ok(f.output().endsWith(M.set008.text));assert.equal(f.m.read(f.type.symbols.p),2n);
});
test('Statement TYPE OPTION raw CRLF observes the shared blank-line state',()=>{
  const f=fixture(2n);f.low.write('blank',0n);f.run();assert.equal(f.output(),optionReport(true));
});
test('Statement TYPE does not add a flag exit after GTKN before using its tokens',()=>{
  const f=fixture(0n,'TYPE');f.type.io.gtkn=function*(){f.low.write('ccflg',-1n);f.low.write('hungup',-1n);f.low.write('tknlst',packAscii('OPTIO'),1);f.low.write('typlst',BigInt(K.KALF),1);};
  // Output is observed at the statement boundary; monitor HUNGUP behavior is
  // independently exercised by the raw output tests.
  const calls:string[]=[];f.type.io.out=function*(key){calls.push(key);};f.type.io.crlf=function*(){calls.push('crlf');};f.run();assert.deepEqual(calls,['type01','crlf','decver','type06','type07']);assert.equal(f.m.read(f.type.symbols.p),1n);
});
test('PREGAM TYPE leaves missing KIND semantics unresolved unless explicitly bound',()=>{
  const f=pregameRuntimeFixture(['PREGAME','TYPE OUTPUT','ACTIVATE']);assert.throws(()=>driveInitial(f),/requires zero-argument TYPE binding/);assert.equal(f.m.read(f.type.symbols.p),88n);
});
test('PREGAM TYPE with explicit fixture argument binding composes raw report and resumes commands',()=>{
  const f=pregameRuntimeFixture(['PREGAME','TYPE OPTION','ACTIVATE']);f.typeBinding.kind=f.type.symbols.kind;driveInitial(f);assert.ok(f.text().includes(M.decver.text));assert.equal(f.m.read(f.pregame.locals.n),1n);assert.equal(f.low.read('who'),0n);
});
test('PREGAM TYPE raw prompt consumes a slash-tail switch before ACTIVATE',()=>{
  const f=pregameRuntimeFixture(['PREGAME/TYPE/OPTION/ACTIVATE']);f.typeBinding.kind=f.type.symbols.kind;driveInitial(f);assert.ok(f.text().includes(M.type01.text));assert.ok(f.text().includes(M.decver.text));assert.equal(f.wait.operands.length,0);
});
test('PREGAM TYPE uses buffered INI input through the same explicit call binding',()=>{
  const f=pregameRuntimeFixture([]);f.typeBinding.kind=f.type.symbols.kind;f.ini.install();f.ini.load('PREGAME/TYPE OPTION/ACTIVATE\n');driveInitial(f);assert.ok(f.text().includes(M.decver.text));assert.equal(f.editor.events.filter(e=>e==='inchwl').length,0);
});
test('DECWAR slot 30 passes KIND=0 to TYPE and preserves PTIME',()=>{
  const f=fixture(99n,'TYPE OPTION'),ctx={who:1,player:-1n,ptime:99n,shared:{players:f.views.high.players}};finish(dispatchCommand(ctx,30,{
    *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},*invoke(call){assert.deepEqual(call,{routine:'type',argument:0});f.m.write(f.type.symbols.kind,BigInt(call.argument as number));yield*f.type.run(f.type.symbols.kind);},*leave(){throw new Error('unexpected leave');},*finishTurn(){throw new Error('unexpected timed turn');},movementContinuation(){throw new Error('unexpected movement');},
  }));assert.equal(ctx.ptime,99n);assert.equal(f.output(),optionReport());
});
