import test from 'node:test';
import assert from 'node:assert/strict';
import { Scores } from '../src/game/scores.ts';
import { finishTurn } from '../src/game/turn.ts';
import type { TurnServices } from '../src/game/turn.ts';
import { commandLoop, dispatchCommand } from '../src/game/command-loop.ts';
import type { CommandCall, CommandLoopServices } from '../src/game/command-loop.ts';
import { quitCommand, leaveGame } from '../src/game/quit.ts';
import type { QuitServices } from '../src/game/quit.ts';
import type { StatisticsRecord } from '../src/game/get-command.ts';
import { getCommand } from '../src/game/get-command.ts';
import type { GetCommandServices } from '../src/game/get-command.ts';
import { timeCommand } from '../src/game/time-command.ts';
import { playerSlots } from '../src/game/player.ts';
import { repairCommand, dock } from '../src/game/maintenance.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { MAX_INTEGER, MIN_INTEGER } from '../src/compat/word36.ts';
import { KilledQueue, SavedShip, freeShip } from '../src/game/lifecycle.ts';
import { emptyHit } from '../src/game/hit-queue.ts';

function finish<T>(run: Generator<never, T, void>): T { const step = run.next(); assert.equal(step.done, true); return step.value; }
class SessionExit extends Error {}
function fixture() {
  const players = playerSlots(), scores = new Scores();
  const shared = { players, scores, dotime: 0n, numply: 3n, romopt: 0n, board: new PackedBoard(),
    killed: new KilledQueue(), numsid: [0n, 1n, 0n], endflg: 0n, hitime: 0n };
  const ctx = { who: 1, team: 1, prtype: 0, player: -1n, ptime: 55n, oflg: 0,
    hungup: 0n, ccflg: 0n, addrck: 0n, tpoint: Array<bigint>(9).fill(0n), shared };
  const p = players[1]; p.alive = -1n; p.ship.turns = 7n;
  const out = new TerminalOutput(), input = new CommandInput(), events: string[] = [];
  const turn: TurnServices<never> = {
    *repair(mode) { events.push(`repair:${mode}`); repairCommand({ ship: p.ship, who: 1, oflg: 0, nomsg: 0n, board: shared.board }, input.tokens, mode, out,
      () => { assert.fail('Automatic repair should not read a clock'); }); },
    *baspha() { events.push('baspha'); }, *plnatk() { events.push('plnatk'); }, *basbld() { events.push('basbld'); },
    *romdrv() { events.push('romdrv'); ctx.player = 0n; },
  };
  const loop: CommandLoopServices<never> = {
    *getcmd() { assert.fail('Supply explicit command sequence'); },
    *invoke(call) { events.push(JSON.stringify(call)); return { alternateReturn: false }; },
    *quit() { events.push('quit'); }, *leave() { events.push('leave'); throw new SessionExit(); },
    *finishTurn(repair) { events.push(`turn:${repair}`); yield* finishTurn(ctx, repair, out, turn); },
    movementContinuation(alive) { events.push(`movement:${alive}`); return 'repair'; }, // Explicit compiler fixture.
  };
  return { ctx, p, scores, out, input, events, turn, loop };
}

test('score arrays retain HISEG column-major player/category and category/team word offsets', () => {
  const scores = new Scores(); scores.setPlayer(8, 10, 99n); scores.setPlayer(1, 2, 77n);
  scores.setTeam(2, 8, 88n); scores.setTeam(1, 2, 66n);
  assert.equal(scores.playerWords.length, 80); assert.equal(scores.teamWords.length, 16);
  assert.equal(scores.playerWords[79], 99n); assert.equal(scores.playerWords[8], 77n);
  assert.equal(scores.teamWords[15], 88n); assert.equal(scores.teamWords[2], 66n);
  assert.equal(scores.player(8, 10), 99n); assert.equal(scores.team(2, 8), 88n);
});

test('finishTurn gates global work on the incremented shared counter and preserves ordering before stardates', () => {
  const f = fixture(); finish(finishTurn(f.ctx, false, f.out, f.turn));
  assert.equal(f.ctx.shared.dotime, 1n); assert.deepEqual(f.events, []);
  f.ctx.shared.dotime = 2n; f.ctx.shared.romopt = -1n;
  const before = f.p.ship.turns;
  const io: TurnServices<string> = { ...f.turn,
    *baspha() { assert.equal(f.ctx.shared.dotime, 0n); assert.equal(f.p.ship.turns, before); yield 'base'; },
    *plnatk() { yield 'planet'; }, *basbld() { yield 'rebuild'; }, *romdrv() { f.ctx.player = 0n; yield 'romulan'; },
  };
  const run = finishTurn(f.ctx, true, f.out, io);
  assert.equal(run.next().value, 'base'); assert.deepEqual(f.events, ['repair:3']);
  assert.equal(run.next().value, 'planet'); assert.equal(run.next().value, 'rebuild'); assert.equal(run.next().value, 'romulan');
  assert.equal(f.p.ship.turns, before); assert.equal(run.next().done, true);
  assert.equal(f.p.ship.turns, before + 1n); assert.equal(f.ctx.player, 0n);
});

test('finishTurn evaluates ROMOPT after base work and executes the sequence even with zero population', () => {
  const f = fixture(); f.ctx.shared.numply = 0n;
  f.turn.basbld = function* () { f.events.push('basbld'); f.ctx.shared.romopt = -1n; };
  finish(finishTurn(f.ctx, false, f.out, f.turn));
  assert.deepEqual(f.events, ['baspha', 'plnatk', 'basbld', 'romdrv']); assert.equal(f.ctx.shared.dotime, 0n);
});

test('finishTurn does not add an alive check after defenses and still commits pending points after life-support death', () => {
  const f = fixture(); f.ctx.shared.numply = 1n;
  f.turn.baspha = function* () { f.p.alive = 0n; f.p.ship.devices[K.KDLIFE] = BigInt(K.KCRIT); f.p.ship.lifeReserves = 0n; };
  f.ctx.tpoint[1] = 123n;
  finish(finishTurn(f.ctx, false, f.out, f.turn));
  assert.equal(f.p.ship.turns, 8n); assert.equal(f.p.ship.damage, BigInt(K.KENDAM)); assert.equal(f.scores.player(1, 1), 123n);
  assert.equal(f.out.drain(), '\r\nWARNING!!  Life Support damaged.\r\nReserves of -1 stardates.\r\n');
});

test('finishTurn aborts remaining work when a defense terminates the session', () => {
  const f = fixture(); f.ctx.shared.numply = 1n; f.ctx.tpoint[2] = 10n;
  f.turn.plnatk = function* () { throw new SessionExit(); };
  assert.throws(() => finish(finishTurn(f.ctx, false, f.out, f.turn)), SessionExit);
  assert.deepEqual(f.events, ['baspha']); assert.equal(f.p.ship.turns, 7n); assert.equal(f.ctx.tpoint[2], 10n);
});

test('life support threshold, docked reserve retention, zero reserve, negative reserve and informative prompt follow source branches', () => {
  for (const docked of [false, true]) for (const reserve of [1n, 0n, -1n]) {
    const f = fixture(); f.p.ship.docked = docked; f.p.ship.lifeReserves = reserve;
    f.p.ship.devices[K.KDLIFE] = BigInt(K.KCRIT); f.ctx.prtype = -1;
    finish(finishTurn(f.ctx, false, f.out, f.turn));
    const left = reserve - (docked ? 0n : 1n);
    assert.equal(f.p.ship.lifeReserves, left); assert.equal(f.p.ship.damage, left < 0n ? BigInt(K.KENDAM) : 0n);
    assert.equal(f.out.drain(), '');
  }
  const f = fixture(); f.p.ship.devices[K.KDLIFE] = BigInt(K.KCRIT - 1); f.p.ship.lifeReserves = -1n;
  finish(finishTurn(f.ctx, false, f.out, f.turn)); assert.equal(f.p.ship.damage, 0n); assert.equal(f.out.drain(), '');
});

test('automatic REPAIR precedes life-support threshold and preserves command PTIME', () => {
  const f = fixture(); f.p.ship.devices[K.KDLIFE] = BigInt(K.KCRIT); f.p.ship.lifeReserves = 0n;
  finish(finishTurn(f.ctx, true, f.out, f.turn));
  assert.equal(f.p.ship.devices[K.KDLIFE], BigInt(K.KCRIT) - 300n); assert.equal(f.p.ship.lifeReserves, 0n);
  assert.equal(f.p.ship.damage, 0n); assert.equal(f.ctx.ptime, 55n); assert.equal(f.out.drain(), '');
});

test('turn accounting wraps 36-bit additions and commits all eight categories to the current player and team only', () => {
  const f = fixture(); f.ctx.team = 2; f.ctx.who = 6;
  f.ctx.shared.players[6].ship.turns = MAX_INTEGER; f.scores.turns[2] = MAX_INTEGER;
  f.ctx.shared.dotime = MAX_INTEGER;
  for (let i = 1; i <= 8; i++) { f.ctx.tpoint[i] = BigInt(i); f.scores.setPlayer(i, 6, MAX_INTEGER); f.scores.setTeam(2, i, -10n); }
  f.ctx.tpoint[0] = 88n;
  finish(finishTurn(f.ctx, false, f.out, f.turn));
  assert.equal(f.ctx.shared.dotime, MIN_INTEGER); assert.deepEqual(f.events, []);
  assert.equal(f.ctx.shared.players[6].ship.turns, MIN_INTEGER); assert.equal(f.scores.turns[2], MIN_INTEGER);
  for (let i = 1; i <= 8; i++) {
    assert.equal(f.scores.player(i, 6), MIN_INTEGER + BigInt(i - 1)); assert.equal(f.scores.team(2, i), BigInt(i - 10));
    assert.equal(f.scores.player(i, 1), 0n); assert.equal(f.scores.team(1, i), 0n); assert.equal(f.ctx.tpoint[i], 0n);
  }
  assert.equal(f.ctx.tpoint[0], 88n);
});

test('all 33 dispatch slots select source routine names, arguments and post-command paths', () => {
  const names = ['bases', 'build', 'captur', 'damage', 'dock', 'energy', 'gripe', 'help', 'impuls', 'list', 'move', 'news',
    'phacon', 'planet', 'points', 'quit', 'radio', 'repair', 'scan', 'set', 'shield', 'srscan', 'status', 'summar',
    'target', 'tell', 'time', 'torp', 'tractr', 'type', 'users', 'debug', 'paswrd'];
  const args: Record<number, 0 | 1 | 2 | false> = { 4: 2, 15: false, 18: 1, 23: 2, 30: 0 };
  for (let id = 1; id <= 33; id++) {
    const f = fixture(); const seen: CommandCall[] = [];
    f.loop.invoke = function* (call) { seen.push(call); return { alternateReturn: false }; };
    finish(dispatchCommand(f.ctx, id, f.loop));
    if (id === 16) { assert.deepEqual(f.events, ['quit']); assert.deepEqual(seen, []); continue; }
    assert.deepEqual(seen, [Object.hasOwn(args, id) ? { routine: names[id - 1], argument: args[id] } : { routine: names[id - 1] }]);
    const repair = [2, 3, 5, 9, 11, 18].includes(id), weapon = [13, 28].includes(id);
    assert.equal(f.events.includes('turn:true'), repair); assert.equal(f.events.includes('turn:false'), weapon);
    assert.equal(f.p.ship.turns, repair || weapon ? 8n : 7n);
  }
});

test('all time-consuming alternate returns bypass repair, defenses, life support and score commit but retain PTIME writes', () => {
  for (const id of [2, 3, 5, 9, 11, 13, 18, 28]) {
    const f = fixture(); f.ctx.tpoint[1] = 10n; f.p.ship.lifeReserves = 0n;
    f.loop.invoke = function* () { return { alternateReturn: true, pause: -99n }; };
    finish(dispatchCommand(f.ctx, id, f.loop));
    assert.deepEqual(f.events, []); assert.equal(f.ctx.ptime, -99n); assert.equal(f.p.ship.turns, 7n); assert.equal(f.ctx.tpoint[1], 10n);
  }
});

test('movement normal return consults explicit signed-logical adapter and can take terminal cleanup without a turn', () => {
  const f = fixture(); f.p.alive = 1n;
  f.loop.movementContinuation = alive => { assert.equal(alive, 1n); return 'leave'; };
  assert.throws(() => finish(dispatchCommand(f.ctx, 11, f.loop)), SessionExit);
  assert.equal(f.events.at(-1), 'leave'); assert.equal(f.events.includes('turn:true'), false);
});

test('dispatch out-of-range integer falls through to BASES and refuses unspecified alternate-return outcomes', () => {
  for (const id of [0, -1, 34]) {
    const f = fixture(); finish(dispatchCommand(f.ctx, id, f.loop)); assert.equal(f.events[0], '{"routine":"bases"}');
  }
  const f = fixture(); f.loop.invoke = function* () {};
  assert.throws(() => finish(dispatchCommand(f.ctx, 2, f.loop)), /alternate-return/);
});

test('commandLoop resets PLAYER before GETCMD and returns to pre-game on WHO=0 without dispatching', () => {
  const f = fixture(); let count = 0;
  const io: CommandLoopServices<'input'> = { ...f.loop,
    *getcmd() {
      assert.equal(f.ctx.player, -1n); yield 'input';
      if (++count === 2) f.ctx.who = 0;
      return 27;
    }, *invoke(call) { assert.equal(call.routine, 'time'); f.ctx.player = 0n; },
  };
  const run = commandLoop(f.ctx, io);
  assert.equal(run.next().value, 'input'); assert.equal(run.next().value, 'input');
  assert.deepEqual(run.next(), { value: 'pregame', done: true }); assert.equal(f.p.ship.turns, 7n);
});

test('actual REPAIR dispatch performs requested repair plus automatic repair and adds one turn', () => {
  const f = fixture(); f.input.acceptLine('REPAIR 10'); f.input.acquire(f.out); f.p.ship.devices[1] = 1000n;
  const report = { ship: f.p.ship, who: 1, board: f.ctx.shared.board, oflg: 0, nomsg: 0n };
  f.loop.invoke = function* (call) { assert.equal(call.argument, 1); return repairCommand(report, f.input.tokens, 1, f.out, () => 100n); };
  finish(dispatchCommand(f.ctx, 18, f.loop));
  assert.equal(f.p.ship.devices[1], 600n); assert.equal(f.ctx.ptime, 800n); assert.equal(f.p.ship.turns, 8n);
});

test('actual DOCK failure bypasses turn accounting while success adds automatic repair and a turn even with negative PTIME', () => {
  for (const nearby of [false, true]) {
    const f = fixture(); f.p.ship.v = 10; f.p.ship.h = 10; f.ctx.shared.board.setdsp(10, 10, 101);
    const context = { ship: f.p.ship, who: 1, board: f.ctx.shared.board, oflg: 0, nomsg: 0n, team: 1 as const,
      bases: Array.from({ length: 10 }, () => ({ v: nearby ? 11 : 40, h: 11, strength: 1000n })),
      planets: [], capturedPlanets: 0, alive: true, slowestTerminal: 0n };
    let time = 0n;
    f.loop.invoke = function* () { return dock(context, f.input.tokens, f.out, () => { time += 2000n; return time; }); };
    finish(dispatchCommand(f.ctx, 5, f.loop));
    assert.equal(f.p.ship.turns, nearby ? 8n : 7n); assert.equal(f.ctx.ptime, nearby ? -1000n : 55n);
  }
});

function quitFixture() {
  const f = fixture(), records: StatisticsRecord[] = [];
  f.p.ppn = 77n; f.p.name1 = 11n; f.p.name2 = 22n; f.p.started = 86399000n;
  const io: QuitServices<never> = {
    cctrap() { f.events.push('cctrap'); }, daytime() { f.events.push('day'); return 1000n; },
    *points(final) { assert.equal(final, true); f.events.push('points'); return 123n; },
    *updsta(record) { f.events.push('updsta'); records.push(record); },
    *free(who) { f.events.push(`free:${who}`); }, exit() { f.events.push('exit'); throw new SessionExit(); },
    clear() { f.events.push('clear'); assert.equal(f.ctx.ccflg, 0n); f.input.discardTail(); },
    *gtkn() { f.events.push('gtkn'); f.input.acceptLine('YES'); f.input.acquire(f.out); },
  };
  return { ...f, records, io };
}

test('QUIT confirmation clears pending compound input and CCFLG before GTKN, then snapshots and exits', () => {
  const f = quitFixture(); f.ctx.ccflg = -1n; f.input.acceptLine('QUIT/YES'); f.input.acquire(f.out);
  assert.throws(() => finish(quitCommand(f.ctx, f.input, f.out, f.io)), SessionExit);
  assert.equal(f.out.drain(), '\r\nDo you really want to quit? ');
  assert.deepEqual(f.events, ['clear', 'gtkn', 'cctrap', 'day', 'points', 'updsta', 'free:1', 'exit']);
  assert.equal(f.records[0].elapsed, 2000n); assert.equal(f.records[0].why, -1n); assert.equal(f.ctx.who, 0);
});

test('QUIT accepts YES prefixes by token text regardless of type, rejects other responses without another prompt', () => {
  for (const answer of ['Y', 'YE', 'YES', 'NO', '', 'YESNO']) {
    const f = quitFixture();
    f.io.gtkn = function* () { f.input.tokens[0].text = answer; f.input.tokens[0].type = K.KINT; };
    if (['Y', 'YE', 'YES'].includes(answer)) assert.throws(() => finish(quitCommand(f.ctx, f.input, f.out, f.io)), SessionExit);
    else { finish(quitCommand(f.ctx, f.input, f.out, f.io)); assert.equal(f.ctx.who, 1); assert.equal(f.events.includes('points'), false); }
    assert.equal(f.out.drain(), '\r\nDo you really want to quit? ');
  }
});

test('QUIT existing hangup bypasses prompt/clear/input but a new hangup during GTKN does not add a new acceptance branch', () => {
  const f = quitFixture(); f.ctx.hungup = -1n; f.ctx.ccflg = -1n;
  assert.throws(() => finish(quitCommand(f.ctx, f.input, f.out, f.io)), SessionExit);
  assert.equal(f.out.drain(), ''); assert.equal(f.events[0], 'cctrap'); assert.equal(f.ctx.ccflg, -1n);
  const g = quitFixture(); g.io.gtkn = function* () { g.ctx.hungup = -1n; g.input.tokens[0].text = 'QUIT'; };
  finish(quitCommand(g.ctx, g.input, g.out, g.io)); assert.equal(g.ctx.who, 1); assert.equal(g.events.includes('exit'), false);
});

test('leaveGame snapshots identity before POINTS, determines reason after clock read, and resets WHO only after FREE', () => {
  const f = quitFixture(); f.ctx.team = 2;
  f.io.daytime = () => { f.ctx.addrck = -1n; return 1000n; };
  f.io.points = function* () { f.p.ppn = 0n; f.p.name1 = 0n; f.ctx.team = 1; return 999n; };
  f.io.free = function* (who) { assert.equal(who, 1); assert.equal(f.ctx.who, 1); assert.equal(f.records.length, 1); };
  assert.throws(() => finish(leaveGame(f.ctx, f.io)), SessionExit);
  assert.equal(f.records[0].ppn, 77n); assert.equal(f.records[0].name1, 11n); assert.equal(f.records[0].why, 0n);
  assert.equal(f.records[0].teamIndex, 1); assert.equal(f.records[0].total, 999n); assert.equal(f.ctx.who, 0);
});

test('QUIT dispatch composes actual ship release and preserves JOB identity in the killed record before exit', () => {
  const f = quitFixture(), saved = new SavedShip(), registers = { ...emptyHit(), dbits: 0n };
  f.p.ship.v = 10; f.p.ship.h = 20;
  f.io.free = who => freeShip(f.ctx.shared, saved, registers, who, {
    *lock() { return true; }, unlock() {}, daytime() { return 1000n; },
    *trcoff() { assert.fail('No tractor'); }, *gethit() { assert.fail('No hit'); }, *getmsg() { assert.fail('No message'); },
  });
  f.loop.quit = () => quitCommand(f.ctx, f.input, f.out, f.io);
  assert.throws(() => finish(dispatchCommand(f.ctx, 16, f.loop)), SessionExit);
  assert.equal(f.ctx.who, 0); assert.equal(f.p.alive, 1n); assert.equal(f.p.ppn, 0n);
  assert.equal(f.ctx.shared.killed.rows[1].ppn, 77n); assert.equal(f.p.ship.turns, 7n);
});

test('main loop composes actual GETCMD, compound input, REPAIR, automatic repair, TIME and death cleanup back to pre-game', () => {
  const f = fixture(), shared = Object.assign(f.ctx.shared, { comknt: 0n });
  const ctx = Object.assign(f.ctx, { pasflg: 0n, shared });
  f.p.ship.v = 10; f.p.ship.h = 20; f.p.ship.devices[1] = 1000n;
  f.input.acceptLine('REPAIR 10/TIME'); ctx.tpoint[1] = 17n;
  const saved = new SavedShip(), registers = { ...emptyHit(), dbits: 0n }, pauses: bigint[] = [], invoked: string[] = [];
  let reads = 0;
  const getter: GetCommandServices<never> = {
    ttyon() {}, dmpbuf() {}, cctrap() {}, *pause(ms) { pauses.push(ms()); }, *zaplok() {},
    *input() { return true; }, *gtkn() { assert.equal(f.input.acquire(f.out), true); }, clear() { f.input.discardTail(); },
    *outhit() { assert.fail('No hits'); }, *outmsg() { assert.fail('No messages'); }, *endgam() {},
    daytime() { return 1000n; }, *points() { return 17n; }, *updsta(record) { assert.equal(record.total, 17n); },
    *free(who) { yield* freeShip(shared, saved, registers, who, {
      *lock() { return true; }, unlock() {}, daytime() { return 1000n; },
      *trcoff() { assert.fail('No tractor'); }, *gethit() { assert.fail('No hits'); }, *getmsg() { assert.fail('No messages'); },
    }); },
  };
  f.loop.getcmd = function* () {
    if (++reads === 3) f.p.ship.damage = BigInt(K.KENDAM);
    const result = yield* getCommand(ctx, f.input, f.out, getter);
    return result.kind === 'dead' ? 0 : result.id;
  };
  f.loop.invoke = function* (call) {
    invoked.push(call.routine);
    if (call.routine === 'repair') return repairCommand({ ship: f.p.ship, who: 1, board: shared.board, oflg: 0, nomsg: 0n },
      f.input.tokens, 1, f.out, () => 100n);
    assert.equal(call.routine, 'time');
    timeCommand({ who: 1, gameStarted: 0n, shipStarted: 0n, shipRunStarted: 0n }, f.out, { daytime: () => 1000n, runtime: () => 500n });
  };
  assert.equal(finish(commandLoop(ctx, f.loop)), 'pregame');
  assert.deepEqual(invoked, ['repair', 'time']); assert.deepEqual(pauses, [55n, 800n, 0n]);
  assert.equal(f.p.ship.devices[1], 600n); assert.equal(f.p.ship.turns, 8n); assert.equal(f.scores.player(1, 1), 17n);
  assert.equal(ctx.who, 0); assert.equal(f.p.alive, 1n); assert.equal(shared.comknt, 2n);
});
