import test from 'node:test';
import assert from 'node:assert/strict';
import { StatisticsBuffer, updateStatistics, updateCommission } from '../src/game/statistics.ts';
import type { StatisticsContext, StatisticsServices, StatisticsFileBlock, StatisticsOpen } from '../src/game/statistics.ts';
import type { StatisticsRecord, CommandContext, GetCommandServices } from '../src/game/get-command.ts';
import { getCommand } from '../src/game/get-command.ts';
import { playerSlots } from '../src/game/player.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { KilledQueue, SavedShip, freeShip } from '../src/game/lifecycle.ts';
import type { LifecycleWorld, ReleaseServices } from '../src/game/lifecycle.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { emptyHit } from '../src/game/hit-queue.ts';
import { halfWords, MAX_INTEGER, MIN_INTEGER, signed36 } from '../src/compat/word36.ts';
import { statisticsText, commissionText } from '../src/generated/source-data.ts';
import { statisticsMessages } from '../tools/source.ts';

function finish<T>(run: Generator<never, T, void>): T {
  const step = run.next(); assert.equal(step.done, true); return step.value;
}
function fixture() {
  const ctx: StatisticsContext = { buffer: new StatisticsBuffer(), hungup: 0n, frebie: 0n };
  const record: StatisticsRecord = { ppn: 77n, name1: 11n, name2: 22n, shipName1: 33n, shipName2: 44n,
    total: 555n, elapsed: 2000n, why: 1n, teamIndex: 0, who: 1 };
  const files = { stared: new StatisticsBuffer(), stfred: new StatisticsBuffer() };
  const events: string[] = [], writes: bigint[][] = [], terminal: string[] = [];
  const opens: Partial<Record<StatisticsFileBlock, StatisticsOpen>> = {};
  const formatting = new TerminalOutput();
  let opened: StatisticsFileBlock = 'stared';
  const io: StatisticsServices<never> = {
    *lock(key) { events.push(`lock:${key}`); return true; }, unlo(key) { events.push(`unlo:${key}`); },
    *open(block) { events.push(`open:${block}`); opened = block; return opens[block] ?? { opened: true, lePpn: -1n }; },
    *input(buffer, descriptor) {
      events.push(`input:${descriptor}`); assert.ok(opened === 'stared' || opened === 'stfred');
      buffer.words.splice(0, 640, ...files[opened].words);
    },
    *output(buffer, descriptor) { events.push(`output:${descriptor}`); writes.push([...buffer.words]); },
    *close() { events.push('close'); }, date() { events.push('date'); return 123456n; },
    flushTerminal() { events.push('flush'); },
    outstr(text) { terminal.push(text); },
    odec(value) {
      events.push(`odec:${value}`);
      // This fixture selects buffered TTY output. Direct OUTSTR never passes
      // through this formatter and cannot change its cursor bookkeeping.
      if (ctx.hungup === 0n) { formatting.odec(value); terminal.push(formatting.drain()); }
    },
  };
  return { ctx, record, files, opens, events, writes, terminal, formatting, io };
}
function rows(buffer: StatisticsBuffer, team = 0): bigint[][] {
  return Array.from({ length: 10 }, (_, i) => buffer.words.slice(3 + team * 256 + i * 10, 13 + team * 256 + i * 10));
}
function fillRanking(buffer: StatisticsBuffer, team = 0): void {
  for (let i = 0; i < 10; i++) {
    const at = 3 + team * 256 + i * 10;
    buffer.words.splice(at, 10, BigInt(i + 100), 1n, 2n, 3n, 4n, 5n,
      BigInt(1000 - i * 100), 2000n, BigInt(800 + i), BigInt(900 + i));
  }
}
const first = '\r\nCongratulations, Captain! You\r\nare now in first place!\r\n';
const history = '...at least the history books\r\nwill remember you....\r\nfor a while!\r\n';
const rejected = "\r\nSorry, but you didn't make the\r\ncut!  Better luck next time!\r\n";

test('UPDSTA anonymous output text is extracted from the immutable source with physical CRLF and locations', () => {
  assert.deepEqual(statisticsText, statisticsMessages());
  assert.equal(statisticsText.length, 10); assert.equal(statisticsText[4].line, 5800);
  assert.equal(statisticsText[5].text.endsWith('next time! \r\n'), true);
});

test('UPDSTA minimum checks elapsed milliseconds, not score; rejected calls touch no state or services', () => {
  for (const elapsed of [-1n, 0n, 999n]) {
    const f = fixture(); f.ctx.buffer.words[0] = 99n; f.record.elapsed = elapsed; f.record.total = MAX_INTEGER;
    finish(updateStatistics(f.ctx, f.record, f.io));
    assert.deepEqual(f.events, []); assert.equal(f.ctx.buffer.words[0], 99n);
  }
  const f = fixture(); f.record.elapsed = 1000n; f.record.total = -1234n;
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.equal(f.writes[0][9], -1234n); assert.equal(f.writes[0][10], 1000n);
});

test('UPDSTA retries its lock without flushing or clearing again and exposes the wait', () => {
  const f = fixture(); f.ctx.buffer.words[0] = 99n;
  const io: StatisticsServices<'lock-wait'> = { ...f.io, *lock(key) {
    f.events.push(`lock:${key}`); yield 'lock-wait'; return f.events.filter(e => e === `lock:${key}`).length === 2;
  } };
  const run = updateStatistics(f.ctx, f.record, io);
  assert.deepEqual(run.next(), { value: 'lock-wait', done: false });
  assert.equal(f.ctx.buffer.words[0], 99n);
  assert.deepEqual(run.next(), { value: 'lock-wait', done: false });
  assert.equal(f.ctx.buffer.words[0], 99n);
  assert.equal(run.next().done, true);
  assert.deepEqual(f.events.slice(0, 4), ['flush', 'lock:staupd', 'lock:staupd', 'open:stared']);
});

test('UPDSTA inserts ten-word records, preserves unknown word eight and file header, and packs flags/mission halves', () => {
  const f = fixture(); f.files.stared.words[0] = 56n; f.files.stared.words[11] = 999n;
  f.files.stared.words[513] = (8n << 18n) | 19n; f.record.why = -1n;
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0].length, 640); assert.equal(f.writes[0][0], 56n);
  assert.deepEqual(rows(f.ctx.buffer)[0], [77n, 11n, 22n, 33n, 44n, 123456n, 555n, 2000n, 999n, signed36(halfWords(-1n, 19n))]);
  assert.equal(f.ctx.buffer.missions(1), (8n << 18n) | 19n);
  assert.equal(f.terminal.join(''), first);
  assert.equal(f.formatting.hcpos, 0); assert.equal(f.formatting.blank, 0);
  assert.deepEqual(f.events, ['flush', 'lock:staupd', 'open:stared', 'input:staiow', 'close', 'date',
    'open:staupd', 'output:staiow', 'close', 'unlo:staupd']);
});

test('UPDSTA higher scores insert first and shift every old word downward, dropping the tenth record', () => {
  const f = fixture(); fillRanking(f.files.stared); const old = rows(f.files.stared);
  f.record.total = 1001n; finish(updateStatistics(f.ctx, f.record, f.io));
  const after = rows(f.ctx.buffer); assert.equal(after[0][8], old[0][8]);
  assert.deepEqual(after.slice(1), old.slice(0, 9)); assert.equal(f.terminal.join(''), first);
});

test('UPDSTA middle and tenth placements retain exact text and only buffered digits affect HCPOS', () => {
  for (const [score, rank] of [[550n, 6], [150n, 10]] as const) {
    const f = fixture(); fillRanking(f.files.stared); f.record.total = score;
    finish(updateStatistics(f.ctx, f.record, f.io));
    assert.equal(rows(f.ctx.buffer)[rank - 1][0], f.record.ppn);
    assert.equal(f.terminal.join(''), rank === 6 ? '\r\nYou have placed as number 6!\r\n'
      : '\r\nWell, Captain, you at least\r\nmade tenth place!  Try harder\r\nnext time! \r\n');
    assert.equal(f.formatting.hcpos, rank === 6 ? 1 : 0);
  }
});

test('UPDSTA equal scores prefer longer elapsed times; equal/shorter times pass the old record', () => {
  for (const elapsed of [1999n, 2000n, 2001n]) {
    const f = fixture(); fillRanking(f.files.stared); f.record.total = 1000n; f.record.elapsed = elapsed;
    finish(updateStatistics(f.ctx, f.record, f.io));
    const at = elapsed > 2000n ? 0 : 1;
    assert.equal(rows(f.ctx.buffer)[at][0], 77n);
  }
});

test('UPDSTA middle-placement final OUTSTR stays unguarded when HUNGUP changes during output',()=>{
  const f=fixture();fillRanking(f.files.stared);const out=f.io.outstr;
  f.io.outstr=text=>{out(text);if(text===statisticsText[6].text)f.ctx.hungup=-1n;};
  finish(updateStatistics(f.ctx,f.record,f.io));assert.equal(f.terminal.join(''),statisticsText[6].text+statisticsText[7].text);
});

test('UPDSTA null PPN slot wins before score comparison, even with stale score and a negative new score', () => {
  const f = fixture(); f.files.stared.words[9] = MAX_INTEGER; f.record.total = MIN_INTEGER;
  finish(updateStatistics(f.ctx, f.record, f.io)); assert.equal(rows(f.ctx.buffer)[0][6], MIN_INTEGER);
});

test('UPDSTA uses a single team list for both living and killed players and nonzero team indices select Empire', () => {
  for (const teamIndex of [-1, 1, 7]) {
    const f = fixture(); fillRanking(f.files.stared); f.record.teamIndex = teamIndex; f.record.why = 0n;
    f.files.stared.words[359] = 123n; // Empire memorial list remains untouched.
    finish(updateStatistics(f.ctx, f.record, f.io));
    assert.deepEqual(rows(f.ctx.buffer), rows(f.files.stared));
    assert.equal(rows(f.ctx.buffer, 1)[0][0], 77n); assert.equal(f.ctx.buffer.words[359], 123n);
    assert.equal(f.ctx.buffer.killed(1), 1n); assert.equal(f.terminal.join(''), first + history);
  }
});

test('UPDSTA ignores a lower placement for an existing PPN but saves the killed counter when required', () => {
  for (const why of [0n, 1n, -1n]) {
    const f = fixture(); fillRanking(f.files.stared); f.record.ppn = 100n; f.record.why = why;
    finish(updateStatistics(f.ctx, f.record, f.io));
    assert.deepEqual(rows(f.ctx.buffer), rows(f.files.stared)); assert.equal(f.terminal.join(''), '');
    assert.equal(f.events.includes('date'), false); assert.equal(f.writes.length, why === 0n ? 1 : 0);
    assert.equal(f.ctx.buffer.killed(1), why === 0n ? 1n : 0n);
  }
});

test('UPDSTA higher placement keeps a previous lower entry for the same PPN', () => {
  const f = fixture(); fillRanking(f.files.stared); f.record.ppn = 105n; f.record.total = 2000n;
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.equal(rows(f.ctx.buffer)[0][0], 105n); assert.equal(rows(f.ctx.buffer)[6][0], 105n);
});

test('UPDSTA full-list rejection prints the source message and writes only if killed', () => {
  for (const why of [0n, 1n]) {
    const f = fixture(); fillRanking(f.files.stared); f.record.total = -1n; f.record.why = why;
    finish(updateStatistics(f.ctx, f.record, f.io));
    assert.equal(f.terminal.join(''), rejected); assert.equal(f.writes.length, why === 0n ? 1 : 0);
    assert.equal(f.events.includes('date'), false);
  }
});

test('UPDSTA killed consolation uses the previous count and total commissions with exact line breaks', () => {
  const f = fixture(); f.record.why = 0n; f.files.stared.words[523] = 3n; f.files.stared.words[513] = 12n;
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.equal(f.terminal.join(''), "\r\n\r\nDon't feel bad; the Lexington\r\nhas been destroyed 3 times\r\nout of 12 missions!\r\n" + first + history);
  assert.equal(f.ctx.buffer.killed(1), 4n); assert.equal(f.ctx.buffer.words[522], 0n);
  assert.equal(f.formatting.hcpos, 3); // Direct monitor newlines do not reset it.
});

test('UPDSTA counter increment wraps at 36 bits and suppresses consolation only when the new count is one', () => {
  const f = fixture(); f.record.why = 0n; f.files.stared.words[523] = MAX_INTEGER;
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.equal(f.ctx.buffer.killed(1), MIN_INTEGER);
  assert.ok(f.terminal.join('').includes(`destroyed ${MAX_INTEGER} times`));
});

test('UPDSTA failed normal input open skips the free read, but still writes to the free file', () => {
  const f = fixture(); f.ctx.frebie = -1n; f.ctx.buffer.words.fill(77n); f.opens.stared = { opened: false, lePpn: 0n };
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.deepEqual(f.events, ['flush', 'lock:staupd', 'open:stared', 'date', 'open:stfupd', 'output:staiow', 'close', 'unlo:staupd']);
  assert.equal(f.ctx.buffer.words[0], 0n); assert.equal(f.ctx.buffer.missions(1), 0n);
});

test('UPDSTA nonnegative LE.PPN skips INPUT but closes the successfully opened file', () => {
  for (const lePpn of [0n, 1n]) {
    const f = fixture(); f.opens.stared = { opened: true, lePpn }; f.files.stared.words[0] = 98n;
    finish(updateStatistics(f.ctx, f.record, f.io));
    assert.equal(f.events.includes('input:staiow'), false);
    assert.deepEqual(f.events.slice(2, 5), ['open:stared', 'close', 'date']);
    assert.equal(f.ctx.buffer.words[0], 0n);
  }
});

test('UPDSTA free-user read clears the entire normal buffer and selects STFIOW for input only', () => {
  const f = fixture(); f.ctx.frebie = -1n; f.files.stared.words.fill(77n); f.files.stfred.words[0] = 101n;
  f.files.stfred.words[513] = 27n;
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.deepEqual(f.events, ['flush', 'lock:staupd', 'open:stared', 'input:staiow', 'close',
    'open:stfred', 'input:stfiow', 'close', 'date', 'open:stfupd', 'output:staiow', 'close', 'unlo:staupd']);
  assert.equal(f.ctx.buffer.words[0], 101n); assert.equal(rows(f.ctx.buffer)[0][9], halfWords(1n, 27n));
  assert.equal(f.ctx.buffer.words[600], 0n);
});

test('UPDSTA free-file failure or nonnegative LE.PPN retains cleared storage, never the normal-file contents', () => {
  for (const open of [{ opened: false, lePpn: 0n }, { opened: true, lePpn: 0n }] as const) {
    const f = fixture(); f.ctx.frebie = -1n; f.files.stared.words.fill(88n); f.opens.stfred = open;
    finish(updateStatistics(f.ctx, f.record, f.io));
    assert.equal(f.ctx.buffer.words[0], 0n); assert.equal(f.ctx.buffer.words[600], 0n);
    assert.equal(f.events.includes('input:stfiow'), false);
  }
});

test('UPDSTA output open failure does not roll back memory or output and still releases the lock', () => {
  const f = fixture(); f.opens.staupd = { opened: false, lePpn: 0n };
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.equal(f.writes.length, 0); assert.equal(rows(f.ctx.buffer)[0][0], 77n);
  assert.equal(f.terminal.join(''), first); assert.equal(f.events.at(-1), 'unlo:staupd');
  assert.equal(f.events.filter(e => e === 'close').length, 1);
});

test('UPDSTA hungup suppresses direct text and flushes but still calls unguarded ODEC through its dispatch', () => {
  const f = fixture(); f.ctx.hungup = -1n; f.record.why = 0n; f.files.stared.words[523] = 9n;
  finish(updateStatistics(f.ctx, f.record, f.io));
  assert.deepEqual(f.terminal, []); assert.equal(f.events.includes('flush'), false);
  assert.deepEqual(f.events.filter(e => e.startsWith('odec:')), ['odec:9', 'odec:0']);
  assert.equal(f.writes.length, 1); assert.equal(f.ctx.buffer.killed(1), 10n);
});

test('GETCMD death records actual UPDSTA data before FREE clears the same JOB words', () => {
  const f = fixture(), players = playerSlots(), p = players[1], output = new TerminalOutput();
  p.ppn = 456n; p.name1 = 12n; p.name2 = 34n; p.started = 8000n; p.alive = -1n;
  p.ship.v = 20; p.ship.h = 30; p.ship.damage = 60000n;
  const world: LifecycleWorld & { comknt: bigint } = { players, board: new PackedBoard(), killed: new KilledQueue(),
    numply: 1n, numsid: [0n, 1n, 0n], endflg: 0n, hitime: 0n, comknt: 0n };
  const saved = new SavedShip(), registers = { ...emptyHit(), dbits: 0n };
  const release: ReleaseServices<never> = {
    *lock() { return true; }, unlock() {}, daytime() { return 11000n; },
    *trcoff() { assert.fail('No tractor'); }, *gethit() { assert.fail('No hits'); }, *getmsg() { assert.fail('No messages'); },
  };
  const ctx: CommandContext = { who: 1, team: 1, oflg: 0, prtype: 0, pasflg: 0n, ptime: 0n, ccflg: 0n, hungup: 0n, shared: world };
  const io: GetCommandServices<never> = {
    ttyon() {}, dmpbuf() {}, cctrap() {}, *pause() {}, *zaplok() { assert.fail('No input wait'); },
    *input() { assert.fail('No input'); }, *gtkn() { assert.fail('No input'); }, clear() {},
    *outhit() { assert.fail('No hits'); }, *outmsg() { assert.fail('No messages'); }, *endgam() { assert.fail('Death first'); },
    daytime() { return 10000n; }, *points() { return 789n; }, // Explicit unported scoring fixture.
    *updsta(record) { assert.equal(p.ppn, 456n); yield* updateStatistics(f.ctx, record, f.io); },
    *free(who) { assert.equal(f.writes.length, 1); yield* freeShip(world, saved, registers, who, release); },
  };
  assert.deepEqual(finish(getCommand(ctx, new CommandInput(), output, io)), { kind: 'dead' });
  assert.equal(ctx.who, 0); assert.equal(p.ppn, 0n); assert.equal(p.alive, 1n);
  const row = rows(f.ctx.buffer)[0];
  assert.deepEqual(row.slice(0, 5), [456n, 12n, 34n, p.shipName1, p.shipName2]);
  assert.equal(row[6], 789n); assert.equal(row[7], 2000n); assert.equal(row[9], 0n);
  assert.equal(f.ctx.buffer.killed(1), 1n); assert.equal(world.killed.rows[1].ppn, 456n);
});

test('UPDCAP game and mission announcements are extracted, preserve monitor output boundaries and omit the final newline', () => {
  assert.deepEqual(commissionText, statisticsMessages('updcap'));
  const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 0n });
  f.files.stared.words[0] = 42n; f.files.stared.words[513] = 5n;
  finish(updateCommission(ctx, 1, f.io));
  assert.equal(ctx.gameno, 43n); assert.equal(ctx.buffer.missions(1), 6n);
  assert.equal(f.terminal.join(''), '\r\nDECWAR game #43\r\n\r\nThis is mission #6 for the\r\nLexington');
  assert.equal(f.formatting.hcpos, 3); assert.equal(f.formatting.blank, 0);
  assert.deepEqual(f.events, ['lock:staupd', 'open:stared', 'input:staiow', 'close',
    'open:staupd', 'output:staiow', 'close', 'unlo:staupd', 'flush', 'odec:43', 'flush', 'odec:6', 'flush']);
});

test('UPDCAP existing game number prevents increment but still replaces GAMENO with the file value', () => {
  const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 100n }); f.files.stared.words[0] = 78n;
  finish(updateCommission(ctx, 6, f.io));
  assert.equal(ctx.gameno, 78n); assert.equal(ctx.buffer.missions(6), 1n); assert.equal(ctx.buffer.missions(1), 0n);
  assert.equal(f.terminal.join(''), '\r\nDECWAR game #78\r\n\r\nThis is mission #1 for the\r\nCobra');
});

test('UPDCAP increments game serial and mission count as 36-bit words', () => {
  const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 0n });
  f.files.stared.words[0] = MAX_INTEGER; f.files.stared.words[522] = MAX_INTEGER;
  finish(updateCommission(ctx, 10, f.io));
  assert.equal(ctx.gameno, MIN_INTEGER); assert.equal(ctx.buffer.missions(10), MIN_INTEGER);
});

test('UPDCAP failed or unread normal file starts from cleared memory, including when GAMENO was set', () => {
  for (const gameno of [0n, 100n]) {
    for (const opened of [false, true]) {
      const f = fixture(), ctx = Object.assign(f.ctx, { gameno }); f.ctx.buffer.words.fill(99n);
      f.opens.stared = { opened, lePpn: 0n }; f.files.stared.words.fill(123n);
      finish(updateCommission(ctx, 1, f.io));
      assert.equal(ctx.gameno, gameno === 0n ? 1n : 0n); assert.equal(ctx.buffer.words[600], 0n);
      assert.equal(ctx.buffer.missions(1), 1n); assert.equal(f.events.includes('input:staiow'), false);
      assert.equal(f.events.filter(e => e === 'close').length, opened ? 2 : 1);
    }
  }
});

test('UPDCAP free-user branch saves normal serial before reading free file and only increments free mission count', () => {
  const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 0n }); ctx.frebie = -1n;
  f.files.stared.words[0] = 20n; f.files.stared.words[513] = 12n;
  f.files.stfred.words[0] = 3n; f.files.stfred.words[513] = 4n; f.files.stfred.words[600] = 987n;
  finish(updateCommission(ctx, 1, f.io));
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[0][0], 21n); assert.equal(f.writes[0][513], 12n); assert.equal(f.writes[0][600], 0n);
  assert.equal(f.writes[1][0], 21n); assert.equal(f.writes[1][513], 5n); assert.equal(f.writes[1][600], 987n);
  assert.equal(ctx.gameno, 21n);
  assert.deepEqual(f.events.slice(0, 14), ['lock:staupd', 'open:stared', 'input:staiow', 'close',
    'open:staupd', 'output:staiow', 'close', 'open:stfred', 'input:staiow', 'close',
    'open:stfupd', 'output:staiow', 'close', 'unlo:staupd']);
});

test('UPDCAP free-user intermediate OPEN failures still reach source OUTPUT, INPUT and CLOSE instructions', () => {
  for (const lePpn of [-1n, 0n]) {
    const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 0n }); ctx.frebie = -1n;
    f.opens.staupd = { opened: false, lePpn: 0n }; f.opens.stfred = { opened: false, lePpn };
    f.files.stfred.words[513] = 9n;
    finish(updateCommission(ctx, 1, f.io));
    const position = f.events.indexOf('open:staupd');
    assert.deepEqual(f.events.slice(position, position + 3), ['open:staupd', 'output:staiow', 'close']);
    const free = f.events.indexOf('open:stfred');
    assert.equal(f.events[free + 1], lePpn < 0n ? 'input:staiow' : 'close');
    assert.equal(ctx.buffer.missions(1), lePpn < 0n ? 10n : 1n);
  }
});

test('UPDCAP final write failure still unlocks and announces the in-memory increment', () => {
  const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 0n }); f.opens.staupd = { opened: false, lePpn: 0n };
  finish(updateCommission(ctx, 1, f.io));
  assert.equal(f.writes.length, 0); assert.equal(ctx.buffer.missions(1), 1n);
  assert.equal(f.events.includes('unlo:staupd'), true); assert.ok(f.terminal.join('').includes('mission #1'));
});

test('UPDCAP hungup still invokes the unguarded game OUTSTR and both ODEC calls', () => {
  const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 0n }); ctx.hungup = -1n;
  finish(updateCommission(ctx, 1, f.io));
  assert.equal(f.terminal.join(''), '\r\nDECWAR game #');
  assert.deepEqual(f.events.filter(e => e.startsWith('odec:')), ['odec:1', 'odec:1']);
  assert.equal(f.events.includes('flush'), false);
});

test('UPDCAP retries the lock before clearing its saved buffer', () => {
  const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 0n }); ctx.buffer.words[0] = 89n;
  let tries = 0;
  const io: StatisticsServices<'wait'> = { ...f.io, *lock() { yield 'wait'; return ++tries === 2; } };
  const run = updateCommission(ctx, 1, io);
  assert.equal(run.next().value, 'wait'); assert.equal(ctx.buffer.words[0], 89n);
  assert.equal(run.next().value, 'wait'); assert.equal(ctx.buffer.words[0], 89n);
  assert.equal(run.next().done, true); assert.equal(ctx.gameno, 1n);
});

test('UPDCAP and UPDSTA share the actual file buffer layout for mission and killed counts', () => {
  const f = fixture(), ctx = Object.assign(f.ctx, { gameno: 0n });
  const output = f.io.output;
  f.io.output = function* (buffer, descriptor) {
    yield* output(buffer, descriptor);
    f.files.stared.words.splice(0, 640, ...buffer.words);
  };
  finish(updateCommission(ctx, 1, f.io)); f.record.why = 0n;
  finish(updateStatistics(ctx, f.record, f.io));
  assert.equal(ctx.buffer.missions(1), 1n); assert.equal(ctx.buffer.killed(1), 1n);
  assert.equal(rows(ctx.buffer)[0][9], 1n); assert.equal(ctx.buffer.words[0], 1n);
});
