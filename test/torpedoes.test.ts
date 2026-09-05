import test from 'node:test';
import assert from 'node:assert/strict';
import { torpedoFixture as fixture, done } from './support/torpedo-fixture.ts';
import { TorpedoMemory } from '../src/game/torpedoes.ts';
import { constants as K, messages as M } from '../src/generated/source-data.ts';
import { orderedRational as real } from './support/rational-real.ts';
import { gtkn } from '../src/compat/gtkn.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import type { Wait } from './support/torpedo-fixture.ts';
import { outHit } from '../src/game/out-hit.ts';

function shots(f: ReturnType<typeof fixture>, n = 1) { f.draws.push(...Array(n * 2).fill('.5')); f.integers.push(...Array<bigint>(n).fill(1n)); }

test('TORP composes parser, path and hit queue for a miss, spends ammunition and sets TOBANK without energy charge', () => {
  const f = fixture(); shots(f); assert.deepEqual(done(f.run()), { alternateReturn: false });
  assert.equal(f.ship.torpedoes, 9n); assert.equal(f.ship.energy, 50000n); assert.equal(f.ship.condition, K.RED); assert.equal(f.ctx.tobank, 5500n);
  assert.equal(f.local.id, 2n); assert.equal(f.memory.pause, 3000n); assert.equal(f.queued[0].iwhat, 4n); assert.equal(f.queued[0].vto, 18n);
  assert.deepEqual(f.events, ['locate:-7', 'clock', 'pause:1000', 'ran', 'iran:100', 'ran', 'check:8', 'makhit', 'clock']);
});

test('TORP critical tubes abort before clearing TOLOCL, input, clock or local initialization', () => {
  const f = fixture(); f.ship.devices[K.KDTORP] = BigInt(K.KCRIT); f.local.iflg = 77n;
  assert.equal(done(f.run()).alternateReturn, true); assert.ok(f.memory.words.every(n => n === 88n)); assert.equal(f.local.iflg, 77n);
  assert.deepEqual(f.events, []); assert.equal(f.out.drain(), M.torp00.text + '\r\n');
});

test('TORP no-ammunition paths clear all seven TOLOCL words and preserve verbosity-specific output', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture(); f.ctx.oflg = oflg; f.ship.torpedoes = 0n; assert.equal(done(f.run()).alternateReturn, true);
    assert.ok(f.memory.words.every(n => n === 0n)); assert.equal(f.local.i, 2n); assert.deepEqual(f.events, []);
    assert.equal(f.out.drain(), oflg === K.SHORT ? '\r\n0' + M.torp07.text + '\r\n' : M.torp01.text + '\r\n');
  }
});

test('TORP rejects nonpositive count silently, warns for too many available torpedoes and caps bursts at three', () => {
  for (const count of [0, -1, 4, 11]) {
    const f = fixture(`TORPEDO ${count} 12 20`); assert.equal(done(f.run()).alternateReturn, true); assert.equal(f.ctx.tobank, 2000n);
    if (count <= 0) assert.equal(f.out.drain(), '');
    else assert.equal(f.out.drain(), (count > 10 ? M.torp03.text + '\r\n\r\n' : '\r\n') + '10' + M.torp07.text + '\r\n');
  }
});

test('TORP repeats missing target coordinates for later torpedoes and retains column-major storage', () => {
  const f = fixture('TORPEDO 3 12 20'); shots(f, 3); done(f.run());
  assert.deepEqual(f.memory.words, [12n, 12n, 12n, 20n, 20n, 20n, 9000n]); assert.equal(f.ship.torpedoes, 7n); assert.equal(f.ctx.tobank, 11500n);
  assert.deepEqual(f.queued.map(h => h.critdv), [1n, 2n, 3n]);
});

test('TORP stores separately supplied targets and repeats only the last supplied pair', () => {
  for (const [line, vertical] of [['TORPEDO 3 12 20 13 20', [12n, 13n, 13n]], ['TORPEDO 3 12 20 13 20 14 20', [12n, 13n, 14n]]] as const) {
    const f = fixture(line); shots(f, 3); done(f.run()); assert.deepEqual(f.memory.words.slice(0, 3), vertical);
  }
});

test('TORP initial inline even count bypasses prompted odd-count gate and consumes stale VALLST words', () => {
  const f = fixture('TORPEDO 1 12'); shots(f); f.draws.push('.5', '.5'); done(f.run());
  assert.equal(f.local.tem, 2n); assert.deepEqual(f.memory.words.slice(0, 4), [12n, 0n, 0n, 12n]);
});

test('TORP initial prompt repeats even or zero counts, while separate target prompt accepts a zero count', () => {
  const f = fixture('TORPEDO'), g = f.run(); assert.equal(g.next().value, 'input'); assert.equal(f.out.drain(), M.torp02.text + M.coord1.text);
  f.input.acceptLine('12 20'); assert.equal(g.next().value, 'input'); f.input.acceptLine('1'); assert.equal(g.next().value, 'input');
  f.input.acceptLine('12 20'); shots(f); done(g); assert.deepEqual(f.memory.words.slice(0, 4), [12n, 0n, 0n, 20n]);
  const h = fixture('TORPEDO 1'), original = h.io.locate;
  h.io.locate = function* (entry, n) { if (entry === 'locate') return yield* original(entry, n); h.input.tokens[0].value = 12n; h.input.tokens[1].value = 20n; return 0n; };
  shots(h); done(h.run()); assert.equal(h.local.tem, 0n); assert.equal(h.ship.torpedoes, 9n);
});

test('TORP own-position validation returns normally and rewrites TOBANK before loading or consuming ammunition', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture('TORPEDO 1 10 20'); f.ctx.oflg = oflg; assert.equal(done(f.run()).alternateReturn, false);
    assert.equal(f.ctx.tobank, 1000n); assert.equal(f.ship.torpedoes, 10n); assert.equal(f.ship.condition, K.GREEN); assert.equal(f.memory.pause, 0n);
    assert.equal(f.out.drain(), (oflg <= 0 ? M.error2.text : M.error1.text) + '\r\n'); assert.deepEqual(f.events, ['locate:-7', 'clock']);
  }
});

test('TORP rejects all out-of-range burst targets before loading the tubes', () => {
  const f = fixture('TORPEDO 3 12 20 21 20'); assert.equal(done(f.run()).alternateReturn, true); assert.equal(f.ctx.tobank, 2000n);
  assert.equal(f.ship.torpedoes, 10n); assert.equal(f.out.drain(), M.phacn1.text + '\r\n'); assert.deepEqual(f.events, ['locate:-7']);
});

test('TORP after bank wait rereads own position and aborts normally if it now equals the target, after deflection draw', () => {
  const f = fixture(); f.io.pause = function* () { yield 'pause'; }; const g = f.run(); assert.equal(g.next().value, 'pause'); f.ship.v = 12; f.draws.push('.5');
  assert.equal(done(g).alternateReturn, false); assert.equal(f.ship.torpedoes, 10n); assert.equal(f.ship.condition, K.RED); assert.equal(f.ctx.tobank, 2500n);
  assert.equal(f.queued.length, 0); assert.equal(f.events.at(-2), 'ran');
});

test('TORP docked firing preserves ammunition but still requires sufficient ammunition at entry', () => {
  const f = fixture('TORPEDO 3 12 20'); f.ship.docked = true; f.ship.torpedoes = 3n; shots(f, 3); done(f.run()); assert.equal(f.ship.torpedoes, 3n);
  const g = fixture('TORPEDO 3 12 20'); g.ship.docked = true; g.ship.torpedoes = 2n; assert.equal(done(g.run()).alternateReturn, true);
});

test('TORP does not recheck ammunition or critical tubes after the bank wait', () => {
  const f = fixture(); f.io.pause = function* () { f.ship.torpedoes = 0n; f.ship.devices[K.KDTORP] = BigInt(K.KCRIT); };
  f.draws.push('.5', '.5', '.5'); f.integers.push(1n); done(f.run()); assert.equal(f.ship.torpedoes, -1n); assert.equal(f.memory.pause, 6000n);
});

test('TORP deflection adds normal, damaged-device and positive-shield draws in source order', () => {
  const f = fixture(); f.ship.devices[K.KDCOMP] = 1n; f.ship.shieldCondition = 1n; f.draws.push('.9', '.8', '.7', '.5'); f.integers.push(1n);
  f.io.check = (_v, _h, iv, ih, distance, d) => {
    assert.deepEqual([iv.value, ih.value, distance.value], [2n, 0n, 8n]); assert.equal(real.toInteger(real.multiply(d.value, real.literal('1000'))), 130n);
    Object.assign(f.path, { dcode: 0n, h2: 18n, v2: 20n });
  };
  done(f.run()); assert.deepEqual(f.events.slice(3, 8), ['ran', 'ran', 'ran', 'iran:100', 'ran']);
});

test('TORP range formula preserves signed INT truncation and varies from seven to ten', () => {
  for (const [draw, expected] of [['0', 7n], ['.25', 8n], ['.5', 8n], ['.625', 9n], ['.999', 10n]] as const) {
    const f = fixture(); f.draws.push('.5', draw); f.integers.push(1n); done(f.run()); assert.equal(f.local.idis, expected); assert.equal(f.queued[0].vto, 10n + expected);
  }
});

test('TORP misfire still resolves that torpedo, then stops the burst after populating next-shot source fields', () => {
  const f = fixture('TORPEDO 3 12 20'); f.draws.push('.5', '.5', '.5'); f.integers.push(97n, 1n); done(f.run());
  assert.equal(f.ship.torpedoes, 9n); assert.equal(f.local.iflg, -1n); assert.equal(f.local.id, 2n); assert.equal(f.queued.length, 1); assert.equal(f.queued[0].iwhat, 4n);
  assert.equal(f.memory.pause, 3000n); assert.equal(f.hit.iwhat, 0n); assert.equal(f.hit.dispfr, 101n); assert.equal(f.hit.vfrom, 10n);
  assert.equal(f.out.drain(), M.torp04.text + '1' + M.torp05.text + '\r\n');
});

test('TORP misfire damage is included in current-shot recharge even if it becomes critical', () => {
  const f = fixture(); f.draws.push('.5', '.5', '.5'); f.integers.push(100n, 5n, 3000n); done(f.run());
  assert.equal(f.ship.devices[K.KDTORP], 3500n); assert.equal(f.memory.pause, 6500n); assert.equal(f.ctx.tobank, 9000n); assert.equal(f.queued.length, 1);
  assert.equal(f.out.drain(), M.torp04.text + '1' + M.torp05.text + '\r\n' + M.torp06.text + '\r\n');
});

test('TORP misfire threshold is strictly greater than 96', () => {
  const f = fixture(); shots(f); f.integers[0] = 96n; done(f.run()); assert.equal(f.local.iflg, 1n); assert.equal(f.out.drain(), '');
});

test('TORP captures shot-loop bounds once even if a notification changes NTORP', () => {
  const f = fixture('TORPEDO 3 12 20'); shots(f, 3); const original = f.io.makhit;
  f.io.makhit = function* () { yield* original(); f.local.ntorp = 1n; }; done(f.run()); assert.equal(f.queued.length, 3); assert.equal(f.local.id, 4n);
});

test('TORP friendly ships, bases and captured planets produce self-only avoidance after consuming the collision draw', () => {
  for (const code of [101, 301, 701]) {
    const f = fixture(undefined, code); shots(f); f.integers.push(1n); done(f.run()); assert.equal(f.queued[0].iwhat, 15n); assert.equal(f.queued[0].dbits, 1n);
    assert.equal(f.board.disp(12, 20), code); assert.equal(f.ship.torpedoes, 9n); assert.equal(f.events.filter(e => e === 'iran:100').length, 2);
  }
});

test('TORP black hole produces self-only type five with torpedo index, preserving hole', () => {
  const f = fixture(undefined, 1000); shots(f); f.integers.push(1n); done(f.run());
  assert.equal(f.queued[0].iwhat, 5n); assert.equal(f.queued[0].critdv, 1n); assert.equal(f.queued[0].vto, 12n); assert.equal(f.board.disp(12, 20), 1000);
});

test('TORP star reaction over 80 reports instability without destroying the star or charging star points', () => {
  const f = fixture(undefined, 900); shots(f); f.integers.push(81n); done(f.run());
  assert.equal(f.queued[0].iwhat, 6n); assert.equal(f.queued[0].dispfr, 900n); assert.equal(f.queued[0].vfrom, 12n); assert.equal(f.queued[0].dbits, 1n);
  assert.equal(f.board.disp(12, 20), 900); assert.equal(f.ctx.tpoint[K.KNSDES], 0n); assert.ok(!f.events.includes('snova'));
});

test('TORP at star threshold 80 composes actual SNOVA and charges the initial star separately', () => {
  const f = fixture(undefined, 900); shots(f); f.integers.push(80n); done(f.run());
  assert.equal(f.queued[0].iwhat, 7n); assert.equal(f.board.disp(12, 20), 0); assert.equal(f.ctx.tpoint[K.KNSDES], -500n); assert.ok(f.events.includes('snova'));
});

test('TORP actual TORDAM hit damages and displaces a ship, then releases an active tractor after the hit notice', () => {
  const f = fixture(undefined, 206); f.target.tractor = 1; f.ship.tractor = 6;
  f.draws.push('.5', '.5', '0', '0', '.5'); f.integers.push(1n, 1n); done(f.run());
  assert.equal(f.target.damage, 6000n); assert.equal(f.target.v, 13); assert.equal(f.target.energy, 44000n); assert.equal(f.ctx.tpoint[K.KPEDAM], 6000n);
  assert.deepEqual(f.queued.map(h => h.iwhat), [2n, 14n]); assert.equal(f.queued[0].vto, 13n); assert.equal(f.queued[0].shjump, 1n);
  assert.equal(f.target.tractor, 0); assert.equal(f.ship.tractor, 0); assert.equal(f.local.idum.value, 77n);
});

test('TORP passes the same IDUM reference twice to TORDAM and uses current DCODE after it returns', () => {
  const f = fixture(undefined, 206); shots(f); f.integers.push(1n);
  f.io.tordam = function* (_kind, _j, a, b, ship) { assert.equal(a, b); assert.equal(ship.value, -1n); a.value = 123n; assert.equal(b.value, 123n); f.path.dcode = 207n; f.hit.iwhat = 2n; };
  done(f.run()); assert.equal(f.queued[0].dispto, 207n); assert.equal(f.local.idum.value, 123n);
});

test('TORP intact-base distress clears registers, then source fields are restored before real damage', () => {
  const f = fixture(undefined, 401); f.draws.push('.5', '.5', '0', '0', '.5'); f.integers.push(1n, 1n); done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [9n, 2n]); assert.equal(f.bases[2][1].strength, 819n);
  assert.equal(f.queued[1].dispfr, 101n); assert.equal(f.queued[1].vfrom, 10n); assert.equal(f.queued[1].shstfr, 1000n);
});

test('TORP actual base destruction sends hit before destruction notice; later notice retains cleared sender fields', () => {
  const f = fixture(undefined, 401); f.bases[2][1].strength = 50n; f.draws.push('.5', '.5', '0', '0', '.5', '.2'); f.integers.push(1n, 1n, 1n); done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [2n, 10n]); assert.equal(f.nbase[2], 0n); assert.equal(f.ctx.tpoint[K.KPBDAM], 15700n);
  assert.equal(f.queued[1].dispfr, 0n); assert.equal(f.queued[1].vfrom, 0n); assert.equal(f.queued[1].vto, 12n);
});

test('TORP real Romulan damage, optional jump and score use current EROM/LOCR while notification range uses collision coordinates', () => {
  const f = fixture(undefined, 500); Object.assign(f.shared.locr, { v: 12, h: 20 }); shots(f); f.integers.push(1n, 1500n, 8n); done(f.run());
  assert.equal(f.shared.erom, 851n); assert.equal(f.ctx.tpoint[K.KPRKIL], 1500n); assert.equal(f.shared.locr.v, 13); assert.equal(f.board.disp(13, 20), 501);
  assert.equal(f.queued[0].vto, 13n); assert.equal(f.queued[0].dispto, 500n); assert.ok(f.events.includes('pridis:12,20,10,0,0'));
});

test('TORP Romulan death skips the jump draw under short-circuit policy and adds 5000 points', () => {
  const f = fixture(undefined, 500); Object.assign(f.shared.locr, { v: 12, h: 20 }); f.shared.erom = 1n; shots(f); f.integers.push(1n, 1500n); done(f.run());
  assert.equal(f.shared.rom, 0n); assert.equal(f.ctx.tpoint[K.KPRKIL], 6500n); assert.equal(f.queued[0].klflg, 2n); assert.ok(!f.events.includes('iran:10'));
});

test('TORP planet locking failure retains ammo loss and TPAUS but returns alternately without updating TOBANK', () => {
  const f = fixture(undefined, 601); shots(f); f.integers.push(1n); f.io.lockPlanet = function* () { yield 'lock'; return false; };
  const g = f.run(); assert.equal(g.next().value, 'lock'); assert.equal(f.ship.torpedoes, 9n); assert.equal(f.memory.pause, 3000n);
  assert.equal(done(g).alternateReturn, true); assert.equal(f.ctx.tobank, 2000n); assert.equal(f.queued.length, 0); assert.ok(!f.events.includes('unlock'));
  assert.equal(f.out.drain(), 'Sorry, Captain, but the torpedo tubes are empty!\r\n'); assert.equal(f.clocks.length, 1);
});

test('TORP planet decrement of one requires IRAN(4)=4, with zero remaining builds surviving', () => {
  for (const draw of [3n, 4n]) {
    const f = fixture(undefined, 601); f.planets[1].builds = 1n; shots(f); f.integers.push(1n, draw); done(f.run());
    assert.equal(f.planets[1].builds, draw === 4n ? 0n : 1n); assert.equal(f.count.value, 3n); assert.equal(f.queued[0].shstto, draw === 4n ? 0n : 1n);
    assert.ok(f.events.indexOf('unlock') < f.events.indexOf('makhit'));
  }
});

test('TORP planet destruction composes PLNRMV before unlocking and notifying, preserving captured collision identity', () => {
  const f = fixture(undefined, 801); f.planets[1].builds = 0n; f.numcap[2] = 1n; shots(f); f.integers.push(1n, 4n); done(f.run());
  assert.equal(f.count.value, 2n); assert.equal(f.numcap[2], 0n); assert.equal(f.ctx.tpoint[K.KNPDES], -1000n); assert.equal(f.queued[0].dispto, 801n);
  assert.equal(f.queued[0].klflg, 2n); assert.ok(f.events.indexOf('plnrmv:1') < f.events.indexOf('unlock')); assert.ok(f.events.indexOf('unlock') < f.events.indexOf('makhit'));
});

test('TORP stale nonzero KLFLG removes a planet even when its builds remain positive', () => {
  const f = fixture(undefined, 601); f.hit.klflg = 1n; shots(f); f.integers.push(1n, 1n); done(f.run());
  assert.equal(f.count.value, 2n); assert.equal(f.queued[0].shstto, 5n); assert.equal(f.queued[0].klflg, 1n); assert.equal(f.ctx.tpoint[K.KNPDES], -1000n);
});

test('TORP waits through MAKHIT before final recharge clock and preserves source side effects across the wait', () => {
  const f = fixture(); shots(f); const original = f.io.makhit; f.io.makhit = function* () { yield 'hit'; yield* original(); };
  const g = f.run(); assert.equal(g.next().value, 'hit'); assert.equal(f.ctx.tobank, 2000n); assert.equal(f.ship.torpedoes, 9n);
  f.clocks[0] = 9000n; done(g); assert.equal(f.ctx.tobank, 12000n);
});

test('TORP real GTKN accepts a slash-buffered burst and retains the next command', () => {
  const f = fixture('TORPEDO / 1 12 20 / TIME'); shots(f);
  f.locationIo.gtkn = () => gtkn({ locked: 0n, svlock: 0n, iniflg: 0n, hungup: 0n, ccflg: 0n, ccflgDot: 0n }, f.input, f.out, {
    daytime() { assert.fail(); }, inputPending() { assert.fail(); }, unlo() { assert.fail(); }, *lock() { return assert.fail(); }, *hibernate() { assert.fail(); }, *inli() { assert.fail(); },
  });
  done(f.run()); assert.equal(f.ship.torpedoes, 9n); assert.ok(f.input.acquire(f.out)); assert.equal(f.input.tokens[0].text, 'TIME');
});

test('TORP physical TOLOCL row aliases lead into the second column and then TPAUS', () => {
  const memory = new TorpedoMemory(0n); memory.target(4n, 1n).value = 5n; assert.equal(memory.target(1n, 2n).value, 5n);
  memory.target(4n, 2n).value = 77n; assert.equal(memory.pause, 77n); assert.throws(() => memory.target(5n, 2n), /surrounding/);
});

test('TORP dispatch uses weapon turn accounting and preserves PTIME independently from TOBANK', () => {
  const f = fixture(); shots(f); const ctx = { who: 1, player: -1n, ptime: 99n, shared: { players: f.players } }; let turns = 0;
  done(dispatchCommand<Wait>(ctx, 28, { *getcmd() { assert.fail(); }, *invoke(call) { assert.equal(call.routine, 'torp'); return yield* f.run(); },
    *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn(flag) { assert.equal(flag, false); turns++; }, movementContinuation() { assert.fail(); },
  }));
  assert.equal(turns, 1); assert.equal(ctx.ptime, 99n); assert.equal(f.ctx.tobank, 5500n);
});

test('TORP second shot follows the original bearing and hits the ship displaced by the first real TORDAM', () => {
  const f = fixture('TORPEDO 2 12 20', 206);
  f.draws.push('.5', '.5', '0', '0', '.5', '.5', '.5', '0', '0', '.5'); f.integers.push(1n, 1n, 1n, 1n);
  done(f.run()); assert.equal(f.target.v, 14); assert.equal(f.target.damage, 12000n); assert.equal(f.target.energy, 38000n);
  assert.deepEqual(f.queued.map(h => [h.iwhat, h.vto]), [[2n, 13n], [2n, 14n]]);
  assert.equal(f.board.disp(12, 20), 0); assert.equal(f.board.disp(14, 20), 206); assert.equal(f.ship.torpedoes, 8n);
  assert.equal(f.draws.length, 0); assert.equal(f.integers.length, 0);
});

test('TORP second shot passes through a base destroyed by the first shot and records a miss', () => {
  const f = fixture('TORPEDO 2 12 20', 401); f.bases[2][1].strength = 50n;
  f.draws.push('.5', '.5', '0', '0', '.5', '.2', '.5', '.5'); f.integers.push(1n, 1n, 1n, 1n); done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [2n, 10n, 4n]); assert.equal(f.queued[2].critdv, 2n); assert.equal(f.queued[2].vto, 18n);
  assert.equal(f.nbase[2], 0n); assert.equal(f.ctx.tpoint[K.KPBDAM], 15700n); assert.equal(f.memory.pause, 6000n);
  assert.equal(f.draws.length, 0); assert.equal(f.integers.length, 0);
});

test('TORP second shot passes through a planet removed by the first shot without decrementing its replacement row', () => {
  const f = fixture('TORPEDO 2 12 20', 601); f.planets[1].builds = 0n;
  shots(f, 2); f.integers.splice(1, 0, 1n, 4n); done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [2n, 4n]); assert.equal(f.planets[1].builds, 5n); assert.equal(f.count.value, 2n);
  assert.equal(f.ctx.tpoint[K.KNPDES], -1000n); assert.equal(f.integers.length, 0);
});

test('TORP star reaction composes actual SNOVA and NOVA ship damage with star and enemy damage scores', () => {
  const f = fixture(undefined, 900); f.target.v = 13; f.board.setdsp(13, 20, 206);
  f.draws.push('.5', '.5', ...Array(K.KNDEV).fill('0'), '.5'); f.integers.push(1n, 80n, 100n); done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [7n, 8n]); assert.equal(f.target.damage, 8100n); assert.equal(f.target.energy, 45950n);
  assert.equal(f.target.v, 14); assert.equal(f.queued[1].vfrom, 12n); assert.equal(f.queued[1].vto, 14n);
  assert.equal(f.ctx.tpoint[K.KNSDES], -500n); assert.equal(f.ctx.tpoint[K.KPEDAM], 8100n);
  assert.equal(f.board.disp(12, 20), 0); assert.equal(f.draws.length, 0); assert.equal(f.integers.length, 0);
});

test('TORP star reaction rereads ARAN after the instability notification returns', () => {
  const f = fixture(undefined, 900); shots(f); f.integers.push(81n); const original = f.io.makhit;
  f.io.makhit = function* () { yield* original(); f.local.aran = 80n; }; done(f.run());
  assert.deepEqual(f.queued.map(h => h.iwhat), [6n, 7n]); assert.equal(f.board.disp(12, 20), 0); assert.equal(f.ctx.tpoint[K.KNSDES], -500n);
});

test('TORP initial and chained stars incur separate penalties and leave the shared CHECK location at the last star', () => {
  const f = fixture(undefined, 900); f.board.setdsp(13, 20, 900); shots(f); f.integers.push(80n, 1n); done(f.run());
  assert.deepEqual(f.queued.map(h => [h.iwhat, h.vfrom]), [[7n, 12n], [7n, 13n]]); assert.equal(f.ctx.tpoint[K.KNSDES], -1000n);
  assert.equal(f.board.disp(12, 20), 0); assert.equal(f.board.disp(13, 20), 0); assert.equal(f.path.h2, 13n); assert.equal(f.integers.length, 0);
});

test('TORP compiler eager AND policy consumes the Romulan jump draw even after TOROM kills it', () => {
  const f = fixture(undefined, 500); Object.assign(f.shared.locr, { v: 12, h: 20 }); f.shared.erom = 1n;
  f.io.and = (...terms) => terms.map(t => t()).every(Boolean); shots(f); f.integers.push(1n, 1500n, 8n); done(f.run());
  assert.equal(f.shared.rom, 0n); assert.equal(f.ctx.tpoint[K.KPRKIL], 6500n); assert.ok(f.events.includes('iran:10'));
  assert.ok(!f.events.includes('jump')); assert.equal(f.integers.length, 0);
});

test('TORP lock wait retains collision identity but reads live planet coordinates and builds on return', () => {
  const f = fixture(undefined, 601); shots(f); f.integers.push(1n, 4n); f.io.lockPlanet = function* () { yield 'lock'; return true; };
  const g = f.run(); assert.equal(g.next().value, 'lock'); Object.assign(f.planets[1], { v: 30, h: 40, builds: 2n }); done(g);
  assert.equal(f.queued[0].dispto, 601n); assert.equal(f.queued[0].vto, 30n); assert.equal(f.queued[0].hto, 40n); assert.equal(f.queued[0].shstto, 1n);
  assert.ok(f.events.includes('pridis:12,20,10,0,0'));
});

test('TORP nonreturning ENDGAM during actual PLNRMV stops before unlock, hit delivery and recharge', () => {
  const f = fixture(undefined, 601); f.planets[1].builds = 0n; shots(f); f.integers.push(1n, 4n);
  const exit = new Error('fixture monitor exit'); f.removeIo.endgam = function* () { yield 'end'; throw exit; };
  const g = f.run(); assert.equal(g.next().value, 'end'); assert.equal(f.count.value, 2n); assert.equal(f.board.disp(12, 20), 0);
  assert.throws(() => g.next(), e => e === exit); assert.ok(!f.events.includes('unlock')); assert.equal(f.queued.length, 0);
  assert.equal(f.ctx.tobank, 2000n); assert.equal(f.ship.torpedoes, 9n); assert.equal(f.memory.pause, 3000n);
});

test('TORP alternate return after lock failure skips dispatch turn accounting while retaining the fired shot', () => {
  const f = fixture(undefined, 601); shots(f); f.integers.push(1n); f.io.lockPlanet = function* () { return false; };
  const ctx = { who: 1, player: -1n, ptime: 99n, shared: { players: f.players } };
  done(dispatchCommand<Wait>(ctx, 28, { *getcmd() { assert.fail(); }, *invoke() { return yield* f.run(); },
    *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn() { assert.fail('Alternate return must skip accounting'); }, movementContinuation() { assert.fail(); },
  }));
  assert.equal(ctx.ptime, 99n); assert.equal(f.ctx.tobank, 2000n); assert.equal(f.ship.torpedoes, 9n);
});

test('TORP three-shot burst composes packed MAKHIT/GETHIT and OUTHIT with exact bytes at all verbosities', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture('TORPEDO 3 12 20'); shots(f, 3); done(f.run());
    done(outHit({ ...f.ctx, oflg, ocflg: K.KABS }, f.hit, f.players, f.out, function* (who) { f.queue.get(who, f.hit, f.players); }));
    const expected = [1, 2, 3].map(id => oflg < 0 ? `T${id} miss 18-20\r\n` : oflg === 0 ? `T${id} miss @18-20\r\n`
      : `\r\nWeapons Officer:  Captain, torpedo ${id} lost @18-20\r\n`).join('');
    assert.equal(f.out.drain(), expected); assert.equal(f.players[1].hitflg, 0n);
  }
});
