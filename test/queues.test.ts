import test from 'node:test';
import assert from 'node:assert/strict';
import { LinkedQueue, reserve, publish, search, remove } from '../src/compat/queue.ts';
import type { QueueServices } from '../src/compat/queue.ts';
import { halfWords, signed36, rightHalf, leftHalf } from '../src/compat/word36.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { MessageQueue, makeMessage, makeMessageFromInput, getMessage, messageText } from '../src/game/message-queue.ts';
import type { MessageInputServices } from '../src/game/message-queue.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { outMessage } from '../src/game/out-message.ts';
import { HitQueue, emptyHit, packHit, unpackHit } from '../src/game/hit-queue.ts';
import type { HitRegisters } from '../src/game/hit-queue.ts';

const hw = (left: bigint, right: bigint) => signed36(halfWords(left, right));
function done<T>(run: Generator<never, T, void>): T {
  const r = run.next(); assert.equal(r.done, true); return r.value;
}
function fixture() {
  const queue = new MessageQueue(), flags = Array.from({ length: 11 }, () => ({ msgflg: 0n, hitflg: 0n }));
  const registers = { dispfr: 101n, dbits: 0n }, out = new TerminalOutput(), calls: string[] = [];
  const io: QueueServices<never> = { *lock(routine) { calls.push(routine); return true; }, unlo() { calls.push('unlo'); } };
  function send(text: string, bits = 1n, from = 101n) {
    registers.dispfr = from; registers.dbits = bits;
    done(makeMessage(queue, flags, registers, text, out, io));
  }
  return { queue, flags, registers, out, calls, io, send };
}

test('message links retain packed header, reserve first free, publish order and last-recipient unlink', () => {
  const q = new LinkedQueue(3);
  assert.equal(q.header, -1n);
  const a = q.reserve(), b = q.reserve();
  assert.equal(a, 0); assert.equal(b, 1); assert.equal(q.header, -1n);
  assert.equal(q.links[0], -1n); assert.equal(q.search(1n), undefined);
  q.publish(b, 3n); q.publish(a, 2n);
  assert.equal(q.header, hw(1n, 0n)); assert.deepEqual(q.links, [hw(-1n, 2n), hw(0n, 3n), 0n]);
  q.remove(q.search(1n)!, 1n); assert.equal(q.links[1], hw(0n, 2n));
  q.remove(q.search(2n)!, 2n); assert.equal(q.header, hw(0n, 0n));
  q.remove(q.search(2n)!, 2n); assert.equal(q.header, -1n); assert.deepEqual(q.links, [0n, 0n, 0n]);
});

test('queue saturation removes lowest recipient of oldest entry from every linked entry', () => {
  const q = new LinkedQueue(3);
  for (const bits of [2n, 3n, 6n]) q.publish(q.reserve(), bits);
  assert.equal(q.reserve(), 0);
  assert.equal(q.header, hw(1n, 2n));
  assert.deepEqual(q.links, [-1n, hw(2n, 1n), hw(-1n, 4n)]);
  q.publish(0, 8n); assert.equal(q.header, hw(1n, 0n));
});

test('queue lock failure returns on reserve/search but retries on publication/removal', () => {
  const q = new LinkedQueue(2), calls: string[] = [], answers = [false, false, false, true, false, true];
  const io: QueueServices<never> = { *lock(r) { calls.push(r); return answers.shift()!; }, unlo() { calls.push('unlo'); } };
  assert.equal(done(reserve(q, io)), undefined); assert.equal(done(search(q, 1n, io)), undefined);
  const slot = q.reserve(); done(publish(q, slot, 1n, io)); done(remove(q, q.search(1n)!, 1n, io));
  assert.deepEqual(calls, ['RSRV.', 'SRCH.', 'UPDT.', 'UPDT.', 'unlo', 'REMV.', 'REMV.', 'unlo']);
  assert.equal(q.header, -1n);
});

test('MAKMSG enforces the actual two-character minimum and 75-character maximum while scanning to EOL', () => {
  const f = fixture(), buffer = Array<bigint>(16).fill(0n);
  f.send('A'); assert.equal(f.out.drain(), 'No message sent\r\n'); assert.equal(f.queue.header, -1n);
  assert.equal(f.flags[1].msgflg, 0n); assert.equal(f.registers.dbits, 0n); assert.equal(f.registers.dispfr, 101n);
  f.send('AB'); done(getMessage(f.queue, f.flags, f.registers, 1, buffer, f.io));
  assert.equal(messageText(buffer), 'AB\r\n');
  f.send('X'.repeat(75) + 'Y'.repeat(40));
  done(getMessage(f.queue, f.flags, f.registers, 1, buffer, f.io));
  assert.equal(messageText(buffer), 'X'.repeat(75) + '\r\n');
  f.send('AB;CD/EF\rGH\nIGNORED'); done(getMessage(f.queue, f.flags, f.registers, 1, buffer, f.io));
  assert.equal(messageText(buffer), 'AB;CD/EF\rGH\r\n'); // ; / CR are not message EOL.
});

test('MAKMSG zero-recipient return leaves metadata and takes no lock', () => {
  const f = fixture(); f.registers.dispfr = 210n;
  done(makeMessage(f.queue, f.flags, f.registers, 'AB', f.out, f.io));
  assert.deepEqual(f.calls, []); assert.equal(f.registers.dispfr, 210n);
});

test('no-argument MAKMSG takes text after the first semicolon in the entire raw line', () => {
  const f = fixture(), input = new CommandInput(), buffer = Array<bigint>(16).fill(0n);
  input.acceptLine('TELL WOLF ; Hello; again / TIME'); input.acquire(f.out);
  const ctx = { dispfr: 101n, dbits: 1n, ccflg: 0n };
  const io: MessageInputServices<never> = { ...f.io, *inli() { return assert.fail('Unexpected INLI'); },
    *cancelUnreserved() { assert.fail('Unexpected cancellation'); } };
  done(makeMessageFromInput(f.queue, f.flags, ctx, input, f.out, io));
  done(getMessage(f.queue, f.flags, ctx, 1, buffer, io));
  assert.equal(messageText(buffer), ' Hello; again / TIME\r\n'); assert.equal(f.out.drain(), '');
});

test('no-argument MAKMSG prompts through INLI without GTKN and discards any new command tail', () => {
  const f = fixture(), input = new CommandInput(), buffer = Array<bigint>(16).fill(0n);
  input.acceptLine('TELL WOLF / TIME'); input.acquire(f.out);
  const ctx = { dispfr: 101n, dbits: 1n, ccflg: 0n };
  const io: MessageInputServices<'line'> = { ...f.io,
    *inli() { yield 'line'; return { text: 'Hello / TIME', repeated: false }; },
    *cancelUnreserved() { assert.fail('Unexpected cancellation'); } };
  const run = makeMessageFromInput(f.queue, f.flags, ctx, input, f.out, io);
  assert.equal(run.next().value, 'line'); assert.equal(f.out.drain(), 'Msg: '); assert.deepEqual(f.calls, []);
  assert.equal(run.next().done, true); assert.equal(input.available, false);
  assert.equal(input.rawLine, 'Hello / TIME'); assert.equal(input.tokens[0].text, 'TELL');
  done(getMessage(f.queue, f.flags, ctx, 1, buffer, f.io));
  assert.equal(messageText(buffer), 'Hello / TIME\r\n');
});

test('MAKMSG Ctrl-C before reservation requires the stale-register removal adapter', () => {
  const f = fixture(), input = new CommandInput(); input.acceptLine('TELL WOLF'); input.acquire(f.out);
  const ctx = { dispfr: 101n, dbits: 1n, ccflg: 0n }; let cancelled = false;
  const io: MessageInputServices<'line'> = { ...f.io,
    *inli() { yield 'line'; return { text: '', repeated: false }; },
    *cancelUnreserved() { assert.equal(ctx.dbits, 1n); assert.deepEqual(f.calls, []); cancelled = true; } };
  const run = makeMessageFromInput(f.queue, f.flags, ctx, input, f.out, io);
  assert.equal(run.next().value, 'line'); ctx.ccflg = -1n;
  assert.equal(run.next().done, true); assert.equal(cancelled, true); assert.equal(ctx.dbits, 0n);
  assert.equal(f.out.drain(), 'Msg: No message sent\r\n'); assert.equal(f.queue.header, -1n);
});

test('GETMSG returns original recipient header to each receiver, copies all sixteen words and clears slots', () => {
  const f = fixture(); f.queue.data[0].fill(-1n); f.send('AB', 3n, -1n);
  const buffer = Array<bigint>(16).fill(123n);
  done(getMessage(f.queue, f.flags, f.registers, 1, buffer, f.io));
  assert.equal(f.registers.dispfr, 0n); assert.equal(f.registers.dbits, 3n);
  assert.equal(buffer[15], -1n); assert.equal(rightHalf(f.queue.links[0]), 2n);
  done(getMessage(f.queue, f.flags, f.registers, 2, buffer, f.io));
  assert.equal(f.registers.dbits, 3n); assert.equal(f.queue.header, -1n);
  assert.equal(f.flags[1].msgflg, 0n); assert.equal(f.flags[2].msgflg, 0n);
  const snapshot = [...buffer];
  done(getMessage(f.queue, f.flags, f.registers, 2, buffer, f.io));
  assert.deepEqual(buffer, snapshot); assert.equal(f.flags[2].msgflg, 0n);
  assert.deepEqual(f.registers, { dispfr: 0n, dbits: 0n });
});

test('GETMSG search failure resets stale count without changing caller buffer or pending entry', () => {
  const f = fixture(); f.send('AB'); const buffer = Array<bigint>(16).fill(99n);
  const io: QueueServices<never> = { ...f.io, *lock() { return false; } };
  done(getMessage(f.queue, f.flags, f.registers, 1, buffer, io));
  assert.equal(f.flags[1].msgflg, 0n); assert.ok(f.queue.search(1n)); assert.deepEqual(buffer, Array(16).fill(99n));
});

test('OUTMSG prints source headers and recipient symbols, adds its own CRLF and retains OMLOCL', () => {
  const f = fixture(), buffer = Array<bigint>(16).fill(0n);
  const ctx = { who: 1, oflg: 1, gagmsg: 0n, dispfr: 0n, dbits: 0n };
  f.send('Hello', 3n, 210n);
  const receive = (who: number, b: bigint[]) => getMessage(f.queue, f.flags, ctx, who, b, f.io);
  done(outMessage(ctx, f.flags, buffer, f.out, receive));
  assert.equal(f.out.drain(), '\r\nMessage from Wolf to  L N\r\nHello\r\n\r\n'); // MSG mess02 plus leading space in NAMES(:,3).
  assert.equal(messageText(buffer), 'Hello\r\n'); assert.equal(ctx.dispfr, 0n); assert.equal(ctx.dbits, 0n);
});

test('OUTMSG gag drains a message silently; system messages bypass gag and receiver radio flags', () => {
  const f = fixture(), buffer = Array<bigint>(16).fill(0n);
  const ctx = { who: 1, oflg: 0, gagmsg: 512n, dispfr: 0n, dbits: 0n, nomsg: 1n };
  f.send('Gagged', 1n, 210n); f.send('System', 1n, 0n);
  done(outMessage(ctx, f.flags, buffer, f.out, (who, b) => getMessage(f.queue, f.flags, ctx, who, b, f.io)));
  assert.equal(f.out.drain(), 'System\r\n\r\n'); assert.equal(f.flags[1].msgflg, 0n);
});

test('message eviction retains stale MSGFLG; OUTMSG miss prints its previous buffer once', () => {
  const f = fixture(), buffer = Array<bigint>(16).fill(0n);
  const ctx = { who: 1, oflg: 0, gagmsg: 0n, dispfr: 0n, dbits: 0n };
  const receive = (who: number, b: bigint[]) => getMessage(f.queue, f.flags, ctx, who, b, f.io);
  f.send('Previous', 1n, 0n); done(outMessage(ctx, f.flags, buffer, f.out, receive)); f.out.drain();
  f.send('Oldest', 1n);
  for (let i = 0; i < 31; i++) f.send('Others', 3n);
  f.send('Newest', 2n);
  assert.equal(f.flags[1].msgflg, 32n); assert.equal(f.queue.search(1n), undefined);
  assert.equal(f.flags[2].msgflg, 32n);
  done(outMessage(ctx, f.flags, buffer, f.out, receive));
  assert.equal(f.out.drain(), 'Previous\r\n\r\n'); assert.equal(f.flags[1].msgflg, 0n);
});

test('SETQM clears links but retains old message payload words', () => {
  const f = fixture(); f.send('Retained'); const data = structuredClone(f.queue.data);
  f.queue.initialize(); assert.equal(f.queue.header, -1n); assert.deepEqual(f.queue.data, data);
  assert.equal(f.flags[1].msgflg, 1n); // Queue initializer does not clear COMMON counters.
});

test('hit layout truncates field widths, retains unused bits, maps nonpositive shields and defensive DISP values', () => {
  const info = { ...emptyHit(), dispfr: -1n, dispto: 262145n, ihita: -1n, critdm: 262146n,
    iwhat: 17n, critdv: 18n, vfrom: 129n, hfrom: 130n, vto: 131n, hto: 132n,
    klflg: 6n, shcnfr: 2n, shcnto: -1n, shstfr: 1025n, shstto: 1026n, shjump: 3n };
  const words = packHit(info, [0n, 0n, -1n, -1n]);
  assert.equal(words[0], hw(-1n, 1n)); assert.equal(words[1], hw(-1n, 2n));
  // Independent masks from the four-word schema in WARMAC:3321-3326.
  assert.equal(words[2], (1n << 32n) | (2n << 28n) | (1n << 21n) | (2n << 14n) | (3n << 7n) | 4n);
  assert.equal(words[3], signed36((2n << 34n) | (1n << 22n) | (2n << 12n) | (1n << 11n) | 2047n));
  assert.deepEqual(unpackHit(words), { ...info, dispfr: 0n, dispto: 1n, ihita: 262143n, critdm: 2n,
    iwhat: 1n, critdv: 2n, vfrom: 1n, hfrom: 2n, vto: 3n, hto: 4n, klflg: 2n,
    shcnfr: -1n, shcnto: -1n, shstfr: 1n, shstto: 2n, shjump: 1n });
});

test('hit storage belongs to sender, retrieval scans physical indices and DBITS shrinks per recipient', () => {
  const f = fixture(), q = new HitQueue();
  const reg: HitRegisters = { ...emptyHit(), iwhat: 12n, ihita: 20n, dbits: 3n };
  q.make(2, reg, f.flags, 0n, f.out);
  Object.assign(reg, { iwhat: 12n, ihita: 10n, dbits: 3n }); q.make(1, reg, f.flags, 0n, f.out);
  assert.equal(q.links[40], hw(1n, 3n)); assert.equal(q.links[0], hw(2n, 3n));
  assert.deepEqual(reg, { ...emptyHit(), dbits: 0n });
  q.get(1, reg, f.flags); assert.equal(reg.ihita, 10n); assert.equal(reg.dbits, 3n);
  q.get(2, reg, f.flags); assert.equal(reg.ihita, 10n); assert.equal(reg.dbits, 2n);
  q.get(1, reg, f.flags); assert.equal(reg.ihita, 20n);
});

test('hit overflow replaces oldest of sender slots without reconciling counts and does not read chronologically', () => {
  const f = fixture(), q = new HitQueue(), reg: HitRegisters = { ...emptyHit(), dbits: 0n };
  for (let i = 1; i <= 41; i++) { Object.assign(reg, { iwhat: 12n, ihita: BigInt(i), dbits: 1n }); q.make(1, reg, f.flags, 0n, f.out); }
  assert.equal(f.flags[1].hitflg, 41n); q.get(1, reg, f.flags); assert.equal(reg.ihita, 41n);
  for (let i = 2; i <= 40; i++) { q.get(1, reg, f.flags); assert.equal(reg.ihita, BigInt(i)); }
  assert.equal(f.flags[1].hitflg, 1n); reg.dbits = 99n;
  q.get(1, reg, f.flags); assert.deepEqual(reg, { ...emptyHit(), dbits: 99n });
  q.get(1, reg, f.flags); assert.equal(f.flags[1].hitflg, -1n); // Unlike GETMSG, no reset to zero.
});

test('hit serial is stored in eighteen bits; SETQH retains serial and payloads', () => {
  const f = fixture(), q = new HitQueue(); q.serial = 262143n;
  const reg = { ...emptyHit(), iwhat: 12n, dbits: 1n }; q.make(1, reg, f.flags, 0n, f.out);
  assert.equal(q.serial, 262144n); assert.equal(leftHalf(q.links[0]), 0n);
  const data = structuredClone(q.data); q.initialize();
  assert.equal(q.serial, 262144n); assert.deepEqual(q.data, data); assert.equal(q.links.every(w => w === 0n), true);
});

test('MAKHIT no-recipient path clears fields; invalid IWHAT diagnostic requires password', () => {
  const f = fixture(), q = new HitQueue();
  const reg = { ...emptyHit(), iwhat: 20n, dbits: 0n }; q.make(1, reg, f.flags, -2n, f.out);
  assert.equal(q.serial, 0n); assert.equal(reg.iwhat, 0n); assert.equal(f.out.drain(), '');
  Object.assign(reg, { iwhat: 20n, dbits: 1n }); q.make(1, reg, f.flags, -2n, f.out);
  assert.equal(f.out.drain(), '\r\n%Illegal IWHAT code in MAKHIT: 20\r\n');
  q.get(1, reg, f.flags); assert.equal(reg.iwhat, 4n);
});
