import test from 'node:test';
import assert from 'node:assert/strict';
import { constants as K } from '../src/generated/source-data.ts';
import { playerSlots, shipWords } from '../src/game/player.ts';
import { KilledQueue, SavedShip, freeShip, restartShip, tractorOff } from '../src/game/lifecycle.ts';
import type { LifecycleWorld, ReleaseServices, RestartServices } from '../src/game/lifecycle.ts';
import { endGame } from '../src/game/endgame.ts';
import type { EndgameContext, EndgameServices } from '../src/game/endgame.ts';
import type { StatisticsRecord } from '../src/game/get-command.ts';
import { getCommand } from '../src/game/get-command.ts';
import type { CommandContext, GetCommandServices } from '../src/game/get-command.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { unpackAscii } from '../src/compat/word36.ts';
import { HitQueue, emptyHit } from '../src/game/hit-queue.ts';
import { MessageQueue, makeMessage, getMessage, messageText } from '../src/game/message-queue.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import type { QueueServices } from '../src/compat/queue.ts';

function finish<T>(run: Generator<never, T, void>): T { const result = run.next(); assert.equal(result.done, true); return result.value; }
function fixture() {
  const world: LifecycleWorld & { nbase: bigint[]; nplnet: bigint; comknt: bigint } = {
    players: playerSlots(), board: new PackedBoard(), killed: new KilledQueue(),
    numply: 1n, numsid: [0n, 1n, 0n], endflg: 0n, hitime: 55n,
    nbase: [0n, 10n, 10n], nplnet: 60n, comknt: 0n,
  };
  const p = world.players[1], saved = new SavedShip(), registers = { ...emptyHit(), dbits: 0n };
  p.alive = -1n; p.active = 9n;
  Object.assign(p.ship, { v: 20, h: 30, energy: 12345n, damage: 678n, torpedoes: 3n, turns: 17n, docked: true });
  p.ship.devices[4] = 321n;
  for (let i = 1; i <= 9; i++) p.job[i] = BigInt(i * 10);
  world.board.setdsp(20, 30, 101);
  const out = new TerminalOutput(), calls: string[] = [], days = [1000n, 2000n];
  const hits = new HitQueue(), messages = new MessageQueue();
  const qio: QueueServices<never> = { *lock(r) { calls.push(r); return true; }, unlo() { calls.push('queue-unlo'); } };
  const release: ReleaseServices<never> = {
    *lock(r) { calls.push(r); return true; }, unlock() { calls.push('unlock'); },
    daytime() { calls.push('day'); return days.shift() ?? 3000n; },
    trcoff: ip => tractorOff(world.players, ip, registers, function* () { calls.push('makhit'); hits.make(1, registers, world.players, 0n, out); }),
    *gethit(who) { calls.push(`gethit:${who}`); hits.get(who, registers, world.players); },
    *getmsg(who, b) { calls.push(`getmsg:${who}`); yield* getMessage(messages, world.players, registers, who, b, qio); },
  };
  const restart: RestartServices<never> = { lock: release.lock, unlock: release.unlock,
    *jobsta(args) {
      calls.push('jobsta'); assert.equal(args[1], args[2]);
      args[0].value = 101n; args[1].value = 701n; assert.equal(args[2].value, 701n); args[2].value = 702n;
      args[3].value = 404n; args[4].value = 505n; args[5].value = 606n;
    }, *monit() { assert.fail('Unexpected monitor return'); } };
  return { world, p, saved, registers, out, calls, days, release, restart, hits, messages, qio };
}

test('KQSRCH matches the first job/PPN pair, ignores terminal/time match, and updates only identity columns', () => {
  const q = new KilledQueue();
  assert.equal(q.search(1n, 2n, 3n), 0);
  q.nkill = 3;
  Object.assign(q.rows[1], { job: 2n, ppn: 3n, tty: 4n, time: 555n, teamShip: 666n });
  Object.assign(q.rows[2], { job: 2n, ppn: 3n, tty: 5n });
  assert.equal(q.search(99n, 2n, 3n), 1);
  assert.deepEqual(q.rows[1], { job: 2n, ppn: 3n, tty: 99n, time: 555n, teamShip: 666n });
  assert.equal(q.rows[2].tty, 5n); assert.equal(q.search(99n, 88n, 3n), 0);
});

test('player slots expose JOB backing words and source-padded signed ship-name words', () => {
  const f = fixture();
  assert.equal(f.p.shipName1 < 0n, true); assert.equal(unpackAscii(f.p.shipName1), 'Lexin');
  assert.equal(unpackAscii(f.p.shipName2), 'gton ');
  f.p.ppn = 99n; assert.equal(f.p.job[K.KPPN], 99n);
  f.p.job[K.KNAM1] = -12n; assert.equal(f.p.name1, -12n);
  f.p.started = 123n; assert.equal(f.p.job[K.KJOBTM], 123n);
});

test('FREE saves all JOB/SHPCON/device words, clears only selected fields, and sets vacant ALIVE=+1', () => {
  const f = fixture(), beforeJob = [...f.p.job], beforeShip = shipWords(f.p.ship), devices = [...f.p.ship.devices];
  finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  assert.deepEqual(f.saved.tjob, beforeJob); assert.deepEqual(f.saved.tshpco, beforeShip); assert.deepEqual(f.saved.tshpda, devices);
  assert.equal(f.saved.tship, 101n); assert.equal(f.p.ppn, 0n); assert.equal(f.p.name1, 0n); assert.equal(f.p.started, 0n);
  assert.deepEqual(f.p.job, Array(10).fill(0n));
  const afterShip = [...beforeShip]; afterShip[1] = afterShip[2] = afterShip[8] = 0n;
  assert.deepEqual(shipWords(f.p.ship), afterShip); assert.deepEqual(f.p.ship.devices, devices);
  assert.equal(f.p.ship.docked, true); assert.equal(f.p.active, 9n); assert.equal(f.p.alive, 1n);
  assert.equal(f.world.board.disp(20, 30), 0); assert.equal(f.world.numply, 0n); assert.equal(f.world.numsid[1], 0n);
  assert.equal(f.world.hitime, 301000n);
  assert.deepEqual(f.world.killed.rows[1], { job: 10n, ppn: 40n, tty: 50n, time: 2000n, teamShip: 262145n });
  assert.deepEqual(f.calls, ['FREE', 'day', 'day', 'unlock']);
});

test('FREE returns only for positive ALIVE; zero is still freed and lock retries do not repeat the check', () => {
  const f = fixture(); f.p.alive = 1n;
  finish(freeShip(f.world, f.saved, f.registers, 1, f.release)); assert.deepEqual(f.calls, []);
  f.p.alive = 0n; let attempts = 0;
  f.release.lock = function* () { f.p.alive = 1n; return ++attempts === 2; };
  finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  assert.equal(attempts, 2); assert.equal(f.world.numply, 0n); assert.equal(f.saved.tship, 101n);
});

test('FREE uses the slot number to choose team and avoids retention clock when other players remain or game ended', () => {
  for (const endflg of [0n, -1n, -2n]) {
    const f = fixture(); f.world.numply = endflg === 0n ? 2n : 1n;
    f.world.endflg = endflg; f.world.numsid[2] = 1n;
    const p = f.world.players[6]; p.alive = -1n; p.ship.v = 22; p.ship.h = 33;
    finish(freeShip(f.world, f.saved, f.registers, 6, f.release));
    assert.equal(f.world.hitime, 55n); assert.equal(f.saved.tship, 206n); assert.equal(f.world.numsid[2], 0n);
    assert.equal(f.world.killed.rows[1].teamShip, (6n << 18n) | 2n);
    assert.equal(f.calls.filter(c => c === 'day').length, 1);
  }
});

test('FREE reuses a killed record without advancing ring index, otherwise overwrites the next ring slot', () => {
  const f = fixture(), q = f.world.killed;
  q.nkill = 10; q.kilndx = 10; Object.assign(q.rows[4], { job: 10n, ppn: 40n });
  finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  assert.equal(q.kilndx, 10); assert.equal(q.nkill, 10); assert.equal(q.rows[4].tty, 50n);
  const p = f.world.players[2]; p.alive = -1n; p.ship.v = 21; p.ship.h = 31; p.job[K.KJOB] = 999n;
  finish(freeShip(f.world, f.saved, f.registers, 2, f.release));
  assert.equal(q.kilndx, 1); assert.equal(q.nkill, 10); assert.equal(q.rows[1].job, 999n);
  assert.equal(f.saved.tship, 102n); // FRLOCL holds last freed ship, not separate per-slot backups.
});

test('FREE breaks tractor, drains only its own recipients, and clears registers after actual hit/message queues', () => {
  const f = fixture(); f.p.ship.tractor = 2; f.world.players[2].ship.tractor = 1;
  Object.assign(f.registers, { dbits: 3n, dispfr: 0n });
  finish(makeMessage(f.messages, f.world.players, f.registers, 'Pending', f.out, f.qio)); f.calls.length = 0;
  finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  assert.equal(f.p.ship.tractor, 0); assert.equal(f.world.players[2].ship.tractor, 0);
  assert.equal(f.p.hitflg, 0n); assert.equal(f.p.msgflg, 0n);
  assert.equal(f.world.players[2].hitflg, 1n); assert.equal(f.world.players[2].msgflg, 1n);
  assert.equal(messageText(f.saved.dum), 'Pending\r\n');
  assert.deepEqual(f.registers, { ...emptyHit(), dbits: 0n });
  assert.ok(f.calls.indexOf('makhit') < f.calls.indexOf('gethit:1'));
  assert.ok(f.calls.indexOf('gethit:1') < f.calls.indexOf('getmsg:1'));
  assert.equal(f.calls.at(-1), 'unlock'); assert.equal(f.out.drain(), '');
});

test('FREE retains nonpositive queue counts and skips their getters', () => {
  const f = fixture(); f.p.hitflg = -1n; f.p.msgflg = -2n; f.registers.dbits = 99n;
  finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  assert.equal(f.p.hitflg, -1n); assert.equal(f.p.msgflg, -2n);
  assert.equal(f.calls.some(c => c.startsWith('get')), false); assert.equal(f.registers.dbits, 0n);
});

test('FREE retention deadline adds five minutes without midnight normalization', () => {
  const f = fixture(); f.days.splice(0, 2, 86399000n, 1000n);
  finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  assert.equal(f.world.hitime, 86699000n); assert.equal(f.world.killed.rows[1].time, 1000n);
});

test('RSTART restores ten ship words and devices, refreshes monitor JOB fields, and preserves dummy aliasing', () => {
  const f = fixture(), oldShip = shipWords(f.p.ship), oldJob = [...f.p.job], oldDevices = [...f.p.ship.devices];
  finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  f.p.ship.docked = false; f.p.ship.tractor = 2; f.p.ship.devices[4] = 999n;
  const deviceArray = f.p.ship.devices;
  finish(restartShip(f.world, f.saved, 1, f.out, f.restart));
  assert.deepEqual(shipWords(f.p.ship), oldShip); assert.deepEqual(f.p.ship.devices, oldDevices); assert.equal(f.p.ship.devices, deviceArray);
  assert.equal(f.p.ship.docked, false); assert.equal(f.p.ship.tractor, 2);
  const expectedJob = [...oldJob]; expectedJob[1] = 101n; expectedJob[4] = 404n; expectedJob[5] = 505n; expectedJob[6] = 606n;
  assert.deepEqual(f.p.job, expectedJob); assert.equal(f.p.ppn, 404n); assert.equal(f.saved.dummy.value, 702n);
  assert.equal(f.p.alive, -1n); assert.equal(f.world.numply, 1n); assert.equal(f.world.numsid[1], 1n);
  assert.equal(f.world.board.disp(20, 30), 101); assert.equal(f.out.drain(), '');
});

test('RSTART reports ship/position errors through MONIT, retries on continuation, and permits sentinel occupancy', () => {
  const f = fixture(); finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  f.p.ship.v = 7;
  const io: RestartServices<'monitor'> = { ...f.restart, *monit() { yield 'monitor'; } };
  const run = restartShip(f.world, f.saved, 1, f.out, io);
  assert.equal(run.next().value, 'monitor'); assert.equal(f.out.drain(), 'Sorry, but your ship is in use!\r\n');
  f.p.ship.v = 0; f.world.board.setdsp(20, 30, 900);
  assert.equal(run.next().value, 'monitor'); assert.equal(f.out.drain(), 'Sorry, but your spot on the board is taken!\r\n');
  f.world.board.setdsp(20, 30, -1);
  assert.equal(run.next().done, true); assert.equal(f.world.board.disp(20, 30), 101);
});

test('RSTART does not recheck occupancy after lock wait and uses saved TSHIP independently of requested slot', () => {
  const f = fixture(); finish(freeShip(f.world, f.saved, f.registers, 1, f.release));
  let attempts = 0;
  f.restart.lock = function* () { f.world.board.setdsp(20, 30, 900); return ++attempts === 2; };
  finish(restartShip(f.world, f.saved, 6, f.out, f.restart));
  assert.equal(attempts, 2); assert.equal(f.world.board.disp(20, 30), 101);
  assert.equal(f.world.players[6].ship.v, 20); assert.equal(f.world.numsid[2], 1n);
});

class SessionExit extends Error {}
function endFixture() {
  const f = fixture(), ctx: EndgameContext = { who: 1, team: 1, shared: f.world }, records: StatisticsRecord[] = [];
  const io: EndgameServices<never> = {
    *kilhgh() { f.calls.push('kilhgh'); }, daytime: f.release.daytime,
    *points(final) { f.calls.push(`points:${final}`); return 777n; },
    *updsta(record) { f.calls.push('updsta'); records.push(record); },
    free: who => freeShip(f.world, f.saved, f.registers, who, f.release),
    exit() { f.calls.push('exit'); throw new SessionExit(); },
  };
  return { ...f, ctx, records, io };
}

test('ENDGAM returns while planets remain or both sides retain bases', () => {
  const f = endFixture(); finish(endGame(f.ctx, f.out, f.io));
  f.world.nplnet = 0n; finish(endGame(f.ctx, f.out, f.io));
  assert.deepEqual(f.calls, []); assert.equal(f.out.drain(), '');
});

test('ENDGAM reports victory, snapshots identity before score update, releases real ship and never returns', () => {
  const f = endFixture(); f.world.nplnet = 0n; f.world.nbase[2] = 0n;
  f.io.points = function* () { f.calls.push('points:true'); f.p.name1 = 999n; return 777n; };
  assert.throws(() => finish(endGame(f.ctx, f.out, f.io)), SessionExit);
  assert.equal(f.world.endflg, -1n); assert.equal(f.ctx.who, 0); assert.equal(f.p.alive, 1n);
  assert.equal(f.world.hitime, 55n); // FREE sees ENDFLG and omits retention clock.
  assert.equal(f.records[0].name1, 20n); assert.equal(f.records[0].why, 1n); assert.equal(f.records[0].total, 777n);
  assert.equal(f.records[0].elapsed, 920n); assert.equal(f.saved.tjob[K.KNAM1], 999n);
  assert.deepEqual(f.calls, ['kilhgh', 'day', 'points:true', 'updsta', 'FREE', 'day', 'unlock', 'exit']);
  assert.equal(f.out.drain(), 'THE WAR IS OVER!!\r\n\r\nThe Federation has successfully repelled the Klingon hordes!\r\n\r\nCongratulations.  Freedom again reigns the galaxy.\r\n');
});

test('ENDGAM chooses Empire on greater base count and reports loser/winner according to player team', () => {
  for (const team of [1, 2]) {
    const f = endFixture(); f.ctx.team = team; f.world.nplnet = 0n; f.world.nbase[1] = 0n;
    assert.throws(() => finish(endGame(f.ctx, f.out, f.io)), SessionExit);
    assert.equal(f.records[0].why, team === 2 ? 1n : 0n); assert.equal(f.records[0].teamIndex, team - 1);
    assert.equal(f.out.drain(), 'THE WAR IS OVER!!\r\n\r\nThe Klingon Empire is VICTORIOUS!!\r\n\r\n' +
      (team === 1 ? 'Please proceed to the nearest Klingon slave planet.\r\n' : 'The Empire salutes you.  Begin slave operations immediately.\r\n'));
  }
});

test('ENDGAM total destruction marks -2, prints both victory messages, and makes both teams lose', () => {
  const f = endFixture(); f.world.nplnet = f.world.nbase[1] = f.world.nbase[2] = 0n;
  assert.throws(() => finish(endGame(f.ctx, f.out, f.io)), SessionExit);
  assert.equal(f.world.endflg, -2n); assert.equal(f.records[0].why, 0n);
  assert.equal(f.out.drain(), 'THE WAR IS OVER!!\r\n\r\nThe entire known galaxy has been depopulated.\r\n\r\nBOTH sides lose!!\r\nThe Klingon Empire is VICTORIOUS!!\r\n\r\nThe Federation has successfully repelled the Klingon hordes!\r\n\r\nPlease proceed to the nearest Klingon slave planet.\r\nCongratulations.  Freedom again reigns the galaxy.\r\n');
});

test('ENDGAM honors existing flag, skips KILHGH, and gives Federation a forced-ending base-count tie', () => {
  const f = endFixture(); f.world.endflg = -1n;
  assert.throws(() => finish(endGame(f.ctx, f.out, f.io)), SessionExit);
  assert.equal(f.calls.includes('kilhgh'), false); assert.equal(f.records[0].why, 1n);
  assert.equal(f.out.drain(), 'THE WAR IS OVER!!\r\n\r\n');
});

test('ENDGAM with WHO=0 prints and exits without scoring or accessing a player slot', () => {
  const f = endFixture(); f.ctx.who = 0; f.ctx.team = 0; f.world.endflg = -1n;
  assert.throws(() => finish(endGame(f.ctx, f.out, f.io)), SessionExit);
  assert.deepEqual(f.calls, ['exit']); assert.equal(f.records.length, 0); assert.equal(f.p.alive, -1n);
});

function commandServices(f: ReturnType<typeof endFixture>, ctx: CommandContext): GetCommandServices<never> {
  return {
    ttyon() { f.calls.push('ttyo'); }, dmpbuf() { f.calls.push('dump'); }, cctrap() { f.calls.push('cctrap'); },
    *pause() { assert.fail('Unexpected PAUSE'); }, *zaplok() { assert.fail('Unexpected input loop'); },
    *input() { return assert.fail('Unexpected INPUT'); }, *gtkn() { assert.fail('Unexpected GTKN'); },
    clear() { assert.fail('Unexpected CLEAR'); }, *outhit() { assert.fail('Unexpected OUTHIT'); }, *outmsg() { assert.fail('Unexpected OUTMSG'); },
    endgam: () => endGame({ get who() { return ctx.who; }, set who(who) { ctx.who = who; }, team: ctx.team, shared: f.world }, f.out, f.io),
    daytime: f.release.daytime, points: f.io.points, updsta: f.io.updsta, free: f.io.free,
  };
}

test('GETCMD death uses shared JOB accessors, actual FREE/KQSRCH and returns WHO=0 with the saved ship', () => {
  const f = endFixture(); f.p.ship.damage = BigInt(K.KENDAM);
  const ctx: CommandContext = { who: 1, team: 1, oflg: 0, prtype: 0, pasflg: -2n,
    ptime: 777n, ccflg: 0n, hungup: 0n, shared: f.world };
  const result = finish(getCommand(ctx, new CommandInput(), f.out, commandServices(f, ctx)));
  assert.deepEqual(result, { kind: 'dead' }); assert.equal(ctx.who, 0); assert.equal(ctx.ptime, 0n);
  assert.equal(f.p.alive, 1n); assert.equal(f.p.ppn, 0n); assert.equal(f.saved.tjob[K.KPPN], 40n);
  assert.equal(f.saved.tshpco[K.KSDAM], BigInt(K.KENDAM)); assert.equal(f.records[0].ppn, 40n);
  assert.equal(f.world.killed.rows[1].job, 10n); assert.equal(f.world.board.disp(20, 30), 0);
  assert.equal(f.out.drain(), '\r\n'); assert.equal(f.calls.includes('exit'), false);
});

test('GETCMD reaching ENDGAM performs actual cleanup and exits before emitting a command prompt', () => {
  const f = endFixture(); f.world.endflg = -1n;
  const ctx: CommandContext = { who: 1, team: 1, oflg: 0, prtype: 0, pasflg: -2n,
    ptime: 777n, ccflg: 0n, hungup: 0n, shared: f.world };
  assert.throws(() => finish(getCommand(ctx, new CommandInput(), f.out, commandServices(f, ctx))), SessionExit);
  assert.equal(ctx.who, 0); assert.equal(f.p.alive, 1n); assert.equal(f.world.numply, 0n);
  assert.equal(f.out.drain(), '\r\nTHE WAR IS OVER!!\r\n\r\n'); assert.equal(f.calls.at(-1), 'exit');
});
