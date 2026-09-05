import { constants as K, messages as M, decwarText } from '../generated/source-data.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { equal } from '../compat/parser.ts';
import { add36, multiply36 } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { OutputSettings } from './type-command.ts';
import { commandLoop } from './command-loop.ts';
import type { CommandLoopServices, LoopContext } from './command-loop.ts';
import { place, PlacementLocals } from './place.ts';
import type { PlacementServices, PlacementWorld } from './place.ts';

export type DecwarLiteral = { readonly file: string; readonly line: number; readonly text: string; readonly newline: number };
export type StartupServices<W> = {
  zeroLowSegment(): void; // BLKSET LFZ:LLZ, including cursor/token/shared views; not HUNGUP/ADDRCK afterward.
  literal(item: DecwarLiteral): string; // Compiled bytes, not a default padding choice.
  gtkn(): Generator<W, void, void>;
  type(kind: 1 | 2): Generator<W, void, void>;
  summar(): Generator<W, void, void>;
};

// DECWAR.FOR:30-67. No retry or Ctrl-C/HUNGUP/NTOK/type check is added.
// VALLST and TKNLST participate independently, in beginner-first order.
export function* initializeDecwar<W>(settings: OutputSettings, shared: { versio: bigint },
  input: TokenMemory, out: TerminalOutput, io: StartupServices<W>): Generator<W, void, void> {
  io.zeroLowSegment(); shared.versio = 24n; settings.oflg = K.MEDIUM;
  out.out(M.decver.text, 1);
  for (const item of decwarText.startup) out.out(io.literal(item), item.newline);
  yield* io.gtkn();
  const first = input.tokens[0];
  if (first.value === 1n || equal(first.text, 'BEGINNER')) {
    settings.scnflg = K.LONG; settings.oflg = K.MEDIUM; settings.prtype = 0; settings.icflg = K.KABS;
  } else if (first.value === 2n || equal(first.text, 'INTERMEDIATE')) {
    settings.scnflg = K.LONG; settings.prtype = -1; settings.icflg = K.KREL; settings.oflg = K.MEDIUM;
  } else if (first.value === 3n || equal(first.text, 'EXPERT')) {
    settings.scnflg = K.SHORT; settings.prtype = -1; settings.icflg = K.KREL; settings.oflg = K.SHORT;
  }
  yield* io.type(1); yield* io.type(2); yield* io.summar();
}

// The monitor adapter raises this only when transferring to the installed
// DECWAR label 9999. Ordinary host exceptions are not converted into deaths.
// This models control transfer, not APR machine-state capture or trap delivery.
export class DecwarFatalTransfer extends Error {
  constructor() { super('Monitor transfer to DECWAR label 9999'); }
}
export type FatalServices<W> = {
  iran(n: bigint): bigint;
  literal(item: DecwarLiteral): string;
  leave(): Generator<W, void, void>;
};
export class FatalLocals { i = 0n; }
// DECWAR.FOR:291-330. These five messages differ from WARMAC's FMSGS table.
// No ADDRCK write occurs here: APRTRP, not label 9999, is responsible for it.
export function* fatalDecwar<W>(local: FatalLocals, out: TerminalOutput, io: FatalServices<W>): Generator<W, void, void> {
  out.crlf(); out.crlf(); local.i = io.iran(5n);
  // Computed GOTO outside its table falls through to label 5001.
  const index = local.i >= 1n && local.i <= 5n ? Number(local.i) - 1 : 0;
  for (const item of decwarText.fatal[index]) out.out(io.literal(item), item.newline);
  yield* io.leave();
}
export type EntryContext = OutputSettings & LoopContext & { team: number };
export type EntryWorld = PlacementWorld & { versio: bigint; players: { ship: { v: number; h: number } }[] };
export type EntryServices<W> = StartupServices<W> & CommandLoopServices<W> & PlacementServices & {
  pregam(): Generator<W, void, void>;
  ttyon(): void;
  setup(): Generator<W, void, void>;
  aprset(label: 9999): void;
};

// DECWAR.FOR:30-85 plus the ported command loop. This is application entry,
// not a host listener/monitor startup. Services must bind the same LOCAL,
// LOWSEG/HISEG and player words used by the composed routines.
export function* runDecwar<W>(ctx: EntryContext, world: EntryWorld, input: TokenMemory,
  placement: PlacementLocals, fatal: FatalLocals, out: TerminalOutput, io: EntryServices<W>): Generator<W, never, void> {
  try {
    yield* initializeDecwar(ctx, world, input, out, io);
    for (;;) {
      yield* io.pregam(); io.ttyon(); yield* io.setup(); io.aprset(9999);
      const ship = world.players[ctx.who]?.ship;
      if (!ship) throw new RangeError('DECWAR entry SHPCON access requires source memory');
      const v = { get value() { return BigInt(ship.v); }, set value(n: bigint) { ship.v = Number(n); } };
      const h = { get value() { return BigInt(ship.h); }, set value(n: bigint) { ship.h = Number(n); } };
      place(world, { value: add36(multiply36(100n, BigInt(ctx.team)), BigInt(ctx.who)) }, { value: 1n }, v, h, placement, io);
      yield* commandLoop(ctx, io); // WHO=0 returns to label 1, not initial preferences.
    }
  } catch (error) {
    if (!(error instanceof DecwarFatalTransfer)) throw error;
    yield* fatalDecwar(fatal, out, io);
    throw new Error('DECWAR fatal exit path unexpectedly returned');
  }
}

// WARMAC.MAC:3670-3677. FRCCHK clears JSQTIM and enters CHKSEQ, whose first
// instruction is POPJ. The dead scan body must not reclaim ships.
export function forceJobCheck(state: { jsqtim: bigint }): void { state.jsqtim = 0n; }
