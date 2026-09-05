import { constants as K } from '../runtime/variant-values.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import { scanListGroup } from './list-scan.ts';
import type { ListScanServices } from './list-scan.ts';
import type { ListLocals } from './list-state.ts';
import { flagListGroup } from './list-flags.ts';
import { outputList } from './list-report.ts';
import type { ListReportContext, ListRuntime, ListWorld } from './list-world.ts';

export type ListContext = { who: number; team: number; password: boolean };
export type ListServices = Partial<ListScanServices> & {
  // Must include the original WHO=0 addressing contract for pre-game calls.
  ownPosition(who: number): { v: number; h: number };
  // True represents LSTFLG's alternate return to the next group (not abort).
  flagGroup(local: ListLocals): boolean;
  outputSelected(local: ListLocals): void;
};

// LIST.FOR:31-63. All five ENTRYs share the same reset and scan/output loop.
// The returned count is diagnostic; the original routine has no return value.
export function list(ctx: ListContext, command: number, input: TokenMemory, local: ListLocals,
  out: TerminalOutput, io: ListServices): number {
  local.cmd = command; local.team = ctx.team; local.password = ctx.password;
  local.clearOutput();
  const own = io.ownPosition(ctx.who); local.svpos = own.v; local.shpos = own.h;
  out.crlf(); local.p = 1;
  let n = 0;
  while (local.p <= K.KMAXTK) {
    if (input.tokens[local.p - 1].type === K.KEOL) {
      if (n !== 0) io.outputSelected(local);
      return n;
    }
    if (scanListGroup(ctx, input, local, out, io)) return n;
    if (!io.flagGroup(local)) n++;
  }
  return n;
}

// Compose the source driver, scanner, traversal and renderers. Compiler and
// monitor contracts are still required; there is no default literal policy.
export function listCommand(ctx: ListReportContext, command: number, input: TokenMemory, local: ListLocals,
  world: ListWorld, out: TerminalOutput, io: ListRuntime): number {
  return list(ctx, command, input, local, out, { ...io,
    flagGroup: s => flagListGroup(ctx, world, s, out, io),
    outputSelected: s => outputList(ctx, world, s, out, io),
  });
}
