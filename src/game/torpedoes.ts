import { constants as K, messages as M } from '../generated/source-data.ts';
import { add36, multiply36, signed36 } from '../compat/word36.ts';
import type { RealArithmetic } from '../compat/real.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { Ship } from './ship.ts';
import type { WordReference } from './lifecycle.ts';
import type { CheckOutput } from './check.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { CommandReturn } from './maintenance.ts';

// /TOLOCL/ TORPL(3,2), TPAUS: exactly seven contiguous words.
export class TorpedoMemory {
  words: bigint[];
  constructor(priorWord: bigint) { this.words = Array<bigint>(7).fill(priorWord); }
  target(row: bigint, column: bigint): WordReference {
    const offset = (column - 1n) * 3n + row - 1n;
    if (offset < 0n || offset >= 7n) throw new RangeError('TOLOCL requires surrounding source memory');
    const words = this.words, i = Number(offset); return { get value() { return words[i]; }, set value(n) { words[i] = n; } };
  }
  get pause(): bigint { return this.words[6]; } set pause(n: bigint) { this.words[6] = n; }
  clear(): void { this.words.fill(0n); }
}
export class TorpedoLocals<R> {
  iflg = 0n; i = 0n; tem = 0n; ntorp = 0n; id = 0n; iv = 0n; ih = 0n; idis = 0n; aran = 0n; nplc = 0n; j = 0n;
  d: { value: R }; idum: WordReference; d1: WordReference; d2: WordReference;
  constructor(priorReal: R, priorWord: bigint) { this.d = { value: priorReal }; this.idum = { value: priorWord }; this.d1 = { value: priorWord }; this.d2 = { value: priorWord }; }
}
export type TorpedoContext = { who: number; team: number; oflg: number; nomsg: bigint; ship: Ship; tobank: bigint;
  slowestTerminal: bigint; tpoint: bigint[]; shared: { rom: bigint; erom: bigint; locr: { v: number; h: number } } };
export type TorpedoServices<R, W> = {
  real: RealArithmetic<R>; ran(zero: 0): R; iran(max: bigint): bigint; logical(word: bigint): boolean; trueWord: bigint;
  and(...terms: (() => boolean)[]): boolean; or(...terms: (() => boolean)[]): boolean; literal(text: string): string;
  elapsed(): bigint; pause(milliseconds: bigint): Generator<W, void, void>;
  locate(entry: 'locate' | 'reloc', n: WordReference): Generator<W, bigint, void>;
  ldis(v: bigint, h: bigint, tv: bigint, th: bigint, limit: bigint): boolean;
  check(v: WordReference, h: WordReference, iv: WordReference, ih: WordReference, distance: WordReference, deflection: { value: R }): void;
  bits(index: number): bigint; tractor(index: bigint): bigint;
  base(index: bigint, team: bigint): { v: number; h: number; strength: bigint }; planet(index: bigint): { v: number; h: number; builds: bigint };
  disp(v: bigint, h: bigint): bigint; setdsp(v: bigint, h: bigint, code: bigint): void;
  tordam(kind: WordReference, index: WordReference, distance: WordReference, size: WordReference, ship: WordReference): Generator<W, void, void>;
  torom(d1: WordReference, d2: WordReference): Generator<W, void, void>; jump(kind: WordReference, index: WordReference): Generator<W, void, void>;
  trcoff(index: WordReference): Generator<W, void, void>; snova(): Generator<W, void, void>;
  plnrmv(index: WordReference, team: WordReference): Generator<W, void, void>;
  lockPlanet(caller: 'TORP'): Generator<W, boolean, void>; unlockPlanet(): void;
  pridis(v: WordReference, h: WordReference, limit: WordReference, flag: WordReference, zero: WordReference): void;
  makhit(): Generator<W, void, void>;
  reversedLoop?(first: bigint, last: bigint): { iterations: readonly bigint[]; after: bigint };
};
// TORP.FOR:24-264. CHECK's H2/V2 correspond to IVC/IHC. Normal return writes
// TOBANK, never PTIME. No new ammunition/target checks are inserted after waits.
export function* torpedoes<R, W>(ctx: TorpedoContext, input: TokenMemory, local: TorpedoLocals<R>, memory: TorpedoMemory,
  path: CheckOutput<R>, hit: HitRegisters, out: TerminalOutput, io: TorpedoServices<R, W>): Generator<W, CommandReturn, void> {
  const r = io.real, w = (value: bigint) => ({ value });
  const ref = (key: 'i' | 'j' | 'nplc' | 'iv' | 'ih' | 'idis'): WordReference => ({ get value() { return local[key]; }, set value(n) { local[key] = n; } });
  const coord = (key: 'h2' | 'v2'): WordReference => ({ get value() { return path[key]; }, set value(n) { path[key] = n; } });
  const own = (key: 'v' | 'h'): WordReference => ({ get value() { return BigInt(ctx.ship[key]); }, set value(n) { ctx.ship[key] = Number(n); } });
  const value = (index: bigint) => input.tokens[Number(index) - 1].value;
  const sender = () => add36(BigInt(ctx.who), multiply36(BigInt(ctx.team), 100n));
  const fail = (): CommandReturn => ({ alternateReturn: true });
  const finish = (): CommandReturn => { ctx.tobank = add36(io.elapsed(), memory.pause); return { alternateReturn: false }; };
  const ownError = () => { out.out(ctx.oflg <= 0 ? M.error2.text : M.error1.text, 1); return finish(); };
  const ammoError = () => { out.crlf(); out.odec(ctx.ship.torpedoes); out.out(M.torp07.text, 1); return fail(); };
  const nearby = () => io.pridis(coord('h2'), coord('v2'), w(BigInt(K.KRANGE)), w(0n), w(0n));
  const announce = () => { io.pridis(w(30n), w(30n), w(100n), w(add36(local.nplc, -2n)), w(0n)); hit.dbits = signed36(hit.dbits & ~ctx.nomsg); };
  const selfNotice = function* (type: bigint): Generator<W, void, void> {
    hit.iwhat = type; hit.vto = path.h2; hit.hto = path.v2; hit.critdv = local.id; hit.dbits = io.bits(ctx.who); yield* io.makhit();
  };
  function loop(last: bigint) {
    if (last >= 1n) return { *iterations() { for (let i = 1n; i <= last; i++) yield i; }, after: add36(last, 1n) };
    const contract = io.reversedLoop?.(1n, last); if (!contract) throw new Error('TORP reversed DO bounds require the compiler contract');
    return { iterations: () => contract.iterations, after: contract.after };
  }
  if (ctx.ship.devices[K.KDTORP] >= BigInt(K.KCRIT)) { out.out(M.torp00.text, 1); return fail(); }
  memory.clear(); local.iflg = 1n; local.i = 2n;
  if (ctx.ship.torpedoes <= 0n) { if (ctx.oflg === K.SHORT) return ammoError(); out.out(M.torp01.text, 1); return fail(); }
  local.tem = yield* io.locate('locate', w(-7n)); if (local.tem < 0n) return fail();
  if (local.tem === 0n) for (;;) {
    out.out(M.torp02.text); local.tem = yield* io.locate('reloc', w(-7n)); if (local.tem < 0n) return fail();
    if (local.tem !== 0n && local.tem % 2n !== 0n) break;
  }
  if (value(1n) <= 0n) return fail(); local.ntorp = value(1n);
  if (local.ntorp > ctx.ship.torpedoes) out.out(M.torp03.text, 1);
  if (local.ntorp > ctx.ship.torpedoes || local.ntorp > 3n || local.ntorp < 1n) return ammoError();
  if (local.tem === 1n) {
    do { local.tem = yield* io.locate('reloc', w(multiply36(-local.ntorp, 2n))); if (local.tem < 0n) return fail(); } while (local.tem % 2n !== 0n);
    local.i = 1n;
  }
  memory.target(1n, 1n).value = value(local.i); memory.target(1n, 2n).value = value(add36(local.i, 1n));
  if (local.ntorp !== 1n) {
    if (local.tem >= local.i + 2n) local.i = add36(local.i, 2n);
    memory.target(2n, 1n).value = value(local.i); memory.target(2n, 2n).value = value(add36(local.i, 1n));
    if (local.ntorp !== 2n) {
      if (local.tem >= local.i + 2n) local.i = add36(local.i, 2n);
      memory.target(3n, 1n).value = value(local.i); memory.target(3n, 2n).value = value(add36(local.i, 1n));
    }
  }
  const targets = loop(local.ntorp);
  for (local.i of targets.iterations()) {
    if (memory.target(local.i, 1n).value === BigInt(ctx.ship.v) && memory.target(local.i, 2n).value === BigInt(ctx.ship.h)) return ownError();
    if (!io.ldis(BigInt(ctx.ship.v), BigInt(ctx.ship.h), memory.target(local.i, 1n).value, memory.target(local.i, 2n).value, BigInt(K.KRANGE))) {
      out.out(M.phacn1.text, 1); return fail();
    }
  }
  local.i = targets.after;
  yield* io.pause(add36(ctx.tobank, -io.elapsed())); memory.pause = 0n; ctx.ship.condition = K.RED;
  const shots = loop(local.ntorp);
  for (local.id of shots.iterations()) {
    hit.dispfr = sender(); hit.shstfr = ctx.ship.shieldStrength; hit.shcnfr = ctx.ship.shieldCondition;
    hit.vfrom = BigInt(ctx.ship.v); hit.hfrom = BigInt(ctx.ship.h);
    if (local.iflg < 0n) return finish();
    local.d.value = r.divide(r.subtract(io.ran(0), r.literal('0.5')), r.literal('5.0'));
    if (io.or(() => ctx.ship.devices[K.KDTORP] > 0n, () => ctx.ship.devices[K.KDCOMP] > 0n))
      local.d.value = r.add(local.d.value, r.divide(r.subtract(io.ran(0), r.literal('0.5')), r.literal('10.0')));
    if (ctx.ship.shieldCondition > 0n) local.d.value = r.add(local.d.value,
      r.divide(r.multiply(r.fromInteger(ctx.ship.shieldStrength), r.subtract(io.ran(0), r.literal('0.5'))), r.literal('10000.')));
    local.iv = add36(memory.target(local.id, 1n).value, -BigInt(ctx.ship.v)); local.ih = add36(memory.target(local.id, 2n).value, -BigInt(ctx.ship.h));
    if (local.iv === 0n && local.ih === 0n) return ownError();
    if (!ctx.ship.docked) ctx.ship.torpedoes = add36(ctx.ship.torpedoes, -1n);
    if (io.iran(100n) > 96n) {
      out.out(M.torp04.text); out.odec(local.id); out.out(M.torp05.text, 1);
      local.d.value = r.add(local.d.value, r.divide(r.subtract(io.ran(0), r.literal('0.5')), r.literal('5.0'))); local.iflg = -1n;
      if (io.iran(5n) === 5n) { ctx.ship.devices[K.KDTORP] = add36(add36(ctx.ship.devices[K.KDTORP], 500n), io.iran(3000n)); out.out(M.torp06.text, 1); }
    }
    local.idis = add36(BigInt(K.KRANGE - 2), r.toInteger(r.add(r.multiply(r.subtract(io.ran(0), r.literal('0.5')), r.literal('4.0')), r.literal('0.5'))));
    memory.pause = add36(add36(memory.pause, multiply36(add36(ctx.slowestTerminal, 1n), 1000n)), ctx.ship.devices[K.KDTORP]);
    io.check(own('v'), own('h'), ref('iv'), ref('ih'), ref('idis'), local.d);
    if (path.dcode === 0n) { yield* selfNotice(4n); continue; }
    local.aran = io.iran(100n);
    if (path.dcode === BigInt(K.DXSTAR * 100)) {
      if (local.aran > 80n) {
        hit.dbits = io.bits(ctx.who); hit.vfrom = path.h2; hit.hfrom = path.v2; hit.dispfr = BigInt(K.DXSTAR * 100); hit.iwhat = 6n; yield* io.makhit();
      }
      if (local.aran <= 80n) {
        hit.dispfr = BigInt(K.DXSTAR * 100); hit.iwhat = 7n; hit.vfrom = path.h2; hit.hfrom = path.v2;
        nearby(); yield* io.makhit(); ctx.tpoint[K.KNSDES] = add36(ctx.tpoint[K.KNSDES], -500n); yield* io.snova();
      }
      continue;
    }
    local.nplc = path.dcode / 100n;
    if (io.and(() => local.nplc >= BigInt(K.DXNPLN), () => local.nplc <= BigInt(K.DXEPLN))) {
      if (local.nplc === BigInt(ctx.team + K.DXNPLN)) { yield* selfNotice(15n); continue; }
      hit.dispto = path.dcode; local.i = path.dcode % 100n; hit.iwhat = 2n;
      if (!(yield* io.lockPlanet('TORP'))) { out.out(io.literal('Sorry, Captain, but the torpedo tubes are empty!'), 1); return fail(); }
      const planet = () => io.planet(local.i);
      hit.vto = BigInt(planet().v); hit.hto = BigInt(planet().h);
      if (io.iran(4n) === 4n) planet().builds = add36(planet().builds, -1n);
      hit.shstto = planet().builds > 0n ? planet().builds : 0n; if (planet().builds < 0n) hit.klflg = 2n;
      if (hit.klflg !== 0n) {
        ctx.tpoint[K.KNPDES] = add36(ctx.tpoint[K.KNPDES], -1000n); io.setdsp(path.h2, path.v2, 0n);
        yield* io.plnrmv(ref('i'), w(add36(local.nplc, -BigInt(K.DXNPLN))));
      }
      io.unlockPlanet(); nearby(); yield* io.makhit(); continue;
    }
    if (local.nplc === BigInt(K.DXBHOL)) { yield* selfNotice(5n); continue; }
    if (local.nplc === BigInt(K.DXROM)) {
      yield* io.torom(local.d1, local.d2);
      if (io.and(() => io.logical(ctx.shared.rom), () => io.iran(10n) > 7n)) yield* io.jump(w(BigInt(K.DXROM)), w(1n));
      ctx.tpoint[K.KPRKIL] = add36(ctx.tpoint[K.KPRKIL], hit.ihita);
      if (!io.logical(ctx.shared.rom)) ctx.tpoint[K.KPRKIL] = add36(ctx.tpoint[K.KPRKIL], 5000n);
      hit.shstto = ctx.shared.erom; hit.shcnto = 1n; hit.dispto = BigInt(K.DXROM * 100); hit.vto = BigInt(ctx.shared.locr.v); hit.hto = BigInt(ctx.shared.locr.h);
      nearby(); yield* io.makhit(); continue;
    }
    if (local.nplc === BigInt(ctx.team) || local.nplc === BigInt(ctx.team + 2)) { yield* selfNotice(15n); continue; }
    local.j = path.dcode % 100n;
    if (local.nplc >= BigInt(K.DXFBAS)) {
      const base = () => io.base(local.j, add36(local.nplc, -2n));
      if (base().strength === 1000n) {
        hit.vto = BigInt(base().v); hit.hto = BigInt(base().h); hit.iwhat = 9n; hit.dispto = path.dcode; hit.dbits = 0n;
        announce(); yield* io.makhit(); hit.iwhat = 2n; hit.dispfr = sender(); hit.vfrom = BigInt(ctx.ship.v); hit.hfrom = BigInt(ctx.ship.h);
        hit.shstfr = ctx.ship.shieldStrength; hit.shcnfr = ctx.ship.shieldCondition;
      }
    }
    hit.vto = path.h2; hit.hto = path.v2;
    yield* io.tordam(ref('nplc'), ref('j'), local.idum, local.idum, w(io.trueWord));
    hit.dispto = path.dcode; nearby(); yield* io.makhit();
    if (io.and(() => local.nplc < BigInt(K.DXFBAS), () => io.tractor(local.j) !== 0n)) yield* io.trcoff(ref('j'));
    if (io.or(() => local.nplc < BigInt(K.DXFBAS), () => io.disp(path.h2, path.v2) !== 0n)) continue;
    hit.dispto = add36(local.j, multiply36(local.nplc, 100n)); hit.iwhat = 10n; announce(); hit.vto = path.h2; hit.hto = path.v2; yield* io.makhit();
  }
  local.id = shots.after; return finish();
}
