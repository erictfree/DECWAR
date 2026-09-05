import { constants as K, messages as M } from '../generated/source-data.ts';
import type { RealArithmetic } from '../compat/real.ts';
import { add36, multiply36, signed36 } from '../compat/word36.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { Ship } from './ship.ts';
import type { WordReference } from './lifecycle.ts';
import type { CheckOutput } from './check.ts';
import type { CommandReturn } from './maintenance.ts';

export class MoveLocals<R> {
  iflg = 0; v = 0n; randam = 0n; time = 0n; tem = 0n; tran = 0n; ied = 0n; indxto = 0n; indxfm = 0n; tl = 0n;
  iv = { value: 0n }; ih = { value: 0n }; ia = { value: 0n }; d: { value: R };
  constructor(priorReal: R) { this.d = { value: priorReal }; }
}
export type MoveContext = { who: number; team: number; oflg: number; slowestTerminal: bigint;
  players: readonly { ship: Ship }[] };
export type MoveServices<R, W> = {
  real: RealArithmetic<R>; elapsed(): bigint; iran(max: bigint): bigint; ran(zero: 0): R;
  locate(entry: 'locate' | 'reloc', count: WordReference): Generator<W, bigint, void>;
  check(v: WordReference, h: WordReference, iv: WordReference, ih: WordReference, ia: WordReference, d: { value: R }): void;
  lock(boardWord: bigint): Generator<W, boolean, void>; unlock(boardWord: bigint): void;
  disp(v: bigint, h: bigint): bigint; setdsp(v: bigint, h: bigint, code: bigint): void;
};
const abs = (v: bigint) => v < 0n ? signed36(-v) : v;

// MOVE.FOR:25-157, including IMPULS. CHECK names its physical output words
// H1,V1,H2,V2,DHS,DVS; these correspond to MOVE's V1,H1,V2,H2,DISV,DISH.
export function* move<R, W>(entry: 'move' | 'impuls', ctx: MoveContext, input: TokenMemory,
  local: MoveLocals<R>, path: CheckOutput<R>, out: TerminalOutput, io: MoveServices<R, W>): Generator<W, CommandReturn, void> {
  const ship = () => ctx.players[ctx.who].ship, real = io.real;
  const alt = (): CommandReturn => ({ alternateReturn: true });
  local.iflg = entry === 'move' ? 0 : 1;
  if (ship().devices[local.iflg === 0 ? K.KDWARP : K.KDIMP] >= BigInt(K.KCRIT)) {
    out.out(local.iflg === 0 ? M.wrpdam.text : M.impdam.text, 1); return alt();
  }
  local.v = add36(add36(io.elapsed(), multiply36(ctx.slowestTerminal, 1000n)), 1000n);
  local.d.value = real.literal('0.0'); local.randam = io.iran(4000n); local.time = local.randam / 30n;
  local.tem = yield* io.locate('locate', { value: 2n });
  for (;;) {
    if (local.tem < 0n) return alt(); if (local.tem !== 0n) break;
    local.tem = yield* io.locate('reloc', { value: 2n });
  }
  for (;;) {
    local.iv.value = add36(input.tokens[0].value, -BigInt(ship().v));
    local.ih.value = add36(input.tokens[1].value, -BigInt(ship().h));
    if (local.iv.value !== 0n || local.ih.value !== 0n) break;
    out.out(ctx.oflg <= 0 ? M.error2.text : M.error1.text, 1);
    // Label 600 tests only negativity, not a zero count, and leaves TEM stale.
    if ((yield* io.locate('reloc', { value: 2n })) < 0n) return alt();
  }
  ship().condition = K.GREEN; ship().docked = false;
  local.ia.value = abs(local.iv.value) > abs(local.ih.value) ? abs(local.iv.value) : abs(local.ih.value);
  if (ship().devices[K.KDCOMP] >= BigInt(K.KCRIT)) local.d.value = real.divide(real.subtract(io.ran(0), real.literal('0.5')), real.literal('2.0'));
  if (local.iflg === 1) {
    if (local.ia.value !== 1n) { if (ctx.oflg === K.LONG) out.out(M.move1a.text); out.out(M.move1b.text, 1); return alt(); }
  } else {
    if (local.ia.value > 6n) {
      out.out(ctx.oflg <= 0 ? M.move3s.text : M.move3l.text);
      if (ship().devices[K.KDWARP] > 0n) out.write('3.');
      if (ship().devices[K.KDWARP] === 0n) out.write('6.');
      return alt();
    }
    if (ship().devices[K.KDWARP] > 0n && local.ia.value > 3n) { out.out(ctx.oflg <= 0 ? M.move2s.text : M.move2l.text, 1); return alt(); }
    if (local.ia.value > 4n) {
      if (ctx.oflg === K.LONG) out.out(M.engoff.text);
      if (ctx.oflg !== K.SHORT) out.out(M.move5l.text, 1);
      if (ctx.oflg === K.SHORT) out.out(M.move5s.text, 1);
      local.tran = io.iran(100n);
      if ((local.tran > 80n && local.ia.value >= 6n) || (local.tran > 90n && local.ia.value === 5n)) {
        out.out(M.move06.text); out.oflt(local.randam, 3, ctx.oflg); out.out(M.move08.text, 1);
        if (ctx.oflg !== K.SHORT) { out.out(M.move09.text); out.oflt(local.time, 2, ctx.oflg); out.out(M.strdat.text, 1); }
        ship().devices[K.KDWARP] = add36(ship().devices[K.KDWARP], local.randam);
      }
    }
  }
  const v: WordReference = { get value() { return BigInt(ship().v); }, set value(n) { ship().v = Number(n); } };
  const h: WordReference = { get value() { return BigInt(ship().h); }, set value(n) { ship().h = Number(n); } };
  io.check(v, h, local.iv, local.ih, local.ia, local.d);
  local.ied = multiply36(multiply36(40n, local.ia.value), local.ia.value);
  if (ship().shieldCondition > 0n) local.ied = multiply36(2n, local.ied);
  if (ship().tractor !== 0) local.ied = multiply36(3n, local.ied);
  ship().energy = add36(ship().energy, -local.ied);
  if (path.h1 !== BigInt(ship().v) || path.v1 !== BigInt(ship().h)) {
    local.indxto = add36(add36(multiply36(add36(path.h1, -1n), 25n), add36(path.v1, -1n) / 3n), 1n);
    local.indxfm = add36(add36(multiply36(BigInt(ship().v - 1), 25n), BigInt(ship().h - 1) / 3n), 1n);
    if (!(yield* io.lock(local.indxto))) return alt();
    if (local.indxto !== local.indxfm && !(yield* io.lock(local.indxfm))) { io.unlock(local.indxto); return alt(); }
    io.setdsp(BigInt(ship().v), BigInt(ship().h), 0n);
    io.setdsp(path.h1, path.v1, add36(multiply36(BigInt(ctx.team), 100n), BigInt(ctx.who)));
    ship().v = Number(path.h1); ship().h = Number(path.v1);
    if (local.indxto !== local.indxfm) io.unlock(local.indxfm);
    io.unlock(local.indxto);
    if (ship().tractor !== 0) {
      const tow = () => ctx.players[ship().tractor].ship;
      local.tl = io.disp(BigInt(tow().v), BigInt(tow().h));
      io.setdsp(add36(path.h1, -real.toInteger(path.dhs)), add36(path.v1, -real.toInteger(path.dvs)), local.tl);
      io.setdsp(BigInt(tow().v), BigInt(tow().h), 0n);
      tow().v = Number(real.toInteger(real.subtract(real.fromInteger(path.h1), path.dhs)));
      tow().h = Number(real.toInteger(real.subtract(real.fromInteger(path.v1), path.dvs)));
    }
  }
  if (path.dcode !== 0n) out.out(M.move10.text, 1);
  return { alternateReturn: false, pause: add36(local.v, -io.elapsed()) };
}
