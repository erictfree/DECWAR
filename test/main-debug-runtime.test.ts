import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { constants as K,debugText,messages as M } from '../src/generated/source-data.ts';
import { packAscii } from '../src/compat/word36.ts';
function fixture(){const f=mainCommandFixture('*DEBUG'),b=f.main.debug;f.low.write('pasflg',-1n);return {...f,b};}
test('Main DEBUG displays actual timer words through raw monitor output',()=>{
  const f=fixture(),s=f.b.s;f.m.write(s.timnam+49n,packAscii('TEST'));f.m.write(s.timcnt+49n,123n);f.m.write(s.timtot+49n,4n);f.m.write(s.timhi+49n,2n);const p=f.r.p;f.run();assert.deepEqual(f.reports,[debugText[0].text+'TEST\t123\t1\t0\r\n']);assert.equal(f.r.p,p);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
test('Main DEBUG stops at first empty name despite lower populated slots',()=>{
  const f=fixture();f.m.write(f.b.s.timnam+48n,packAscii('HIDE'));f.run();assert.deepEqual(f.reports,[debugText[0].text]);
});
test('Main DEBUG reads timer counters after preceding monitor output',()=>{
  const f=fixture(),s=f.b.s,chr=f.b.io.outchr;f.m.write(s.timnam+49n,packAscii('LIVE'));f.b.io.outchr=function*(a){yield*chr(a);if(a===s.tab)f.m.write(s.timcnt+49n,987n);};f.run();assert.ok(f.reports[0].includes('LIVE\t987\t'));
});
test('DEBUG raw privilege rejection retains original two output calls',()=>{
  const f=fixture();f.low.write('pasflg',0n);const g=f.b.run();for(let n=g.next();!n.done;n=g.next()){}assert.equal(f.text(),M.unkcom.text+M.forhlp.text);assert.equal(f.b.events.length,0);
});
test('Main DEBUG direct monitor text bypasses HCPOS accounting',()=>{
  const f=fixture();let before=0n,after=0n;const invoke=f.main.io.invoke;f.main.io.invoke=function*(call){before=f.low.read('hcpos');const x=yield*invoke(call);after=f.low.read('hcpos');return x;};f.run();assert.equal(after,before);
});
