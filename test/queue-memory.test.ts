import test from 'node:test';
import assert from 'node:assert/strict';
import { queueLayout } from '../src/generated/queue-layout.ts';
import { queueLayout as extractLayout } from '../tools/queue-layout.ts';
import { AddressSpace, CommonBlock, wordArray } from '../src/compat/memory.ts';
import { highState, lowState } from '../src/game/common-state.ts';
import { queueState } from '../src/game/queue-state.ts';
import { makeMessage, getMessage, messageText } from '../src/game/message-queue.ts';
import { emptyHit, packHit } from '../src/game/hit-queue.ts';
import { outMessage } from '../src/game/out-message.ts';
import { outHit } from '../src/game/out-hit.ts';
import { halfWords, signed36, MAX_INTEGER, MIN_INTEGER, rightHalf } from '../src/compat/word36.ts';
import type { QueueServices } from '../src/compat/queue.ts';
import { gripeDiagnostic } from '../src/game/gripe-diagnostic.ts';
import { SavedShip, freeShip } from '../src/game/lifecycle.ts';

const hw = (a: bigint, b: bigint) => signed36(halfWords(a, b));
const io: QueueServices<never> = { *lock() { return true; }, unlo() {} };
function done<T>(g: Generator<never, T, void>): T { const r = g.next(); assert.equal(r.done, true); return r.value; }
function fixture(shared?: { words: bigint[]; highWords: bigint[] }, base = BigInt(queueLayout.address)) {
  const words = shared?.words ?? Array<bigint>(queueLayout.words).fill(0n);
  const highWords = shared?.highWords ?? Array<bigint>(2922).fill(0n);
  const space = new AddressSpace(); space.map(base, words); space.map(0o400010n, highWords);
  space.map(0o140n, Array<bigint>(128).fill(0n)); space.map(0o2662n, Array<bigint>(16).fill(0n));
  const high = new CommonBlock(space, 'hiseg'), low = new CommonBlock(space, 'lowseg');
  const h = highState(high, { logical: n => n !== 0n, trueWord: -1n, falseWord: 0n });
  const l = lowState(low), q = queueState(space, h.bits, base), out = l.output;
  const buffer = wordArray(space, 0o2662n, 16); // OMLOCL, OUTMSG.FOR:29 / DECWAR.MAP.
  function send(text: string, bits = 1n, from = 0n) {
    l.hit.dbits = bits; l.hit.dispfr = from;
    done(makeMessage(q.message, h.players, l.hit, text, out, io));
  }
  return { words, highWords, space, high, low, h, l, q, out, buffer, send };
}
function initialized(shared?: ReturnType<typeof fixture>) {
  const f = fixture(shared);
  if (!shared) { f.q.hit.initialize(); f.q.message.initialize(); for (let i = 1; i <= 10; i++) f.high.write('bits', 1n << BigInt(i - 1), i); }
  return f;
}

test('queue region derives decimal constants, octal BLOCKs and linked base from supplied source', () => {
  assert.deepEqual(queueLayout, extractLayout());
  assert.equal(queueLayout.address, 0o447326); assert.equal(queueLayout.mapLine, 697);
  assert.deepEqual(Object.values(queueLayout.fields).map(f => f.offset), [0, 1, 11, 12, 13, 413, 2013, 2014, 2046]);
  assert.equal(queueLayout.words, 2590); assert.equal(queueLayout.constants.knhit, 400);
});

test('constructing either queue preserves every supplied word including serial, headers and payloads', () => {
  const words = Array<bigint>(2590).fill(77n), f = fixture({ words, highWords: Array<bigint>(2922).fill(99n) });
  assert.equal(f.q.hit.serial, 77n); assert.equal(f.q.message.header, 77n);
  assert.equal(f.q.hit.data[399][3], 77n); assert.equal(f.q.message.data[31][16], 77n);
  assert.ok(words.every(n => n === 77n)); assert.ok(f.highWords.every(n => n === 99n));
});

test('SETQH and SETQM clear only the two headers and link lists', () => {
  const words = Array<bigint>(2590).fill(77n), f = fixture({ words, highWords: Array<bigint>(2922).fill(0n) });
  f.q.hit.initialize(); f.q.message.initialize();
  for (let i = 0; i < words.length; i++) assert.equal(words[i],
    i === 12 || i === 2013 ? -1n : i >= 13 && i < 413 || i >= 2014 && i < 2046 ? 0n : 77n, 'offset ' + i);
});

test('queue header, serial and payload writes are shared across jobs while LOWSEG remains private', () => {
  const a = initialized(), b = initialized(a);
  a.q.hit.serial = 37n; a.q.hit.links[40] = hw(9n, 2n); a.q.hit.data[40][3] = -3n;
  a.q.message.header = hw(3n, 4n); a.q.message.data[31][16] = 59n; a.l.hit.ihita = 999n;
  assert.equal(b.q.hit.serial, 37n); assert.equal(b.q.hit.links[40], hw(9n, 2n)); assert.equal(b.q.hit.data[40][3], -3n);
  assert.equal(b.q.message.header, hw(3n, 4n)); assert.equal(b.q.message.data[31][16], 59n); assert.equal(b.l.hit.ihita, 0n);
});

test('queue views preserve header underflow and link/payload adjacency', () => {
  const f = initialized();
  f.q.hit.links[-2] = 19n; assert.equal(f.q.hit.serial, 19n);
  f.q.hit.links[-1] = 25n; assert.equal(f.q.hit.header, 25n);
  f.q.hit.links[400] = 31n; assert.equal(f.q.hit.data[0][0], 31n);
  f.q.hit.data[400][0] = 41n; assert.equal(f.q.message.header, 41n);
  f.q.message.links[32] = 51n; assert.equal(f.q.message.data[0][0], 51n);
  f.q.message.data[0][-1] = 61n; assert.equal(f.q.message.links[31], 61n);
});

test('payload rows are persistent memory windows and cannot be replaced', () => {
  const f = initialized(), row = f.q.hit.data[0];
  Object.assign(f.l.hit, emptyHit(), { dbits: 1n, ihita: 321n, iwhat: 13n });
  f.q.hit.make(1, f.l.hit, f.h.players, 0n, f.out);
  assert.equal(f.q.hit.data[0], row); assert.equal(row[1], hw(321n, 0n));
  assert.throws(() => { f.q.hit.data[0] = [0n, 0n, 0n, 0n]; }, /cannot be replaced/);
  assert.throws(() => { f.q.message.data[0] = []; }, /cannot be replaced/);
});

test('queue binding accepts explicit relocation and leaves unavailable surrounding memory unresolved', () => {
  const f = fixture(undefined, 0o20000n); f.q.hit.serial = MAX_INTEGER + 1n;
  assert.equal(f.space.read(0o20000n + 11n), MIN_INTEGER); assert.equal(f.q.address('msgq'), 0o20000n + 2046n);
  assert.throws(() => f.q.message.data[32][0], /Unmapped source address/);
});

test('MAKMSG in one job and GETMSG in another use shared links and private output storage', () => {
  const a = initialized(), b = initialized(a); a.send('Hello', 3n, 210n);
  assert.equal(b.q.message.links[0], hw(-1n, 3n)); assert.equal(b.h.players[1].msgflg, 1n);
  done(getMessage(b.q.message, b.h.players, b.l.hit, 1, b.buffer, io));
  assert.equal(messageText(b.buffer), 'Hello\r\n'); assert.equal(b.l.hit.dispfr, 210n); assert.equal(b.l.hit.dbits, 3n);
  assert.equal(a.q.message.links[0], hw(-1n, 2n)); assert.equal(a.h.players[1].msgflg, 0n); assert.ok(a.buffer.every(n => n === 0n));
  done(getMessage(a.q.message, a.h.players, a.l.hit, 2, a.buffer, io)); assert.equal(b.q.message.header, -1n);
});

test('message payload padding and trailing words retain prior source memory after reuse', () => {
  const f = initialized(); f.q.message.data[0].fill(-1n); f.send('AB');
  assert.equal(f.q.message.data[0][1] & 1n, 1n); // Five seven-bit deposits leave bit 35 alone.
  assert.equal(f.q.message.data[0][16], -1n); assert.equal(messageText(f.q.message.data[0].slice(1)), 'AB\r\n');
});

test('publication waits expose the reservation and payload but no delivered flag to a second job', () => {
  const a = initialized(), b = initialized(a), calls: string[] = [];
  const yielding: QueueServices<string> = { *lock(r) { calls.push(r); if (r === 'UPDT.') yield r; return true; }, unlo() {} };
  a.l.hit.dbits = 1n;
  const g = makeMessage(a.q.message, a.h.players, a.l.hit, 'Pending', a.out, yielding);
  assert.deepEqual(g.next(), { done: false, value: 'UPDT.' });
  assert.equal(b.q.message.links[0], -1n); assert.equal(b.q.message.header, -1n); assert.equal(b.h.players[1].msgflg, 0n);
  assert.equal(messageText(b.q.message.data[0].slice(1)), 'Pending\r\n'); assert.equal(b.q.message.search(1n), undefined);
  assert.equal(g.next().done, true); assert.equal(b.h.players[1].msgflg, 1n); assert.deepEqual(calls, ['RSRV.', 'UPDT.']);
});

test('full shared message queue evicts the oldest recipient and retains stale source counts', () => {
  const a = initialized(), b = initialized(a); a.send('Oldest', 1n);
  for (let i = 0; i < 31; i++) a.send('Both', 3n);
  b.send('Newest', 2n);
  assert.equal(a.q.message.search(1n), undefined); assert.equal(a.h.players[1].msgflg, 32n);
  assert.equal(a.h.players[2].msgflg, 32n); assert.equal(messageText(a.q.message.data[0].slice(1)), 'Newest\r\n');
});

test('live source BITS controls GETMSG and is not read after an exhausted counter', () => {
  const f = initialized(); f.send('Switched', 2n); f.h.players[1].msgflg = 1n; f.high.write('bits', 2n, 1);
  done(getMessage(f.q.message, f.h.players, f.l.hit, 1, f.buffer, io)); assert.equal(messageText(f.buffer), 'Switched\r\n');
  const q = queueState(f.space, () => { throw new Error('unexpected BITS read'); });
  done(getMessage(q.message, f.h.players, f.l.hit, 1, f.buffer, io)); assert.equal(f.h.players[1].msgflg, 0n);
});

test('a message link outside the declared list follows real payload memory', () => {
  const f = initialized(); f.q.message.header = hw(32n, 32n); f.q.message.data[0][0] = hw(-1n, 1n);
  assert.deepEqual(f.q.message.search(1n), { index: 32, previous: -1 });
  f.q.message.remove(f.q.message.search(1n)!, 1n); assert.equal(f.q.message.data[0][0], 0n); assert.equal(f.q.message.header, -1n);
});

test('short-message cancellation clears only its reservation and leaves copied bytes in shared payload', () => {
  const a = initialized(), b = initialized(a); a.send('A');
  assert.equal(b.q.message.header, -1n); assert.equal(b.q.message.links[0], 0n); assert.equal(b.h.players[1].msgflg, 0n);
  assert.equal(messageText(b.q.message.data[0].slice(1)), 'A\r\n'); assert.equal(a.out.drain(), 'No message sent\r\n');
});

test('MAKHIT and GETHIT share raw payload and counters across separate job LOWSEG words', () => {
  const a = initialized(), b = initialized(a);
  Object.assign(a.l.hit, emptyHit(), { dbits: 2n, iwhat: 13n, dispfr: 101n, dispto: 102n, ihita: 456n });
  a.q.hit.make(1, a.l.hit, a.h.players, 0n, a.out);
  assert.equal(b.q.hit.serial, 1n); assert.equal(b.q.hit.links[0], hw(1n, 2n)); assert.equal(b.h.players[2].hitflg, 1n);
  assert.deepEqual({ ...a.l.hit }, { ...emptyHit(), dbits: 0n });
  b.q.hit.get(2, b.l.hit, b.h.players); assert.equal(b.l.hit.ihita, 456n); assert.equal(b.l.hit.dbits, 2n);
  assert.equal(a.q.hit.links[0], hw(1n, 0n)); assert.equal(a.h.players[2].hitflg, 0n); assert.equal(a.l.hit.ihita, 0n);
});

test('MAKHIT clears DBITS before incrementing counters and scans all 36 recipient bits', () => {
  const f = initialized(), observed: bigint[] = [];
  const flags = new Proxy(f.h.players, { get(target, key, receiver) {
    if (typeof key === 'string' && /^\d+$/.test(key)) observed.push(f.l.hit.dbits);
    return Reflect.get(target, key, receiver);
  } });
  Object.assign(f.l.hit, emptyHit(), { dbits: signed36((1n << 35n) | (1n << 10n) | 1n), iwhat: 13n });
  f.q.hit.make(1, f.l.hit, flags, 0n, f.out);
  assert.equal(f.h.players[1].hitflg, 1n); assert.equal(f.high.read('numcap',1), 1n);
  assert.equal(f.high.read('hitflg',36), 1n); assert.ok(observed.length > 0 && observed.every(n => n === 0n));
});

test('source HITQL overwrite retains payload padding, serial rollover and stale recipient counters', () => {
  const f = initialized(); f.q.hit.serial = MAX_INTEGER; f.q.hit.data[0].fill(-1n);
  Object.assign(f.l.hit, emptyHit(), { dbits: 1n, iwhat: 13n }); f.q.hit.make(1, f.l.hit, f.h.players, 0n, f.out);
  assert.equal(f.q.hit.serial, MIN_INTEGER); assert.equal(f.q.hit.links[0], 1n); assert.equal(f.q.hit.data[0][3] & 2047n, 2047n);
  f.q.hit.initialize(); assert.equal(f.q.hit.serial, MIN_INTEGER); assert.equal(f.h.players[1].hitflg, 1n);
});

test('GETHIT reads a live BITS word only after its counter decrement succeeds', () => {
  const f = initialized(); f.q.hit.links[0] = hw(1n, 2n); f.h.players[1].hitflg = 1n;
  const packed = packHit({ ...emptyHit(), iwhat: 13n }); packed.forEach((n, i) => { f.q.hit.data[0][i] = n; });
  f.high.write('bits', 2n, 1); f.q.hit.get(1, f.l.hit, f.h.players);
  assert.equal(f.l.hit.iwhat, 13n); assert.equal(f.q.hit.links[0], hw(1n, 0n));
  queueState(f.space, () => { throw new Error('unexpected BITS read'); }).hit.get(1, f.l.hit, f.h.players);
  assert.equal(f.h.players[1].hitflg, -1n); assert.equal(f.l.hit.dbits, 2n);
});

test('sender eleven aliases hit payload and the following message header instead of inventing a slot', () => {
  const f = initialized(); Object.assign(f.l.hit, emptyHit(), { dbits: 1n, dispfr: 101n, dispto: 102n, ihita: 99n, iwhat: 13n });
  f.q.hit.make(11, f.l.hit, f.h.players, 0n, f.out);
  assert.equal(f.q.hit.data[0][0], hw(1n, 1n)); assert.equal(f.q.message.header, hw(101n, 102n));
  assert.equal(f.q.message.links[0], hw(99n, 0n)); assert.equal(f.h.players[1].hitflg, 1n);
});

test('recipient zero uses the previous flag and final NAMES word through real source addresses', () => {
  const f = initialized(); f.high.write('bits', 1n, 0); f.high.write('hitflg', 1n, 0); f.q.hit.links[0] = hw(1n, 1n);
  f.q.hit.get(0, f.l.hit, f.h.players); assert.equal(f.high.read('msgflg',10), 0n); assert.equal(f.l.hit.dbits, 1n);
  f.send('Zero recipient', 1n); f.high.write('msgflg', 1n, 0);
  done(getMessage(f.q.message, f.h.players, f.l.hit, 0, f.buffer, io)); assert.equal(messageText(f.buffer), 'Zero recipient\r\n');
});

test('OUTMSG delivers exact bytes from shared queue through private memory-backed OMLOCL', () => {
  const a = initialized(), b = initialized(a); a.send('Hello', 3n, 210n);
  const ctx = Object.assign(Object.create(b.l.hit), { who: 1, oflg: 1, gagmsg: 0n });
  done(outMessage(ctx, b.h.players, b.buffer, b.out,
    (who, buffer) => getMessage(b.q.message, b.h.players, ctx, who, buffer, io), b.h.bits));
  assert.equal(b.out.drain(), '\r\nMessage from Wolf to  L N\r\nHello\r\n\r\n');
  assert.equal(messageText(b.buffer), 'Hello\r\n'); assert.equal(b.low.read('dispfr'), 0n); assert.equal(a.h.players[1].msgflg, 0n);
});

test('OUTHIT drains shared entries in physical sender order and clears private registers', () => {
  const a = initialized(), b = initialized(a);
  for (const [sender, type] of [[2, 14n], [1, 13n]] as const) {
    Object.assign(a.l.hit, emptyHit(), { dbits: 1n, iwhat: type }); a.q.hit.make(sender, a.l.hit, a.h.players, 0n, a.out);
  }
  done(outHit({ who: 1, team: 1, oflg: 0, ocflg: 0, nomsg: 0n, ship: b.h.players[1].ship }, b.l.hit, b.h.players, b.out,
    function* (who) { b.q.hit.get(who, b.l.hit, b.h.players); }));
  assert.equal(b.out.drain(), 'Trac. Beam on\r\nTrac. Beam off\r\n'); assert.equal(a.h.players[1].hitflg, 0n);
  assert.deepEqual({ ...b.l.hit }, { ...emptyHit(), dbits: 0n });
});

test('GRIPE queue dump underflow and overrun read the actual header and first two hit payload words', () => {
  const f = initialized(); f.q.hit.header = 123n; f.q.hit.data[0][0] = 456n; f.q.hit.data[0][1] = 789n;
  const reads: number[] = [];
  gripeDiagnostic({ linbuf: () => 0n, stabuf: () => 0n, pdlAddress: 0, pdl: () => 0n,
    hitqlAddress: Number(f.q.address('hitql')), hitql: i => { reads.push(i); return f.q.hitql(i); }, loktab: () => 0n }, f.out);
  assert.deepEqual(reads, Array.from({ length: 403 }, (_, i) => i - 1));
  assert.equal(f.q.hitql(-1), 123n); assert.equal(f.q.hitql(400), 456n); assert.equal(f.q.hitql(401), 789n);
  assert.ok(f.out.drain().includes('000000000710 000000001425 '));
});

test('FREE drains real shared hit/message entries and retains other recipients', () => {
  const a = initialized(), b = initialized(a); const p = b.h.players[1]; p.alive = 0n; p.ship.v = 1; p.ship.h = 1;
  b.h.board.setdsp(1, 1, 101); b.h.values.numply = 2n; b.high.write('numsid',2n,1);
  a.send('Departure', 3n); Object.assign(a.l.hit, emptyHit(), { dbits: 3n, iwhat: 13n }); a.q.hit.make(2, a.l.hit, a.h.players, 0n, a.out);
  const world = Object.assign(Object.create(b.h.values), { players: b.h.players, board: b.h.board, killed: b.h.killed, numsid: b.high.array('numsid',3,[0]) });
  done(freeShip(world, new SavedShip(), b.l.hit, 1, {
    *lock() { return true; }, unlock() {}, daytime: () => 123n, *trcoff() {},
    *gethit(who) { b.q.hit.get(who, b.l.hit, b.h.players); },
    getmsg: (who, buffer) => getMessage(b.q.message, b.h.players, b.l.hit, who, buffer, io),
  }));
  assert.equal(a.h.players[1].hitflg, 0n); assert.equal(a.h.players[1].msgflg, 0n); assert.equal(a.h.players[1].alive, 1n);
  assert.equal(rightHalf(a.q.hit.links[40]), 2n); assert.equal(rightHalf(a.q.message.links[0]), 2n);
  assert.equal(a.h.players[2].hitflg, 1n); assert.equal(a.h.players[2].msgflg, 1n);
});
