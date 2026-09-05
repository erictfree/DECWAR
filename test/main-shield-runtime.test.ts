import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<4000;i++){const n=g.next();if(n.done)return n.value;}throw new Error('test schedule exhausted');}
function fixture(line:string){const f=mainCommandFixture(line),b=f.main.shield;f.high.write('shpdam',0n,1,K.KDSHLD);f.high.write('shpcon',500n,1,K.KSSHPC);f.high.write('shpcon',-1n,1,K.KSHCON);return {...f,b};}
function respond(f:ReturnType<typeof fixture>,...lines:string[]){const gtkn=f.b.io.gtkn;f.b.io.gtkn=function*(){assert.ok(lines.length,'unscheduled SHIELD input');f.editor.feed(lines.shift()!+'\n');yield*gtkn();};}
test('Main SHIELDS UP raises shields, charges repeated use and remains untimed',()=>{
  const f=fixture('SHIELDS UP');f.high.write('shpcon',1n,1,K.KSHCON);f.run();assert.deepEqual(f.reports,['\r\n'+M.shld06.text+'\r\n']);assert.equal(f.high.read('shpcon',1,K.KSHCON),1n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),49000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.clock.length,2);assert.equal(f.m.read(f.b.senrgy),77n);
});
for(const d of [BigInt(K.KCRIT),BigInt(K.KCRIT+1)])test(`Main SHIELD UP uses strict critical threshold at ${d}`,()=>{
  const f=fixture('SHIELD UP');f.high.write('shpdam',d,1,K.KDSHLD);f.run();assert.equal(f.high.read('shpcon',1,K.KSHCON),d===BigInt(K.KCRIT)?1n:-1n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),d===BigInt(K.KCRIT)?49000n:50000n);assert.deepEqual(f.reports,['\r\n'+(d===BigInt(K.KCRIT)?M.shld06.text:M.shld09.text)+'\r\n']);
});
test('Main SHIELD UP sends actual paired tractor release before the zero-energy message',()=>{
  const f=fixture('SHIELD UP');f.high.write('shpcon',500n,1,K.KSNRGY);f.high.write('trstat',2n,1);f.high.write('trstat',1n,2);f.run();assert.equal(f.high.read('shpcon',1,K.KSNRGY),0n);assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',2),0n);assert.equal(f.high.read('hitflg',2),1n);assert.deepEqual(f.b.events,['shld06','trcoff','shld07']);assert.deepEqual(f.reports,['\r\n'+M.shld06.text+'\r\n'+M.shld07.text+'\r\n']);
});
test('Main SHIELD DOWN changes only shield condition and reports original text',()=>{
  const f=fixture('SHIELD DOWN');f.high.write('shpcon',1n,1,K.KSHCON);f.run();assert.equal(f.high.read('shpcon',1,K.KSHCON),-1n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),50000n);assert.deepEqual(f.reports,['\r\n'+M.shld08.text+'\r\n']);
});
for(const amount of ['1','-1'])test(`Main shield transfer ${amount} retains integer scaling and lost fractional shield energy`,()=>{
  const f=fixture('SHIELD TRANSFER '+amount);f.high.write('shpcon',20000n,1,K.KSNRGY);f.run();assert.equal(f.m.read(f.b.senrgy),BigInt(amount)*10n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),500n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),20000n-BigInt(amount)*10n);assert.deepEqual(f.reports,['\r\n'+M.shld05.text+'\r\n']);
});
test('Main shield transfer caps shield capacity before deciding whether to confirm',()=>{
  const f=fixture('SHIELD TRANSFER 99999');f.high.write('shpcon',1000n,1,K.KSNRGY);f.high.write('shpcon',999n,1,K.KSSHPC);f.run();assert.equal(f.m.read(f.b.senrgy),25n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),1000n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),975n);assert.ok(!f.b.events.includes('gtkn'));assert.equal(f.high.read('shpcon',1,K.KSPCON),BigInt(K.YELLOW));
});
test('Main shield negative transfer caps reserves, lowers empty shields and preserves ship capacity',()=>{
  const f=fixture('SHIELD TRANSFER -9999');f.high.write('shpcon',10000n,1,K.KSNRGY);f.run();assert.equal(f.m.read(f.b.senrgy),-12500n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),0n);assert.equal(f.high.read('shpcon',1,K.KSHCON),-1n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),22500n);
  const g=fixture('SHIELD TRANSFER -9999');g.high.write('shpcon',49990n,1,K.KSNRGY);g.run();assert.equal(g.m.read(g.b.senrgy),-10n);assert.equal(g.high.read('shpcon',1,K.KSSHPC),500n);assert.equal(g.high.read('shpcon',1,K.KSNRGY),50000n);
});
test('Main prompted SHIELD action and amount use token positions one and two',()=>{
  const f=fixture('SHIELD');f.high.write('shpcon',20000n,1,K.KSNRGY);respond(f,'TRANSFER 100');f.run();assert.equal(f.high.read('shpcon',1,K.KSSHPC),540n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),19000n);assert.deepEqual(f.b.events,['shld01','gtkn','shld05']);assert.ok(f.reports[0].includes(M.shld01.text));
});
test('Main prompted SHIELD transfer amount uses first token and preserves source prompt loop',()=>{
  const f=fixture('SHIELD BAD');f.high.write('shpcon',20000n,1,K.KSNRGY);respond(f,'BAD','TRANSFER','100');f.run();assert.deepEqual(f.b.events,['shld01','gtkn','shld01','gtkn','shld02','gtkn','shld05']);assert.equal(f.high.read('shpcon',1,K.KSSHPC),540n);
});
test('Main inline TRANSFER without integer amount prompts separately and cancels on noninteger',()=>{
  const f=fixture('SHIELD TRANSFER');respond(f,'NO');f.run();assert.deepEqual(f.b.events,['shld02','gtkn']);assert.equal(f.high.read('shpcon',1,K.KSNRGY),50000n);assert.equal(f.m.read(f.b.senrgy),77n);
});
for(const answer of ['Y','NO'])test(`Main shield equal-energy confirmation ${answer} preserves raw YES matching`,()=>{
  const f=fixture('SHIELD TRANSFER 100');f.high.write('shpcon',1000n,1,K.KSNRGY);respond(f,answer);f.run();assert.equal(f.high.read('shpcon',1,K.KSNRGY),answer==='Y'?0n:1000n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),answer==='Y'?540n:500n);assert.deepEqual(f.b.events,['shld03','gtkn',answer==='Y'?'shld05':'shld04']);
});
test('Main shield confirmation rereads current reserves before applying the saved amount',()=>{
  const f=fixture('SHIELD TRANSFER 100');f.high.write('shpcon',1000n,1,K.KSNRGY);respond(f,'YES');const gtkn=f.b.io.gtkn;f.b.io.gtkn=function*(){yield*gtkn();f.high.write('shpcon',2000n,1,K.KSNRGY);};f.run();assert.equal(f.high.read('shpcon',1,K.KSNRGY),1000n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),540n);
});
test('Main shield transfer output failure keeps both stores but skips later condition updates',()=>{
  const f=fixture('SHIELD TRANSFER 100');f.high.write('shpcon',10000n,1,K.KSNRGY);let prior=0n;const invoke=f.main.io.invoke;f.main.io.invoke=function*(call){prior=f.high.read('shpcon',1,K.KSPCON);return yield*invoke(call);};f.b.io.out=function*(key){assert.equal(key,'shld05');throw new Error('shield output transfer');};assert.throws(f.run,/shield output transfer/);assert.equal(f.high.read('shpcon',1,K.KSNRGY),9000n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),540n);assert.equal(f.high.read('shpcon',1,K.KSPCON),prior);assert.ok(!f.main.events.includes('timout:CMDSHI'));
});
test('Main shield raising output can change WHO before TRCOFF receives the actual WHO word',()=>{
  const f=fixture('SHIELD UP'),out=f.b.io.out;f.high.write('trstat',3n,2);f.high.write('trstat',2n,3);f.b.io.out=function*(...a){yield*out(...a);f.low.write('who',2n);};const trcoff=f.b.io.trcoff;f.b.io.trcoff=function*(a){assert.equal(a,f.low.address('who'));yield*trcoff(a);};f.run();assert.equal(f.high.read('shpcon',1,K.KSHCON),1n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),49000n);assert.equal(f.high.read('trstat',2),0n);assert.equal(f.high.read('trstat',3),0n);
});
test('Main SHIELD and STATUS compose through slash input without charging a turn',()=>{
  const f=mainCommandFixture('SHIELD DOWN/STATUS SHIELDS',K.SHORT,2);f.run();assert.deepEqual(f.main.calls.map(c=>c.routine),['shield','status']);assert.equal(f.reports[1],'\r\nSH-100 \r\n');assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
