import test from 'node:test';
import assert from 'node:assert/strict';
import { getCommand } from '../src/game/get-command.ts';
import type { CommandContext, GetCommandServices, StatisticsRecord } from '../src/game/get-command.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { initialShip } from '../src/game/ship.ts';
import { CommandInput, resumeCommand } from '../src/compat/command-input.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { radio } from '../src/game/radio.ts';
import { status } from '../src/game/reports.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { hibernate, inputReady, pause } from '../src/compat/wait.ts';
import type { Hibernate } from '../src/compat/wait.ts';
import { gtkn } from '../src/compat/gtkn.ts';
import type { TokenReadServices } from '../src/compat/gtkn.ts';
import { MessageQueue, makeMessage, getMessage } from '../src/game/message-queue.ts';
import { outMessage } from '../src/game/out-message.ts';
import type { QueueServices } from '../src/compat/queue.ts';
import { emptyHit, HitQueue } from '../src/game/hit-queue.ts';
import { outHit } from '../src/game/out-hit.ts';

type Event = 'pause' | 'poll' | 'tokens' | 'unlock';
function fixture() {
  const p = { ship: initialShip(), active: 9n, hitflg: 0n, msgflg: 0n,
    ppn: 1n, name1: 2n, name2: 3n, shipName1: 4n, shipName2: 5n, started: 86399000n };
  const ctx: CommandContext = { who: 1, team: 1, oflg: 0, prtype: 0, pasflg: 0n, ptime: 123n,
    ccflg: -1n, hungup: 0n, shared: { players: [p, p], numply: 2n, comknt: 0n } };
  const input = new CommandInput(), out = new TerminalOutput(), calls: string[] = [], records: StatisticsRecord[] = [];
  let ready = true, line = 'TIME';
  const io: GetCommandServices<Event> = {
    ttyon() { calls.push('ttyo'); }, dmpbuf() { calls.push('dump'); }, cctrap() { calls.push('cctrap'); },
    *pause(ms) { calls.push(`pause:${ms()}`); yield 'pause'; },
    *zaplok() { calls.push('zaplok'); yield 'unlock'; },
    *input(ms) { calls.push(`input:${ms}`); yield 'poll'; return ready; },
    *gtkn() { calls.push('gtkn'); yield 'tokens'; if (!input.available) input.acceptLine(line); input.acquire(out); },
    clear() { calls.push('clear'); input.discardTail(); },
    *outhit() { calls.push('hit'); p.hitflg = 0n; },
    *outmsg() { calls.push('msg'); p.msgflg = 0n; },
    *endgam() { calls.push('endgam'); },
    daytime() { calls.push('day'); return 1000n; },
    *points(final) { calls.push(`points:${final}`); return 77n; },
    *updsta(record) { calls.push('updsta'); records.push(record); },
    *free(who) { calls.push(`free:${who}`); },
  };
  return { ctx, p, io, input, out, calls, records, ready(v: boolean) { ready = v; }, line(v: string) { line = v; } };
}

test('GETCMD drains hit then message queues before pause, resets delay afterward, and resolves a command', () => {
  const f = fixture(); f.p.hitflg = f.p.msgflg = -1n;
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  assert.equal(run.next().value, 'pause');
  assert.deepEqual(f.calls, ['ttyo', 'hit', 'ttyo', 'msg', 'dump', 'cctrap', 'pause:123']);
  assert.equal(f.ctx.ccflg, 0n); assert.equal(f.ctx.ptime, 123n);
  assert.equal(run.next().value, 'unlock'); assert.equal(f.ctx.ptime, 0n);
  assert.equal(f.out.drain(), '\r\nCommand: ');
  assert.equal(run.next().value, 'poll'); assert.equal(run.next().value, 'tokens');
  assert.equal(f.p.active, 0n); assert.equal(f.ctx.shared.comknt, 1n);
  assert.deepEqual(run.next(), { value: { kind: 'command', id: 27 }, done: true });
  assert.deepEqual(f.calls.slice(7), ['ttyo', 'endgam', 'dump', 'zaplok', 'input:2000', 'gtkn']);
});

test('GETCMD timeout resets global count at 30*numplayers and checks endgame without a fresh prompt', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.ctx.shared.comknt = 59n; f.ready(false);
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  assert.equal(run.next().value, 'unlock'); assert.equal(f.ctx.ptime, 0n);
  assert.equal(f.calls.some(c => c.startsWith('pause:')), false);
  f.out.drain(); assert.equal(run.next().value, 'poll');
  assert.equal(run.next().value, 'unlock'); assert.equal(f.ctx.shared.comknt, 0n);
  assert.equal(f.p.active, 0n); assert.equal(f.out.drain(), '');
  assert.equal(f.calls.filter(c => c === 'endgam').length, 2);
  f.ready(true); run.next(); run.next(); assert.equal(run.next().done, true);
});

test('GETCMD queued hit after timeout is reported before rechecking death and skips another prompt', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.ready(false);
  f.io.outhit = function* () { f.calls.push('hit'); f.p.hitflg = 0n; f.p.ship.damage = 25000n; };
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  run.next(); run.next(); f.p.hitflg = -1n; f.p.msgflg = -1n;
  assert.deepEqual(run.next(), { value: { kind: 'dead' }, done: true });
  assert.equal(f.ctx.who, 0);
  assert.deepEqual(f.calls.slice(-9), ['input:2000', 'ttyo', 'hit', 'ttyo', 'msg', 'day', 'points:true', 'updsta', 'free:1']);
  assert.equal(f.out.drain(), '\r\nCommand: \r\n');
});

test('GETCMD death snapshots identity before POINTS, wraps elapsed time, then records and frees', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.p.ship.damage = 25000n; f.p.ship.energy = 0n;
  f.io.points = function* () { f.calls.push('points:true'); f.p.name1 = 999n; return 77n; };
  assert.deepEqual(getCommand(f.ctx, f.input, f.out, f.io).next(), { value: { kind: 'dead' }, done: true });
  assert.deepEqual(f.records, [{ ppn: 1n, name1: 2n, name2: 3n, shipName1: 4n, shipName2: 5n,
    elapsed: 2000n, why: 0n, teamIndex: 0, total: 77n, who: 1 }]);
  assert.equal(f.out.drain(), '\r\n'); // Damage check precedes energy exhaustion output.
  assert.equal(f.ctx.who, 0); assert.equal(f.calls.includes('endgam'), false);
});

test('GETCMD energy exhaustion outputs source ship text and message before the same death path', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.p.ship.energy = 0n;
  assert.equal(getCommand(f.ctx, f.input, f.out, f.io).next().done, true);
  assert.equal(f.out.drain(), '\r\nL RUNS OUT OF ENERGY!!\r\n'); // MSG.MAC:146.
  assert.equal(f.records[0].why, 0n);
});

test('GETCMD low energy changes RED to YELLOW and emits the four literal bells', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.ctx.prtype = -1; f.p.ship.condition = K.RED; f.p.ship.energy = 10000n;
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  assert.equal(run.next().value, 'unlock');
  assert.equal(f.p.ship.condition, K.YELLOW); assert.equal(f.out.drain(), '\r\n\x07\x07\x07\x07E> ');
  run.return({ kind: 'dead' });
});

test('GETCMD unknown, ambiguous, and empty commands retry while preserving remaining slash input', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.ctx.oflg = -1;
  f.input.acceptLine('NONSENSE / S / / *PASSWORD');
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  for (let i = 0; i < 4; i++) {
    assert.equal(run.next().value, 'unlock'); assert.equal(run.next().value, 'poll');
    assert.equal(run.next().value, 'tokens');
  }
  assert.deepEqual(run.next(), { value: { kind: 'command', id: 33 }, done: true });
  assert.equal(f.ctx.shared.comknt, 4n);
  // OCRL inserts a blank line after a nonblank terminated line, then
  // suppresses further blank lines (WARMAC:2046-2063).
  assert.equal(f.out.drain(), '\r\nCommand: Unknown command\r\n\r\nCommand: \r\nAmbiguous command\r\n\r\nCommand: \r\n\r\nCommand: \r\n');
});

test('GETCMD interrupt after GTKN forces QUIT outside RED and retains token values, pointers and count', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.line('123 456');
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  run.next(); run.next(); run.next(); f.ctx.ccflg = -1n;
  assert.deepEqual(run.next(), { value: { kind: 'command', id: 16 }, done: true });
  assert.equal(f.input.ntok, 2); assert.equal(f.input.tokens[0].text, 'QUIT');
  assert.equal(f.input.tokens[0].value, 123n); assert.equal(f.input.tokens[1].value, 456n);
});

test('GETCMD RED interrupt refuses quit, clears pending tail and resets CCFLG before the next prompt', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.p.ship.condition = K.RED; f.line('TIME / QUIT');
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  run.next(); run.next(); run.next(); f.ctx.ccflg = -1n;
  assert.equal(run.next().value, 'unlock'); assert.equal(f.ctx.ccflg, 0n);
  assert.equal(f.input.available, false); assert.ok(f.calls.includes('clear'));
  assert.equal(f.out.drain(), '\r\nCommand: Use QUIT to terminate while under RED alert.\r\n\r\nCommand: '); // MSG.MAC:171.
  run.return({ kind: 'dead' });
});

test('GETCMD hangup during INPUT forces QUIT without token read or command-count increment', () => {
  const f = fixture(); f.ctx.pasflg = -2n;
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  run.next(); run.next(); f.ctx.hungup = -1n;
  assert.deepEqual(run.next(), { value: { kind: 'command', id: 16 }, done: true });
  assert.equal(f.ctx.shared.comknt, 0n); assert.equal(f.input.ntok, 0);
  assert.equal(f.calls.includes('gtkn'), false);
});

test('GETCMD preexisting hangup or interrupt at label 200 skips INPUT and revisits ENDGAM', () => {
  for (const flag of ['hungup', 'ccflg'] as const) {
    const f = fixture(); f.ctx.pasflg = -2n;
    const run = getCommand(f.ctx, f.input, f.out, f.io);
    assert.equal(run.next().value, 'unlock'); f.ctx[flag] = -1n;
    assert.equal(run.next().value, 'unlock'); assert.equal(f.ctx.shared.comknt, 1n);
    assert.equal(f.calls.includes('input:2000'), false);
    assert.equal(f.calls.filter(c => c === 'endgam').length, 2);
    run.return({ kind: 'dead' });
  }
});

test('GETCMD dispatch composes RADIO then STATUS from one physical line with shared radio state', () => {
  const f = fixture(); f.ctx.pasflg = -2n; f.input.acceptLine('RADIO OFF / STATUS RADIO');
  const shared = { nomsg: 0n }, board = new PackedBoard();
  function dispatch() {
    const run = getCommand(f.ctx, f.input, f.out, f.io);
    let r = run.next(); while (!r.done) r = run.next();
    assert.equal(r.value.kind, 'command');
    return r.value.kind === 'command' ? r.value.id : 0;
  }
  assert.equal(dispatch(), 17);
  assert.equal(resumeCommand(radio({ who: 1, oflg: 0, gagmsg: 0n, shared }, f.input.tokens, f.out), f.input, f.out).next().done, true);
  assert.equal(shared.nomsg, 1n); assert.equal(dispatch(), 23);
  status({ ship: f.p.ship, who: 1, oflg: 0, nomsg: shared.nomsg, board }, f.input.tokens, 2, f.out);
  assert.equal(f.out.drain(), '\r\nCommand: \r\nRadio turned off, Captain.\r\n\r\nCommand: \r\n\r\nRadio  Off\r\n');
});

test('GETCMD composes actual PAUSE, INPUT and GTKN; the next slash command bypasses hibernation', () => {
  const f = fixture();
  const state = Object.assign(f.ctx, { locked: 77n, svlock: 0n, ccflgDot: 0n, iniflg: 0n });
  let now = 1000n, pending = false, lineReads = 0;
  const waits: Hibernate[] = [], lockEvents: string[] = [];
  const low: TokenReadServices<Event | Hibernate> = {
    daytime: () => now, inputPending: () => pending, hibernate,
    unlo(key) { lockEvents.push(`unlo:${key}`); },
    *lock(key) { lockEvents.push(`lock:${key}`); return true; },
    *inli() { lineReads++; yield 'tokens'; return { text: 'TIME / TYPE', repeated: false }; },
  };
  const io: GetCommandServices<Event | Hibernate> = { ...f.io,
    pause: ms => pause(state, ms, low),
    input: ms => inputReady(state, () => f.input.available, () => ms, low),
    gtkn: () => gtkn(state, f.input, f.out, low),
  };
  function acquire() {
    const run = getCommand(state, f.input, f.out, io);
    let r = run.next();
    while (!r.done) {
      if (typeof r.value === 'object') {
        waits.push(r.value); now += r.value.milliseconds;
        if (r.value.wakeOnInput) pending = true;
      }
      r = run.next();
    }
    return r.value;
  }
  assert.deepEqual(acquire(), { kind: 'command', id: 27 });
  assert.deepEqual(acquire(), { kind: 'command', id: 30 });
  assert.deepEqual(waits, [
    { kind: 'hibernate', milliseconds: 123n, wakeOnInput: false },
    { kind: 'hibernate', milliseconds: 2000n, wakeOnInput: true },
  ]);
  assert.equal(lineReads, 1); assert.equal(state.shared.comknt, 2n);
  assert.deepEqual(lockEvents, ['unlo:77', 'lock:77', 'unlo:77', 'lock:77', 'unlo:77', 'lock:77']);
});

test('GETCMD delivers an actual queued message through GETMSG and OUTMSG before the previous delay', () => {
  const f = fixture(), queue = new MessageQueue(), buffer = Array<bigint>(16).fill(0n);
  const ctx = Object.assign(f.ctx, { dispfr: 210n, dbits: 1n, gagmsg: 0n });
  const locks: string[] = [];
  const io: QueueServices<never> = { *lock(r) { locks.push(r); return true; }, unlo() { locks.push('unlo'); } };
  assert.equal(makeMessage(queue, ctx.shared.players, ctx, 'Incoming', f.out, io).next().done, true);
  f.io.outmsg = () => outMessage(ctx, ctx.shared.players, buffer, f.out,
    (who, b) => getMessage(queue, ctx.shared.players, ctx, who, b, io));
  const run = getCommand(ctx, f.input, f.out, f.io);
  assert.equal(run.next().value, 'pause');
  assert.equal(f.out.drain(), '\r\nMessage from W to  L\r\nIncoming\r\n\r\n');
  assert.equal(ctx.shared.players[1].msgflg, 0n); assert.equal(queue.header, -1n);
  assert.deepEqual(locks, ['RSRV.', 'unlo', 'UPDT.', 'unlo', 'SRCH.', 'unlo', 'REMV.', 'unlo']);
  run.next(); run.next(); run.next(); assert.deepEqual(run.next(), { value: { kind: 'command', id: 27 }, done: true });
});

test('GETCMD drains actual combat output before actual radio output and then pauses', () => {
  const f = fixture(), hits = new HitQueue(), messages = new MessageQueue(), buffer = Array<bigint>(16).fill(0n);
  const registers = { ...emptyHit(), iwhat: 13n, dbits: 1n, who: 1, oflg: 0, gagmsg: 0n };
  const locks: QueueServices<never> = { *lock() { return true; }, unlo() {} };
  hits.make(1, registers, f.ctx.shared.players, 0n, f.out);
  Object.assign(registers, { dispfr: 0n, dbits: 1n });
  assert.equal(makeMessage(messages, f.ctx.shared.players, registers, 'After hits', f.out, locks).next().done, true);
  f.io.outhit = () => outHit({ who: 1, team: 1, oflg: 0, ocflg: 1, nomsg: 0n, ship: f.p.ship },
    registers, f.ctx.shared.players, f.out, function* (who) { hits.get(who, registers, f.ctx.shared.players); });
  f.io.outmsg = () => outMessage(registers, f.ctx.shared.players, buffer, f.out,
    (who, b) => getMessage(messages, f.ctx.shared.players, registers, who, b, locks));
  const run = getCommand(f.ctx, f.input, f.out, f.io);
  assert.equal(run.next().value, 'pause');
  assert.equal(f.out.drain(), 'Trac. Beam on\r\nAfter hits\r\n\r\n');
  assert.equal(f.p.hitflg, 0n); assert.equal(f.p.msgflg, 0n); assert.equal(registers.iwhat, 0n);
  run.next(); run.next(); run.next(); assert.deepEqual(run.next(), { value: { kind: 'command', id: 27 }, done: true });
});
