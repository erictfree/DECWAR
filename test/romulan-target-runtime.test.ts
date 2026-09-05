import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<3000;i++){const next=g.next();if(next.done)return next.value;}throw new Error('test schedule exhausted');}
function fixture(){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),b=main.romulan,t=b.targets;main.policy.debug='omit';
  for(const [key,w] of [['who',1n],['team',1n],['player',-1n],['pasflg',0n],['hungup',0n],['hcpos',0n],['blank',0n],['oflg',0n],['ocflg',BigInt(K.KABS)]] as const)f.low.write(key,w);
  for(const [key,w] of [['rom',-1n],['romopt',0n],['romcnt',0n],['erom',300n],['numply',2n],['nplnet',0n],['rtpaus',2000n],['rppaus',0n],['slwest',1n],['tim0',0n],['nomsg',0n]] as const)f.high.write(key,w);
  f.high.write('locr',10n,K.KVPOS);f.high.write('locr',20n,K.KHPOS);f.high.write('tmturn',0n,3);f.views.high.board.setdsp(10,20,500);
  for(let i=1;i<=K.KNPLAY;i++){f.high.write('alive',0n,i);f.high.write('docked',0n,i);f.high.write('shpcon',0n,i,K.KVPOS);f.high.write('shpcon',0n,i,K.KHPOS);f.high.write('hitflg',0n,i);}
  for(let team=1;team<=2;team++){f.high.write('nbase',0n,team);for(let i=1;i<=K.KNBASE;i++)f.high.write('base',0n,i,3,team);}
  const ship=(i:number,v:number,h:number,alive=-1n)=>{Object.assign(f.views.high.players[i].ship,{v,h,energy:50000n,damage:0n,shieldCondition:-1n});f.high.write('alive',alive,i);f.views.high.board.setdsp(v,h,(i<=K.KNPLAY/2?100:200)+i);};
  const base=(team:number,i:number,v:number,h:number)=>{f.high.write('nbase',1n,team);Object.assign(f.views.high.bases[team][i],{v,h,strength:100n});f.views.high.board.setdsp(v,h,(team+2)*100+i);};
  ship(1,50,50);ship(6,12,20,0n);f.file.write('seed',1n);f.clock.splice(0,f.clock.length,1000n,2000n);f.damage.draws.splice(0,f.damage.draws.length,'0','0');f.damage.integers.length=0;
  const result=()=>[f.m.read(t.s.ip),f.m.read(t.s.np),f.m.read(t.s.num)];
  return {...f,main,b,t,ship,base,result,dist:()=>{done(t.dist());return result();},star:(v:bigint,h:bigint)=>{f.m.write(t.s.iv,v);f.m.write(t.s.ih,h);done(t.star());return [f.m.read(t.s.iv),f.m.read(t.s.ih)];}};
}
test('DIST statement binding uses physical DISTLC and raw BLKSET/PDIST',()=>{
  const f=fixture();assert.deepEqual(f.dist(),[6n,2n,2n]);assert.equal(f.t.memory.base,922n);assert.deepEqual([1,2,3,4].map(i=>f.t.memory.read('v',i)),[50n,12n,77n,77n]);assert.equal(f.t.memory.read('z',2),4n);assert.equal(f.t.memory.read('iv',2),6n);assert.equal(f.m.read(f.t.locals.j),11n);assert.equal(f.m.read(f.t.locals.k),3n);assert.ok(f.points.block.events.some(x=>x.startsWith('blt:')));assert.equal(f.file.read('seed'),1n);
});
test('DIST chooses squared distance even when another class has smaller returned PDIST',()=>{
  const f=fixture();f.ship(1,13,23);f.views.high.board.setdsp(12,20,0);f.ship(6,14,20);assert.deepEqual(f.dist(),[6n,2n,4n]);assert.equal(f.t.memory.read('z',1),18n);assert.equal(f.t.memory.read('z',2),16n);
});
test('DIST uses ALIVE only for Federation slots and rejects a zero Klingon vertical position',()=>{
  const f=fixture();f.high.write('alive',0n,1);assert.deepEqual(f.dist(),[6n,2n,2n]);assert.equal(f.t.memory.read('z',1),5626n);f.high.write('shpcon',0n,6,K.KVPOS);f.t.io.iran=function*(){return 2n;};f.dist();assert.equal(f.t.memory.read('z',2),5626n);
});
test('DIST preserves negative base display acceptance and nonpositive ship rejection',()=>{
  const f=fixture();f.base(1,1,9,20);const disp=f.t.io.disp;f.t.io.disp=function*(v,h){const row=f.m.read(v);return row===9n||row===12n?-1n:yield*disp(v,h);};assert.deepEqual(f.dist(),[1n,3n,1n]);assert.equal(f.t.memory.read('z',2),5626n);
});
test('DIST equal candidates within one class preserve the first slot without a draw',()=>{
  const f=fixture();f.ship(7,10,22);assert.deepEqual(f.dist(),[6n,2n,2n]);assert.equal(f.t.events.filter(x=>x.startsWith('iran:')).length,0);
});
test('DIST evaluates cross-class tie draws in source order and permits later replacement',()=>{
  const f=fixture();f.ship(1,8,20);f.base(1,1,10,18);f.base(2,1,10,22);const draws=[1n,2n,1n],states:bigint[]=[];f.t.io.iran=function*(n){assert.equal(n,2);states.push(f.m.read(f.t.s.np));return draws.shift()!;};assert.deepEqual(f.dist(),[1n,4n,2n]);assert.deepEqual(states,[1n,2n,2n]);assert.equal(draws.length,0);
});
test('DIST eager compound compiler policy consumes raw integer draws for unequal distances',()=>{
  const f=fixture();f.t.io.and=function*(a,b){const x=yield*a(),y=yield*b();return x&&y;};f.t.io.or=function*(a,b){const x=yield*a(),y=yield*b();return x||y;};assert.deepEqual(f.dist(),[6n,2n,2n]);assert.equal(f.t.events.filter(x=>x==='iran:2').length,3);assert.notEqual(f.file.read('seed'),1n);
});
test('DIST all-missing search clears only Z and can return the prior target words',()=>{
  const f=fixture();f.dist();const before=[...Array(12)].map((_,i)=>f.m.read(f.t.memory.base+BigInt(i)));f.high.write('alive',0n,1);f.high.write('shpcon',0n,6,K.KVPOS);const draws=[1n,2n,2n];f.t.io.iran=function*(){return draws.shift()!;};assert.deepEqual(f.dist(),[6n,2n,2n]);assert.deepEqual([...Array(12)].map((_,i)=>f.m.read(f.t.memory.base+BigInt(i))),before);assert.deepEqual([1,2,3,4].map(i=>f.t.memory.read('z',i)),[5626n,5626n,5626n,5626n]);
});
test('DIST finite distance sentinel leaves previous target data when all objects are too far',()=>{
  const f=fixture();f.high.write('locr',1n,K.KVPOS);f.high.write('locr',1n,K.KHPOS);f.ship(1,75,75);f.high.write('shpcon',0n,6,K.KVPOS);f.t.io.iran=function*(){return 2n;};assert.deepEqual(f.dist(),[77n,1n,76n]);assert.equal(f.t.memory.read('z',1),5626n);
});
test('DIST IP/NP alias crosses DISTLC columns before constructing PDIST arguments',()=>{
  const f=fixture();done(f.t.dist(f.t.s.np,f.t.s.np,f.t.s.num));assert.equal(f.m.read(f.t.s.np),6n);assert.equal(f.t.memory.address('v',6),f.t.memory.address('h',2));assert.equal(f.t.memory.address('h',6),f.t.memory.address('iv',2));assert.equal(f.m.read(f.t.s.num),14n);
});
test('DIST NUM may alias a selected distance score and is assigned after PDIST',()=>{
  const f=fixture();done(f.t.dist(f.t.s.ip,f.t.s.np,f.t.memory.address('z',2)));assert.equal(f.t.memory.read('z',2),2n);assert.equal(f.m.read(f.t.s.ip),6n);
});
test('DIST squared arithmetic wraps at 36 bits before comparing candidates',()=>{
  const f=fixture();f.high.write('locr',1n,K.KVPOS);f.high.write('locr',1n,K.KHPOS);f.high.write('shpcon',262145n,1,K.KVPOS);f.high.write('shpcon',1n,1,K.KHPOS);f.high.write('shpcon',0n,6,K.KVPOS);f.t.io.disp=function*(){return 101n;};assert.deepEqual(f.dist(),[1n,1n,262144n]);assert.equal(f.t.memory.read('z',1),0n);
});
test('DIST raw BLKSET suspension exposes its first write before RV/RH and remaining Z words',()=>{
  const f=fixture(),aoj=f.points.block.io.aojT1;f.points.block.io.aojT1=function*(){yield 'first clear';yield*aoj();};const g=f.t.dist();assert.equal(g.next().value,'first clear');assert.deepEqual([1,2,3,4].map(i=>f.t.memory.read('z',i)),[5626n,77n,77n,77n]);assert.equal(f.m.read(f.t.locals.rv),77n);f.high.write('locr',11n,K.KVPOS);done(g);assert.equal(f.m.read(f.t.locals.rv),11n);assert.deepEqual(f.result(),[6n,2n,1n]);
});
test('DIST snapshots RV and RH in separate assignments across suspension',()=>{
  const f=fixture(),assign=f.t.io.assign;f.t.io.assign=function*(a,e){yield*assign(a,e);if(a()===f.t.locals.rv)yield 'saved vertical';};const g=f.t.dist();assert.equal(g.next().value,'saved vertical');f.high.write('locr',41n,K.KHPOS);done(g);assert.equal(f.m.read(f.t.locals.rv),10n);assert.equal(f.m.read(f.t.locals.rh),41n);
});
test('DIST candidate rereads J after the raw display call returns',()=>{
  const f=fixture();f.ship(3,11,20);const disp=f.t.io.disp;let first=true;f.t.io.disp=function*(v,h){const value=yield*disp(v,h);if(first){first=false;f.m.write(f.t.locals.j,3n);}return value;};assert.deepEqual(f.dist(),[3n,1n,1n]);assert.equal(f.t.memory.read('v',1),11n);
});
test('DIST PDIST actuals stay selected while callee changes NP',()=>{
  const f=fixture(),pdist=f.t.io.pdist;f.t.io.pdist=function*(v,h,rv,rh){assert.deepEqual([v,h,rv,rh],[f.t.memory.address('v',2),f.t.memory.address('h',2),f.t.locals.rv,f.t.locals.rh]);yield 'distance call';return yield*pdist(v,h,rv,rh);};const g=f.t.dist();assert.equal(g.next().value,'distance call');f.m.write(f.t.s.np,1n);done(g);assert.deepEqual(f.result(),[6n,1n,2n]);
});
test('DIST PDIST failure retains selected IP/NP and leaves NUM untouched',()=>{
  const f=fixture();f.t.io.pdist=function*(){throw new Error('PDIST transfer');};assert.throws(f.dist,/PDIST transfer/);assert.deepEqual(f.result(),[6n,2n,77n]);assert.equal(f.t.memory.read('z',2),4n);
});
test('ROMSTR raw DISPC chooses the first row-major star, including the target cell',()=>{
  const f=fixture();f.views.high.board.setdsp(11,21,900);f.views.high.board.setdsp(12,20,900);assert.deepEqual(f.star(12n,20n),[11n,21n]);assert.deepEqual(f.t.events.filter(x=>x.startsWith('dispc:')),['dispc:11,19','dispc:11,20','dispc:11,21']);
  f.views.high.board.setdsp(11,21,0);assert.deepEqual(f.star(12n,20n),[12n,20n]);assert.equal(f.m.read(f.t.starLocals.i),12n);assert.equal(f.m.read(f.t.starLocals.j),20n);
});
test('ROMSTR galaxy-edge scan leaves actuals intact and retains ordinary terminal DO values',()=>{
  const f=fixture();assert.deepEqual(f.star(1n,75n),[1n,75n]);assert.deepEqual(f.t.events.filter(x=>x.startsWith('dispc:')),['dispc:1,74','dispc:1,75','dispc:2,74','dispc:2,75']);assert.equal(f.m.read(f.t.starLocals.i),3n);assert.equal(f.m.read(f.t.starLocals.j),76n);
});
test('ROMSTR aliased IV/IH actual sees vertical then horizontal assignment',()=>{
  const f=fixture();f.views.high.board.setdsp(11,13,900);f.m.write(f.t.s.iv,12n);done(f.t.star(f.t.s.iv,f.t.s.iv));assert.equal(f.m.read(f.t.s.iv),13n);
});
test('ROMSTR IV alias to loop J changes the following IH assignment',()=>{
  const f=fixture();f.views.high.board.setdsp(11,19,900);f.m.write(f.t.starLocals.j,12n);f.m.write(f.t.s.ih,20n);done(f.t.star(f.t.starLocals.j,f.t.s.ih));assert.equal(f.m.read(f.t.starLocals.j),11n);assert.equal(f.m.read(f.t.s.ih),11n);
});
test('ROMSTR reversed bounds follow the explicit compiler entry policy',()=>{
  const f=fixture();assert.deepEqual(f.star(100n,20n),[100n,20n]);assert.equal(f.m.read(f.t.starLocals.i),99n);assert.equal(f.m.read(f.t.starLocals.j),77n);f.t.starIO.enterLoop=()=>true;f.t.starIO.dispc=function*(){return 9n;};assert.deepEqual(f.star(100n,20n),[99n,19n]);
});
test('ROMSTR captures each row limit but rereads saved column bounds for the next row',()=>{
  const f=fixture();f.t.starIO.dispc=function*(i,j){if(f.m.read(i)===11n&&f.m.read(j)===19n)f.m.write(f.t.starLocals.ihl,19n);return f.m.read(i)===12n?9n:0n;};assert.deepEqual(f.star(12n,20n),[12n,19n]);assert.equal(f.m.read(f.t.starLocals.j),19n);
});
test('ROMSTR DISPC failure leaves computed bounds and loop words but no output assignment',()=>{
  const f=fixture();f.t.starIO.dispc=function*(){throw new Error('DISPC transfer');};assert.throws(()=>f.star(12n,20n),/DISPC transfer/);assert.deepEqual([f.m.read(f.t.s.iv),f.m.read(f.t.s.ih)],[12n,20n]);assert.equal(f.m.read(f.t.starLocals.ivl),13n);assert.equal(f.m.read(f.t.starLocals.i),11n);assert.equal(f.m.read(f.t.starLocals.j),19n);
});
test('ROMDRV actual DIST movement searches again before attacking with raw PHADAM',()=>{
  const f=fixture();f.views.high.board.setdsp(12,20,0);f.ship(6,20,20);done(f.b.run());assert.deepEqual([f.high.read('locr',K.KVPOS),f.high.read('locr',K.KHPOS)],[14n,20n]);assert.deepEqual(f.b.calls,[[2n,6n,6n,200n,-1n]]);assert.equal(f.b.events.filter(x=>x==='dist').length,2);assert.equal(f.t.memory.read('z',2),36n);assert.equal(f.high.read('hitflg',6),1n);assert.equal(f.high.read('rppaus'),3500n);
});
test('ROMDRV actual DIST and ROMSTR leave live directions on a nonreturning ROMTOR call',()=>{
  const f=fixture();f.ship(6,11,20);f.views.high.board.setdsp(10,19,900);f.high.write('rppaus',1000n);f.b.io.romtor=function*(){throw new Error('ROMTOR transfer');};assert.throws(()=>done(f.b.run()),/ROMTOR transfer/);assert.equal(f.m.read(f.b.locals.iplace),6n);assert.equal(f.m.read(f.b.locals.nplc),2n);assert.deepEqual([f.m.read(f.b.locals.i),f.m.read(f.b.locals.j)],[10n,19n]);assert.deepEqual([f.out.read('h1'),f.out.read('v1')],[0n,-1n]);assert.equal(f.high.read('romcnt'),0n);assert.ok(!f.b.events.includes('timout:ROMDRV'));
});
test('Main turn executes actual DIST and Romulan phasers before stardate accounting',()=>{
  const f=fixture();f.ship(6,11,20);f.high.write('romopt',-1n);f.high.write('dotime',1n);f.high.write('numsid',1n,1);const turns=f.high.read('shpcon',1,K.KNTURN);done(f.main.io.finishTurn(false));assert.equal(f.high.read('tmturn',3),1n);assert.deepEqual(f.b.calls,[[2n,6n,1n,200n,-1n]]);assert.equal(f.high.read('shpcon',6,K.KSDAM),14400n);assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+1n);assert.equal(f.high.read('hitflg',6),1n);assert.equal(f.low.read('player'),0n);
});
