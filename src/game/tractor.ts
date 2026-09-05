import { constants as K, messages as M } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import { ldis } from '../compat/board.ts';
import { signed36, unpackAscii } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import type { WordReference } from './lifecycle.ts';
import type { HitRegisters } from './hit-queue.ts';
import { objectText } from './format.ts';

export type TractorMemory = { bits(index: number): bigint; trstat(index: number): WordReference };
// Component view of initialized BITS and shared TRSTAT. BITS(0) and TRSTAT(0)
// require real neighboring words, not an invented empty beam at index zero.
export function tractorMemory(players: readonly { ship: { tractor: number } }[], outside?: Partial<TractorMemory>): TractorMemory {
  return {
    bits(index) {
      if (index >= 1 && index <= K.KNPLAY && Number.isInteger(index)) return 1n << BigInt(index - 1);
      if (outside?.bits) return outside.bits(index);
      throw new RangeError('Tractor BITS access requires surrounding source memory');
    },
    trstat(index) {
      const p = index >= 1 && index <= K.KNPLAY ? players[index] : undefined;
      if (p) return { get value() { return BigInt(p.ship.tractor); }, set value(n: bigint) { p.ship.tractor = Number(n); } };
      if (outside?.trstat) return outside.trstat(index);
      throw new RangeError('Tractor TRSTAT access requires surrounding source memory');
    },
  };
}

// TRACTR.FOR:126-132. The IP reference is reread after the first clearing
// assignment, since it can alias a word changed by that assignment. MAKHIT
// uses its caller's WHO; no sender or other stale hit fields are overwritten.
export function* releaseTractor<W>(ip: WordReference, memory: TractorMemory, hit: HitRegisters,
  makhit: () => Generator<W, void, void>): Generator<W, void, void> {
  hit.dbits = signed36(memory.bits(Number(ip.value)) | memory.bits(Number(memory.trstat(Number(ip.value)).value)));
  hit.iwhat = 14n;
  memory.trstat(Number(memory.trstat(Number(ip.value)).value)).value = 0n;
  memory.trstat(Number(ip.value)).value = 0n;
  yield* makhit();
}

export type TractorContext = { who: number; team: number; oflg: number;
  players: readonly { alive: bigint; shipName1: bigint; ship: { v: number; h: number; shieldCondition: bigint } }[] };
export class TractorLocals { index = 0; i = 0; dteam = 0; iship = 0n; }
export class UnresolvedTractorArgument extends Error {}
export type TractorServices<W> = {
  gtkn(): Generator<W, void, void>;
  logical(word: bigint): boolean;
  makhit(): Generator<W, void, void>;
  // DECWAR calls TRACTR with no argument despite TRACTR(IP). Resolve the
  // actual writable dummy address only when an IP assignment is reached.
  argument?(): WordReference;
};

// TRACTR.FOR:27-122, sharing label 1400 with TRCOFF above. No device-damage,
// energy, interruption, radio or timing checks are added to the source path.
export function* tractor<W>(ctx: TractorContext, input: TokenMemory, local: TractorLocals,
  memory: TractorMemory, hit: HitRegisters, out: TerminalOutput, io: TractorServices<W>): Generator<W, void, void> {
  function assignIp(): WordReference {
    if (!io.argument) throw new UnresolvedTractorArgument('TRACTR writes IP, but its zero-argument call requires the compiler argument-address contract');
    const ip = io.argument(); ip.value = BigInt(ctx.who); return ip;
  }
  out.crlf(); local.index = 2;
  if (input.ntok <= 1 && memory.trstat(ctx.who).value !== 0n) {
    yield* releaseTractor(assignIp(), memory, hit, io.makhit); return;
  }
  for (;;) {
    if (input.tokens[local.index - 1].type === K.KALF) break;
    out.out(M.tract1.text); yield* io.gtkn();
    if (input.tokens[0].type === K.KEOL) return;
    local.index = 1;
  }
  if (equal(input.tokens[local.index - 1].text, 'OFF')) {
    const ip = assignIp();
    if (memory.trstat(Number(ip.value)).value !== 0n) yield* releaseTractor(ip, memory, hit, io.makhit);
    else out.out(M.tract2.text, 1);
    return;
  }
  if (memory.trstat(ctx.who).value !== 0n) { out.out(M.tract3.text, 1); return; }
  for (local.i = 1; local.i <= K.KNPLAY; local.i++) {
    if (equal(input.tokens[local.index - 1].text, unpackAscii(ctx.players[local.i].shipName1))) break;
  }
  if (local.i > K.KNPLAY) { out.out(M.unkshp.text, 1); return; }
  if (local.i === ctx.who) { out.out(M.tract4.text, 1); return; }
  local.dteam = local.i > K.KNPLAY / 2 ? 2 : 1;
  if (ctx.team !== local.dteam) { out.out(M.tract5.text, 1); return; }
  if (!io.logical(ctx.players[local.i].alive)) { out.out(M.noship.text, 1); return; }
  const from = ctx.players[ctx.who].ship, to = ctx.players[local.i].ship;
  if (!ldis(from.v, from.h, to.v, to.h, 1)) { out.out(M.energ3.text, 1); return; }
  local.iship = BigInt(K.DXFSHP * 100 + local.i); if (local.i > K.KNPLAY / 2) local.iship += 100n;
  if (memory.trstat(local.i).value !== 0n) {
    out.out(objectText(local.iship, ctx.oflg, 1)); out.out(M.tract6.text, 1); return;
  }
  if (from.shieldCondition >= 0n) { out.out(M.tract7.text, 1); return; }
  if (to.shieldCondition >= 0n) { out.out(objectText(local.iship, ctx.oflg, 1)); out.out(M.tract8.text, 1); return; }
  memory.trstat(ctx.who).value = BigInt(local.i); memory.trstat(local.i).value = BigInt(ctx.who);
  hit.dbits = signed36(memory.bits(ctx.who) | memory.bits(local.i)); hit.iwhat = 13n;
  yield* io.makhit();
}
