import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, setupLiterals, setupGroupNames } from '../src/game/setup.ts';
import { place } from '../src/game/place.ts';
import { shipWords } from '../src/game/player.ts';
import { pregame, PregameCommandLocals, pregameLiterals } from '../src/game/pregame.ts';
import { SavedShip, freeShip } from '../src/game/lifecycle.ts';
import { DecwarRandom } from '../src/compat/random.ts';
import { emptyHit } from '../src/game/hit-queue.ts';
import { gtkn } from '../src/compat/gtkn.ts';
import { packAscii, signed36, MIN_INTEGER, MAX_INTEGER } from '../src/compat/word36.ts';
import { constants as K, ships } from '../src/generated/source-data.ts';
import { sourceFile } from '../tools/source.ts';
import { updateCommission, StatisticsBuffer } from '../src/game/statistics.ts';
import type { StatisticsServices } from '../src/game/statistics.ts';

import { setupFixture as fixture, finish, MonitorExit } from './support/setup-fixture.ts';

test('SETUP full-segment path checks equality, calls FRCCHK/JOBSTA first and exits without taking the lock', () => {
  const f = fixture(); f.world.numply = 10n; assert.throws(() => finish(f.run()), MonitorExit);
  assert.deepEqual(f.events, ['frcchk', 'jobsta', 'kilhgh', 'start', 'exit']); assert.equal(f.ctx.who, 0);
  assert.equal(f.world.numply, 10n); assert.equal(f.out.drain(), '\r\nSorry, but all ships are in use.\r\nI will start a new game.\r\n');
  const over = fixture(); over.world.numply = 11n; finish(over.run()); assert.equal(over.world.numply, 12n); assert.ok(!over.events.includes('start'));
});

test('SETUP retries failed locks and checks interrupt before LKFAIL without incrementing NUMPLY', () => {
  const f = fixture(); let attempts = 0;
  f.io.lock = function* () { f.events.push('lock-attempt'); f.ctx.lkfail = ++attempts === 1 ? -1n : 0n; };
  finish(f.run()); assert.equal(attempts, 2); assert.equal(f.world.numply, 1n);
  assert.deepEqual(f.events.slice(0, 7), ['frcchk', 'jobsta', 'cctrap:undefined', 'lock-attempt', 'lock-attempt', 'cctrap:cc1', 'daytime']);
  const abort = fixture(); abort.io.lock = function* () { abort.ctx.lkfail = -1n; abort.ctx.hungup = -1n; };
  assert.throws(() => finish(abort.run()), MonitorExit); assert.equal(abort.world.numply, 0n); assert.ok(!abort.events.includes('cc1'));
});

test('SETUP existing-universe selection preserves the explicit clock/OR evaluation contract', () => {
  for (const eager of [false, true]) {
    const f = fixture(); f.world.numply = 2n;
    f.io.or = (left, right) => eager ? [left(), right()].some(Boolean) : left() || right();
    finish(f.run()); assert.equal(f.events.filter(e => e === 'daytime').length, eager ? 3 : 2);
    assert.ok(!f.events.includes('zero:HFZ-HLZ'));
  }
  const expired = fixture(['', '', '', '', 'L']); expired.world.hitime = 1000n; finish(expired.run());
  assert.ok(expired.events.includes('zero:HFZ-HLZ')); assert.equal(expired.world.tim0, 1000n);
});

test('SETUP ended universe retains the incremented player count, kills the segment and exits before selection', () => {
  const f = fixture(); f.world.endflg = -1n;
  assert.throws(() => finish(f.run()), MonitorExit); assert.equal(f.world.numply, 1n);
  assert.equal(f.events.at(-2), 'kilhgh'); assert.equal(f.events.at(-1), 'exit'); assert.ok(!f.events.some(e => e.startsWith('unlock:')));
  assert.equal(f.out.drain(), '\r\nThis particular galaxy has been depopulated!!\r\nPlease try again.  A new battle is forming now!!\r\n');
});

test('SETUP existing option notices precede team counts and the original default ship prompt bytes', () => {
  const f = fixture(); f.world.romopt = f.world.blhopt = -1n; finish(f.run());
  assert.equal(f.ctx.team, 1); assert.equal(f.ctx.who, 1); assert.equal(f.ctx.ttytyp, 8n);
  assert.equal(f.out.drain(), '\r\nThere are Romulans in this game.\r\nThere are Black holes in this game.\r\n\r\nCurrently there are 0\r\nFederation ships and 0\r\nEmpire ships.\r\n\r\nWhich side do you wish to join?\r\n(Federation or Empire) \r\nYou will join the Federation.\r\n\r\nThese vessels are available:\r\n\r\nLexington \r\nNimitz    \r\nSavannah  \r\nVulcan    \r\nYorktown  \r\n\r\nWhich vessel do you desire? ');
});

test('SETUP reserves after unlock and UPDCAP, resets only selected scores/ship words and preserves unrelated state', () => {
  const f = fixture(); const p = f.world.players[1]; p.ship.tractor = 2; p.ship.docked = true; p.active = -1n; p.hitflg = 8n; p.msgflg = 9n;
  p.ship.energy = 3n; p.ship.devices.fill(700n); const run = f.run();
  assert.equal(run.next().value, 'line'); assert.equal(run.next().value, 'line');
  assert.equal(run.next().value, 'unlock'); assert.equal(p.alive, 1n); assert.equal(f.world.scores.player(1, 1), 99n);
  assert.equal(run.next().value, 'commission'); assert.equal(p.alive, 1n); assert.equal(f.world.scores.player(1, 1), 99n);
  finish(run); assert.equal(p.alive, -1n); assert.equal(f.world.numsid[1], 1n); assert.equal(f.world.scores.ships[1], 1n);
  for (let i = 1; i <= K.KNPOIN; i++) { assert.equal(f.world.scores.player(i, 1), 0n); assert.equal(f.world.scores.player(i, 2), 99n); }
  assert.equal(f.world.scores.team(1, 1), 88n);
  assert.deepEqual(shipWords(p.ship), [0n, 0n, 0n, 0n, BigInt(K.GREEN), 10n, 1n, 5n, 50000n, 0n, 1000n]);
  assert.deepEqual(p.ship.devices.slice(1), Array(K.KNDEV).fill(0n)); assert.equal(p.ship.devices[0], 700n);
  assert.equal(p.ship.tractor, 2); assert.equal(p.ship.docked, true); assert.equal(p.active, -1n); assert.equal(p.hitflg, 8n); assert.equal(p.msgflg, 9n);
  assert.deepEqual(p.job.slice(1), [7n, 11n, 12n, 9n, 10n, 2400n, 8n, 1000n, 45n]);
  assert.equal(f.identity.words[6], 777n); assert.equal(f.world.board.disp(1, 1), 0);
});

test('SETUP preserves all seven compiled group words and literal masks with the source friendly/enemy indices', () => {
  for (const team of [1, 2]) {
    const f = fixture([team === 1 ? 'F' : 'E', team === 1 ? 'L' : ships[5].name]); finish(f.run());
    assert.deepEqual(f.ctx.groups.slice(1).map(g => g.name), setupGroupNames.map(f.io.groupWord));
    assert.deepEqual(f.ctx.groups.slice(1).map(g => g.bits), [0o1777n, 0o1740n, 0o1740n, 0o37n, 0o37n, team === 1 ? 0o37n : 0o1740n, team === 1 ? 0o1740n : 0o37n]);
    assert.deepEqual(f.ctx.groups[0], { name: 9n, bits: 9n });
  }
  for (const literal of Object.values(setupLiterals)) assert.ok(sourceFile('SETUP.FOR').split('\n')[literal.line - 1].includes(literal.text));
});

test('SETUP terminal speed scans all JOB rows using ALIVE(WHO), including vacant rows; zero overrides slow classification', () => {
  for (const [speed, cls] of [[0n, 1n], [300n, 3n], [1200n, 2n], [2400n, 1n]]) {
    const f = fixture(); for (const p of f.world.players.slice(1)) p.job[K.KTTYSP] = 9600n;
    f.world.players[10].job[K.KTTYSP] = speed; assert.equal(f.world.players[10].alive, 1n);
    finish(f.run()); assert.equal(f.identity.words[5], speed); assert.equal(f.world.slwest, cls);
  }
  const f = fixture(); f.io.trueWord = 1n; finish(f.run()); assert.equal(f.identity.words[5], 9600n); assert.equal(f.world.slwest, 1n);
});

test('SETUP team imbalance forces the smaller side; ties default to Federation and one-player gap still prompts', () => {
  for (const [left, right, team, prompt] of [[3n, 1n, 2, false], [1n, 3n, 1, false], [2n, 1n, 2, true], [1n, 1n, 1, true]] as const) {
    const f = fixture(prompt ? ['', ships[(team - 1) * 5].name] : [ships[(team - 1) * 5].name]);
    f.world.numsid[1] = left; f.world.numsid[2] = right; finish(f.run()); assert.equal(f.ctx.team, team);
    assert.equal(f.events.filter(e => e === 'gtkn').length, prompt ? 2 : 1);
  }
});

test('SETUP ship selection takes first prefix match across both teams, then checks side and availability', () => {
  const f = fixture(['BAD', 'F', ships[5].name, 'XYZ', 'L', 'N']); f.world.players[1].alive = -1n; finish(f.run());
  assert.equal(f.ctx.who, 2); assert.equal(f.world.numsid[1], 1n); assert.equal(f.world.numshp[1], 1n);
  const text = f.out.drain(); assert.equal(text.split('These vessels').length - 1, 4);
  assert.equal(text.split('Sorry').length - 1, 1); assert.ok(!text.includes('Ambiguous'));
});

test('SETUP returning player retains positive-ALIVE ship with no selection prompt and refreshes killed TTY', () => {
  const f = fixture([]); f.killed(4, 1); finish(f.run());
  assert.equal(f.ctx.who, 4); assert.equal(f.ctx.team, 1); assert.equal(f.world.killed.rows[1].tty, 10n);
  assert.equal(f.out.drain(), '\r\n'); assert.ok(!f.events.includes('gtkn')); assert.equal(f.world.numshp[1], 1n);
});

test('SETUP returning player with a full fleet can defect, or cancel without decrementing NUMSID', () => {
  const yes = fixture(['Y', ships[5].name]); yes.killed(); yes.world.numsid[1] = 5n; finish(yes.run());
  assert.equal(yes.ctx.team, 2); assert.equal(yes.ctx.who, 6); assert.equal(yes.world.numsid[1], 5n); assert.equal(yes.world.numsid[2], 1n);
  assert.ok(yes.out.drain().includes('Do you wish to defect? '));
  for (const line of ['', 'NO', 'BAD']) {
    const f = fixture([line]); f.killed(); f.world.numsid[1] = 5n; assert.throws(() => finish(f.run()), MonitorExit);
    assert.equal(f.world.numply, 0n); assert.equal(f.world.numsid[1], 5n); assert.equal(f.events.at(-3), 'cc1');
  }
});

test('SETUP reassigned ship offers another choice and uses original padded name output', () => {
  const f = fixture(['YES', 'N']); f.killed(); f.world.players[1].alive = -1n; finish(f.run());
  assert.equal(f.ctx.who, 2); assert.match(f.out.drain(), /Sorry, Captain, but theLexington \r\nhas been reassigned\.\r\nDo you wish to choose another ship\? /);
  const no = fixture(['']); no.killed(); no.world.players[1].alive = -1n; assert.throws(() => finish(no.run()), MonitorExit);
  assert.equal(no.world.numply, 0n); assert.equal(no.world.numsid[1], 0n);
});

test('SETUP cancellation during ship prompt composes CC2 counters and retains NUMSHP mission count', () => {
  const f = fixture(['', 'L']); const gt = f.io.gtkn; let n = 0;
  f.io.gtkn = function* () { yield* gt(); if (++n === 2) f.ctx.ccflg = -1n; };
  assert.throws(() => finish(f.run()), MonitorExit); assert.equal(f.world.numply, 0n); assert.equal(f.world.numsid[1], 0n);
  assert.equal(f.world.numshp[1], 1n); assert.equal(f.world.players[1].alive, 1n); assert.ok(!f.events.includes('updcap:1'));
});

test('SETUP new universe builds alternating bases, sixty planets, then stars and optional holes in source draw order', () => {
  const f = fixture(['', 'NO', 'YES', '', 'L']); f.world.tim0 = -1n;
  f.hit.serial = 77n; f.hit.links[0] = 12n; f.hit.data[0][0] = 13n; f.message.links[0] = 12n; f.message.data[0][0] = 14n;
  finish(f.run()); assert.deepEqual(f.seeds, [1000n]); assert.equal(f.world.romopt, 0n); assert.equal(f.world.blhopt, -1n); assert.equal(f.world.rom, 0n);
  assert.equal(f.local.nstar, 110n); assert.equal(f.local.nhole, 10n); assert.equal(f.world.nplnet, 60);
  assert.deepEqual(f.events.slice(0, 13), ['frcchk', 'jobsta', 'cctrap:undefined', 'lock:frelok', 'cctrap:cc1', 'daytime', 'setran', 'zero:HFZ-HLZ', 'daytime', 'setqh', 'setqm', 'gtkn', 'gtkn']);
  assert.ok(f.events.indexOf('star-ran') < f.events.indexOf('hole-ran')); assert.equal(f.draws.length, 400);
  for (let i = 1; i <= 10; i++) for (const side of [1, 2]) {
    const b = f.world.bases[side][i]; assert.deepEqual([b.v, b.h, b.strength, b.scanned], [1, (i - 1) * 2 + side, 1000n, BigInt(side)]);
    assert.equal(f.world.board.disp(b.v, b.h), (side === 1 ? K.DXFBAS : K.DXEBAS) * 100 + i);
  }
  assert.equal(f.world.board.disp(1, 21), K.DXNPLN * 100 + 1); assert.equal(f.world.board.disp(2, 5), K.DXNPLN * 100 + 60);
  assert.equal(f.world.board.disp(2, 6), K.DXSTAR * 100); assert.equal(f.world.board.disp(3, 40), K.DXSTAR * 100);
  assert.equal(f.world.board.disp(3, 41), K.DXBHOL * 100); assert.equal(f.world.board.disp(3, 50), K.DXBHOL * 100);
  assert.equal(f.hit.serial, 77n); assert.equal(f.hit.links[0], 0n); assert.equal(f.hit.data[0][0], 13n);
  assert.equal(f.message.links[0], 0n); assert.equal(f.message.data[0][0], 14n);
  assert.equal(f.world.scores.player(1, 2), 99n); assert.equal(f.world.scores.team(1, 1), 0n);
});

test('SETUP tournament accepts raw token words without type validation and preserves separate seed input', () => {
  for (const [lines, expected] of [[['TOURNAMENT -27', '', '', '', 'L'], 27n], [['TOURNAMENT', 'ABC', '', '', '', 'L'], -signed36(packAscii('ABC  '))]] as const) {
    const f = fixture([...lines]); f.world.tim0 = -1n; finish(f.run()); assert.deepEqual(f.seeds, [1000n, expected]);
    assert.equal(f.world.romopt, -1n); assert.equal(f.world.blhopt, 0n);
  }
  const f = fixture(['TOURNAMENT 1', '', '', '', 'L']); f.world.tim0 = -1n; f.io.tokenWord = () => MIN_INTEGER; finish(f.run());
  assert.equal(f.seeds[1], MIN_INTEGER); // Existing 36-bit arithmetic contract, no JS-number absolute value.
});

test('SETUP regular two-label IF and invalid option prompts use explicit compiler branch and retry behavior', () => {
  const f = fixture(['BAD', 'REG', 'BAD', 'NO', 'BAD', 'NO', '', 'L']); f.world.tim0 = -1n;
  const results: number[] = []; f.io.regularBranch = n => { results.push(n); return n < 0 ? 'romulan' : 'repeat'; };
  finish(f.run()); assert.deepEqual(results, [0, -1]); assert.equal(f.world.romopt, 0n); assert.equal(f.world.blhopt, 0n);
  assert.equal(f.events.filter(e => e === 'gtkn').length, 8); assert.equal(f.draws.length, 380);
});

test('SETUP Ctrl-C at regular prompt skips options but finishes world placement before CC1 cancellation', () => {
  const f = fixture(['']); f.world.tim0 = -1n; const gt = f.io.gtkn;
  f.io.gtkn = function* () { yield* gt(); f.ctx.ccflg = -1n; };
  assert.throws(() => finish(f.run()), MonitorExit); assert.equal(f.world.romopt, 0n); assert.equal(f.world.nplnet, 60);
  assert.equal(f.draws.length, 380); assert.equal(f.world.numply, 0n); assert.equal(f.world.players[1].alive, 1n);
  assert.equal(f.events.filter(e => e === 'gtkn').length, 1);
});

test('SETUP NO at black-hole prompt retains an already-set flag while blank bypasses placement', () => {
  for (const reply of ['NO', '']) {
    const f = fixture(['', '', reply, '', 'L']); f.world.tim0 = -1n;
    const hole = f.io.holeCount; f.io.holeCount = () => { f.world.blhopt = -1n; return hole(); };
    finish(f.run()); assert.equal(f.world.blhopt, -1n); assert.equal(f.draws.length, reply === 'NO' ? 400 : 380);
  }
});

test('PLACE retries occupied cells, draws V before H, and writes the same object code for multiple placements', () => {
  const f = fixture(), values = [2n, 3n, 4n, 5n, 6n, 7n]; f.world.board.setdsp(2, 3, -1);
  const v = { value: 0n }, h = { value: 0n }, seen: bigint[] = [], count = { value: 2n };
  place(f.world, { value: 901n }, count, v, h, f.placement, { iran(n) { seen.push(n); const value = values.shift(); assert.notEqual(value, undefined); count.value = 99n; return value!; } });
  assert.deepEqual(seen, [75n, 75n, 75n, 75n, 75n, 75n]); assert.equal(f.world.board.disp(4, 5), 901); assert.equal(f.world.board.disp(6, 7), 901);
  assert.deepEqual([v.value, h.value, f.placement.k], [6n, 7n, 3]);
});

test('PLACE ship exclusion checks every base, including stale locations, with inclusive radius four', () => {
  const f = fixture(); f.world.nbase[2] = 1n; f.world.bases[2][10] = { v: 10, h: 10, strength: 0n, scanned: 0n };
  const values = [14n, 14n, 15n, 15n]; const v = { value: 0n }, h = { value: 0n };
  place(f.world, { value: 101n }, { value: 1n }, v, h, f.placement, { iran: () => values.shift()! });
  assert.equal(f.world.board.disp(14, 14), 0); assert.equal(f.world.board.disp(15, 15), 101); assert.equal(f.placement.pteam, 2);
});

test('PLACE planet exclusion compares raw DISPC to team; normal owned-planet display codes do not match', () => {
  for (const [code, expectedDraws] of [[K.DXEPLN * 100 + 1, 2], [201, 4]]) {
    const f = fixture(); f.world.nbase[2] = 0n; f.world.nplnet = 1; f.world.numcap[2] = 1n;
    Object.assign(f.world.planets[1], { v: 10, h: 10 }); f.world.board.setdsp(10, 10, code);
    const values = [12n, 12n, 13n, 13n]; let used = 0;
    place(f.world, { value: 101n }, { value: 1n }, { value: 0n }, { value: 0n }, f.placement, { iran: () => { used++; return values.shift()!; } });
    assert.equal(used, expectedDraws);
  }
});

test('PLACE keeps coordinate argument aliases and requires a compiler adapter for nonpositive DO bounds', () => {
  const f = fixture(), values = [4n, 5n], coord = { value: 0n };
  place(f.world, { value: 900n }, { value: 1n }, coord, coord, f.placement, { iran: () => values.shift()! });
  assert.equal(f.world.board.disp(5, 5), 900);
  assert.throws(() => place(f.world, { value: 900n }, { value: 0n }, coord, coord, f.placement, f.io), /compiler contract/);
  place(f.world, { value: 900n }, { value: 0n }, coord, coord, f.placement, { ...f.io, reversedLoop: () => ({ iterations: [], after: 1 }) });
  assert.equal(coord.value, 5n); assert.equal(f.placement.k, 1);
});

test('SETUP composes real integer RNG and PLACE with deterministic world state without inventing floating RAN', () => {
  const worlds = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const f = fixture(['TOURNAMENT 12345', 'YES', 'YES', '', 'L']), rng = new DecwarRandom(9n); f.world.tim0 = -1n;
    f.io.setran = seed => rng.setran(seed, seed === 0n ? f.io.daytime() : 0n); f.io.iran = n => rng.iran(n);
    // Public RAN calls RAN. once before FSC (WARMAC:2741-2744). Consume
    // that draw, but return explicit expression fixtures, not float results.
    f.io.starFactor = () => { rng.nextRaw(); return 2n; };
    f.io.holeCount = () => { rng.nextRaw(); return 10n; };
    finish(f.run()); worlds.push({ board: f.world.board.snapshot(), seed: rng.seed });
    const occupied = new Map<number, number>();
    for (let v = 1; v <= 75; v++) for (let h = 1; h <= 75; h++) { const code = f.world.board.disp(v, h); if (code) occupied.set(code, (occupied.get(code) ?? 0) + 1); }
    assert.equal(occupied.get(K.DXSTAR * 100), 110); assert.equal(occupied.get(K.DXBHOL * 100), 10); assert.equal(occupied.size, 82);
  }
  assert.deepEqual(worlds[0], worlds[1]);
});

test('PREGAM to SETUP consumes one physical command tail with the existing input and identity words', () => {
  const f = fixture([]); f.input.acceptLine('PREGAME / ACTIVATE / F / L');
  const state = Object.assign(f.ctx, { locked: 0n, svlock: 0n, ccflgDot: 0n, iniflg: 0n });
  f.io.gtkn = () => gtkn(state, f.input, f.out, {
    daytime: f.io.daytime, inputPending() { assert.fail(); }, unlo() { assert.fail(); },
    *lock() { assert.fail(); return false; }, *hibernate() { assert.fail(); }, *inli() { assert.fail(); },
  });
  finish(pregame({ ccflg: 0n, hungup: 0n, pasflg: 0n }, f.identity, f.input, new PregameCommandLocals(), f.out, {
    ...f.io, ttyon() {}, dmpbuf() {}, *input() { return true; }, *monit() { throw new MonitorExit(); },
    literal: key => pregameLiterals[key].text, *invoke() { assert.fail('unexpected pre-game command'); },
  }));
  assert.equal(f.input.available, true); finish(f.run()); assert.equal(f.ctx.who, 1); assert.equal(f.input.available, false);
  assert.deepEqual(f.identity.words.slice(0, 5), [7n, 11n, 12n, 9n, 10n]); assert.equal(f.events.filter(e => e === 'jobsta').length, 3);
});

test('SETUP composes UPDCAP persistence and mission output before reserving and clearing the chosen ship', () => {
  const f = fixture(), buffer = new StatisticsBuffer(), disk = new StatisticsBuffer(), direct: string[] = [];
  const commission = { buffer, gameno: 0n, frebie: 0n, hungup: 0n }; disk.words[0] = 40n; disk.words[513] = 8n;
  const stats: StatisticsServices<'commission'> = {
    *lock() { return true; }, unlo() {}, *open() { return { opened: true, lePpn: -1n }; },
    *input(b) { b.words.splice(0, 640, ...disk.words); }, *output(b) { disk.words.splice(0, 640, ...b.words); yield 'commission'; },
    *close() {}, date: () => 0n, flushTerminal() {}, outstr: s => { direct.push(s); }, odec: n => { direct.push(String(n)); },
  };
  f.io.updcap = function* (who) { assert.equal(f.world.players[who].alive, 1n); yield* updateCommission(commission, who, stats); };
  finish(f.run()); assert.equal(disk.missions(1), 9n); assert.equal(commission.gameno, 41n); assert.equal(f.world.players[1].alive, -1n);
  assert.match(direct.join(''), /41/); assert.match(direct.join(''), /9/); assert.match(direct.join(''), /Lexington/);
});

test('FREE to SETUP keeps the same killed-player identity and recommissions the released ship', () => {
  const f = fixture([]), p = f.world.players[3]; f.world.numply = 1n; f.world.numsid[1] = 1n;
  p.alive = -1n; p.ship.v = 20; p.ship.h = 20; p.job[K.KJOB] = 7n; p.ppn = 9n; p.job[K.KTTYN] = 4n;
  f.world.board.setdsp(20, 20, 103); const saved = new SavedShip();
  finish(freeShip(f.world, saved, { ...emptyHit(), dbits: 0n }, 3, {
    *lock() { return true; }, unlock() {}, daytime: () => 500n, *trcoff() { assert.fail(); }, *gethit() { assert.fail(); }, *getmsg() { assert.fail(); },
  }));
  assert.equal(f.world.killed.nkill, 1); assert.equal(p.alive, 1n); finish(f.run());
  assert.equal(f.ctx.who, 3); assert.equal(p.alive, -1n); assert.equal(f.world.numply, 1n); assert.equal(f.world.numsid[1], 1n);
  assert.equal(f.world.killed.rows[1].tty, 10n); assert.equal(p.ship.v, 0); assert.equal(p.ship.energy, 50000n);
});

test('SETUP preserves the reservation race across two sessions after both unlock the same available ship', () => {
  const first = fixture(), second = fixture(['F', 'L']);
  const a = first.run(); for (;;) { const n = a.next(); assert.equal(n.done, false); if (n.value === 'commission') break; }
  assert.equal(first.world.players[1].alive, 1n);
  const b = setup(second.ctx, first.world, second.identity, second.input, second.local, second.placement, second.out, second.io);
  for (;;) { const n = b.next(); assert.equal(n.done, false); if (n.value === 'commission') break; }
  assert.equal(first.ctx.who, 1); assert.equal(second.ctx.who, 1);
  finish(a); finish(b);
  assert.equal(first.world.numply, 2n); assert.equal(first.world.numsid[1], 2n); assert.equal(first.world.numshp[1], 2n);
  assert.equal(first.world.players[1].alive, -1n);
});

test('SETUP raw positive interrupt/lock flags pass the explicit sign-test fixture, and ship increments wrap as source words', () => {
  const f = fixture(); f.ctx.ccflg = f.ctx.hungup = f.ctx.lkfail = 1n; f.world.numshp[1] = MAX_INTEGER;
  finish(f.run()); assert.equal(f.world.numshp[1], MIN_INTEGER); assert.ok(!f.events.includes('cc1')); assert.ok(!f.events.includes('exit'));
});

test('SETUP CCTRAP(0) boundary precedes side increments; a subsequent interrupt cancels CC2 but keeps NUMSHP', () => {
  const f = fixture(['']); const trap = f.io.cctrap;
  f.io.cctrap = handler => { trap(handler); if (handler === 0) { assert.equal(f.world.numsid[1], 0n); f.ctx.ccflg = -1n; } };
  assert.throws(() => finish(f.run()), MonitorExit); assert.equal(f.world.numsid[1], 0n); assert.equal(f.world.numshp[1], 1n);
  assert.equal(f.world.numply, 0n); assert.ok(!f.events.some(e => e.startsWith('updcap:')));
});

test('SETUP interrupts during tournament seed, Romulan and black-hole questions follow distinct source branches', () => {
  for (const [lines, at, flag, expectedDraws, expectedRom] of [
    [['TOURNAMENT', ''], 2, 'ccflg', 380, 0n],
    [['', ''], 2, 'ccflg', 380, -1n],
    [['', '', ''], 3, 'hungup', 380, -1n],
    [[''], 1, 'hungup', 0, 0n],
    [['', ''], 2, 'hungup', 0, -1n],
  ] as const) {
    const f = fixture([...lines]); f.world.tim0 = -1n; const gt = f.io.gtkn; let n = 0;
    f.io.gtkn = function* () { yield* gt(); if (++n === at) f.ctx[flag] = -1n; };
    assert.throws(() => finish(f.run()), MonitorExit); assert.equal(f.draws.length, expectedDraws); assert.equal(f.world.romopt, expectedRom);
    assert.equal(f.world.numply, 0n); assert.deepEqual(f.seeds, [1000n]);
  }
});

test('SETUP captures the planet DO limit before PLACE calls while retaining the later changed NPLNET word', () => {
  const f = fixture(['', '', '', '', 'L']); f.world.tim0 = -1n; const iran = f.io.iran;
  f.io.iran = n => { if (f.draws.length === 40) f.world.nplnet = 1; return iran(n); };
  finish(f.run()); assert.equal(f.world.nplnet, 1); assert.equal(f.draws.length, 380);
  assert.equal(f.world.board.disp(2, 5), K.DXNPLN * 100 + 60);
});
