import assert from 'node:assert/strict';
import { defenseFixture, done } from './defense-fixture.ts';
import type { Wait as DefenseWait } from './defense-fixture.ts';
import { planetCommand, PlanetCommandLocals } from '../../src/game/planet-commands.ts';
import type { PlanetCommandServices } from '../../src/game/planet-commands.ts';
import { CommandInput } from '../../src/compat/command-input.ts';
import { locate, LocateLocals } from '../../src/game/locate.ts';
import { orderedRational as real } from './rational-real.ts';
import { constants as K } from '../../src/runtime/variant-values.ts';
import { removePlanet } from '../../src/game/remove-planet.ts';
export { done };
export type Wait = DefenseWait | 'input';

export function planetCommandFixture(entry: 'build' | 'captur' = 'build', code = entry === 'build' ? 701 : 801, line = `${entry} 11 20`) {
  const f = defenseFixture(), input = new CommandInput(), local = new PlanetCommandLocals(), ll = new LocateLocals(real.literal('99'));
  const ctx = Object.assign(f.ctx, { who: 1n, oflg: 0, ocflg: K.KABS as number, slowestTerminal: 2n, ptime: 77n, tpoint: f.tpoint });
  f.count.value = 3n; f.board.setdsp(12, 20, 0); f.board.setdsp(11, 20, code); Object.assign(f.planets[1], { v: 11, h: 20, builds: 0n });
  const owner = Math.trunc(code / 100) - K.DXNPLN; if (owner > 0 && owner <= 2) f.numcap[owner] = 1n;
  input.acceptLine(line); input.acquire(f.out); f.out.drain();
  const clocks = [1000n, 2500n], scanned = Array.from({ length: 3 }, () => Array<bigint>(K.KNBASE + 1).fill(99n));
  const locationIo = {
    real, logical: f.io.logical, or: f.io.or, ownPosition: () => ({ v: BigInt(f.players[Number(ctx.who)].ship.v), h: BigInt(f.players[Number(ctx.who)].ship.h) }),
    *gtkn(): Generator<Wait, void, void> { yield 'input'; assert.ok(input.acquire(f.out)); }, *pause(): Generator<Wait, void, void> { assert.fail(); },
  };
  const io: PlanetCommandServices<Wait> = {
    ...f.io, elapsed() { f.events.push('clock'); assert.ok(clocks.length, 'Unscheduled clock'); return clocks.shift()!; }, literal: text => text,
    locate(which, n) { f.events.push(`${which}:${n.value}`); return locate(which, n,
      { who: Number(ctx.who), icflg: K.KABS, pasflg: -1n, shared: { players: f.players, board: f.board, rom: f.shared.rom, locr: f.shared.locr } }, input, ll, f.out, locationIo); },
    planet: i => f.planets[Number(i)], baseScanned: (i, team) => ({ get value() { return scanned[Number(team)][Number(i)]; }, set value(n) { scanned[Number(team)][Number(i)] = n; } }),
    baseCount: team => ({ get value() { return f.nbase[Number(team)]; }, set value(n) { f.nbase[Number(team)] = n; } }),
    captured: f.removeIo.captured, dispx: (v, h) => BigInt(f.board.dispx(Number(v), Number(h))), setdsp: f.removeIo.setdsp,
    *lockPlanet(caller) { f.events.push('lock:' + caller); return true; }, unlockPlanet() { f.events.push('unlock'); },
    *plnrmv(i, team) { f.events.push('plnrmv'); yield* removePlanet(i, team, f.count, f.removeLocal, f.removeIo); }, baskil: f.removeIo.baskil,
  };
  return { ...f, ctx, input, local, clocks, scanned, io, locationIo,
    run: () => planetCommand(entry, ctx, input, local, f.hit, f.out, io) };
}
