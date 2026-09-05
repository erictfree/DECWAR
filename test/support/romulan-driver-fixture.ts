import assert from 'node:assert/strict';
import { romulanTorpedoFixture, done, w } from './romulan-torpedo-fixture.ts';
import type { Wait } from './romulan-torpedo-fixture.ts';
import { romulanDriver, RomulanDriverLocals } from '../../src/game/romulan-driver.ts';
import type { RomulanDriverServices } from '../../src/game/romulan-driver.ts';
import { romulanTorpedoes } from '../../src/game/romulan-torpedoes.ts';
import { place, PlacementLocals } from '../../src/game/place.ts';
import { weaponFixture } from './weapon-damage-fixture.ts';
import { weaponDamage } from '../../src/game/weapon-damage.ts';
import { basePhasers, planetAttack, rebuildBases, BaseAttackLocals, PlanetAttackLocals, BaseRebuildLocals } from '../../src/game/defenses.ts';
import type { DefenseServices } from '../../src/game/defenses.ts';
import { damageRomulan } from '../../src/game/romulan-damage.ts';
import { tell, TellLocals } from '../../src/game/tell.ts';
import { romulanSpeech, RomulanSpeechLocals } from '../../src/game/romulan-speech.ts';
import { MessageQueue, makeMessage, getMessage, messageText } from '../../src/game/message-queue.ts';
import { incrementMessageAlias } from '../../src/game/message-memory.ts';
import { CommandInput } from '../../src/compat/command-input.ts';
import { ingal, ldis } from '../../src/compat/board.ts';
import { orderedRational as real } from './rational-real.ts';
import type { Rational } from './rational-real.ts';
import { constants as K } from '../../src/generated/source-data.ts';
export { done };

export function romulanDriverFixture() {
  const f = romulanTorpedoFixture(); f.target.v = 11; f.board.setdsp(12, 20, 0); f.board.setdsp(11, 20, 206); f.count.value = 0n;
  f.ctx.rtpaus = 2000n; f.clocks.splice(0, 1, 1000n, 1250n);
  const world = Object.assign(f.shared, { romcnt: 0n, numply: 2n, numrom: 0n, rppaus: 0n, turns: f.scores.turns,
    get rtpaus() { return f.ctx.rtpaus; }, set rtpaus(n) { f.ctx.rtpaus = n; } });
  // Object.assign copies accessor values, so explicitly retain this COMMON alias.
  Object.defineProperty(world, 'rtpaus', { get: () => f.ctx.rtpaus, set: (n: bigint) => { f.ctx.rtpaus = n; }, configurable: true });
  const ctx = Object.assign(f.ctx, { who: 1, player: -1n, pasflg: 0n, oflg: 0, ocflg: K.KABS as number, shared: world });
  const local = new RomulanDriverLocals(), phit = w(77n), id = w(88n), pl = new PlacementLocals();
  const d = weaponFixture({ players: f.players, board: f.board, hit: f.hit, bases: f.bases, world, tpoint: Array<bigint>(K.KNPOIN + 1).fill(0n) });
  const bas = new BaseAttackLocals(), planet = new PlanetAttackLocals(), rebuild = new BaseRebuildLocals();
  const defenseContext = { get player() { return ctx.player; }, team: 1n, shared: world }, sideCounts = [0n, 1n, 1n];
  const msg = new MessageQueue(), input = new CommandInput(), tl = new TellLocals(), speech = new RomulanSpeechLocals();
  const msgIo = { *lock() { return true; }, unlo() {}, incrementCounterOutsidePlayers: (i: number) => incrementMessageAlias(f.players, i) };
  const tc = { who: 1, team: 1, oflg: 0, get player() { return ctx.player; }, rptflg: 0n, gagmsg: 0n,
    get dispfr() { return f.hit.dispfr; }, set dispfr(n) { f.hit.dispfr = n; }, get dbits() { return f.hit.dbits; }, set dbits(n) { f.hit.dbits = n; },
    groups: Array.from({ length: K.KNGRP + 1 }, () => ({ name: 0n, bits: 0n })),
    shared: { players: f.players, get nomsg() { return ctx.nomsg; }, set nomsg(n) { ctx.nomsg = n; }, get rom() { return world.rom; }, locr: world.locr },
  };
  const io: RomulanDriverServices<Rational, Wait> = {
    real, logical: f.io.logical, trueWord: -1n, falseWord: 0n, or: f.io.or, iran: f.io.iran, elapsed: f.io.elapsed, bits: i => 1n << BigInt(i - 1),
    debugLine(op, name) { f.events.push(`${op}:${name}`); },
    *place(object, count, v, h) { f.events.push('place'); place({ board: f.board, nbase: f.nbase, numcap: f.numcap, nplnet: Number(f.count.value), bases: f.bases, planets: f.planets }, object, count, v, h, pl, { iran: io.iran }); },
    dist: f.io.dist, ship: f.io.ship, base: f.io.base, check: f.io.check, disp: f.io.disp, setdsp: f.io.setdsp, ingal: (v, h) => ingal(Number(v), Number(h)),
    romstr: f.io.romstr, *romtor(v, h) { f.events.push('romtor'); yield* romulanTorpedoes(v, h, ctx, f.local, f.path, f.hit, f.io); },
    *phadam(kind, index, distance, size, source) {
      f.events.push(`phadam:${kind.value},${index.value},${distance.value},${size.value},${source.value}`);
      yield* weaponDamage('phadam', kind, index, distance, size, source, { ...d.ctx, player: ctx.player, rsr: ctx.rsr }, d.local, f.hit,
        { ...d.io, ran: f.io.ran, iran: io.iran, baseCount: team => ({ get value() { return f.nbase[Number(team)]; }, set value(n) { f.nbase[Number(team)] = n; } }),
          jump: d.io.jump, baskil: f.removeIo.baskil });
    },
    pdist: f.distanceIo.pdist, pridis: f.io.pridis, makhit: f.io.makhit,
    *tell() { f.events.push('tell'); yield* tell(tc, input, tl, f.board, f.out, {
      logical: io.logical, *gtkn() { assert.fail(); }, iran: io.iran, literalRomulan: () => 'Romulan',
      *romspk(buffer) { romulanSpeech(tc, buffer, speech, { iran: io.iran, getlin: () => assert.fail(), readBits: () => assert.fail() }); },
      *makmsg(buffer) { assert.ok(buffer); yield* makeMessage(msg, f.players, tc, messageText(buffer), f.out, msgIo); },
    }); },
    *baspha() { f.events.push('baspha'); yield* basePhasers(defenseContext, bas, f.hit, defenseIo); },
    *plnatk() { f.events.push('plnatk'); yield* planetAttack(defenseContext, planet, f.hit, defenseIo); },
    *basbld() { f.events.push('basbld'); rebuildBases(defenseContext, rebuild, defenseIo); },
  };
  const defenseIo: DefenseServices<Wait> = {
    logical: io.logical, and: f.io.and, or: io.or, falseWord: 0n, iran: io.iran, baseCount: t => f.nbase[Number(t)],
    planetCount: () => f.count.value, sideCount: t => sideCounts[Number(t)], base: f.io.base, planet: i => f.planets[Number(i)],
    ship: i => f.players[Number(i)].ship, alive: i => f.players[Number(i)].alive, bits: i => 1n << (i - 1n), disp: f.io.disp, dispc: (v, h) => BigInt(f.board.dispc(Number(v), Number(h))),
    ldis: (v, h, pv, ph, n) => ldis(Number(v), Number(h), Number(pv), Number(ph), Number(n)), pdist: io.pdist, phadam: io.phadam,
    *pharom(size, distance) { f.events.push('pharom'); damageRomulan('pharom', size, distance, world, f.hit, { iran: io.iran, falseWord: 0n, setdsp: io.setdsp }); },
    teamScore: (t, k) => ({ get value() { return f.scores.team(Number(t), k); }, set value(n) { f.scores.setTeam(Number(t), k, n); } }),
    pridis: io.pridis, makhit: io.makhit,
  };
  return { ...f, ctx, world, driverLocal: local, phit, id, io, defenseIo, tc, msg, msgIo, input,
    runDriver: () => romulanDriver(phit, id, ctx, local, f.path, f.hit, f.out, io),
    receive(who: number) { const buffer = Array<bigint>(16).fill(0n), registers = { dbits: 0n, dispfr: 0n }; done(getMessage(msg, f.players, registers, who, buffer, msgIo)); return messageText(buffer); },
  };
}
