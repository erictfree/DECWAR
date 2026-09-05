import assert from 'node:assert/strict';
import { phasers, PhaserLocals } from '../../src/game/phasers.ts';
import type { PhaserServices } from '../../src/game/phasers.ts';
import { priorityDistance, PriorityDistanceLocals } from '../../src/game/priority-distance.ts';
import { damageRomulan } from '../../src/game/romulan-damage.ts';
import { locate, LocateLocals } from '../../src/game/locate.ts';
import { emptyHit, HitQueue } from '../../src/game/hit-queue.ts';
import { playerSlots } from '../../src/game/player.ts';
import { PackedBoard, ldis, pdist } from '../../src/compat/board.ts';
import { CommandInput } from '../../src/compat/command-input.ts';
import { TerminalOutput } from '../../src/compat/output.ts';
import { constants as K } from '../../src/generated/source-data.ts';
import { rational as real } from './rational-real.ts';
import type { Rational } from './rational-real.ts';
import { messageBits } from '../../src/game/message-memory.ts';

export function finish<T>(g: Generator<unknown, T, void>): T { const n = g.next(); assert.equal(n.done, true); return n.value; }
export function phaserFixture(line = 'PHASERS 12 20', code = 601) {
  const players = playerSlots(), board = new PackedBoard(), input = new CommandInput(), out = new TerminalOutput();
  const ship = players[1].ship; Object.assign(ship, { v: 10, h: 20, energy: 10000n, shieldCondition: -1n, docked: true, condition: K.GREEN });
  players[1].alive = -1n; players[1].job[K.KTTYSP] = 300n;
  players[6].alive = -1n; Object.assign(players[6].ship, { v: 12, h: 20 });
  board.setdsp(10, 20, 101); board.setdsp(12, 20, code); input.acceptLine(line); input.acquire(out); out.drain();
  const world = { rom: -1n, erom: 1000n, locr: { v: 12, h: 20 } };
  const planets = Array.from({ length: 61 }, () => ({ builds: 5n }));
  const bases = Array.from({ length: 3 }, () => Array.from({ length: 11 }, () => ({ v: 0, h: 0, strength: 1000n })));
  const ctx = { who: 1, team: 1, oflg: 0, nomsg: 0n, slowestTerminal: 2n, ship, phbank: [0n, 2000n, 3000n], tpoint: Array<bigint>(K.KNPOIN + 1).fill(0n), shared: world };
  const local = new PhaserLocals(), pl = new PriorityDistanceLocals(), ll = new LocateLocals(real.literal('99'));
  const hit = { ...emptyHit(), dbits: 0n }, queue = new HitQueue(), queued: (typeof hit)[] = [];
  const events: string[] = [], draws = [1n, 1n], clocks = [1000n, 2500n];
  const locationIo = {
    real, logical: (n: bigint) => n < 0n, or: (a: () => boolean, b: () => boolean) => a() || b(),
    ownPosition: () => ({ v: BigInt(ship.v), h: BigInt(ship.h) }),
    *gtkn(): Generator<'input' | 'pause' | 'damage' | 'hit', void, void> { yield 'input'; assert.ok(input.acquire(out)); },
    *pause() { assert.fail(); },
  };
  const io: PhaserServices<Rational, 'input' | 'pause' | 'damage' | 'hit'> = {
    real, trueWord: -1n, logical: n => n < 0n, and: (a, b) => a() && b(), or: (a, b) => a() || b(),
    alive(i) { events.push('alive:' + i); const p = players[Number(i)]; if (!p) throw new RangeError('ALIVE requires surrounding memory'); return p.alive; },
    bits: i => messageBits(i, () => { assert.fail(); }),
    dispc: (v, h) => BigInt(board.dispc(Number(v), Number(h))), dispx: (v, h) => BigInt(board.dispx(Number(v), Number(h))),
    disp(v, h) { events.push(`disp:${v},${h}`); return BigInt(board.disp(Number(v), Number(h))); },
    pdist: (v, h, sv, sh) => BigInt(pdist(Number(v), Number(h), Number(sv), Number(sh))),
    planetBuilds(i) { const planet = planets[Number(i)]; return { get value() { return planet.builds; }, set value(n) { planet.builds = n; } }; },
    baseStrength: (i, team) => bases[Number(team)][Number(i)].strength,
    elapsed() { events.push('clock'); assert.ok(clocks.length); return clocks.shift()!; },
    iran(max) { events.push('iran:' + max); assert.ok(draws.length); return draws.shift()!; },
    *pause(n) { events.push('pause:' + n); },
    locate(entry, n) {
      events.push(entry); return locate<Rational, 'input' | 'pause' | 'damage' | 'hit'>(entry, n,
        { who: 1, icflg: K.KABS, pasflg: -1n, shared: { players, board, rom: world.rom, locr: world.locr } }, input, ll, out, locationIo);
    },
    *pharom(phit, id) { events.push('pharom'); damageRomulan('pharom', phit, id, world, hit, {
      iran: max => io.iran(max), falseWord: 0n, setdsp: (v, h, code) => board.setdsp(Number(v), Number(h), Number(code)),
    }); },
    *phadam() { assert.fail('This driver fixture requires an explicit PHADAM binding'); },
    pridis(v, h, limit, flag, zero) {
      events.push(`pridis:${v.value},${h.value},${limit.value},${flag.value},${zero.value}`);
      priorityDistance(v, h, limit, flag, zero, hit, pl, {
        alive: i => players[i].alive, position: i => ({ v: BigInt(players[i].ship.v), h: BigInt(players[i].ship.h) }), bits: i => io.bits(i),
        ldis: (v, h, sv, sh, n) => ldis(Number(v), Number(h), Number(sv), Number(sh), Number(n)),
      });
    },
    *makhit() { events.push('makhit'); queued.push({ ...hit }); queue.make(ctx.who, hit, players, 0n, out); },
  };
  return { players, ship, board, input, out, world, planets, bases, ctx, local, hit, queue, queued, events, draws, clocks, io, locationIo,
    run: () => phasers(ctx, input, local, hit, out, io) };
}
