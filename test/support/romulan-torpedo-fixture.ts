import assert from 'node:assert/strict';
import { novaFixture, done, w } from './nova-fixture.ts';
import type { Wait as NovaWait } from './nova-fixture.ts';
import { weaponFixture } from './weapon-damage-fixture.ts';
import { weaponDamage, WeaponDamageLocals } from '../../src/game/weapon-damage.ts';
import { romulanDistance, romulanStar, DistanceMemory, DistanceLocals, RomulanStarLocals } from '../../src/game/romulan-target.ts';
import { romulanTorpedoes, RomulanTorpedoLocals } from '../../src/game/romulan-torpedoes.ts';
import type { RomulanTorpedoServices } from '../../src/game/romulan-torpedoes.ts';
import { check, CheckLocals } from '../../src/game/check.ts';
import { removePlanet } from '../../src/game/remove-planet.ts';
import { orderedRational as real } from './rational-real.ts';
import type { Rational } from './rational-real.ts';
import { pdist, ingal } from '../../src/compat/board.ts';
export { done, w };
export type Wait = NovaWait | 'damage';

export function romulanTorpedoFixture(code = 206) {
  const f = novaFixture(); f.ctx.player = 0n; Object.assign(f.shared.locr, { v: 10, h: 20 }); f.nbase[2] = 0n;
  Object.assign(f.players[1].ship, { v: 50, h: 50 }); f.board.setdsp(50, 50, 101); f.board.setdsp(10, 20, 500); f.board.setdsp(12, 20, code);
  const ctx = { rtpaus: 77n, slowestTerminal: 2n, nomsg: 0n, rsr: f.ctx.rsr, shared: f.shared };
  const local = new RomulanTorpedoLocals(real.literal('99'), 77n), dl = new DistanceLocals(), memory = new DistanceMemory(77n), sl = new RomulanStarLocals();
  const cl = new CheckLocals(real.literal('99')), damage = new WeaponDamageLocals(real.literal('99')), iv = w(2n), ih = w(0n), clocks = [1000n];
  const d = weaponFixture({ players: f.players, board: f.board, hit: f.hit, bases: f.bases, world: f.shared, tpoint: f.ctx.tpoint });
  const distanceIo = {
    logical: f.io.logical, and: f.io.and, or: (...terms: (() => boolean)[]) => terms.some(t => t()), iran: f.io.iran,
    alive: (i: bigint) => f.players[Number(i)].alive, ship: f.io.ship, baseCount: (t: bigint) => f.nbase[Number(t)], base: f.io.base,
    disp: (v: bigint, h: bigint) => BigInt(f.board.disp(Number(v), Number(h))),
    pdist: (v: { value: bigint }, h: { value: bigint }, rv: { value: bigint }, rh: { value: bigint }) => BigInt(pdist(Number(v.value), Number(h.value), Number(rv.value), Number(rh.value))),
  };
  const io: RomulanTorpedoServices<Rational, Wait> = {
    real, ran: f.io.ran, iran: f.io.iran, logical: f.io.logical, trueWord: -1n, and: f.io.and, or: distanceIo.or,
    elapsed() { f.events.push('clock'); assert.ok(clocks.length, 'Unscheduled clock'); return clocks.shift()!; },
    check(v, h, dv, dh, range, deflection) {
      f.events.push('check:' + range.value); check(v, h, dv, dh, range, deflection, f.path, cl, {
        real, ran: io.ran, disp: distanceIo.disp, ingal: (v, h) => ingal(Number(v), Number(h)),
      });
    },
    base: f.io.base, ship: f.io.ship, planet: f.io.planet, tractor: i => BigInt(f.players[Number(i)].ship.tractor),
    disp: distanceIo.disp, setdsp: f.io.setdsp,
    *tordam(kind, index, distance, size, ship) {
      f.events.push('tordam'); assert.equal(distance, size); yield* weaponDamage('tordam', kind, index, distance, size, ship,
        { ...d.ctx, player: f.ctx.player, rsr: ctx.rsr }, damage, f.hit, { ...d.io, ran: io.ran, iran: io.iran, jump: f.io.jump, baskil: f.io.baskil, baseCount: f.io.baseCount });
    },
    trcoff: f.io.trcoff, *snova() { f.events.push('snova'); yield* f.runStack(); },
    dist(i, k, n) { f.events.push('dist'); romulanDistance(i, k, n, f.shared.locr, memory, dl, distanceIo); },
    romstr(v, h) { f.events.push('romstr'); romulanStar(v, h, sl, { dispc: f.io.dispc }); },
    *lockPlanet(caller) { f.events.push('lock:' + caller); return true; }, unlockPlanet: f.io.unlockPlanet,
    *plnrmv(i, team) { f.events.push('plnrmv'); yield* removePlanet(i, team, f.count, f.removeLocal, f.removeIo); },
    pridis: f.io.pridis, makhit: f.io.makhit,
  };
  return { ...f, ctx, local, memory, dl, sl, damage, iv, ih, clocks, io, distanceIo,
    run: () => romulanTorpedoes(iv, ih, ctx, local, f.path, f.hit, io) };
}
