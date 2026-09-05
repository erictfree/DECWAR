import { messages as M } from '../generated/source-data.ts';
import { TerminalOutput } from '../compat/output.ts';
import { etim } from '../compat/time.ts';
import type { LifecycleWorld } from './lifecycle.ts';
import type { StatisticsRecord } from './get-command.ts';

export type EndgameContext = { who: number; team: number;
  shared: LifecycleWorld & { nplnet: bigint; nbase: bigint[] } };
export type EndgameServices<W> = {
  kilhgh(): Generator<W, void, void>;
  daytime(): bigint;
  points(final: true): Generator<W, bigint, void>;
  updsta(record: StatisticsRecord): Generator<W, void, void>;
  free(who: number): Generator<W, void, void>;
  exit(): never; // The source does not return to its caller after game end.
};

// ENDGAM.FOR:37-83. Requires the actual high-segment/score/statistics/exit
// services; no placeholder success. The ordinary not-over path returns.
export function* endGame<W>(ctx: EndgameContext, out: TerminalOutput,
  io: EndgameServices<W>): Generator<W, void, void> {
  const world = ctx.shared;
  if (world.endflg === 0n) {
    if (world.nplnet > 0n) return;
    if (world.nbase[1] > 0n && world.nbase[2] > 0n) return;
    yield* io.kilhgh(); world.endflg = -1n;
  }
  out.out(M.endgm0.text, 1);
  const maximum = [world.nplnet, world.nbase[1], world.nbase[2]].reduce((a, b) => a > b ? a : b);
  if (maximum === 0n) { out.out(M.endgm1.text, 1); world.endflg = -2n; }
  if (world.nbase[1] === 0n) out.out(M.endgm3.text, 1);
  if (world.nbase[2] === 0n) out.out(M.endgm4.text, 1);
  if (ctx.team === 1 && world.nbase[1] === 0n) out.out(M.endgm5.text, 1);
  if (ctx.team === 1 && world.nbase[2] === 0n) out.out(M.endgm6.text, 1);
  if (ctx.team === 2 && world.nbase[1] === 0n) out.out(M.endgm7.text, 1);
  if (ctx.team === 2 && world.nbase[2] === 0n) out.out(M.endgm8.text, 1);
  if (ctx.who !== 0) {
    const p = world.players[ctx.who];
    const identity = { ppn: p.ppn, name1: p.name1, name2: p.name2, shipName1: p.shipName1, shipName2: p.shipName2 };
    const winner = world.nbase[1] < world.nbase[2] ? 2 : 1;
    const why = ctx.team === winner && world.endflg !== -2n ? 1n : 0n;
    const elapsed = etim(p.started, io.daytime()), teamIndex = ctx.team - 1;
    const total = yield* io.points(true);
    yield* io.updsta({ ...identity, elapsed, teamIndex, why, total, who: ctx.who });
    yield* io.free(ctx.who);
    ctx.who = 0;
  }
  io.exit();
}
