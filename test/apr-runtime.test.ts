import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,decwarText,gripeText } from '../src/generated/source-data.ts';
import { halfWords,packAscii,packSixbit,rightHalf,signed36 } from '../src/compat/word36.ts';
function fixture(){
  const f=pregameRuntimeFixture([]),b=f.apr;
  for(const [key,w] of [['who',1n],['team',1n],['hungup',0n],['addrck',0n],['ccflg',0n],['hcpos',0n],['blank',0n]] as const)f.low.write(key,w);
  f.high.write('gameno',0n);f.high.write('versio',21n);f.locks.write('frebie',0n);f.locks.write('locked',0n);
  f.high.write('job',halfWords(12n,34n),1,K.KPPN);f.high.write('job',packSixbit('ALICE '),1,K.KNAM1);f.high.write('job',packSixbit('SMITH '),1,K.KNAM2);
  f.high.write('names',packAscii('Lexin'),1,1);f.high.write('names',packAscii('gton '),1,2);
  f.high.write('shpcon',BigInt(K.GREEN),1,K.KSPCON);f.high.write('shpcon',12n,1,K.KVPOS);f.high.write('shpcon',34n,1,K.KHPOS);f.high.write('alive',-1n,1);f.views.high.board.setdsp(12,34,101);
  f.getCommand.trapAddress.value=0n;f.endgame.io.etim=function*(){return 2000n;};f.endgame.io.points=function*(){f.m.write(f.endgame.total,789n);};
  f.clock.push(3000n);f.input.block.write('linbuf',65n,0);f.input.block.write('linbuf',0n,1);f.file.write('seed',1n);
  b.install();const before=f.text().length;
  return {...f,b,output:()=>f.text().slice(before),run:()=>finish(b.run()),leave:()=>finish(b.leave('leave')),row:()=>f.statistics.files.stared.slice(3,13)};
}
function stopBeforeExit(f:ReturnType<typeof fixture>){f.b.exitIO.cctrap=function*(){throw new Error('stop at exit path');};}
test('APR composes capture, packed diagnostics, raw IRAN, statistics and FREE before EXIT',()=>{
  const f=fixture(),saved=Array.from({length:16},(_,i)=>f.m.read(BigInt(i)));assert.throws(f.run,/EXIT transfer/);
  const log=f.gripe.text();assert.ok(log.includes('**** Command line:\r\nA^@\r\n'));assert.ok(log.includes('122723  254000012345  254 00,012345\r\n'));
  assert.ok(log.includes(saved.slice(0,8).map(w=>BigInt.asUintN(36,w).toString(8).padStart(12,'0')).join(' ')+' \r\n'));
  assert.ok(log.includes('*** HITQL-1:'));assert.ok(log.includes('*** LOKTAB:'));assert.equal(f.gripe.writes.length,1);
  assert.ok(f.b.events.indexOf('gripe')<f.b.events.indexOf('iran:5'));assert.ok(f.output().includes(decwarText.fatal[3][0].text));assert.equal(f.file.read('seed'),260543n);assert.equal(f.m.read(f.b.locals.i),4n);
  assert.deepEqual(f.row(),[halfWords(12n,34n),packSixbit('ALICE '),packSixbit('SMITH '),packAscii('Lexin'),packAscii('gton '),123456n,789n,2000n,0n,0n].map(signed36));
  assert.equal(f.low.read('who'),0n);assert.equal(f.low.read('addrck'),-1n);assert.equal(f.high.read('job',1,K.KPPN),0n);assert.equal(f.views.high.board.disp(12,34),0);assert.equal(f.r.p,f.b.symbols.normalPushdownInitial);
  assert.ok(f.b.events.indexOf('updsta')<f.b.events.indexOf('free'));assert.equal(f.b.events.at(-1),'exit');
});
test('APR diagnostic logs original P while GRIPE uses the emergency stack frame',()=>{
  const f=fixture();stopBeforeExit(f);f.r.p=signed36(halfWords(-38n,6101n));f.m.write(6100n,0o123n);f.m.write(6101n,0o456n);
  const header=f.gripe.io.osts;f.gripe.io.osts=function*(){assert.equal(rightHalf(f.r.p),f.file.address('stabuf',128));assert.equal(f.m.read(rightHalf(f.r.p)),1000n);yield*header();};
  assert.throws(f.run,/stop at exit path/);assert.ok(f.gripe.text().includes('000000000123 000000000456 '));assert.equal(f.file.read('stabuf',17),signed36(halfWords(-38n,6101n)));assert.equal(f.r.p,f.b.symbols.normalPushdownInitial);
});
test('APR busy log suspension retains capture and erasure before any fatal random draw',()=>{
  const f=fixture();f.gripe.openResults.push({success:false,error:23n},{success:true});const g=f.b.run();assert.equal(g.next().value,'gripe-hibernate');
  assert.equal(f.low.read('addrck'),-1n);assert.equal(f.views.high.board.disp(12,34),1000);assert.equal(f.file.read('seed'),1n);assert.equal(f.statistics.writes.length,0);assert.equal(rightHalf(f.r.p),f.file.address('stabuf',128));
  assert.throws(()=>finish(g),/EXIT transfer/);assert.equal(f.gripe.writes.length,1);assert.equal(f.statistics.writes.length,1);
});
test('APR returning log error still prints the fatal story and records the death',()=>{
  const f=fixture();f.gripe.monitor.outputError=true;assert.throws(f.run,/EXIT transfer/);assert.equal(f.gripe.writes.length,0);assert.equal(f.statistics.writes.length,1);assert.ok(f.output().includes(gripeText[13].text));assert.ok(f.output().includes(decwarText.fatal[3][0].text));
});
test('APR cancellation during busy logging clears Ctrl-C then continues to fatal exit',()=>{
  const f=fixture();f.gripe.openResults.push({success:false,error:23n});const g=f.b.run();assert.equal(g.next().value,'gripe-hibernate');f.low.write('ccflg',-1n);assert.throws(()=>finish(g),/EXIT transfer/);assert.equal(f.gripe.writes.length,0);assert.equal(f.low.read('ccflg'),0n);assert.equal(f.statistics.writes.length,1);
});
test('APR reads fatal destination after log CLOSE rather than caching it before GRIPE',()=>{
  const f=fixture(),close=f.gripe.io.close;f.gripe.io.close=function*(){yield*close();f.b.install(999n);};assert.throws(f.run,/required APR target 999/);assert.equal(f.gripe.writes.length,1);assert.equal(f.file.read('seed'),1n);assert.equal(f.r.p,f.b.symbols.normalPushdownInitial);assert.equal(f.statistics.writes.length,0);
});
test('APR log CLOSE transfer leaves emergency P and log output selected',()=>{
  const f=fixture();f.gripe.closeIO.executeClose=function*(){throw new Error('CLOSE fault');};assert.throws(f.run,/CLOSE fault/);assert.equal(rightHalf(f.r.p),f.file.address('stabuf',128));assert.equal(rightHalf(f.editor.runtime.block.read('obflb')),f.gripe.symbols.grpfil);assert.equal(f.file.read('seed'),1n);assert.equal(f.statistics.writes.length,0);assert.equal(f.views.high.board.disp(12,34),1000);
});
test('APR can log a RED refusal then still follow fatal exit',()=>{
  const f=fixture();f.high.write('shpcon',BigInt(K.RED),1,K.KSPCON);assert.throws(f.run,/EXIT transfer/);assert.equal(f.gripe.writes.length,0);assert.ok(f.output().startsWith(gripeText[0].text));assert.equal(f.statistics.writes.length,1);
});
test('APR hangup retains packed diagnostics while fatal terminal output is suppressed',()=>{
  const f=fixture();f.low.write('hungup',-1n);assert.throws(f.run,/EXIT transfer/);assert.ok(f.gripe.text().includes('**** Command line:'));assert.ok(!f.output().includes(decwarText.fatal[3][0].text));assert.equal(f.statistics.writes.length,1);assert.equal(f.file.read('seed'),260543n);
});
test('APR missing zero-argument CCTRAP binding stops after logging and fatal bytes',()=>{
  const f=fixture();delete f.getCommand.trapAddress.value;assert.throws(f.run,/CCTRAP requires compiler binding/);assert.equal(f.gripe.writes.length,1);assert.ok(f.output().includes(decwarText.fatal[3][0].text));assert.equal(f.m.read(f.b.locals.txppn),77n);assert.equal(f.statistics.writes.length,0);assert.equal(f.low.read('who'),1n);
});
for(const choice of [1n,2n,3n,4n,5n,0n,6n])test(`DECWAR fatal selection ${choice} uses source FORTRAN literals through raw OUT`,()=>{
  const f=fixture();stopBeforeExit(f);f.b.exitIO.iran=function*(n){assert.equal(n,5);return choice;};assert.throws(()=>finish(f.b.leave()),/stop at exit path/);
  const index=choice>=1n&&choice<=5n?Number(choice)-1:0;assert.equal(f.output(),'\r\n'+decwarText.fatal[index].map(x=>x.text+'\r\n').join(''));assert.equal(f.m.read(f.b.locals.i),choice);assert.equal(f.low.read('addrck'),0n);
});
test('DECWAR reads actual I after compiler assignment before computed GOTO',()=>{
  const f=fixture();stopBeforeExit(f);const assign=f.b.exitIO.assign;f.b.exitIO.assign=function*(a,t,e){yield*assign(a,t,e);if(a()===f.b.locals.i)f.m.write(a(),2n);};assert.throws(()=>finish(f.b.leave()),/stop at exit path/);assert.ok(f.output().includes(decwarText.fatal[1][0].text));assert.equal(f.file.read('seed'),260543n);
});
test('DECWAR first CRLF failure precedes random draw and I assignment',()=>{
  const f=fixture();f.b.exitIO.crlf=function*(){throw new Error('CRLF fault');};assert.throws(()=>finish(f.b.leave()),/CRLF fault/);assert.equal(f.file.read('seed'),1n);assert.equal(f.m.read(f.b.locals.i),77n);assert.equal(f.statistics.writes.length,0);
});
test('DECWAR fatal message suspension retains the chosen branch despite later I changes',()=>{
  const f=fixture();stopBeforeExit(f);const out=f.b.exitIO.out;let first=true;f.b.exitIO.out=function*(item){yield*out(item);if(first){first=false;yield 'fatal-output';}};
  const g=f.b.leave();assert.equal(g.next().value,'fatal-output');f.m.write(f.b.locals.i,1n);assert.throws(()=>finish(g),/stop at exit path/);assert.ok(f.output().includes(decwarText.fatal[3].at(-1)!.text));assert.ok(!f.output().includes(decwarText.fatal[0][0].text));
});
test('DECWAR ordinary leave skips fatal RNG and preserves quitting flag in statistics',()=>{
  const f=fixture();assert.throws(f.leave,/EXIT transfer/);assert.equal(f.row()[9],signed36(halfWords(-1n,0n)));assert.equal(f.file.read('seed'),1n);assert.equal(f.m.read(f.b.locals.i),77n);assert.equal(f.low.read('who'),0n);
});
test('DECWAR identity copies reread WHO between assignments and retain prior stores',()=>{
  const f=fixture(),assign=f.b.exitIO.assign;f.high.write('job',123n,2,K.KNAM1);f.high.write('job',456n,2,K.KNAM2);f.high.write('names',789n,2,1);
  f.b.exitIO.assign=function*(a,t,e){yield*assign(a,t,e);if(a()===f.b.locals.txppn){f.low.write('who',2n);yield 'copied-ppn';}};f.b.exitIO.etim=function*(){throw new Error('stop after identity');};
  const g=f.b.leave('leave');assert.equal(g.next().value,'copied-ppn');assert.equal(f.m.read(f.b.locals.txppn),halfWords(12n,34n));assert.throws(()=>finish(g),/stop after identity/);assert.equal(f.m.read(f.b.locals.txnm1),123n);assert.equal(f.m.read(f.b.locals.txnm2),456n);assert.equal(f.m.read(f.b.locals.txsh1),789n);
});
test('DECWAR exit rereads ADDRCK after ETIM and assigns death reason before POINTS',()=>{
  const f=fixture();f.b.exitIO.etim=function*(){f.low.write('addrck',-1n);return 2000n;};f.b.exitIO.points=function*(){assert.equal(f.m.read(f.b.locals.txwhy),0n);f.low.write('addrck',0n);f.m.write(f.endgame.total,321n);};assert.throws(f.leave,/EXIT transfer/);assert.equal(f.row()[6],321n);assert.equal(f.row()[9],0n);
});
test('DECWAR exit copies actual TOTAL after POINTS and passes live local addresses',()=>{
  const f=fixture();f.b.exitIO.points=function*(){f.m.write(f.endgame.total,123n);yield 'points';};f.b.exitIO.updsta=function*(a){assert.deepEqual(a,[f.b.locals.txppn,f.b.locals.txnm1,f.b.locals.txnm2,f.b.locals.txsh1,f.b.locals.txsh2,f.b.locals.txtot,f.b.locals.txtim,f.b.locals.txwhy,f.b.locals.txtem,f.low.address('who')]);throw new Error('inspect actuals');};
  const g=f.b.leave('leave');assert.equal(g.next().value,'points');assert.equal(f.m.read(f.b.locals.txtot),77n);f.m.write(f.endgame.total,456n);assert.throws(()=>finish(g),/inspect actuals/);assert.equal(f.m.read(f.b.locals.txtot),456n);assert.equal(f.low.read('who'),1n);
});
test('DECWAR statistics failure prevents FREE, WHO clear and EXIT without rollback',()=>{
  const f=fixture();f.statistics.io.outputSTA=function*(){throw new Error('statistics fault');};assert.throws(f.leave,/statistics fault/);assert.equal(f.file.read('stabuf',3),halfWords(12n,34n));assert.equal(f.low.read('who'),1n);assert.equal(f.high.read('job',1,K.KPPN),halfWords(12n,34n));assert.ok(!f.b.events.includes('free'));assert.ok(!f.b.events.includes('exit'));
});
test('DECWAR FREE failure leaves WHO and prevents EXIT after persisted statistics',()=>{
  const f=fixture();f.b.exitIO.free=function*(a){assert.equal(a,f.low.address('who'));f.low.write('who',2n);throw new Error('FREE fault');};assert.throws(f.leave,/FREE fault/);assert.equal(f.statistics.writes.length,1);assert.equal(f.low.read('who'),2n);assert.ok(!f.b.events.includes('exit'));
});
test('APR fallback uses post-GRIPE AC0 as an indirect instruction, without selecting FMSGS',()=>{
  const f=fixture(),close=f.gripe.io.close;f.b.install(0n);f.h.put(43800n,'FALLBACK\r\n');f.m.write(43700n,43800n);
  f.gripe.io.close=function*(){yield*close();f.m.write(0n,43700n);};assert.throws(f.run,/MONIT transfer/);assert.ok(f.output().endsWith('FALLBACK\r\n'));assert.equal(f.file.read('seed'),1n);assert.equal(f.r.arg,f.b.symbols.fallbackArgument);assert.equal(f.m.read(f.m.read(f.r.arg)),5n);assert.equal(f.statistics.writes.length,0);
});
test('DECWAR ADDRCK logical test follows supplied sign policy rather than nonzero coercion',()=>{
  const f=fixture();f.low.write('addrck',1n);assert.throws(f.leave,/EXIT transfer/);assert.equal(f.row()[9],signed36(halfWords(-1n,0n)));
  const other=fixture();other.low.write('addrck',1n);other.b.exitIO.logical=w=>w!==0n;assert.throws(other.leave,/EXIT transfer/);assert.equal(other.row()[9],0n);
});
test('APR fatal exit composes actual final POINTS under an explicit DO continuation fixture',()=>{
  const f=fixture();f.points.final.continuation=function*(){return false;};f.high.write('romopt',0n);
  for(const team of [1,2]){f.high.write('numshp',1n,team);f.high.write('tmturn',1n,team);}f.high.write('shpcon',1n,1,K.KNTURN);f.high.write('score',123456n,1,1);
  f.endgame.io.points=function*(){f.m.write(f.points.dflg,-1n);yield*f.points.run();};assert.throws(f.run,/EXIT transfer/);assert.equal(f.row()[6],123456n);assert.ok(f.points.events.includes('blkset'));assert.ok(f.output().includes('Lexington'));assert.equal(f.gripe.writes.length,1);assert.equal(f.low.read('who'),0n);
});
test('DECWAR exit uses raw ETIM before FREE samples its separate monitor time',()=>{
  const f=fixture();f.high.write('job',1000n,1,K.KJOBTM);f.clock.splice(0,f.clock.length,3000n,4000n);
  f.endgame.io.etim=function*(start){return yield*f.io.etim(start());};assert.throws(f.leave,/EXIT transfer/);assert.equal(f.row()[7],2000n);assert.equal(f.clock.length,0);assert.equal(f.high.read('kilque',1,4),4000n);
});
