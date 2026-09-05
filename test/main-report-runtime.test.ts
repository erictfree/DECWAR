import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture as fixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<4000;i++){const n=g.next();if(n.done)return n.value;}throw new Error('test schedule exhausted');}

for(const [format,expected] of [[K.SHORT,'\r\nSH   100\r\n'],[K.MEDIUM,'\r\nDevice    Damage\r\n\r\nShields   100.0\r\n'],[K.LONG,'\r\nDamage Report for Lexington\r\n\r\nDevice             Damage\r\n\r\nDeflector Shields  100.0 units\r\n']] as const)test(`Main DAMA input reaches the original DAMAGE report at verbosity ${format}`,()=>{
  const f=fixture('DAMA',format);assert.equal(f.run(),'pregame');assert.deepEqual(f.main.calls,[{routine:'damage',argument:2}]);assert.deepEqual(f.reports,[expected]);assert.equal(f.high.read('shpdam',1,K.KDSHLD),1000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.clock.length,2);assert.equal(f.m.read(f.b.s.stoken),2n);
});
for(const [format,expected] of [[K.SHORT,'\r\nSH    50\r\n'],[K.MEDIUM,'\r\nDevice    Damage\r\n\r\nShields    50.0\r\n'],[K.LONG,'\r\nDamage Report for Lexington\r\n\r\nDevice             Damage\r\n\r\nDeflector Shields   50.0 units\r\n']] as const)test(`Main REPAIR DAMAGE reports before automatic repair at verbosity ${format}`,()=>{
  const f=fixture('REPAIR DAMAGE',format);assert.equal(f.run(),'pregame');assert.deepEqual(f.reports,[expected]);assert.equal(f.high.read('shpdam',1,K.KDSHLD),200n);assert.equal(f.low.read('ptime'),3900n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.m.read(f.b.s.stoken),3n);assert.ok(f.main.events.indexOf('repair-damage')<f.main.events.indexOf('automatic-repair'));
});
test('Main REPAIR numeric amount passes NTOKEN+1 temporary and filters the requested device',()=>{
  const f=fixture('REPAIR 10 DAMAGE SH');f.high.write('shpdam',2000n,1,K.KDWARP);assert.equal(f.run(),'pregame');assert.deepEqual(f.reports,['\r\nSH    90\r\n']);assert.equal(f.m.read(f.b.s.stoken),4n);assert.notEqual(f.b.s.stoken,f.main.repairLocals.ntoken);assert.equal(f.high.read('shpdam',1,K.KDSHLD),600n);assert.equal(f.high.read('shpdam',1,K.KDWARP),1600n);assert.equal(f.low.read('ptime'),700n);
});
test('Main REPAIR ALL DAMAGE reports operational devices and retains requested repair duration',()=>{
  const f=fixture('REPAIR ALL DAMAGE');f.high.write('shpdam',2000n,1,K.KDWARP);assert.equal(f.run(),'pregame');assert.deepEqual(f.reports,['\r\n'+messages.alldok.text+'\r\n']);assert.equal(f.high.read('shpdam',1,K.KDWARP),0n);assert.equal(f.low.read('ptime'),15900n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.m.read(f.b.locals.j),77n);
});
test('Main DAMAGE uses raw prefix matching for multiple devices and stops at an integer token',()=>{
  const f=fixture('DAMAGES T WA 5 SH');f.run();assert.deepEqual(f.reports,['\r\nTO     0\r\nTR     0\r\nWA     0\r\n']);assert.equal(f.m.read(f.b.locals.i),4n);assert.equal(f.clock.length,2);
});
test('Main undamaged REPAIR DAMAGE reports before its alternate return with no timed turn',()=>{
  const f=fixture('REPAIR DAMAGE');f.high.write('shpdam',0n,1,K.KDSHLD);f.clock.splice(0,f.clock.length,1100n);f.run();assert.deepEqual(f.reports,['\r\n'+messages.alldok.text+'\r\n']);assert.equal(f.low.read('ptime'),-1100n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.ok(!f.main.events.includes('timout:CMDREP'));assert.ok(!f.main.events.includes('automatic-repair'));
});
test('Main REPAIR report suspension occurs after device changes and before final ETIM',()=>{
  const f=fixture('REPAIR DAMAGE SH'),oflt=f.b.io.oflt;f.b.io.oflt=function*(a,width){yield 'report';yield*oflt(a,width);};const g=f.main.run();let step=g.next();for(let i=0;i<20&&step.value!=='report';i++){assert.ok(!step.done&&String(step.value).startsWith('hiber:'));step=g.next();}assert.equal(step.value,'report');assert.equal(f.high.read('shpdam',1,K.KDSHLD),500n);assert.equal(f.clock.length,1);assert.equal(f.low.read('ptime'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);f.clock[0]=2500n;done(g);assert.equal(f.low.read('ptime'),2500n);assert.equal(f.high.read('shpdam',1,K.KDSHLD),200n);
});
test('Main REPAIR report failure retains completed repairs without final timing or automatic repair',()=>{
  const f=fixture('REPAIR DAMAGE');f.b.io.odev=function*(){throw new Error('output transfer');};assert.throws(f.run,/output transfer/);assert.equal(f.high.read('shpdam',1,K.KDSHLD),500n);assert.equal(f.clock.length,1);assert.equal(f.low.read('ptime'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.ok(!f.main.events.includes('automatic-repair'));assert.ok(!f.main.events.includes('timout:CMDREP'));
});
test('Main DAMAGE reads shared device damage written by actual NOVA',()=>{
  const f=fixture('DAMAGES SH');for(let i=1;i<=K.KNDEV;i++)f.high.write('shpdam',0n,1,i);f.damage.draws.push(...Array(K.KNDEV).fill('.25'),'0');const nova=f.main.romulan.torpedoes.nova;f.m.write(nova.s.kind,1n);f.m.write(nova.s.index,1n);nova.io.iran=function*(){return 1n;};f.out.write('h2',9n);f.out.write('v2',20n);f.out.write('h1',10n);f.out.write('v1',20n);done(nova.run());f.high.write('hitflg',0n,1);f.run();assert.deepEqual(f.reports,['\r\nSH   100\r\n']);assert.equal(f.high.read('shpdam',1,K.KDSHLD),1000n);
});
for(const [format,expected] of [[K.SHORT,'\r\nE5000 \r\n'],[K.MEDIUM,'\r\nEner   5000.0\r\n'],[K.LONG,'\r\nEnergy left\t5000.0\r\n']] as const)test(`Main STATUS ENERGY reuses shared status/output bindings at verbosity ${format}`,()=>{
  const f=fixture('STATUS ENERGY',format);f.run();assert.deepEqual(f.reports,[expected]);assert.deepEqual(f.main.calls,[{routine:'status',argument:2}]);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.clock.length,2);
});
test('Main full STATUS retains source token rewriting and current ship fields',()=>{
  const f=fixture('STATUS');f.high.write('shpcon',BigInt(K.GREEN),1,K.KSPCON);f.high.write('shpcon',1n,1,K.KSHCON);f.high.write('shpcon',1000n,1,K.KSSHPC);f.run();assert.deepEqual(f.reports,['\r\nSD1 G 10-20 T10 E5000 D0 SH+100 ROn \r\n']);assert.equal(f.low.read('typlst',9),BigInt(K.KEOL));assert.equal(f.m.read(f.statusReport.stoken),2n);
});
test('Main RADIO OFF then STATUS RADIO reads the shared mask through compound input',()=>{
  const f=fixture('RADIO OFF/STATUS RADIO',K.SHORT,2);f.run();assert.deepEqual(f.main.calls.map(c=>c.routine),['radio','status']);assert.equal(f.reports[1],'\r\nROff \r\n');assert.equal(f.high.read('nomsg'),1n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
test('Main TIME uses shared clocks and original five-line output without a timed turn',()=>{
  const f=fixture('TIME');f.high.write('tim0',1000n);f.high.write('job',2000n,1,K.KJOBTM);f.high.write('job',1000n,1,K.KRUNTM);f.clock.splice(0,f.clock.length,10000n,12000n,3661999n);f.main.time.runs.push(5000n,7000n);f.run();assert.deepEqual(f.reports,["\r\nGame's elapsed time:  00:00:09\r\nShip's elapsed time:  00:00:10\r\nRun time in game:     00:00:04\r\nJob's total run time: 00:00:07\r\nCurrent time of day:  01:01:01\r\n"]);assert.equal(f.clock.length,0);assert.equal(f.main.time.runs.length,0);assert.equal(f.m.read(f.main.time.s.d),3661999n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
test('Shared pregame TIME binding skips ship fields and uses the same raw clock/output path',()=>{
  const f=fixture('');f.low.write('who',0n);f.high.write('tim0',1000n);f.clock.splice(0,f.clock.length,10000n,3661999n);f.main.time.runs.push(7000n);const start=f.text().length;done(f.pregame.io.invoke({routine:'time'}));assert.equal(f.text().slice(start),"\r\nGame's elapsed time:  00:00:09\r\nJob's total run time: 00:00:07\r\nCurrent time of day:  01:01:01\r\n");assert.equal(f.clock.length,0);assert.equal(f.main.time.runs.length,0);
});
test('Main TIME missing RUNTIM service outcome stops at the original call boundary',()=>{
  const f=fixture('TIME');f.clock.splice(0,f.clock.length,10000n,12000n,3661999n);assert.throws(f.run,/TIME requires scheduled RUNTIM/);assert.equal(f.clock.length,1);assert.equal(f.m.read(f.main.time.s.d),77n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.ok(!f.main.events.includes('timout:CMDTIM'));
});
