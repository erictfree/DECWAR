import test from 'node:test';
import assert from 'node:assert/strict';
import { planetCommandFixture as fixture, done } from './support/planet-command-fixture.ts';
import { constants as K, messages as M } from '../src/generated/source-data.ts';
import { objectText } from '../src/game/format.ts';
import { outHit } from '../src/game/out-hit.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { finishTurn } from '../src/game/turn.ts';
import { endGame } from '../src/game/endgame.ts';
import { KilledQueue } from '../src/game/lifecycle.ts';
import { repair } from '../src/game/repair.ts';

function shot(f: ReturnType<typeof fixture>) { f.draws.push('0', '0'); }

test('BUILD increments builds, awards cumulative-value points, prints singular/plural bytes and computes PTIME', () => {
  for (const before of [0n, 1n, 5n, -1n]) {
    const f = fixture(); f.planets[1].builds = before; assert.deepEqual(done(f.run()), { alternateReturn: false, pause: 4500n });
    const n = before + 1n; assert.equal(f.planets[1].builds, n); assert.equal(f.tpoint[K.KPBBAS], 500n * n);
    assert.equal(f.out.drain(), n + M.build3.text + (n > 1n ? 's' : '') + '\r\n'); assert.equal(f.ctx.ptime, 4500n);
    assert.deepEqual(f.events, ['clock', 'locate:2', 'clock']);
  }
});

test('BUILD samples its deadline before interactive LOCATE/RELOC and permits negative remaining PTIME', () => {
  const f = fixture('build', 701, 'BUILD'); const g = f.run(); assert.equal(g.next().value, 'input');
  assert.equal(f.local.v, 7000n); assert.equal(f.ctx.ptime, 77n); f.input.acceptLine('11 20'); f.clocks[0] = 9000n;
  assert.deepEqual(done(g), { alternateReturn: false, pause: -2000n }); assert.equal(f.planets[1].builds, 1n);
});

test('BUILD and CAPTUR abort after failed location without overwriting PTIME', () => {
  for (const entry of ['build', 'captur'] as const) {
    const f = fixture(entry); f.io.locate = function* () { return -1n; }; assert.equal(done(f.run()).alternateReturn, true);
    assert.equal(f.ctx.ptime, 77n); assert.equal(f.clocks.length, 1); assert.equal(f.planets[1].builds, 0n);
  }
});

test('BUILD and CAPTUR differ in leading CRLF for nonadjacent target errors', () => {
  for (const entry of ['build', 'captur'] as const) {
    const f = fixture(entry, 701, `${entry} 13 20`); assert.equal(done(f.run()).alternateReturn, true);
    assert.equal(f.out.drain(), (entry === 'captur' ? '\r\n' : '') + 'L ' + M.captu5.text + '\r\n'); assert.equal(f.ctx.ptime, 77n);
  }
});

test('BUILD rejects uncaptured planets without adding a newline and rejects other objects with NOPLNT', () => {
  for (const code of [601, 801, 900]) {
    const f = fixture('build', code); assert.equal(done(f.run()).alternateReturn, true);
    assert.equal(f.out.drain(), code === 900 ? M.noplnt.text + '\r\n' : M.build7.text); assert.equal(f.tpoint[K.KPBBAS], 0n);
  }
});

test('BUILD fifth-build precheck is equality with KNBASE and only applies to exactly four builds', () => {
  const f = fixture(); f.planets[1].builds = 4n; f.nbase[1] = BigInt(K.KNBASE); assert.equal(done(f.run()).alternateReturn, true);
  assert.equal(f.planets[1].builds, 4n); assert.equal(f.tpoint[K.KPBBAS], 0n); assert.ok(!f.events.includes('lock:BUILD'));
  assert.equal(f.out.drain(), M.build4.text + objectText(300n, 0) + M.build5.text + '\r\n');
  const g = fixture(); g.planets[1].builds = 4n; g.nbase[1] = BigInt(K.KNBASE + 1); done(g.run()); assert.equal(g.nbase[1], BigInt(K.KNBASE + 2));
});

test('BUILD lock failure keeps the fifth build and 2500 points, with unchanged PTIME', () => {
  const f = fixture(); f.planets[1].builds = 4n; f.io.lockPlanet = function* () { yield 'lock'; return false; };
  const g = f.run(); assert.equal(g.next().value, 'lock'); assert.equal(f.planets[1].builds, 5n); assert.equal(f.tpoint[K.KPBBAS], 2500n);
  assert.equal(done(g).alternateReturn, true); assert.equal(f.ctx.ptime, 77n); assert.ok(!f.events.includes('unlock'));
  assert.equal(f.out.drain(), 'Sorry, Captain, but the construction crew is\r\nbusy with repairs at the moment.\r\n');
});

test('BUILD after fifth-build lock failure advances to six, without retrying conversion', () => {
  const f = fixture(); f.planets[1].builds = 4n; f.io.lockPlanet = function* () { return false; }; done(f.run()); f.out.drain();
  f.input.acceptLine('BUILD 11 20'); f.input.acquire(f.out); f.clocks.push(3000n); assert.equal(done(f.run()).alternateReturn, false);
  assert.equal(f.planets[1].builds, 6n); assert.equal(f.tpoint[K.KPBBAS], 5500n); assert.equal(f.count.value, 3n);
});

test('BUILD finding no empty slot rolls back the build count but keeps its awarded points', () => {
  const f = fixture(); f.planets[1].builds = 4n; for (let i = 1; i <= K.KNBASE; i++) f.bases[1][i].strength = 1n;
  assert.equal(done(f.run()).alternateReturn, true); assert.equal(f.planets[1].builds, 4n); assert.equal(f.tpoint[K.KPBBAS], 2500n);
  assert.equal(f.local.j, BigInt(K.KNBASE + 1)); assert.equal(f.nbase[1], 0n); assert.ok(f.events.includes('unlock')); assert.equal(f.ctx.ptime, 77n);
});

test('BUILD conversion composes PLNRMV and transfers LIST knowledge before populating the first nonpositive base slot', () => {
  const f = fixture(); f.planets[1].builds = 4n; f.planets[1].scanned = 321n; f.bases[1][1].strength = 1n; f.bases[1][2].strength = -1n;
  Object.assign(f.planets[2], { v: 30, h: 30 }); f.board.setdsp(30, 30, 802); done(f.run());
  assert.equal(f.tpoint[K.KPBBAS], 5000n); assert.equal(f.nbase[1], 1n); assert.equal(f.numcap[1], 0n); assert.equal(f.count.value, 2n);
  assert.equal(f.scanned[1][2], 321n); assert.deepEqual(f.bases[1][2], { v: 11, h: 20, strength: 1000n });
  assert.equal(f.board.disp(11, 20), 302); assert.equal(f.board.disp(30, 30), 801); assert.equal(f.planets[1].v, 30);
  assert.ok(f.events.indexOf('plnrmv') < f.events.indexOf('unlock')); assert.ok(f.events.indexOf('unlock') < f.events.indexOf('set:11,20,302'));
});

test('BUILD conversion sees pre-base state if ENDGAM inside PLNRMV does not return', () => {
  const f = fixture(); f.planets[1].builds = 4n; const exit = new Error('fixture monitor exit');
  f.removeIo.endgam = function* () { yield 'end'; throw exit; }; const g = f.run(); assert.equal(g.next().value, 'end');
  assert.equal(f.nbase[1], 1n); assert.equal(f.numcap[1], 0n); assert.equal(f.count.value, 2n); assert.equal(f.tpoint[K.KPBBAS], 5000n);
  assert.equal(f.bases[1][1].strength, 0n); assert.equal(f.board.disp(11, 20), 701); assert.throws(() => g.next(), e => e === exit);
  assert.ok(!f.events.includes('unlock')); assert.equal(f.ctx.ptime, 77n);
});

test('CAPTUR enemy planet changes ownership before real PHADAM and credits the old owner for defense', () => {
  const f = fixture('captur'); f.planets[1].builds = 2n; shot(f); done(f.run());
  assert.equal(f.board.disp(11, 20), 701); assert.equal(f.planets[1].builds, 0n); assert.deepEqual(f.numcap, [0n, 1n, 0n]);
  assert.deepEqual(f.calls, [[1n, 1n, 1n, 110n, 0n]]); assert.equal(f.players[1].ship.damage, 7920n); assert.equal(f.players[1].ship.energy, 41080n);
  assert.equal(f.scores.team(2, K.KPEDAM), 7920n); assert.equal(f.tpoint[K.KPPCAP], 1000n); assert.equal(f.ctx.ptime, 5500n);
  assert.equal(f.queued[0].dispfr, 801n); assert.equal(f.queued[0].shstfr, 2n); assert.ok(f.events.indexOf('unlock') < f.events.indexOf('phadam'));
});

test('CAPTUR neutral planet defends but receives no owner score and skips BASKIL', () => {
  const f = fixture('captur', 601); shot(f); done(f.run()); assert.equal(f.players[1].ship.damage, 3600n);
  assert.ok(f.scores.teamWords.every(n => n === 0n)); assert.deepEqual(f.numcap, [0n, 1n, 0n]); assert.ok(!f.events.some(e => e.startsWith('baskil')));
  assert.equal(f.ctx.ptime, 3500n);
});

test('CAPTUR lock failure precedes ownership, energy, score and notification effects', () => {
  const f = fixture('captur'); f.io.lockPlanet = function* () { return false; }; assert.equal(done(f.run()).alternateReturn, true);
  assert.equal(f.out.drain(), "The planet's government refuses to surrender.\r\n"); assert.equal(f.board.disp(11, 20), 801);
  assert.equal(f.players[1].ship.energy, 50000n); assert.equal(f.tpoint[K.KPPCAP], 0n); assert.equal(f.ctx.ptime, 77n); assert.equal(f.queued.length, 0);
});

test('CAPTUR BASKIL runs before decrementing old ownership and leaves docking supported by the planet being captured', () => {
  const f = fixture('captur'); f.nbase[2] = 0n; f.players[6].ship.docked = true; f.players[6].ship.v = 12; shot(f);
  const original = f.io.baskil; f.io.baskil = function* (team) { assert.equal(f.numcap[2], 1n); assert.equal(f.board.disp(11, 20), 801); yield* original(team); };
  done(f.run()); assert.equal(f.numcap[2], 0n); assert.equal(f.players[6].ship.docked, true);
});

test('CAPTUR lock wait retains old ownership class but rereads the current planet index and builds', () => {
  const f = fixture('captur'); f.io.lockPlanet = function* () { yield 'lock'; return true; }; const g = f.run(); assert.equal(g.next().value, 'lock');
  f.board.setdsp(11, 20, 602); f.planets[2].builds = 1n; shot(f); done(g);
  assert.equal(f.local.tcap, 2n); assert.equal(f.local.i, 2n); assert.equal(f.board.disp(11, 20), 702); assert.equal(f.queued[0].dispfr, 602n);
  assert.equal(f.scores.team(2, K.KPEDAM), 5760n); assert.equal(f.numcap[2], 0n);
});

test('CAPTUR defensive death still returns normally, grants capture points and leaves new ownership and tractor state', () => {
  for (const team of [1n, 2n]) {
    const f = fixture('captur', 601); f.ctx.team = team; f.players[1].ship.energy = 1n; f.players[1].ship.tractor = 6; shot(f);
    assert.deepEqual(done(f.run()), { alternateReturn: false, pause: 3500n }); assert.equal(f.players[1].alive, 0n); assert.equal(f.board.disp(10, 20), 0);
    assert.equal(f.board.disp(11, 20), Number((team + 6n) * 100n + 1n)); assert.equal(f.tpoint[K.KPPCAP], 1000n); assert.equal(f.players[1].ship.tractor, 6);
    assert.ok(f.out.drain().includes((team === 1n ? M.captu1.text : M.captu2.text) + '\r\n'));
  }
});

test('CAPTUR credits captured-owner defense kill, with no player kill score', () => {
  const f = fixture('captur'); f.players[1].ship.energy = 1n; shot(f); done(f.run());
  assert.equal(f.scores.team(2, K.KPEKIL), 5000n); assert.equal(f.tpoint[K.KPEKIL], 0n); assert.equal(f.tpoint[K.KPPCAP], 1000n);
});

test('CAPTUR waits through MAKHIT before awarding capture points and sampling final clock', () => {
  const f = fixture('captur'); shot(f); const original = f.io.makhit; f.io.makhit = function* () { yield 'hit'; yield* original(); };
  const g = f.run(); assert.equal(g.next().value, 'hit'); assert.equal(f.board.disp(11, 20), 701); assert.equal(f.tpoint[K.KPPCAP], 0n);
  assert.equal(f.ctx.ptime, 77n); f.clocks[0] = 10000n; done(g); assert.equal(f.ctx.ptime, -4000n); assert.equal(f.tpoint[K.KPPCAP], 1000n);
});

test('CAPTUR nonplanet error rereads DISPC and preserves target-specific source messages', () => {
  for (const [code, message] of [[0, M.noplnt], [101, M.nosur1], [301, M.nosur1], [206, M.nosur2], [401, M.nosur2], [500, M.nosur3], [900, M.nosur4], [1000, M.nosur4]] as const) {
    const f = fixture('captur', code); assert.equal(done(f.run()).alternateReturn, true); assert.equal(f.out.drain(), message.text + '\r\n');
  }
  const f = fixture('captur', 900); let reads = 0; f.io.dispc = () => ++reads === 1 ? 9n : 7n;
  done(f.run()); assert.equal(reads, 2); assert.equal(f.out.drain(), '');
});

test('CAPTUR already-owned planet uses the specific team banner only in LONG mode', () => {
  for (const team of [1n, 2n]) for (const oflg of [-1, 0, 1]) {
    const f = fixture('captur', Number((6n + team) * 100n + 1n)); f.ctx.team = team; f.ctx.oflg = oflg;
    assert.equal(done(f.run()).alternateReturn, true); assert.equal(f.out.drain(), (oflg === 1 ? team === 1n ? M.captu6.text : M.captu8.text : M.captu7.text) + '\r\n');
  }
});

test('CAPTUR retains source negative-build energy and time arithmetic', () => {
  const f = fixture('captur'); f.planets[1].builds = -2n; shot(f); done(f.run());
  assert.equal(f.local.phit, -10n); assert.equal(f.players[1].ship.damage, -720n); assert.equal(f.players[1].ship.energy, 51720n);
  assert.equal(f.ctx.ptime, 1500n); assert.equal(f.planets[1].builds, 0n); assert.equal(f.scores.team(2, K.KPEDAM), -720n);
});

test('CAPTUR summary followed by packed OUTHIT preserves the source terminal bytes', () => {
  const f = fixture('captur'); shot(f); done(f.run());
  done(outHit({ who: 1, team: 1, oflg: 0, ocflg: K.KABS, nomsg: 0n, ship: f.players[1].ship }, f.hit, f.players, f.out,
    function* (who) { f.queue.get(who, f.hit, f.players); }));
  assert.equal(f.out.drain(), '\r\nL ' + M.captu0.text + '-@ @11-20\r\n-@ @11-20  360.0 unit P  L @10-20, -100.0%\r\n');
});

test('BUILD and CAPTUR normal dispatch pass PTIME and request automatic repair, while alternate return skips accounting', () => {
  for (const entry of ['build', 'captur'] as const) for (const success of [false, true]) {
    const f = fixture(entry, success ? entry === 'build' ? 701 : 801 : 900); if (entry === 'captur' && success) shot(f);
    const ctx = { who: 1, player: -1n, ptime: 77n, shared: { players: f.players } }; let turns = 0;
    done(dispatchCommand(ctx, entry === 'build' ? 2 : 3, { *getcmd() { assert.fail(); }, *invoke() { return yield* f.run(); },
      *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn(repair) { assert.equal(repair, true); turns++; }, movementContinuation() { assert.fail(); } }));
    assert.equal(turns, success ? 1 : 0); assert.equal(ctx.ptime, success ? entry === 'build' ? 4500n : 3500n : 77n);
  }
});

test('CAPTUR followed by real finishTurn commits capture points and changes which planets may defend', () => {
  const f = fixture('captur'); shot(f); done(f.run()); const damage = f.players[1].ship.damage;
  f.count.value = 1n; f.nbase[2] = 0n;
  const ctx = { who: 1, team: 1, prtype: 1, player: -1n, tpoint: f.tpoint,
    shared: { players: f.players, scores: f.scores, dotime: 1n, numply: 2n, romopt: 0n } };
  done(finishTurn(ctx, false, f.out, { *repair() { assert.fail(); }, baspha: f.runBase, plnatk: f.runPlanet, *basbld() { f.runRebuild(); }, *romdrv() { assert.fail(); } }));
  assert.equal(f.players[1].ship.damage, damage); assert.equal(f.scores.player(K.KPPCAP, 1), 1000n); assert.equal(f.scores.team(1, K.KPPCAP), 1000n);
  assert.equal(f.tpoint[K.KPPCAP], 0n);
});

test('BUILD conversion has exact source bytes across verbosity and coordinate modes', () => {
  for (const oflg of [-1, 0, 1]) for (const ocflg of [K.KABS, K.KREL, K.KBOTH]) {
    const f = fixture(); f.ctx.oflg = oflg; f.ctx.ocflg = ocflg; f.planets[1].builds = 4n; done(f.run());
    const absolute = (oflg < 0 ? '' : '@') + '11-20'; const location = ocflg === K.KREL ? '+1,0' : absolute + (ocflg === K.KBOTH ? ' +1,0' : '');
    assert.equal(f.out.drain(), `\r\n${oflg > 0 ? 'Lexington' : 'L'} builds planet ${location} into a ${oflg > 0 ? 'Fed Base' : '<>'}\r\n`);
  }
});

test('BUILD five consecutive commands award the original cumulative 10000 points and convert once', () => {
  const f = fixture(); for (let n = 1; n <= 5; n++) {
    if (n > 1) { f.input.acceptLine('BUILD 11 20'); f.input.acquire(f.out); f.clocks.push(BigInt(n * 1000), BigInt(n * 1000 + 100)); }
    assert.equal(done(f.run()).alternateReturn, false);
  }
  assert.equal(f.tpoint[K.KPBBAS], 10000n); assert.equal(f.nbase[1], 1n); assert.equal(f.count.value, 2n); assert.equal(f.board.disp(11, 20), 301);
  assert.equal(f.events.filter(e => e === 'lock:BUILD').length, 1);
});

test('BUILD does not revalidate five builds or ownership after the construction lock wait', () => {
  const f = fixture(); f.planets[1].builds = 4n; f.io.lockPlanet = function* () { yield 'lock'; return true; };
  const g = f.run(); assert.equal(g.next().value, 'lock'); f.planets[1].builds = 9n; f.board.setdsp(11, 20, 801); done(g);
  assert.equal(f.board.disp(11, 20), 301); assert.equal(f.tpoint[K.KPBBAS], 5000n); assert.equal(f.nbase[1], 1n); assert.equal(f.numcap[1], 0n);
});

test('BUILD passes actual local index into PLNRMV, which rereads it after BASKIL', () => {
  const f = fixture(); f.planets[1].builds = 4n; f.planets[1].scanned = 321n;
  f.removeIo.baskil = function* () { f.local.i = 3n; }; done(f.run());
  assert.equal(f.local.i, 3n); assert.equal(f.planets[1].builds, 5n); assert.equal(f.count.value, 2n); assert.equal(f.scanned[1][1], 321n);
  assert.ok(!f.events.some(e => e.startsWith('blkmov'))); assert.equal(f.board.disp(11, 20), 301);
});

test('BUILD actual ENDGAM sees the new base count before the last planet is removed and allows construction to finish', () => {
  const f = fixture(); f.planets[1].builds = 4n; f.count.value = 1n;
  const world = { players: f.players, board: f.board, killed: new KilledQueue(), numply: 1n, numsid: [0n, 1n, 0n], endflg: 0n, hitime: 0n,
    get nplnet() { return f.count.value; }, nbase: f.nbase };
  f.removeIo.endgam = () => endGame({ who: 1, team: 1, shared: world }, f.out, {
    *kilhgh() { assert.fail(); }, daytime() { return assert.fail(); }, *points() { return assert.fail(); }, *updsta() { assert.fail(); }, *free() { assert.fail(); }, exit(): never { return assert.fail(); },
  });
  done(f.run()); assert.equal(f.count.value, 0n); assert.equal(world.endflg, 0n); assert.equal(f.nbase[1], 1n); assert.equal(f.bases[1][1].strength, 1000n);
});

test('CAPTUR neutral pre-damage PRIDIS extends stale DBITS, but the later team selection replaces that mask', () => {
  const f = fixture('captur', 601); f.hit.dbits = 512n; shot(f); const original = f.io.phadam;
  f.io.phadam = function* (...args) { assert.equal(f.hit.dbits, 545n); yield* original(...args); }; done(f.run()); assert.equal(f.queued[0].dbits, 33n);
});

test('CAPTUR passes mutable TEAM/WHO/ID/PHIT references and later source output uses the new WHO', () => {
  const f = fixture('captur'); Object.assign(f.players[2].ship, { v: 30, h: 40 });
  f.io.phadam = function* (team, who, id, phit) { assert.equal(team.value, 1n); who.value = 2n; id.value = 77n; phit.value = 88n; f.hit.ihita = 3n; };
  done(f.run()); assert.equal(f.ctx.who, 2n); assert.equal(f.local.id, 77n); assert.equal(f.local.phit, 88n);
  assert.equal(f.queued[0].dispto, 101n); assert.ok(f.events.includes('pridis:30,40,10,1,0')); assert.equal(f.out.drain(), '\r\nN capturing -@ @11-20\r\n');
});

test('CAPTUR damage death test uses energy and hull after MAKHIT instead of the cleared kill flag', () => {
  const f = fixture('captur'); shot(f); const original = f.io.makhit;
  f.io.makhit = function* () { yield* original(); f.players[1].ship.energy = 0n; }; done(f.run());
  assert.equal(f.hit.klflg, 0n); assert.ok(f.out.drain().includes(M.captu1.text)); assert.equal(f.tpoint[K.KPPCAP], 1000n);
});

test('CAPTUR through dispatch composes real automatic REPAIR after a critical defensive shot while preserving PTIME', () => {
  const f = fixture('captur'); f.planets[1].builds = 1n; f.draws.push('.9', '0', '0', '.5'); f.integers.push(1n);
  const turn = { who: 1, team: 1, prtype: 1, player: -1n, ptime: 77n, tpoint: f.tpoint,
    shared: { players: f.players, scores: f.scores, dotime: 0n, numply: 2n, romopt: 0n } };
  done(dispatchCommand(turn, 3, { *getcmd() { assert.fail(); }, *invoke() { return yield* f.run(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
    finishTurn(automatic) { return finishTurn(turn, automatic, f.out, {
      *repair(mode) { assert.equal(mode, 3); repair(f.players[1].ship, mode, f.input.tokens, () => assert.fail()).finish(); },
      *baspha() { assert.fail(); }, *plnatk() { assert.fail(); }, *basbld() { assert.fail(); }, *romdrv() { assert.fail(); },
    }); }, movementContinuation() { assert.fail(); } }));
  assert.equal(f.players[1].ship.devices[1], 2580n); assert.equal(f.queued[0].critdm, 2880n); assert.equal(turn.ptime, 4500n);
  assert.equal(f.scores.player(K.KPPCAP, 1), 1000n); assert.equal(f.scores.team(2, K.KPEDAM), 2880n);
});
