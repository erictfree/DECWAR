import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M,terminalWords } from '../src/generated/source-data.ts';
import { halfWords,packAscii } from '../src/compat/word36.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
function fixture(line='SET OUTPUT LONG',responses:string[]=[]){
  const f=pregameRuntimeFixture([]);for(const text of [line,...responses])f.editor.feed(text+'\n');finish(f.tokens.run());
  for(const field of ['oflg','prtype','scnflg','icflg','ocflg'])f.low.write(field,0n);f.low.write('ttytyp',8n);f.low.write('pasflg',0n);
  const before=f.text().length;return {...f,run:()=>finish(f.set.run()),output:()=>f.text().slice(before)};
}
for(const [option,word,field,result] of [
  ['OUTPUT','SHORT','oflg',K.SHORT],['OUTPUT','MEDIUM','oflg',K.MEDIUM],['OUTPUT','LONG','oflg',K.LONG],
  ['PROMPT','NORMAL','prtype',0],['PROMPT','INFORMATIVE','prtype',-1],['SCANS','SHORT','scnflg',K.SHORT],['SCANS','LONG','scnflg',K.LONG],
  ['ICDEF','ABSOLUTE','icflg',K.KABS],['ICDEF','RELATIVE','icflg',K.KREL],['OCDEF','ABSOLUTE','ocflg',K.KABS],['OCDEF','RELATIVE','ocflg',K.KREL],['OCDEF','BOTH','ocflg',K.KBOTH],
] as const)test(`Statement SET ${option} ${word} updates the actual setting`,()=>{
  const f=fixture(`SET ${option} ${word}`);f.low.write(field,99n);f.run();assert.equal(f.low.read(field),BigInt(result));assert.equal(f.output(),'');assert.equal(f.m.read(f.set.locals.p),2n);
});
for(const option of ['OUTPUT','PROMPT','SCANS','ICDEF','OCDEF'])test(`Statement SET ${option} unknown alphabetic value returns silently`,()=>{
  const f=fixture(`SET ${option} WRONG`);f.run();assert.equal(f.output(),'');assert.ok(!f.set.events.includes('gtkn'));
});
test('Statement SET switch search takes first prefix match rather than inventing ambiguity handling',()=>{
  const f=fixture('SET O LONG');f.run();assert.equal(f.low.read('oflg'),1n);assert.equal(f.low.read('ocflg'),0n);
});
test('Statement SET prompts for switch then value using the same terminal queue',()=>{
  const f=fixture('SET',['OUTPUT','SHORT']);f.run();assert.equal(f.low.read('oflg'),-1n);assert.equal(f.m.read(f.set.locals.p),0n);assert.equal(f.output(),M.set001.text+'\r'+M.set003.text+'\r');
});
test('Statement SET blank switch response returns before P=1',()=>{
  const f=fixture('SET',['']);f.run();assert.equal(f.m.read(f.set.locals.p),2n);assert.equal(f.output(),M.set001.text+'\r');
});
test('Statement SET blank value response returns before P=0',()=>{
  const f=fixture('SET OUTPUT',['']);f.run();assert.equal(f.m.read(f.set.locals.p),2n);assert.equal(f.low.read('oflg'),0n);assert.equal(f.output(),M.set003.text+'\r');
});
test('Statement SET nonalpha value retries without attempting value comparison',()=>{
  const f=fixture('SET OUTPUT 123',['456','LONG']);f.run();assert.equal(f.low.read('oflg'),1n);assert.equal(f.set.events.filter(e=>e==='set003').length,2);
});
for(const word of ['ACT','WRONG'])test(`Statement SET TTYTYPE ${word} retains partial index after blank cancellation`,()=>{
  const f=fixture('SET TTYTYPE '+word,['']);f.run();assert.equal(f.low.read('ttytyp'),word==='ACT'?1n:0n);assert.equal(f.m.read(f.set.locals.i),word==='ACT'?5n:BigInt(K.KNTTY+1));
  assert.equal(f.output(),(word==='ACT'?M.set009.text:'')+M.set010.text+'\r\n\r\n'+M.ttys00.text+'\r\n\r\n'+M.set008.text+'\r');
});
for(const [i,words] of terminalWords.entries())test(`Statement SET TTYTYPE current table entry ${i+1} ${words[0]}`,()=>{
  const f=fixture('SET TTYTYPE '+words.join('').trim());f.run();assert.equal(f.low.read('ttytyp'),BigInt(i+1));assert.equal(f.m.read(f.set.locals.i),BigInt(K.KNTTY+1));assert.equal(f.output(),'');
});
test('Statement SET TTYTYPE retries ambiguous input before accepting a unique name',()=>{
  const f=fixture('SET TTYTYPE ACT',['CRT']);f.run();assert.equal(f.low.read('ttytyp'),8n);assert.equal(f.m.read(f.set.locals.p),0n);
});
test('Statement SET terminal scan reads actual TTYDAT rather than the extracted host table',()=>{
  const f=fixture('SET TTYTYPE FRESH');f.high.write('ttydat',packAscii('FRESH'),1,3);f.run();assert.equal(f.low.read('ttytyp'),3n);
});
test('Statement SET separate value comparisons can all match changed source text and retain the last assignment',()=>{
  const f=fixture('SET OUTPUT MATCH');for(const key of ['shtfrm','medfrm','lngfrm'] as const)f.m.write(f.set.symbols[key],packAscii('MATCH'));const values:bigint[]=[],assign=f.set.io.assign;
  f.set.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.low.address('oflg'))values.push(f.low.read('oflg'));};f.run();assert.deepEqual(values,[-1n,0n,1n]);
});
test('Statement SET rereads P after a value assignment before the next comparison',()=>{
  const f=fixture('SET OUTPUT SHORT LONG'),assign=f.set.io.assign;f.set.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.low.address('oflg')&&f.low.read('oflg')===-1n)f.m.write(f.set.locals.p,3n);};f.run();assert.equal(f.low.read('oflg'),1n);
});
test('Statement SET TTYTYPE ambiguity observes a changed current TTYTYP after EQUAL',()=>{
  const f=fixture('SET TTYTYPE CRT',['']),equal=f.set.io.equal;f.set.io.equal=function*(a,b){const result=yield*equal(a,b);if(b===f.high.address('ttydat',1,8))f.low.write('ttytyp',4n);return result;};f.run();assert.equal(f.low.read('ttytyp'),4n);assert.ok(f.set.events.includes('set009'));
});
test('Statement SET private switch gate uses explicit NOT policy',()=>{
  const f=fixture('SET ROMOPT',['']);f.low.write('pasflg',-2n);f.set.io.not=()=>true;f.run();assert.ok(f.set.events.includes('set001'));assert.ok(!f.set.events.includes('equal:'+f.set.symbols.ROMOPT));
});
test('Statement SET ROMOPT uses the compiler true-to-integer assignment policy',()=>{
  const f=fixture('SET ROMOPT');f.low.write('pasflg',-2n);f.set.io.assignTrue=function*(d){f.m.write(d(),1n);};f.run();assert.equal(f.high.read('romopt'),1n);assert.equal(f.output(),'');
});
test('Statement SET ENDFLG assignment precedes composed ENDGAM and its exit',()=>{
  const f=fixture('SET ENDFLG');f.low.write('pasflg',-2n);f.high.write('endflg',0n);assert.throws(f.run,/EXIT transfer/);assert.equal(f.high.read('endflg'),-1n);
});
test('Statement SET NAME passes actual P then literal zero after prompted raw input',()=>{
  const f=fixture('SET NAME',['Alice']);const args:unknown[]=[];f.set.io.usrnam=function*(a){args.push(a);if('address'in a){assert.equal(f.m.read(a.address),2n);return 0n;}return -1n;};f.run();assert.deepEqual(args,[{address:f.set.locals.p},{zero:0}]);assert.equal(f.output(),M.set002.text+'\r');
});
test('Statement SET NAME first successful USRNAM returns without requesting another line',()=>{
  const f=fixture('SET NAME Alice');f.set.io.usrnam=function*(a){assert.deepEqual(a,{address:f.set.locals.p});return -1n;};f.run();assert.equal(f.output(),'');assert.ok(!f.set.events.includes('gtkn'));
});
test('Statement SET NAME does not guard the second USRNAM call on blank input',()=>{
  const f=fixture('SET NAME',['']);let calls=0;f.set.io.usrnam=function*(){calls++;return 0n;};f.run();assert.equal(calls,2);assert.equal(f.output(),M.set002.text+'\r');
});
test('Statement SET assignment failure retains prior private P and settings',()=>{
  const f=fixture();f.set.io.assign=function*(){throw new Error('assign fault');};assert.throws(f.run,/assign fault/);assert.equal(f.m.read(f.set.locals.p),88n);assert.equal(f.low.read('oflg'),0n);
});
test('Statement SET value comparison failure retains an earlier setting assignment',()=>{
  const f=fixture('SET OUTPUT SHORT'),equal=f.set.io.equal;f.set.io.equal=function*(a,b){if(b===f.set.symbols.medfrm)throw new Error('equal fault');return yield*equal(a,b);};assert.throws(f.run,/equal fault/);assert.equal(f.low.read('oflg'),-1n);
});
test('Statement SET BHREMV traverses packed board in source order and preserves BLHOPT and nonholes',()=>{
  const f=fixture('SET BHREMV');f.low.write('pasflg',-2n);f.high.write('blhopt',-1n);const board=f.views.high.board;board.setdsp(1,2,K.DXBHOL*100);board.setdsp(K.KGALV,K.KGALH,K.DXBHOL*100);board.setdsp(1,3,101);f.run();
  assert.equal(board.disp(1,2),0);assert.equal(board.disp(K.KGALV,K.KGALH),0);assert.equal(board.disp(1,3),101);assert.equal(f.high.read('blhopt'),-1n);
  const reads=f.set.events.filter(e=>e.startsWith('dispc:'));assert.equal(reads.length,K.KGALV*K.KGALH);assert.deepEqual(reads.slice(0,3),['dispc:1,1','dispc:1,2','dispc:1,3']);assert.equal(reads.at(-1),`dispc:${K.KGALV},${K.KGALH}`);assert.equal(f.m.read(f.set.locals.i),BigInt(K.KGALV+1));assert.equal(f.m.read(f.set.locals.j),BigInt(K.KGALH+1));
});
test('Statement SET BHREMV required DO policy can suppress entry without clearing a cell',()=>{
  const f=fixture('SET BHREMV');f.low.write('pasflg',-2n);f.set.io.enterLoop=()=>false;f.run();assert.ok(!f.set.events.some(e=>e.startsWith('dispc:')));assert.equal(f.m.read(f.set.locals.i),1n);assert.equal(f.m.read(f.set.locals.j),88n);
});
test('Statement SET BHREMV failure retains earlier board clearing and current loop words',()=>{
  const f=fixture('SET BHREMV');f.low.write('pasflg',-2n);const board=f.views.high.board;board.setdsp(1,1,K.DXBHOL*100);board.setdsp(1,2,K.DXBHOL*100);const set=f.set.io.setdsp;
  f.set.io.setdsp=function*(v,h,z){if(f.m.read(h)===2n)throw new Error('second hole fault');yield*set(v,h,z);};assert.throws(f.run,/second hole fault/);assert.equal(board.disp(1,1),0);assert.equal(board.disp(1,2),K.DXBHOL*100);assert.equal(f.m.read(f.set.locals.i),1n);assert.equal(f.m.read(f.set.locals.j),2n);
});
test('Statement SET BHREMV rereads coordinates through arguments after DISPC suspension',()=>{
  const f=fixture('SET BHREMV');f.low.write('pasflg',-2n);f.set.io.dispc=function*(){yield 'cell-read';return BigInt(K.DXBHOL);};f.set.io.setdsp=function*(v,h,z){assert.equal(f.m.read(v),4n);assert.equal(f.m.read(h),5n);assert.equal(z,0);throw new Error('stop after coordinates');};const g=f.set.run();assert.equal(g.next().value,'cell-read');f.m.write(f.set.locals.i,4n);f.m.write(f.set.locals.j,5n);assert.throws(()=>finish(g),/stop after coordinates/);
});
test('PREGAM SET updates TYPE report through the same live settings and slash input',()=>{
  const f=pregameRuntimeFixture(['PREGAME/SET OUTPUT SHORT/TYPE OUTPUT/ACTIVATE']);f.typeBinding.kind=f.type.symbols.kind;driveInitial(f);assert.equal(f.low.read('oflg'),-1n);assert.ok(f.text().includes(M.shtfrm.text+M.type03.text));assert.equal(f.wait.operands.length,0);assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('PREGAM JOBSTA PASWRD SET ROMOPT TYPE OPTION composes identity, privilege and option state',()=>{
  const f=pregameRuntimeFixture(['PREGAME','*PASSWORD *MINK','SET ROMOPT','TYPE OPTION','ACTIVATE']);f.jobStatus.ppns.splice(0,2,halfWords(0o337n,1n),halfWords(0o337n,1n));f.high.write('romopt',0n);f.typeBinding.kind=f.type.symbols.kind;driveInitial(f);assert.equal(f.high.read('romopt'),-1n);assert.ok(f.text().includes(M.setu06.text));
});
test('PREGAM SET and TYPE use buffered INI input with shared settings',()=>{
  const f=pregameRuntimeFixture([]);f.typeBinding.kind=f.type.symbols.kind;f.ini.install();f.ini.load('PREGAME/SET PROMPT INFORMATIVE/TYPE OUTPUT/ACTIVATE\n');driveInitial(f);assert.equal(f.low.read('prtype'),-1n);assert.ok(f.text().includes(M.inform.text+M.type04.text));assert.equal(f.editor.events.filter(e=>e==='inchwl').length,0);
});
test('PREGAM unknown TTYTYPE followed by cancellation makes TYPE display the physical XHELP alias',()=>{
  const f=pregameRuntimeFixture(['PREGAME','SET TTYTYPE WRONG','','TYPE OUTPUT','ACTIVATE']);f.typeBinding.kind=f.type.symbols.kind;driveInitial(f);assert.equal(f.low.read('ttytyp'),0n);assert.ok(f.text().includes(M.set008.text+'PRegame   \r\n'));
});
test('DECWAR slot 20 composes SET without a timed turn',()=>{
  const f=fixture('SET OUTPUT SHORT'),ctx={who:1,player:-1n,ptime:99n,shared:{players:f.views.high.players}};finish(dispatchCommand(ctx,20,{
    *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},*invoke(call){assert.deepEqual(call,{routine:'set'});yield*f.set.run();},*leave(){throw new Error('unexpected leave');},*finishTurn(){throw new Error('unexpected timed turn');},movementContinuation(){throw new Error('unexpected movement');},
  }));assert.equal(f.low.read('oflg'),-1n);assert.equal(ctx.ptime,99n);
});
