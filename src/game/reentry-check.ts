import { constants as K, messages as M, restartBackup } from '../runtime/variant-values.ts';
import { add36 } from '../compat/word36.ts';
import { equal } from '../compat/parser.ts';
import { etim, otim } from '../compat/time.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import type { EntryIdentity } from './pregame.ts';
import type { KilledQueue } from './lifecycle.ts';

export type CreationCounts = { team: number; numply: bigint; numsid: bigint[] };
// CC1/CC2, SETUP.FOR:31-60. Unlock and exit happen after counter writes,
// without nonnegative clamping, WHO changes or a FREE call.
export function* cancelCreation<W>(stage: 'cc1' | 'cc2', ctx: CreationCounts,
  io: { unlock(resource: 'frelok'): Generator<W, void, void>; exit(): Generator<W, void, void> }): Generator<W, void, void> {
  ctx.numply = add36(ctx.numply, -1n);
  if (stage === 'cc2') {
    if (ctx.numsid[ctx.team] === undefined) throw new RangeError('CC2 NUMSID access requires source memory');
    ctx.numsid[ctx.team] = add36(ctx.numsid[ctx.team], -1n);
  }
  yield* io.unlock('frelok'); yield* io.exit();
}

export type ReentryContext = { pasflg: bigint; endflg: bigint; killed: KilledQueue };
export class ReentryLocals { kindex = 0; timlft = 0n; minute = 0n; second = 0n; }
export type ReentryServices<W> = {
  daytime(): bigint; logical(word: bigint): boolean;
  cctrap(handler: 'cc1'): void; dmpbuf(): void;
  input(milliseconds: bigint): Generator<W, boolean, void>;
  gtkn(): Generator<W, void, void>;
  endgam(): Generator<W, void, void>;
  cc1(): Generator<W, void, void>;
};

// KILCHK, SETUP.FOR:65-115. KWAIT is zero in the supplied PARAM; future
// timestamps can still reach the wait path. ECHON/ECHOFF immediately return
// in WARMAC:1312-1329 and have no toggle effect here.
export function* checkReentry<W>(ctx: ReentryContext, identity: EntryIdentity, input: TokenMemory,
  local: ReentryLocals, out: TerminalOutput, io: ReentryServices<W>): Generator<W, void, void> {
  ctx.pasflg = 0n;
  local.kindex = ctx.killed.search(identity.tty, identity.job, identity.ppn);
  if (local.kindex === 0) return;
  const remaining = () => add36(BigInt(K.KWAIT), -etim(ctx.killed.rows[local.kindex].time, io.daytime()));
  local.timlft = remaining(); if (local.timlft <= 0n) return;
  out.out(M.kilch4.text); local.timlft = remaining();
  if (local.timlft < 1000n) local.timlft = 1000n;
  local.timlft /= 1000n; local.minute = local.timlft / 60n; local.second = local.timlft % 60n;
  out.odec(local.minute); out.out(M.kilch5.text); out.odec(local.second); out.out(M.kilch6.text, 1);
  io.cctrap('cc1'); out.out(M.kilch8.text); io.dmpbuf(); otim(out, remaining());
  for (;;) {
    // The first wait uses seconds as milliseconds. Later iterations reset
    // TIMLFT from ETIM and consequently use milliseconds. Preserve this.
    if (yield* io.input(local.timlft < 5000n ? local.timlft : 5000n)) {
      yield* io.gtkn();
      if (equal(input.tokens[0].text, K.KPASS) === -2) return;
      yield* io.cc1(); return;
    }
    if (io.logical(ctx.endflg)) yield* io.endgam();
    local.timlft = remaining();
    if (local.timlft <= 0n) { out.crlf(); return; }
    out.out(String.fromCharCode(...restartBackup.bytes)); otim(out, local.timlft); io.dmpbuf();
  }
}
