import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K,messages } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<4000;i++){const n=g.next();if(n.done)return n.value;}throw new Error('test schedule exhausted');}
function fixture(line='DOCK STATUS T E'){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),b=main.dock;main.policy.debug='omit';
  for(const [key,value] of [['who',1n],['team',1n],['player',0n],['ptime',0n],['pasflg',0n],['ccflg',0n],['hungup',0n],['addrck',0n],['prtype',0n],['gagmsg',0n],['hcpos',0n],['blank',0n],['oflg',-1n]] as const)f.low.write(key,value);
  for(const [key,value] of [['nplnet',1n],['endflg',0n],['numply',2n],['dotime',0n],['tim0',1000n],['slwest',2n],['romopt',0n]] as const)f.high.write(key,value);
  f.high.write('alive',-1n,1);f.high.write('docked',0n,1);f.high.write('shpcon',20000n,1,K.KSNRGY);f.high.write('shpcon',2500n,1,K.KSDAM);f.high.write('shpcon',0n,1,K.KNTORP);f.high.write('shpcon',400n,1,K.KSSHPC);f.high.write('shpcon',1n,1,K.KNTURN);
  for(let i=1;i<=K.KNPLAY;i++){f.high.write('hitflg',0n,i);f.high.write('msgflg',0n,i);}for(let i=1;i<=K.KNDEV;i++)f.high.write('shpdam',0n,1,i);f.high.write('shpdam',1000n,1,K.KDSHLD);
  for(let team=1;team<=2;team++){f.high.write('numcap',0n,team);for(let i=1;i<=K.KNBASE;i++)f.high.write('base',0n,i,3,team);}
  const base=(i=1,v=10,h=21)=>{Object.assign(f.views.high.bases[1][i],{v,h,strength:1000n});};
  const planet=(i:number,v:number,h:number,team=1)=>{f.high.write('locpln',BigInt(v),i,K.KVPOS);f.high.write('locpln',BigInt(h),i,K.KHPOS);f.views.high.board.setdsp(v,h,(K.DXNPLN+team)*100+i);};base();
  f.getCommand.trapAddress.value=0n;f.clock.splice(0,f.clock.length,11000n,12000n);f.editor.feed(line+'\n');let calls=0;const get=main.io.getcmd;main.io.getcmd=function*(a){if(calls++===0)yield*get(a);else f.low.write('who',0n);};
  const reports:string[]=[],invoke=main.io.invoke;main.io.invoke=function*(call){const start=f.text().length,result=yield*invoke(call);reports.push(f.text().slice(start));return result;};
  return {...f,main,b,base,planet,reports,run:()=>done(main.run())};
}
test('Main DOCK STATUS composes supplies, exact status output, automatic repair and a timed turn',()=>{
  const f=fixture();f.run();assert.deepEqual(f.main.calls,[{routine:'dock',alternate:49}]);assert.deepEqual(f.reports,[messages.dockin.text+'\r\n\r\nT10 E3000 \r\n']);assert.equal(f.high.read('shpcon',1,K.KSNRGY),30000n);assert.equal(f.high.read('shpcon',1,K.KSDAM),1500n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),600n);assert.equal(f.high.read('shpdam',1,K.KDSHLD),700n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.low.read('ptime'),2000n);assert.equal(f.m.read(f.statusReport.stoken),3n);assert.deepEqual(f.b.events.filter(e=>['etim','dockin','status'].includes(e)),['etim','dockin','status','etim']);
});
test('Main DOCK adds all adjacent friendly suppliers and caps each replenished field',()=>{
  const f=fixture('DOCK');f.base(2,11,20);f.planet(1,9,20);f.planet(2,9,21);f.planet(3,11,21,2);f.high.write('numcap',2n,1);f.high.write('nplnet',3n);f.run();assert.equal(f.m.read(f.b.locals.ifract),6n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),50000n);assert.equal(f.high.read('shpcon',1,K.KNTORP),10n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),1000n);assert.equal(f.high.read('shpcon',1,K.KSDAM),0n);assert.equal(f.b.events.filter(e=>e==='dispc').length,3);
});
test('Main DOCK preserves the second hull repair when already docked',()=>{
  const f=fixture('DOCK STATUS D');f.high.write('docked',-1n,1);f.run();assert.equal(f.high.read('shpcon',1,K.KSDAM),500n);assert.deepEqual(f.reports,[messages.dockin.text+'\r\n\r\nD50 \r\n']);assert.equal(f.high.read('shpcon',1,K.KLFSUP),5n);assert.equal(f.high.read('shpcon',1,K.KSPCON),BigInt(K.GREEN));
});
test('Main DOCK without suppliers takes alternate return without report, repair or turn',()=>{
  const f=fixture();f.high.write('base',0n,1,3,1);f.run();assert.deepEqual(f.reports,['\r\nL '+messages.dock01.text+'\r\n']);assert.equal(f.high.read('shpdam',1,K.KDSHLD),1000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.high.read('docked',1),0n);assert.equal(f.clock.length,1);assert.ok(!f.main.events.includes('timout:CMDDO '));assert.ok(!f.main.events.includes('automatic-repair'));
});
test('Main DOCK STATUS accepts the source prefix and retains a negative pause after a slow report',()=>{
  const f=fixture('DOCK S T');f.clock[1]=17000n;f.run();assert.deepEqual(f.reports,[messages.dockin.text+'\r\n\r\nT10 \r\n']);assert.equal(f.low.read('ptime'),-3000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.ok(f.main.events.includes('automatic-repair'));
});
test('Main DOCK death during supplier scan returns before replenishment and status',()=>{
  const f=fixture(),ldis=f.b.io.ldis;f.b.io.ldis=function*(...a){const result=yield*ldis(...a);f.high.write('alive',0n,1);return result;};f.run();assert.deepEqual(f.reports,['']);assert.equal(f.high.read('shpcon',1,K.KSNRGY),20000n);assert.equal(f.high.read('docked',1),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.clock.length,1);
});
test('Main DOCK output failure leaves replenishment and dock state before final clock and turn',()=>{
  const f=fixture();f.b.io.out=function*(){throw new Error('dock output transfer');};assert.throws(f.run,/dock output transfer/);assert.equal(f.high.read('shpcon',1,K.KSNRGY),30000n);assert.equal(f.high.read('docked',1),-1n);assert.equal(f.high.read('shpdam',1,K.KDSHLD),1000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.clock.length,1);assert.ok(!f.main.events.includes('automatic-repair'));
});
test('Main DOCK after nova destroys its sole base follows the no-supplier branch',()=>{
  const f=fixture('DOCK');f.high.write('base',100n,1,3,1);f.high.write('nbase',1n,1);f.views.high.board.setdsp(10,21,301);const nova=f.main.romulan.torpedoes.nova;f.m.write(nova.s.kind,3n);f.m.write(nova.s.index,1n);const draws=[1n,1n];nova.io.iran=function*(){return draws.shift()!;};done(nova.run());f.high.write('hitflg',0n,1);f.run();assert.equal(f.high.read('nbase',1),0n);assert.equal(f.views.high.board.disp(10,21),0);assert.deepEqual(f.reports,['\r\nL '+messages.dock01.text+'\r\n']);assert.equal(f.high.read('docked',1),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
