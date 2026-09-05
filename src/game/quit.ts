import { messages as M } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import { etim } from '../compat/time.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { CommandInput } from '../compat/command-input.ts';
import type { CommandPlayer, StatisticsRecord } from './get-command.ts';

export type QuitContext = { who: number; team: number; hungup: bigint; ccflg: bigint; addrck: bigint;
  shared: { players: CommandPlayer[] } };
export type LeaveServices<W> = {
  cctrap(): void;
  daytime(): bigint;
  points(final: true): Generator<W, bigint, void>;
  updsta(record: StatisticsRecord): Generator<W, void, void>;
  free(who: number): Generator<W, void, void>;
  exit(): Generator<W, never, void> | never;
};
export type QuitServices<W> = LeaveServices<W> & {
  clear(): void;
  gtkn(): Generator<W, void, void>;
};

// DECWAR.FOR:334-351, common cleanup at labels 3810/3800. Unlike GETCMD's
// death path this exits the monitor job rather than returning to pre-game.
export function* leaveGame<W>(ctx: QuitContext, io: LeaveServices<W>): Generator<W, void, void> {
  io.cctrap(); // Required zero-argument monitor calling convention.
  const p = ctx.shared.players[ctx.who];
  const identity = { ppn: p.ppn, name1: p.name1, name2: p.name2, shipName1: p.shipName1, shipName2: p.shipName2 };
  const elapsed = etim(p.started, io.daytime());
  const why = ctx.addrck === 0n ? -1n : 0n, teamIndex = ctx.team - 1;
  const total = yield* io.points(true);
  yield* io.updsta({ ...identity, elapsed, why, teamIndex, total, who: ctx.who });
  yield* io.free(ctx.who);
  ctx.who = 0;
  yield* io.exit();
}

// DECWAR.FOR:163-169. Prompt, CCFLG clear, input discard, then GTKN. EQUAL
// reads token text regardless of its type; a YES prefix accepts confirmation.
export function* quitCommand<W>(ctx: QuitContext, input: CommandInput,
  out: TerminalOutput, io: QuitServices<W>): Generator<W, void, void> {
  if (ctx.hungup === 0n) {
    out.out(M.sure00.text);
    ctx.ccflg = 0n;
    io.clear();
    yield* io.gtkn();
    if (equal(input.tokens[0].text, 'YES') === 0) return;
  }
  yield* leaveGame(ctx, io);
}
