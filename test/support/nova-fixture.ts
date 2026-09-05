import assert from 'node:assert/strict';
import { weaponFixture, done, w } from './weapon-damage-fixture.ts';
import { nova, NovaLocals } from '../../src/game/nova.ts';
import type { NovaServices } from '../../src/game/nova.ts';
import { supernova, SupernovaLocals, SupernovaMemory } from '../../src/game/supernova.ts';
import type { SupernovaServices } from '../../src/game/supernova.ts';
import { removePlanet, RemovePlanetLocals } from '../../src/game/remove-planet.ts';
import { baseKilled, BaseKilledLocals } from '../../src/game/combat-displacement.ts';
import { priorityDistance, PriorityDistanceLocals } from '../../src/game/priority-distance.ts';
import { releaseTractor, tractorMemory } from '../../src/game/tractor.ts';
import { HitQueue } from '../../src/game/hit-queue.ts';
import { TerminalOutput } from '../../src/compat/output.ts';
import { Scores } from '../../src/game/scores.ts';
import { ldis } from '../../src/compat/board.ts';
import { orderedRational as real } from './rational-real.ts';
import type { Rational } from './rational-real.ts';
export { done, w };
export type Wait = 'jump' | 'base' | 'lock' | 'hit' | 'end';

export function novaFixture() {
  const f = weaponFixture(), shared = Object.assign(f.world, { erom: 1001n });
  const ctx = { player: -1n, team: 1n, nomsg: 0n, tpoint: f.ctx.tpoint, rsr: f.ctx.rsr, shared };
  Object.assign(f.path, { h1: 12n, v1: 20n, h2: 11n, v2: 20n });
  const planets = Array.from({ length: 61 }, (_, i) => ({ v: 20 + Math.floor(i / 10), h: i + 1, builds: 5n, scanned: BigInt(i) }));
  Object.assign(planets[1], { v: 12, h: 20 }); const count = w(3n), local = new NovaLocals(), removeLocal = new RemovePlanetLocals();
  const scores = new Scores(), pl = new PriorityDistanceLocals(), bl = new BaseKilledLocals(), out = new TerminalOutput();
  const queue = new HitQueue(), queued: (typeof f.hit)[] = [], events = f.events;
  let endCalls = 0;
  const io: NovaServices<Rational, Wait> = {
    real, ran: f.io.ran, iran: f.io.iran, logical: f.io.logical, and: f.io.and,
    ship: f.io.ship, device: f.io.device, alive: f.io.alive, base: f.io.base, baseCount: f.io.baseCount,
    planet(i) { const p = planets[Number(i)]; if (!p) throw new RangeError('LOCPLN memory required'); return p; },
    teamScore(team, category) { return { get value() { return scores.team(Number(team), category); }, set value(n) { scores.setTeam(Number(team), category, n); } }; },
    setdsp: f.io.setdsp, dispc: (v, h) => BigInt(f.board.dispc(Number(v), Number(h))), jump: f.io.jump,
    *trcoff(index) { events.push('trcoff'); yield* releaseTractor(index, tractorMemory(f.players), f.hit, io.makhit); },
    *baskil(team) { events.push('baskil:' + team.value); baseKilled(team, bl, {
      player: i => f.players[Number(i)], base: io.base, dispc: io.dispc, docked: i => f.players[i].ship.docked,
      baseCount: team => f.nbase[Number(team)], capturedCount: team => f.numcap[Number(team)], planetCount: () => count.value,
      planet: io.planet, ldis: (v, h, pv, ph, n) => ldis(Number(v), Number(h), Number(pv), Number(ph), Number(n)),
    }); },
    *plnrmv(index, team) { events.push('plnrmv:' + index.value); yield* removePlanet(index, team, count, removeLocal, removeIo); },
    *lockPlanet(caller) { events.push('lock:' + caller); return true; }, unlockPlanet() { events.push('unlock'); },
    pridis(v, h, limit, flag, zero) { events.push(`pridis:${v.value},${h.value},${limit.value},${flag.value},${zero.value}`);
      priorityDistance(v, h, limit, flag, zero, f.hit, pl, {
        alive: i => f.players[i].alive, position: i => ({ v: BigInt(f.players[i].ship.v), h: BigInt(f.players[i].ship.h) }), bits: i => 1n << BigInt(i - 1),
        ldis: (v, h, pv, ph, n) => ldis(Number(v), Number(h), Number(pv), Number(ph), Number(n)),
      });
    },
    *makhit() { events.push('makhit'); queued.push({ ...f.hit }); queue.make(1, f.hit, f.players, 0n, out); },
  };
  const field = (row: bigint, col: 1 | 2 | 3 | 4) => {
    const key = (['v', 'h', 'builds', 'scanned'] as const)[col - 1];
    return { get value() { return BigInt(planets[Number(row)][key]); }, set value(n: bigint) {
      if (key === 'v' || key === 'h') planets[Number(row)][key] = Number(n); else planets[Number(row)][key] = n;
    } };
  };
  const removeIo = {
    planet: field, captured: (team: bigint) => ({ get value() { return f.numcap[Number(team)]; }, set value(n: bigint) { f.numcap[Number(team)] = n; } }),
    baskil: (team: { value: bigint }) => io.baskil(team),
    blkmov(from: bigint, to: bigint, col: 1 | 2 | 3 | 4, length: bigint) {
      events.push(`blkmov:${from},${to},${col},${length}`); assert.ok(length > 0n, 'Fixture binds positive BLT spans only');
      for (let offset = 0n; offset < length; offset++) field(to + offset, col).value = field(from + offset, col).value;
    },
    disp: (v: bigint, h: bigint) => BigInt(f.board.disp(Number(v), Number(h))), setdsp: io.setdsp,
    *endgam(): Generator<Wait, void, void> { events.push('endgam'); endCalls++; },
  };
  const stackLocal = new SupernovaLocals(), memory = new SupernovaMemory(99n);
  const stackIo: SupernovaServices<Rational, Wait> = {
    real, logical: io.logical, or: (...terms) => terms.some(t => t()), iran: io.iran,
    disp: removeIo.disp, dispc: io.dispc, setdsp: io.setdsp, pridis: io.pridis, makhit: io.makhit,
    nova: (kind, index) => nova(kind, index, ctx, f.path, f.hit, local, io),
  };
  return { ...f, ctx, shared, planets, count, local, removeLocal, scores, out, queue, queued, io, events, removeIo, stackLocal, memory, stackIo,
    get endCalls() { return endCalls; }, run: (kind = 2n, index = 6n) => nova(w(kind), w(index), ctx, f.path, f.hit, local, io),
    runRemove: (i = 1n, team = 0n) => removePlanet(w(i), w(team), count, removeLocal, removeIo),
    runStack: () => supernova(ctx, f.path, f.hit, stackLocal, memory, stackIo) };
}
