import { constants as K, messages as M } from '../generated/source-data.ts';
import { ldis } from '../compat/board.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { TerminalOutput } from '../compat/output.ts';
import { add36 } from '../compat/word36.ts';
import { min, max } from './ship.ts';
import { damage, status } from './reports.ts';
import type { ReportContext } from './reports.ts';
import { objectText } from './format.ts';
import { repair } from './repair.ts';

export type CommandReturn = { alternateReturn: boolean; pause?: bigint };

// Complete the REPAIR -> DAMAGE -> elapsed-time sequence from REPAIR.FOR.
export function repairCommand(context: ReportContext, tokens: Token[], mode: 1 | 2 | 3,
  out: TerminalOutput, elapsed: () => bigint): CommandReturn {
  const result = repair(context.ship, mode, tokens, elapsed);
  if (result.damageTokenIndex !== undefined) damage(context, tokens, result.damageTokenIndex, out);
  return result.finish();
}

export type DockContext = ReportContext & {
  team: 1 | 2;
  // Exactly the current team's ten BASE entries; unused/dead entries remain.
  bases: readonly { v: number; h: number; strength: bigint }[];
  // LOCPLN entries 1..NPLNET, including their existing source ordering.
  planets: readonly { v: number; h: number }[];
  capturedPlanets: number;
  alive: boolean;
  slowestTerminal: bigint;
};

// DOCK.FOR:35-80, with its STATUS(3) call integrated. Does not perform the
// main program's subsequent automatic REPAIR or global turn housekeeping.
export function dock(context: DockContext, tokens: Token[], out: TerminalOutput, elapsed: () => bigint): CommandReturn {
  const { ship, board, oflg } = context;
  if (context.bases.length !== K.KNBASE) throw new RangeError('DOCK requires all ten BASE slots');
  const deadline = add36(add36(elapsed(), context.slowestTerminal * 1000n), 1000n);
  let fraction = 0n;
  for (const base of context.bases) {
    if (base.strength <= 0n) continue;
    if (ldis(ship.v, ship.h, base.v, base.h, 1)) fraction += 2n;
  }
  if (context.capturedPlanets > 0) for (const planet of context.planets) {
    if (context.team + K.DXNPLN !== board.dispc(planet.v, planet.h)) continue;
    if (ldis(ship.v, ship.h, planet.v, planet.h, 1)) fraction++;
  }
  if (fraction === 0n) {
    out.crlf(); out.out(objectText(BigInt(board.disp(ship.v, ship.h)), oflg, 1));
    out.out(M.dock01.text, 1);
    return { alternateReturn: true };
  }
  if (!context.alive) return { alternateReturn: true };
  ship.torpedoes = min(add36(ship.torpedoes, fraction * 5n), 10n);
  ship.energy = min(add36(ship.energy, fraction * 5000n), 50000n);
  ship.shieldStrength = min(add36(ship.shieldStrength, fraction * 100n), 1000n);
  ship.damage = max(add36(ship.damage, -fraction * 500n), 0n);
  if (ship.docked) ship.damage = max(add36(ship.damage, -fraction * 500n), 0n);
  ship.docked = true; ship.lifeReserves = 5n; ship.condition = K.GREEN;
  out.out(M.dockin.text, 1);
  if (equal(tokens[1]?.text ?? '', 'STATUS')) status(context, tokens, 3, out);
  return { alternateReturn: false, pause: add36(deadline, -elapsed()) };
}
