import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K,messages } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<4000;i++){const s=g.next();if(s.done)return s.value;}throw new Error('test schedule exhausted');}
function fixture(){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),torp=main.romulan.torpedoes,p=torp.removal;main.policy.debug='omit';
  f.high.write('nplnet',3n);f.high.write('endflg',0n);f.high.write('dead',0n);f.low.write('who',0n);f.low.write('team',1n);f.low.write('hungup',0n);f.low.write('hcpos',0n);f.low.write('blank',0n);f.low.write('oflg',0n);
  for(let team=1;team<=2;team++){f.high.write('nbase',1n,team);f.high.write('numcap',2n,team);for(let j=1;j<=K.KNBASE;j++)f.high.write('base',0n,j,3,team);}
  for(let i=1;i<=K.KNPLAY;i++)f.high.write('docked',0n,i);
  for(let i=1;i<=5;i++){f.high.write('locpln',BigInt(10+i),i,1);f.high.write('locpln',BigInt(20+i),i,2);f.high.write('locpln',BigInt(10*i),i,3);f.high.write('locpln',BigInt(i),i,4);f.views.high.board.setdsp(10+i,20+i,(i+5)*100+i);}
  f.m.write(p.s.i,2n);f.m.write(p.s.pteam,0n);
  const row=(i:number)=>[1,2,3,4].map(c=>f.high.read('locpln',i,c));
  return {...f,main,torp,p,row,run:()=>done(p.run())};
}
test('PLNRMV shifts four actual columns with raw forward BLKMOV and leaves the final row',()=>{
  const f=fixture(),last=f.row(3);f.run();assert.deepEqual(f.row(1),[11n,21n,10n,1n]);assert.deepEqual(f.row(2),last);assert.deepEqual(f.row(3),last);assert.equal(f.high.read('nplnet'),2n);assert.equal(f.views.high.board.disp(13,23),802);assert.equal(f.views.high.board.disp(12,22),702);assert.equal(f.m.read(f.p.locals.j),3n);assert.deepEqual(f.p.copies,[1,2,3,4].map(c=>[f.high.address('locpln',3,c),f.high.address('locpln',2,c),1n]));assert.ok(f.points.block.events.some(x=>x.startsWith('blt:')));assert.ok(f.p.events.includes('endgam'));
});
for(const [i,team] of [[2n,-1n],[4n,0n],[0n,0n],[-1n,2n]])test(`PLNRMV invalid I=${i} PTEAM=${team} returns before modifying state`,()=>{
  const f=fixture(),before=[f.row(1),f.row(2),f.row(3)];f.m.write(f.p.s.i,i);f.m.write(f.p.s.pteam,team);f.run();assert.deepEqual([f.row(1),f.row(2),f.row(3)],before);assert.equal(f.high.read('nplnet'),3n);assert.equal(f.m.read(f.p.locals.j),77n);assert.deepEqual(f.p.events,[]);
});
test('PLNRMV last-row removal skips copies and display updates',()=>{
  const f=fixture();f.m.write(f.p.s.i,3n);const last=f.row(3);f.run();assert.equal(f.p.copies.length,0);assert.deepEqual(f.p.events,['endgam']);assert.deepEqual(f.row(3),last);assert.equal(f.views.high.board.disp(13,23),803);assert.equal(f.m.read(f.p.locals.j),77n);
});
test('PLNRMV out-of-range positive team still removes a planet without changing captures',()=>{
  const f=fixture();f.m.write(f.p.s.pteam,3n);f.run();assert.equal(f.high.read('numcap',1),2n);assert.equal(f.high.read('numcap',2),2n);assert.ok(!f.p.events.includes('baskil'));assert.equal(f.high.read('nplnet'),2n);
});
test('PLNRMV captured-planet removal decrements NUMCAP before actual BASKIL undocking',()=>{
  const f=fixture();f.m.write(f.p.s.pteam,1n);f.high.write('docked',-1n,1);f.high.write('shpcon',50n,1,K.KVPOS);f.high.write('shpcon',50n,1,K.KHPOS);f.run();assert.equal(f.high.read('numcap',1),1n);assert.equal(f.high.read('docked',1),0n);assert.equal(f.high.read('shpcon',1,K.KSPCON),BigInt(K.RED));assert.equal(f.p.events[0],'baskil');
});
test('PLNRMV last captured planet preserves BASKIL NUMCAP-zero undocking quirk',()=>{
  const f=fixture();f.m.write(f.p.s.pteam,1n);f.high.write('numcap',1n,1);f.high.write('docked',-1n,1);f.run();assert.equal(f.high.read('numcap',1),0n);assert.equal(f.high.read('docked',1),-1n);
});
test('PLNRMV PTEAM alias sees the capture decrement through the actual BASKIL argument',()=>{
  const f=fixture(),team=f.high.address('numcap',1);f.high.write('numcap',1n,1);f.p.io.baskil=function*(a){assert.equal(a,team);assert.equal(f.m.read(a),0n);};done(f.p.run(f.p.s.i,team));assert.equal(f.high.read('nplnet'),2n);
});
test('PLNRMV reevaluates I independently for each column copy',()=>{
  const f=fixture(),copy=f.p.io.blkmov;let calls=0;f.p.io.blkmov=function*(a,b,n){yield*copy(a,b,n);if(++calls===1)f.m.write(f.p.s.i,1n);};f.run();assert.deepEqual(f.p.copies.map(c=>c[2]),[1n,2n,2n,2n]);assert.deepEqual(f.row(1),[11n,22n,20n,2n]);assert.deepEqual(f.row(2),[13n,23n,30n,3n]);assert.equal(f.high.read('nplnet'),2n);
});
test('PLNRMV I alias to NPLNET changes the post-decrement display loop',()=>{
  const f=fixture();done(f.p.run(f.high.address('nplnet'),f.p.s.pteam));assert.equal(f.p.copies.length,0);assert.equal(f.high.read('nplnet'),2n);assert.equal(f.views.high.board.disp(12,22),701);assert.equal(f.views.high.board.disp(13,23),803);assert.equal(f.m.read(f.p.locals.j),3n);
});
test('PLNRMV failure during the second column preserves only the completed first shift',()=>{
  const f=fixture(),copy=f.p.io.blkmov;let calls=0;f.p.io.blkmov=function*(a,b,n){if(++calls===2)throw new Error('column transfer');yield*copy(a,b,n);};assert.throws(f.run,/column transfer/);assert.deepEqual(f.row(2),[13n,22n,20n,2n]);assert.equal(f.high.read('nplnet'),3n);assert.ok(!f.p.events.includes('endgam'));
});
test('PLNRMV raw BLT suspension exposes partial copying before count decrement',()=>{
  const f=fixture(),blt=f.points.block.io.blt;let first=true;f.points.block.io.blt=function*(last){yield*blt(last);if(first){first=false;yield 'column copied';}};const g=f.p.run();assert.equal(g.next().value,'column copied');assert.deepEqual(f.row(2),[13n,22n,20n,2n]);assert.equal(f.high.read('nplnet'),3n);done(g);assert.deepEqual(f.row(2),[13n,23n,30n,3n]);
});
test('PLNRMV SETDSP keeps actual coordinate addresses while nested DISP can mutate J',()=>{
  const f=fixture();f.m.write(f.p.s.i,1n);const disp=f.p.io.disp;f.p.io.disp=function*(v,h){assert.equal(v,f.high.address('locpln',1,K.KVPOS));assert.equal(h,f.high.address('locpln',1,K.KHPOS));const code=yield*disp(v,h);f.m.write(f.p.locals.j,2n);return code;};f.run();assert.equal(f.views.high.board.disp(12,22),701);assert.equal(f.views.high.board.disp(13,23),803);assert.equal(f.m.read(f.p.locals.j),3n);
});
test('PLNRMV final planet returns if both fleets retain bases',()=>{
  const f=fixture();f.high.write('nplnet',1n);f.m.write(f.p.s.i,1n);f.run();assert.equal(f.high.read('nplnet'),0n);assert.equal(f.high.read('endflg'),0n);assert.deepEqual(f.p.killHigh.events,[]);
});
test('PLNRMV natural ENDGAM reaches required KILHGH monitor service after count removal',()=>{
  const f=fixture();f.high.write('nplnet',1n);f.high.write('nbase',0n,1);f.m.write(f.p.s.i,1n);assert.throws(f.run,/KILHGH OPEN monitor result required/);assert.equal(f.high.read('nplnet'),0n);assert.equal(f.high.read('endflg'),0n);assert.equal(f.high.read('dead'),0n);
});
test('PLNRMV natural game end composes KILHGH raw output and ENDGAM before EXIT',()=>{
  const f=fixture();f.high.write('nplnet',1n);f.high.write('nbase',0n,1);f.m.write(f.p.s.i,1n);Object.assign(f.p.killHigh.policy,{open:true,lookup:true,rename:true});const start=f.text().length;assert.throws(f.run,/EXIT transfer/);assert.equal(f.high.read('nplnet'),0n);assert.equal(f.high.read('dead'),-1n);assert.equal(f.high.read('endflg'),-1n);assert.ok(f.text().slice(start).startsWith('[DECWAR high segment removed from swapper]\r\n'+messages.endgm0.text+'\r\n'));assert.deepEqual(f.p.killHigh.events,['open','lookup','rename','ostr','flush']);
});
test('PLNRMV game end composes actual final POINTS, statistics and FREE under the declared final-DO fixture',()=>{
  const f=fixture();f.high.write('nplnet',1n);f.high.write('nbase',0n,1);f.m.write(f.p.s.i,1n);f.low.write('who',1n);f.high.write('dead',-1n);f.points.final.continuation=function*(){return false;};f.high.write('numshp',1n,1);f.high.write('numshp',1n,2);f.high.write('numrom',1n);for(let team=1;team<=3;team++)f.high.write('tmturn',1n,team);f.high.write('numply',1n);f.high.write('numsid',1n,1);f.high.write('shpcon',1n,1,K.KNTURN);f.clock.splice(0,f.clock.length,1000n,2000n);assert.throws(f.run,/EXIT transfer/);assert.equal(f.low.read('who'),0n);assert.equal(f.statistics.writes.length,1);assert.equal(f.high.read('alive',1),1n);assert.equal(f.high.read('nplnet'),0n);
});
function planetHit(f:ReturnType<typeof fixture>,count=3n){
  f.low.write('who',1n);f.high.write('nplnet',count);f.high.write('locpln',0n,1,3);f.low.write('player',0n);f.low.write('klflg',0n);f.high.write('rom',-1n);f.high.write('erom',300n);f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.high.write('slwest',2n);f.high.write('rtpaus',77n);f.high.write('tim0',0n);f.damage.draws.splice(0,f.damage.draws.length,'.5','.5');f.clock.splice(0,f.clock.length,1000n);const draws=[1n,75n];f.torp.io.iran=function*(){return draws.shift()!;};f.torp.io.check=function*(){f.out.write('dcode',601n);f.out.write('h2',11n);f.out.write('v2',21n);};f.torp.io.dist=function*(_i,_k,n){f.m.write(n,99n);};
}
test('ROMTOR actual PLNRMV compacts planets before unlock, notification and recharge',()=>{
  const f=fixture();planetHit(f);done(f.torp.run());assert.equal(f.high.read('nplnet'),2n);assert.deepEqual(f.row(1),[12n,22n,20n,2n]);assert.equal(f.views.high.board.disp(11,21),0);assert.equal(f.views.high.board.disp(12,22),701);assert.equal(f.views.high.board.disp(13,23),802);assert.equal(f.high.read('rsr',K.KNPDES),-1000n);assert.ok(f.torp.events.indexOf('plnrmv')<f.torp.events.indexOf('unlock'));assert.equal(f.main.defenses.hits[0].dispto,601n);assert.equal(f.main.defenses.hits[0].klflg,2n);assert.equal(f.high.read('rtpaus'),4000n);
});
test('ROMTOR final-planet ENDGAM exits before planet unlock, hit publication and recharge',()=>{
  const f=fixture();planetHit(f,1n);f.low.write('who',0n);f.high.write('nbase',0n,1);f.p.killHigh.policy.open=false;assert.throws(()=>done(f.torp.run()),/EXIT transfer/);assert.equal(f.high.read('nplnet'),0n);assert.equal(f.high.read('endflg'),-1n);assert.equal(f.high.read('dead'),0n);assert.equal(f.high.read('rtpaus'),77n);assert.ok(!f.torp.events.includes('unlock'));assert.equal(f.main.defenses.hits.length,0);assert.equal(f.clock.length,1);
});
