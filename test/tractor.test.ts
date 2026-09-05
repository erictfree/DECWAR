import test from 'node:test';
import assert from 'node:assert/strict';
import { tractor, releaseTractor, tractorMemory, TractorLocals, UnresolvedTractorArgument } from '../src/game/tractor.ts';
import type { TractorServices } from '../src/game/tractor.ts';
import { playerSlots } from '../src/game/player.ts';
import { emptyHit, HitQueue } from '../src/game/hit-queue.ts';
import { outHit } from '../src/game/out-hit.ts';
import { tractorOff, freeShip, KilledQueue, SavedShip } from '../src/game/lifecycle.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { gtkn } from '../src/compat/gtkn.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { constants as K, messages as M } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { shield } from '../src/game/shield.ts';
import { getCommand } from '../src/game/get-command.ts';
import { packAscii, signed36 } from '../src/compat/word36.ts';
import { messageBits } from '../src/game/message-memory.ts';

function done<T>(run: Generator<unknown, T, void>): T { const next = run.next(); assert.equal(next.done, true); return next.value; }
function fixture(line = 'TRACTOR NIMITZ') {
  const players = playerSlots(), input = new CommandInput(), out = new TerminalOutput(), local = new TractorLocals();
  for (const who of [1, 2]) { players[who].alive = -1n; Object.assign(players[who].ship, { v: 10 + who, h: 10 + who, shieldCondition: -1n }); }
  const ctx = { who: 1, team: 1, oflg: 0, players }, memory = tractorMemory(players), hit = { ...emptyHit(), dbits: 0n }, queue = new HitQueue();
  const events: string[] = [], ip = { value: 99n };
  input.acceptLine(line); input.acquire(out);
  const io: TractorServices<'input' | 'hit'> = {
    logical: word => word < 0n,
    *gtkn() { events.push('gtkn'); yield 'input'; assert.ok(input.acquire(out)); },
    *makhit() { events.push('makhit'); queue.make(ctx.who, hit, players, 0n, out); },
  };
  const run = () => tractor(ctx, input, local, memory, hit, out, io);
  const active = () => { players[1].ship.tractor = 2; players[2].ship.tractor = 1; };
  const argument = () => { io.argument = () => { events.push('ip'); return ip; }; };
  return { ctx, players, input, out, local, memory, hit, queue, events, ip, io, run, active, argument };
}

test('TRACTR applies paired beams and queues both recipients with only IWHAT/DBITS changed before MAKHIT', () => {
  const f = fixture(); f.hit.dispfr = 203n; f.hit.dispto = 204n; f.hit.ihita = 700n; f.hit.critdm = 71n; f.hit.vfrom = 55n;
  done(f.run()); assert.equal(f.players[1].ship.tractor, 2); assert.equal(f.players[2].ship.tractor, 1);
  assert.equal(f.out.drain(), '\r\n'); assert.deepEqual(f.events, ['makhit']); assert.equal(f.ip.value, 99n);
  assert.equal(f.players[1].hitflg, 1n); assert.equal(f.players[2].hitflg, 1n); assert.equal(f.queue.serial, 1n);
  assert.deepEqual(f.hit, { ...emptyHit(), dbits: 0n }); f.queue.get(2, f.hit, f.players);
  assert.deepEqual([f.hit.iwhat, f.hit.dbits, f.hit.dispfr, f.hit.dispto, f.hit.ihita, f.hit.critdm, f.hit.vfrom], [13n, 3n, 203n, 204n, 700n, 71n, 55n]);
});

test('TRACTR makes no energy, device, docked, self-ALIVE or radio checks and charges no turn', () => {
  const f = fixture(); const p = f.players[1]; p.alive = 1n; p.ship.energy = 0n; p.ship.devices.fill(9999n); p.ship.docked = true;
  p.ship.turns = 81n; f.players[2].ship.devices.fill(9999n); f.players[2].ship.energy = -1n; done(f.run());
  assert.equal(p.ship.tractor, 2); assert.equal(p.ship.energy, 0n); assert.equal(p.ship.turns, 81n);
  assert.equal(p.ship.devices[K.KNDEV], 9999n); assert.equal(p.ship.docked, true);
});

test('TRACTR input prompts until alphabetic, returns on EOL, and preserves INDEX until the source assignment', () => {
  const f = fixture('TRACTOR 22'), run = f.run(); assert.equal(run.next().value, 'input'); assert.equal(f.local.index, 2);
  assert.equal(f.out.drain(), '\r\nShip to apply tractor beam to:  ');
  f.input.acceptLine('33'); assert.equal(run.next().value, 'input'); assert.equal(f.local.index, 1);
  f.input.acceptLine(''); assert.equal(run.next().done, true); assert.equal(f.players[1].ship.tractor, 0); assert.equal(f.queue.serial, 0n);
  const first = fixture('TRACTOR'); const r = first.run(); r.next(); first.input.acceptLine(''); done(r); assert.equal(first.local.index, 2);
});

test('TRACTR actual GTKN consumes buffered destination without waiting or discarding later commands', () => {
  const f = fixture('TRACTOR / NIMITZ / TIME');
  const state = { locked: 0n, svlock: 0n, iniflg: 0n, hungup: 0n, ccflg: 0n, ccflgDot: 0n };
  f.io.gtkn = () => gtkn(state, f.input, f.out, {
    daytime() { assert.fail(); }, inputPending() { assert.fail(); }, unlo() { assert.fail(); },
    *lock() { assert.fail(); return false; }, *hibernate() { assert.fail(); }, *inli() { assert.fail(); },
  });
  done(f.run()); assert.equal(f.players[1].ship.tractor, 2); assert.ok(f.input.available);
  f.input.acquire(f.out); assert.equal(f.input.tokens[0].text, 'TIME'); assert.equal(f.queue.serial, 1n);
});

test('TRACTR no-argument call permits activation but refuses to invent writable IP for either off path', () => {
  for (const line of ['TRACTOR', 'TRACTOR OFF']) {
    const f = fixture(line); f.active(); assert.throws(() => f.run().next(), UnresolvedTractorArgument);
    assert.equal(f.out.drain(), '\r\n'); assert.equal(f.players[1].ship.tractor, 2); assert.equal(f.players[2].ship.tractor, 1);
    assert.equal(f.queue.serial, 0n);
  }
  const inactive = fixture('TRACTOR OFF'); assert.throws(() => inactive.run().next(), UnresolvedTractorArgument);
  assert.equal(inactive.out.drain(), '\r\n');
});

test('TRACTR bare command with active beam ignores stale token two, assigns IP and releases without input', () => {
  const f = fixture('TRACTOR'); f.active(); f.argument(); Object.assign(f.input.tokens[1], { text: 'NIMIT', type: K.KALF });
  done(f.run()); assert.equal(f.ip.value, 1n); assert.deepEqual(f.events, ['ip', 'makhit']);
  assert.equal(f.players[1].ship.tractor, 0); assert.equal(f.players[2].ship.tractor, 0);
  f.queue.get(1, f.hit, f.players); assert.equal(f.hit.iwhat, 14n); assert.equal(f.hit.dbits, 3n);
});

test('TRACTR OFF prefix assigns IP even when inactive and emits the original message', () => {
  for (const word of ['O', 'OF', 'OFF']) {
    const f = fixture('TRACTOR ' + word); f.argument(); done(f.run());
    assert.equal(f.ip.value, 1n); assert.equal(f.out.drain(), '\r\nTractor beam not in operation at this time, Captain.\r\n');
    assert.deepEqual(f.events, ['ip']); assert.equal(f.queue.serial, 0n);
  }
});

test('TRACTR explicit non-OFF destination reports an existing beam before ship lookup', () => {
  const f = fixture('TRACTOR GARBAGE'); f.active(); done(f.run());
  assert.equal(f.out.drain(), '\r\nTractor beam already active, Captain.\r\n'); assert.equal(f.local.i, 0); assert.equal(f.ip.value, 99n);
});

test('TRACTR returns unknown and self-ship errors before team, ALIVE or position checks', () => {
  const unknown = fixture('TRACTOR UNKNOWN'); done(unknown.run()); assert.equal(unknown.out.drain(), '\r\n' + M.unkshp.text + '\r\n'); assert.equal(unknown.local.i, 11);
  const own = fixture('TRACTOR L'); own.ctx.team = 2; own.players[1].alive = 1n; done(own.run());
  assert.equal(own.out.drain(), '\r\nBeg your pardon, Captain?  You want to apply a tractor\r\nbeam to your own ship?\r\n');
  assert.equal(own.local.dteam, 0);
});

test('TRACTR name matching takes the first physical prefix without ambiguity resolution', () => {
  const f = fixture('TRACTOR N'); f.players[3].shipName1 = signed36(packAscii('NIMIT'));
  done(f.run()); assert.equal(f.local.i, 2); assert.equal(f.players[3].ship.tractor, 0);
});

test('TRACTR rejects an enemy before testing its ALIVE word, and interprets friendly ALIVE through the compiler service', () => {
  const enemy = fixture('TRACTOR COBRA'); enemy.io.logical = () => { assert.fail('Enemy check precedes ALIVE'); }; done(enemy.run());
  assert.equal(enemy.out.drain(), '\r\nCan not apply tractor beam to enemy ship.\r\n');
  for (const word of [-2n, -1n, 0n, 1n]) {
    const f = fixture(); f.players[2].alive = word; done(f.run());
    assert.equal(f.players[1].ship.tractor, word < 0n ? 2 : 0);
    if (word >= 0n) assert.equal(f.out.drain(), '\r\n' + M.noship.text + '\r\n');
  }
});

test('TRACTR includes diagonals and coincident coordinates, rejects distance two before target-beam and shield checks', () => {
  for (const delta of [0, 1, 2]) {
    const f = fixture(); Object.assign(f.players[2].ship, { v: 11 + delta, h: 11 + delta });
    if (delta === 2) { f.players[2].ship.tractor = 3; f.players[1].ship.shieldCondition = 1n; }
    done(f.run()); assert.equal(f.players[1].ship.tractor, delta <= 1 ? 2 : 0);
    if (delta === 2) assert.equal(f.out.drain(), '\r\n' + M.energ3.text + '\r\n');
  }
});

test('TRACTR target-beam errors use ODISP at each verbosity before testing shields', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture(); f.ctx.oflg = oflg; f.players[2].ship.tractor = 3; f.players[1].ship.shieldCondition = 1n; done(f.run());
    assert.equal(f.out.drain(), '\r\n' + (oflg <= 0 ? 'N ' : 'Nimitz ') + 'already has tractor beam active.\r\n');
    assert.equal(f.local.iship, 102n); assert.equal(f.players[2].ship.tractor, 3);
  }
});

test('TRACTR requires both shield conditions strictly negative, with own-shield error first', () => {
  for (const own of [-2n, -1n, 0n, 1n]) for (const other of [-2n, -1n, 0n, 1n]) {
    const f = fixture(); f.players[1].ship.shieldCondition = own; f.players[2].ship.shieldCondition = other; done(f.run());
    assert.equal(f.players[1].ship.tractor, own < 0n && other < 0n ? 2 : 0);
    if (own >= 0n) assert.equal(f.out.drain(), '\r\nCan not apply tractor beam through shields, Captain.\r\n');
    else if (other >= 0n) assert.equal(f.out.drain(), '\r\nN has his shields up.  Unable to apply tractor beam.\r\n');
  }
});

test('TRACTR Empire target uses ship code 200+index and the same paired recipient mask', () => {
  const f = fixture('TRACTOR DEMON'); f.ctx.who = 6; f.ctx.team = 2;
  for (const i of [6, 7]) { f.players[i].alive = -1n; Object.assign(f.players[i].ship, { v: 15, h: 15, shieldCondition: -1n }); }
  done(f.run()); assert.equal(f.local.iship, 207n); assert.equal(f.players[6].ship.tractor, 7); assert.equal(f.players[7].ship.tractor, 6);
  f.queue.get(6, f.hit, f.players); assert.equal(f.hit.dbits, 96n); assert.equal(f.hit.iwhat, 13n);
});

test('TRACTR applies state before MAKHIT yields and leaves unrelated hit registers available to that routine', () => {
  const f = fixture(); f.hit.shjump = 1n;
  f.io.makhit = function* () { assert.equal(f.players[1].ship.tractor, 2); assert.equal(f.hit.shjump, 1n); assert.equal(f.hit.iwhat, 13n); yield 'hit'; };
  const r = f.run(); assert.equal(r.next().value, 'hit'); assert.equal(f.players[2].ship.tractor, 1); assert.equal(f.hit.dbits, 3n); done(r);
});

test('TRACTR→MAKHIT→GETHIT/OUTHIT sends apply and release notifications to both players in source order', () => {
  for (const oflg of [-1, 0, 1]) {
    const f = fixture(); done(f.run()); f.input.acceptLine('TRACTOR'); f.input.acquire(f.out); f.argument(); done(f.run());
    for (const who of [1, 2]) {
      const out = new TerminalOutput();
      done(outHit({ who, team: 1, oflg, ocflg: K.KABS, nomsg: -1n, ship: f.players[who].ship }, f.hit, f.players, out,
        function* (p) { f.queue.get(p, f.hit, f.players); }));
      assert.equal(out.drain(), oflg <= 0 ? 'Trac. Beam on\r\nTrac. Beam off\r\n' : '\r\n\r\nTractor beam activated, Captain.\r\n\r\n\r\nTractor beam broken, Captain.\r\n');
      assert.equal(f.players[who].hitflg, 0n);
    }
  }
});

test('TRCOFF does not require a symmetric pair and keeps MAKHIT sender WHO independent of IP', () => {
  const f = fixture(); f.ctx.who = 3; f.active(); f.players[2].ship.tractor = 4;
  done(tractorOff(f.players, 1, f.hit, f.io.makhit)); assert.equal(f.players[1].ship.tractor, 0); assert.equal(f.players[2].ship.tractor, 0);
  assert.equal(f.queue.links.slice(0, 80).every(n => n === 0n), true); assert.notEqual(f.queue.links[80], 0n);
  f.queue.get(1, f.hit, f.players); assert.equal(f.hit.dbits, 3n); assert.equal(f.hit.iwhat, 14n);
});

test('TRCOFF rereads an aliased IP after the first clear, preserving partial changes if the second address is unresolved', () => {
  const f = fixture(); f.active(); const ip = f.memory.trstat(2);
  assert.throws(() => done(releaseTractor(ip, f.memory, f.hit, f.io.makhit)), /surrounding source memory/);
  assert.equal(f.players[2].ship.tractor, 0); assert.equal(f.players[1].ship.tractor, 2); assert.equal(f.hit.iwhat, 14n); assert.equal(f.hit.dbits, 3n);
  assert.equal(f.queue.serial, 0n);
  const g = fixture(); g.active(); const numrom = { value: 19n }, memory = tractorMemory(g.players, { trstat: index => { assert.equal(index, 0); return numrom; } });
  done(releaseTractor(memory.trstat(2), memory, g.hit, g.io.makhit)); assert.equal(numrom.value, 0n); assert.equal(g.players[1].ship.tractor, 2);
});

test('TRCOFF inactive entry reads BITS(0) and clears TRSTAT(0) through explicit adjacent memory', () => {
  const f = fixture(), numrom = { value: 41n }; const lastName = signed36(packAscii(' W   '));
  const memory = tractorMemory(f.players, {
    bits: index => messageBits(index, () => lastName), trstat: index => { assert.equal(index, 0); return numrom; },
  });
  let seen = 0n;
  done(releaseTractor({ value: 1n }, memory, f.hit, function* () { seen = f.hit.dbits; }));
  assert.equal(seen, signed36(lastName | 1n)); assert.equal(numrom.value, 0n); assert.equal(f.hit.iwhat, 14n);
  const unresolved = fixture(); assert.throws(() => done(tractorOff(unresolved.players, 1, unresolved.hit, unresolved.io.makhit)), /BITS/);
  assert.equal(unresolved.hit.iwhat, 0n);
});

test('TRACTR activation does not roll back paired state when a later BITS read is unresolved', () => {
  const f = fixture(), memory = { ...f.memory, bits() { throw new Error('unresolved BITS backing word'); } };
  assert.throws(() => done(tractor(f.ctx, f.input, f.local, memory, f.hit, f.out, f.io)), /unresolved BITS/);
  assert.equal(f.players[1].ship.tractor, 2); assert.equal(f.players[2].ship.tractor, 1); assert.equal(f.queue.serial, 0n); assert.equal(f.hit.iwhat, 0n);
});

test('TRACTR dispatch keeps the zero-argument call and does not run turn accounting or alter PTIME', () => {
  const f = fixture(), ctx = { who: 1, player: -1n, ptime: 123n, shared: { players: f.players } };
  done(dispatchCommand(ctx, 29, {
    *getcmd() { assert.fail(); }, *invoke(call) { assert.deepEqual(call, { routine: 'tractr' }); yield* f.run(); },
    *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn() { assert.fail(); }, movementContinuation() { assert.fail(); },
  }));
  assert.equal(ctx.ptime, 123n); assert.equal(f.players[1].ship.turns, 0n); assert.equal(f.players[1].ship.tractor, 2);
});

test('SHIELD UP releases an actual applied beam after energy charge and queues the shared TRCOFF event', () => {
  const f = fixture(); done(f.run()); f.out.drain(); f.players[1].ship.energy = 999n;
  f.input.acceptLine('SHIELD UP'); f.input.acquire(f.out);
  const r = shield(f.players[1].ship, f.input.tokens, f.out, () => {
    assert.equal(f.players[1].ship.shieldCondition, 1n); assert.equal(f.players[1].ship.energy, 0n);
    done(tractorOff(f.players, 1, f.hit, f.io.makhit));
  });
  assert.equal(r.next().done, true); assert.equal(f.players[2].ship.tractor, 0);
  assert.equal(f.out.drain(), M.shld06.text + '\r\n' + M.shld07.text + '\r\n'); assert.equal(f.players[2].hitflg, 2n);
});

test('FREE composes applied tractor release with draining the departing sender while the partner retains both notifications', () => {
  const f = fixture(); done(f.run()); const board = new PackedBoard(); board.setdsp(11, 11, 101);
  const world = { players: f.players, board, killed: new KilledQueue(), numply: 2n, numsid: [0n, 2n, 0n], endflg: 0n, hitime: 0n };
  done(freeShip(world, new SavedShip(), f.hit, 1, {
    *lock() { return true; }, unlock() {}, daytime: () => 1000n,
    trcoff: ip => tractorOff(f.players, ip, f.hit, f.io.makhit),
    *gethit(who) { f.queue.get(who, f.hit, f.players); }, *getmsg() { assert.fail(); },
  }));
  assert.equal(f.players[1].alive, 1n); assert.equal(f.players[1].hitflg, 0n); assert.equal(f.players[2].hitflg, 2n);
  assert.equal(f.players[2].ship.tractor, 0); assert.equal(board.disp(11, 11), 0); assert.equal(world.numply, 1n);
});

test('GETCMD delivers the actual queued tractor notice before requesting the next command', () => {
  const f = fixture(); done(f.run()); f.out.drain();
  const ctx = { who: 2, team: 1, oflg: 0, prtype: 0, pasflg: 0n, ptime: 0n, ccflg: 0n, hungup: 0n,
    shared: { players: f.players, numply: 2n, comknt: 0n } };
  const result = done(getCommand(ctx, f.input, f.out, {
    ttyon() {}, dmpbuf() {}, cctrap() {}, *pause() {}, *zaplok() {}, *input() { return true; },
    *gtkn() { f.input.acceptLine('TIME'); f.input.acquire(f.out); }, clear() {},
    *outhit() { yield* outHit({ ...ctx, ocflg: K.KABS, nomsg: 0n, ship: f.players[2].ship }, f.hit, f.players, f.out,
      function* (who) { f.queue.get(who, f.hit, f.players); }); },
    *outmsg() { assert.fail(); }, *endgam() {}, daytime: () => 1000n,
    *points() { assert.fail(); return 0n; }, *updsta() { assert.fail(); }, *free() { assert.fail(); },
  }));
  assert.deepEqual(result, { kind: 'command', id: 27 }); assert.ok(f.out.drain().startsWith('Trac. Beam on\r\n'));
  assert.equal(f.players[2].hitflg, 0n); assert.equal(f.players[1].hitflg, 1n);
});

test('TRACTR after interactive GTKN uses the source token state without adding interrupt or NTOK checks', () => {
  const f = fixture('TRACTOR'), ctx = Object.assign(f.ctx, { ccflg: 0n, hungup: 0n });
  f.io.gtkn = function* () {
    ctx.ccflg = ctx.hungup = -1n; f.input.acceptLine('NIMITZ'); f.input.acquire(f.out); f.input.ntok = 0;
  };
  done(f.run()); assert.equal(f.players[1].ship.tractor, 2); assert.equal(f.queue.serial, 1n);
});
