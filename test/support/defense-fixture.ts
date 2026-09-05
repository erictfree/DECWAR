import assert from 'node:assert/strict';
import { novaFixture, done } from './nova-fixture.ts';
import type { Wait as NovaWait } from './nova-fixture.ts';
import { basePhasers, planetAttack, rebuildBases, BaseAttackLocals, PlanetAttackLocals, BaseRebuildLocals } from '../../src/game/defenses.ts';
import type { DefenseServices } from '../../src/game/defenses.ts';
import { weaponDamage, WeaponDamageLocals } from '../../src/game/weapon-damage.ts';
import { weaponFixture } from './weapon-damage-fixture.ts';
import { damageRomulan } from '../../src/game/romulan-damage.ts';
import { ldis, pdist } from '../../src/compat/board.ts';
import { orderedRational as real } from './rational-real.ts';
export { done };
export type Wait = NovaWait | 'damage' | 'romulan';

export function defenseFixture() {
  const f = novaFixture(), shared = Object.assign(f.shared, { numply: 2n, rom: 0n }), ctx = { player: -1n, team: 1n, shared };
  const bas = new BaseAttackLocals(), pln = new PlanetAttackLocals(), rebuild = new BaseRebuildLocals();
  const damageLocal = new WeaponDamageLocals(real.literal('99'));
  const d = weaponFixture({ players: f.players, board: f.board, hit: f.hit, bases: f.bases, world: shared, tpoint: f.ctx.tpoint });
  f.count.value = 0n; f.players[1].ship.shieldCondition = -1n; f.board.setdsp(10, 20, 101); f.board.setdsp(12, 20, 401);
  const numsid = [0n, 1n, 1n], calls: bigint[][] = [];
  const io: DefenseServices<Wait> = {
    logical: f.io.logical, and: f.io.and, or: (...terms) => terms.some(t => t()), falseWord: 0n, iran: f.io.iran,
    baseCount: team => f.nbase[Number(team)], planetCount: () => f.count.value, sideCount: team => numsid[Number(team)],
    base: f.io.base, planet: f.io.planet, ship: f.io.ship, alive: i => f.players[Number(i)].alive, bits: i => 1n << (i - 1n),
    disp: (v, h) => BigInt(f.board.disp(Number(v), Number(h))), dispc: f.io.dispc,
    ldis: (v, h, pv, ph, limit) => ldis(Number(v), Number(h), Number(pv), Number(ph), Number(limit)),
    pdist(v, h, pv, ph) { f.events.push('pdist'); return BigInt(pdist(Number(v.value), Number(h.value), Number(pv.value), Number(ph.value))); },
    *phadam(kind, index, distance, size, ship) {
      f.events.push('phadam'); calls.push([kind.value, index.value, distance.value, size.value, ship.value]);
      const g = weaponDamage('phadam', kind, index, distance, size, ship,
        { ...d.ctx, player: ctx.player, team: ctx.team }, damageLocal, f.hit, { ...d.io, ran: f.io.ran, iran: io.iran, baseCount: f.io.baseCount });
      const next = g.next(); assert.equal(next.done, true, 'Defenses only call PHADAM ship paths, which cannot yield');
    },
    *pharom(size, distance) {
      f.events.push('pharom'); calls.push([500n, size.value, distance.value]);
      damageRomulan('pharom', size, distance, shared, f.hit, { iran: io.iran, falseWord: io.falseWord, setdsp: f.io.setdsp });
    },
    teamScore: f.io.teamScore, pridis: f.io.pridis,
    *makhit() { yield* f.io.makhit(); },
  };
  function planet(code = 801, builds = 5n) {
    f.count.value = 1n; f.nbase[2] = 0n; f.board.setdsp(12, 20, code); f.planets[1].builds = builds;
  }
  return { ...f, ctx, shared, bas, pln, rebuild, damageLocal, numsid, io, calls, planet, tpoint: f.ctx.tpoint, rsr: d.ctx.rsr,
    runBase: () => basePhasers(ctx, bas, f.hit, io), runPlanet: () => planetAttack(ctx, pln, f.hit, io),
    runRebuild: () => rebuildBases(ctx, rebuild, io) };
}
