import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { halfWords } from '../src/compat/word36.ts';
function fixture(who=0n){
  const f=pregameRuntimeFixture([]);f.low.write('who',who);f.low.write('team',1n);f.high.write('endflg',-1n);f.high.write('nplnet',1n);f.high.write('nbase',1n,1);f.high.write('nbase',1n,2);
  return {...f,run:()=>finish(f.endgame.run()),end:()=>assert.throws(()=>finish(f.endgame.run()),/EXIT transfer/)};
}
// Explicit score/statistics/release fixtures expose the driver's live calls;
// they do not claim the final POINTS, UPDSTA or FREE implementation here.
function playerFixture(){
  const f=fixture(1n),records:bigint[][]=[],order:string[]=[];
  for(const [column,n] of [[K.KPPN,101n],[K.KNAM1,102n],[K.KNAM2,103n],[K.KJOBTM,20n]] as const)f.high.write('job',n,1,column);
  f.high.write('names',104n,1,1);f.high.write('names',105n,1,2);f.clock.splice(0,f.clock.length,100n);
  f.endgame.io.points=function*(final){assert.equal(final,true);order.push('points');f.m.write(f.endgame.total,999n);};
  f.endgame.io.updsta=function*(a){order.push('updsta');records.push(a.map(v=>f.m.read(v)));};
  f.endgame.io.free=function*(who){order.push('free');assert.equal(who,f.low.address('who'));};
  return {...f,records,order};
}
test('Statement ENDGAM active planets return without output or touching private identity',()=>{
  const f=fixture();f.high.write('endflg',0n);f.run();assert.equal(f.text(),'');assert.equal(f.m.read(f.endgame.locals.txppn),77n);assert.equal(f.high.read('endflg'),0n);
});
test('Statement ENDGAM surviving bases on both sides return after MIN0',()=>{
  const f=fixture();f.high.write('endflg',0n);f.high.write('nplnet',0n);f.run();assert.equal(f.text(),'');assert.equal(f.high.read('endflg'),0n);
});
test('Statement ENDGAM natural termination calls KILHGH before setting ENDFLG or output',()=>{
  const f=fixture();f.high.write('endflg',0n);f.high.write('nplnet',0n);f.high.write('nbase',0n,1);f.endgame.io.kilhgh=function*(){assert.equal(f.high.read('endflg'),0n);assert.equal(f.text(),'');yield 'kill-high';};
  const g=f.endgame.run();assert.equal(g.next().value,'kill-high');assert.equal(f.high.read('endflg'),0n);assert.throws(()=>finish(g),/EXIT transfer/);assert.equal(f.high.read('endflg'),-1n);
});
test('Statement ENDGAM KILHGH failure preserves the unset flag',()=>{
  const f=fixture();f.high.write('endflg',0n);f.high.write('nplnet',0n);f.high.write('nbase',0n,1);assert.throws(f.run,/requires KILHGH/);assert.equal(f.high.read('endflg'),0n);assert.equal(f.text(),'');
});
test('Statement ENDGAM preexisting flag bypasses KILHGH and the remaining-world checks',()=>{
  const f=fixture();f.end();assert.equal(f.text(),M.endgm0.text+'\r\n');assert.deepEqual(f.endgame.events,['endgm0','exit']);
});
test('Statement ENDGAM ENDFLG entry uses compiler logical policy rather than host nonzero',()=>{
  const f=fixture();f.high.write('endflg',1n);f.run();assert.equal(f.text(),'');f.endgame.io.logical=w=>w!==0n;f.end();assert.equal(f.text(),M.endgm0.text+'\r\n');
});
for(const [team,extra] of [[1n,['endgm5','endgm6']],[2n,['endgm7','endgm8']],[0n,[]]] as const)test(`Statement ENDGAM total destruction messages for team ${team}`,()=>{
  const f=fixture();f.low.write('team',team);f.high.write('nplnet',0n);f.high.write('nbase',0n,1);f.high.write('nbase',0n,2);f.end();const keys=['endgm0','endgm1','endgm3','endgm4',...extra] as const;assert.equal(f.text(),keys.map(k=>M[k].text+'\r\n').join(''));assert.equal(f.high.read('endflg'),-2n);
});
test('Statement ENDGAM total destruction uses MAX0 equal zero even when another count is negative',()=>{
  const f=fixture();f.high.write('nplnet',-1n);f.high.write('nbase',-2n,1);f.high.write('nbase',0n,2);f.end();assert.equal(f.high.read('endflg'),-2n);assert.ok(f.text().includes(M.endgm1.text));assert.ok(!f.text().includes(M.endgm3.text));
});
test('Statement ENDGAM all-negative counts do not satisfy MAX0 equal zero',()=>{
  const f=fixture();f.high.write('nplnet',-1n);f.high.write('nbase',-2n,1);f.high.write('nbase',-3n,2);f.end();assert.equal(f.high.read('endflg'),-1n);assert.equal(f.text(),M.endgm0.text+'\r\n');
});
test('Statement ENDGAM rereads counts after the first output suspension',()=>{
  const f=fixture(),out=f.endgame.io.out;f.endgame.io.out=function*(m,n){yield*out(m,n);if(m==='endgm0')yield 'heading';};const g=f.endgame.run();assert.equal(g.next().value,'heading');f.high.write('nplnet',0n);f.high.write('nbase',0n,1);f.high.write('nbase',0n,2);assert.throws(()=>finish(g),/EXIT transfer/);assert.equal(f.high.read('endflg'),-2n);
});
test('Statement ENDGAM writes -2 only after total-destruction output returns',()=>{
  const f=fixture();f.high.write('nplnet',0n);f.high.write('nbase',0n,1);f.high.write('nbase',0n,2);const out=f.endgame.io.out;f.endgame.io.out=function*(m,n){if(m==='endgm1')throw new Error('destruction output fault');yield*out(m,n);};assert.throws(f.run,/destruction output fault/);assert.equal(f.high.read('endflg'),-1n);
});
test('Statement ENDGAM message predicates reread TEAM after earlier output',()=>{
  const f=fixture();f.high.write('nbase',0n,1);f.high.write('nbase',0n,2);const out=f.endgame.io.out;f.endgame.io.out=function*(m,n){yield*out(m,n);if(m==='endgm5')f.low.write('team',2n);};f.end();assert.ok(f.endgame.events.includes('endgm5'));assert.ok(!f.endgame.events.includes('endgm6'));assert.ok(f.endgame.events.includes('endgm7'));assert.ok(f.endgame.events.includes('endgm8'));
});
test('Statement ENDGAM WHO=0 exits without clock, score, stats, FREE or private writes',()=>{
  const f=fixture();f.end();assert.equal(f.m.read(f.endgame.locals.whowon),77n);assert.equal(f.low.read('who'),0n);assert.deepEqual(f.clock,[100n,500n]);
});
test('Statement ENDGAM player path snapshots identity, uses raw ETIM and reads shared TOTAL after POINTS',()=>{
  const f=playerFixture();f.end();assert.deepEqual(f.records,[[101n,102n,103n,104n,105n,999n,80n,1n,0n,1n]]);assert.deepEqual(f.order,['points','updsta','free']);assert.equal(f.low.read('who'),0n);assert.equal(f.m.read(f.endgame.locals.whowon),1n);
});
for(const [a,b,team,why,winner] of [[0n,2n,1n,0n,2n],[0n,2n,2n,1n,2n],[2n,0n,1n,1n,1n],[2n,2n,2n,0n,1n]] as const)test(`Statement ENDGAM winner bases ${a},${b}, team ${team}`,()=>{
  const f=playerFixture();f.high.write('nbase',a,1);f.high.write('nbase',b,2);f.low.write('team',team);f.end();assert.equal(f.records[0][7],why);assert.equal(f.records[0][8],team-1n);assert.equal(f.m.read(f.endgame.locals.whowon),winner);
});
test('Statement ENDGAM -2 forces a losing record even for the otherwise winning team',()=>{
  const f=playerFixture();f.high.write('endflg',-2n);f.end();assert.equal(f.records[0][7],0n);
});
test('Statement ENDGAM identity assignments reread WHO instead of snapshotting the player object',()=>{
  const f=playerFixture(),assign=f.endgame.io.assign;f.high.write('job',202n,2,K.KNAM1);f.high.write('job',203n,2,K.KNAM2);f.high.write('names',204n,2,1);f.high.write('names',205n,2,2);f.high.write('job',30n,2,K.KJOBTM);
  f.endgame.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.endgame.locals.txppn)f.low.write('who',2n);};f.end();assert.deepEqual(f.records[0].slice(0,5),[101n,202n,203n,204n,205n]);assert.equal(f.records[0][6],70n);assert.equal(f.records[0][9],2n);
});
test('Statement ENDGAM POINTS may overwrite LOCAL but saved TX words remain separate',()=>{
  const f=playerFixture();f.endgame.io.points=function*(){for(let i=0;i<6;i++)f.m.write(f.pregame.locals.identity+BigInt(i),-99n);f.m.write(f.endgame.total,55n);};f.end();assert.deepEqual(f.records[0].slice(0,6),[101n,102n,103n,104n,105n,55n]);
});
test('Statement ENDGAM POINTS suspension delays TXTOT assignment until current TOTAL is available',()=>{
  const f=playerFixture();f.endgame.io.points=function*(){yield 'final-points';};const g=f.endgame.run();assert.equal(g.next().value,'final-points');assert.equal(f.m.read(f.endgame.locals.txtot),77n);f.m.write(f.endgame.total,123n);assert.throws(()=>finish(g),/EXIT transfer/);assert.equal(f.records[0][5],123n);
});
test('Statement ENDGAM UPDSTA receives actual TX addresses and live WHO, followed by FREE at the same address',()=>{
  const f=playerFixture();f.endgame.io.updsta=function*(a){assert.deepEqual(a,[...['txppn','txnm1','txnm2','txsh1','txsh2','txtot','txtim','txwhy','txtem'].map(k=>f.endgame.locals[k as keyof typeof f.endgame.locals]),f.low.address('who')]);f.low.write('who',2n);};f.endgame.io.free=function*(a){assert.equal(a,f.low.address('who'));assert.equal(f.m.read(a),2n);};f.end();assert.equal(f.low.read('who'),0n);
});
test('Statement ENDGAM failed UPDSTA preserves WHO and completed TX words',()=>{
  const f=playerFixture();f.endgame.io.updsta=function*(){throw new Error('stats fault');};assert.throws(f.run,/stats fault/);assert.equal(f.low.read('who'),1n);assert.equal(f.m.read(f.endgame.locals.txtot),999n);assert.deepEqual(f.order,['points']);
});
test('Statement ENDGAM failed FREE does not clear WHO or call EXIT',()=>{
  const f=playerFixture();f.endgame.io.free=function*(){throw new Error('free fault');};assert.throws(f.run,/free fault/);assert.equal(f.low.read('who'),1n);assert.ok(!f.endgame.events.includes('exit'));assert.equal(f.records.length,1);
});
test('Statement ENDGAM clock failure preserves identity and reason before timing/team assignments',()=>{
  const f=playerFixture();f.endgame.io.etim=function*(){throw new Error('clock fault');};assert.throws(f.run,/clock fault/);assert.equal(f.m.read(f.endgame.locals.txnm1),102n);assert.equal(f.m.read(f.endgame.locals.txwhy),1n);assert.equal(f.m.read(f.endgame.locals.txtim),77n);assert.equal(f.m.read(f.endgame.locals.txtem),77n);
});
test('Statement ENDGAM total assignment can expose caller aliases',()=>{
  const f=playerFixture();f.endgame.locals.txtot=f.endgame.locals.txppn;f.end();assert.equal(f.records[0][0],999n);assert.equal(f.records[0][5],999n);
});
test('Statement ENDGAM returning EXIT service falls through the source end without invented transfer',()=>{
  const f=fixture();let exits=0;f.endgame.io.exit=function*(){exits++;};f.run();assert.equal(exits,1);
});
test('PREGAM JOBSTA PASWRD SET ENDFLG composes terminal end output and exits before ACTIVATE',()=>{
  const f=pregameRuntimeFixture(['PREGAME','*PASSWORD *MINK','SET ENDFLG','ACTIVATE']);f.jobStatus.ppns.splice(0,2,halfWords(0o337n,1n),halfWords(0o337n,1n));f.high.write('nplnet',1n);assert.throws(()=>driveInitial(f),/EXIT transfer/);assert.ok(f.text().includes(M.endgm0.text));assert.ok(!f.pregame.events.includes('prgnam:DECWAR'));assert.equal(f.high.read('endflg'),-1n);assert.equal(f.low.read('who'),0n);
});
test('PREGAM buffered INI SET ENDFLG uses the same statement body and raw output',()=>{
  const f=pregameRuntimeFixture([]);f.low.write('pasflg',-2n);f.ini.install();f.ini.load('PREGAME/SET ENDFLG/ACTIVATE\n');assert.throws(()=>driveInitial(f),/EXIT transfer/);assert.ok(f.endgame.events.includes('endgm0'));assert.equal(f.editor.events.filter(e=>e==='inchwl').length,0);
});
