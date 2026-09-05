import { constants as K, messages as M } from '../generated/source-data.ts';
import { add36, divide36, signed36 } from '../compat/word36.ts';
import { ldis } from '../compat/board.ts';
import { equal } from '../compat/parser.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { ListWorld } from './list-world.ts';
import { ScanScreen, setScan, markScan, showScan } from './scan-screen.ts';
import type { ScanOutputContext } from './scan-screen.ts';

export class ScanLocals {
  readonly dist = Array<bigint>(5).fill(0n);
  warn = false; k = 0n; modifier = 0; n = 0; p = 0; d = 0n;
  vpos = 0; hpos = 0; vmin = 0; vmax = 0; hmin = 0; hmax = 0; enemy = 0;
}
export type ScanContext = ScanOutputContext & { who: number; team: number; terwid: bigint };
export type ScanServices = { ownPosition(who: number): { v: number; h: number } };

// SCAN.FOR:44-153. The displayed rectangle and the knowledge radius differ:
// every planet/enemy base in KRANGE is recorded, even outside that rectangle.
export function scan(ctx: ScanContext, input: TokenMemory, w: ListWorld, local: ScanLocals,
  screen: ScanScreen, out: TerminalOutput, io: ScanServices, shortRange = false): void {
  local.dist.fill(BigInt(shortRange ? 7 : K.KRANGE), 1); local.warn = false;
  local.k = divide36(add36(ctx.terwid, -9n), 4n).quotient;
  if (local.dist[1] > local.k) local.dist.fill(local.k, 1);
  const syntax = () => out.out(M.syntax.text, 1);
  if (input.ntok !== 1) {
    const last = input.tokens[input.ntok - 1];
    if (!last) throw new RangeError('SCAN NTOK lookup requires original token memory');
    if (equal(last.text, 'WARNING')) {
      local.warn = true; last.type = K.KEOL; input.ntok--;
    }
    local.modifier = 0; local.n = 0; local.p = 2;
    for (const [word, mod] of [['UP', 2], ['DOWN', 1], ['RIGHT', 4], ['LEFT', 3], ['CORNER', 5]] as const) {
      if (equal(input.tokens[1].text, word)) local.modifier = mod;
    }
    if (local.modifier !== 0) local.p = 3;
    if (input.tokens[local.p - 1].type !== K.KEOL) {
      if (input.tokens[local.p - 1].type !== K.KINT) { syntax(); return; }
      local.d = input.tokens[local.p - 1].value; local.n++; local.p++;
      local.dist.fill(local.d, 1);
      if (input.tokens[local.p - 1].type !== K.KEOL) {
        if (input.tokens[local.p - 1].type !== K.KINT) { syntax(); return; }
        local.d = input.tokens[local.p - 1].value; local.n++; local.p++;
        local.dist[3] = local.dist[4] = local.d;
        if (input.tokens[local.p - 1].type !== K.KEOL) { syntax(); return; }
      }
    }
    if (local.modifier === 5) {
      if (local.n !== 2) { syntax(); return; }
      if (local.dist[1] > 0n) local.dist[2] = 0n;
      if (local.dist[1] < 0n) local.dist[2] = signed36(-local.dist[1]);
      if (local.dist[3] > 0n) local.dist[4] = 0n;
      if (local.dist[3] < 0n) local.dist[4] = signed36(-local.dist[3]);
    } else if (local.modifier !== 0) local.dist[local.modifier] = 0n;
  }
  for (let i = 1; i <= 4; i++) local.dist[i] = local.dist[i] < 0n ? 0n : local.dist[i] > BigInt(K.KRANGE) ? BigInt(K.KRANGE) : local.dist[i];
  const own = io.ownPosition(ctx.who); local.hpos = own.h; local.vpos = own.v;
  local.vmax = Math.min(local.vpos + Number(local.dist[1]), K.KGALV);
  local.vmin = Math.max(local.vpos - Number(local.dist[2]), 1);
  local.hmax = Math.min(local.hpos + Number(local.dist[3]), K.KGALH);
  local.hmin = Math.max(local.hpos - Number(local.dist[4]), 1);
  setScan(screen, w.board, ctx, local.hmin, local.hmax, local.vmin, local.vmax);
  local.enemy = 3 - ctx.team;
  if (w.nplnet > 0) {
    const count = w.nplnet;
    for (let i = 1; i <= count; i++) {
      const p = w.planets[i];
      if (!ldis(p.v, p.h, local.vpos, local.hpos, K.KRANGE)) continue;
      p.scanned = signed36(p.scanned | BigInt(ctx.team));
      if (w.board.dispc(p.v, p.h) - K.DXNPLN !== local.enemy) continue;
      if (local.warn) markScan(screen, w.board, ctx, p.v, p.h, 2n);
    }
  }
  for (let i = 1; i <= K.KNBASE; i++) {
    const base = w.bases[local.enemy]?.[i];
    if (!base) throw new RangeError('SCAN enemy base subscript requires original COMMON memory');
    if (base.strength <= 0n || !ldis(base.v, base.h, local.vpos, local.hpos, K.KRANGE)) continue;
    base.scanned = signed36(base.scanned | BigInt(ctx.team));
    if (local.warn) markScan(screen, w.board, ctx, base.v, base.h, 4n);
  }
  showScan(screen, ctx, out);
}
