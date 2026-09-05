import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
function fixture(line='SCAN 1'){const f=mainCommandFixture(line),b=f.main.scan;
  for(let v=1;v<=K.KGALV;v++)for(let h=1;h<=K.KGALH;h++)f.views.high.board.setdsp(v,h,0);
  f.high.write('shpcon',35n,1,K.KVPOS);f.high.write('shpcon',35n,1,K.KHPOS);f.views.high.board.setdsp(35,35,101);f.high.write('nplnet',1n);f.high.write('locpln',1n,1,1);f.high.write('locpln',1n,1,2);
  for(let i=1;i<=K.KNBASE;i++)for(const team of [1,2])f.high.write('base',0n,i,3,team);
  f.low.write('terwid',132n);f.low.write('scnflg',1n);return {...f,b};}
function bounds(f:ReturnType<typeof fixture>){return ['vmin','vmax','hmin','hmax'].map(k=>f.m.read(f.b.locals[k as 'vmin']));}
test('Main SCAN displays original row order, map symbols and coordinate labels',()=>{
  const f=fixture();f.run();assert.deepEqual(bounds(f),[34n,36n,34n,36n]);assert.deepEqual(f.reports,['\r\n   34  36\r\n36  . . . 36\r\n35  . L . 35\r\n34  . . . 34\r\n   34  36\r\n']);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
for(const [line,want] of [['SCAN',[25n,45n,25n,45n]],['SRSCAN',[28n,42n,28n,42n]],['SCAN UP 2 3',[35n,37n,32n,38n]],['SCAN CORNER -2 3',[33n,35n,35n,38n]]] as const)test(`Main ${line} preserves scan bounds`,()=>{const f=fixture(line);f.run();assert.deepEqual(bounds(f),want);});
test('Main SCAN short format uses one character per sector and every third column label',()=>{
  const f=fixture();f.low.write('scnflg',-1n);f.run();assert.deepEqual(f.reports,['\r\n   35\r\n36 ... 36\r\n35 .L. 35\r\n34 ... 34\r\n   35\r\n']);
});
test('Main SCAN terminal width limits defaults but explicit range overrides it',()=>{
  const f=fixture('SCAN');f.low.write('terwid',17n);f.run();assert.deepEqual(bounds(f),[33n,37n,33n,37n]);const g=fixture('SCAN 3');g.low.write('terwid',17n);g.run();assert.deepEqual(bounds(g),[32n,38n,32n,38n]);
});
for(const line of ['SCAN CORNER 2','SCAN BAD','SCAN 1 2 3'])test(`Main ${line} rejects syntax before screen changes`,()=>{
  const f=fixture(line),before=f.m.read(f.b.screen.hmin);f.run();assert.deepEqual(f.reports,[M.syntax.text+'\r\n']);assert.equal(f.m.read(f.b.screen.hmin),before);assert.ok(!f.b.events.includes('setscn'));
});
test('Main SCAN records planets outside the displayed rectangle but inside KRANGE',()=>{
  const f=fixture('SCAN 0');f.high.write('nplnet',1n);f.high.write('locpln',40n,1,1);f.high.write('locpln',40n,1,2);f.high.write('locpln',2n,1,4);f.views.high.board.setdsp(40,40,801);f.run();assert.equal(f.high.read('locpln',1,4),3n);assert.deepEqual(bounds(f),[35n,35n,35n,35n]);
});
test('Main SCAN WARNING marks enemy base danger, records knowledge and consumes warning token',()=>{
  const f=fixture('SCAN 1 W');f.high.write('base',35n,1,1,2);f.high.write('base',36n,1,2,2);f.high.write('base',1000n,1,3,2);f.high.write('base',0n,1,4,2);f.views.high.board.setdsp(35,36,401);f.run();assert.ok(f.reports[0].includes('35  ! L)( 35'));assert.ok(f.b.events.includes('mark:4'));assert.equal(f.high.read('base',1,4,2),1n);assert.equal(f.low.read('ntok'),2n);
});
test('Main SCAN output interruption clears CCFLG after a complete row and omits bottom labels',()=>{
  const f=fixture(),output=f.b.machineIO.output;let lines=0;f.b.machineIO.output=function*(entry){yield*output(entry);if(entry==='ocrl.'&&++lines===3)f.low.write('ccflg',-1n);};f.run();assert.deepEqual(f.reports,['\r\n   34  36\r\n36  . . . 36\r\n']);assert.equal(f.low.read('ccflg'),0n);
});
test('Main SCAN uses loaded ship character table and hides cloaked cells',()=>{
  const f=fixture();f.h.put(f.b.s.shtshp,'Z');f.views.high.board.setdsp(35,36,4095);f.run();assert.ok(f.reports[0].includes('35  . Z . 35'));
});
test('Main SCAN clips galaxy edges and negative ranges without changing the source defaults',()=>{
  const f=fixture('SCAN -2');f.high.write('shpcon',1n,1,K.KVPOS);f.high.write('shpcon',1n,1,K.KHPOS);f.run();assert.deepEqual(bounds(f),[1n,1n,1n,1n]);
});
test('Main SCAN warning marks enemy planets and leaves out-of-range knowledge unchanged',()=>{
  const f=fixture('SCAN 1 WARNING');f.high.write('nplnet',2n);for(const [i,pos] of [[1,36],[2,60]]){f.high.write('locpln',BigInt(pos),i,1);f.high.write('locpln',35n,i,2);f.high.write('locpln',0n,i,4);f.views.high.board.setdsp(pos,35,800+i);}f.run();assert.ok(f.b.events.includes('mark:2'));assert.equal(f.high.read('locpln',1,4),1n);assert.equal(f.high.read('locpln',2,4),0n);assert.ok(f.reports[0].includes('@E'));
});
test('Main SCAN preserves screen padding outside its byte writes in shared LOCAL',()=>{
  const f=fixture('SCAN 0');const a=f.b.screen.screen;f.m.write(a,-1n);f.m.write(a+1n,12345n);f.run();assert.equal(f.m.read(a)&((1n<<15n)-1n),(1n<<15n)-1n);assert.equal(f.m.read(a+1n),12345n);
});
test('Main SCAN fails during setup before knowledge updates or display',()=>{
  const f=fixture();f.high.write('locpln',35n,1,1);f.high.write('locpln',35n,1,2);f.high.write('locpln',0n,1,4);f.b.machineIO.idpb=function*(){throw new Error('screen write fault');};assert.throws(f.run,/screen write fault/);assert.equal(f.high.read('locpln',1,4),0n);assert.ok(!f.b.events.includes('shwscn'));
});
