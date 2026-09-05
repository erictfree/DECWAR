import test from 'node:test';
import assert from 'node:assert/strict';
import { phaserFixture as fixture, finish } from './support/phaser-fixture.ts';
import { constants as K, messages as M } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { outHit } from '../src/game/out-hit.ts';
import { gtkn } from '../src/compat/gtkn.ts';

// Ship/base PHADAM effects in these driver tests are explicit call fixtures,
// never a substitute damage implementation. Planet/Romulan/queue paths are real.
function damageFixture(f: ReturnType<typeof fixture>) {
  f.io.phadam = function* (nplc, index, id, phit, ship) {
    f.events.push(`phadam:${nplc.value},${index.value},${id.value},${phit.value},${ship.value}`);
    f.hit.ihita = 123n; f.hit.shstto = 800n; f.hit.shcnto = 1n;
  };
}

test('PHACON planet shot composes LOCATE, PRIDIS and MAKHIT, then charges energy and updates only the selected bank', () => {
  const f = fixture(); assert.deepEqual(finish(f.run()), { alternateReturn: false });
  assert.equal(f.ship.energy, 8000n); assert.equal(f.ship.condition, K.RED); assert.equal(f.ship.docked, true);
  assert.deepEqual(f.ctx.phbank, [0n, 7000n, 3000n]); assert.equal(f.planets[1].builds, 5n); assert.equal(f.out.drain(), '');
  assert.deepEqual(f.events, ['locate', 'clock', 'pause:1000', 'iran:100', 'disp:12,20', 'pridis:12,20,10,0,0', 'iran:100', 'makhit', 'clock']);
  assert.equal(f.queued[0].dbits, 33n); assert.equal(f.players[1].hitflg, 1n); assert.equal(f.players[6].hitflg, 1n);
  assert.equal(f.queued[0].dispto, 601n); assert.equal(f.queued[0].shstto, 5n); assert.equal(f.queued[0].iwhat, 1n);
});

test('PHACON critical phaser damage aborts before input or bank selection', () => {
  const f = fixture(); f.ship.devices[K.KDPHAS] = BigInt(K.KCRIT); f.local.bank = 77;
  assert.deepEqual(finish(f.run()), { alternateReturn: true }); assert.deepEqual(f.events, []); assert.equal(f.local.bank, 77);
  assert.equal(f.out.drain(), M.phacn0.text + '\r\n'); assert.equal(f.ship.docked, true);
});

test('PHACON rejects a lone scalar with the original error and repeats empty coordinate counts', () => {
  const one = fixture('PHASERS 200'); assert.equal(finish(one.run()).alternateReturn, true); assert.equal(one.out.drain(), M.erloc1.text + '\r\n');
  const f = fixture('PHASERS'), g = f.run(); assert.equal(g.next().value, 'input'); f.input.acceptLine('ABSOLUTE'); assert.equal(g.next().value, 'input');
  f.input.acceptLine('12 20'); assert.equal(finish(g).alternateReturn, false); assert.equal(f.local.tem, 2n);
});

test('PHACON bank selection prefers the earlier ready time, with ties going to bank one', () => {
  for (const [a, b, expected] of [[2000n, 2000n, 1], [3000n, 2000n, 2], [-200n, 0n, 1]] as const) {
    const f = fixture(); f.ctx.phbank[1] = a; f.ctx.phbank[2] = b; finish(f.run()); assert.equal(f.local.bank, expected);
    assert.ok(f.events.includes('pause:' + ((expected === 1 ? a : b) - 1000n)));
    assert.equal(f.ctx.phbank[expected], 7000n); assert.equal(f.ctx.phbank[3 - expected], expected === 1 ? b : a);
  }
});

test('PHACON object classification precedes ALIVE, zero distance, ally and range checks', () => {
  for (const code of [0, -1, 901, 1000]) {
    const f = fixture('PHASERS 12 20', code); assert.equal(finish(f.run()).alternateReturn, true);
    assert.equal(f.out.drain(), M.phacn7.text + '\r\n'); assert.deepEqual(f.events, ['locate']);
  }
  const f = fixture('PHASERS 12 20', 206); f.players[6].alive = 0n; finish(f.run()); assert.equal(f.out.drain(), M.phacn7.text + '\r\n');
});

test('PHACON ALIVE access in the compound expression follows the explicit compiler evaluation contract', () => {
  const f = fixture('PHASERS 12 20', 660); f.io.and = (a, b) => { const x = a(), y = b(); return x && y; };
  assert.throws(() => finish(f.run()), /ALIVE requires surrounding memory/); assert.equal(f.local.bank, 1); assert.ok(!f.events.includes('clock'));
  const g = fixture('PHASERS 12 20', 660); finish(g.run()); assert.equal(g.queued[0].shstto, 5n);
});

test('PHACON zero-distance error precedes ally rejection at every verbosity', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture('PHASERS 10 20'); f.ctx.oflg = oflg; finish(f.run());
    assert.equal(f.out.drain(), (oflg <= 0 ? M.error2.text : M.error1.text) + '\r\n'); assert.ok(!f.events.includes('clock'));
  }
});

test('PHACON rejects allied ships, bases and planets before range, with enemy range checked afterwards', () => {
  for (const code of [101, 301, 701, 206]) {
    const f = fixture('PHASERS 40 20', code); f.board.setdsp(40, 20, code); finish(f.run());
    assert.equal(f.out.drain(), (code === 206 ? M.phacn1.text : M.phacn9.text) + '\r\n'); assert.ok(!f.events.includes('clock'));
  }
});

test('PHACON invalid size waits first, resets PHIT to 200, and preserves energy, banks and condition', () => {
  for (const size of [49, 501]) {
    const f = fixture(`PHASERS ${size} 12 20`); f.local.phit = 999n; assert.equal(finish(f.run()).alternateReturn, true);
    assert.deepEqual(f.events, ['locate', 'clock', 'pause:1000']); assert.equal(f.local.phit, 200n);
    assert.equal(f.ship.energy, 10000n); assert.deepEqual(f.ctx.phbank, [0n, 2000n, 3000n]); assert.equal(f.ship.condition, K.GREEN);
    assert.equal(f.out.drain(), M.phacn8.text + '\r\n');
  }
});

test('PHACON rereads shot-size and shields after the bank pause, retaining the pre-wait target and bank', () => {
  const f = fixture('PHASERS 100 12 20'); f.io.pause = function* () { yield 'pause'; }; const g = f.run(); assert.equal(g.next().value, 'pause');
  f.input.tokens[0].value = 300n; f.input.tokens[1].value = 60n; f.ctx.phbank[2] = -1n; f.ship.shieldCondition = 0n;
  finish(g); assert.equal(f.local.phit, 300n); assert.equal(f.local.iv, 12n); assert.equal(f.local.bank, 1);
  assert.equal(f.ship.energy, 5000n); assert.equal(f.ship.shieldCondition, 0n); assert.equal(f.out.drain(), M.phacn2.text + '\r\n');
});

test('PHACON shield cycling charge includes zero and does not lower shields or undock', () => {
  for (const shields of [-1n, 0n, 1n]) for (const oflg of [-1, 0, 1]) {
    const f = fixture(); f.ship.shieldCondition = shields; f.ctx.oflg = oflg; finish(f.run());
    assert.equal(f.ship.energy, shields < 0n ? 8000n : 6000n); assert.equal(f.ship.shieldCondition, shields); assert.equal(f.ship.docked, true);
    assert.equal(f.out.drain(), shields >= 0n && oflg !== K.SHORT ? M.phacn2.text + '\r\n' : '');
  }
});

test('PHACON overheating threshold is strict and extra draw uses integer product before real multiplication', () => {
  for (const roll of [63n, 64n]) {
    const f = fixture('PHASERS 300 12 20'); f.draws.splice(0, 2, roll, 11n, 1n); finish(f.run());
    assert.equal(f.ship.devices[K.KDPHAS], roll === 63n ? 0n : 997n); assert.equal(f.ctx.phbank[1], roll === 63n ? 7000n : 7997n);
    assert.equal(f.events.filter(e => e === 'iran:100').length, roll === 63n ? 2 : 3);
  }
});

test('PHACON overheating output and assignment occur before target damage, and can exceed critical without aborting', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture('PHASERS 500 12 20'); f.ctx.oflg = oflg; f.draws.splice(0, 2, 100n, 100n, 1n); finish(f.run());
    assert.equal(f.ship.devices[K.KDPHAS], 4500n); assert.equal(f.ship.energy, 5000n); assert.equal(f.queue.serial, 1n);
    assert.equal(f.out.drain(), M.phacn4.text + '\r\n' + (oflg === K.LONG ? M.phacn5.text + '\r\n' : ''));
  }
});

test('PHACON planet reduction uses strict integer threshold, decrements at most one and clamps at zero', () => {
  for (const roll of [75n, 76n]) for (const before of [0n, 5n]) {
    const f = fixture('PHASERS 100 12 20'); f.planets[1].builds = before; f.draws[1] = roll; finish(f.run());
    assert.equal(f.planets[1].builds, before === 0n || roll === 75n ? before : 4n); assert.equal(f.ctx.tpoint.every(n => n === 0n), true);
  }
});

test('PHACON planet message retains stale IHITA, SHCNTO, critical and kill fields until MAKHIT clears them', () => {
  const f = fixture(); Object.assign(f.hit, { ihita: 777n, shcnto: -1n, critdv: 4n, critdm: 42n, klflg: 2n, shjump: 1n }); finish(f.run());
  const q = f.queued[0]; assert.deepEqual([q.ihita, q.shcnto, q.critdv, q.critdm, q.klflg, q.shjump], [777n, -1n, 4n, 42n, 2n, 0n]);
  assert.equal(f.hit.ihita, 0n); f.queue.get(1, f.hit, f.players); assert.equal(f.hit.ihita, 777n); assert.equal(f.hit.klflg, 2n);
});

test('PHACON Romulan hit composes PHAROM and scoring with source-scaled damage, without a PLAYER gate', () => {
  const f = fixture('PHASERS 12 20', 500); f.draws[1] = 50n; finish(f.run());
  assert.equal(f.world.erom, 850n); assert.equal(f.ctx.tpoint[K.KPRKIL], 1500n); assert.equal(f.queued[0].ihita, 1500n);
  assert.equal(f.queued[0].dispto, 500n); assert.equal(f.queued[0].shcnto, 1n); assert.equal(f.queued[0].shstto, 850n);
});

test('PHACON Romulan destruction adds 5000 points and queues the kill after clearing its board cell', () => {
  const f = fixture('PHASERS 12 20', 500); f.world.erom = 1n; f.draws[1] = 50n; finish(f.run());
  assert.equal(f.world.rom, 0n); assert.equal(f.board.disp(12, 20), 0); assert.equal(f.ctx.tpoint[K.KPRKIL], 6500n); assert.equal(f.queued[0].klflg, 2n);
  assert.equal(f.queued[0].shstto, -149n); assert.equal(f.queue.serial, 1n);
});

test('PHACON Romulan message uses current LOCR while PRIDIS retains originally selected coordinates after pause', () => {
  const f = fixture('PHASERS 12 20', 500); f.io.pause = function* () { f.world.locr.v = 40; f.ship.v = 9; };
  finish(f.run()); assert.equal(f.queued[0].vto, 40n); assert.equal(f.queued[0].vfrom, 9n); assert.ok(f.events.includes('pridis:12,20,10,0,0'));
  assert.equal(f.local.id, 2n);
});

test('PHACON fresh-base attack announcement precedes PHADAM, filters NOMSG and leaves first-message fields stale', () => {
  const f = fixture('PHASERS 12 20', 401); damageFixture(f); f.ctx.nomsg = 32n; f.hit.ihita = 333n; f.hit.vfrom = 75n;
  finish(f.run()); assert.equal(f.queued.length, 2); assert.equal(f.queued[0].iwhat, 9n); assert.equal(f.queued[0].dbits, 0n);
  assert.equal(f.queued[0].ihita, 333n); assert.equal(f.queued[0].vfrom, 75n); assert.equal(f.queued[1].iwhat, 1n);
  assert.ok(f.events.indexOf('makhit') < f.events.findIndex(e => e.startsWith('phadam:')));
  assert.equal(f.queued[1].dbits, 33n); assert.equal(f.queue.serial, 1n);
});

test('PHACON damaged base omits attack announcement; after destruction it sends hit then team-wide destruction', () => {
  const f = fixture('PHASERS 12 20', 401); f.bases[2][1].strength = 999n;
  f.io.phadam = function* () { f.hit.ihita = 123n; f.hit.klflg = 2n; f.board.setdsp(12, 20, 0); };
  finish(f.run()); assert.deepEqual(f.queued.map(h => h.iwhat), [1n, 10n]); assert.deepEqual(f.queued.map(h => h.dbits), [33n, 32n]);
  assert.equal(f.queued[1].ihita, 0n); assert.equal(f.queued[1].klflg, 0n); assert.equal(f.queued[1].vfrom, 0n); assert.equal(f.queued[1].vto, 12n);
});

test('PHACON ship hit selects target-team range plus all nearby observers and explicitly adds the sender', () => {
  const f = fixture('PHASERS 12 20', 206); damageFixture(f);
  f.players[2].alive = -1n; Object.assign(f.players[2].ship, { v: 16, h: 24 });
  f.players[3].alive = -1n; Object.assign(f.players[3].ship, { v: 17, h: 20 });
  f.players[7].alive = -1n; Object.assign(f.players[7].ship, { v: 22, h: 30 }); f.ctx.nomsg = -1n;
  finish(f.run()); assert.equal(f.queued[0].dbits, 99n); assert.equal(f.queued[0].dispto, 206n); assert.equal(f.queued[0].ihita, 123n);
  assert.ok(f.events.includes('phadam:2,6,2,200,-1')); assert.ok(f.events.includes('pridis:12,20,10,2,0')); assert.ok(f.events.includes('pridis:12,20,4,0,1'));
});

test('PHACON waits for MAKHIT before final energy, condition and recharge assignment', () => {
  const f = fixture(), original = f.io.makhit; f.io.makhit = function* () { yield 'hit'; yield* original(); };
  const g = f.run(); assert.equal(g.next().value, 'hit'); assert.equal(f.ship.energy, 10000n); assert.equal(f.ship.condition, K.GREEN);
  f.clocks[0] = 9000n; finish(g); assert.equal(f.ctx.phbank[1], 13500n); assert.equal(f.ship.energy, 8000n);
});

test('PHACON source PHADAM argument references are writable and reread for message and final cost', () => {
  const f = fixture('PHASERS 12 20', 206); f.io.phadam = function* (kind, index, id, phit) {
    assert.equal(id.value, 2n); phit.value = 50n; index.value = 7n; f.hit.ihita = 99n;
  };
  finish(f.run()); assert.equal(f.queued[0].dispto, 207n); assert.equal(f.ship.energy, 9500n);
});

test('PHACON post-hit compound OR evaluates DISP only through the compiler service', () => {
  const f = fixture('PHASERS 12 20', 206); damageFixture(f); f.io.or = (a, b) => { const x = a(), y = b(); return x || y; };
  finish(f.run()); assert.ok(f.events.includes('disp:12,20')); assert.equal(f.queued.length, 1);
});

test('PHACON real GTKN consumes a buffered computed target and retains the next command', () => {
  const f = fixture('PHASERS / COMPUTED COBRA / TIME', 206); damageFixture(f);
  f.locationIo.gtkn = () => gtkn({ locked: 0n, svlock: 0n, iniflg: 0n, hungup: 0n, ccflg: 0n, ccflgDot: 0n }, f.input, f.out, {
    daytime() { assert.fail(); }, inputPending() { assert.fail(); }, unlo() { assert.fail(); },
    *lock() { assert.fail(); return false; }, *hibernate() { assert.fail(); }, *inli() { assert.fail(); },
  });
  finish(f.run()); assert.equal(f.queued[0].dispto, 206n); assert.ok(f.input.acquire(f.out)); assert.equal(f.input.tokens[0].text, 'TIME');
});

test('PHACON queue composition renders the actual planet notice through OUTHIT', () => {
  const f = fixture(); finish(f.run());
  finish(outHit({ who: 1, team: 1, oflg: 0, ocflg: K.KABS, nomsg: 0n, ship: f.ship }, f.hit, f.players, f.out,
    function* (who) { f.queue.get(who, f.hit, f.players); }));
  // OUTHIT's intermediate form: signed shield tenths, planet '@' code, build count and absolute coordinates.
  assert.equal(f.out.drain(), 'L @10-20, -100.0%  P   @5 @12-20\r\n'); assert.equal(f.players[1].hitflg, 0n);
});

test('PHACON dispatch performs weapon turn accounting without changing PTIME to its bank deadline', () => {
  const f = fixture(), ctx = { who: 1, player: -1n, ptime: 99n, shared: { players: f.players } }; let turns = 0;
  finish(dispatchCommand<'input' | 'pause' | 'damage' | 'hit'>(ctx, 13, {
    *getcmd() { assert.fail(); }, *invoke(call) { assert.equal(call.routine, 'phacon'); return yield* f.run(); },
    *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn(value) { assert.equal(value, false); turns++; }, movementContinuation() { assert.fail(); },
  }));
  assert.equal(ctx.ptime, 99n); assert.equal(turns, 1); assert.equal(f.ctx.phbank[1], 7000n);
});
