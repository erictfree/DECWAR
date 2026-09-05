import assert from 'node:assert/strict';
import { setup, SetupLocals, setupLiterals } from '../../src/game/setup.ts';
import type { SetupContext, SetupServices, SetupWorld } from '../../src/game/setup.ts';
import { PlacementLocals } from '../../src/game/place.ts';
import { playerSlots, restoreShipWords } from '../../src/game/player.ts';
import { Scores } from '../../src/game/scores.ts';
import { EntryIdentity } from '../../src/game/pregame.ts';
import { KilledQueue } from '../../src/game/lifecycle.ts';
import { cancelCreation } from '../../src/game/reentry-check.ts';
import { PackedBoard } from '../../src/compat/board.ts';
import { HitQueue } from '../../src/game/hit-queue.ts';
import { MessageQueue } from '../../src/game/message-queue.ts';
import { CommandInput } from '../../src/compat/command-input.ts';
import { TerminalOutput } from '../../src/compat/output.ts';
import { packAscii, signed36 } from '../../src/compat/word36.ts';
import { constants as K } from '../../src/runtime/variant-values.ts';

export class MonitorExit extends Error {}
export function finish<T>(r: Generator<unknown, T, void>): T { for (;;) { const n = r.next(); if (n.done) return n.value; } }
export function setupFixture(lines = ['', 'L']) {
  const scores = new Scores(); scores.playerWords.fill(99n); scores.teamWords.fill(88n);
  const world: SetupWorld = {
    board: new PackedBoard(), players: playerSlots(), killed: new KilledQueue(), scores,
    bases: Array.from({ length: 3 }, () => Array.from({ length: K.KNBASE + 1 }, () => ({ v: 70, h: 70, strength: 91n, scanned: 92n }))),
    planets: Array.from({ length: K.KNPLNT + 1 }, () => ({ v: 60, h: 60, builds: 93n, scanned: 94n })),
    nbase: [0n, 10n, 10n], numcap: [0n, 0n, 0n], numsid: [0n, 0n, 0n], numshp: scores.ships,
    nplnet: 60, numply: 0n, tim0: 10n, hitime: 10000n, rom: -1n, romopt: 0n, blhopt: 0n, endflg: 0n, slwest: 1n,
  };
  const ctx: SetupContext = { who: 9, team: 2, ttytyp: 3n, ccflg: 0n, hungup: 0n, lkfail: 0n,
    groups: Array.from({ length: K.KNGRP + 1 }, () => ({ name: 9n, bits: 9n })) };
  const identity = new EntryIdentity(Array<bigint>(200).fill(777n)), input = new CommandInput(), out = new TerminalOutput();
  const local = new SetupLocals(), placement = new PlacementLocals(), events: string[] = [], seeds: bigint[] = [], draws: bigint[] = [];
  const hit = new HitQueue(), message = new MessageQueue(); let cell = 0, axis = 0;
  const io: SetupServices<'line' | 'unlock' | 'commission'> = {
    logical: w => w < 0n, trueWord: -1n,
    or(left, right) { const l = left(), r = right(); return l || r; }, // Explicit eager fixture.
    regularBranch: result => result < 0 ? 'romulan' : 'repeat',
    literal: key => setupLiterals[key].text, // Explicit unpadded FORTRAN literals.
    groupWord: name => signed36(packAscii(name.slice(0, 5).padEnd(5, ' '))),
    tokenWord: i => input.tokens[i - 1].type === K.KALF ? signed36(packAscii(input.tokens[i - 1].text.padEnd(5, ' '))) : input.tokens[i - 1].value,
    starFactor() { events.push('star-ran'); return 2n; }, holeCount() { events.push('hole-ran'); return 10n; },
    daytime() { events.push('daytime'); return 1000n; }, runtime() { events.push('runtime'); return 45n; },
    setran(seed) { events.push('setran'); seeds.push(seed); },
    iran(n) {
      draws.push(n); const answer = axis++ % 2 === 0 ? Math.floor(cell / 75) + 1 : cell++ % 75 + 1;
      assert.ok(answer <= 75, 'fixture placement exhausted'); return BigInt(answer);
    },
    *frcchk() { events.push('frcchk'); },
    *jobsta(args) { events.push('jobsta'); [7n, 11n, 12n, 9n, 10n, 2400n].forEach((v, i) => { args[i].value = v; }); },
    *kilhgh() { events.push('kilhgh'); }, *start() { events.push('start'); }, *exit() { events.push('exit'); throw new MonitorExit(); },
    cctrap(handler) { events.push(`cctrap:${handler}`); },
    *lock(key) { events.push(`lock:${key}`); }, *unlock(key) { events.push(`unlock:${key}`); yield 'unlock'; },
    *cancel(stage) { events.push(stage); yield* cancelCreation(stage, { get team() { return ctx.team; },
      get numply() { return world.numply; }, set numply(n) { world.numply = n; }, numsid: world.numsid }, io); },
    zeroHighSegment() {
      events.push('zero:HFZ-HLZ');
      // Explicit fixture for the modeled subset only; NUMPLY/NUMSID and SCORE
      // lie outside this region. Unmodeled HISEG is not claimed initialized.
      world.board = new PackedBoard(); world.tim0 = 0n; world.hitime = 0n;
      world.rom = world.romopt = world.blhopt = world.endflg = world.slwest = 0n;
      world.nplnet = 0; world.nbase.fill(0n); world.numcap.fill(0n); world.numshp.fill(0n);
      world.killed.nkill = world.killed.kilndx = 0;
      for (const row of world.killed.rows) Object.assign(row, { job: 0n, ppn: 0n, tty: 0n, time: 0n, teamShip: 0n });
      scores.teamWords.fill(0n); scores.romulan.fill(0n); scores.turns.fill(0n); scores.numrom = 0n;
      for (const p of world.players.slice(1)) {
        restoreShipWords(p.ship, Array<bigint>(11).fill(0n)); p.ship.devices.fill(0n); p.job.fill(0n);
        p.alive = p.active = p.msgflg = p.hitflg = 0n; p.ship.tractor = 0; p.ship.docked = false;
      }
      for (const row of world.bases) for (const b of row) Object.assign(b, { v: 0, h: 0, strength: 0n, scanned: 0n });
      for (const p of world.planets) Object.assign(p, { v: 0, h: 0, builds: 0n, scanned: 0n });
    },
    setqh() { events.push('setqh'); hit.initialize(); }, setqm() { events.push('setqm'); message.initialize(); },
    *gtkn() { events.push('gtkn'); if (!input.available) { yield 'line'; const line = lines.shift(); assert.notEqual(line, undefined, 'missing fixture input'); input.acceptLine(line!); } assert.ok(input.acquire(out)); },
    *updcap(who) { events.push(`updcap:${who}`); yield 'commission'; },
  };
  const run = () => setup(ctx, world, identity, input, local, placement, out, io);
  const killed = (who = 1, side = 1) => {
    world.killed.nkill = 1; Object.assign(world.killed.rows[1], { job: 7n, ppn: 9n, tty: 99n, teamShip: BigInt(who) * 0o1000000n + BigInt(side) });
  };
  return { world, ctx, identity, input, out, local, placement, events, seeds, draws, hit, message, io, run, killed };
}

