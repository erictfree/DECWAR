import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { add36, multiply36, signed36, unpackAscii } from '../compat/word36.ts';
import { ingal, PackedBoard } from '../compat/board.ts';
import type { RealArithmetic } from '../compat/real.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { WordReference } from './lifecycle.ts';

export class LocateLocals<R> {
  p = 0; sign = 0n; max = 0n; k = 0; i = 0; j = 0; index = 0; result = 0n;
  dv: R; dh: R;
  constructor(priorReal: R) { this.dv = priorReal; this.dh = priorReal; }
}
export type LocateContext = { who: number; icflg: number; pasflg: bigint;
  shared: { players: readonly { alive: bigint; shipName1: bigint; ship: { v: number; h: number; devices: readonly bigint[] }; job: readonly bigint[] }[];
    rom: bigint; locr: { v: number; h: number }; board: PackedBoard } };
export type LocateServices<R, W> = {
  real: RealArithmetic<R>; logical(word: bigint): boolean;
  or(left: () => boolean, right: () => boolean): boolean;
  ownPosition(who: number): { v: bigint; h: bigint }; // WHO=0 addressing must be bound explicitly.
  gtkn(): Generator<W, void, void>; pause(milliseconds: bigint): Generator<W, void, void>;
  // Independent array-field getters/setters can preserve out-of-range aliases.
  tokenOutside?(index: number): Token;
  reversedLoop?(first: number, last: number, step: 1 | -1): { iterations: readonly number[]; after: number };
};
const abs = (n: bigint) => n < 0n ? signed36(-n) : n;

// LOCATE.FOR:36-169. RELOC shares the return word and locals. Only the named
// TKNLST/TYPLST/VALLST fields move; PTRLST offsets and stale token words remain.
export function* locate<R, W>(entry: 'locate' | 'reloc', n: WordReference, ctx: LocateContext,
  input: TokenMemory, local: LocateLocals<R>, out: TerminalOutput, io: LocateServices<R, W>): Generator<W, bigint, void> {
  const real = io.real;
  const token = (index: number): Token => {
    const t = index >= 1 && index <= K.KMAXTK ? input.tokens[index - 1] : io.tokenOutside?.(index);
    if (!t) throw new RangeError('LOCATE token address requires surrounding source memory'); return t;
  };
  function abort(message?: string): bigint { if (message !== undefined) out.out(message, 1); local.result = -1n; return local.result; }
  function loop(first: number, last: number, step: 1 | -1) {
    if (step === 1 ? first <= last : first >= last) return {
      *iterations() { for (let i = first; step === 1 ? i <= last : i >= last; i += step) yield i; }, after: last + step,
    };
    const contract = io.reversedLoop?.(first, last, step);
    if (!contract) throw new Error('LOCATE reversed DO bounds require the compiler contract');
    return { iterations: () => contract.iterations, after: contract.after };
  }
  if (entry === 'reloc') { out.out(M.coord1.text); yield* io.gtkn(); local.p = 1; } else local.p = 2;
  local.sign = n.value < 0n ? -1n : 1n; local.max = abs(n.value);
  if (token(1).type === K.KEOL) return abort();
  local.dv = real.literal('0.0'); local.dh = real.literal('0.0');
  const relative = () => { const p = io.ownPosition(ctx.who); local.dv = real.fromInteger(p.v); local.dh = real.fromInteger(p.h); };
  if (ctx.icflg !== K.KABS) relative();
  let computed = false;
  if (equal(token(local.p).text, M.absfrm.text)) {
    local.p++; if (ctx.icflg !== K.KABS) { local.dv = real.literal('0.0'); local.dh = real.literal('0.0'); }
  } else if (equal(token(local.p).text, M.relfrm.text)) {
    local.p++; if (ctx.icflg !== K.KREL) relative();
  } else if (equal(token(local.p).text, 'COMPUTED')) computed = true;
  if (computed) {
    const own = () => ctx.shared.players[ctx.who];
    if (own().ship.devices[K.KDCOMP] >= BigInt(K.KCRIT)) return abort(M.damcom.text);
    if (!io.or(() => io.logical(ctx.pasflg), () => own().job[K.KTTYSP] <= 300n)) yield* io.pause(multiply36(own().job[K.KTTYSP], 2n));
    local.k = input.ntok - local.p;
    const shift = loop(1, local.k, 1);
    for (local.i of shift.iterations()) {
      token(local.i).text = token(local.i + local.p).text;
      token(local.i).type = token(local.i + local.p).type;
      token(local.i).value = token(local.i + local.p).value;
    }
    local.i = shift.after;
    local.result = multiply36(BigInt(local.k), 2n); local.p = 1;
    if (token(1).type === K.KINT) { local.result = add36(local.result, -1n); local.k--; local.p = 2; }
    input.ntok = Number(local.result);
    if (local.result === 0n) return local.result;
    if (local.sign > 0n && local.result !== local.max) return abort(M.erloc1.text);
    if (local.sign < 0n && local.result > local.max) return abort(M.erloc2.text);
    const expand = loop(local.k + local.p - 1, local.p, -1);
    for (local.i of expand.iterations()) {
      for (local.j = 1; local.j <= K.KNPLAY; local.j++) {
        if (token(local.i).type !== K.KALF) return abort(M.erloc3.text);
        if (equal(token(local.i).text, unpackAscii(ctx.shared.players[local.j].shipName1))) break;
      }
      const first = 2 * local.i - local.p;
      if (local.j > K.KNPLAY) {
        if (!equal(token(local.i).text, 'ROMULAN')) return abort(M.erloc4.text);
        if (!io.logical(ctx.shared.rom)) return abort(M.noship.text);
        token(first).value = BigInt(ctx.shared.locr.v); token(first).type = K.KINT;
        token(first + 1).value = BigInt(ctx.shared.locr.h); token(first + 1).type = K.KINT;
      } else {
        const p = ctx.shared.players[local.j];
        if (!io.logical(p.alive)) return abort(M.noship.text);
        if (ctx.shared.board.disp(p.ship.v, p.ship.h) <= 0) return abort(M.noship.text);
        token(first).value = BigInt(p.ship.v); token(first).type = K.KINT;
        token(first + 1).value = BigInt(p.ship.h); token(first + 1).type = K.KINT;
      }
    }
    local.i = expand.after; return local.result;
  }
  local.result = BigInt(input.ntok - local.p + 1);
  if (local.result === 0n) return local.result;
  if (local.sign > 0n && local.result !== local.max) return abort(M.erloc1.text);
  if (local.sign < 0n && local.result > local.max) return abort(M.erloc2.text);
  const numeric = loop(local.p, input.ntok, 1);
  for (local.i of numeric.iterations()) if (token(local.i).type !== K.KINT) return abort(M.erloc7.text);
  local.i = numeric.after; local.index = 1;
  if (local.result % 2n !== 0n) { token(local.index).value = token(local.p).value; local.p++; local.index++; }
  for (;;) {
    if (local.p === input.ntok + 1) return local.result;
    token(local.index).value = real.toInteger(real.add(real.fromInteger(token(local.p).value), local.dv));
    if (!ingal(Number(token(local.index).value), 5)) return abort(M.erloc8.text);
    local.p++; local.index++;
    if (local.p === input.ntok + 1) return local.result;
    token(local.index).value = real.toInteger(real.add(real.fromInteger(token(local.p).value), local.dh));
    if (!ingal(5, Number(token(local.index).value))) return abort(M.erloc9.text);
    local.p++; local.index++;
  }
}
