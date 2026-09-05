import { constants as K, messages as M, ships } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import { ldis } from '../compat/board.ts';
import { add36, divide36, multiply36, signed36 } from '../compat/word36.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { HitRegisters } from './hit-queue.ts';

export class EnergyLocals { index = 0; i = 0; dteam = 0; }
export class UnresolvedEnergyArithmetic extends Error {}
export type EnergyContext = { who: number; team: number; oflg: number;
  players: readonly { alive: bigint; ship: { v: number; h: number; energy: bigint } }[] };
export type EnergyServices<W> = {
  gtkn(): Generator<W, void, void>;
  logical(word: bigint): boolean;
  // Includes integer-to-real conversion, the compiled 0.9 constant,
  // multiplication/rounding, then INT conversion. No native float fallback.
  intTimesPointNine?(word: bigint): bigint;
  makhit(): Generator<W, void, void>;
};

// ENERGY.FOR:29-105. GTKN and MAKHIT are the source call boundaries. The
// seventeen-word LOWSEG hit block is shared, including mutations on errors.
export function* energy<W>(ctx: EnergyContext, input: TokenMemory, local: EnergyLocals,
  hit: HitRegisters, out: TerminalOutput, io: EnergyServices<W>): Generator<W, void, void> {
  out.crlf(); local.index = 2;
  for (;;) {
    if (input.tokens[local.index - 1].type === K.KALF && input.tokens[local.index].type === K.KINT) break;
    out.out((ctx.oflg <= 0 ? M.ener1s : M.ener1l).text);
    yield* io.gtkn(); local.index = 1;
    if (input.tokens[0].type === K.KEOL) return;
  }
  for (local.i = 1; local.i <= K.KNPLAY; local.i++) {
    if (equal(input.tokens[local.index - 1].text, ships[local.i - 1].name)) break;
  }
  if (local.i > K.KNPLAY) { out.out(M.unkshp.text, 1); return; }
  if (local.i === ctx.who) {
    if (ctx.oflg === K.LONG) out.out(M.begyrp.text);
    out.out(M.energ7.text, 1); return;
  }
  if (!io.logical(ctx.players[local.i].alive)) { out.out(M.noship.text, 1); return; }
  local.dteam = local.i > K.KNPLAY / 2 ? 2 : 1;
  if (ctx.team !== local.dteam) { out.out(M.energ2.text, 1); return; }
  const from = ctx.players[ctx.who].ship, to = ctx.players[local.i].ship;
  if (!ldis(from.v, from.h, to.v, to.h, 1)) { out.out(M.energ3.text, 1); return; }
  hit.ihita = multiply36(input.tokens[local.index].value, 10n);
  if (hit.ihita >= from.energy) { out.out((ctx.oflg <= 0 ? M.ener4s : M.ener4l).text, 1); return; }
  if (hit.ihita <= 0n) {
    if (ctx.oflg === K.LONG) out.out(M.energ8.text);
    out.out(M.energ5.text, 1); return;
  }
  if (!io.intTimesPointNine) throw new UnresolvedEnergyArithmetic('ENERGY INT(IHITA * 0.9) requires the PDP-10 compiler floating-point contract');
  const attenuated = signed36(io.intTimesPointNine(hit.ihita)), capacity = add36(50000n, -to.energy);
  hit.ihita = attenuated < capacity ? attenuated : capacity;
  from.energy = add36(from.energy, -add36(hit.ihita, divide36(hit.ihita, 9n).quotient));
  to.energy = add36(to.energy, hit.ihita);
  out.out(M.energ6.text, 1);
  hit.dispto = BigInt(local.i + local.dteam * 100); hit.dispfr = BigInt(ctx.who + ctx.team * 100);
  hit.dbits = 1n << BigInt(local.i - 1); hit.iwhat = 12n;
  yield* io.makhit();
  // Label 1700 has no incoming branch in the supplied routine.
}
