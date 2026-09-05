import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { packSixbit,halfWords } from '../src/compat/word36.ts';
function fixture(format:number=K.SHORT){const f=mainCommandFixture('USERS',format),b=f.main.users;
  for(let i=1;i<=K.KNPLAY;i++)f.high.write('alive',i===1?-1n:0n,i);
  for(const [col,value] of [[K.KNAM1,packSixbit('ERIC  ')],[K.KNAM2,packSixbit('TEST  ')],[K.KTTYSP,1200n],[K.KPPN,halfWords(1n,0o27n)],[K.KTTYN,packSixbit('TTY12 ')],[K.KJOB,7n]] as const)f.high.write('job',value,1,col);
  f.low.write('pasflg',0n);f.low.write('ocflg',BigInt(K.KABS));return {...f,b};}
const row='Lexington  ERIC  TEST   1200       1,27    TTY12     7';
for(const format of [K.SHORT,K.MEDIUM,K.LONG])test(`Main USERS format ${format} retains all six identity fields`,()=>{
  const f=fixture(format);f.run();assert.deepEqual(f.reports,['\r\n'+(format===K.LONG?M.users1.text+'\r\n':'')+row+'\r\n'+M.users5.text+'\r\n']);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.deepEqual(f.b.events.filter(e=>e.startsWith('stat:')),['stat:1']);
});
test('Main USERS privilege appends current absolute location using original PRLOC',()=>{
  const f=fixture(K.LONG);f.low.write('pasflg',-1n);f.high.write('shpcon',12n,1,K.KVPOS);f.high.write('shpcon',34n,1,K.KHPOS);f.run();assert.deepEqual(f.reports,['\r\n'+M.users1.text+M.users2.text+'\r\n'+row+'   12-34\r\n'+M.users5.text+'\r\n']);
});
test('Main USERS observes player admission during output and preserves team divider order',()=>{
  const f=fixture(),stat=f.b.io.stat;f.b.io.stat=function*(...a){yield*stat(...a);f.high.write('alive',-1n,6);};f.run();assert.deepEqual(f.b.events,['stat:1','users5','stat:6']);assert.ok(f.reports[0].indexOf(M.users5.text)<f.reports[0].indexOf('Cobra'));
});
test('Pregame USERS reuses the same identity binding without a ship turn',()=>{
  const f=fixture();f.low.write('who',0n);const g=f.pregame.io.invoke({routine:'users'});for(let n=g.next();!n.done;n=g.next()){}assert.equal(f.text(),'\r\n'+row+'\r\n'+M.users5.text+'\r\n');assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
