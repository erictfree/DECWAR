import test from 'node:test';
import assert from 'node:assert/strict';
import { hibernate, inputReady, pause } from '../src/compat/wait.ts';
import type { Hibernate, WaitServices } from '../src/compat/wait.ts';
import { gtkn, clearInput } from '../src/compat/gtkn.ts';
import type { TokenReadState, TokenReadServices, EditedLine } from '../src/compat/gtkn.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { LineInput } from '../src/compat/line-input.ts';

function fixture() {
  const state: TokenReadState = { locked: 77n, svlock: 0n, iniflg: 0n, hungup: 0n, ccflg: 0n, ccflgDot: 0n };
  const calls: string[] = [], locks = [false, true];
  let now = 1000n, pending = false;
  const io: WaitServices<Hibernate> = {
    daytime() { calls.push('day'); return now; },
    inputPending() { calls.push('pending'); return pending; },
    unlo(key) { calls.push(`unlo:${key}`); },
    *lock(key) { calls.push(`lock:${key}`); return locks.shift() ?? true; },
    hibernate,
  };
  return { state, io, calls, locks, time(value: bigint) { now = value; }, pending(value: boolean) { pending = value; } };
}
const sleep = (ms: bigint, wakeOnInput: boolean) => ({ value: { kind: 'hibernate', milliseconds: ms, wakeOnInput }, done: false });

test('PAUSE skips nonpositive waits, caps at ten seconds, and repeats early wakes in one-second steps', () => {
  const f = fixture();
  assert.equal(pause(f.state, () => 0n, f.io).next().done, true);
  assert.deepEqual(f.calls, []);
  const wait = pause(f.state, () => 20000n, f.io);
  assert.deepEqual(wait.next(), sleep(10000n, false));
  assert.deepEqual(f.calls, ['unlo:77', 'day']);
  assert.equal(f.state.locked, 77n); // UNLO. does not clear LOCKED.
  f.time(10999n); assert.deepEqual(wait.next(), sleep(1000n, false));
  f.time(11000n); assert.equal(wait.next().done, true);
  assert.deepEqual(f.calls, ['unlo:77', 'day', 'day', 'day', 'lock:77', 'lock:77']);
});

test('PAUSE uses raw time comparison across midnight rather than ETIM', () => {
  const f = fixture(); f.time(86399000n);
  const wait = pause(f.state, () => 2000n, f.io);
  assert.deepEqual(wait.next(), sleep(2000n, false));
  for (const now of [1000n, 2000n, 86399999n]) {
    f.time(now); assert.deepEqual(wait.next(), sleep(1000n, false));
  }
  assert.equal(f.calls.some(c => c.startsWith('lock:')), false);
  wait.return(); // Test stops this demonstrated nonterminating daily-clock path.
});

test('PAUSE rereads its by-reference argument after unlock and before first hibernate', () => {
  const f = fixture(), values = [5n, 15n, 25n];
  const wait = pause(f.state, () => values.shift()!, f.io);
  assert.deepEqual(wait.next(), sleep(25n, false));
  f.time(1015n); assert.equal(wait.next().done, true); // Deadline used the earlier 15.
  assert.deepEqual(values, []);
});

test('INPUT returns immediately for command tail/INI and polls without locks for nonpositive timeout', () => {
  const f = fixture();
  const noRead = () => assert.fail('Unexpected argument read');
  assert.deepEqual(inputReady(f.state, () => true, noRead, f.io).next(), { value: true, done: true });
  f.state.iniflg = -1n;
  assert.deepEqual(inputReady(f.state, () => false, noRead, f.io).next(), { value: true, done: true });
  assert.deepEqual(f.calls, []);
  f.state.iniflg = 0n;
  assert.deepEqual(inputReady(f.state, () => false, () => 0n, f.io).next(), { value: false, done: true });
  f.state.ccflg = -1n;
  assert.deepEqual(inputReady(f.state, () => false, () => -1n, f.io).next(), { value: true, done: true });
  assert.deepEqual(f.calls, ['pending', 'pending']);
});

test('INPUT reacquires locks before checking wake cause; hungup bypasses monitor pending check', () => {
  const f = fixture();
  const wait = inputReady(f.state, () => false, () => 20000n, f.io);
  assert.deepEqual(wait.next(), sleep(20000n, true)); // Unlike PAUSE, no cap.
  f.state.hungup = -1n;
  assert.deepEqual(wait.next(), { value: true, done: true });
  assert.deepEqual(f.calls, ['unlo:77', 'lock:77', 'lock:77']);
});

for (const entry of ['PAUSE', 'INPUT'] as const) test(`${entry} waits for release before rereading timeout and acquiring again`, () => {
  const f = fixture(); let duration = 20n, reads = 0;
  const io: WaitServices<Hibernate | 'deq'> = { ...f.io,
    *unlo(key): Generator<'deq', void, void> { f.calls.push(`unlo:${key}`); yield 'deq'; f.calls.push('released'); },
  };
  const argument = () => { reads++; return duration; };
  const g = entry === 'PAUSE' ? pause(f.state, argument, io)
    : inputReady(f.state, () => false, argument, io);
  assert.equal(g.next().value, 'deq');
  assert.equal(reads, 1); assert.deepEqual(f.calls, ['unlo:77']);
  duration = 40n; f.time(2000n);
  assert.deepEqual(g.next(), sleep(40n, entry === 'INPUT'));
  assert.equal(reads, entry === 'PAUSE' ? 3 : 2);
  assert.equal(f.calls[1], 'released');
  f.time(2040n); assert.equal(g.next().done, true);
  assert.deepEqual(f.calls.filter(c => c.startsWith('lock:')), ['lock:77', 'lock:77']);
});

test('GTKN distinguishes buffered continuation, interrupt discard, and actual line read lock boundaries', () => {
  const f = fixture(), input = new CommandInput(), out = new TerminalOutput();
  let line: EditedLine = { text: 'STATUS / TIME', repeated: false };
  const io: TokenReadServices<Hibernate | 'line'> = { ...f.io, *inli() { yield 'line'; return line; } };
  const first = gtkn(f.state, input, out, io);
  assert.equal(first.next().value, 'line'); assert.deepEqual(f.calls, ['unlo:77']);
  assert.equal(first.next().done, true); assert.equal(input.tokens[0].text, 'STATU');
  assert.deepEqual(f.calls, ['unlo:77', 'lock:77', 'lock:77']);
  assert.equal(input.available, true);
  f.calls.length = 0;
  assert.equal(gtkn(f.state, input, out, io).next().done, true);
  assert.equal(input.tokens[0].text, 'TIME'); assert.equal(input.available, false);
  assert.equal(out.drain(), '\r\n'); assert.deepEqual(f.calls, []);

  input.acceptLine('RADIO / QUIT'); input.acquire(out);
  f.state.ccflgDot = -1n; line = { text: 'TYPE', repeated: true };
  const interrupted = gtkn(f.state, input, out, io);
  assert.equal(interrupted.next().value, 'line');
  assert.equal(interrupted.next().done, true);
  assert.equal(input.tokens[0].text, 'TYPE'); assert.equal(input.repeated, true);
  assert.equal(f.state.ccflgDot, 0n);
});

test('GTKN early hangup leaves memory untouched; hangup during line read writes only source QUIT fields', () => {
  const f = fixture(), input = new CommandInput(), out = new TerminalOutput();
  input.acceptLine('123 456 ABC'); input.acquire(out);
  const before = structuredClone(input.tokens);
  const io: TokenReadServices<Hibernate | 'line'> = { ...f.io,
    *inli() { yield 'line'; return { text: '', repeated: false }; } };
  f.state.hungup = -1n;
  assert.equal(gtkn(f.state, input, out, io).next().done, true);
  assert.deepEqual(input.tokens, before); assert.equal(input.ntok, 3);
  assert.equal(f.state.ccflgDot, 0n); assert.deepEqual(f.calls, []);
  f.state.hungup = 0n;
  const wait = gtkn(f.state, input, out, io);
  assert.equal(wait.next().value, 'line');
  f.state.hungup = -1n;
  assert.equal(wait.next().done, true);
  assert.equal(input.ntok, -3670015); // GTKN hangup AOJA keeps X1's loop-count half.
  assert.deepEqual(input.tokens[0], { ...before[0], text: 'QUIT', type: 3 });
  assert.deepEqual(input.tokens[1], { ...before[1], text: '', type: -1, value: 0n });
  assert.deepEqual(input.tokens.slice(2), before.slice(2));
});

test('CLEAR retains repeat/name line and token storage and suppresses monitor clear after hangup', () => {
  const f = fixture(), input = new CommandInput(), out = new TerminalOutput();
  input.acceptLine('TIME / QUIT', true); input.acquire(out);
  const before = structuredClone(input.tokens); let clears = 0;
  clearInput(f.state, input, () => clears++);
  assert.equal(input.available, false); assert.equal(input.rawLine, 'TIME / QUIT');
  assert.equal(input.repeated, true); assert.deepEqual(input.tokens, before);
  f.state.hungup = -1n; clearInput(f.state, input, () => clears++);
  assert.equal(clears, 1);
});

test('linked ECHON/ECHOFF immediately return, so Ctrl-G changes neither input nor echo', () => {
  const input = new LineInput();
  assert.deepEqual(input.feed(Buffer.from('A\x07B\x07\x12\n')), [
    { kind: 'redisplay', text: 'AB' },
    { kind: 'line', text: 'AB', repeated: false, terminator: 10 },
  ]);
});

for (const ms of [262144n, 262145n, 34359738367n]) test(`INPUT component retains HRLI low-half duration for ${ms}`, () => {
  const f=fixture(),g=inputReady(f.state,()=>false,()=>ms,f.io);
  assert.deepEqual(g.next(),sleep(ms&0o777777n,true));assert.equal(g.next().done,true);
});
