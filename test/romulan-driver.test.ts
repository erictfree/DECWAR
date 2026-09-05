import test from 'node:test';
import assert from 'node:assert/strict';
import { romulanDriverFixture as fixture, done } from './support/romulan-driver-fixture.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { finishTurn } from '../src/game/turn.ts';
import { outHit } from '../src/game/out-hit.ts';

const debug = ['timin:ROMDRV', 'timout:ROMDRV', 'timin:BASPHA', 'timout:BASPHA', 'timin:PLNATK', 'timout:PLNATK', 'timin:BASBLD', 'timout:BASBLD'];
function phaser(f: ReturnType<typeof fixture>) { f.draws.push('0', '0'); f.integers.push(2n); }
function distant(f: ReturnType<typeof fixture>, v = 20) { f.board.setdsp(11, 20, 0); f.target.v = v; f.board.setdsp(v, 20, 206); }
function quietDefenses(f: ReturnType<typeof fixture>) { f.io.baspha = function* () {}; f.io.plnatk = function* () {}; f.io.basbld = function* () {}; }

test('ROMDRV point-blank phasers compose actual damage, score and notification before recharge and defenses', () => {
  const f = fixture(); phaser(f); done(f.runDriver());
  assert.equal(f.target.damage, 14400n); assert.equal(f.target.energy, 35600n); assert.equal(f.ctx.rsr[K.KPEDAM], 14400n);
  assert.equal(f.id.value, 1n); assert.equal(f.phit.value, 77n); assert.equal(f.ctx.player, 0n); assert.equal(f.world.turns[3], 1n);
  assert.equal(f.world.romcnt, 0n); assert.equal(f.world.rppaus, 3500n); assert.equal(f.world.rtpaus, 2000n);
  assert.deepEqual(f.queued.map(h => [h.iwhat, h.dispfr, h.dispto, h.ihita]), [[1n, 500n, 206n, 14400n]]);
  assert.deepEqual(f.events.filter(e => /^(timin|timout):/.test(e)), debug); assert.deepEqual(f.events.filter(e => ['baspha','plnatk','basbld'].includes(e)), ['baspha','plnatk','basbld']);
  assert.equal(f.draws.length + f.integers.length + f.clocks.length, 0);
});

test('ROMDRV population throttle leaves PLAYER, turn count, target and clock untouched', () => {
  const f = fixture(); f.world.numply = 3n; done(f.runDriver());
  assert.equal(f.world.romcnt, 1n); assert.equal(f.ctx.player, -1n); assert.equal(f.world.turns[3], 0n);
  assert.deepEqual(f.events, ['timin:ROMDRV','timout:ROMDRV']); phaser(f); done(f.runDriver()); assert.equal(f.world.turns[3], 1n);
});

test('ROMDRV dead creation wait counts turns and retains compiler OR evaluation choice', () => {
  for (const eager of [false, true]) {
    const f = fixture(); f.world.rom = 0n; f.world.romcnt = 1n;
    if (eager) { f.io.or = (...terms) => terms.map(t => t()).some(Boolean); f.integers.push(1n); }
    done(f.runDriver()); assert.equal(f.world.romcnt, 2n); assert.equal(f.world.turns[3], 1n); assert.equal(f.ctx.player, 0n);
    assert.equal(f.events.includes('iran:5'), eager); assert.ok(!f.events.includes('place'));
  }
});

test('ROMDRV failed creation draw leaves the accumulated counter intact', () => {
  const f = fixture(); f.world.rom = 0n; f.world.romcnt = 5n; f.integers.push(5n); done(f.runDriver());
  assert.equal(f.world.romcnt, 6n); assert.equal(f.world.numrom, 0n); assert.equal(f.world.rom, 0n);
});

test('ROMDRV distant spawn composes PLACE and appearance delivery without resetting weapon deadlines', () => {
  const f = fixture(); f.world.rom = 0n; f.world.romcnt = 5n; f.world.rppaus = 4321n; f.ctx.pasflg = -1n;
  f.board.setdsp(10, 20, 0); f.integers.push(1n, 30n, 30n, 50n, 2n); done(f.runDriver());
  assert.deepEqual(f.world.locr, { v: 30, h: 30 }); assert.equal(f.board.disp(30, 30), 501); assert.equal(f.world.erom, 250n);
  assert.equal(f.world.rom, -1n); assert.equal(f.world.numrom, 1n); assert.equal(f.world.romcnt, 0n);
  assert.equal(f.world.rtpaus, 2000n); assert.equal(f.world.rppaus, 4321n); assert.equal(f.clocks.length, 2);
  assert.deepEqual(f.queued.map(h => [h.iwhat,h.vfrom,h.hfrom,h.dbits]), [[11n,30n,30n,1n]]);
});

test('ROMDRV new nearby spawn attacks without moving or converting its 501 board code', () => {
  const f = fixture(); f.world.rom = 0n; f.world.romcnt = 5n; f.board.setdsp(10, 20, 0);
  f.integers.push(1n, 10n, 20n, 200n, 2n); phaser(f); done(f.runDriver());
  assert.equal(f.world.erom, 400n); assert.equal(f.board.disp(10, 20), 501); assert.equal(f.events.filter(e => e === 'dist').length, 1);
  assert.deepEqual(f.queued.map(h => h.iwhat), [11n,1n]); assert.equal(f.target.damage,14400n);
});

for (const [rt,rp,selected,draw] of [[2000n,1000n,'torp',0n],[1000n,2000n,'torp',0n],[1000n,999n,'pha',0n],[999n,999n,'torp',1n],[999n,999n,'pha',2n],[999n,999n,'pha',3n]] as const) {
  test(`ROMDRV strict deadline selection rt=${rt} rp=${rp} draw=${draw}`, () => {
    const f = fixture(); f.world.rtpaus = rt; f.world.rppaus = rp; let selectedActual = '';
    f.io.romtor = function* () { selectedActual = 'torp'; }; f.io.phadam = function* () { selectedActual = 'pha'; };
    if (draw) f.integers.push(draw); f.integers.push(2n); done(f.runDriver());
    assert.equal(selectedActual, selected); assert.equal(f.events.includes('iran:2'), Boolean(draw)); assert.equal(f.world.romcnt, 0n);
  });
}

test('ROMDRV both banks in future retains counter after counting a turn, with no defenses', () => {
  const f = fixture(); f.world.rppaus = 1001n; done(f.runDriver());
  assert.equal(f.world.romcnt,1n); assert.equal(f.world.turns[3],1n); assert.ok(!f.events.includes('baspha')); assert.equal(f.clocks.length,1);
});

test('ROMDRV movement composes CHECK collision and horizontal detour before a new DIST', () => {
  const f = fixture(); distant(f, 12); phaser(f); done(f.runDriver());
  assert.deepEqual(f.world.locr,{v:11,h:19}); assert.equal(f.board.disp(10,20),0); assert.equal(f.board.disp(11,19),500);
  assert.equal(f.driverLocal.i1,1n); assert.equal(f.events.filter(e => e === 'dist').length,2); assert.equal(f.id.value,1n);
});

test('ROMDRV open movement has warp-four cap and emits the privileged source coordinate report', () => {
  const f = fixture(); distant(f); f.ctx.pasflg = -1n; phaser(f); done(f.runDriver());
  assert.deepEqual(f.world.locr,{v:14,h:20}); assert.equal(f.id.value,6n); assert.equal(f.target.damage,8503n);
  assert.equal(f.out.drain(),'?? advances to 14-20\r\n');
});

test('ROMDRV blocked detour checks negative vertical before negative horizontal at every step', () => {
  const f = fixture(); distant(f); f.board.setdsp(12,20,900); f.board.setdsp(11,19,900); done(f.runDriver());
  assert.deepEqual(f.world.locr,{v:9,h:20}); assert.equal(f.driverLocal.i1,2n); assert.equal(f.world.romcnt,0n);
  assert.equal(f.clocks.length,2); assert.equal(f.board.disp(12,20),900); assert.ok(!f.events.includes('baspha'));
});

test('ROMDRV no vacant detour retains position and completes the source DO counter', () => {
  const f = fixture(); distant(f); f.board.setdsp(12,20,900);
  for (let i=1;i<=4;i++) { f.board.setdsp(11-i,20,900); f.board.setdsp(11,20-i,900); }
  f.world.rppaus = 2000n; done(f.runDriver()); assert.deepEqual(f.world.locr,{v:10,h:20}); assert.equal(f.driverLocal.i1,5n);
  assert.equal(f.world.romcnt,1n); assert.ok(!f.events.includes('baspha'));
});

test('ROMDRV forwards physical CHKOUT direction references into actual ROMTOR/CHECK', () => {
  const f = fixture(); f.world.rtpaus = 0n; f.world.rppaus = 2000n;
  f.draws.push('.5','.5','.5',...Array(4).fill('.5'),'.5'); f.integers.push(97n,2n); done(f.runDriver());
  assert.deepEqual([f.path.h2,f.path.v2],[14n,28n]); assert.equal(f.world.rtpaus,4250n); assert.equal(f.world.rppaus,2000n);
  assert.equal(f.queued.length,0); assert.equal(f.draws.length,0); assert.ok(f.events.includes('baspha'));
});

test('ROMDRV phaser recharge samples live clock and terminal speed after notification resumes', () => {
  const f = fixture(); phaser(f); const original=f.io.makhit;
  f.io.makhit=function* () { yield 'hit'; yield* original(); }; const g=f.runDriver(); assert.equal(g.next().value,'hit');
  assert.equal(f.world.rppaus,0n); f.ctx.slowestTerminal=4n; f.clocks[0]=3000n; done(g); assert.equal(f.world.rppaus,6750n);
});

test('ROMDRV full base emits masked distress before real damage and the ordinary hit', () => {
  const f=fixture(); f.target.v=0; f.board.setdsp(11,20,401); Object.assign(f.bases[2][1],{v:11,h:20,strength:1000n}); f.nbase[2]=1n;
  f.ctx.nomsg=32n; quietDefenses(f); phaser(f); done(f.runDriver());
  assert.deepEqual(f.queued.map(h => [h.iwhat,h.dispfr,h.dispto]),[[9n,500n,401n],[1n,500n,401n]]);
  assert.equal(f.queued[0].dbits,0n); assert.equal(f.bases[2][1].strength,783n);
});

test('ROMDRV base destruction notice is sent after recharge with cleared sender', () => {
  const f=fixture(); f.target.v=0; f.board.setdsp(11,20,401); Object.assign(f.bases[2][1],{v:11,h:20,strength:10n}); f.nbase[2]=1n;
  quietDefenses(f); f.draws.push('0','0','.2'); f.integers.push(1n,2n); done(f.runDriver());
  assert.deepEqual(f.queued.map(h => [h.iwhat,h.dispfr]),[[1n,500n],[10n,0n]]); assert.equal(f.nbase[2],0n); assert.equal(f.world.rppaus,3500n);
});

test('ROMDRV postattack speech still runs after ROMTOR clears ROM and composes ROMSPK/MAKMSG', () => {
  const f=fixture(); f.world.rtpaus=0n; f.world.rppaus=2000n; f.io.romtor=function* () { f.world.rom=0n; };
  f.integers.push(1n,2n,1n,1n,3n); done(f.runDriver()); assert.equal(f.receive(1),'Death to mindless human toads!\r\n');
  assert.ok(f.events.indexOf('tell')<f.events.indexOf('baspha')); assert.equal(f.ctx.player,0n);
});

test('ROMDRV phaser hit is delivered as exact source terminal bytes', () => {
  const f=fixture(); phaser(f); done(f.runDriver());
  done(outHit({who:6,team:2,oflg:0,ocflg:K.KABS,nomsg:0n,ship:f.target},f.hit,f.players,f.out,function* (who) { f.queue.get(who,f.hit,f.players); }));
  assert.equal(f.out.drain(),'?? @10-20 +100.1%  1440.0 unit P  C @11-20, -100.0%\r\n');
});

test('ROMDRV postattack composes real base ship/Romulan fire, separate scores and two-team rebuilding', () => {
  const f=fixture(); Object.assign(f.bases[1][1],{v:10,h:21,strength:900n}); f.board.setdsp(10,21,301); f.nbase[1]=1n;
  f.integers.push(2n); phaser(f); f.draws.push('0','0'); f.integers.push(100n); done(f.runDriver());
  assert.equal(f.target.damage,21600n); assert.equal(f.ctx.rsr[K.KPEDAM],14400n); assert.equal(f.scores.team(1,K.KPEDAM),7200n);
  assert.equal(f.scores.team(1,K.KPRKIL),2000n); assert.equal(f.world.erom,801n); assert.equal(f.bases[1][1].strength,916n);
  assert.deepEqual(f.queued.map(h => [h.dispfr,h.dispto]),[[500n,206n],[301n,206n],[301n,500n]]);
  assert.equal(f.integers.length+f.draws.length,0);
});

test('ROMDRV postattack composes real planet fire with full Romulan power and owner scores', () => {
  const f=fixture(); f.count.value=1n; Object.assign(f.planets[1],{v:10,h:21,builds:1n}); f.board.setdsp(10,21,701);
  phaser(f); f.draws.push('0','0'); f.integers.push(100n); done(f.runDriver());
  assert.equal(f.target.damage,17280n); assert.equal(f.ctx.rsr[K.KPEDAM],14400n); assert.equal(f.scores.team(1,K.KPEDAM),2880n);
  assert.equal(f.scores.team(1,K.KPRKIL),1600n); assert.equal(f.world.erom,841n);
  assert.deepEqual(f.queued.map(h => [h.dispfr,h.dispto]),[[500n,206n],[701n,206n],[701n,500n]]);
});

test('ROMDRV spawn sets ROM only after PLACE resumes, then reads location for appearance', () => {
  const f=fixture(); f.world.rom=0n; f.world.romcnt=5n; f.board.setdsp(10,20,0); const original=f.io.place;
  f.io.place=function* (...args) { yield 'lock'; yield* original(...args); };
  f.integers.push(1n,30n,30n,1n,2n); const g=f.runDriver(); assert.equal(g.next().value,'lock');
  assert.equal(f.world.rom,0n); assert.equal(f.world.romcnt,0n); assert.equal(f.world.numrom,0n); done(g);
  assert.equal(f.world.erom,201n); assert.equal(f.queued[0].vfrom,30n);
});

test('ROMDRV spawn appearance is not filtered by NOMSG and speech happens before DIST', () => {
  const f=fixture(); f.world.rom=0n; f.world.romcnt=5n; f.ctx.nomsg=32n; f.board.setdsp(10,20,0);
  f.integers.push(1n,10n,20n,1n,1n,2n,1n,1n,3n); phaser(f); done(f.runDriver());
  assert.equal(f.queued[0].dbits,32n); assert.ok(f.events.indexOf('tell')<f.events.indexOf('dist'));
  assert.equal(f.receive(1),'Death to mindless human toads!\r\n');
});

test('ROMDRV phasers leave a killed ship tractor untouched, unlike ROMTOR', () => {
  const f=fixture(); f.target.energy=1n; f.target.tractor=1; f.players[1].ship.tractor=6; phaser(f); done(f.runDriver());
  assert.equal(f.players[6].alive,0n); assert.equal(f.target.tractor,1); assert.equal(f.players[1].ship.tractor,6);
  assert.equal(f.ctx.rsr[K.KPEKIL],5000n); assert.deepEqual(f.queued.map(h=>h.iwhat),[1n]);
});

test('ROMDRV nonreturning damage leaves partial state and bypasses recharge, speech and debug exit', () => {
  const f=fixture(); f.io.phadam=function* () { f.target.energy=123n; throw new Error('fixture monitor exit'); };
  assert.throws(()=>done(f.runDriver()),/fixture monitor exit/); assert.equal(f.target.energy,123n); assert.equal(f.id.value,1n);
  assert.equal(f.world.romcnt,0n); assert.equal(f.world.rppaus,0n); assert.deepEqual(f.events.filter(e=>e.startsWith('tim')),['timin:ROMDRV']);
});

test('finishTurn composes ROMDRV and its additional defense cycle, leaving PLAYER false for command-loop reset', () => {
  const f=fixture(); phaser(f); const world=Object.assign(f.world,{players:f.players,scores:f.scores,dotime:1n,romopt:-1n});
  const turn={who:1,team:1,prtype:1,get player() {return f.ctx.player;}, tpoint:Array<bigint>(K.KNPOIN+1).fill(0n),shared:world};
  turn.tpoint[K.KPEDAM]=123n;
  done(finishTurn(turn,true,f.out,{*repair(mode) {assert.equal(mode,3);f.events.push('repair');},...f.io,romdrv:f.runDriver}));
  assert.equal(f.events[0],'repair'); assert.equal(f.events.filter(e=>e==='baspha').length,2); assert.equal(f.events.filter(e=>e==='basbld').length,2);
  assert.equal(world.dotime,0n); assert.equal(world.turns[1],1n); assert.equal(world.turns[3],1n); assert.equal(f.players[1].ship.turns,1n);
  assert.equal(f.scores.player(K.KPEDAM,1),123n); assert.equal(f.scores.team(1,K.KPEDAM),123n); assert.equal(f.ctx.rsr[K.KPEDAM],14400n);
  assert.equal(f.ctx.player,0n); assert.equal(turn.tpoint[K.KPEDAM],0n);
});

test('ROMDRV negative-axis movement retains sequential source adjustments and CHECK maximum range', () => {
  const f=fixture(); distant(f,1); f.world.rppaus=2000n; done(f.runDriver());
  assert.deepEqual(f.world.locr,{v:6,h:20}); assert.equal(f.driverLocal.vt,-8n); assert.equal(f.driverLocal.ht,0n); assert.equal(f.driverLocal.l,4n);
  assert.equal(f.world.romcnt,1n); assert.equal(f.queued.length,0);
});

test('ROMDRV reads refreshed DIST target after moving instead of retaining the original target', () => {
  const f=fixture(); distant(f); f.players[1].ship.shieldCondition=-1n; f.players[1].ship.energy=50000n; let calls=0; const dist=f.io.dist;
  f.io.dist=(...args)=>{ calls++; if(calls===2) { f.players[1].ship.v=14; f.players[1].ship.h=21; f.board.setdsp(14,21,101); } dist(...args); };
  phaser(f); done(f.runDriver()); assert.deepEqual(f.world.locr,{v:14,h:20});
  assert.equal(f.queued[0].dispto,101n); assert.equal(f.target.damage,0n); assert.equal(f.players[1].ship.damage,14400n);
});
