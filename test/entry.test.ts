import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDecwar, runDecwar, fatalDecwar, FatalLocals, DecwarFatalTransfer, forceJobCheck } from '../src/game/entry.ts';
import type { EntryServices, StartupServices, DecwarLiteral } from '../src/game/entry.ts';
import { constants as K, messages as M, decwarText } from '../src/generated/source-data.ts';
import { decwarLiterals } from '../tools/source.ts';
import { CommandInput, resumeCommand } from '../src/compat/command-input.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { typeCommand } from '../src/game/type-command.ts';
import type { OutputSettings } from '../src/game/type-command.ts';
import { PlacementLocals } from '../src/game/place.ts';
import { pregame, PregameCommandLocals, pregameLiterals } from '../src/game/pregame.ts';
import { getCommand } from '../src/game/get-command.ts';
import type { GetCommandServices, StatisticsRecord } from '../src/game/get-command.ts';
import { freeShip, SavedShip } from '../src/game/lifecycle.ts';
import { emptyHit } from '../src/game/hit-queue.ts';
import { timeCommand } from '../src/game/time-command.ts';
import { quitCommand, leaveGame } from '../src/game/quit.ts';
import { setupFixture, finish, MonitorExit } from './support/setup-fixture.ts';
import { listCommand } from '../src/game/list.ts';
import { ListLocals } from '../src/game/list-state.ts';
import { listLiterals } from '../src/game/list-world.ts';

function startup(line = '') {
  const settings: OutputSettings = { oflg: 9, prtype: 9, scnflg: 9, icflg: 9, ocflg: 9, ttytyp: 9 };
  const shared = { versio: 0n }, input = new CommandInput(), out = new TerminalOutput(), events: string[] = [];
  const io: StartupServices<never> = {
    zeroLowSegment() { events.push('zero:LFZ-LLZ'); Object.assign(settings, { oflg: 0, prtype: 0, scnflg: 0, icflg: 0, ocflg: 0, ttytyp: 0 }); },
    literal: item => item.text, // Explicit unpadded, terminated FORTRAN bytes.
    *gtkn() { events.push('gtkn'); input.acceptLine(line); input.acquire(out); },
    *type(kind) { events.push(`type:${kind}`); }, *summar() { events.push('summar'); },
  };
  return { settings, shared, input, out, events, io, run: () => initializeDecwar(settings, shared, input, out, io) };
}

test('DECWAR literal catalog extracts six startup and twenty-seven fatal strings, retaining spelling, apostrophes and source lines', () => {
  assert.deepEqual(decwarText, decwarLiterals());
  assert.deepEqual(decwarText.startup.map(s => s.line), [35, 37, 38, 39, 40, 41]);
  assert.deepEqual(decwarText.fatal.map(g => g.length), [4, 6, 4, 8, 5]);
  assert.equal(decwarText.fatal[1][2].text, 'officer has been uable to diagnose it or to');
  assert.equal(decwarText.fatal[3][4].text, 'plastic which is nearly transparant to most');
  assert.equal(decwarText.fatal[4][1].text, "ship's computer became defective, and");
});

test('DECWAR startup keeps internal version 24 and original 2.3 banner, exact prompt lines and call order', () => {
  const f = startup(); finish(f.run());
  assert.equal(f.shared.versio, 24n);
  assert.equal(f.out.drain(), '[DECWAR Version 2.3, 20-Nov-81]\r\nAre you: \r\n1 Beginner\r\n2 Intermediate\r\n3 Expert\r\n \r\nWhich? ');
  assert.deepEqual(f.events, ['zero:LFZ-LLZ', 'gtkn', 'type:1', 'type:2', 'summar']);
});

test('DECWAR experience numeric values and five-character prefixes select the exact output/input settings', () => {
  for (const [lines, expected] of [
    [['1', 'B', 'BEGINNER', 'BEGINX'], [0, 0, 1, 1]],
    [['2', 'I', 'INTERMEDIATE'], [0, -1, 1, -1]],
    [['3', 'E', 'EXPERT'], [-1, -1, -1, -1]],
  ] as const) for (const line of lines) {
    const f = startup(line); finish(f.run());
    assert.deepEqual([f.settings.oflg, f.settings.prtype, f.settings.scnflg, f.settings.icflg], expected);
    assert.equal(f.settings.ocflg, 0); assert.equal(f.settings.ttytyp, 0);
  }
});

test('DECWAR invalid or blank experience input keeps zeroed defaults and never reprompts', () => {
  for (const line of ['', '4', 'UNKNOWN', 'BEGIX']) {
    const f = startup(line); finish(f.run()); assert.deepEqual(f.settings, { oflg: 0, prtype: 0, scnflg: 0, icflg: 0, ocflg: 0, ttytyp: 0 });
    assert.equal(f.events.filter(e => e === 'gtkn').length, 1);
  }
});

test('DECWAR experience checks numeric and text fields independently, ignoring NTOK and token type', () => {
  for (const [value, text, expected] of [[3n, 'B', 1], [1n, 'E', 1], [2n, 'E', 2], [0n, 'E', 3]] as const) {
    const f = startup(); f.io.gtkn = function* () { f.input.ntok = 0; Object.assign(f.input.tokens[0], { value, text, type: K.KEOL }); };
    finish(f.run()); assert.equal(f.settings.icflg, expected === 1 ? 1 : -1); assert.equal(f.settings.oflg, expected === 3 ? -1 : 0);
  }
});

test('DECWAR startup uses explicit compiled literals and does not invent preference defaults beyond the assignments', () => {
  const f = startup('UNKNOWN'); f.io.zeroLowSegment = () => {}; f.io.literal = item => item.text + '\0unreachable';
  finish(f.run()); assert.equal(f.settings.oflg, 0); assert.equal(f.settings.scnflg, 9); assert.equal(f.settings.icflg, 9);
  assert.equal(f.settings.ocflg, 9); assert.ok(!f.out.drain().includes('unreachable'));
});

test('DECWAR startup composes TYPE(1)/TYPE(2), including TTYTYP=0 alias and unchanged coordinate-output mode', () => {
  const f = startup('3');
  f.io.type = function* (kind) {
    const result = typeCommand(kind, f.settings, { romulan: false, blackHoles: true }, f.input.tokens, f.out).next();
    assert.equal(result.done, true);
  };
  finish(f.run()); const text = f.out.drain();
  assert.ok(text.includes('Terminal type:  PRega')); assert.ok(text.includes(M.bthfrm.text + M.type09.text));
  assert.ok(text.includes(M.inform.text + M.type04.text)); assert.ok(text.includes(M.type06.text)); assert.ok(text.includes(M.setu07.text));
  assert.equal(text.split(M.decver.text).length - 1, 2);
});

test('DECWAR startup SUMMAR consumes the remaining experience command tokens through actual LIST routines', () => {
  const f = startup('EXPERT BAD'), setup = setupFixture();
  const world = Object.assign(setup.world, { erom: 0n, locr: { v: 0, h: 0 } }); const local = new ListLocals();
  f.io.summar = function* () {
    listCommand({ who: 0, team: 0, password: false, oflg: f.settings.oflg, ocflg: f.settings.ocflg }, K.SUMCMD,
      f.input, local, world, f.out, { logical: w => w < 0n, ownPosition: () => ({ v: 0, h: 0 }),
        literal: key => listLiterals[key].text, dummy: { value: 0n }, implicitShipWord: () => 0n });
    // The WHO=0 coordinate view and compiler locals above are explicit fixtures.
  };
  finish(f.run()); assert.ok(f.out.drain().includes('BAD')); assert.equal(f.input.tokens[0].text, 'EXPER');
});

function entry(lines = ['3', '', 'F', 'L', 'TIME', 'QUIT', 'YES']) {
  const f = setupFixture(lines); const world = Object.assign(f.world, { versio: 0n, comknt: 0n });
  const ctx = {
    oflg: 0, prtype: 0, scnflg: 0, icflg: 0, ocflg: 0, player: 0n, ptime: 0n, pasflg: 0n, addrck: 0n,
    get who() { return f.ctx.who; }, set who(n: number) { f.ctx.who = n; },
    get team() { return f.ctx.team; }, set team(n: number) { f.ctx.team = n; },
    get ttytyp() { return Number(f.ctx.ttytyp); }, set ttytyp(n: number) { f.ctx.ttytyp = BigInt(n); },
    get ccflg() { return f.ctx.ccflg; }, set ccflg(n: bigint) { f.ctx.ccflg = n; },
    get hungup() { return f.ctx.hungup; }, set hungup(n: bigint) { f.ctx.hungup = n; }, shared: world,
  };
  const records: StatisticsRecord[] = [], saved = new SavedShip(), seq = { jsqtim: 555n };
  const lifecycle = {
    *lock() { return true; }, unlock() { f.events.push('free-unlock'); }, daytime: f.io.daytime,
    *trcoff() { assert.fail(); }, *gethit() { assert.fail(); }, *getmsg() { assert.fail(); },
  };
  const leave = {
    cctrap() { f.events.push('leave-cctrap'); }, daytime: f.io.daytime,
    *points(final: true) { assert.equal(final, true); return 23n; }, // Explicit final-DO compiler fixture.
    *updsta(record: StatisticsRecord) { records.push(record); },
    *free(who: number) { yield* freeShip(world, saved, { ...emptyHit(), dbits: 0n }, who, lifecycle); },
    exit(): never { throw new MonitorExit(); },
  };
  const command: GetCommandServices<'line' | 'unlock' | 'commission'> = {
    ttyon() {}, dmpbuf() {}, *pause() {}, *zaplok() {}, *input() { return true; },
    gtkn: f.io.gtkn, clear() { f.input.discardTail(); }, *outhit() { assert.fail(); }, *outmsg() { assert.fail(); }, *endgam() {},
    ...leave,
  };
  let installed = 0;
  const io: EntryServices<'line' | 'unlock' | 'commission'> = {
    zeroLowSegment() {
      f.events.push('zero:LFZ-LLZ'); Object.assign(ctx, { who: 0, team: 0, oflg: 0, prtype: 0, scnflg: 0, icflg: 0, ocflg: 0, ttytyp: 0,
        player: 0n, ptime: 0n, pasflg: 0n, ccflg: 0n });
      f.out.hcpos = f.out.blank = 0; f.input.ntok = 0;
      for (const t of f.input.tokens) Object.assign(t, { value: 0n, text: '', type: 0, offset: 0 });
      for (const g of f.ctx.groups) Object.assign(g, { name: 0n, bits: 0n });
    },
    literal: item => item.text, gtkn: f.io.gtkn,
    *type(kind) { f.events.push(`type:${kind}`); yield* resumeCommand(typeCommand(kind, ctx, { romulan: world.romopt < 0n, blackHoles: world.blhopt < 0n }, f.input.tokens, f.out), f.input, f.out); },
    *summar() { f.events.push('initial-summar'); }, // Full LIST composition is tested separately with explicit WHO=0 memory.
    *pregam() { f.events.push('pregam'); yield* pregame(ctx, f.identity, f.input, new PregameCommandLocals(), f.out, {
      ...f.io, ttyon() {}, dmpbuf() {}, *input() { return true; }, *monit() { throw new MonitorExit(); },
      literal: key => pregameLiterals[key].text, *invoke() { assert.fail('unexpected pre-game command'); },
    }); },
    ttyon() { f.events.push('entry-ttyon'); }, setup: f.run,
    aprset(label) { installed = label; f.events.push(`aprset:${label}`); }, iran: f.io.iran,
    *getcmd() { f.events.push('getcmd'); const result = yield* getCommand(ctx, f.input, f.out, command); return result.kind === 'command' ? result.id : 0; },
    *invoke(call) {
      assert.equal(call.routine, 'time'); f.events.push('time'); const job = world.players[ctx.who].job;
      timeCommand({ who: ctx.who, gameStarted: world.tim0, shipStarted: job[K.KJOBTM], shipRunStarted: job[K.KRUNTM] }, f.out, { daytime: f.io.daytime, runtime: f.io.runtime });
    },
    *quit() { yield* quitCommand(ctx, f.input, f.out, { ...leave, gtkn: f.io.gtkn, clear: command.clear }); },
    *leave() { yield* leaveGame(ctx, leave); },
    *finishTurn() { assert.fail('No timed command in this fixture'); }, movementContinuation() { assert.fail(); },
  };
  f.io.frcchk = function* () { forceJobCheck(seq); };
  const placement = new PlacementLocals(), fatal = new FatalLocals();
  return { ...f, ctx, world, io, records, saved, seq, fatal, installed: () => installed,
    run: () => runDecwar(ctx, world, f.input, placement, fatal, f.out, io) };
}

test('DECWAR application entry composes experience, TYPE, PREGAM, SETUP, PLACE, GETCMD, TIME and QUIT/FREE', () => {
  const f = entry(); assert.throws(() => finish(f.run()), MonitorExit);
  assert.equal(f.installed(), 9999); assert.equal(f.world.versio, 24n); assert.equal(f.seq.jsqtim, 0n);
  assert.equal(f.ctx.who, 0); assert.equal(f.world.numply, 0n); assert.equal(f.world.numsid[1], 0n);
  assert.equal(f.world.players[1].alive, 1n); assert.equal(f.world.board.disp(1, 1), 0);
  assert.equal(f.saved.tshpco[K.KVPOS], 1n); assert.equal(f.saved.tshpco[K.KHPOS], 1n);
  assert.equal(f.records.length, 1); assert.equal(f.records[0].why, -1n); assert.equal(f.records[0].who, 1);
  assert.equal(f.ctx.ttytyp, 8); assert.equal(f.ctx.oflg, -1); assert.equal(f.ctx.icflg, -1);
  const events = f.events; assert.ok(events.indexOf('pregam') < events.indexOf('entry-ttyon'));
  assert.ok(events.indexOf('updcap:1') < events.indexOf('aprset:9999')); assert.ok(events.indexOf('aprset:9999') < events.indexOf('getcmd'));
  assert.ok(f.out.drain().includes(M.time01.text));
});

test('DECWAR WHO=0 from real GETCMD death re-enters PREGAM/SETUP and places the recommissioned ship without startup again', () => {
  const f = entry(['1', '', 'F', 'L', '', 'QUIT', 'YES']); const get = f.io.getcmd; let commands = 0;
  f.io.getcmd = function* () { if (++commands === 1) f.world.players[f.ctx.who].ship.energy = 0n; return yield* get(); };
  assert.throws(() => finish(f.run()), MonitorExit);
  assert.equal(f.events.filter(e => e === 'zero:LFZ-LLZ').length, 1); assert.equal(f.events.filter(e => e === 'type:1').length, 1);
  assert.equal(f.events.filter(e => e === 'pregam').length, 2); assert.equal(f.events.filter(e => e === 'aprset:9999').length, 2);
  assert.equal(f.world.numshp[1], 2n); assert.equal(f.world.killed.nkill, 1); assert.equal(f.records.length, 2);
  assert.deepEqual(f.records.map(r => r.why), [0n, -1n]); assert.equal(f.saved.tshpco[K.KHPOS], 2n);
});

test('DECWAR installs APR target before initial ship placement and retains live coordinate writes on failure', () => {
  const f = entry(); const iran = f.io.iran; let draw = 0;
  f.io.iran = n => {
    if (n === 5n) return 5n;
    assert.equal(f.installed(), 9999);
    if (++draw === 2) { assert.equal(f.world.players[1].ship.v, 1); f.ctx.addrck = -1n; throw new DecwarFatalTransfer(); }
    return iran(n);
  };
  f.io.leave = function* () {
    assert.equal(f.world.players[1].ship.v, 1); assert.equal(f.world.players[1].ship.h, 0);
    // FREE on this half-written coordinate requires the faulting DISP adapter.
    // Verify the transfer boundary without pretending that adapter exists.
    throw new MonitorExit();
  };
  assert.throws(() => finish(f.run()), MonitorExit); assert.equal(f.ctx.addrck, -1n);
  assert.ok(f.out.drain().includes('torn your ship apart.')); assert.ok(!f.events.includes('getcmd'));
});

test('DECWAR explicit fatal transfer during command execution uses fatal text then existing final-score/statistics/FREE path', () => {
  const f = entry(); f.io.getcmd = function* () { f.ctx.addrck = -1n; throw new DecwarFatalTransfer(); };
  const iran = f.io.iran; f.io.iran = n => n === 5n ? 2n : iran(n);
  assert.throws(() => finish(f.run()), MonitorExit); assert.equal(f.fatal.i, 2n); assert.equal(f.ctx.who, 0);
  assert.equal(f.records[0].why, 0n); assert.equal(f.records[0].total, 23n); assert.equal(f.world.players[1].alive, 1n);
  assert.ok(f.out.drain().includes('officer has been uable to diagnose it or to'));
});

test('DECWAR does not convert ordinary runtime/compatibility exceptions into random deaths', () => {
  const f = entry(); const error = new Error('unresolved compiler memory'); f.io.getcmd = function* () { throw error; };
  assert.throws(() => finish(f.run()), e => e === error); assert.equal(f.records.length, 0); assert.equal(f.world.players[1].alive, -1n);
  assert.equal(f.fatal.i, 0n); assert.equal(f.ctx.who, 1);
});

test('fatal DECWAR makes exactly one IRAN(5) call after CRLFs and selects each original branch', () => {
  const phrases = ['Romulan\'s energy banks!', 'you.', 'remain undetected for several decades.', 'of glory!', 'torn your ship apart.'];
  for (let i = 1; i <= 5; i++) {
    const out = new TerminalOutput(), local = new FatalLocals(), calls: string[] = [], selected: DecwarLiteral[] = [];
    finish(fatalDecwar(local, out, { iran(n) { assert.equal(n, 5n); assert.equal(out.drain(), '\r\n'); calls.push('iran'); return BigInt(i); },
      literal(item) { selected.push(item); return item.text; }, *leave() { calls.push('leave'); } }));
    assert.deepEqual(calls, ['iran', 'leave']); assert.equal(local.i, BigInt(i));
    assert.deepEqual(selected, decwarText.fatal[i - 1]); assert.ok(out.drain().endsWith(phrases[i - 1] + '\r\n'));
  }
});

test('fatal DECWAR preserves computed-GOTO fallthrough and compiled literal output bytes', () => {
  for (const choice of [-1n, 0n, 6n]) {
    const out = new TerminalOutput(), local = new FatalLocals();
    finish(fatalDecwar(local, out, { iran: () => choice, literal: item => item.text + '  \0ignored', *leave() {} }));
    assert.equal(local.i, choice); assert.equal(out.drain(), '\r\nThe Romulans have devised a fiendish new  \r\nweapon!  Your ship and crew have been  \r\nreduced to quarks and now reside in the  \r\nRomulan\'s energy banks!  \r\n');
  }
});

test('FRCCHK clears JSQTIM only and does not activate unreachable sequence checks', () => {
  const state = { jsqtim: 777n, jsqwho: 3n, jsqtab: [1n, 2n, 3n] }; forceJobCheck(state);
  assert.deepEqual(state, { jsqtim: 0n, jsqwho: 3n, jsqtab: [1n, 2n, 3n] });
});

test('DECWAR entry composes first-player universe creation with final ship placement and ordinary command cleanup', () => {
  const f = entry(['2', '', '', '', '', 'F', 'L', 'TIME', 'QUIT', 'YES']); f.world.tim0 = -1n;
  assert.throws(() => finish(f.run()), MonitorExit);
  assert.equal(f.world.nplnet, 60); assert.equal(f.world.romopt, -1n); assert.equal(f.world.blhopt, 0n);
  assert.equal(f.world.nbase[1], 10n); assert.equal(f.world.nbase[2], 10n);
  assert.deepEqual([f.saved.tshpco[K.KVPOS], f.saved.tshpco[K.KHPOS]], [3n, 41n]);
  assert.equal(f.world.board.disp(3, 41), 0); assert.equal(f.world.board.disp(1, 1), K.DXFBAS * 100 + 1);
  assert.equal(f.world.numply, 0n); assert.equal(f.records.length, 1); assert.equal(f.records[0].why, -1n);
});

test('DECWAR startup continues after GTKN returns with interruption and preserves fields outside LFZ:LLZ', () => {
  const f = startup('2'); const state = Object.assign(f.settings, { hungup: -1n, addrck: -1n, lkfail: -1n, terwid: 80n, ccflg: -1n });
  const read = f.io.gtkn; f.io.gtkn = function* () { yield* read(); state.ccflg = -1n; };
  finish(f.run()); assert.equal(f.events.at(-1), 'summar'); assert.equal(f.settings.icflg, -1);
  assert.deepEqual([state.hungup, state.addrck, state.lkfail, state.terwid], [-1n, -1n, -1n, 80n]);
});

test('fatal DECWAR CRLF suppression depends on the preexisting terminal cursor state', () => {
  const out = new TerminalOutput(); out.write('pending text');
  finish(fatalDecwar(new FatalLocals(), out, { iran() { assert.equal(out.drain(), 'pending text\r\n\r\n'); return 3n; }, literal: s => s.text, *leave() {} }));
  assert.ok(out.drain().startsWith('Due to a design error,'));
});
