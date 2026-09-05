import test from 'node:test';
import assert from 'node:assert/strict';
import { tell, TellLocals } from '../src/game/tell.ts';
import type { TellServices } from '../src/game/tell.ts';
import { playerSlots } from '../src/game/player.ts';
import { MessageQueue, makeMessage, makeMessageFromInput, getMessage, messageText } from '../src/game/message-queue.ts';
import type { MessageInputServices } from '../src/game/message-queue.ts';
import { outMessage } from '../src/game/out-message.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { packAscii } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { gtkn } from '../src/compat/gtkn.ts';
import { radio } from '../src/game/radio.ts';

function fixture(line = 'TELL NIMITZ; Hello; again / TIME') {
  const players = playerSlots(), out = new TerminalOutput(), input = new CommandInput(), local = new TellLocals();
  players[1].alive = players[2].alive = -1n;
  Object.assign(players[1].ship, { v: 10, h: 10 });
  const groups = Array.from({ length: K.KNGRP + 1 }, () => ({ name: 0n, bits: 0n }));
  const ctx = { who: 1, team: 1, oflg: 0, player: -1n, rptflg: 0n, gagmsg: 0n,
    dispfr: 999n, dbits: 77n, ccflg: 0n, groups,
    shared: { players, nomsg: 0n, rom: -1n, locr: { v: 50, h: 50 } } };
  const board = new PackedBoard(), queue = new MessageQueue(), calls: string[] = [];
  board.setdsp(10, 10, 101); board.setdsp(50, 50, 500);
  input.acceptLine(line); input.acquire(out);
  const queueIo: MessageInputServices<'input'> = {
    *lock(routine) { calls.push(routine); return true; }, unlo() { calls.push('unlo'); },
    *inli() { yield 'input'; return { text: input.rawLine, repeated: false }; },
    *cancelUnreserved() { assert.fail('Unexpected Ctrl-C'); },
  };
  const io: TellServices<'input'> = {
    logical: word => word < 0n, // Explicit compiler fixture, not a production default.
    *gtkn() { yield 'input'; assert.ok(input.acquire(out)); },
    *romspk() { assert.fail('ROM speech requires a source implementation or explicit test fixture'); },
    *makmsg(buffer) {
      calls.push(buffer ? 'explicit' : 'no-argument');
      if (buffer) yield* makeMessage(queue, players, ctx, messageText(buffer), out, queueIo);
      else yield* makeMessageFromInput(queue, players, ctx, input, out, queueIo);
    },
    iran() { assert.fail('Unexpected random draw'); },
    literalRomulan: () => 'Romulan', // Explicit unpadded literal fixture.
  };
  const run = () => tell(ctx, input, local, board, out, io);
  const receive = (who: number) => {
    const buffer = Array<bigint>(16).fill(0n), registers = { dbits: 0n, dispfr: 0n };
    done(getMessage(queue, players, registers, who, buffer, queueIo));
    return { ...registers, text: messageText(buffer) };
  };
  // Speech is deliberately a fixture. It tests TELL's branch/call order, not ROMSPK.
  const speech = (bits = 1n) => {
    io.romspk = function* (buffer) {
      calls.push('romspk'); assert.equal(buffer, local.message);
      ctx.dispfr = 500n; ctx.dbits = bits;
      buffer[0] = packAscii('Words'); buffer[1] = 0n;
    };
    io.iran = n => { calls.push('iran:' + n); return 2n; };
  };
  return { players, out, input, local, ctx, groups, board, queue, calls, queueIo, io, run, receive, speech };
}
function done(run: Generator<unknown, void, void>) { assert.equal(run.next().done, true); }

test('TELL sends original raw-line text and composes with real GETMSG/OUTMSG delivery', () => {
  const f = fixture(); f.ctx.gagmsg = 3n; f.ctx.shared.nomsg = 1n; done(f.run());
  assert.equal(f.ctx.shared.nomsg, 0n); assert.equal(f.ctx.gagmsg, 1n); assert.equal(f.ctx.dbits, 0n);
  assert.equal(f.ctx.dispfr, 101n); assert.equal(f.out.drain(), '\r\n'); assert.equal(f.players[2].msgflg, 1n);
  const ctx = { who: 2, oflg: 0, gagmsg: 0n, dispfr: 0n, dbits: 0n }, buffer = Array<bigint>(16).fill(0n);
  done(outMessage(ctx, f.players, buffer, f.out,
    function* (who, words) { yield* getMessage(f.queue, f.players, ctx, who, words, f.queueIo); }));
  assert.equal(f.out.drain(), '\r\nMessage from L to  N\r\n Hello; again / TIME\r\n\r\n');
  assert.equal(f.players[2].msgflg, 0n); assert.equal(f.queue.header, -1n);
});

test('TELL damaged sender returns before enabling radio, clearing DBITS or reading input', () => {
  const f = fixture(); f.ctx.shared.nomsg = 1n; f.players[1].ship.devices[K.KDRAD] = BigInt(K.KCRIT);
  done(f.run()); assert.equal(f.ctx.dbits, 77n); assert.equal(f.ctx.shared.nomsg, 1n);
  assert.equal(f.out.drain(), '\r\nSub-Space radio damaged.\r\n'); assert.deepEqual(f.calls, []);
});

test('TELL turns radio on even when interactive destination is cancelled and retains DBITS', () => {
  const f = fixture('TELL'); f.ctx.shared.nomsg = 3n; const run = f.run();
  assert.deepEqual(run.next(), { done: false, value: 'input' });
  assert.equal(f.ctx.shared.nomsg, 2n); assert.equal(f.out.drain(), '\r\nTo ship:  ');
  f.input.acceptLine(''); done(run); assert.equal(f.ctx.dbits, 77n); assert.deepEqual(f.calls, []);
});

test('TELL accepts the exact below-critical sender threshold and asks MAKMSG directly for message text', () => {
  const f = fixture('TELL N'); f.players[1].ship.devices[K.KDRAD] = BigInt(K.KCRIT - 1);
  const run = f.run(); assert.deepEqual(run.next(), { done: false, value: 'input' });
  assert.equal(f.out.drain(), 'Msg: '); f.input.acceptLine('Message / TIME'); done(run);
  assert.equal(f.out.drain(), '\r\n'); assert.equal(f.input.available, false);
  assert.equal(f.receive(2).text, 'Message / TIME\r\n');
});

test('TELL destination GTKN can consume a command tail and MAKMSG uses its semicolon text', () => {
  const f = fixture('TELL / N ; Hi there');
  const state = { locked: 0n, svlock: 0n, hungup: 0n, ccflgDot: 0n, iniflg: 0n, ccflg: 0n };
  f.io.gtkn = () => gtkn(state, f.input, f.out, {
    *inli() { assert.fail(); }, unlo() { assert.fail(); }, *lock() { assert.fail(); },
    daytime() { assert.fail(); }, hibernate() { assert.fail(); }, inputPending() { assert.fail(); },
  });
  done(f.run()); assert.equal(f.out.drain(), '\r\nTo ship:  \r\n\r\n');
  assert.equal(f.receive(2).text, ' Hi there\r\n'); assert.equal(f.local.p, 1);
});

test('TELL unknown names and ambiguous groups report five token bytes then continue to valid destinations', () => {
  const f = fixture('TELL UNRECOGNIZED F N; text');
  f.groups[1] = { name: packAscii('FLEET'), bits: 2n }; f.groups[7] = { name: packAscii('FRIEN'), bits: 4n };
  done(f.run()); assert.equal(f.receive(2).text, ' text\r\n');
  assert.equal(f.out.drain(), '\r\nUnrecognized player or group name:  UNREC\r\n\r\nAmbiguous group name:  F\r\n\r\n');
});

test('TELL ship prefixes precede group matching and duplicate ship tokens do not duplicate delivery', () => {
  const f = fixture('TELL N N N; text'); f.groups[1] = { name: packAscii('N'), bits: 4n }; done(f.run());
  assert.equal(f.players[2].msgflg, 1n); assert.equal(f.players[3].msgflg, 0n);
});

test('TELL group pruning silently removes dead members and ignores zero-name slots despite their bits', () => {
  const f = fixture('TELL ALL; text'); f.groups[7] = { name: packAscii('ALL'), bits: 7n }; f.groups[1].bits = 1023n;
  done(f.run()); assert.equal(f.out.drain(), '\r\n'); assert.equal(f.ctx.gagmsg, 0n);
  assert.deepEqual(f.receive(2), { dispfr: 101n, dbits: 2n, text: ' text\r\n' });
});

test('TELL marks self, then filters dead and radio-off recipients in physical slot order before ungagging', () => {
  const f = fixture('TELL S V L N; text'); f.players[4].alive = -1n; f.ctx.shared.nomsg = 8n; f.ctx.gagmsg = 15n;
  done(f.run()); assert.equal(f.ctx.gagmsg, 13n); assert.equal(f.players[1].msgflg, 0n);
  assert.equal(f.out.drain(), '\r\nSelf excluded from message.\r\n\r\nPlayer is not in the game:  S\r\n\r\nCommunications:  Captain, we cannot raise the V\r\n\r\n');
  assert.equal(f.receive(2).dbits, 2n);
});

test('TELL recipient radio damage wins over dead status and dead status wins over radio-off', () => {
  const f = fixture('TELL N S; text'); f.players[2].alive = 1n; f.ctx.shared.nomsg = 6n;
  f.players[2].ship.devices[K.KDRAD] = BigInt(K.KCRIT); done(f.run());
  assert.equal(f.out.drain(), '\r\nCommunications:  Captain, we cannot raise the N\r\n\r\nPlayer is not in the game:  S\r\n\r\nNo message sent.\r\n');
  assert.deepEqual(f.calls, []);
});

for (const oflg of [-1, 0, 1]) test(`TELL diagnostic ODISP preserves verbosity ${oflg} for empire target using source class one`, () => {
  const f = fixture('TELL W; text'); f.ctx.oflg = oflg; done(f.run());
  assert.equal(f.out.drain(), '\r\nPlayer is not in the game:  ' + (oflg <= 0 ? 'W' : 'Wolf') + '\r\n\r\nNo message sent.\r\n');
});

test('TELL does not filter token types and uses explicit raw logical interpretation', () => {
  const f = fixture('TELL N; text'); f.input.tokens[1].type = K.KINT;
  const oldLogical = f.io.logical; f.io.logical = word => word === 1n || oldLogical(word);
  f.players[2].alive = 1n; done(f.run()); assert.equal(f.players[2].msgflg, 1n);
});

test('TELL repeat rejection happens after radio enabling and DBITS clearing, before normal name lookup', () => {
  const f = fixture('TELL UNK N; text'); f.ctx.rptflg = -1n; f.ctx.shared.nomsg = 1n; done(f.run());
  assert.equal(f.out.drain(), '\r\nWake up, Captain, I just sent that message!\r\n');
  assert.equal(f.ctx.dbits, 0n); assert.equal(f.ctx.shared.nomsg, 0n); assert.deepEqual(f.calls, []);
});

test('TELL a repeated Romulan target replies before a following token triggers repeat rejection', () => {
  const f = fixture('TELL ROM N; text'); f.ctx.rptflg = -1n; f.speech(); done(f.run());
  assert.equal(f.players[1].msgflg, 1n); assert.equal(f.ctx.dispfr, 500n); assert.equal(f.ctx.dbits, 0n);
  assert.equal(f.local.sntrom, true); assert.equal(f.receive(1).text, 'Words\r\n');
  assert.equal(f.out.drain(), '\r\nWake up, Captain, I just sent that message!\r\n');
});

test('TELL Romulan replies restore accumulated human destinations and human message replaces DISPFR', () => {
  const f = fixture('TELL N ROM ROM; text'); f.speech(); done(f.run());
  assert.equal(f.players[1].msgflg, 2n); assert.equal(f.players[2].msgflg, 1n);
  assert.equal(f.receive(1).dispfr, 500n); assert.equal(f.receive(1).dispfr, 500n);
  assert.deepEqual(f.receive(2), { dispfr: 101n, dbits: 2n, text: ' text\r\n' });
  assert.deepEqual(f.calls.filter(c => c === 'romspk' || c.startsWith('iran') || c === 'explicit' || c === 'no-argument'),
    ['romspk', 'explicit', 'iran:4', 'romspk', 'explicit', 'iran:4', 'no-argument']);
});

test('TELL a Romulan-only reply suppresses no-message output and makes no human MAKMSG call', () => {
  const f = fixture('TELL ROM; ignored text'); f.speech(); done(f.run());
  assert.equal(f.out.drain(), ''); assert.equal(f.players[1].msgflg, 1n); assert.equal(f.ctx.dbits, 0n);
  assert.ok(!f.calls.includes('no-argument')); assert.equal(f.ctx.dispfr, 500n);
});

test('TELL dead Romulan uses required compiled literal bytes and does not bypass later no-message output', () => {
  const f = fixture('TELL ROM'); f.ctx.shared.rom = 0n; f.io.literalRomulan = () => 'Romulan   \0ignored'; done(f.run());
  assert.equal(f.out.drain(), '\r\nCommunications:  Captain, we cannot raise the Romulan   \r\n\r\nNo message sent.\r\n');
  assert.deepEqual(f.calls, []);
});

test('TELL relocation preserves draw order and searches horizontal outer / vertical inner from IRAN(10)-5', () => {
  const f = fixture('TELL ROM'); f.speech(); const draws: bigint[] = [];
  f.io.iran = n => { draws.push(n); return 1n; }; f.board.setdsp(6, 6, -1); f.board.setdsp(7, 6, 300);
  done(f.run()); assert.deepEqual(draws, [4n, 10n]);
  assert.deepEqual(f.ctx.shared.locr, { v: 8, h: 6 }); assert.equal(f.board.disp(50, 50), 0);
  assert.equal(f.board.disp(8, 6), 500); assert.equal(f.board.disp(10, 10), 101);
});

test('TELL relocation skips out-of-galaxy positions and does not clear its old square until a vacancy exists', () => {
  const f = fixture('TELL ROM'); f.speech(); Object.assign(f.players[1].ship, { v: 1, h: 1 });
  f.io.iran = () => 1n; f.board.setdsp(1, 1, 101); done(f.run());
  assert.deepEqual(f.ctx.shared.locr, { v: 2, h: 1 });
  const full = fixture('TELL ROM'); full.speech(); full.io.iran = () => 1n;
  for (let v = 6; v <= 20; v++) for (let h = 6; h <= 20; h++) full.board.setdsp(v, h, 300);
  done(full.run()); assert.deepEqual(full.ctx.shared.locr, { v: 50, h: 50 }); assert.equal(full.board.disp(50, 50), 500);
});

test('TELL autonomous speech skips damaged sender/input, silently filters targets and has no final CRLF', () => {
  const f = fixture(); f.ctx.player = 0n; f.ctx.who = 0; f.speech(7n); f.ctx.shared.nomsg = 1n; f.ctx.gagmsg = 7n;
  done(f.run()); assert.equal(f.local.rmspk, true); assert.equal(f.out.drain(), '');
  assert.equal(f.ctx.shared.nomsg, 1n); assert.equal(f.ctx.gagmsg, 5n);
  assert.deepEqual(f.receive(2), { dispfr: 500n, dbits: 2n, text: 'Words\r\n' });
  assert.ok(!f.calls.some(c => c.startsWith('iran')));
});

test('TELL autonomous speech with no eligible recipients returns silently without MAKMSG', () => {
  const f = fixture(); f.ctx.player = 0n; f.speech(6n); f.ctx.shared.nomsg = 2n;
  done(f.run()); assert.equal(f.ctx.dbits, 0n); assert.equal(f.out.drain(), '');
  assert.deepEqual(f.calls, ['romspk']); assert.equal(f.local.sntrom, false);
});

test('TELL honors NTOK rather than stale later tokens and exposes inconsistent reversed DO bounds', () => {
  const f = fixture('TELL N S; text'); f.input.ntok = 2; done(f.run()); assert.equal(f.out.drain(), '\r\n');
  assert.equal(f.receive(2).dbits, 2n);
  const invalid = fixture('TELL'); invalid.io.gtkn = function* () {
    invalid.input.tokens[0].type = K.KALF; invalid.input.ntok = 0;
  };
  assert.throws(() => invalid.run().next(), /reversed destination DO bounds/);
  assert.equal(invalid.ctx.dbits, 0n); assert.equal(invalid.out.drain(), '\r\nTo ship:  ');
});

test('TELL re-reads PLAYER after speech and filtering instead of caching its entry role', () => {
  const f = fixture(); f.ctx.player = 0n; f.speech(1n); const speech = f.io.romspk;
  f.io.romspk = function* (buffer) { yield* speech(buffer); f.ctx.player = -1n; };
  done(f.run()); assert.equal(f.ctx.dbits, 0n); assert.equal(f.players[1].msgflg, 0n); assert.equal(f.out.drain(), '');
});

test('TELL does not truncate destination bits outside KNPLAY and leaves MAKMSG memory dependency explicit', () => {
  for (const autonomous of [false, true]) {
    const f = fixture('TELL ALL; text'); f.ctx.gagmsg = 4096n;
    if (autonomous) { f.ctx.player = 0n; f.speech(4096n); }
    else f.groups[1] = { name: packAscii('ALL'), bits: 4096n };
    assert.throws(() => f.run().next(), /MAKMSG recipient bits address outside MSGFLG/);
    assert.equal(f.ctx.dbits, 4096n); assert.equal(f.ctx.gagmsg, 0n); assert.equal(f.out.drain(), '');
  }
});

test('TELL retains ROMSPK registers while MAKMSG is suspended, restoring human bits only after return', () => {
  const f = fixture('TELL N ROM; text'); f.speech(); const make = f.io.makmsg;
  f.io.makmsg = function* (buffer) { if (buffer) yield 'input'; yield* make(buffer); };
  const run = f.run(); assert.deepEqual(run.next(), { value: 'input', done: false });
  assert.equal(f.ctx.dbits, 1n); assert.equal(f.ctx.dispfr, 500n); assert.equal(f.local.sntrom, false); assert.equal(f.local.svdb, 2n);
  done(run); assert.equal(f.players[1].msgflg, 1n); assert.equal(f.players[2].msgflg, 1n);
});

test('TELL reenables a radio switched off through RADIO and dispatch charges no turn', () => {
  const f = fixture('RADIO OFF'); assert.equal(radio(f.ctx, f.input.tokens, f.out).next().done, true);
  assert.equal(f.ctx.shared.nomsg, 1n); f.out.drain();
  f.input.acceptLine('TELL N; text'); f.input.acquire(f.out);
  const ctx = { who: 1, player: -1n, ptime: 91n, shared: { players: f.players } };
  done(dispatchCommand(ctx, 26, { *getcmd() { assert.fail(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
    *finishTurn() { assert.fail(); }, movementContinuation() { assert.fail(); }, *invoke(call) {
      assert.equal(call.routine, 'tell'); yield* f.run();
    } }));
  assert.equal(f.ctx.shared.nomsg, 0n); assert.equal(ctx.ptime, 91n); assert.equal(f.players[1].ship.turns, 0n);
});
