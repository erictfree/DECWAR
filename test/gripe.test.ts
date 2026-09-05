import test from 'node:test';
import assert from 'node:assert/strict';
import { gripe, gripeStatus, eraseForText, restoreAfterText } from '../src/game/gripe.ts';
import type { GripeServices } from '../src/game/gripe.ts';
import { GripeOutput } from '../src/game/gripe-buffer.ts';
import type { GripeCore } from '../src/game/gripe-buffer.ts';
import { gripeDiagnostic, octalDump } from '../src/game/gripe-diagnostic.ts';
import { playerSlots } from '../src/game/player.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { halfWords, leftHalf, rightHalf, packAscii, packSixbit, signed36 } from '../src/compat/word36.ts';
import { messageText } from '../src/game/message-queue.ts';
import { constants as K, gripeText } from '../src/generated/source-data.ts';
import { gripeMessages } from '../tools/source.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { StatisticsBuffer } from '../src/game/statistics.ts';
import { clearStatistics } from '../src/game/clear-statistics.ts';
import { showStatistics } from '../src/game/show-statistics.ts';

function fixture(lines = [{ text: 'Test gripe', eof: true }]) {
  const players = playerSlots(), board = new PackedBoard(), calls: string[] = [], memory = new Map<number, bigint>();
  players[1].alive = -1n; players[1].active = 7n; Object.assign(players[1].ship, { v: 10, h: 20 }); board.setdsp(10, 20, 101);
  const ctx = { who: 1, addrck: 0n, ccflg: 0n, fileLength: 0n, players };
  let direct = '', disk: bigint[] = [], old = [packAscii('OLD\r\n'), packAscii('MORE')];
  const core: GripeCore = { jbff: 1000, jbrel: 1000, flff: 0,
    read: address => memory.get(address) ?? 0n, write(address, value) { memory.set(address, value); },
    core(end) { calls.push('core:' + end); this.jbrel = end; return true; }, warn(text) { direct += text; calls.push('warn'); },
  };
  const out = new GripeOutput(core);
  const io: GripeServices<'input' | 'wait'> = {
    outstr(text) { direct += text; }, osts(output) { output.out('HEADER\r\n'); },
    *inli() { calls.push('inli'); yield 'input'; const line = lines.shift(); assert.ok(line);
      return { words: [...line.text].map(c => BigInt(c.charCodeAt(0))).concat(0n), eof: line.eof }; },
    diagnostic() { assert.fail('Unexpected diagnostic'); }, *shosta() { assert.fail('Unexpected SHOSTA'); },
    *open() { calls.push('open'); return { opened: true }; },
    *hiber(ms) { calls.push('hiber:' + ms); yield 'wait'; },
    *input(descriptor) {
      calls.push('read:' + descriptor.toString(8));
      const address = Number(rightHalf(descriptor)) + 1, count = -Number(BigInt.asIntN(18, leftHalf(descriptor)));
      assert.equal(count, old.length); old.forEach((word, i) => core.write(address + i, word)); return true;
    },
    useto(block) { calls.push('useto:' + block); },
    *output(descriptor) {
      calls.push('write:' + descriptor.toString(8));
      const address = Number(rightHalf(descriptor)) + 1, count = -Number(BigInt.asIntN(18, leftHalf(descriptor)));
      disk = Array.from({ length: count }, (_, i) => core.read(address + i)); return true;
    },
    *close() { calls.push('close:' + core.flff); },
  };
  const run = () => gripe(ctx, board, out, io);
  const finish = () => { const r = run(); while (!r.next().done) {} };
  return { ctx, players, board, calls, memory, core, out, io, run, finish, disk: () => disk, old,
    direct: () => direct, bufferText: () => messageText(Array.from({ length: out.buffer.last - out.buffer.base + 1 }, (_, i) => core.read(out.buffer.base + i))) };
}
function done(r: Generator<unknown, void, void>) { assert.equal(r.next().done, true); }

test('GRIPE text is extracted with ASCIL and WARN expansion', () => {
  assert.deepEqual(gripeText, gripeMessages()); assert.equal(gripeText.length, 15);
  assert.equal(gripeText[10].text, '%DECWAR.GRP being modified; trying again\r\n');
});

test('GRIPE red alert returns through direct monitor output before buffer, board or Ctrl-C changes', () => {
  const f = fixture(); f.players[1].ship.condition = K.RED; f.ctx.ccflg = 1n; done(f.run());
  assert.equal(f.direct(), '\r\nYou are not permitted to GRIPE\r\nwhile under RED alert!\r\n');
  assert.deepEqual(f.calls, []); assert.equal(f.board.disp(10, 20), 101); assert.equal(f.ctx.ccflg, 1n); assert.equal(f.out.hcpos, 0);
});

test('GRIPE erases ship during input, writes header/body/separator, then restores board and output', () => {
  const f = fixture(), run = f.run(); assert.equal(run.next().value, 'input');
  assert.equal(f.board.disp(10, 20), 1000); assert.equal(f.out.destination, 'gripe');
  assert.equal(f.out.drain(), 'Enter gripe, end with ^Z\r\n'); done(run);
  assert.equal(messageText(f.disk()), 'HEADER\r\nTest gripe\r\n----------\r\n');
  assert.equal(f.board.disp(10, 20), 101); assert.equal(f.out.destination, 'tty'); assert.equal(f.ctx.ccflg, 0n);
  assert.equal(f.players[1].active, 7n); // EOF path bypasses ACTIVE reset.
  assert.equal(f.calls.at(-1), 'close:1000');
});

test('GRIPE appends old packed words after the last new word, preserving padding and original old data', () => {
  const f = fixture(); f.ctx.fileLength = signed36(halfWords(-2n, 0n)); f.finish();
  const last = f.out.buffer.last;
  assert.deepEqual(f.disk().slice(-2), f.old);
  assert.ok(f.calls.includes('read:' + signed36(halfWords(-2n, BigInt(last))).toString(8)));
  assert.deepEqual(f.disk().slice(0, -2), Array.from({ length: last - 999 }, (_, i) => f.core.read(1000 + i)));
  assert.ok(f.calls.findIndex(c => c.startsWith('read:')) < f.calls.indexOf('useto:1'));
});

test('GRIPE nonnegative file-length word is cleared and treated as a virgin file', () => {
  const f = fixture(); f.ctx.fileLength = 42n; f.finish(); assert.equal(f.ctx.fileLength, 0n);
  assert.ok(!f.calls.some(c => c.startsWith('read:'))); assert.notEqual(f.disk().length, 0);
});

test('GRIPE empty first EOF aborts but an empty EOF after a complete blank line records the log', () => {
  const empty = fixture([{ text: '', eof: true }]); empty.finish(); assert.equal(empty.disk().length, 0); assert.ok(!empty.calls.includes('open'));
  const second = fixture([{ text: '', eof: false }, { text: '', eof: true }]); second.finish();
  assert.equal(messageText(second.disk()), 'HEADER\r\n\r\n----------\r\n'); assert.equal(second.players[1].active, 0n);
});

test('GRIPE component OCRL suppresses a second consecutive blank line',()=>{
  const f=fixture([{text:'',eof:false},{text:'',eof:false},{text:'',eof:true}]);f.finish();
  assert.equal(messageText(f.disk()),'HEADER\r\n\r\n----------\r\n');
});

test('GRIPE Ctrl-C aborts before copying a pending line and cleanup retains changed ALIVE state', () => {
  const f = fixture(), run = f.run(); run.next(); f.ctx.ccflg = -1n; f.players[1].alive = 1n; done(run);
  assert.equal(f.bufferText(), 'HEADER\r\n'); assert.equal(f.disk().length, 0); assert.equal(f.ctx.ccflg, 0n);
  assert.equal(f.board.disp(10, 20), 1000); assert.equal(f.out.destination, 'tty');
});

test('GRIPE allows twenty complete lines, warns after eighteen and twenty, and routes warnings only to tty', () => {
  const f = fixture(Array.from({ length: 20 }, (_, i) => ({ text: String(i + 1), eof: false }))); f.finish();
  assert.equal(f.out.drain(), 'Enter gripe, end with ^Z\r\n[Only 2 more message lines allowed]\r\n[Too many lines -- end of gripe]\r\n');
  assert.equal(messageText(f.disk()), 'HEADER\r\n' + Array.from({ length: 20 }, (_, i) => i + 1 + '\r\n').join('') + '----------\r\n');
  assert.equal(f.calls.filter(c => c === 'inli').length, 20); assert.equal(f.players[1].active, 0n);
});

test('GRIPE retries a busy file with the source 3000ms hibernation and aborts on Ctrl-C after wake', () => {
  const f = fixture(); f.ctx.addrck = 1n; f.io.shosta = function* () {};
  f.io.open = function* () { f.calls.push('open'); return { opened: false, busy: true }; };
  const run = f.run(); assert.equal(run.next().value, 'wait'); assert.equal(f.board.disp(10, 20), 1000);
  assert.equal(f.direct(), '%DECWAR.GRP being modified; trying again\r\n');
  assert.equal(run.next().value, 'wait'); f.ctx.ccflg = 1n; done(run);
  assert.equal(f.calls.filter(c => c === 'open').length, 2); assert.equal(f.ctx.ccflg, 0n); assert.equal(f.disk().length, 0);
});

for (const failure of ['open', 'input', 'output', 'core'] as const) test(`GRIPE ${failure} failure preserves source warning and common cleanup`, () => {
  const f = fixture();
  if (failure === 'open') f.io.open = function* () { return { opened: false }; };
  if (failure === 'input') { f.ctx.fileLength = signed36(halfWords(-2n, 0n)); f.io.input = function* () { return false; }; }
  if (failure === 'output') f.io.output = function* () { return false; };
  if (failure === 'core') {
    f.io.open = function* () { f.ctx.fileLength = signed36(halfWords(-100n, 0n)); f.core.core = () => false; return { opened: true }; };
  }
  f.finish(); assert.equal(f.direct(), failure === 'input' ? "%Can't read DECWAR.GRP\r\n"
    : failure === 'core' ? "%Can't get core to read DECWAR.GRP\r\n" : "%Can't write DECWAR.GRP\r\n");
  assert.equal(f.out.destination, 'tty'); assert.equal(f.board.disp(10, 20), 101); assert.equal(f.calls.at(-1), 'close:1000');
});

test('GRIPE positive ADDRCK logs SHOSTA(1), negative ADDRCK logs the diagnostic and both skip interactive prompt', () => {
  for (const addrck of [1n, -1n]) {
    const f = fixture(); f.ctx.addrck = addrck;
    f.io.shosta = function* (arg, out) { assert.equal(arg, 1n); out.out('STATISTICS\r\n'); };
    f.io.diagnostic = out => out.out('DIAGNOSTIC\r\n'); f.finish();
    assert.equal(f.out.drain(), ''); assert.equal(f.ctx.addrck, addrck);
    assert.equal(messageText(f.disk()), 'HEADER\r\n' + (addrck < 0n ? 'DIAGNOSTIC' : 'STATISTICS') + '\r\n----------\r\n');
    assert.ok(!f.calls.includes('inli'));
  }
});

test('OGCH allocation leaves the initial word stale, zeros next twenty, and keeps shared cursor state across output switches', () => {
  const f = fixture(); f.memory.set(1000, -1n); f.out.buffer.initialize(f.core); f.out.destination = 'gripe'; f.out.write('A');
  assert.equal(f.out.buffer.count, 99); assert.equal(f.core.jbff, 1020); assert.equal(f.core.read(1000) & 1n, 1n);
  assert.equal(f.core.read(1020), 0n); assert.equal(f.core.read(1001), 0n); assert.equal(f.out.hcpos, 1);
  f.out.destination = 'tty'; f.out.write('B'); assert.equal(f.out.hcpos, 2); assert.equal(f.out.drain(), 'B');
  f.out.destination = 'gripe'; f.out.write('C'); assert.equal(f.out.buffer.byte, 2); assert.equal(f.out.hcpos, 3);
});

test('OGCH second allocation begins from the current byte-pointer word and CORE failure drops only the current character', () => {
  const f = fixture(); f.out.buffer.initialize(f.core); f.out.destination = 'gripe'; f.out.write('A'.repeat(100));
  assert.equal(f.out.buffer.last, 1019); assert.equal(f.out.buffer.count, 0);
  f.core.core = () => false; f.out.write('X'); assert.equal(f.out.buffer.byte, 100); assert.equal(f.out.hcpos, 100);
  assert.equal(f.direct(), "%Can't get more core\r\n"); assert.equal(f.out.buffer.count, -1);
  f.core.jbrel = 2000; f.out.write('B'); assert.equal(f.core.jbff, 1039); assert.equal(f.out.buffer.last, 1020);
  assert.equal(f.out.buffer.byte, 101); assert.equal(f.out.buffer.count, 99);
});

test('ESHP ignores ALIVE and PSHP restores current coordinates and physical Empire ship code', () => {
  const f = fixture(); f.ctx.who = 10; Object.assign(f.players[10].ship, { v: 2, h: 3 }); eraseForText(f.ctx, f.board);
  assert.equal(f.board.disp(2, 3), 1000); restoreAfterText(f.ctx, f.board); assert.equal(f.board.disp(2, 3), 1000);
  f.players[10].alive = -1n; f.players[10].ship.h = 4; restoreAfterText(f.ctx, f.board); assert.equal(f.board.disp(2, 4), 210);
});

test('OSTS composes STAT identity, preserves raw version formatting, date/time scratch and negative option flags', () => {
  const f = fixture(), out = new TerminalOutput(), p = f.players[1];
  p.name1 = packSixbit('ALICE'); p.name2 = packSixbit('SMITH'); p.job[K.KTTYSP] = 1200n;
  p.ppn = halfWords(0o123n, 0o4567n); p.job[K.KTTYN] = packSixbit('TTY123'); p.job[K.KJOB] = 12n;
  const ctx = { who: 1, version: 24n, game: 9n, blhopt: -1n, romopt: 1n, players: f.players,
    identity: { name1: p.name1, name2: p.name2, speed: 1200n, ppn: p.ppn, tty: p.job[K.KTTYN], job: 12n }, scratch: [0n, 0n] };
  gripeStatus(ctx, out, { undat(words) { words[0] = packAscii('DATE'); }, untim() {} });
  assert.equal(out.drain(), '[V2.4  DATE DATE  Lexington  ALICE SMITH  1200     123,4567  TTY123   12     9 B]\r\n');
  ctx.who = 0; ctx.romopt = -1n; ctx.blhopt = 1n;
  gripeStatus(ctx, out, { undat() {}, untim(words) { words[0] = packAscii('TIME'); } });
  assert.equal(out.drain(), '[V2.4  DATE TIME  Pre-game   ALICE SMITH  1200     123,4567  TTY123  12     9 R]\r\n');
});

test('OCT.O and address dump preserve instruction fields, NUL caret output, live stack bound and overrun hit-link reads', () => {
  const out = new TerminalOutput(), reads: number[] = [], pdl: number[] = [];
  octalDump(out, -1n, 12); octalDump(out, 0o1234567n, 6); assert.equal(out.drain(), '777777777777234567');
  const instruction = (0o123n << 27n) | (0o14n << 23n) | (1n << 22n) | (5n << 18n) | 0o654321n;
  gripeDiagnostic({ linbuf: i => [65n, 3n, 0n][i],
    stabuf: i => i === 0 ? halfWords(0o123n, 0o456n) : i === 1 ? instruction : i === 17 ? 1001n : -1n,
    pdlAddress: 1000, pdl(i) { pdl.push(i); return 0n; }, hitqlAddress: 2000,
    hitql(i) { reads.push(i); return 0n; }, loktab: () => 0n }, out);
  const text = out.drain(); assert.ok(text.startsWith('**** Data out of bounds ****\r\n**** Command line:\r\nA^C^@\r\n\r\n'));
  assert.ok(text.includes('123 14,@654321(05)\r\n000123\r\n'));
  assert.deepEqual(pdl, [0, 1]); assert.deepEqual(reads, Array.from({ length: 403 }, (_, i) => i - 1));
  assert.ok(text.includes('*** PDL: 001750\r\n')); assert.ok(text.includes('*** HITQL-1:003717\r\n'));
});

test('GRIPE dispatch retains command-loop timing and no automatic turn charge', () => {
  const f = fixture(); f.ctx.addrck = 1n; f.io.shosta = function* () {};
  const ctx = { who: 1, player: -1n, ptime: 91n, shared: { players: f.players } };
  done(dispatchCommand(ctx, 7, { *getcmd() { assert.fail(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
    *finishTurn() { assert.fail(); }, movementContinuation() { assert.fail(); }, *invoke(call) { assert.equal(call.routine, 'gripe'); yield* f.run(); } }));
  assert.equal(ctx.ptime, 91n); assert.equal(f.players[1].ship.turns, 0n);
});

test('STAZAP → GRIPE → SHOSTA writes the actual old statistics into the log before clearing the shared buffer', () => {
  const f = fixture(), ctx = Object.assign(f.ctx, { buffer: new StatisticsBuffer(), hungup: 0n, frebie: 0n, terwid: 80n });
  const events: string[] = [], cleared: bigint[][] = [];
  f.io.shosta = (arg, out) => showStatistics(ctx, () => arg, out, {
    *open(block) { events.push('read-open:' + block); return { opened: true, lePpn: 0n, leName: packSixbit('DECWAR') }; },
    *input(buffer) {
      buffer.words[0] = 77n; buffer.words[3] = halfWords(0o123n, 0o456n);
      buffer.words[4] = packSixbit('ALICE'); buffer.words[5] = packSixbit('SMITH');
      buffer.words[6] = packAscii('Lexin'); buffer.words[7] = packAscii('gton'); buffer.words[9] = 1234000n;
    }, *close() { events.push('read-close'); }, flushTerminal() {},
  });
  done(clearStatistics(ctx, {
    *lock() { return true; }, unlo() { events.push('unlo'); }, *gripe() { yield* f.run(); events.push('gripe-done'); },
    *open(block) { events.push('write-open:' + block); return { opened: true, lePpn: 0n }; },
    *output(buffer) { cleared.push([...buffer.words]); }, *close() {}, outstr() {},
  }));
  const log = messageText(f.disk()); assert.ok(log.includes('ALICE SMITH')); assert.ok(log.includes('1234'));
  assert.ok(log.startsWith('HEADER\r\n')); assert.ok(log.endsWith('----------\r\n'));
  assert.deepEqual(cleared[0], [77n, ...Array<bigint>(639).fill(0n)]); assert.deepEqual(cleared[1], cleared[0]);
  assert.deepEqual(events, ['read-open:stared', 'read-close', 'gripe-done', 'write-open:staupd', 'write-open:stfupd', 'unlo']);
  assert.equal(ctx.addrck, 0n); assert.equal(f.out.drain(), '');
});

test('GRIPE composes the actual OSTS header and diagnostic dump through growing packed storage', () => {
  const f = fixture(); f.ctx.addrck = -1n;
  const status = { who: 0, version: 24n, game: 3n, blhopt: 0n, romopt: 0n, players: f.players,
    identity: { name1: packSixbit('ALICE'), name2: packSixbit('SMITH'), speed: 1200n, ppn: 1n, tty: 0n, job: 1n }, scratch: [0n, 0n] };
  f.io.osts = out => gripeStatus(status, out, {
    undat(words) { words[0] = packAscii('DATE'); }, untim(words) { words[0] = packAscii('TIME'); },
  });
  f.io.diagnostic = out => gripeDiagnostic({ linbuf: () => 0n, stabuf: () => 0n, pdlAddress: 10, pdl: () => 0n,
    hitqlAddress: 20, hitql: () => 0n, loktab: () => 0n }, out);
  f.finish(); const log = messageText(f.disk());
  assert.ok(log.startsWith('[V2.4  DATE TIME  Pre-game')); assert.ok(log.includes('**** Command line:\r\n^@\r\n'));
  assert.ok(log.includes('*** HITQL-1:000023\r\n')); assert.ok(log.includes('*** LOKTAB:\r\n'));
  assert.ok(log.endsWith('----------\r\n')); assert.ok(f.disk().length > 1000); assert.equal(f.out.drain(), '');
});

test('GRIPE pre-game WHO zero takes ordinary input without accessing player slot zero', () => {
  const f = fixture(); f.ctx.who = 0; f.finish();
  assert.equal(f.board.disp(10, 20), 101); assert.equal(f.players[1].active, 7n);
  assert.equal(messageText(f.disk()), 'HEADER\r\nTest gripe\r\n----------\r\n');
});

test('GRIPE missing LINBUF NUL exposes the memory boundary after copying available words', () => {
  const f = fixture(); f.io.inli = function* () { return { words: [65n, 66n], eof: true }; };
  assert.throws(() => f.run().next(), /LINBUF memory/);
  assert.equal(f.bufferText(), 'HEADER\r\nAB'); assert.equal(f.out.destination, 'gripe');
  assert.equal(f.board.disp(10, 20), 1000); assert.ok(!f.calls.includes('open'));
});
