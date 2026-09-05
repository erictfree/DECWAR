import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture as fixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { messages as M } from '../src/generated/source-data.ts';
import { pregameLiterals } from '../src/game/pregame.ts';
import { sourceFile } from '../tools/source.ts';
import { packAscii,packSixbit,signed36 } from '../src/compat/word36.ts';

test('Statement PREGAM blank initial NTOK returns after JOBSTA over actual LOCAL words',()=>{
  const f=fixture(['']);driveInitial(f);assert.deepEqual(Array.from(f.pregame.sharedLocal.identity.words),[7n,signed36(packSixbit('PLAYER')),0n,9n,10n,1200n]);assert.equal(f.pregame.sharedLocal.words[3],9n);assert.equal(f.m.read(f.pregame.locals.n),77n);assert.deepEqual(f.pregame.events,['jobsta','ttyon','strtup','gtkn']);assert.equal(f.text(),M.strtup.text+'\r');
});
test('Statement PREGAM initial input and ACTIVATE compose raw XGTCMD and retain caller N',()=>{
  const f=fixture();driveInitial(f);assert.equal(f.m.read(f.pregame.locals.n),1n);assert.equal(f.low.read('who'),0n);assert.equal(f.pregame.events.at(-1),'prgnam:DECWAR');assert.equal(f.text(),M.strtup.text+'\r'+M.pgame1.text+'\r\n'+pregameLiterals.honorInstruction.text+'\r\n'+pregameLiterals.documentInstruction.text+'\r\n'+pregameLiterals.documentInstructionEnd.text+'\r\n\r\nPG> \r');
});
test('Statement PREGAM initial HELP invokes raw HLPXTR/HLPALL and repeats the prompt',()=>{
  const f=fixture(['HELP','']);driveInitial(f);assert.equal(f.pregame.events.filter(e=>e==='ttyon').length,3);assert.deepEqual(f.pregame.events.filter(e=>e==='hlpxtr'||e==='hlpall'),['hlpxtr','hlpall']);assert.ok(f.text().includes('CTL-C               INTRO'));assert.ok(f.text().includes('Commands are:'));assert.equal(f.pregame.events.filter(e=>e==='strtup').length,2);assert.ok(!f.pregame.events.includes('xgtcmd'));
});
test('Statement PREGAM unknown initial input retries without initializing N or running XGTCMD',()=>{
  const f=fixture(['UNKNOWN','']);driveInitial(f);assert.equal(f.m.read(f.pregame.locals.n),77n);assert.equal(f.pregame.events.filter(e=>e==='strtup').length,2);assert.deepEqual(f.pregame.events.filter(e=>e.startsWith('equal:')),['equal:HONORROLL','equal:HELP','equal:PREGAME']);
});
test('Statement PREGAM initial HONORROLL passes logical true then restarts at TTYON',()=>{
  const f=fixture(['HO','']),invoke=f.pregame.io.invoke;f.pregame.io.invoke=function*(call){if(call.routine==='shosta'){assert.deepEqual(call,{routine:'shosta',argument:true});f.pregame.events.push('honor');return;}yield*invoke(call);};driveInitial(f);assert.ok(f.pregame.events.includes('honor'));assert.ok(!f.pregame.events.includes('equal:HELP'));assert.equal(f.pregame.events.filter(e=>e==='ttyon').length,2);
});
test('Statement PREGAM JOBSTA can yield between writes to shared identity fields',()=>{
  const f=fixture(['']);f.pregame.io.jobsta=function*(addresses){assert.deepEqual(addresses,Array.from({length:6},(_,i)=>f.pregame.locals.identity+BigInt(i)));f.m.write(addresses[0],55n);yield 'jobsta';f.m.write(addresses[3],66n);};const g=f.pregame.run();assert.equal(g.next().value,'jobsta');assert.equal(f.pregame.sharedLocal.identity.job,55n);assert.equal(f.pregame.sharedLocal.identity.ppn,0n);finish(g);assert.equal(f.pregame.sharedLocal.identity.ppn,66n);
});
test('Statement PREGAM Ctrl-C after JOBSTA transfers before the initial prompt',()=>{
  const f=fixture(),jobsta=f.pregame.io.jobsta;f.pregame.io.jobsta=function*(a){yield*jobsta(a);f.ini.state.ccflg=-1n;};assert.throws(()=>driveInitial(f),/MONIT transfer/);assert.equal(f.text(),'');assert.deepEqual(f.pregame.events,['jobsta','monit']);
});
for(const field of ['ccflg','hungup'] as const)test(`Statement PREGAM ${field} after GTKN precedes the NTOK test`,()=>{
  const f=fixture(['']),gtkn=f.pregame.io.gtkn;f.pregame.io.gtkn=function*(){yield*gtkn();f.low.write(field,-1n);};assert.throws(()=>driveInitial(f),/MONIT transfer/);assert.ok(!f.pregame.events.some(e=>e.startsWith('equal:')));assert.equal(f.m.read(f.pregame.locals.n),77n);
});
test('Statement PREGAM a returning MONIT resumes before NTOK and can return blank input',()=>{
  const f=fixture(['']),gtkn=f.pregame.io.gtkn;f.pregame.io.gtkn=function*(){yield*gtkn();f.ini.state.hungup=-1n;};f.pregame.io.monit=function*(){yield 'monit';};const g=f.pregame.run();assert.equal(g.next().value,'monit');finish(g);assert.equal(f.low.read('ntok'),0n);
});
test('Statement PREGAM raw EQUAL sees changed literal storage after preceding comparison',()=>{
  const f=fixture(['XYZ','ACTIVATE']),equal=f.pregame.io.equal;f.pregame.io.equal=function*(a,key){const result=yield*equal(a,key);if(key==='HELP')f.m.write(f.pregame.symbols.PREGAME,packAscii('XYZ'));return result;};driveInitial(f);assert.ok(f.pregame.events.includes('pgame1'));assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('Statement PREGAM NTOK zero bypasses command comparisons even with a nonempty token',()=>{
  const f=fixture(['PREGAME']),gtkn=f.pregame.io.gtkn;f.pregame.io.gtkn=function*(){yield*gtkn();f.low.write('ntok',0n);};driveInitial(f);assert.ok(!f.pregame.events.some(e=>e.startsWith('equal:')));assert.ok(!f.pregame.events.includes('pgame1'));
});
const dispatches=[{id:3,routine:'gripe'},{id:4,routine:'help'},{id:5,routine:'shosta',argument:true},{id:6,routine:'news'},{id:7,routine:'points',argument:false},{id:9,routine:'set'},{id:10,routine:'summar'},{id:11,routine:'time'},{id:12,routine:'type'},{id:13,routine:'users'},{id:14,routine:'debug'},{id:15,routine:'paswrd'}] as const;
for(const {id,...call} of dispatches)test(`Statement PREGAM dispatch slot ${id} retains the original call arguments`,()=>{
  const f=fixture(['PREGAME']);let next:number=id;const calls:unknown[]=[];f.pregame.io.xgtcmd=function*(a){f.m.write(a,BigInt(next));next=1;};f.pregame.io.invoke=function*(c){calls.push(c);};driveInitial(f);assert.deepEqual(calls,[call]);assert.equal(f.pregame.events.at(-1),'prgnam:DECWAR');
});
for(const n of [-1n,0n,1n,17n,0o777777777777n])test(`Statement PREGAM computed GOTO ${n} activates through PRGNAM`,()=>{
  const f=fixture(['PREGAME']);f.pregame.io.xgtcmd=function*(a){f.m.write(a,n);};driveInitial(f);assert.equal(f.pregame.events.at(-1),'prgnam:DECWAR');assert.equal(f.low.read('who'),0n);
});
for(const flag of [-1n,0n,1n])test(`Statement PREGAM ZAP applies the explicit logical policy to PASFLG ${flag}`,()=>{
  const f=fixture(['PREGAME']);f.low.write('pasflg',flag);let n=16;f.pregame.io.xgtcmd=function*(a){f.m.write(a,BigInt(n));n=1;};const calls:unknown[]=[];f.pregame.io.invoke=function*(c){calls.push(c);};driveInitial(f);assert.deepEqual(calls,flag<0n?[{routine:'stazap'}]:[]);
});
test('Statement PREGAM documentation command emits its required compiled literal then reacquires',()=>{
  const f=fixture(['PREGAME','DOCUMENT','ACTIVATE']);driveInitial(f);assert.ok(f.text().includes(pregameLiterals.documentMessage.text+'\r\n'));assert.equal(f.pregame.events.filter(e=>e==='xgtcmd').length,2);
});
test('Statement PREGAM QUIT returning from MONIT reenters XGTCMD',()=>{
  const f=fixture(['PREGAME','QUIT','ACTIVATE']);f.pregame.io.monit=function*(){f.pregame.events.push('returned-monit');};driveInitial(f);assert.ok(f.pregame.events.includes('returned-monit'));assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('Statement PREGAM reads N after a yielded XGTCMD before choosing its branch',()=>{
  const f=fixture(['PREGAME']);f.pregame.io.xgtcmd=function*(a){f.m.write(a,4n);yield 'command';};const g=f.pregame.run();assert.equal(g.next().value,'command');f.m.write(f.pregame.locals.n,1n);finish(g);assert.ok(!f.pregame.events.includes('help'));
});
test('Statement PREGAM failed startup OUT retains JOBSTA state and skips command input',()=>{
  const f=fixture();f.pregame.io.out=function*(){throw new Error('output fault');};assert.throws(()=>driveInitial(f),/output fault/);assert.equal(f.pregame.sharedLocal.identity.job,7n);assert.ok(!f.pregame.events.includes('gtkn'));
});
test('Statement PREGAM entry announcements stop at a failed compiled-literal output',()=>{
  const f=fixture(['PREGAME']),out=f.pregame.io.out;f.pregame.io.out=function*(key,n){if(key==='documentInstruction')throw new Error('literal fault');yield*out(key,n);};assert.throws(()=>driveInitial(f),/literal fault/);assert.ok(f.text().includes(pregameLiterals.honorInstruction.text));assert.ok(!f.text().includes(pregameLiterals.documentInstructionEnd.text));assert.ok(!f.pregame.events.includes('xgtcmd'));
});
test('Statement PREGAM PRGNAM failure leaves the ACTIVATE result without returning',()=>{
  const f=fixture();f.pregame.io.prgnam=function*(){throw new Error('program-name fault');};assert.throws(()=>driveInitial(f),/program-name fault/);assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('Statement PREGAM HELP ENERGY composes raw HELP before the next pre-game prompt',()=>{
  const f=fixture(['PREGAME','HELP ENERGY','ACTIVATE']);driveInitial(f);assert.ok(f.text().includes('Body\n'));assert.equal(f.pregame.events.filter(e=>e==='help').length,1);assert.equal(f.m.read(f.pregame.locals.n),1n);assert.equal(f.low.read('who'),0n);
});
test('Statement PREGAM NEWS displays supplied news bytes through raw file input and resumes XGTCMD',()=>{
  const f=fixture(['PREGAME','NEWS','ACTIVATE']);driveInitial(f);assert.ok(f.text().includes(sourceFile('DECWAR.NWS')));assert.equal(f.pregame.events.filter(e=>e==='news').length,1);assert.equal(f.m.read(f.pregame.locals.n),1n);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);
});
test('Statement PREGAM slash tails carry initial PREGAME into HELP and ACTIVATE without HIBER',()=>{
  const f=fixture(['PREGAME/HELP ENERGY/ACTIVATE']);driveInitial(f);assert.ok(f.text().includes('Body\n'));assert.equal(f.wait.operands.length,0);assert.equal(f.m.read(f.pregame.locals.n),1n);
});

test('Statement PREGAM password call can change privilege before a later ZAP dispatch',()=>{
  const f=fixture(['PREGAME','*PASSWORD','*ZAP','ACTIVATE']);const calls:string[]=[];f.pregame.io.invoke=function*(call){calls.push(call.routine);if(call.routine==='paswrd')f.low.write('pasflg',-1n);else assert.equal(call.routine,'stazap');};driveInitial(f);assert.deepEqual(calls,['paswrd','stazap']);assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('Statement PREGAM and command loop consume a complete INI slash line without terminal reads',()=>{
  const f=fixture([]);f.ini.install();f.ini.load('PREGAME/HELP ENERGY/ACTIVATE\n');driveInitial(f);assert.equal(f.wait.operands.length,0);assert.equal(f.editor.events.filter(e=>e==='inchwl').length,0);assert.ok(f.text().includes('Body\n'));assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('Statement PREGAM INI EOF hands command acquisition back to terminal before ACTIVATE',()=>{
  const f=fixture(['ACTIVATE']);f.ini.install();f.ini.load('PREGAME\n');driveInitial(f);assert.equal(f.ini.state.iniflg,0n);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);assert.equal(f.m.read(f.pregame.locals.n),1n);assert.ok(f.ini.events.includes('close'));
});
test('Statement PREGAM N can alias JOBSTA identity storage through the actual XGTCMD argument',()=>{
  const f=fixture();f.pregame.locals.n=f.pregame.locals.identity;driveInitial(f);assert.equal(f.pregame.sharedLocal.identity.job,1n);assert.equal(f.pregame.sharedLocal.identity.ppn,9n);
});
test('Statement PREGAM failed JOBSTA retains partial LOCAL writes and performs no prompt',()=>{
  const f=fixture();f.pregame.io.jobsta=function*(a){f.m.write(a[0],99n);throw new Error('jobsta fault');};assert.throws(()=>driveInitial(f),/jobsta fault/);assert.equal(f.pregame.sharedLocal.identity.job,99n);assert.equal(f.pregame.sharedLocal.identity.ppn,0n);assert.equal(f.text(),'');
});

test('Statement PREGAM composes raw JOBSTA name input and later commands from the same terminal queue',()=>{
  const f=fixture(['Alice','PREGAME','HELP ENERGY','ACTIVATE']);f.m.write(f.jobStatus.symbols.uscbh,0n);driveInitial(f);assert.equal(f.pregame.sharedLocal.identity.words[1],signed36(packSixbit('ALICE')));assert.equal(f.pregame.sharedLocal.identity.words[2],0n);assert.ok(f.text().startsWith('\r\nYour name please: '+M.strtup.text));assert.ok(f.text().includes('Body\n'));assert.equal(f.m.read(f.pregame.locals.n),1n);assert.equal(f.jobStatus.events.filter(e=>e==='inchwl').length,6);
});
test('Statement PREGAM waits inside JOBSTA with earlier job fields visible before the name arrives',()=>{
  const f=fixture([]);f.m.write(f.jobStatus.symbols.uscbh,0n);const g=f.pregame.run();assert.equal(g.next().value,'name-input');assert.equal(f.pregame.sharedLocal.identity.job,7n);assert.equal(f.pregame.sharedLocal.identity.ppn,9n);assert.equal(f.text(),'\r\nYour name please: ');f.editor.feed('A\n\n');driveInitial(f,g);assert.equal(f.pregame.sharedLocal.identity.words[1],signed36(packSixbit('A')));assert.equal(f.m.read(f.pregame.locals.n),77n);
});
