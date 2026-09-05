import test from 'node:test';
import assert from 'node:assert/strict';
import { points, PointLocals, UnresolvedPointsExecution } from '../src/game/points.ts';
import { Scores } from '../src/game/scores.ts';
import { playerSlots } from '../src/game/player.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { MAX_INTEGER, MIN_INTEGER } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { finishTurn } from '../src/game/turn.ts';
import { leaveGame } from '../src/game/quit.ts';
import type { StatisticsRecord } from '../src/game/get-command.ts';

function fixture(line = 'POINTS') {
  const shared = { players: playerSlots(), scores: new Scores(), romopt: -1n, dotime: 0n, numply: 3n };
  shared.players[1].ship.turns = 2n; shared.scores.ships[1] = 3n; shared.scores.ships[2] = 2n;
  shared.scores.numrom = 2n; shared.scores.turns[1] = 3n; shared.scores.turns[2] = 2n; shared.scores.turns[3] = 2n;
  const ctx = { who: 1, team: 1, oflg: 0, player: -1n, ptime: 99n, shared };
  const local = new PointLocals(), out = new TerminalOutput(), input = new CommandInput();
  input.acceptLine(line); input.acquire(out);
  return { ctx, local, out, input, scores: shared.scores };
}
function run(f: ReturnType<typeof fixture>) { points(f.ctx, f.input, f.local, f.out); }
function finish<T>(run: Generator<never, T, void>): T { const step = run.next(); assert.equal(step.done, true); return step.value; }
const abort = '\r\nIncorrect input, POINTS aborted.\r\n';

for (const verbosity of [-1, 0, 1]) {
  test(`POINTS all eight categories and self totals have exact output at verbosity ${verbosity}`, () => {
    const f = fixture(); f.ctx.oflg = verbosity;
    for (let i = 1; i <= 8; i++) f.scores.setPlayer(i, 1, BigInt(i * 10));
    const short = ["Dam E's  ", "E's dest ", "Dam B's  ", "@'s capt ", "B's built", "Dam ??'s ", "*'s dest ", "@'s dest "];
    const medium = ['Damage to enemies ', 'Enemies destroyed ', 'Damage to bases   ', 'Planets captured  ',
      'Bases built       ', 'Damage to Romulans', 'Stars destroyed   ', 'Planets destroyed '];
    const long = ['Damage to enemies        ', 'Enemies destroyed  ( 500)', 'Damage to bases          ',
      'Planets captured   ( 100)', 'Bases built        (1000)', 'Damage to Romulans ( 500)',
      'Stars destroyed    ( -50)', 'Planets destroyed  (-100)'];
    const titles = verbosity < 0 ? short : verbosity === 0 ? medium : long;
    const header = ' '.repeat(verbosity < 0 ? 14 : verbosity === 0 ? 24 : 31) + 'Lexington ' + (verbosity < 0 ? '' : '  ');
    const rows = titles.map((title, i) => title + '          ' + (i + 1) + (verbosity < 0 ? '' : '.0'));
    const total = (verbosity < 0 ? 'Tot Pts  ' : verbosity === 0 ? 'Total points:     ' : 'Total points:            ') + '         36' + (verbosity < 0 ? '' : '.0');
    const perTurn = (verbosity < 0 ? 'Pts / SD ' : verbosity === 0 ? 'Pts. / stardate:  ' : 'Pts. / stardate:         ') + '         18' + (verbosity < 0 ? '' : '.0');
    run(f);
    assert.equal(f.out.drain(), '\r\n' + header + '\r\n' + rows.join('\r\n') + '\r\n\r\n' + total + '\r\n\r\n' + perTurn + '\r\n');
    assert.deepEqual(f.local.total, [0n, 360n, 0n, 0n, 0n]);
  });
}

test('POINTS ALL preserves four-column order, signed tenths, counts and integer division before formatting', () => {
  const f = fixture('POINTS ALL');
  f.scores.setPlayer(1, 1, -7n); f.scores.setTeam(1, 1, 123n); f.scores.setTeam(2, 1, -45n); f.scores.romulan[1] = 17n;
  run(f);
  const numbers = '          0.7         12.3         -4.5          1.7';
  assert.equal(f.out.drain(), '\r\n' + ' '.repeat(24) + 'Lexington   Federation       Empire     Romulans\r\n' +
    'Damage to enemies ' + numbers + '\r\n\r\n' + 'Total points:     ' + numbers + '\r\n\r\n' +
    'Number of ships:' + ' '.repeat(13) + '            3            2            2\r\n' +
    'Pts. / player:    ' + ' '.repeat(13) + '          4.1         -2.2          0.8\r\n' +
    'Pts. / stardate:  ' + '          0.3          4.1         -2.2          0.8\r\n');
  assert.deepEqual(f.local.total, [0n, -7n, 123n, -45n, 17n]); assert.equal(f.local.owidth, 13);
});

test('POINTS short counts use eleven columns and long counts align to column 24 before fields', () => {
  for (const verbosity of [-1, 1]) {
    const f = fixture('POINTS ALL'); f.ctx.oflg = verbosity; run(f);
    const lines = f.out.drain().split('\r\n');
    const counts = lines.find(line => line.startsWith(verbosity < 0 ? '# of shps' : 'Number of ships:'));
    assert.equal(counts, verbosity < 0 ? '# of shps' + ' '.repeat(11) + '          3          2          2'
      : 'Number of ships:' + ' '.repeat(20) + '            3            2            2');
    assert.equal(f.local.owidth, verbosity < 0 ? 11 : 13);
  }
});

test('POINTS empty categories are omitted unless at least one selected side has a nonzero value', () => {
  const f = fixture('POINTS FED'); f.scores.setPlayer(1, 1, 123n); f.scores.setTeam(2, 2, 999n); f.scores.romulan[3] = 999n;
  f.scores.setTeam(1, 4, 10n); run(f); const text = f.out.drain();
  assert.equal(text.includes('Damage to enemies'), false); assert.equal(text.includes('Enemies destroyed'), false);
  assert.equal(text.includes('Damage to bases'), false); assert.ok(text.includes('Planets captured'));
  assert.deepEqual(f.local.total, [0n, 0n, 10n, 0n, 0n]);
});

test('POINTS switches support source aliases/prefixes and accumulate without duplicating columns', () => {
  for (const [input, flags] of [['ME', [true, false, false, false]], ['I', [true, false, false, false]],
    ['F', [false, true, false, false]], ['H', [false, true, false, false]], ['E', [false, false, true, false]],
    ['K', [false, false, true, false]], ['R', [false, false, false, true]], ['A', [true, true, true, true]],
    ['ME I FED HUMAN', [true, true, false, false]]] as const) {
    const f = fixture('POINTS ' + input); run(f);
    assert.deepEqual([f.local.iflg, f.local.fflg, f.local.eflg, f.local.rflg], flags);
  }
});

test('POINTS invalid alphabetic switch aborts even after ALL and resets totals before parsing', () => {
  const f = fixture('POINTS ALL INVALID'); f.local.total.fill(999n); run(f);
  assert.equal(f.out.drain(), abort); assert.deepEqual(f.local.total, [999n, 0n, 0n, 0n, 0n]);
  assert.equal(f.local.iflg, true); assert.equal(f.local.fflg, true);
});

test('POINTS stops at the first nonalphabetic token, ignoring later switches without an error if a flag was selected', () => {
  const f = fixture('POINTS FED 1 INVALID'); run(f); assert.notEqual(f.out.drain(), abort); assert.equal(f.local.eflg, false);
  const g = fixture('POINTS 1 FED'); run(g); assert.equal(g.out.drain(), abort);
});

test('POINTS NTOK selects the parsing path but the scan continues through backing slots until a nonalpha or slot fifteen', () => {
  const f = fixture('POINTS ALL'); f.input.ntok = 2;
  for (let i = 2; i < 15; i++) Object.assign(f.input.tokens[i], { type: K.KALF, text: 'FED' });
  f.input.tokens[14].text = 'INVALID'; run(f); assert.equal(f.out.drain(), abort);
  const g = fixture('POINTS INVALID'); g.input.ntok = 1; run(g);
  assert.equal(g.local.iflg, true); assert.equal(g.local.fflg, false); assert.notEqual(g.out.drain(), abort);
});

test('POINTS ROMOPT filters Romulans and can turn a valid R-only request into incorrect input', () => {
  const f = fixture('POINTS R'); f.ctx.shared.romopt = 0n; run(f); assert.equal(f.out.drain(), abort);
  const g = fixture('POINTS ALL'); g.ctx.shared.romopt = 0n; run(g);
  assert.equal(g.local.rflg, false); assert.equal(g.out.drain().includes('Romulans'), false);
});

test('POINTS unselected zero divisors are not divided; selected zero divisor fails after its preceding output', () => {
  const f = fixture(); f.scores.ships.fill(0n); f.scores.turns.fill(0n); f.scores.numrom = 0n; run(f);
  const g = fixture('POINTS FED'); g.scores.ships[1] = 0n;
  assert.throws(() => run(g), /divide by zero/); assert.ok(g.out.drain().endsWith('Pts. / player:    '));
  const h = fixture(); h.ctx.shared.players[1].ship.turns = 0n;
  assert.throws(() => run(h), /divide by zero/); assert.ok(h.out.drain().endsWith('Pts. / stardate:  '));
});

test('POINTS additions wrap 36 bits and do not alter score input or accumulated turn points', () => {
  const f = fixture(); f.scores.setPlayer(1, 1, MAX_INTEGER); f.scores.setPlayer(2, 1, 1n);
  run(f); assert.equal(f.local.total[1], MIN_INTEGER); assert.equal(f.scores.player(1, 1), MAX_INTEGER);
});

test('POINTS rereads each score for accumulation after output instead of summing a captured report snapshot', () => {
  const f = fixture(); f.scores.setPlayer(1, 1, 10n); const original = f.out.oflt.bind(f.out); let changed = false;
  f.out.oflt = (value, width, verbosity) => {
    original(value, width, verbosity);
    if (!changed) { changed = true; f.scores.setPlayer(1, 1, 20n); }
  };
  run(f); assert.equal(f.local.total[1], 20n); assert.ok(f.out.drain().includes('Damage to enemies           1.0'));
});

test('POINTS self-only report preserves OWIDTH from earlier POLOCL state', () => {
  const f = fixture(); f.local.owidth = 91; run(f); assert.equal(f.local.owidth, 91);
});

test('POINTS final entry exposes unresolved DO continuation after zeroing totals and setting ALL flags', () => {
  const f = fixture('POINTS INVALID'); f.local.total.fill(77n); f.local.owidth = 99;
  assert.throws(() => points(f.ctx, f.input, f.local, f.out, true), UnresolvedPointsExecution);
  assert.deepEqual(f.local.total, [77n, 0n, 0n, 0n, 0n]); assert.equal(f.local.iflg, true); assert.equal(f.local.rflg, true);
  assert.equal(f.local.owidth, 99); assert.equal(f.out.drain(), '');
});

test('POINTS final compiler fixture can continue scanning stale tokens or leave the loop; neither is silently chosen', () => {
  const f = fixture('POINTS INVALID');
  points(f.ctx, f.input, f.local, f.out, true, { resumeFinalLoop: () => 2 }); assert.equal(f.out.drain(), abort);
  points(f.ctx, f.input, f.local, f.out, true, { resumeFinalLoop: () => null }); assert.ok(f.out.drain().includes('Total points'));
  assert.throws(() => points(f.ctx, f.input, f.local, f.out, true, { resumeFinalLoop: () => 0 }), /token-memory/);
});

test('POINTS pre-game ME/I are rejected and ordinary defaults exclude self but require SCORE(i,0) evaluation service', () => {
  for (const text of ['ME', 'I']) { const f = fixture('POINTS ' + text); f.ctx.who = 0; run(f); assert.equal(f.out.drain(), abort); }
  const f = fixture(); f.ctx.who = 0;
  assert.throws(() => run(f), /SCORE\(i,0\)/); assert.equal(f.local.iflg, false); f.out.drain();
  const reads: number[] = [];
  points(f.ctx, f.input, f.local, f.out, false, { pregameScoreRead: category => { reads.push(category); return 99999n; } });
  assert.deepEqual(reads, [1, 2, 3, 4, 5, 6, 7, 8]); assert.equal(f.local.total[1], 0n);
  const text = f.out.drain(); assert.equal(text.includes('Lexington'), false); assert.equal(text.includes('Damage to enemies'), false);
  assert.ok(text.includes('Federation')); assert.ok(text.includes('Empire')); assert.ok(text.includes('Romulans'));
});

test('POINTS consumes actual finishTurn score commits through dispatch without charging another turn', () => {
  const f = fixture('POINTS');
  const ctx = Object.assign(f.ctx, { prtype: 0, tpoint: [0n, 30n, 0n, 0n, 0n, 0n, 0n, 0n, -10n] });
  finish(finishTurn(ctx, false, f.out, { *repair() { assert.fail(); }, *baspha() { assert.fail(); },
    *plnatk() { assert.fail(); }, *basbld() { assert.fail(); }, *romdrv() { assert.fail(); } }));
  finish(dispatchCommand(ctx, 15, {
    *getcmd() { assert.fail(); }, *invoke(call) { assert.deepEqual(call, { routine: 'points', argument: false }); run(f); },
    *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn() { assert.fail('POINTS cannot charge a turn'); },
    movementContinuation() { assert.fail(); },
  }));
  assert.equal(f.local.total[1], 20n); assert.equal(f.ctx.shared.players[1].ship.turns, 3n);
  assert.equal(ctx.ptime, 99n); assert.deepEqual(ctx.tpoint.slice(1), Array(8).fill(0n));
});

test('leaveGame passes actual POINTS TOTAL(1) to statistics with an explicit final-loop compiler fixture', () => {
  const f = fixture('QUIT'), ctx = Object.assign(f.ctx, { hungup: 0n, ccflg: 0n, addrck: 0n });
  f.scores.setPlayer(1, 1, 999n); f.scores.setPlayer(8, 1, -100n);
  const records: StatisticsRecord[] = []; class Exit extends Error {}
  assert.throws(() => finish(leaveGame(ctx, {
    cctrap() {}, daytime() { return 2000n; },
    *points(final) { points(ctx, f.input, f.local, f.out, final, { resumeFinalLoop: () => null }); return f.local.total[1]; },
    *updsta(record) { records.push(record); }, *free() {}, exit() { throw new Exit(); },
  })), Exit);
  assert.equal(records[0].total, 899n); assert.equal(records[0].why, -1n); assert.equal(ctx.who, 0);
});
