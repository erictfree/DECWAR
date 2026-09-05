import test from 'node:test';
import assert from 'node:assert/strict';
import { displayStatistics, showStatistics, decodeStatisticsDate } from '../src/game/show-statistics.ts';
import type { HonorRollContext, HonorRollServices } from '../src/game/show-statistics.ts';
import { StatisticsBuffer, updateStatistics } from '../src/game/statistics.ts';
import type { StatisticsServices } from '../src/game/statistics.ts';
import { TerminalOutput, o2dg, ostbx } from '../src/compat/output.ts';
import { halfWords, packAscii, packSixbit, signed36, MAX_INTEGER, MIN_INTEGER } from '../src/compat/word36.ts';
import { honorRollText } from '../src/generated/source-data.ts';
import { statisticsMessages } from '../tools/source.ts';

function finish<T>(run: Generator<never, T, void>): T { const step = run.next(); assert.equal(step.done, true); return step.value; }
function fixture() {
  const ctx: HonorRollContext = { buffer: new StatisticsBuffer(), hungup: 0n, frebie: 0n, ccflg: 0n, terwid: 79n };
  const out = new TerminalOutput(), calls: string[] = [];
  const files = { stared: new StatisticsBuffer(), stfred: new StatisticsBuffer() };
  let active: keyof typeof files = 'stared';
  const io: HonorRollServices<never> = {
    *open(block) {
      assert.ok(block === 'stared' || block === 'stfred'); active = block; calls.push(block);
      return { opened: true, lePpn: -1n, leName: packSixbit(block === 'stfred' ? 'DECWAF' : 'DECWAR') };
    },
    *input(buffer, descriptor) { calls.push(descriptor); buffer.words.splice(0, 640, ...files[active].words); },
    *close() { calls.push('close'); }, flushTerminal() { calls.push('flush'); },
  };
  return { ctx, out, calls, files, io };
}
function row(buffer: StatisticsBuffer, at = 3, ppn = halfWords(0o123n, 0o4567n)) {
  // March 5, 2026 in the archive's DATE arithmetic: 62*372 + 2*31 + 4.
  buffer.words.splice(at, 10, ppn, packSixbit('ALICE '), packSixbit('SMITH '),
    packAscii('Lexin'), packAscii('gton '), 23130n, 680n, 90000n, 123n, halfWords(1n, 5n));
}
const header = '\r\nCaptain        Service # Credits';
const wideHeader = ' Ship        Runtm Date';
const record = ' ALICE SMITH     123-4567      1';
const wideTail = ' Lexington    2    05/03/26';

test('SHOSTA eleven anonymous literals are extracted without normalizing physical line breaks', () => {
  assert.deepEqual(honorRollText, statisticsMessages('shosta')); assert.equal(honorRollText.length, 11);
  assert.equal(honorRollText[6].text, header); assert.equal(honorRollText[7].text, wideHeader);
});

test('OSTBX pads early space/NUL termination to nine characters but permits ten nonterminating characters', () => {
  for (const [name, expected] of [['Lexington ', 'Lexington'], ['Cobra     ', 'Cobra    '],
    [' ABCDEFGHI', '         '], ['ABCDEFGHIJ', 'ABCDEFGHIJ'], ['AB\0DEFGHIJ', 'AB       ']]) {
    const out = new TerminalOutput(); ostbx(out, [packAscii(name.slice(0, 5)), packAscii(name.slice(5))]);
    assert.equal(out.drain(), expected);
  }
});

test('O2DG discards overflow digits and preserves MOVEI masking for negative remainders', () => {
  for (const [value, expected] of [[0n, '00'], [9n, '09'], [99n, '99'], [100n, '00'],
    [2026n, '26'], [-1n, '\x163'], [-36n, '\x128'], [-100n, '00']] as const) {
    const out = new TerminalOutput(); o2dg(out, value); assert.equal(out.drain(), expected);
  }
});

test('DACON uses 31-day month slots and year relative to 2000, including pre-2000 and negative words', () => {
  assert.deepEqual(decodeStatisticsDate(23130n), { day: 5n, month: 3n, year: 26n });
  assert.deepEqual(decodeStatisticsDate(0n), { day: 1n, month: 1n, year: -36n });
  assert.deepEqual(decodeStatisticsDate(31n), { day: 1n, month: 2n, year: -36n });
  assert.deepEqual(decodeStatisticsDate(371n), { day: 31n, month: 12n, year: -36n });
  assert.deepEqual(decodeStatisticsDate(-1n), { day: 0n, month: 1n, year: -36n });
});

for (const arg of [-1n, 0n, 1n]) for (const width of [79n, 80n]) {
  test(`DSPSTA exact header/row bytes at argument ${arg}, width ${width}`, () => {
    const f = fixture(); row(f.ctx.buffer); f.ctx.terwid = width;
    displayStatistics(f.ctx, 3, () => arg, f.out, f.io.flushTerminal);
    assert.equal(f.out.drain(), header + (arg <= 0n ? wideHeader : '') + '\r\n' + record +
      (arg > 0n || width >= 80n ? wideTail : '') + '\r\n');
    assert.deepEqual(f.calls, ['flush']);
  });
}

test('DSPSTA credits add octal 500 (320) and truncate signed division, rather than rounding half up', () => {
  for (const [score, expected] of [[679n, '     0'], [680n, '     1'], [-1319n, '     0'], [-1320n, '    -1'],
    [MAX_INTEGER, '-*****'], [MIN_INTEGER, '-*****']] as const) {
    const f = fixture(); row(f.ctx.buffer); f.ctx.buffer.words[9] = score;
    displayStatistics(f.ctx, 3, () => 0n, f.out, f.io.flushTerminal);
    assert.equal(f.out.drain().split('\r\n')[2].slice(-6), expected);
  }
});

test('DSPSTA runtime rounds by 30000 milliseconds and date display preserves the source pre-2000 control character', () => {
  const f = fixture(); row(f.ctx.buffer); f.ctx.buffer.words[10] = 29999n; f.ctx.buffer.words[8] = 0n;
  displayStatistics(f.ctx, 3, () => 1n, f.out, f.io.flushTerminal);
  assert.ok(f.out.drain().endsWith('Lexington    0    01/01/\x128\r\n'));
  f.ctx.buffer.words[10] = 30000n;
  displayStatistics(f.ctx, 3, () => 1n, f.out, f.io.flushTerminal);
  assert.ok(f.out.drain().includes('Lexington    1    '));
});

test('DSPSTA PPN is octal with six-column project and at least one space after any programmer width', () => {
  for (const [ppn, printed] of [[1n, '1    '], [0o12345n, '12345 '], [0o777777n, '777777 ']] as const) {
    const f = fixture(); row(f.ctx.buffer, 3, halfWords(0o777777n, ppn));
    displayStatistics(f.ctx, 3, () => 0n, f.out, f.io.flushTerminal);
    assert.ok(f.out.drain().includes('777777-' + printed + '     1'));
  }
});

test('DSPSTA uses all twelve SIXBIT name characters and flags zero reason half as missing', () => {
  const f = fixture(); row(f.ctx.buffer); f.ctx.buffer.words[12] = 5n;
  f.ctx.buffer.words[4] = packSixbit('ABCDEF'); f.ctx.buffer.words[5] = packSixbit('GHIJKL');
  displayStatistics(f.ctx, 3, () => 0n, f.out, f.io.flushTerminal);
  assert.ok(f.out.drain().includes('*ABCDEFGHIJKL '));
});

test('DSPSTA skips gaps, includes the tenth physical record, and ignores records beyond ten', () => {
  const f = fixture(); row(f.ctx.buffer, 13); row(f.ctx.buffer, 93); row(f.ctx.buffer, 103);
  displayStatistics(f.ctx, 3, () => 0n, f.out, f.io.flushTerminal);
  assert.equal(f.out.drain(), header + wideHeader + '\r\n' + record + '\r\n' + record + '\r\n');
});

test('DSPSTA CCFLG is checked on entry only, and does not stop rows when set during output', () => {
  const f = fixture(); row(f.ctx.buffer); row(f.ctx.buffer, 13); f.ctx.ccflg = -1n;
  displayStatistics(f.ctx, 3, () => 0n, f.out, f.io.flushTerminal); assert.equal(f.out.drain(), ''); assert.deepEqual(f.calls, []);
  f.ctx.ccflg = 0n;
  const write = f.out.write.bind(f.out); f.out.write = text => { write(text); if (text.startsWith('ALICE')) f.ctx.ccflg = -1n; };
  displayStatistics(f.ctx, 3, () => 0n, f.out, f.io.flushTerminal);
  assert.equal(f.out.drain(), header + wideHeader + '\r\n' + record + '\r\n' + record + '\r\n');
  assert.equal(f.ctx.ccflg, -1n); assert.deepEqual(f.calls, ['flush']);
});

test('DSPSTA rereads the argument and snapshots TERWID before the row test', () => {
  const f = fixture(); row(f.ctx.buffer); f.ctx.terwid = 80n; let reads = 0;
  displayStatistics(f.ctx, 3, () => { if (++reads === 1) return 1n; f.ctx.terwid = 0n; return 0n; }, f.out, f.io.flushTerminal);
  assert.equal(reads, 2); assert.equal(f.out.drain(), header + '\r\n' + record + wideTail + '\r\n');
});

test('SHOSTA no-head-entry skips all headings even if a lower entry is populated', () => {
  const f = fixture(); row(f.files.stared, 13);
  finish(showStatistics(f.ctx, () => 0n, f.out, f.io));
  assert.equal(f.out.drain(), ''); assert.deepEqual(f.calls, ['stared', 'staiow', 'close']);
});

test('SHOSTA reads without LE.PPN guard, lock or buffer clearing; failed open leaves buffer and CCFLG intact', () => {
  const f = fixture(); f.ctx.buffer.words[600] = 123n;
  f.io.open = function* () { f.calls.push('open'); return { opened: true, lePpn: 0n, leName: packSixbit('DECWAR') }; };
  f.io.input = function* () { f.calls.push('input'); assert.equal(f.ctx.buffer.words[600], 123n); };
  finish(showStatistics(f.ctx, () => 0n, f.out, f.io)); assert.deepEqual(f.calls, ['open', 'input', 'close']);
  f.ctx.ccflg = 1n;
  f.io.open = function* () { return { opened: false, lePpn: -1n, leName: 0n }; };
  finish(showStatistics(f.ctx, () => 0n, f.out, f.io)); assert.equal(f.ctx.ccflg, 1n); assert.equal(f.ctx.buffer.words[600], 123n);
});

test('SHOSTA team order compares living-head scores, ties favor Federation, and memorials follow their side', () => {
  for (const empire of [679n, 680n, 681n]) {
    const f = fixture(); for (const at of [3, 103, 259, 359]) row(f.files.stared, at);
    f.files.stared.words[265] = empire;
    finish(showStatistics(f.ctx, () => 0n, f.out, f.io)); const text = f.out.drain();
    const headings = empire > 680n ? [4, 5, 2, 3] : [2, 3, 4, 5];
    let last = -1;
    for (const i of headings) { const next = text.indexOf(honorRollText[i].text); assert.ok(next > last); last = next; }
    assert.equal(f.calls.filter(c => c === 'flush').length, 5);
  }
});

test('SHOSTA exact single-table output is buffered OSTR, including the honor-roll leading blank lines', () => {
  const f = fixture(); row(f.files.stared);
  finish(showStatistics(f.ctx, () => 0n, f.out, f.io));
  assert.equal(f.out.drain(), '\r\n\r\n\r\n--------------\r\n\r\nThe DECWAR Honor Roll\r\n\r\n(* indicates Missing in Action)\r\n\r\n' +
    '\r\nThe Federation has awarded the\r\nfollowing Captains the Emerald\r\nStar Cluster for outstanding\r\nservice:\r\n\r\n' +
    header + wideHeader + '\r\n' + record + '\r\n');
  assert.equal(f.out.hcpos, 0); assert.equal(f.out.blank, 0);
});

test('SHOSTA actual returned file name controls nonpay label and paid-file continuation', () => {
  const f = fixture(); f.ctx.frebie = -1n; row(f.files.stfred); row(f.files.stared);
  finish(showStatistics(f.ctx, () => 1n, f.out, f.io));
  assert.equal(f.calls.filter(c => c === 'stared').length, 1); assert.equal(f.calls.filter(c => c === 'stfred').length, 1);
  assert.equal(f.out.drain().split('(**** non-paying users ****)').length, 2);
  const g = fixture(); g.ctx.frebie = -1n; row(g.files.stfred);
  const open = g.io.open;
  g.io.open = function* (block) { return { ...yield* open(block), leName: packSixbit('DECWAR') }; };
  finish(showStatistics(g.ctx, () => 1n, g.out, g.io));
  assert.equal(g.calls.includes('stared'), false); assert.equal(g.out.drain().includes('non-paying'), false);
});

test('SHOSTA zero argument limits free users to free statistics, nonzero negative also requests paid statistics', () => {
  for (const argument of [0n, -1n]) {
    const f = fixture(); f.ctx.frebie = -1n;
    finish(showStatistics(f.ctx, () => argument, f.out, f.io));
    assert.equal(f.calls.includes('stared'), argument !== 0n);
  }
});

test('SHOSTA compares filename words by their 36-bit pattern including signed SIXBIT values', () => {
  const f = fixture(); f.ctx.frebie = -1n; row(f.files.stfred);
  const open = f.io.open;
  f.io.open = function* (block) { const result = yield* open(block); return { ...result, leName: signed36(result.leName) }; };
  finish(showStatistics(f.ctx, () => 1n, f.out, f.io));
  assert.equal(f.calls.includes('stared'), true); assert.ok(f.out.drain().includes('non-paying'));
});

test('SHOSTA Ctrl-C skips memorial after live table, still prints other-side heading, clears flag and prevents paid continuation', () => {
  const f = fixture(); f.ctx.frebie = -1n; for (const at of [3, 103, 259, 359]) row(f.files.stfred, at);
  const flush = f.io.flushTerminal; let flushes = 0;
  f.io.flushTerminal = () => { flush(); if (++flushes === 2) f.ctx.ccflg = -1n; };
  finish(showStatistics(f.ctx, () => 1n, f.out, f.io));
  const text = f.out.drain(); assert.ok(text.includes(honorRollText[2].text)); assert.ok(text.includes(honorRollText[4].text));
  assert.equal(text.includes(honorRollText[3].text), false); assert.equal(text.includes(honorRollText[5].text), false);
  assert.equal(text.split(header).length, 2); assert.equal(f.ctx.ccflg, 0n); assert.equal(f.calls.includes('stared'), false);
});

test('SHOSTA pending Ctrl-C still permits headings but DSPSTA suppresses rows; hungup guards only explicit flushes', () => {
  const f = fixture(); row(f.files.stared); f.ctx.ccflg = -1n; f.ctx.hungup = -1n;
  finish(showStatistics(f.ctx, () => 0n, f.out, f.io));
  const text = f.out.drain(); assert.ok(text.includes('Honor Roll')); assert.ok(text.includes('Federation'));
  assert.equal(text.includes('ALICE'), false); assert.equal(f.ctx.ccflg, 0n); assert.equal(f.calls.includes('flush'), false);
  // The output object represents a selected dispatch; actual hungup character
  // suppression belongs to that dispatch, not an invented SHOSTA early return.
});

test('UPDSTA writes a record that SHOSTA reads and renders with the same packed identity, reason and date', () => {
  const f = fixture();
  const io: StatisticsServices<never> = { ...f.io, *lock() { return true; }, unlo() {},
    *open(block) {
      if (block === 'staupd') return { opened: true, lePpn: 0n };
      return yield* f.io.open(block);
    },
    *output(buffer) { f.files.stared.words.splice(0, 640, ...buffer.words); },
    date() { return 23130n; }, outstr() {}, odec() {},
  };
  finish(updateStatistics(f.ctx, { ppn: halfWords(0o123n, 0o4567n), name1: packSixbit('ALICE '), name2: packSixbit('SMITH '),
    shipName1: packAscii('Lexin'), shipName2: packAscii('gton '), total: 680n, elapsed: 90000n, why: 0n, teamIndex: 0, who: 1 }, io));
  f.ctx.buffer.clear(); finish(showStatistics(f.ctx, () => 1n, f.out, f.io));
  assert.ok(f.out.drain().endsWith('*' + record.slice(1) + wideTail + '\r\n'));
});
