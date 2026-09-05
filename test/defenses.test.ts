import test from 'node:test';
import assert from 'node:assert/strict';
import { defenseFixture as fixture, done } from './support/defense-fixture.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { outHit } from '../src/game/out-hit.ts';
import { finishTurn } from '../src/game/turn.ts';

function hitDraws(f: ReturnType<typeof fixture>, n = 1) { f.draws.push(...Array(n * 2).fill('0')); }

test('BASPHA composes PHADAM/PWR damage, own-team TMSCOR and actual hit queue without player score credit', () => {
  const f = fixture(); hitDraws(f); done(f.runBase());
  assert.deepEqual(f.calls, [[1n, 1n, 2n, 100n, 0n]]); assert.equal(f.players[1].ship.damage, 6480n); assert.equal(f.players[1].ship.energy, 43520n);
  assert.equal(f.scores.team(2, K.KPEDAM), 6480n); assert.equal(f.ctx.player, -1n); assert.ok(f.tpoint.every(n => n === 0n)); assert.ok(f.rsr.every(n => n === 0n));
  assert.equal(f.queued.length, 1); assert.equal(f.queued[0].dispfr, 401n); assert.equal(f.queued[0].dispto, 101n);
  assert.equal(f.queued[0].shstfr, 1000n); assert.equal(f.queued[0].shcnfr, 1n); assert.equal(f.queued[0].dbits, 33n);
  assert.equal(f.draws.length, 0); assert.equal(f.integers.length, 0);
});

test('BASPHA selects opposing base team for each player team and both teams for the Romulan', () => {
  for (const [player, team, expected] of [[-1n, 1n, [401n]], [-1n, 2n, [301n]], [0n, 1n, [301n, 401n]]] as const) {
    const f = fixture(); f.ctx.player = player; f.ctx.team = team; f.nbase[1] = 1n;
    Object.assign(f.bases[1][1], { v: 14, h: 20, strength: 1000n }); f.board.setdsp(14, 20, 301); f.board.setdsp(12, 20, 206);
    hitDraws(f, expected.length); done(f.runBase()); assert.deepEqual(f.queued.map(h => h.dispfr), expected);
    assert.equal(f.bas.i, player === 0n ? 3n : 4n - team);
  }
});

test('BASPHA requires positive NBASE and strength, a logically alive ship, a visible cell and inclusive four-sector range', () => {
  for (const mode of ['count', 'base', 'dead', 'cloaked', 'far', 'edge']) {
    const f = fixture(); if (mode === 'count') f.nbase[2] = 0n; if (mode === 'base') f.bases[2][1].strength = 0n;
    if (mode === 'dead') f.players[1].alive = 0n; if (mode === 'cloaked') f.board.setdsp(10, 20, 0);
    if (mode === 'far' || mode === 'edge') f.bases[2][1].v = mode === 'far' ? 15 : 14;
    if (mode === 'edge') hitDraws(f); done(f.runBase()); assert.equal(f.queued.length, mode === 'edge' ? 1 : 0);
  }
});

test('BASPHA truncates 200/NUMPLY before PHADAM and does not impose a minimum shot size', () => {
  for (const [n, size] of [[3n, 66n], [201n, 0n]] as const) {
    const f = fixture(); f.shared.numply = n; hitDraws(f); done(f.runBase()); assert.equal(f.calls[0][3], size);
    if (size === 0n) { assert.equal(f.players[1].ship.damage, 0n); assert.equal(f.players[1].ship.condition, K.RED); }
  }
});

test('BASPHA NUMPLY zero fails at the source division after setting hit metadata, without adding a game error', () => {
  const f = fixture(); f.shared.numply = 0n; assert.throws(() => done(f.runBase()), /divide by zero/);
  assert.equal(f.hit.dispfr, 401n); assert.equal(f.hit.iwhat, 1n); assert.equal(f.bas.id, 2n); assert.equal(f.calls.length, 0); assert.equal(f.out.drain(), '');
});

test('BASPHA real ship kill awards team damage and kill points, retains tractor state and includes the dead victim', () => {
  const f = fixture(); f.players[1].ship.energy = 1n; f.players[1].ship.tractor = 6; hitDraws(f); done(f.runBase());
  assert.equal(f.players[1].alive, 0n); assert.equal(f.board.disp(10, 20), 0); assert.equal(f.players[1].ship.tractor, 6);
  assert.equal(f.scores.team(2, K.KPEDAM), 6480n); assert.equal(f.scores.team(2, K.KPEKIL), 5000n); assert.equal(f.queued[0].klflg, 2n);
  assert.ok((f.queued[0].dbits & 1n) !== 0n); assert.equal(f.players[1].hitflg, 1n);
});

test('BASPHA reads the base strength after PHADAM and selects recipients around the current target coordinates', () => {
  const f = fixture(); const damage = f.io.phadam; hitDraws(f);
  f.io.phadam = function* (...args) { yield* damage(...args); f.bases[2][1].strength = 700n; f.players[1].ship.v = 20; yield 'damage'; };
  const g = f.runBase(); assert.equal(g.next().value, 'damage'); assert.equal(f.scores.team(2, K.KPEDAM), 0n); done(g);
  assert.equal(f.queued[0].shstfr, 700n); assert.equal(f.queued[0].vto, 10n); assert.ok(f.events.includes('pridis:20,20,10,1,0'));
});

test('BASPHA keeps K and ID by reference across PHADAM and uses the changed K for later recipient selection', () => {
  const f = fixture(); f.io.phadam = function* (_kind, k, id) { k.value = 2n; id.value = 77n; f.hit.ihita = 3n; };
  Object.assign(f.players[2].ship, { v: 40, h: 40 }); done(f.runBase()); assert.equal(f.bas.id, 77n);
  assert.equal(f.queued[0].dispto, 101n); assert.ok(f.events.includes('pridis:40,40,10,1,0')); assert.ok((f.queued[0].dbits & 2n) !== 0n);
});

test('BASPHA targets all eligible opponents in physical order before attacking the Romulan', () => {
  const f = fixture(); f.players[2].alive = -1n; Object.assign(f.players[2].ship, { v: 11, h: 20, shieldCondition: -1n }); f.board.setdsp(11, 20, 102);
  Object.assign(f.shared, { rom: -1n }); Object.assign(f.shared.locr, { v: 12, h: 21 }); hitDraws(f, 2); f.integers.push(100n); done(f.runBase());
  assert.deepEqual(f.queued.map(h => h.dispto), [101n, 102n, 500n]); assert.equal(f.queued[2].shstto, 801n);
  assert.equal(f.scores.team(2, K.KPRKIL), 2000n);
});

test('BASPHA actual PHAROM death credits the firing team and clears the Romulan cell', () => {
  const f = fixture(); f.players[1].alive = 0n; f.shared.rom = -1n; f.shared.erom = 1n; Object.assign(f.shared.locr, { v: 10, h: 20 });
  f.board.setdsp(10, 20, 500); f.integers.push(100n); done(f.runBase()); assert.equal(f.shared.rom, 0n); assert.equal(f.shared.erom, -99n);
  assert.deepEqual(f.calls, [[500n, 100n, 2n]]); assert.equal(f.scores.team(2, K.KPRKIL), 6000n); assert.equal(f.board.disp(10, 20), 0);
  assert.equal(f.queued[0].klflg, 2n); assert.ok(f.events.indexOf('pharom') < f.events.indexOf('pridis:10,20,10,0,0'));
});

test('BASPHA rechecks ALIVE for later bases after an earlier base kills the target', () => {
  const f = fixture(); f.bases[2][2].strength = 1000n; f.players[1].ship.energy = 1n; hitDraws(f); done(f.runBase());
  assert.equal(f.queued.length, 1); assert.equal(f.calls.length, 1); assert.equal(f.scores.team(2, K.KPEKIL), 5000n);
});

test('BASPHA does not recheck current base strength between targets after a notification wait', () => {
  const f = fixture(); f.players[2].alive = -1n; Object.assign(f.players[2].ship, { v: 11, h: 20, shieldCondition: -1n }); f.board.setdsp(11, 20, 102);
  hitDraws(f, 2); const original = f.io.makhit; f.io.makhit = function* () { yield* original(); f.bases[2][1].strength = 0n; };
  done(f.runBase()); assert.equal(f.queued.length, 2); assert.equal(f.queued[1].shstfr, 0n);
});

test('PLNATK no planets returns without changing local or hit state', () => {
  const f = fixture(); f.pln.k = 77n; f.hit.iwhat = 9n; done(f.runPlanet()); assert.equal(f.pln.k, 77n); assert.equal(f.hit.iwhat, 9n); assert.deepEqual(f.events, []);
});

test('PLNATK composes real PHADAM with fixed kind two even when firing on a Federation ship', () => {
  const f = fixture(); f.planet(); hitDraws(f); done(f.runPlanet());
  assert.deepEqual(f.calls, [[2n, 1n, 2n, 100n, 0n]]); assert.equal(f.players[1].ship.damage, 6480n); assert.equal(f.scores.team(2, K.KPEDAM), 6480n);
  assert.equal(f.queued[0].dispfr, 801n); assert.equal(f.queued[0].dispto, 101n); assert.equal(f.queued[0].shstfr, 5n);
  assert.equal(f.queued[0].shcnfr, 0n); assert.equal(f.pln.k, 2n); assert.equal(f.pln.j, 11n);
});

test('PLNATK neutral skip draw precedes PLAYER filtering and compiler eager AND can consume it for captured planets', () => {
  const f = fixture(); f.planet(601); f.integers.push(1n); done(f.runPlanet()); assert.equal(f.calls.length, 0); assert.deepEqual(f.events, ['iran:2']);
  const g = fixture(); g.planet(701); g.io.and = (...terms) => terms.map(t => t()).every(Boolean); g.integers.push(2n); done(g.runPlanet());
  assert.deepEqual(g.events, ['iran:2']); assert.equal(g.calls.length, 0);
});

test('PLNATK neutral planets attack both ship halves without assigning team scores', () => {
  const f = fixture(); f.planet(601); f.players[6].ship.v = 13; f.board.setdsp(13, 20, 206); f.integers.push(2n); hitDraws(f, 2); done(f.runPlanet());
  assert.deepEqual(f.queued.map(h => h.dispto), [101n, 206n]); assert.ok(f.scores.teamWords.every(n => n === 0n)); assert.equal(f.pln.pteam, 0n);
});

test('PLNATK activating player suppresses its own planets including their Romulan attack; Romulan calls allow them', () => {
  const f = fixture(); f.planet(701); f.shared.rom = -1n; Object.assign(f.shared.locr, { v: 11, h: 20 }); f.players[6].alive = 0n;
  done(f.runPlanet()); assert.equal(f.calls.length, 0); f.ctx.player = 0n; f.integers.push(100n); done(f.runPlanet());
  assert.deepEqual(f.calls, [[500n, 200n, 1n]]); assert.equal(f.scores.team(1, K.KPRKIL), 4000n);
});

test('PLNATK skips own-team ships and rejects invisible, dead or more-than-two-sector targets', () => {
  for (const mode of ['friendly', 'cloaked', 'dead', 'far']) {
    const f = fixture(); f.planet(mode === 'friendly' ? 701 : 801); f.ctx.player = 0n; f.players[6].alive = 0n;
    if (mode === 'cloaked') f.board.setdsp(10, 20, 0); if (mode === 'dead') f.players[1].alive = 0n;
    if (mode === 'far') { f.players[1].ship.v = 9; f.board.setdsp(9, 20, 101); }
    done(f.runPlanet()); assert.equal(f.calls.length, 0);
  }
});

test('PLNATK scales ship power by NUMPLY but leaves Romulan power undivided', () => {
  const f = fixture(); f.planet(801, 4n); f.shared.numply = 3n; f.shared.rom = -1n; Object.assign(f.shared.locr, { v: 10, h: 21 });
  hitDraws(f); f.integers.push(100n); done(f.runPlanet()); assert.deepEqual(f.calls, [[2n, 1n, 2n, 56n, 0n], [500n, 170n, 2n]]);
  assert.equal(f.scores.team(2, K.KPEDAM), 3628n); assert.equal(f.scores.team(2, K.KPRKIL), 1700n);
});

test('PLNATK retains stale shield-condition metadata and does not clear KLFLG at entry', () => {
  const f = fixture(); f.planet(); f.hit.shcnfr = 77n; f.hit.klflg = 1n; hitDraws(f); done(f.runPlanet());
  assert.equal(f.queued[0].shcnfr, 77n); assert.equal(f.queued[0].klflg, 1n); assert.equal(f.players[1].alive, 0n); assert.equal(f.scores.team(2, K.KPEKIL), 5000n);
});

test('PLNATK Romulan recipients are selected before damage, while base recipients are selected afterward', () => {
  const f = fixture(); f.planet(); f.players[1].alive = 0n; f.shared.rom = -1n; Object.assign(f.shared.locr, { v: 10, h: 20 });
  f.integers.push(100n); const original = f.io.pharom; f.io.pharom = function* (...args) { yield* original(...args); f.shared.locr.v = 30; };
  done(f.runPlanet()); assert.ok(f.events.indexOf('pridis:10,20,10,2,0') < f.events.indexOf('pharom'));
  assert.equal(f.queued[0].vto, 10n); assert.ok(!f.events.includes('pridis:30,20,10,2,0'));
});

test('PLNATK captures NPLNET for the loop but reads later rows live after MAKHIT', () => {
  const f = fixture(); f.planet(); f.count.value = 2n; Object.assign(f.planets[2], { v: 30, h: 30, builds: 1n }); f.board.setdsp(30, 30, 802);
  hitDraws(f, 2); const original = f.io.makhit; f.io.makhit = function* () { yield* original(); f.count.value = 1n; Object.assign(f.planets[2], { v: 11, h: 20 }); f.board.setdsp(11, 20, 802); };
  done(f.runPlanet()); assert.deepEqual(f.queued.map(h => h.dispfr), [801n, 802n]); assert.equal(f.pln.k, 3n);
});

test('PLNATK reads live planet power for later targets but keeps PCODE/PTEAM from the start of that planet', () => {
  const f = fixture(); f.planet(601); f.players[2].alive = -1n; Object.assign(f.players[2].ship, { v: 11, h: 20, shieldCondition: -1n });
  f.board.setdsp(11, 20, 102); f.players[6].alive = 0n; f.integers.push(2n); hitDraws(f, 2); const original = f.io.makhit;
  f.io.makhit = function* () { yield* original(); f.planets[1].builds = 1n; f.board.setdsp(12, 20, 801); }; done(f.runPlanet());
  assert.equal(f.calls[1][3], 40n); assert.equal(f.queued[1].dispfr, 801n); assert.equal(f.pln.pteam, 0n); assert.ok(f.scores.teamWords.every(n => n === 0n));
});

test('PLNATK does not force the victim bit after PRIDIS but BASPHA does', () => {
  for (const base of [false, true]) {
    const f = fixture(); if (!base) f.planet(); hitDraws(f); f.io.pridis = () => { f.hit.dbits = 0n; };
    done(base ? f.runBase() : f.runPlanet()); assert.equal(f.queued[0].dbits, base ? 1n : 0n); assert.equal(f.players[1].hitflg, base ? 1n : 0n);
  }
});

test('BASBLD rebuilds the opposing team using truncated 25/NUMSID and ignores NBASE counts', () => {
  for (const team of [1n, 2n]) {
    const f = fixture(); f.ctx.team = team; f.numsid[Number(team)] = 3n; f.nbase.fill(0n); f.bases[1][1].strength = 500n; f.bases[2][1].strength = 500n;
    f.runRebuild(); assert.equal(f.bases[Number(3n - team)][1].strength, 508n); assert.equal(f.bases[Number(team)][1].strength, 500n);
    assert.equal(f.rebuild.n, 8n); assert.equal(f.rebuild.ie, 3n - team);
  }
});

test('BASBLD Romulan mode uses 50/(NUMPLY+1) on both teams and never reads NUMSID', () => {
  const f = fixture(); f.ctx.player = 0n; f.io.sideCount = () => { assert.fail(); }; f.shared.numply = 2n;
  f.bases[1][1].strength = 500n; f.bases[2][1].strength = 500n; f.runRebuild();
  assert.equal(f.rebuild.n, 16n); assert.equal(f.bases[1][1].strength, 516n); assert.equal(f.bases[2][1].strength, 516n);
  assert.equal(f.rebuild.j, 3n); assert.equal(f.rebuild.i, BigInt(K.KNBASE + 1));
});

test('BASBLD skips nonpositive strength, caps at 1000 and permits zero or negative increments', () => {
  const f = fixture(); [0n, -1n, 995n, 1200n].forEach((n, i) => { f.bases[2][i + 1].strength = n; }); f.runRebuild();
  assert.deepEqual(f.bases[2].slice(1, 5).map(b => b.strength), [0n, -1n, 1000n, 1000n]);
  f.numsid[1] = 26n; f.bases[2][1].strength = 1n; f.runRebuild(); assert.equal(f.bases[2][1].strength, 1n);
  f.numsid[1] = -1n; f.runRebuild(); assert.equal(f.bases[2][1].strength, -24n);
});

test('BASBLD initial NUMPLY division still runs before the player-specific replacement division', () => {
  const f = fixture(); f.shared.numply = -1n; f.rebuild.n = 77n; assert.throws(() => f.runRebuild(), /divide by zero/);
  assert.equal(f.rebuild.ib, 1n); assert.equal(f.rebuild.ie, 2n); assert.equal(f.rebuild.n, 77n);
  f.shared.numply = 2n; f.numsid[1] = 0n; assert.throws(() => f.runRebuild(), /divide by zero/); assert.equal(f.rebuild.n, 16n); assert.equal(f.rebuild.ib, 2n);
});

test('BASPHA→MAKHIT→GETHIT→OUTHIT produces the source base-hit bytes', () => {
  const f = fixture(); hitDraws(f); done(f.runBase()); done(outHit({ who: 1, team: 1, oflg: 0, ocflg: K.KABS, nomsg: 0n, ship: f.players[1].ship },
    f.hit, f.players, f.out, function* (who) { f.queue.get(who, f.hit, f.players); }));
  assert.equal(f.out.drain(), ')( @12-20, +100.0%  648.0 unit P  L @10-20, -100.0%\r\n');
});

test('PLNATK→MAKHIT→GETHIT→OUTHIT retains unscaled planet builds and source hit output', () => {
  const f = fixture(); f.planet(); hitDraws(f); done(f.runPlanet()); done(outHit({ who: 1, team: 1, oflg: 0, ocflg: K.KABS, nomsg: 0n, ship: f.players[1].ship },
    f.hit, f.players, f.out, function* (who) { f.queue.get(who, f.hit, f.players); }));
  assert.equal(f.out.drain(), '-@5 @12-20  648.0 unit P  L @10-20, -100.0%\r\n');
});

test('finishTurn composes actual base/planet defenses and rebuild before committing the turn and scores', () => {
  const f = fixture(); f.planet(); f.nbase[2] = 1n; f.bases[2][1].strength = 900n; hitDraws(f, 2);
  const ctx = { who: 1, team: 1, prtype: 1, player: -1n, tpoint: Array<bigint>(K.KNPOIN + 1).fill(0n),
    shared: { players: f.players, scores: f.scores, dotime: 1n, numply: 2n, romopt: 0n } };
  ctx.tpoint[K.KPRKIL] = 123n; const turns = f.players[1].ship.turns;
  done(finishTurn(ctx, false, f.out, { *repair() { assert.fail(); }, baspha: f.runBase, plnatk: f.runPlanet, *basbld() { f.runRebuild(); }, *romdrv() { assert.fail(); } }));
  assert.deepEqual(f.queued.map(h => h.dispfr), [401n, 801n]); assert.equal(f.bases[2][1].strength, 925n);
  assert.equal(f.players[1].ship.damage, 12960n); assert.equal(f.players[1].ship.turns, turns + 1n); assert.equal(f.scores.team(2, K.KPEDAM), 12960n);
  assert.equal(f.scores.player(K.KPRKIL, 1), 123n); assert.equal(f.scores.team(1, K.KPRKIL), 123n); assert.equal(ctx.shared.dotime, 0n);
});

test('Defense PHADAM false firing-ship argument bypasses triggering-player device penalties and player/RSR awards', () => {
  for (const player of [-1n, 0n]) {
    const f = fixture(); f.ctx.player = player; f.players[1].ship.devices[K.KDPHAS] = 1n; f.players[1].ship.devices[K.KDCOMP] = 1n;
    hitDraws(f); done(f.runBase()); assert.equal(f.queued[0].ihita, 6480n); assert.ok(f.tpoint.every(n => n === 0n)); assert.ok(f.rsr.every(n => n === 0n));
  }
});

test('BASPHA critical PHADAM damage reaches the victim device and packed hit output without a second score award', () => {
  const f = fixture(); f.draws.push('.9', '0', '0', '.5'); f.integers.push(1n); done(f.runBase());
  assert.equal(f.players[1].ship.devices[1], 3240n); assert.equal(f.queued[0].critdv, 1n); assert.equal(f.queued[0].critdm, 3240n);
  assert.equal(f.queued[0].ihita, 3240n); assert.equal(f.scores.team(2, K.KPEDAM), 3240n);
  f.queue.get(1, f.hit, f.players); assert.equal(f.hit.critdm, 3240n); assert.ok(f.tpoint.every(n => n === 0n));
});

test('PLNATK captured Romulan kill credits its owner while neutral Romulan kill leaves team scores untouched', () => {
  for (const code of [601, 801]) {
    const f = fixture(); f.planet(code); f.players[1].alive = 0n; f.players[6].alive = 0n; f.shared.rom = -1n; f.shared.erom = 1n;
    Object.assign(f.shared.locr, { v: 10, h: 20 }); f.board.setdsp(10, 20, 500); if (code === 601) f.integers.push(2n); f.integers.push(100n);
    done(f.runPlanet()); assert.equal(f.shared.rom, 0n); assert.equal(f.queued[0].klflg, 2n); assert.equal(f.queued[0].shstto, -199n);
    assert.equal(f.scores.team(2, K.KPRKIL), code === 601 ? 0n : 7000n); assert.equal(f.integers.length, 0);
  }
});

test('PLNATK retains negative build power, so source PHADAM can repair hull and add energy', () => {
  const f = fixture(); f.planet(801, -2n); hitDraws(f); done(f.runPlanet()); assert.equal(f.calls[0][3], -5n);
  assert.equal(f.queued[0].shstfr, -2n); assert.equal(f.players[1].ship.damage, -324n); assert.equal(f.players[1].ship.energy, 50324n);
  assert.equal(f.scores.team(2, K.KPEDAM), -324n);
});

test('PLNATK killed target is skipped by a later planet and no synthetic tractor release is inserted', () => {
  const f = fixture(); f.planet(); f.count.value = 2n; Object.assign(f.planets[2], { v: 11, h: 20, builds: 5n }); f.board.setdsp(11, 20, 802);
  f.players[1].ship.energy = 1n; f.players[1].ship.tractor = 6; hitDraws(f); done(f.runPlanet());
  assert.equal(f.calls.length, 1); assert.equal(f.players[1].ship.tractor, 6); assert.equal(f.scores.team(2, K.KPEKIL), 5000n);
});

test('PLNATK J, ID, PHIT and PTEAM are writable source arguments and later calls reread changes', () => {
  const f = fixture(); f.planet(); f.io.phadam = function* (kind, j, id, phit, ship) {
    assert.equal(kind.value, 2n); assert.equal(ship.value, 0n); j.value = 2n; id.value = 77n; phit.value = 88n; f.hit.ihita = 3n;
  };
  Object.assign(f.players[2].ship, { v: 40, h: 40 }); const original = f.io.pridis;
  f.io.pridis = (v, h, limit, flag, zero) => { original(v, h, limit, flag, zero); if (limit.value === BigInt(K.KRANGE)) flag.value = 1n; };
  done(f.runPlanet()); assert.equal(f.pln.id, 77n); assert.equal(f.pln.phit, 88n); assert.equal(f.pln.pteam, 1n);
  assert.ok(f.events.includes('pridis:40,40,10,2,0')); assert.equal(f.queued[0].dispto, 101n); assert.equal(f.scores.team(2, K.KPEDAM), 3n);
});

test('finishTurn suspends at defense notification before planet attack, rebuilding and stardate accounting', () => {
  const f = fixture(); hitDraws(f); const original = f.io.makhit; f.io.makhit = function* () { yield 'hit'; yield* original(); };
  f.bases[2][1].strength = 900n; const turns = f.players[1].ship.turns;
  const ctx = { who: 1, team: 1, prtype: 1, player: -1n, tpoint: f.tpoint,
    shared: { players: f.players, scores: f.scores, dotime: 1n, numply: 2n, romopt: 0n } };
  const g = finishTurn(ctx, false, f.out, { *repair() { assert.fail(); }, baspha: f.runBase, plnatk: f.runPlanet, *basbld() { f.runRebuild(); }, *romdrv() { assert.fail(); } });
  assert.equal(g.next().value, 'hit'); assert.equal(f.players[1].ship.turns, turns); assert.equal(f.bases[2][1].strength, 900n);
  assert.equal(f.scores.team(2, K.KPEDAM), 6480n); assert.equal(f.queue.serial, 0n); done(g);
  assert.equal(f.bases[2][1].strength, 925n); assert.equal(f.players[1].ship.turns, turns + 1n); assert.equal(f.queue.serial, 1n);
});
