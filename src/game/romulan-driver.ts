import { constants as K, messages as M } from '../generated/source-data.ts';
import { add36, multiply36, signed36 } from '../compat/word36.ts';
import type { RealArithmetic } from '../compat/real.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { WordReference } from './lifecycle.ts';
import type { CheckOutput } from './check.ts';
import type { HitRegisters } from './hit-queue.ts';
import { objectText, prloc } from './format.ts';

export class RomulanDriverLocals { iplace = 0n; nplc = 0n; numsec = 0n; i = 0n; j = 0n; ctime = 0n; l = 0n; vt = 0n; ht = 0n; i1 = 0n; }
export type RomulanDriverContext = { who: number; player: bigint; pasflg: bigint; nomsg: bigint; oflg: number; ocflg: number; slowestTerminal: bigint;
  shared: { rom: bigint; romcnt: bigint; numply: bigint; numrom: bigint; erom: bigint; rtpaus: bigint; rppaus: bigint; turns: bigint[]; locr: { v: number; h: number } } };
export type RomulanDriverServices<R, W> = {
  real: RealArithmetic<R>; logical(word: bigint): boolean; trueWord: bigint; falseWord: bigint;
  or(...terms: (() => boolean)[]): boolean; iran(max: bigint): bigint; elapsed(): bigint; bits(index: number): bigint;
  // Caller binds whether D lines were compiled, their literals, and TIMIN/OUT.
  debugLine(operation: 'timin' | 'timout', routine: 'ROMDRV' | 'BASPHA' | 'PLNATK' | 'BASBLD'): void;
  place(object: WordReference, count: WordReference, v: WordReference, h: WordReference): Generator<W, void, void>;
  dist(index: WordReference, kind: WordReference, distance: WordReference): void;
  ship(index: bigint): { v: number; h: number }; base(index: bigint, team: bigint): { v: number; h: number; strength: bigint };
  check(v: WordReference, h: WordReference, dv: WordReference, dh: WordReference, range: WordReference, d: { value: R }): void;
  disp(v: bigint, h: bigint): bigint; setdsp(v: bigint, h: bigint, code: bigint): void; ingal(v: bigint, h: bigint): boolean;
  romstr(v: WordReference, h: WordReference): void; romtor(v: WordReference, h: WordReference): Generator<W, void, void>;
  phadam(kind: WordReference, index: WordReference, distance: WordReference, size: WordReference, ship: WordReference): Generator<W, void, void>;
  pdist(v: WordReference, h: WordReference, pv: WordReference, ph: WordReference): bigint;
  pridis(v: WordReference, h: WordReference, range: WordReference, flag: WordReference, zero: WordReference): void;
  makhit(): Generator<W, void, void>; tell(): Generator<W, void, void>;
  baspha(): Generator<W, void, void>; plnatk(): Generator<W, void, void>; basbld(): Generator<W, void, void>;
  reversedLoop?(first: bigint, last: bigint): { iterations: readonly bigint[]; after: bigint };
};
// ROMDRV.FOR:32-208. PHIT is untouched on the main entry; ID is caller storage.
// PHAROM/TOROM/DEADRO are in romulan-damage.ts. Keep /CHKOUT/ physical aliases.
export function* romulanDriver<R, W>(_phit: WordReference, id: WordReference, ctx: RomulanDriverContext,
  local: RomulanDriverLocals, path: CheckOutput<R>, hit: HitRegisters, out: TerminalOutput, io: RomulanDriverServices<R, W>): Generator<W, void, void> {
  const world = ctx.shared, w = (value: bigint) => ({ value });
  const ref = (key: 'iplace' | 'nplc' | 'numsec' | 'i' | 'j' | 'vt' | 'ht' | 'l'): WordReference => ({ get value() { return local[key]; }, set value(n) { local[key] = n; } });
  const coord = (key: 'h1' | 'v1'): WordReference => ({ get value() { return path[key]; }, set value(n) { path[key] = n; } });
  const h = (key: 'vfrom' | 'hfrom' | 'vto' | 'hto'): WordReference => ({ get value() { return hit[key]; }, set value(n) { hit[key] = n; } });
  const rom = (key: 'v' | 'h'): WordReference => ({ get value() { return BigInt(world.locr[key]); }, set value(n) { world.locr[key] = Number(n); } });
  const dist = () => io.dist(ref('iplace'), ref('nplc'), ref('numsec'));
  const target = () => local.nplc === 1n || local.nplc === 2n ? io.ship(local.iplace) : io.base(local.iplace, add36(local.nplc, -2n));
  const loadTarget = () => { local.i = BigInt(target().v); local.j = BigInt(target().h); };
  const early = () => io.debugLine('timout', 'ROMDRV');
  const announce = () => { io.pridis(w(30n), w(30n), w(100n), w(add36(local.nplc, -2n)), w(0n)); hit.dbits = signed36(hit.dbits & ~ctx.nomsg); };
  const move = (v: bigint, h: bigint) => { io.setdsp(BigInt(world.locr.v), BigInt(world.locr.h), 0n); io.setdsp(v, h, BigInt(K.DXROM * 100)); world.locr.v = Number(v); world.locr.h = Number(h); };
  io.debugLine('timin', 'ROMDRV'); world.romcnt = add36(world.romcnt, 1n);
  if (multiply36(world.romcnt, 2n) < world.numply) { early(); return; }
  ctx.player = io.falseWord; world.turns[3] = add36(world.turns[3], 1n);
  if (!io.logical(world.rom)) {
    if (io.or(() => world.romcnt < multiply36(world.numply, 3n), () => io.iran(5n) === 5n)) { early(); return; }
    world.romcnt = 0n; yield* io.place(w(BigInt(K.DXROM * 100 + 1)), w(1n), rom('v'), rom('h'));
    world.rom = io.trueWord; world.erom = add36(io.iran(200n), 200n); world.numrom = add36(world.numrom, 1n);
    hit.iwhat = 11n; hit.dispfr = BigInt(K.DXROM * 100); hit.vfrom = BigInt(world.locr.v); hit.hfrom = BigInt(world.locr.h);
    io.pridis(rom('v'), rom('h'), w(BigInt(K.KRANGE)), w(0n), w(0n));
    if (io.logical(ctx.pasflg)) hit.dbits = signed36(hit.dbits | io.bits(ctx.who)); yield* io.makhit();
    if (io.iran(10n) === 1n) yield* io.tell();
    dist(); if (local.numsec > BigInt(K.KRANGE)) { early(); return; }
  } else {
    dist();
    if (local.numsec > 1n) {
      loadTarget();
      for (const [key, axis] of [['i', 'v'], ['j', 'h']] as const) {
        const delta = () => add36(local[key], -BigInt(world.locr[axis])), abs = (n: bigint) => n < 0n ? signed36(-n) : n;
        if (delta() < 0n) local[key] = add36(BigInt(world.locr[axis]), -add36(abs(delta()), -1n));
        if (delta() > 0n) local[key] = add36(BigInt(world.locr[axis]), add36(abs(delta()), -1n));
        if (delta() === 0n) local[key] = BigInt(world.locr[axis]);
      }
      local.l = 4n; if (local.numsec < 4n) local.l = local.numsec;
      local.vt = add36(local.i, -BigInt(world.locr.v)); local.ht = add36(local.j, -BigInt(world.locr.h));
      io.check(rom('v'), rom('h'), ref('vt'), ref('ht'), ref('l'), { value: io.real.literal('0.0') }); local.i = path.h1; local.j = path.v1;
      if (path.dcode === 0n) move(local.i, local.j);
      else {
        const limit = local.l, contract = limit < 1n ? io.reversedLoop?.(1n, limit) : undefined;
        if (limit < 1n && !contract) throw new Error('ROMDRV reversed DO bounds require the compiler contract');
        function* iterations() { if (contract) yield* contract.iterations; else for (let i = 1n; i <= limit; i++) yield i; }
        let moved = false;
        for (local.i1 of iterations()) {
          const v = add36(local.i, -local.i1);
          if (io.ingal(v, 5n) && io.disp(v, local.j) <= 0n) { move(v, local.j); moved = true; break; }
          const h = add36(local.j, -local.i1);
          if (io.ingal(5n, h) && io.disp(local.i, h) <= 0n) { move(local.i, h); moved = true; break; }
        }
        if (!moved) local.i1 = contract ? contract.after : add36(limit, 1n);
      }
      dist();
      if (io.logical(ctx.pasflg)) {
        out.out(objectText(BigInt(K.DXROM * 100), ctx.oflg, 1)); out.out(M.romadv.text);
        const own = io.ship(BigInt(ctx.who)); prloc(out, world.locr.v, world.locr.h, own.v, own.h, 1, 0, ctx.ocflg, K.SHORT);
      }
      if (local.numsec > BigInt(K.KRANGE)) { world.romcnt = 0n; early(); return; }
    }
  }
  loadTarget(); local.ctime = io.elapsed();
  if ((world.rtpaus < world.rppaus ? world.rtpaus : world.rppaus) > local.ctime) { early(); return; }
  world.romcnt = 0n; let phaser: boolean;
  if ((world.rtpaus > world.rppaus ? world.rtpaus : world.rppaus) < local.ctime) {
    const pick = io.iran(2n); phaser = pick === 2n || (pick !== 1n && world.rppaus < local.ctime);
  } else phaser = world.rppaus < local.ctime;
  if (!phaser) {
    io.romstr(ref('i'), ref('j')); path.h1 = add36(local.i, -BigInt(world.locr.v)); path.v1 = add36(local.j, -BigInt(world.locr.h));
    yield* io.romtor(coord('h1'), coord('v1'));
  } else {
    if (local.nplc >= BigInt(K.DXFBAS) && io.base(local.iplace, add36(local.nplc, -2n)).strength === 1000n) {
      hit.vto = local.i; hit.hto = local.j; hit.iwhat = 9n; hit.dispto = io.disp(local.i, local.j); hit.dispfr = BigInt(K.DXROM * 100);
      announce(); yield* io.makhit();
    }
    hit.vfrom = BigInt(world.locr.v); hit.hfrom = BigInt(world.locr.h); hit.vto = local.i; hit.hto = local.j; hit.shjump = 0n;
    hit.shstfr = world.erom; hit.shcnfr = 1n; id.value = io.pdist(h('vfrom'), h('hfrom'), h('vto'), h('hto'));
    yield* io.phadam(ref('nplc'), ref('iplace'), id, w(200n), w(io.trueWord)); hit.iwhat = 1n;
    io.pridis(ref('i'), ref('j'), w(BigInt(K.KRANGE)), w(0n), w(0n)); hit.dispfr = BigInt(K.DXROM * 100); hit.dispto = add36(multiply36(local.nplc, 100n), local.iplace);
    yield* io.makhit(); world.rppaus = add36(io.elapsed(), multiply36(add36(ctx.slowestTerminal, 1n), 750n));
    if (!io.or(() => local.nplc < BigInt(K.DXFBAS), () => io.disp(local.i, local.j) !== 0n)) {
      hit.iwhat = 10n; hit.dispto = add36(multiply36(local.nplc, 100n), local.iplace); hit.vto = local.i; hit.hto = local.j;
      announce(); yield* io.makhit();
    }
  }
  if (io.iran(50n) <= 1n) yield* io.tell();
  io.debugLine('timout', 'ROMDRV'); io.debugLine('timin', 'BASPHA'); yield* io.baspha(); io.debugLine('timout', 'BASPHA');
  io.debugLine('timin', 'PLNATK'); yield* io.plnatk(); io.debugLine('timout', 'PLNATK');
  io.debugLine('timin', 'BASBLD'); yield* io.basbld(); io.debugLine('timout', 'BASBLD');
}
