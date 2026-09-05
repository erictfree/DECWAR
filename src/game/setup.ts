import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { equal } from '../compat/parser.ts';
import { add36, multiply36, signed36, unpackAscii } from '../compat/word36.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { EntryIdentity } from './pregame.ts';
import type { KilledQueue, JobStatusArguments, WordReference } from './lifecycle.ts';
import { restoreShipWords } from './player.ts';
import type { PlayerSlot } from './player.ts';
import type { Scores } from './scores.ts';
import type { TellGroup } from './tell.ts';
import { place, PlacementLocals } from './place.ts';
import type { PlacementServices, PlacementWorld } from './place.ts';

export type SetupWorld = PlacementWorld & {
  players: PlayerSlot[]; killed: KilledQueue;
  bases: { v: number; h: number; strength: bigint; scanned: bigint }[][];
  planets: { v: number; h: number; builds: bigint; scanned: bigint }[];
  nbase: bigint[]; numcap: bigint[]; numsid: bigint[]; numshp: bigint[]; scores: Scores; // NUMSHP must alias scores.ships.
  numply: bigint; tim0: bigint; hitime: bigint; rom: bigint; romopt: bigint; blhopt: bigint; endflg: bigint; slwest: bigint;
};
export type SetupContext = { who: number; team: number; ttytyp: bigint; ccflg: bigint; hungup: bigint; lkfail: bigint; groups: TellGroup[] };
export class SetupLocals {
  i = 0n; j = 0n; nstar = 0n; nhole = 0n; dm1 = 0n; dm2 = 0n; kindex = 0; ibeg = 0; iend = 0;
}
export const setupLiterals = {
  federationFull: { line: 355, text: 'Sorry, Captain, but the Federation' },
  empireFull: { line: 356, text: 'Sorry, Captain, but the Empire' },
  fleetFull: { line: 357, text: 'fleet is at capacity.' },
  defect: { line: 358, text: 'Do you wish to defect? ' },
  reassignedStart: { line: 370, text: 'Sorry, Captain, but the' },
  reassignedEnd: { line: 373, text: 'has been reassigned.' },
  anotherShip: { line: 374, text: 'Do you wish to choose another ship? ' },
} as const;
export const setupGroupNames = ['ALL', 'KLINGON', 'EMPIRE', 'HUMAN', 'FEDERATION', 'FRIENDLY', 'ENEMY'] as const;
export type SetupServices<W> = PlacementServices & {
  logical(word: bigint): boolean;
  trueWord: bigint;
  // Preserve compiler evaluation of the side-effecting OR at SETUP:240.
  or(left: () => boolean, right: () => boolean): boolean;
  regularBranch(equalResult: 0 | -1 | -2): 'romulan' | 'repeat'; // Two-label IF, SETUP:255.
  literal(key: keyof typeof setupLiterals): string;
  groupWord(name: typeof setupGroupNames[number]): bigint;
  tokenWord(index: number): bigint; // TKNLST, including packed alpha/blank words.
  // Each call performs precisely its named RAN(0) expression; no native float fallback.
  starFactor(): bigint; // INT(51 * RAN(0)), SETUP:295.
  holeCount(): bigint; // INT(41.0 * RAN(0) + 10), SETUP:296.
  daytime(): bigint; runtime(): bigint; setran(seed: bigint): void;
  frcchk(): Generator<W, void, void>;
  jobsta(args: JobStatusArguments): Generator<W, void, void>;
  kilhgh(): Generator<W, void, void>; start(): Generator<W, void, void>; exit(): Generator<W, void, void>;
  // undefined = no argument at :230; 0 = explicit zero at :382/:410.
  cctrap(handler?: 0 | 'cc1' | 'cc2' | 'clrbuf'): void;
  lock(resource: 'frelok'): Generator<W, void, void>; unlock(resource: 'frelok'): Generator<W, void, void>;
  cancel(stage: 'cc1' | 'cc2'): Generator<W, void, void>;
  // BLKSET(HFZ,0,LOCF(HLZ)-LOCF(HFZ)+1), includes unmodeled HISEG words.
  zeroHighSegment(): void;
  setqh(): void; setqm(): void;
  gtkn(): Generator<W, void, void>;
  updcap(who: number): Generator<W, void, void>;
};
function numberRef(target: { v: number; h: number }, key: 'v' | 'h'): WordReference {
  return { get value() { return BigInt(target[key]); }, set value(value: bigint) { target[key] = Number(value); } };
}
function localRef(target: SetupLocals, key: 'i' | 'j' | 'nstar' | 'nhole' | 'dm1' | 'dm2'): WordReference {
  return { get value() { return target[key]; }, set value(value: bigint) { target[key] = value; } };
}
function jobRef(words: bigint[], key: number): WordReference {
  return { get value() { return words[key]; }, set value(value: bigint) { words[key] = value; } };
}
const abs = (word: bigint) => word < 0n ? signed36(-word) : word;
function slot(world: SetupWorld, who: number): PlayerSlot {
  const p = world.players[who]; if (!p) throw new RangeError('SETUP player access requires source memory'); return p;
}
function count(words: bigint[], side: number): bigint {
  const n = words[side]; if (n === undefined) throw new RangeError('SETUP side count requires source memory'); return n;
}

// SETUP.FOR:207-494. Required services expose monitor and compiler operations;
// returning means creation completed, not that the ship is positioned/playing.
export function* setup<W>(ctx: SetupContext, world: SetupWorld, identity: EntryIdentity,
  input: TokenMemory, local: SetupLocals, placement: PlacementLocals, out: TerminalOutput,
  io: SetupServices<W>): Generator<W, void, void> {
  const interrupted = () => io.logical(ctx.ccflg | ctx.hungup);
  ctx.who = 0; yield* io.frcchk(); out.crlf(); yield* io.jobsta(identity.arguments());
  if (world.numply === BigInt(K.KNPLAY)) {
    out.out(M.setu01.text, 1); yield* io.kilhgh(); yield* io.start(); yield* io.exit();
  }
  io.cctrap();
  for (;;) {
    yield* io.lock('frelok');
    if (interrupted()) yield* io.exit();
    if (!io.logical(ctx.lkfail)) break;
  }
  world.numply = add36(world.numply, 1n);
  if (interrupted()) yield* io.cancel('cc1');
  io.cctrap('cc1'); io.setran(io.daytime());
  const initialize = world.tim0 < 0n || !io.or(() => world.numply !== 1n, () => add36(world.hitime, -io.daytime()) > 0n);
  if (initialize) {
    io.zeroHighSegment(); world.tim0 = io.daytime(); io.setqh(); io.setqm();
    options: {
      for (;;) {
        out.out(M.setu02.text); yield* io.gtkn();
        if (io.logical(ctx.ccflg)) break options;
        if (io.logical(ctx.hungup)) yield* io.cancel('cc1');
        if (input.tokens[0].type === K.KEOL) break;
        if (equal(input.tokens[0].text, 'TOURNAMENT')) {
          local.i = 2n;
          if (input.tokens[1].type === K.KEOL) {
            local.i = 1n; out.out(M.setu03.text); yield* io.gtkn();
            if (io.logical(ctx.ccflg)) break options;
            if (io.logical(ctx.hungup)) yield* io.cancel('cc1');
          }
          io.setran(abs(io.tokenWord(Number(local.i)))); break;
        }
        if (io.regularBranch(equal(input.tokens[0].text, 'REGULAR')) === 'romulan') break;
      }
      for (;;) {
        world.romopt = io.trueWord; out.out(M.setu04.text); yield* io.gtkn();
        if (io.logical(ctx.ccflg)) break;
        if (io.logical(ctx.hungup)) yield* io.cancel('cc1');
        if (input.tokens[0].type === K.KEOL) break;
        const yes = equal(input.tokens[0].text, 'YES'), no = equal(input.tokens[0].text, 'NO');
        if (!yes && !no) continue;
        if (no) world.romopt = 0n;
        break;
      }
    }
    world.rom = 0n;
    for (local.j = 1n; local.j <= 2n; local.j++) for (local.i = 1n; local.i <= BigInt(K.KNBASE); local.i++) {
      const base = world.bases[Number(local.j)][Number(local.i)]; base.strength = 1000n; base.scanned = local.j;
    }
    world.nbase[1] = 10n; world.nbase[2] = 10n;
    for (let i = 1; i <= K.KNPLAY; i++) slot(world, i).alive = 1n; // BLKSET writes numeric 1, not .TRUE.
    local.nstar = add36(multiply36(io.starFactor(), 5n), 100n); local.nhole = io.holeCount(); world.nplnet = 60;
    for (local.i = 1n; local.i <= BigInt(K.KNBASE); local.i++) {
      for (const side of [1, 2]) {
        const b = world.bases[side][Number(local.i)];
        place(world, { value: BigInt((side === 1 ? K.DXFBAS : K.DXEBAS) * 100) + local.i }, { value: 1n }, numberRef(b, 'v'), numberRef(b, 'h'), placement, io);
      }
    }
    const planetLimit = BigInt(world.nplnet);
    for (local.i = 1n; local.i <= planetLimit; local.i++) {
      const p = world.planets[Number(local.i)];
      place(world, { value: BigInt(K.DXNPLN * 100) + local.i }, { value: 1n }, numberRef(p, 'v'), numberRef(p, 'h'), placement, io);
    }
    place(world, { value: BigInt(K.DXSTAR * 100) }, localRef(local, 'nstar'),
      localRef(local, 'dm1'), localRef(local, 'dm2'), placement, io);
    if (!interrupted()) for (;;) {
      out.out(M.setu05.text); yield* io.gtkn();
      if (interrupted() || input.tokens[0].type === K.KEOL) break;
      const yes = equal(input.tokens[0].text, 'YES'), no = equal(input.tokens[0].text, 'NO');
      if (!yes && !no) continue;
      if (yes) world.blhopt = io.trueWord; // NO does not clear an existing flag.
      if (io.logical(world.blhopt)) place(world, { value: BigInt(K.DXBHOL * 100) }, localRef(local, 'nhole'),
        localRef(local, 'i'), localRef(local, 'j'), placement, io);
      break;
    }
  } else {
    if (io.logical(world.endflg)) { yield* io.kilhgh(); out.out(M.nogal1.text, 1); yield* io.exit(); }
    if (io.logical(world.romopt)) out.out(M.setu06.text, 1);
    if (io.logical(world.blhopt)) out.out(M.setu07.text, 1);
  }
  if (interrupted()) yield* io.cancel('cc1'); io.cctrap('cc1');
  ctx.ttytyp = 8n;
  local.kindex = world.killed.search(identity.tty, identity.job, identity.ppn);
  let retain = false;
  if (local.kindex !== 0) {
    const record = world.killed.rows[local.kindex].teamShip;
    ctx.team = Number(record & 0o777777n); ctx.who = Number(record / 0o1000000n);
    if (count(world.numsid, ctx.team) >= BigInt(K.KNPLAY / 2)) {
      if (ctx.team === 1) out.out(io.literal('federationFull'), 1);
      if (ctx.team === 2) out.out(io.literal('empireFull'), 1);
      out.out(io.literal('fleetFull'), 1); out.out(io.literal('defect')); yield* io.gtkn();
      if (interrupted()) yield* io.cancel('cc1');
      if (input.tokens[0].type === K.KEOL) yield* io.cancel('cc1');
      if (!equal(input.tokens[0].text, 'YES')) yield* io.cancel('cc1');
      ctx.team++; if (ctx.team === 3) ctx.team = 1;
    } else if (slot(world, ctx.who).alive > 0n) retain = true;
    else {
      out.out(io.literal('reassignedStart')); const p = slot(world, ctx.who); out.out(unpackAscii(p.shipName1) + unpackAscii(p.shipName2)); out.crlf();
      out.out(io.literal('reassignedEnd'), 1); out.out(io.literal('anotherShip')); yield* io.gtkn();
      if (interrupted()) yield* io.cancel('cc1');
      if (input.tokens[0].type === K.KEOL) yield* io.cancel('cc1');
      if (!equal(input.tokens[0].text, 'YES')) {
        yield* io.cancel('cc1'); retain = true; // A returning CC1 falls through 1420.
      }
    }
  } else {
    out.out(M.setu16.text); out.odec(count(world.numsid, 1)); out.out(M.setu17.text); out.odec(count(world.numsid, 2)); out.out(M.stu17a.text);
    if (abs(add36(count(world.numsid, 1), -count(world.numsid, 2))) >= 2n) ctx.team = count(world.numsid, 1) > count(world.numsid, 2) ? 2 : 1;
    else for (;;) {
      out.out(M.setu18.text); yield* io.gtkn(); if (interrupted()) yield* io.cancel('cc1');
      if (input.tokens[0].type === K.KEOL) { ctx.team = count(world.numsid, 1) > count(world.numsid, 2) ? 2 : 1; break; }
      if (!equal(input.tokens[0].text, 'FEDERATION') && !equal(input.tokens[0].text, 'EMPIRE')) continue;
      ctx.team = equal(input.tokens[0].text, 'EMPIRE') ? 2 : 1; break;
    }
  }
  io.cctrap(0); world.numsid[ctx.team] = add36(count(world.numsid, ctx.team), 1n);
  world.numshp[ctx.team] = add36(count(world.numshp, ctx.team), 1n);
  io.cctrap('cc2'); if (interrupted()) yield* io.cancel('cc2');
  if (!retain) {
    out.out((ctx.team === 2 ? M.setu12 : M.setu11).text, 1);
    local.ibeg = ctx.team === 2 ? K.KNPLAY / 2 + 1 : 1; local.iend = ctx.team === 2 ? K.KNPLAY : K.KNPLAY / 2;
    for (;;) {
      out.out(M.setu13.text, 2);
      for (local.i = BigInt(local.ibeg); local.i <= BigInt(local.iend); local.i++) {
        const p = slot(world, Number(local.i)); if (p.alive <= 0n) continue;
        out.out(unpackAscii(p.shipName1) + unpackAscii(p.shipName2)); out.crlf();
      }
      out.out(M.setu14.text); yield* io.gtkn(); if (interrupted()) yield* io.cancel('cc2');
      for (ctx.who = 1; ctx.who <= K.KNPLAY; ctx.who++) if (equal(input.tokens[0].text, unpackAscii(slot(world, ctx.who).shipName1))) break;
      if (ctx.who < local.ibeg || ctx.who > local.iend) continue;
      if (slot(world, ctx.who).alive > 0n) break;
      out.out(M.setu15.text, 1);
    }
  }
  yield* io.unlock('frelok'); yield* io.updcap(ctx.who);
  for (local.i = 1n; local.i <= BigInt(K.KNPOIN); local.i++) world.scores.setPlayer(Number(local.i), ctx.who, 0n);
  slot(world, ctx.who).alive = io.trueWord;
  for (let g = 1; g <= 7; g++) {
    const group = ctx.groups[g]; if (!group) throw new RangeError('SETUP GROUP requires source memory');
    group.name = io.groupWord(setupGroupNames[g - 1]);
    group.bits = g <= 5 ? [0n, 0o1777n, 0o1740n, 0o1740n, 0o37n, 0o37n][g] : ctx.groups[g === 6 ? 5 - ctx.team : 2 + ctx.team].bits;
  }
  io.cctrap('clrbuf');
  const args = [K.KJOB, K.KNAM1, K.KNAM2, K.KPPN, K.KTTYN, K.KTTYSP].map(i => jobRef(slot(world, ctx.who).job, i)) as JobStatusArguments;
  yield* io.jobsta(args);
  slot(world, ctx.who).job[K.KTTYTP] = ctx.ttytyp;
  slot(world, ctx.who).job[K.KJOBTM] = io.daytime(); slot(world, ctx.who).job[K.KRUNTM] = io.runtime();
  restoreShipWords(slot(world, ctx.who).ship, Array<bigint>(11).fill(0n));
  for (local.i = 1n; local.i <= BigInt(K.KNDEV); local.i++) slot(world, ctx.who).ship.devices[Number(local.i)] = 0n;
  identity.words[5] = 9600n;
  for (local.i = 1n; local.i <= BigInt(K.KNPLAY); local.i++) {
    if (!io.logical(slot(world, ctx.who).alive)) continue; // Deliberately WHO, not I.
    const speed = slot(world, Number(local.i)).job[K.KTTYSP]; if (speed < identity.words[5]) identity.words[5] = speed;
  }
  if (identity.words[5] <= 1200n) world.slwest = 3n;
  if (identity.words[5] === 1200n) world.slwest = 2n;
  if (identity.words[5] > 1200n) world.slwest = 1n;
  if (identity.words[5] === 0n) world.slwest = 1n;
  const ship = slot(world, ctx.who).ship;
  ship.condition = K.GREEN; ship.torpedoes = 10n; ship.shieldCondition = 1n; ship.lifeReserves = 5n; ship.energy = 50000n; ship.shieldStrength = 1000n;
}
