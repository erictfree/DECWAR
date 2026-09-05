import { constants as K, messages as M } from '../generated/source-data.ts';
import { add36 } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { Ship } from './ship.ts';
import type { Scores } from './scores.ts';

export type TurnContext = {
  who: number; team: number; prtype: number; player: bigint; tpoint: bigint[];
  shared: { players: { ship: Ship }[]; scores: Scores; dotime: bigint; numply: bigint; romopt: bigint };
};
export type TurnServices<W> = {
  repair(mode: 3): Generator<W, void, void>;
  baspha(): Generator<W, void, void>;
  plnatk(): Generator<W, void, void>;
  basbld(): Generator<W, void, void>;
  romdrv(): Generator<W, void, void>; // Driver supplies DECWAR's D1/D2 argument storage.
};

// DECWAR.FOR:254-289 (labels 3400-3700). Call only after a normal return
// from a time-consuming command. Alternate returns bypass this whole path.
export function* finishTurn<W>(ctx: TurnContext, automaticRepair: boolean,
  out: TerminalOutput, io: TurnServices<W>): Generator<W, void, void> {
  if (automaticRepair) yield* io.repair(3);
  const world = ctx.shared;
  world.dotime = add36(world.dotime, 1n);
  if (world.dotime >= world.numply) {
    world.dotime = 0n;
    yield* io.baspha();
    yield* io.plnatk();
    yield* io.basbld();
    if (world.romopt !== 0n) yield* io.romdrv();
  }
  const ship = world.players[ctx.who].ship;
  ship.turns = add36(ship.turns, 1n);
  world.scores.turns[ctx.team] = add36(world.scores.turns[ctx.team], 1n);
  if (ship.devices[K.KDLIFE] >= BigInt(K.KCRIT)) {
    if (!ship.docked) ship.lifeReserves = add36(ship.lifeReserves, -1n);
    if (ship.lifeReserves < 0n) ship.damage = BigInt(K.KENDAM);
    if (ctx.prtype === 0) {
      out.out(M.lifdam.text);
      out.odec(ship.lifeReserves);
      out.out(M.strdat.text, 1);
    }
  }
  for (let category = 1; category <= K.KNPOIN; category++) {
    world.scores.setPlayer(category, ctx.who, add36(world.scores.player(category, ctx.who), ctx.tpoint[category]));
    world.scores.setTeam(ctx.team, category, add36(world.scores.team(ctx.team, category), ctx.tpoint[category]));
    ctx.tpoint[category] = 0n;
  }
  // ROMDRV may leave PLAYER false. DECWAR resets it at label 50, not here.
}
