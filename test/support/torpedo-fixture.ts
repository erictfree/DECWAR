import assert from 'node:assert/strict';
import { novaFixture, done } from './nova-fixture.ts';
import type { Wait as NovaWait } from './nova-fixture.ts';
import { weaponFixture } from './weapon-damage-fixture.ts';
import { weaponDamage } from '../../src/game/weapon-damage.ts';
import { torpedoes, TorpedoMemory, TorpedoLocals } from '../../src/game/torpedoes.ts';
import type { TorpedoServices } from '../../src/game/torpedoes.ts';
import { CommandInput } from '../../src/compat/command-input.ts';
import { locate, LocateLocals } from '../../src/game/locate.ts';
import { check, CheckLocals } from '../../src/game/check.ts';
import { ldis, ingal } from '../../src/compat/board.ts';
import { damageRomulan } from '../../src/game/romulan-damage.ts';
import { orderedRational as real } from './rational-real.ts';
import type { Rational } from './rational-real.ts';
import { constants as K } from '../../src/generated/source-data.ts';
export { done };
export type Wait = NovaWait | 'input' | 'pause';

export function torpedoFixture(line = 'TORPEDO 1 12 20', code = 0) {
  const f = novaFixture(), input = new CommandInput(), local = new TorpedoLocals(real.literal('99'), 77n), memory = new TorpedoMemory(88n);
  const ship = f.players[1].ship; Object.assign(ship, { v: 10, h: 20, docked: false, shieldCondition: -1n, torpedoes: 10n, condition: K.GREEN });
  f.board.setdsp(10, 20, 101); f.board.setdsp(12, 20, code); f.players[1].job[K.KTTYSP] = 300n;
  const ctx = { who: 1, team: 1, oflg: 0, nomsg: 0n, ship, tobank: 2000n, slowestTerminal: 2n, tpoint: f.ctx.tpoint, shared: f.shared };
  input.acceptLine(line); input.acquire(f.out); f.out.drain();
  const ll = new LocateLocals(real.literal('99')), cl = new CheckLocals(real.literal('99'));
  const d = weaponFixture({ players: f.players, board: f.board, hit: f.hit, bases: f.bases, world: f.shared, tpoint: ctx.tpoint });
  const clocks = [1000n, 2500n];
  const locationIo = { real, logical: (word: bigint) => word < 0n, or: (a: () => boolean, b: () => boolean) => a() || b(),
    ownPosition: () => ({ v: BigInt(ship.v), h: BigInt(ship.h) }),
    *gtkn(): Generator<Wait, void, void> { yield 'input'; assert.ok(input.acquire(f.out)); }, *pause(): Generator<Wait, void, void> { assert.fail(); },
  };
  const io: TorpedoServices<Rational, Wait> = {
    real, ran: f.io.ran, iran: f.io.iran, logical: f.io.logical, and: f.io.and, or: (...terms) => terms.some(t => t()), trueWord: -1n,
    literal(text) { f.events.push('literal'); return text; },
    elapsed() { f.events.push('clock'); assert.ok(clocks.length, 'Unscheduled clock'); return clocks.shift()!; },
    *pause(ms) { f.events.push('pause:' + ms); },
    locate(entry, n) { f.events.push(entry + ':' + n.value); return locate<Rational, Wait>(entry, n,
      { who: 1, icflg: K.KABS, pasflg: -1n, shared: { players: f.players, board: f.board, rom: f.shared.rom, locr: f.shared.locr } }, input, ll, f.out, locationIo); },
    ldis: (v, h, tv, th, limit) => ldis(Number(v), Number(h), Number(tv), Number(th), Number(limit)),
    check(v, h, iv, ih, distance, deflection) {
      f.events.push('check:' + distance.value); check(v, h, iv, ih, distance, deflection, f.path, cl, {
        real, ran: io.ran, ingal: (v, h) => ingal(Number(v), Number(h)), disp: (v, h) => BigInt(f.board.disp(Number(v), Number(h))),
      });
    },
    bits: i => 1n << BigInt(i - 1), tractor: i => BigInt(f.players[Number(i)].ship.tractor), base: f.io.base, planet: f.io.planet,
    disp: (v, h) => BigInt(f.board.disp(Number(v), Number(h))), setdsp: f.io.setdsp,
    *tordam(kind, index, distance, size, source) {
      f.events.push('tordam'); assert.equal(distance, size, 'IDUM is passed twice');
      yield* weaponDamage('tordam', kind, index, distance, size, source,
        { who: BigInt(ctx.who), team: BigInt(ctx.team), player: f.ctx.player, tpoint: ctx.tpoint, rsr: f.ctx.rsr }, d.local, f.hit,
        { ...d.io, baseCount: f.io.baseCount, ran: io.ran, iran: io.iran, jump: io.jump, baskil: f.io.baskil });
    },
    *torom(d1, d2) { f.events.push('torom'); damageRomulan('torom', d1, d2, f.shared, f.hit, { iran: io.iran, falseWord: 0n, setdsp: io.setdsp }); },
    jump: f.io.jump, trcoff: f.io.trcoff,
    *snova() { f.events.push('snova'); yield* f.runStack(); },
    plnrmv: f.io.plnrmv,
    *lockPlanet(caller) { f.events.push('lock:' + caller); return true; }, unlockPlanet: f.io.unlockPlanet,
    pridis: f.io.pridis, makhit: f.io.makhit,
  };
  return { ...f, input, local, memory, ship, ctx, damageLocal: d.local, clocks, locationIo, io,
    run: () => torpedoes(ctx, input, local, memory, f.path, f.hit, f.out, io) };
}
