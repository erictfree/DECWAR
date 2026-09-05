import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { constants, commands, pregame, ships, terminals, messages } from '../src/generated/source-data.ts';
import { add36, divide36, HALF_MASK, MAX_INTEGER, MIN_INTEGER, packAscii, unpackAscii, packSixbit, unpackSixbit, halfWords, leftHalf, rightHalf } from '../src/compat/word36.ts';
import { DecwarRandom } from '../src/compat/random.ts';
import { PackedBoard, pdist, ldis, ingal } from '../src/compat/board.ts';
import { formatInteger, formatTenths, TerminalOutput } from '../src/compat/output.ts';
import { CommandScanner, equal, resolveCommand, UnresolvedFloatInput } from '../src/compat/parser.ts';
import { LineInput } from '../src/compat/line-input.ts';
import { prompt } from '../src/game/prompt.ts';

test('archive data: command order, original spellings, roster and banner', () => {
  assert.equal(constants.MAXINT, 34359738367);
  assert.equal(constants.KCRIT, 3000);
  assert.equal(commands.length, 33);
  assert.equal(pregame.length, 16);
  assert.equal(commands[27].name, 'TOrpedos');
  assert.equal(ships[0].name, 'Lexington');
  assert.equal(ships[9].name, 'Wolf');
  assert.equal(terminals[2], 'ADM-3a');
  assert.equal(messages.decver.text, '[DECWAR Version 2.3, 20-Nov-81]');
  assert.equal(messages.sure00.text, '\r\nDo you really want to quit? ');
  for (const message of Object.values(messages)) {
    const source = readFileSync(new URL('../legacy/compuserve/fortran 1978/' + message.file, import.meta.url), 'latin1');
    assert.ok(source.includes(message.text));
    assert.doesNotMatch(message.text, /(?<!\r)\n/);
  }
});

test('36-bit arithmetic: word wrap, negative truncation, divide traps', () => {
  assert.equal(add36(MAX_INTEGER, 1n), MIN_INTEGER);
  assert.deepEqual(divide36(-11n, 4n), { quotient: -2n, remainder: -3n });
  assert.deepEqual(divide36(11n, -4n), { quotient: -2n, remainder: 3n });
  assert.throws(() => divide36(1n, 0n), /zero/);
  assert.throws(() => divide36(MIN_INTEGER, -1n), /overflow/);
  const word = halfWords(-1n, 5n);
  assert.equal(leftHalf(word), HALF_MASK);
  assert.equal(rightHalf(word), 5n);
});

test('ASCII and SIXBIT packing are distinct, with original character capacities', () => {
  assert.equal(packAscii('A'), 65n << 29n);
  assert.equal(unpackAscii(packAscii('QUIT')), 'QUIT\0');
  assert.equal(packAscii('ABCDE') & 1n, 0n);
  assert.equal(packSixbit('A'), 33n << 30n);
  assert.equal(unpackSixbit(packSixbit('DECWAR')), 'DECWAR');
  assert.throws(() => packAscii('TOOLONG'));
  assert.throws(() => packSixbit('lower'));
});

test('IRAN seed-1 vectors independently derived from integer recurrence', () => {
  const r = new DecwarRandom(1n);
  assert.deepEqual(Array.from({ length: 8 }, () => r.iran(100n)), [14n, 64n, 56n, 80n, 48n, 75n, 84n, 43n]);
  assert.equal(r.seed, 32111981057n);
  const zero = new DecwarRandom(0n);
  const seeded = new DecwarRandom(260543n);
  assert.equal(zero.nextRaw(), seeded.nextRaw());
  r.setran(0n, 123n); assert.equal(r.seed, 123n);
  r.setran(9n, 123n); assert.equal(r.seed, 9n);
});

test('packed board: word and row boundaries, sentinel, unsigned MOVEI DISPX', () => {
  const b = new PackedBoard();
  for (const [v, h, code] of [[1, 1, 101], [1, 2, 207], [1, 3, -1], [1, 4, 900], [1, 75, 1000], [2, 1, 601], [75, 75, 500]]) b.setdsp(v, h, code);
  assert.equal(b.snapshot()[0], (101n << 24n) | (207n << 12n) | 4095n);
  assert.equal(b.disp(1, 3), -1);
  assert.equal(b.dispc(1, 3), 0);
  assert.equal(b.dispx(1, 3), 262143);
  assert.equal(b.disp(1, 75), 1000);
  assert.equal(b.disp(2, 1), 601);
  assert.equal(b.disp(75, 75), 500);
  assert.equal(b.disp(2, 2), 0);
  assert.throws(() => b.disp(0, 1));
  assert.equal(ingal(75, 75), true);
  assert.equal(ingal(75, 76), false);
  assert.equal(pdist(1, 1, 4, 5), 4);
  assert.equal(ldis(1, 1, 4, 5, 4), true);
});

test('ONUM/OFLT formatting: signed zeros, stars, integer-part-only widths', () => {
  assert.equal(formatInteger(123n, 2), '**');
  assert.equal(formatInteger(-123n, 3), '-**');
  assert.equal(formatInteger(-123n, 1), '-');
  assert.equal(formatInteger(123n, -2), '123');
  assert.equal(formatInteger(12n, 4), '  12');
  assert.equal(formatInteger(0n, 0, 'nonzero'), '0');
  assert.equal(formatTenths(1234n, 4), ' 123.4');
  assert.equal(formatTenths(1234n, 2), '**.4');
  assert.equal(formatTenths(-5n), '0.5');
  assert.equal(formatTenths(-5n, 0, 0, true), '-0.5');
  assert.equal(formatTenths(0n, 0, 0, true), '-0.0');
  assert.equal(formatTenths(19n, 0, -1), '1');
});

test('OCHR and CRLF preserve suppression and literal tab bookkeeping', () => {
  const out = new TerminalOutput();
  out.out('A', 1); out.crlf(); out.crlf();
  assert.equal(out.drain(), 'A\r\n\r\n');
  out.out('B'); out.tab(5); out.out('C', 1);
  assert.equal(out.drain(), 'B   C\r\n');
  out.out('\t'); assert.equal(out.hcpos, 0); // Source octal mask, not conventional tab stop.
  out.out('123456789012345678901234'); out.out('\t');
  assert.equal(out.hcpos, 32);
  out.out('x\0ignored'); assert.equal(out.drain().endsWith('x'), true);
});

test('EQUAL preserves five-character matching and the source lowercase asymmetry', () => {
  assert.equal(equal('M', 'Move '), -1);
  assert.equal(equal('MOVE', 'Move '), -2);
  assert.equal(equal('TORPEgarbage', 'TOrpedos'), -2);
  assert.equal(equal('', 'MOVE'), 0);
  assert.equal(equal('move', 'MOVE'), 0);
  assert.equal(resolveCommand('P').kind, 'ambiguous');
  assert.equal(resolveCommand('MOVE', 'pregame').kind, 'unavailable');
  assert.deepEqual(resolveCommand('M'), { kind: 'command', id: 11, name: 'Move' });
  assert.equal(resolveCommand('Q', 'pregame').kind, 'command');
});

test('GTKN: slash commands, comma nulls, comments, long numeric values, offsets', () => {
  const scan = new CommandScanner('move 12,, -3 / sta ; ignore / quit');
  const first = scan.next()!;
  assert.deepEqual(first.tokens.map(t => t.text), ['MOVE', '12', '', '-3', '']);
  assert.deepEqual(first.tokens.map(t => t.type), [3, 1, 0, 1, -1]);
  assert.equal(first.tokens[3].value, -3n);
  assert.equal(first.tokens[1].offset, 5);
  assert.equal(scan.next()!.tokens[0].text, 'STA');
  assert.equal(scan.next(), undefined);
  const long = new CommandScanner('123456789 - + 12A');
  assert.deepEqual(long.next()!.tokens.map(t => [t.text, t.type, t.value]), [
    ['12345', 1, 123456789n], ['-', 0, 0n], ['+', 0, 0n], ['12A', 3, 0n], ['', -1, 0n],
  ]);
  assert.equal(new CommandScanner('').next()!.tokens.length, 1);
  assert.equal(new CommandScanner('A,').next()!.tokens.length, 3);
  assert.equal(new CommandScanner(Array(14).fill('A').join(' ')).next()!.error, undefined);
  assert.equal(new CommandScanner(Array(15).fill('A').join(' ')).next()!.error, 'too-many-words');
  assert.throws(() => new CommandScanner('1.5').next(), UnresolvedFloatInput);
});

test('linked editor uses ESC, Ctrl-G, Ctrl-H/U/R; Ctrl-W is ordinary input', () => {
  const input = new LineInput();
  const effects = input.feed(Buffer.from('MOVE 1,2\r\n\x1b', 'ascii'));
  assert.deepEqual(effects.filter(e => e.kind === 'line'), [
    { kind: 'line', text: 'MOVE 1,2', repeated: false, terminator: 10 },
    { kind: 'line', text: 'MOVE 1,2', repeated: true, terminator: 27 },
  ]);
  assert.deepEqual(input.feed(Buffer.from('\b\x1b')).filter(e => e.kind === 'line'), [
    { kind: 'line', text: '', repeated: false, terminator: 27 },
  ]);
  assert.deepEqual(input.feed(Buffer.from('ABC\x07\bD\x12\x15Z\x17\n')).filter(e => e.kind === 'line'), [
    { kind: 'line', text: 'Z\x17', repeated: false, terminator: 10 },
  ]);
  const full = new LineInput().feed(Buffer.from('x'.repeat(81) + '\n'));
  assert.deepEqual(full.filter(e => e.kind === 'line').map(e => e.text.length), [80, 1]);
});

test('PROMPT uses exact inclusive thresholds and L,S,D,E order', () => {
  const state = { prtype: -1, lifeDamage: 3000n, lifeReserves: 5n, shieldStrength: 100n, shieldCondition: 1n, shipDamage: 20000n, energy: 10000n };
  assert.equal(prompt(state), '5LSDE> ');
  assert.equal(prompt({ ...state, prtype: 0 }), 'Command: ');
  assert.equal(prompt({ ...state, lifeDamage: 2999n, shieldStrength: 101n, shipDamage: 19999n, energy: 10001n }), '> ');
});
