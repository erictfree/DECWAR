import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { add36, multiply36 } from '../compat/word36.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { Ship } from './ship.ts';
import type { WordReference } from './lifecycle.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { CommandReturn } from './maintenance.ts';
import { objectText, prloc } from './format.ts';

export type PlanetCommandContext = { who: bigint; team: bigint; oflg: number; ocflg: number;
  slowestTerminal: bigint; ptime: bigint; tpoint: bigint[] };
export class PlanetCommandLocals { v = 0n; tem = 0n; vloc = 0n; hloc = 0n; c = 0n; i = 0n; j = 0n; tcap = 0n; phit = 0n; id = 0n; idsp = 0n; }
export type PlanetCommandServices<W> = {
  elapsed(): bigint; literal(text: string): string; falseWord: bigint;
  and(...terms: (() => boolean)[]): boolean; or(...terms: (() => boolean)[]): boolean;
  locate(entry: 'locate' | 'reloc', count: WordReference): Generator<W, bigint, void>;
  ship(index: bigint): Ship;
  planet(index: bigint): { v: number; h: number; builds: bigint; scanned: bigint };
  base(index: bigint, team: bigint): { v: number; h: number; strength: bigint };
  baseScanned(index: bigint, team: bigint): WordReference; baseCount(team: bigint): WordReference; captured(team: bigint): WordReference;
  disp(v: bigint, h: bigint): bigint; dispc(v: bigint, h: bigint): bigint; dispx(v: bigint, h: bigint): bigint;
  setdsp(v: bigint, h: bigint, code: bigint): void;
  ldis(v: bigint, h: bigint, pv: bigint, ph: bigint, limit: bigint): boolean;
  pdist(v: WordReference, h: WordReference, pv: WordReference, ph: WordReference): bigint;
  lockPlanet(caller: 'BUILD' | 'CAPTUR'): Generator<W, boolean, void>; unlockPlanet(): void;
  plnrmv(index: WordReference, team: WordReference): Generator<W, void, void>; baskil(team: WordReference): Generator<W, void, void>;
  phadam(kind: WordReference, index: WordReference, distance: WordReference, size: WordReference, ship: WordReference): Generator<W, void, void>;
  teamScore(team: bigint, category: number): WordReference;
  pridis(v: WordReference, h: WordReference, limit: WordReference, flag: WordReference, zero: WordReference): void;
  makhit(): Generator<W, void, void>;
};
const w = (value: bigint): WordReference => ({ value });
function ref<T, P extends keyof T>(object: T, key: P): { value: T[P] } {
  return { get value() { return object[key]; }, set value(n) { object[key] = n; } };
}

// BUILD.FOR:28-114 and CAPTUR.FOR:27-127. Separate local storage is required
// for the two routines. Shared acquisition/formatting does not merge their
// different locks, score writes, output or normal/alternate-return paths.
export function* planetCommand<W>(entry: 'build' | 'captur', ctx: PlanetCommandContext, input: TokenMemory,
  local: PlanetCommandLocals, hit: HitRegisters, out: TerminalOutput, io: PlanetCommandServices<W>): Generator<W, CommandReturn, void> {
  const ship = () => io.ship(ctx.who), planet = () => io.planet(local.i), base = () => io.base(local.j, ctx.team);
  const obj = (code: bigint, space = 0) => out.out(objectText(code, ctx.oflg, space));
  const location = (cr: number) => prloc(out, Number(local.vloc), Number(local.hloc), ship().v, ship().h, cr, 0, ctx.ocflg, ctx.oflg);
  const shipCode = () => add36(ctx.who, multiply36(ctx.team, 100n));
  const shipDisplay = () => io.disp(BigInt(ship().v), BigInt(ship().h));
  const own = (key: 'v' | 'h'): WordReference => ({ get value() { return BigInt(ship()[key]); }, set value(n) { ship()[key] = Number(n); } });
  const fail = (): CommandReturn => ({ alternateReturn: true });
  const pause = () => { ctx.ptime = add36(local.v, -io.elapsed()); return { alternateReturn: false, pause: ctx.ptime }; };
  const teamScore = (team: bigint, category: number, amount: bigint) => { const s = io.teamScore(team, category); s.value = add36(s.value, amount); };
  const score = (category: number, amount: bigint) => { ctx.tpoint[category] = add36(ctx.tpoint[category], amount); };
  const count = (word: WordReference, amount: bigint) => { word.value = add36(word.value, amount); };
  const full = () => { out.out(M.build4.text); obj(multiply36(add36(ctx.team, 2n), 100n)); out.out(M.build5.text, 1); return fail(); };
  local.v = entry === 'build' ? add36(add36(io.elapsed(), multiply36(ctx.slowestTerminal, 1000n)), 4000n) : add36(io.elapsed(), 5000n);
  local.tem = yield* io.locate('locate', w(2n));
  while (local.tem === 0n) local.tem = yield* io.locate('reloc', w(2n));
  if (local.tem < 0n) return fail();
  local.vloc = input.tokens[0].value; local.hloc = input.tokens[1].value;
  if (!io.ldis(BigInt(ship().v), BigInt(ship().h), local.vloc, local.hloc, 1n)) {
    if (entry === 'captur') out.crlf(); obj(shipDisplay(), 1); out.out(M.captu5.text, 1); return fail();
  }
  local.c = io.dispc(local.vloc, local.hloc);
  if (io.or(() => local.c < BigInt(K.DXNPLN), () => local.c > BigInt(K.DXEPLN))) {
    if (entry === 'build') out.out(M.noplnt.text, 1);
    else {
      local.idsp = io.dispc(local.vloc, local.hloc);
      if (local.idsp <= 0n) out.out(M.noplnt.text, 1);
      if (io.or(() => ctx.team === local.idsp, () => add36(ctx.team, 2n) === local.idsp)) out.out(M.nosur1.text, 1);
      if (io.or(() => add36(3n, -ctx.team) === local.idsp, () => add36(5n, -ctx.team) === local.idsp)) out.out(M.nosur2.text, 1);
      if (local.idsp === BigInt(K.DXROM)) out.out(M.nosur3.text, 1);
      if (local.idsp >= BigInt(K.DXSTAR)) out.out(M.nosur4.text, 1);
    }
    return fail();
  }
  if (entry === 'build') {
    if (add36(ctx.team, BigInt(K.DXNPLN)) !== local.c) { out.out(M.build7.text); return fail(); }
    local.i = io.dispx(local.vloc, local.hloc);
    if (io.and(() => planet().builds === 4n, () => io.baseCount(ctx.team).value === BigInt(K.KNBASE))) return full();
    planet().builds = add36(planet().builds, 1n);
    if (planet().builds !== 5n) { out.odec(planet().builds); out.out(M.build3.text); if (planet().builds > 1n) out.write('s'); out.crlf(); }
    score(K.KPBBAS, multiply36(500n, planet().builds));
    if (planet().builds !== 5n) return pause();
    if (!(yield* io.lockPlanet('BUILD'))) {
      out.out(io.literal('Sorry, Captain, but the construction crew is'), 1); out.out(io.literal('busy with repairs at the moment.'), 1); return fail();
    }
    for (local.j = 1n; local.j <= BigInt(K.KNBASE); local.j = add36(local.j, 1n)) if (base().strength <= 0n) break;
    if (local.j > BigInt(K.KNBASE)) { planet().builds = add36(planet().builds, -1n); io.unlockPlanet(); return full(); }
    score(K.KPBBAS, 2500n); count(io.baseCount(ctx.team), 1n); io.baseScanned(local.j, ctx.team).value = planet().scanned;
    yield* io.plnrmv(ref(local, 'i'), ref(ctx, 'team')); io.unlockPlanet();
    base().v = Number(local.vloc); base().h = Number(local.hloc); base().strength = 1000n;
    io.setdsp(local.vloc, local.hloc, add36(multiply36(add36(BigInt(K.DXFBAS - 1), ctx.team), 100n), local.j));
    out.crlf(); obj(shipDisplay(), 1); out.out(M.build1.text); location(0); out.out(M.build2.text); obj(io.disp(local.vloc, local.hloc)); out.crlf();
    return pause();
  }
  if (local.c === add36(BigInt(K.DXNPLN), ctx.team)) {
    if (ctx.oflg !== K.LONG) out.out(M.captu7.text, 1);
    else { if (ctx.team === 1n) out.out(M.captu6.text, 1); if (ctx.team === 2n) out.out(M.captu8.text, 1); }
    return fail();
  }
  if (!(yield* io.lockPlanet('CAPTUR'))) { out.out(io.literal("The planet's government refuses to surrender."), 1); return fail(); }
  local.tcap = add36(local.c, -BigInt(K.DXNPLN));
  if (local.tcap !== 0n) io.pridis(ref(local, 'vloc'), ref(local, 'hloc'), w(BigInt(K.KRANGE)), ref(local, 'tcap'), w(0n));
  io.pridis(ref(local, 'vloc'), ref(local, 'hloc'), w(4n), w(0n), w(1n));
  local.i = io.dispx(local.vloc, local.hloc);
  if (local.tcap !== 0n) yield* io.baskil(ref(local, 'tcap'));
  if (local.tcap !== 0n) count(io.captured(local.tcap), -1n);
  count(io.captured(ctx.team), 1n); local.phit = add36(50n, multiply36(30n, planet().builds)); hit.shstfr = planet().builds;
  local.v = add36(local.v, multiply36(planet().builds, 1000n)); ship().energy = add36(ship().energy, -multiply36(planet().builds, 500n));
  planet().builds = 0n; io.unlockPlanet(); hit.dispfr = io.disp(local.vloc, local.hloc); hit.iwhat = 1n;
  io.setdsp(local.vloc, local.hloc, add36(multiply36(add36(ctx.team, BigInt(K.DXNPLN)), 100n), local.i));
  hit.dispto = shipCode(); hit.shjump = 0n; hit.vfrom = local.vloc; hit.hfrom = local.hloc; hit.vto = BigInt(ship().v); hit.hto = BigInt(ship().h);
  local.id = io.pdist(ref(hit, 'vfrom'), ref(hit, 'hfrom'), ref(hit, 'vto'), ref(hit, 'hto'));
  yield* io.phadam(ref(ctx, 'team'), ref(ctx, 'who'), ref(local, 'id'), ref(local, 'phit'), w(io.falseWord));
  if (local.tcap !== 0n) teamScore(local.tcap, K.KPEDAM, hit.ihita);
  if (io.and(() => hit.klflg !== 0n, () => local.tcap !== 0n)) teamScore(local.tcap, K.KPEKIL, 5000n);
  io.pridis(own('v'), own('h'), w(BigInt(K.KRANGE)), ref(ctx, 'team'), w(0n));
  io.pridis(own('v'), own('h'), w(4n), w(0n), w(1n));
  out.crlf(); obj(shipCode(), 1); out.out(M.captu0.text); obj(multiply36(add36(local.tcap, BigInt(K.DXNPLN)), 100n), 1); location(1);
  yield* io.makhit(); score(K.KPPCAP, 1000n); const result = pause();
  if (io.and(() => ship().damage < BigInt(K.KENDAM), () => ship().energy > 0n)) return result;
  if (ctx.team === 1n) out.out(M.captu1.text, 1); if (ctx.team === 2n) out.out(M.captu2.text, 1);
  obj(shipCode(), 1); out.out(M.captu4.text, 1); return result;
}
