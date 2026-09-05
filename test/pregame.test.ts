import test from 'node:test';
import assert from 'node:assert/strict';
import { EntryIdentity, PregameCommandLocals, pregame, getPregameCommand, dispatchPregame, pregameLiterals } from '../src/game/pregame.ts';
import type { PregameServices, PregameCall } from '../src/game/pregame.ts';
import { checkReentry, cancelCreation, ReentryLocals } from '../src/game/reentry-check.ts';
import type { ReentryServices } from '../src/game/reentry-check.ts';
import { KilledQueue } from '../src/game/lifecycle.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { constants as K, pregame as commandTable, restartBackup } from '../src/generated/source-data.ts';
import { restartBackupBytes, sourceFile } from '../tools/source.ts';
import { extraHelp, allHelp } from '../src/game/help.ts';
import { timeCommand } from '../src/game/time-command.ts';
import { password } from '../src/game/password.ts';
import { gtkn } from '../src/compat/gtkn.ts';
import { inputReady } from '../src/compat/wait.ts';
import { showStatistics } from '../src/game/show-statistics.ts';
import { StatisticsBuffer } from '../src/game/statistics.ts';

class MonitorExit extends Error {}
function fixture(lines: string[] = ['PREGAME', 'ACTIVATE']) {
  const ctx = { ccflg: 0n, hungup: 0n, pasflg: 0n }, input = new CommandInput(), local = new PregameCommandLocals(), out = new TerminalOutput();
  const identity = new EntryIdentity(Array<bigint>(200).fill(0n)), calls: string[] = [], invoked: PregameCall[] = [];
  const io: PregameServices<'line' | 'wait'> = {
    logical: word => word < 0n,
    *jobsta(args) { calls.push('jobsta'); [7n, 11n, 12n, 9n, 10n, 1200n].forEach((value, i) => { args[i].value = value; }); },
    ttyon() { calls.push('ttyon'); }, dmpbuf() { calls.push('dmpbuf'); },
    *input(ms) { calls.push('input:' + ms); return true; },
    *gtkn() { calls.push('gtkn'); if (!input.available) { yield 'line'; const line = lines.shift(); assert.notEqual(line, undefined); input.acceptLine(line!); } assert.ok(input.acquire(out)); },
    *monit() { calls.push('monit'); throw new MonitorExit(); },
    literal: key => pregameLiterals[key].text, // Explicit unpadded compiled-literal fixture.
    *invoke(call) { invoked.push(call); },
  };
  const run = () => pregame(ctx, identity, input, local, out, io);
  const command = () => getPregameCommand(ctx, input, local, out, io);
  return { ctx, input, local, out, identity, calls, invoked, io, run, command };
}
function finish<T>(r: Generator<unknown, T, void>): T { for (;;) { const next = r.next(); if (next.done) return next.value; } }

test('PREGAM JOBSTA arguments alias the actual first six LOCAL words, and blank initial NTOK returns', () => {
  const f = fixture(['']); f.identity.words[6] = 999n; finish(f.run());
  assert.deepEqual(f.identity.words.slice(0, 7), [7n, 11n, 12n, 9n, 10n, 1200n, 999n]);
  f.identity.arguments()[3].value = 44n; assert.equal(f.identity.ppn, 44n);
  assert.equal(f.out.drain(), '\r\nEnter HELp, PREgame, or blank\r\nline: ');
  assert.deepEqual(f.calls, ['jobsta', 'ttyon', 'gtkn']);
});

test('PREGAM initial prompt honors source keyword order, repeats on unknown, and invokes general help entries', () => {
  const f = fixture(['NO', 'HONORROLL', 'HELP', '']); finish(f.run());
  assert.deepEqual(f.invoked, [{ routine: 'shosta', argument: true }, { routine: 'hlpxtr' }, { routine: 'hlpall' }]);
  assert.equal(f.calls.filter(c => c === 'ttyon').length, 5); assert.equal(f.calls.filter(c => c === 'jobsta').length, 1);
  assert.equal(f.out.drain().split('Enter HELp').length - 1, 4);
});

test('PREGAM checks interruption after JOBSTA and after GTKN using the raw logical adapter', () => {
  const initial = fixture(); initial.ctx.ccflg = -1n; assert.throws(() => finish(initial.run()), MonitorExit);
  assert.deepEqual(initial.calls, ['jobsta', 'monit']); assert.equal(initial.out.drain(), '');
  const input = fixture(['']); const gt = input.io.gtkn;
  input.io.gtkn = function* () { yield* gt(); input.ctx.hungup = -1n; };
  assert.throws(() => finish(input.run()), MonitorExit); assert.equal(input.calls.at(-1), 'monit');
});

test('PREGAM entry text comes through required literal services before the exact PG prompt', () => {
  const f = fixture(); f.io.literal = key => pregameLiterals[key].text + '  \0ignored'; finish(f.run());
  assert.equal(f.out.drain(), '\r\nEnter HELp, PREgame, or blank\r\nline: \r\nNow entering DECWAR Pre-game; type\r\nACtivate to enter game.\r\nUse the HO command to view the honor roll.  \r\nUse the DO command to purchase  \r\ndocumentation for DECWAR.  \r\n\r\nPG> ');
  for (const key of ['honorInstruction', 'documentInstruction', 'documentInstructionEnd'] as const) {
    const literal = pregameLiterals[key]; assert.ok(sourceFile(literal.file).split('\n')[literal.line - 1].includes(literal.text));
  }
});

test('XGTCMD waits repeatedly without reprompt or extra flag checks until INPUT says ready', () => {
  const f = fixture(['TIME']); let polls = 0;
  f.ctx.ccflg = -1n;
  f.io.input = function* (ms) { assert.equal(ms, 10000n); yield 'wait'; return ++polls === 3; };
  const run = f.command(); assert.equal(run.next().value, 'wait'); assert.equal(f.ctx.ccflg, 0n);
  assert.equal(f.out.drain(), '\r\nPG> '); assert.equal(run.next().value, 'wait'); assert.equal(run.next().value, 'wait');
  assert.equal(run.next().value, 'line'); assert.equal(run.next().value, 11); assert.equal(f.out.drain(), '');
  assert.equal(f.calls.filter(c => c === 'dmpbuf').length, 1);
});

test('XGTCMD matches all sixteen public/special slots regardless of password and token type', () => {
  for (const item of commandTable) {
    const f = fixture([item.name]); const gt = f.io.gtkn;
    f.io.gtkn = function* () { yield* gt(); f.input.tokens[0].type = K.KINT; f.input.ntok = 0; };
    assert.equal(finish(f.command()), item.id); assert.equal(f.local.cmd, item.id); assert.equal(f.out.drain(), '\r\nPG> ');
  }
});

test('XGTCMD errors distinguish ambiguity, game-only commands and unknown tokens, always with HELP guidance', () => {
  const f = fixture(['', 'H', 'SHIELD', 'GARBAGE', 'ACTIVATE']); assert.equal(finish(f.command()), 1);
  assert.equal(f.out.drain(), '\r\nPG> \r\nPG> Ambiguous command -- for help type HELP\r\n\r\nPG> This command unavailable in Pre-game  -- for help type HELP\r\n\r\nPG> Unknown command -- for help type HELP\r\n\r\nPG> ');
});

test('XGTCMD retains the first matching CMD on ambiguity until it reads the next command', () => {
  const f = fixture(['T', 'TIME']), run = f.command(); assert.equal(run.next().value, 'line');
  assert.equal(run.next().value, 'line'); assert.equal(f.local.cmd, 11); assert.equal(f.local.i, 12);
  assert.equal(run.next().value, 11);
});

test('PREGAM dispatch preserves all sixteen calls and the zero-argument TYPE convention', () => {
  const f = fixture(); f.ctx.pasflg = -1n; f.io.monit = function* () { f.calls.push('monit-return-fixture'); };
  for (let id = 1; id <= 16; id++) assert.equal(finish(dispatchPregame(f.ctx, id, f.out, f.io)), id === 1 ? 'activate' : 'again');
  assert.deepEqual(f.invoked, [{ routine: 'gripe' }, { routine: 'help' }, { routine: 'shosta', argument: true },
    { routine: 'news' }, { routine: 'points', argument: false }, { routine: 'set' }, { routine: 'summar' },
    { routine: 'time' }, { routine: 'type' }, { routine: 'users' }, { routine: 'debug' }, { routine: 'paswrd' }, { routine: 'stazap' }]);
  assert.equal(f.out.drain(), pregameLiterals.documentMessage.text + '\r\n'); assert.deepEqual(f.calls, ['monit-return-fixture']);
});

test('PREGAM out-of-range computed GOTO activates, while *ZAP alone applies the password logical test', () => {
  const f = fixture(); for (const id of [-1, 0, 17]) assert.equal(finish(dispatchPregame(f.ctx, id, f.out, f.io)), 'activate');
  f.ctx.pasflg = 1n; finish(dispatchPregame(f.ctx, 16, f.out, f.io)); assert.deepEqual(f.invoked, []);
  f.io.logical = word => word !== 0n; finish(dispatchPregame(f.ctx, 16, f.out, f.io)); assert.deepEqual(f.invoked, [{ routine: 'stazap' }]);
});

test('PREGAM composes actual HELP and TIME, then password input gates the later ZAP dispatch', () => {
  const f = fixture(['HELP', 'PREGAME', 'TIME / *ZAP / *PASSWORD *MINK / *ZAP / ACTIVATE']); let zaps = 0;
  f.io.invoke = function* (call) {
    if (call.routine === 'hlpxtr') extraHelp(f.out);
    else if (call.routine === 'hlpall') allHelp(f.ctx.pasflg, f.out);
    else if (call.routine === 'time') timeCommand({ who: 0, gameStarted: 0n, shipStarted: 0n, shipRunStarted: 0n }, f.out,
      { daytime: () => 10000n, runtime: () => 1000n });
    else if (call.routine === 'paswrd') f.ctx.pasflg = password(f.input.tokens, 0, 0o337n, f.out);
    else if (call.routine === 'stazap') zaps++;
    else assert.fail(call.routine);
  };
  finish(f.run()); assert.equal(zaps, 1); assert.equal(f.ctx.pasflg, -2n);
  const text = f.out.drain(); assert.ok(text.includes('Commands are:')); assert.ok(text.includes("Game's elapsed time:  00:00:10"));
  assert.equal(f.calls.filter(c => c === 'jobsta').length, 1);
});

test('PREGAM → XGTCMD composes actual GTKN/INPUT command tails without an extra monitor read or sleep', () => {
  const f = fixture(); f.input.acceptLine('PREGAME / DOCUMENT / ACTIVATE');
  const state = Object.assign(f.ctx, { locked: 0n, svlock: 0n, ccflgDot: 0n, iniflg: 0n });
  const wait = { daytime() { assert.fail(); }, inputPending() { assert.fail(); }, unlo() { assert.fail(); },
    *lock() { assert.fail(); return false; }, *hibernate() { assert.fail(); } };
  f.io.gtkn = () => gtkn(state, f.input, f.out, { ...wait, *inli() { assert.fail(); } });
  f.io.input = ms => inputReady(state, () => f.input.available, () => ms, wait);
  finish(f.run()); assert.ok(f.out.drain().includes(pregameLiterals.documentMessage.text));
  assert.equal(f.input.available, false);
});

test('PREGAM honor-roll call passes the original logical argument to actual SHOSTA', () => {
  const f = fixture(['HONORROLL', '']); const ctx = { buffer: new StatisticsBuffer(), hungup: 0n, frebie: 0n, ccflg: 0n, terwid: 40n };
  f.io.invoke = function* (call) {
    assert.deepEqual(call, { routine: 'shosta', argument: true });
    yield* showStatistics(ctx, () => -1n, f.out, { // Explicit .TRUE. = -1 compiler fixture, not numeric 1.
      *open() { return { opened: true, lePpn: 0n, leName: 0n }; },
      *input(buffer) { buffer.words[3] = 1n; }, *close() {}, flushTerminal() {},
    });
  };
  finish(f.run()); assert.ok(f.out.drain().includes('The DECWAR Honor Roll'));
});

function reentry() {
  const killed = new KilledQueue(); killed.nkill = 1; Object.assign(killed.rows[1], { job: 7n, ppn: 9n, tty: 2n, time: 6000n });
  const ctx = { pasflg: -2n, endflg: 0n, killed }, identity = new EntryIdentity([7n, 0n, 0n, 9n, 10n, 1200n]);
  const input = new CommandInput(), local = new ReentryLocals(), out = new TerminalOutput(), calls: string[] = [];
  let now = 0n;
  const io: ReentryServices<'input'> = { logical: word => word < 0n, daytime: () => now,
    cctrap(name) { calls.push('trap:' + name); }, dmpbuf() { calls.push('flush'); },
    *input(ms) { calls.push('input:' + ms); yield 'input'; return false; },
    *gtkn() { assert.ok(input.acquire(out)); }, *endgam() { calls.push('endgam'); }, *cc1() { calls.push('cc1'); },
  };
  const run = () => checkReentry(ctx, identity, input, local, out, io);
  return { ctx, identity, input, local, out, calls, io, run, setNow(n: bigint) { now = n; } };
}

test('KILCHK resets PASFLG and uses actual KQSRCH, which updates matching terminal identity even with zero KWAIT', () => {
  const f = reentry(); assert.equal(K.KWAIT, 0); f.setNow(6001n); finish(f.run());
  assert.equal(f.ctx.pasflg, 0n); assert.equal(f.ctx.killed.rows[1].tty, 10n); assert.equal(f.out.drain(), ''); assert.deepEqual(f.calls, []);
  const missing = reentry(); missing.identity.words[3] = 8n; finish(missing.run()); assert.equal(missing.local.kindex, 0);
});

test('KILCHK initial timeout uses seconds, later timeout uses milliseconds, and BACKUP stops before its trailing bell', () => {
  assert.deepEqual(restartBackup, restartBackupBytes()); assert.deepEqual(restartBackup.bytes, [8, 8, 8, 8, 8, 8, 8, 8, 0, 7]);
  const f = reentry(), run = f.run(); assert.equal(run.next().value, 'input'); assert.equal(f.local.timlft, 6n);
  assert.equal(f.out.drain(), 'You are scheduled for reincarnation in 0 minutes and 6 seconds.\r\n\r\nTime left:  00:00:06');
  f.setNow(1000n); assert.equal(run.next().value, 'input'); assert.equal(f.local.timlft, 5000n);
  assert.equal(f.out.drain(), '\b'.repeat(8) + '00:00:05');
  f.setNow(6000n); assert.equal(run.next().done, true); assert.equal(f.out.drain(), '\r\n');
  assert.deepEqual(f.calls, ['trap:cc1', 'flush', 'input:6', 'flush', 'input:5000']);
});

test('KILCHK rereads clock after its announcement and clamps displayed wait before the first INPUT', () => {
  const f = reentry(); const values = [0n, 7000n, 7000n]; f.io.daytime = () => values.shift() ?? 7000n;
  const run = f.run(); assert.equal(run.next().value, 'input'); assert.equal(f.local.timlft, 1n);
  assert.ok(f.out.drain().startsWith('You are scheduled for reincarnation in 0 minutes and 1 seconds.'));
  assert.ok(f.calls.includes('input:1')); finish(run);
});

test('KILCHK exact password returns with PASFLG still false; prefix fails and calls CC1', () => {
  for (const [word, accepted] of [[K.KPASS, true], ['*MIN', false], ['OTHER', false]] as const) {
    const f = reentry(); f.input.acceptLine(word); f.io.input = function* () { return true; }; finish(f.run());
    assert.equal(f.calls.includes('cc1'), !accepted); assert.equal(f.ctx.pasflg, 0n);
  }
});

test('KILCHK endgame runs only after a timed-out INPUT and before recalculating time', () => {
  const f = reentry(); f.ctx.endflg = -1n; const run = f.run(); run.next(); f.setNow(6000n); finish(run);
  assert.equal(f.calls.at(-1), 'endgam');
  const typed = reentry(); typed.ctx.endflg = -1n; typed.input.acceptLine(K.KPASS); typed.io.input = function* () { return true; };
  finish(typed.run()); assert.ok(!typed.calls.includes('endgam'));
});

test('CC1/CC2 mutate creation counts before unlock/exit, retaining negative counts and unrelated fields', () => {
  for (const stage of ['cc1', 'cc2'] as const) {
    const ctx = { team: 2, numply: 0n, numsid: [0n, 5n, 0n] }, calls: string[] = [];
    finish(cancelCreation(stage, ctx, { *unlock(key) {
      assert.equal(ctx.numply, -1n); assert.equal(ctx.numsid[2], stage === 'cc2' ? -1n : 0n); calls.push(key);
    }, *exit() { calls.push('exit'); } }));
    assert.equal(ctx.numsid[1], 5n); assert.deepEqual(calls, ['frelok', 'exit']);
  }
});

test('KILCHK failed password composes CC1 against the actual shared creation count', () => {
  const f = reentry(), counts = { team: 1, numply: 1n, numsid: [0n, 0n, 0n] };
  f.input.acceptLine('NO'); f.io.input = function* () { return true; };
  f.io.cc1 = () => cancelCreation('cc1', counts, { *unlock() { f.calls.push('unlock'); }, *exit() { throw new MonitorExit(); } });
  assert.throws(() => finish(f.run()), MonitorExit); assert.equal(counts.numply, 0n); assert.equal(f.calls.at(-1), 'unlock');
});
