import test from 'node:test';
import assert from 'node:assert/strict';
import { romulanSpeech, RomulanSpeechLocals } from '../src/game/romulan-speech.ts';
import type { RomulanSpeechServices } from '../src/game/romulan-speech.ts';
import { romulanText as T, constants as K } from '../src/generated/source-data.ts';
import { romulanTables, sourceFile } from '../tools/source.ts';
import { halfWords, packAscii, packSixbit, rightHalf, MAX_INTEGER } from '../src/compat/word36.ts';
import { DecwarRandom } from '../src/compat/random.ts';
import { messageText, makeMessage, getMessage, MessageQueue } from '../src/game/message-queue.ts';
import type { MessageQueueServices } from '../src/game/message-queue.ts';
import { messageBits, incrementMessageAlias } from '../src/game/message-memory.ts';
import { playerSlots } from '../src/game/player.ts';
import { outMessage } from '../src/game/out-message.ts';
import { HitQueue, emptyHit } from '../src/game/hit-queue.ts';
import { outHit } from '../src/game/out-hit.ts';
import { tell, TellLocals } from '../src/game/tell.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { CommandInput } from '../src/compat/command-input.ts';

function draws(script: [bigint, bigint][]) {
  const remaining = [...script], calls: bigint[] = [];
  return { calls, iran(n: bigint) {
    calls.push(n); const next = remaining.shift(); assert.ok(next, 'Unexpected IRAN');
    assert.equal(n, next[0]); assert.ok(next[1] >= 1n && next[1] <= n); return next[1];
  }, finish() { assert.equal(remaining.length, 0); } };
}
function speech(script: [bigint, bigint][] = [[4n, 2n], [5n, 2n], [3n, 2n], [5n, 5n], [5n, 5n]]) {
  const ctx = { player: -1n, who: 1, team: 1, dbits: 777n, dispfr: 777n }, local = new RomulanSpeechLocals();
  const buffer = Array<bigint>(17).fill(-1n), rng = draws(script);
  const io: RomulanSpeechServices = { iran: n => rng.iran(n), getlin() { assert.fail('Unexpected GETLIN'); },
    readBits: i => messageBits(i, () => { assert.fail('Unexpected BITS(0)'); }) };
  const run = () => { romulanSpeech(ctx, buffer, local, io); rng.finish(); return messageText(buffer); };
  return { ctx, local, buffer, rng, io, run };
}
function done(run: Generator<unknown, void, void>) { assert.equal(run.next().done, true); }

test('ROMSPK extracts 29 phrase strings and all 46 node rows with source locations and spelling', () => {
  assert.deepEqual(T, romulanTables()); const lines = sourceFile('WARMAC.MAC').split('\n');
  for (const table of [T.broadcast, T.single, T.adjectives, T.populations, T.objects, T.specialNodes, T.teams, T.generic, T.nodes])
    for (const item of table) assert.ok(lines[item.line - 1].includes('"' + item.text + '"'));
  assert.equal(T.single[1].text, 'You will witness my vengence, ');
  assert.deepEqual(T.masks, [0o777777, 0o777, 0o777000]);
});

test('ROMSPK single speech preserves typo, spacing, singular object and source draw schedule', () => {
  const f = speech(); assert.equal(f.run(), 'You will witness my vengence, worthless human parasite!');
  assert.equal(f.ctx.dbits, 1n); assert.equal(f.ctx.dispfr, 500n); assert.equal(f.local.tmp, -1n);
  assert.deepEqual(f.rng.calls, [4n, 5n, 3n, 5n, 5n]);
});

test('ROMSPK uses an assembly zero test for PLAYER, so positive one still takes the single-player path', () => {
  const f = speech(); f.ctx.player = 1n; f.ctx.who = 10; f.ctx.team = 2;
  assert.equal(f.run(), 'You will witness my vengence, worthless klingon parasite!'); assert.equal(f.ctx.dbits, 512n);
});

test('ROMSPK writes only generated seven-bit bytes, retaining bit zero and unused buffer tail', () => {
  const f = speech(); const text = f.run(); assert.equal(f.local.byte, text.length + 1);
  const allBytes = f.buffer.flatMap(word => Array.from({ length: 5 }, (_, i) => Number((word >> BigInt(29 - i * 7)) & 127n)));
  assert.deepEqual(allBytes.slice(0, text.length), [...text].map(c => c.charCodeAt(0)));
  assert.equal(allBytes[text.length], 0); assert.ok(allBytes.slice(text.length + 1).every(b => b === 127));
  assert.ok(f.buffer.every(word => (word & 1n) === 1n));
});

for (const population of [1, 2, 3]) test(`ROMSPK broadcast population ${population} retains the original mask and plural text`, () => {
  const f = speech([[3n, BigInt(population)], [4n, 1n], [5n, 1n], [5n, 3n]]); f.ctx.player = 0n;
  assert.equal(f.run(), 'Death to mindless ' + ['sub-Romulan', 'human', 'klingon'][population - 1] + ' toads!');
  assert.equal(f.ctx.dbits, BigInt(T.masks[population - 1])); assert.equal(f.local.tmp, BigInt(population - 1));
});

test('ROMSPK all lead-in/adjective/generic/object choices follow their own tables without extra draws', () => {
  for (let choice = 1; choice <= 5; choice++) {
    const lead = (choice - 1) % 4 + 1, generic = (choice - 1) % 4 + 1;
    const f = speech([[4n, BigInt(lead)], [5n, BigInt(choice)], [3n, 3n], [5n, BigInt(generic)], [5n, BigInt(choice)]]);
    assert.equal(f.run(), T.single[lead - 1].text + T.adjectives[choice - 1].text + T.generic[generic - 1].text + T.objects[choice - 1].text + '!');
  }
});

test('ROMSPK every known node matches GETLIN right half exactly and avoids generic IRAN(5)', () => {
  for (const node of T.nodes) {
    const f = speech([[4n, 3n], [5n, 4n], [3n, 1n], [5n, 4n]]);
    f.io.getlin = () => halfWords(0o777777n, packSixbit(node.node) >> 18n);
    assert.equal(f.run(), 'May you be attacked by a slime-devil, idiotic ' + node.text + 'worm!');
    assert.deepEqual(f.rng.calls, [4n, 5n, 3n, 5n]);
  }
});

test('ROMSPK unknown CLx, CSx and Qxx nodes fall through the literal ANDI masks to random quips', () => {
  for (const node of ['CLX', 'CSX', 'QXX', 'ZZZ']) {
    const f = speech([[4n, 4n], [5n, 5n], [3n, 1n], [5n, 2n], [5n, 1n]]);
    f.io.getlin = () => packSixbit(node) >> 18n;
    assert.equal(f.run(), 'I will reduce you to quarks, stupid vertebrate mutant!');
  }
});

test('ROMSPK invalid team fails only after earlier buffer writes and without consuming the object draw', () => {
  const f = speech([[4n, 1n], [5n, 1n], [3n, 2n], [5n, 5n]]); f.ctx.team = 0;
  assert.throws(f.run, /table address/); assert.equal(f.local.byte, 36);
  assert.equal(f.ctx.dispfr, 500n); assert.equal(f.ctx.dbits, 1n); f.rng.finish();
});

test('ROMSPK short supplied destination memory fails where the byte pointer leaves it, retaining earlier bytes', () => {
  const f = speech([[4n, 2n]]); f.buffer.length = 1;
  assert.throws(f.run, /destination pointer/); assert.equal(f.local.byte, 5);
  assert.equal(messageText(f.buffer), 'You w'); assert.equal(f.ctx.dispfr, 500n);
});

test('ROMSPK fixed source RNG sequence remains deterministic across repeated calls', () => {
  const f = speech(), rng = new DecwarRandom(1n); f.io.iran = n => rng.iran(n);
  f.io.getlin = () => packSixbit('ANA') >> 18n;
  const results: string[] = [];
  for (let i = 0; i < 3; i++) { romulanSpeech(f.ctx, f.buffer, f.local, f.io); results.push(messageText(f.buffer)); }
  assert.deepEqual(results, [
    'You will witness my vengence, idiotic Anahiem parasite!',
    'I will reduce you to quarks, stupid endo-skeletal worm!',
    'May you be attacked by a slime-devil, idiotic endo-skeletal cretin!',
  ]);
  // Source recurrence over [4,5,3,5], then twice [4,5,3,5,5].
  assert.equal(rng.seed, 24492312449n);
});

function composition(line = 'TELL ROM') {
  const players = playerSlots(); for (const player of players.slice(1)) player.alive = -1n;
  const ctx = { player: -1n, who: 1, team: 1, oflg: 1, rptflg: 0n, gagmsg: 0n, dbits: 0n, dispfr: 0n,
    groups: Array.from({ length: 8 }, () => ({ name: 0n, bits: 0n })),
    shared: { players, rom: -1n, nomsg: 0n, locr: { v: 50, h: 50 } } };
  const input = new CommandInput(), out = new TerminalOutput(), board = new PackedBoard(), queue = new MessageQueue();
  const local = new TellLocals(), speechLocal = new RomulanSpeechLocals(); input.acceptLine(line); input.acquire(out);
  // Explicit compiled DATA-word fixture; production binds the actual NAMES word.
  let lastNameWord = packAscii(' W   ');
  const readBits = (index: number) => messageBits(index, () => lastNameWord);
  const queueIo: MessageQueueServices<never> = { *lock() { return true; }, unlo() {},
    incrementCounterOutsidePlayers: index => incrementMessageAlias(players, index) };
  const send = (script: [bigint, bigint][]) => {
    const rng = draws(script);
    done(tell(ctx, input, local, board, out, {
      logical: word => word < 0n, *gtkn() { assert.fail(); }, literalRomulan() { assert.fail(); }, iran: n => rng.iran(n),
      *romspk(buffer) { romulanSpeech(ctx, buffer, speechLocal, {
        iran: n => rng.iran(n), readBits, getlin: () => packSixbit('SJO') >> 18n,
      }); },
      *makmsg(buffer) { assert.ok(buffer); yield* makeMessage(queue, players, ctx, messageText(buffer), out, queueIo); },
    })); rng.finish();
  };
  const receive = (who: number, gagmsg = 0n, oflg = 1) => {
    const r = { who, gagmsg, oflg, dispfr: 0n, dbits: 0n }, buffer = Array<bigint>(16).fill(0n);
    done(outMessage(r, players, buffer, out,
      function* (who, buffer) { yield* getMessage(queue, players, r, who, buffer, queueIo); }, readBits));
    return out.drain();
  };
  return { ctx, players, queue, queueIo, send, receive, out, readBits, setLastNameWord(word: bigint) { lastNameWord = word; } };
}

test('TELL → ROMSPK → MAKMSG → GETMSG → OUTMSG produces a real single-player response', () => {
  const f = composition(); f.send([[4n, 1n], [5n, 1n], [3n, 1n], [5n, 3n], [4n, 2n]]);
  assert.equal(f.out.drain(), ''); assert.equal(f.players[1].msgflg, 1n);
  assert.equal(f.receive(1), '\r\nMessage from Romulan to  L\r\nYou have aroused my wrath, mindless Silicon Gultch toad!\r\n\r\n');
  assert.equal(f.queue.header, -1n);
});

test('OUTMSG BITS(0) uses the live preceding NAMES word, so its padding bits can gag Romulan messages', () => {
  const f = composition(); assert.equal(f.readBits(0) & 64n, 64n);
  const script: [bigint, bigint][] = [[4n, 1n], [5n, 1n], [3n, 1n], [5n, 3n], [4n, 2n]];
  f.send(script); assert.equal(f.receive(1, 64n), ''); assert.equal(f.queue.header, -1n);
  f.send(script); f.setLastNameWord(packAscii(' W')); // Different explicit memory fixture, not normalized by adapter.
  assert.equal(f.readBits(0) & 64n, 0n); assert.match(f.receive(1, 64n, -1), /Message from \?\? to  L/);
});

for (const population of [1, 2, 3]) test(`Autonomous ROMSPK population ${population} reaches actual MSGFLG/HITFLG aliases`, () => {
  const f = composition(); f.ctx.player = 0n;
  f.send([[3n, BigInt(population)], [4n, 1n], [5n, 1n], [5n, 1n]]);
  const mask = BigInt(T.masks[population - 1]);
  for (let i = 1; i <= 10; i++) {
    assert.equal(f.players[i].msgflg, (mask >> BigInt(i - 1)) & 1n);
    assert.equal(f.players[i].hitflg, (mask >> BigInt(i + 9)) & 1n);
  }
  assert.equal(rightHalf(f.queue.links[0]), mask);
  const who = population === 3 ? 10 : 1;
  const expectedTo = population === 1 ? '' : population === 2 ? ' L N S V Y C D H J' : ' W';
  assert.equal(f.receive(who), '\r\nMessage from Romulan to ' + expectedTo + '\r\nDeath to mindless ' +
    ['sub-Romulan', 'human', 'klingon'][population - 1] + ' mutants!\r\n\r\n');
  // Eighteen-bit all-ones metadata is converted to zero by GETMSG.
  if (population !== 2) assert.notEqual(f.queue.header, -1n);
});

test('MAKMSG high recipient bits write counters after publication and wrap aliased hit counts as 36-bit words', () => {
  const f = composition(), r = { dispfr: 500n, dbits: 1n | (1n << 10n) }; f.players[1].hitflg = MAX_INTEGER;
  const prior = f.queueIo.incrementCounterOutsidePlayers!;
  f.queueIo.incrementCounterOutsidePlayers = index => { assert.notEqual(f.queue.header, -1n); assert.equal(f.players[1].msgflg, 1n); prior(index); };
  done(makeMessage(f.queue, f.players, r, 'AB', f.out, f.queueIo));
  assert.equal(f.players[1].hitflg, -34359738368n); assert.equal(r.dbits, 0n);
});

test('Broadcast high bits keep the message linked after all ten readers, while spurious hit counts drain without events', () => {
  const f = composition(); f.ctx.player = 0n; f.send([[3n, 1n], [4n, 1n], [5n, 1n], [5n, 1n]]);
  for (let i = 1; i <= 10; i++) f.receive(i);
  assert.notEqual(f.queue.header, -1n); assert.equal(rightHalf(f.queue.links[0]), 0o776000n);
  const hits = new HitQueue(), registers = { ...emptyHit(), dbits: 0n };
  for (let i = 1; i <= 8; i++) {
    assert.equal(f.players[i].hitflg, 1n);
    done(outHit({ who: i, team: 1, oflg: 1, ocflg: K.KABS, nomsg: 0n, ship: f.players[i].ship }, registers,
      f.players, f.out, function* (who) { hits.get(who, registers, f.players); }));
    assert.equal(f.players[i].hitflg, 0n);
  }
  assert.equal(f.out.drain(), ''); assert.equal(hits.serial, 0n);
});

test('MAKMSG short messages cancel before incrementing even aliased destination counters', () => {
  const f = composition(), r = { dispfr: 500n, dbits: 0o777777n };
  done(makeMessage(f.queue, f.players, r, 'A', f.out, f.queueIo));
  assert.equal(f.queue.header, -1n); assert.equal(r.dbits, 0n);
  assert.ok(f.players.slice(1).every(p => p.msgflg === 0n && p.hitflg === 0n));
  assert.equal(f.out.drain(), 'No message sent\r\n');
});

test('MAKMSG signed destination word follows all 36 logical-shift iterations while queue keeps only 18 bits', () => {
  const f = composition(), r = { dispfr: 500n, dbits: -1n }, writes: number[] = [];
  f.queueIo.incrementCounterOutsidePlayers = index => { writes.push(index); };
  done(makeMessage(f.queue, f.players, r, 'AB', f.out, f.queueIo));
  assert.deepEqual(writes, Array.from({ length: 26 }, (_, i) => i + 11));
  assert.equal(rightHalf(f.queue.links[0]), 0o777777n); assert.equal(r.dbits, 0n);
});

test('Message memory adapters require surrounding storage beyond their source-backed component views', () => {
  const f = composition(); assert.throws(() => f.readBits(11), /uninitialized/);
  assert.equal(messageBits(11, () => 0n, i => BigInt(i * 3)), 33n);
  assert.throws(() => incrementMessageAlias(f.players, 21), /HISEG memory/);
});

test('OUTMSG requires actual memory for BITS(0) and uninitialized BITS(11), after retrieving the message', () => {
  for (const sender of [500n, 511n]) {
    const f = composition(), r = { who: 1, oflg: 1, gagmsg: 0n, dispfr: sender, dbits: 1n };
    done(makeMessage(f.queue, f.players, r, 'AB', f.out, f.queueIo));
    const buffer = Array<bigint>(16).fill(0n);
    assert.throws(() => outMessage(r, f.players, buffer, f.out,
      function* (who, buffer) { yield* getMessage(f.queue, f.players, r, who, buffer, f.queueIo); }).next(), /actual BITS/);
    assert.equal(f.players[1].msgflg, 0n); assert.equal(f.queue.header, -1n); assert.equal(r.dispfr, sender);
    assert.equal(f.out.drain(), '');
  }
});
