import test from 'node:test';
import assert from 'node:assert/strict';
import { help, extraHelp, allHelp, outputList, searchList } from '../src/game/help.ts';
import { news, showHelp } from '../src/game/text-files.ts';
import type { TextFileServices } from '../src/game/text-files.ts';
import { playerSlots } from '../src/game/player.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { commands, constants as K, extraHelpWords, helpText, newsText } from '../src/generated/source-data.ts';
import { sourceFile, textCommandMessages } from '../tools/source.ts';
import { halfWords } from '../src/compat/word36.ts';
import { gtkn } from '../src/compat/gtkn.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';

function fixture(file = '\n.ENERGY\r\nEnergy body\r\n.NEXT\r\nOther body', line = 'HELP ENERGY') {
  const players = playerSlots(), board = new PackedBoard(), out = new TerminalOutput(), input = new CommandInput();
  players[1].alive = -1n; players[1].active = 17n; Object.assign(players[1].ship, { v: 10, h: 20 }); board.setdsp(10, 20, 101);
  const ctx = { who: 1, pasflg: 0n, ccflg: 0n, jbren: -1n, players };
  const calls: string[] = [], read: bigint[] = []; let offset = 0, direct = '', mode = 'tty';
  input.acceptLine(line); input.acquire(out);
  const io: TextFileServices<'input'> & { outstr(text: string): void; ttyon(): void; gtkn(): Generator<'input', void, void> } = {
    *open(block) { calls.push('open:' + block); offset = 0; return true; },
    *close() { calls.push('close'); }, seti() { mode = mode === 'tty' ? 'file' : 'tty'; calls.push('seti:' + mode); },
    *ichr() { assert.equal(mode, 'file'); const c = offset < file.length ? BigInt(file.charCodeAt(offset++)) : -1n; read.push(c); return c; },
    warn(text) { direct += text; calls.push('warn'); }, outstr(text) { direct += text; },
    ttyon() { calls.push('ttyon'); }, *gtkn() { assert.equal(mode, 'tty'); yield 'input'; assert.ok(input.acquire(out)); },
  };
  const runHelp = () => help(ctx, input, board, out, io), runNews = () => news(ctx, input, out, io);
  return { ctx, players, board, out, input, io, calls, read, runHelp, runNews, direct: () => direct, offset: () => offset };
}
function done(r: Generator<unknown, void, void>) { assert.equal(r.next().done, true); }

test('HELP and NEWS extract their exact inline strings and macro expansions', () => {
  assert.deepEqual(helpText, textCommandMessages('help')); assert.deepEqual(newsText, textCommandMessages('news'));
  assert.equal(helpText[6].text, "%Can't read help file\r\n");
});

test('SLST distinguishes unique, unknown and ambiguous matches in physical order', () => {
  const out = new TerminalOutput(), table = [['ABCD ', '     '], ['ABCDE', 'FGHIJ'], ['AX   ', '     ']] as const;
  assert.deepEqual(searchList('ABCD', table, out), { kind: 'ambiguous' });
  assert.equal(out.drain(), 'ABCD is ambiguous.  Could be:\r\nABCD, ABCDEFGHIJ\r\n');
  assert.deepEqual(searchList('AX', table, out), { kind: 'unique', index: 2, words: table[2] }); assert.equal(out.drain(), '');
  assert.deepEqual(searchList('NO', table, out), { kind: 'unknown' }); assert.equal(out.drain(), '');
  searchList('NO', table, out, { unknownText: '' }); assert.equal(out.drain(), 'NO\r\n');
});

test('SLST negative-X2 behavior stops at the second match without printing candidates', () => {
  const out = new TerminalOutput(); searchList('A', [['AA   ', '     '], ['AB   ', '     '], ['AC   ', '     ']], out, { suppressHits: true });
  assert.equal(out.drain(), 'A is ambiguous.\r\n');
});

test('OLST emits all ten stored bytes and seven entries per row, including blank slots', () => {
  const out = new TerminalOutput(); outputList(Array.from({ length: 8 }, (_, i) => [i === 1 ? '     ' : String(i).padEnd(5), '     '] as const), out);
  assert.equal(out.drain(), '0                   2         3         4         5         6         \r\n7         \r\n');
});

test('HLPXTR emits the blank extra-help entry and HLPALL privilege uses raw negative PASFLG', () => {
  const out = new TerminalOutput(); extraHelp(out);
  assert.equal(out.drain(), '\r\nFor a list of commands type HELP *\r\nFor help on a particular command type HELP command\r\n\r\nBesides commands, help is also available for:\r\n\r\nCTL-C               INTRO     HInts     INput     Output    PAuses    \r\nPRegame   \r\n\r\nUpper case letters mark the shortest acceptable abbreviation.\r\n\r\n');
  allHelp(1n, out); assert.ok(!out.drain().includes('*Debug'));
  allHelp(-1n, out); const text = out.drain(); assert.ok(text.endsWith('TRactor   TYpe      Users     *Debug    *Password \r\n'));
});

test('HELP RED gate preserves flags and board; no modifier uses general help then common cleanup', () => {
  const f = fixture(); f.ctx.ccflg = 1n; f.players[1].ship.condition = K.RED; done(f.runHelp());
  assert.equal(f.direct(), '\r\nYou cannot get HELP while under\r\nRED alert!\r\n'); assert.equal(f.ctx.ccflg, 1n);
  assert.equal(f.ctx.jbren, -1n); assert.equal(f.board.disp(10, 20), 101); assert.deepEqual(f.calls, []);
  const g = fixture('', 'HELP'); g.ctx.ccflg = 1n; done(g.runHelp()); assert.ok(g.out.drain().includes('HELP *'));
  assert.equal(g.ctx.ccflg, 0n); assert.equal(g.ctx.jbren, -1n); assert.equal(g.board.disp(10, 20), 101);
});

test('HELP parses persistent token types rather than NTOK and restores ship after actual file output', () => {
  const f = fixture(); f.input.ntok = 0; f.input.tokens[1].type = K.KINT;
  const open = f.io.open; f.io.open = function* (block) { assert.equal(f.board.disp(10, 20), 1000); return yield* open(block); };
  done(f.runHelp()); assert.equal(f.out.drain(), '\r\nEnergy body\r\n'); assert.equal(f.board.disp(10, 20), 101);
  assert.equal(f.players[1].active, 0n); assert.equal(f.ctx.jbren, 0o777777n); assert.ok(!f.calls.includes('ttyon'));
});

test('HELP ambiguous commands do not fall through to extra topics, but unknown commands can', () => {
  const f = fixture('\n.INPUT\r\nExtra input help\r\n.NEXT', 'HELP P UNKNOWN INPUT'); done(f.runHelp());
  assert.equal(f.out.drain(), "P is ambiguous.  Could be:\r\nPHasers, PLanets, POints\r\nI don't know the term UNKNO\r\n\r\nExtra input help\r\n");
});

test('HELP * and multiple topics process in order; privileged unknown terms stay hidden when PASFLG is positive', () => {
  const f = fixture('\n.ENERGY\r\nEnergy body\r\n.NEXT', 'HELP * ENERGY *DEBUG'); f.ctx.pasflg = 1n; done(f.runHelp());
  const text = f.out.drain(); assert.ok(text.startsWith('\r\nCommands are:\r\n\r\nBAses'));
  assert.ok(text.endsWith("\r\nEnergy body\r\nI don't know the term *DEBU\r\n"));
  assert.deepEqual(f.calls.filter(c => c.startsWith('open:')), ['open:hl2fil']);
});

test('SHLP tries special then standard file on failure, but does not fall back after a successful special open', () => {
  const f = fixture(); f.ctx.pasflg = -1n; const open = f.io.open;
  f.io.open = function* (block) { if (block === 'hl1fil') { f.calls.push('open:' + block); return false; } return yield* open(block); };
  done(f.runHelp()); assert.deepEqual(f.calls.filter(c => c.startsWith('open:')), ['open:hl1fil', 'open:hl2fil']);
  const g = fixture('\n.OTHER\r\nNothing', 'HELP ENERGY'); g.ctx.pasflg = -1n; done(g.runHelp());
  assert.deepEqual(g.calls.filter(c => c.startsWith('open:')), ['open:hl1fil']); assert.equal(g.out.drain(), "\r\n%Can't find help on Energy\r\n");
});

test('SHLP open failure warns directly and clears flags without CLOSE or SETI', () => {
  const f = fixture(); f.io.open = function* () { f.ctx.ccflg = 1n; f.ctx.jbren = -1n; return false; };
  done(f.runHelp()); assert.equal(f.direct(), "%Can't read help file\r\n"); assert.equal(f.out.drain(), '\r\n');
  assert.equal(f.ctx.ccflg, 0n); assert.equal(f.ctx.jbren, 0o777777n); assert.deepEqual(f.calls, ['warn']);
});

test('SHLP ignores a heading at byte zero and recognizes section borders only after LF or FF', () => {
  const f = fixture('.ENERGY\r\nWrong body\r\n.ENERGY\r\nRight\r\n.NEXT'); done(f.runHelp());
  assert.equal(f.out.drain(), '\r\nRight\r\n');
  const g = fixture('\f.ENERGY\nA\fB\n.NEXT'); done(g.runHelp()); assert.equal(g.out.drain(), '\r\nAB\n');
});

test('SHLP compares only five folded bytes and consumes a short-keyword terminator lookahead', () => {
  const f = fixture('\n.eNeRgDifferent\nA\n.NEXT'); done(showHelp(f.ctx, 'Energy    ', f.out, f.io)); assert.equal(f.out.drain(), '\r\nA\n');
  const g = fixture('\n.N\nFirst body line\nSecond\n.NEXT'); done(showHelp(g.ctx, 'N ', g.out, g.io));
  assert.equal(g.out.drain(), '\r\nSecond\n'); // Matcher consumed the heading LF before entering state zero.
});

test('SHLP matched heading without a subsequent line boundary still reports not found', () => {
  const f = fixture('\n.ENERGY'); done(f.runHelp()); assert.equal(f.out.drain(), "\r\n%Can't find help on Energy\r\n");
});

for (const interrupt of ['ccflg', 'jbren'] as const) test(`SHLP checks ${interrupt} at LF/FF boundaries, then clears it`, () => {
  const f = fixture('\n.ENERGY\nABC\nDEF\n.NEXT'); const read = f.io.ichr;
  f.io.ichr = function* () { const c = yield* read(); if (c === 65n) f.ctx[interrupt] = -1n; return c; };
  done(f.runHelp()); assert.equal(f.out.drain(), '\r\nABC\n'); assert.equal(f.ctx.ccflg, 0n); assert.ok(f.ctx.jbren >= 0n);
});

test('SHLP retains raw body NUL/CR/VT bytes, while FF is dropped', () => {
  const f = fixture('\n.ENERGY\nA\0B\rC\vD\fE\n.NEXT'); done(f.runHelp());
  assert.equal(f.out.drain(), '\r\nA\0B\rC\vDE\n');
});

test('HELP restores only a raw-negative ALIVE ship; interrupted/dead state remains observable', () => {
  const f = fixture(); const read = f.io.ichr;
  f.io.ichr = function* () { const c = yield* read(); if (c === 69n) f.players[1].alive = 1n; return c; };
  done(f.runHelp()); assert.equal(f.board.disp(10, 20), 1000);
});

test('NEWS source file is emitted byte-for-byte with no RED gate or board removal', () => {
  const file = sourceFile('DECWAR.NWS'), f = fixture(file, 'NEWS'); f.players[1].ship.condition = K.RED;
  done(f.runNews()); assert.equal(f.out.drain(), file); assert.equal(f.board.disp(10, 20), 101);
  assert.equal(f.ctx.ccflg, 0n); assert.equal(f.players[1].active, 0n);
  assert.deepEqual(f.calls, ['open:nwsfil', 'seti:file', 'close', 'seti:tty']);
});

test('NEWS first dot prints literally; a dot after EOL pages and YES consumes only the dot', () => {
  const f = fixture('.first\n.second\nthird', 'NEWS'), run = f.runNews();
  assert.equal(run.next().value, 'input'); assert.equal(f.out.drain(), '.first\nDo you want to continue viewing the news file? ');
  f.input.acceptLine('Y'); done(run); assert.equal(f.out.drain(), 'second\nthird'); assert.equal(f.calls.filter(c => c === 'ttyon').length, 1);
});

test('NEWS rejection closes immediately without reading the rest of the dotted line', () => {
  const f = fixture('A\n.Stop\nB', 'NEWS'), run = f.runNews(); run.next(); f.input.acceptLine('NO'); done(run);
  assert.equal(f.offset(), 3); assert.ok(!f.out.drain().includes('Stop')); assert.equal(f.ctx.ccflg, 0n);
});

test('NEWS CR does not trigger paging but VT and FF do; YES may come from real GTKN command tail', () => {
  const f = fixture('A\r.dot\v.more', 'NEWS / YES');
  const state = { locked: 0n, svlock: 0n, hungup: 0n, ccflgDot: 0n, iniflg: 0n, ccflg: 0n };
  f.io.gtkn = () => gtkn(state, f.input, f.out, { *inli() { assert.fail(); }, unlo() { assert.fail(); }, *lock() { assert.fail(); },
    daytime() { assert.fail(); }, hibernate() { assert.fail(); }, inputPending() { assert.fail(); } });
  done(f.runNews()); assert.equal(f.out.drain(), 'A\r.dot\vDo you want to continue viewing the news file? \r\nmore');
});

test('NEWS open failure clears only the restart flag high half, retaining Ctrl-C and taking no close path', () => {
  const f = fixture('', 'NEWS'); f.ctx.ccflg = 5n; f.ctx.jbren = halfWords(0o777777n, 123n);
  f.io.open = function* () { return false; }; done(f.runNews());
  assert.equal(f.ctx.ccflg, 5n); assert.equal(f.ctx.jbren, 123n); assert.deepEqual(f.calls, ['warn']);
  assert.equal(f.direct(), "%Can't read DECWAR.NWS\r\n");
});

test('NEWS interruption waits until LF/VT/FF and skips the active reset at that boundary', () => {
  const f = fixture('ABC\nDEF', 'NEWS'); f.ctx.ccflg = 1n; done(f.runNews());
  assert.equal(f.out.drain(), 'ABC\n'); assert.equal(f.players[1].active, 17n); assert.equal(f.ctx.ccflg, 0n);
});

test('HELP TELL uses the supplied archive text without newline normalization or a reconstructed topic database', () => {
  const file = sourceFile('DECWAR.HLP'), f = fixture(file, 'HELP TELL'); done(f.runHelp());
  const start = file.indexOf('\n.TELL\r\n') + '\n.TELL\r\n'.length, end = file.indexOf('\n.', start) + 1;
  assert.ok(start > 8 && end > start); assert.equal(f.out.drain(), '\r\n' + file.slice(start, end).replaceAll('\f', ''));
});

test('Every public command and nonblank extra topic renders its corresponding supplied help-file body', () => {
  const file = sourceFile('DECWAR.HLP');
  const headings = [...file.matchAll(/(?:\n|\f)\.([^\r\n]*)/g)];
  const terms = [...commands.slice(0, 31).map(c => c.words.join('').trim()), ...extraHelpWords.map(w => w.join('').trim()).filter(Boolean)];
  assert.equal(terms.length, 38);
  for (const term of terms) {
    const index = headings.findIndex(m => m[1].slice(0, 5).toUpperCase() === term.slice(0, 5).toUpperCase());
    assert.ok(index >= 0, term);
    const start = file.indexOf('\n', headings[index].index + 1) + 1;
    const end = headings[index + 1] ? headings[index + 1].index + 1 : file.length;
    const f = fixture(file, 'HELP ' + term); done(f.runHelp());
    assert.equal(f.out.drain(), '\r\n' + file.slice(start, end).replaceAll('\f', ''), term);
  }
});

test('SHLP clears its interrupt before HELP advances to the following modifier', () => {
  const f = fixture('\n.ENERGY\nABC\nDiscard\n.NEWS\r\nNews body\n.END', 'HELP ENERGY NEWS');
  const read = f.io.ichr; let interrupted = false;
  f.io.ichr = function* () { const c = yield* read(); if (!interrupted && c === 65n) { f.ctx.ccflg = 1n; interrupted = true; } return c; };
  done(f.runHelp()); assert.equal(f.out.drain(), '\r\nABC\n\r\nNews body\n');
  assert.equal(f.calls.filter(c => c === 'close').length, 2);
});

test('NEWS FF pages, and nonnegative ALIVE does not reset ACTIVE', () => {
  const f = fixture('A\f.More', 'NEWS'); f.players[1].alive = 0n; const run = f.runNews();
  assert.equal(run.next().value, 'input'); f.input.acceptLine('YES'); done(run);
  assert.equal(f.out.drain(), 'A\fDo you want to continue viewing the news file? More'); assert.equal(f.players[1].active, 17n);
});

for (const command of [8, 12]) test(`Text command dispatch slot ${command} preserves turn timing`, () => {
  const f = fixture('', command === 8 ? 'HELP' : 'NEWS');
  const ctx = { who: 1, player: -1n, ptime: 91n, shared: { players: f.players } };
  done(dispatchCommand(ctx, command, { *getcmd() { assert.fail(); }, *quit() { assert.fail(); }, *leave() { assert.fail(); },
    *finishTurn() { assert.fail(); }, movementContinuation() { assert.fail(); }, *invoke(call) {
      assert.equal(call.routine, command === 8 ? 'help' : 'news'); yield* (command === 8 ? f.runHelp() : f.runNews());
    } })); assert.equal(ctx.ptime, 91n); assert.equal(f.players[1].ship.turns, 0n);
});
