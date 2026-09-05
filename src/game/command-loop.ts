import type { CommandReturn } from './maintenance.ts';

export type CommandRoutine = 'bases' | 'build' | 'captur' | 'damage' | 'dock' | 'energy' | 'gripe' | 'help'
  | 'impuls' | 'list' | 'move' | 'news' | 'phacon' | 'planet' | 'points' | 'radio' | 'repair' | 'scan'
  | 'set' | 'shield' | 'srscan' | 'status' | 'summar' | 'target' | 'tell' | 'time' | 'torp' | 'tractr'
  | 'type' | 'users' | 'debug' | 'paswrd';
export type CommandCall = { routine: CommandRoutine; argument?: 0 | 1 | 2 | false };
export type LoopContext = { who: number; player: bigint; ptime: bigint; shared: { players: { alive: bigint }[] } };
export type CommandLoopServices<W> = {
  getcmd(): Generator<W, number, void>;
  invoke(call: CommandCall): Generator<W, CommandReturn | void, void>;
  quit(): Generator<W, void, void>;
  leave(): Generator<W, void, void>;
  finishTurn(automaticRepair: boolean): Generator<W, void, void>;
  // DECWAR's two-label IF(.NOT.ALIVE) requires the compiler's signed-logical
  // branch contract. No generic Boolean coercion is silently substituted.
  movementContinuation(alive: bigint): 'leave' | 'repair';
};
const calls: readonly (CommandCall | null)[] = [
  { routine: 'bases' }, { routine: 'build' }, { routine: 'captur' }, { routine: 'damage', argument: 2 },
  { routine: 'dock' }, { routine: 'energy' }, { routine: 'gripe' }, { routine: 'help' }, { routine: 'impuls' },
  { routine: 'list' }, { routine: 'move' }, { routine: 'news' }, { routine: 'phacon' }, { routine: 'planet' },
  { routine: 'points', argument: false }, null, { routine: 'radio' }, { routine: 'repair', argument: 1 },
  { routine: 'scan' }, { routine: 'set' }, { routine: 'shield' }, { routine: 'srscan' }, { routine: 'status', argument: 2 },
  { routine: 'summar' }, { routine: 'target' }, { routine: 'tell' }, { routine: 'time' }, { routine: 'torp' },
  { routine: 'tractr' }, { routine: 'type', argument: 0 }, { routine: 'users' }, { routine: 'debug' }, { routine: 'paswrd' },
];
const withRepair = new Set([2, 3, 5, 18]);
const weapons = new Set([13, 28]);
const movement = new Set([9, 11]);

// DECWAR.FOR:86-250. Exact command slots, actual arguments, and alternate
// returns. The required invoke adapter owns unported routines and special
// call conventions (including zero-argument CALL TRACTR).
export function* dispatchCommand<W>(ctx: LoopContext, id: number, io: CommandLoopServices<W>): Generator<W, void, void> {
  // Computed GOTO falls through to label 100 if its integer index is outside
  // the table. Noninteger input is not a source integer value.
  if (!Number.isSafeInteger(id)) throw new RangeError('DECWAR command index must be an integer');
  if (id < 1 || id > calls.length) id = 1;
  if (id === 16) { yield* io.quit(); return; }
  const result = yield* io.invoke({ ...calls[id - 1]! });
  if (result?.pause !== undefined) ctx.ptime = result.pause;
  if (withRepair.has(id) || weapons.has(id) || movement.has(id)) {
    if (result === undefined) throw new Error('Time-consuming command must report its source alternate-return result');
    if (result.alternateReturn) return;
    if (movement.has(id) && io.movementContinuation(ctx.shared.players[ctx.who].alive) === 'leave') {
      yield* io.leave(); throw new Error('DECWAR exit path unexpectedly returned');
    }
    yield* io.finishTurn(!weapons.has(id));
  }
}

// Labels 49/50 and the return to label 1. Returning here asks the future host
// to re-enter PREGAM/SETUP; it is not a new player or automatic state reset.
export function* commandLoop<W>(ctx: LoopContext, io: CommandLoopServices<W>): Generator<W, 'pregame', void> {
  for (;;) {
    ctx.player = -1n;
    const id = yield* io.getcmd();
    if (ctx.who === 0) return 'pregame';
    yield* dispatchCommand(ctx, id, io);
  }
}
