import { constants as K, messages as M, ships as roster } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { signed36 } from '../compat/word36.ts';
import { ingal } from '../compat/board.ts';
import { TerminalOutput } from '../compat/output.ts';
import { prloc } from './format.ts';
import { listSideBit } from './list-state.ts';
import type { ListLocals } from './list-state.ts';

export class UnresolvedListExecution extends Error {}
export type ListScanServices = {
  // LSTSCN:154 reads implicit local SHIP, not the initialized SHIPS in /LOCAL/.
  implicitShipWord(): bigint;
  // LSTSCN:94 can inspect TYPLST(P+1) beyond KMAXTK even before P's check.
  // This callback supplies the compiler's complete predicate result there.
  coordinateLookahead(currentType: number, nextSlot: number): boolean;
  coordinateValue(nextSlot: number): bigint;
};
const B = Object.fromEntries(Object.entries(K).filter(([, value]) => typeof value === 'number')
  .map(([key, value]) => [key, BigInt(value)])) as Record<string, bigint>;
export type ListScanContext = { who: number; team: number };

// LSTSCN.FOR:31-294. Returns true for RETURN 1, false for normal return.
// P is the source's one-based pointer; the caller starts it on the command
// or group separator. NTOK never limits this scan of persistent token memory.
export function scanListGroup(ctx: ListScanContext, input: TokenMemory, s: ListLocals,
  out: TerminalOutput, io: Partial<ListScanServices> = {}): boolean {
  const allObjects = B.SHPBIT | B.BASBIT | B.PLNBIT;
  const allSides = B.FEDBIT | B.EMPBIT | B.NEUBIT | B.ROMBIT;
  s.omask = allObjects; s.smask = allSides; s.lmask = B.LSTBIT; s.range = B.MAXINT;
  switch (s.cmd) {
    case K.SUMCMD: s.lmask = B.SUMBIT; break;
    case K.BASCMD: s.omask = B.BASBIT; s.smask = listSideBit(ctx.team); s.lmask |= B.SUMBIT; break;
    case K.PLNCMD: s.omask = B.PLNBIT; s.smask &= ~B.ROMBIT; s.range = B.KRANGE; break;
    case K.TARCMD: s.smask = listSideBit(3 - ctx.team) | B.ROMBIT; s.range = B.KRANGE; break;
  }
  s.imask = 0n; s.ships = 0n; s.vpos = 0; s.hpos = 0;
  const op = s.p;
  const has = (mask: bigint) => (s.imask & mask) !== 0n;
  const error = (token: Token, syntax = true) => {
    out.out((syntax ? M.lsts03 : M.lsts02).text); out.out(token.text.slice(0, 5)); out.crlf(); return true;
  };
  for (;;) {
    s.p++;
    if (s.p > K.KMAXTK) return true;
    const token = input.tokens[s.p - 1];
    if (token.type === K.KEOL || equal(token.text, '&') || equal(token.text, 'AND')) {
      if (s.p !== op + 1 || op === 1) return false;
      out.out(M.lsts01.text, 1); return true;
    }
    let coordinate: boolean;
    if (s.p === K.KMAXTK) {
      if (!io.coordinateLookahead) throw new UnresolvedListExecution('LSTSCN TYPLST(P+1) beyond token array requires compiler evaluation/memory');
      coordinate = io.coordinateLookahead(token.type, s.p + 1);
    } else coordinate = token.type === K.KINT && input.tokens[s.p].type === K.KINT;
    let action = coordinate ? 2200 : token.type === K.KINT ? 2900 : 1400;
    let ship = 0;
    if (!coordinate && token.type === K.KALF) {
      // Each test is ordered: ambiguous prefixes choose the first match.
      const matches = (master: string) => equal(token.text, master) !== 0;
      if (s.cmd === K.LSTCMD || s.cmd === K.TARCMD) {
        ship = roster.find(entry => matches(entry.name))?.id ?? 0;
        if (ship) action = 1800;
        else if (matches('ROMULAN')) action = 1700;
      }
      if (action === 1400 && [K.LSTCMD, K.SUMCMD, K.TARCMD].some(cmd => cmd === s.cmd)) {
        if (matches('SHIPS')) action = 1900;
        else if (matches('BASES')) action = 2000;
        else if (matches('PLANETS')) action = 2100;
        else if (matches('PORTS')) action = 2150;
      }
      if (action === 1400 && s.cmd !== K.TARCMD) {
        if (matches('FRIENDLY')) action = 2300;
        else if (matches('ENEMY') || matches('TARGETS')) action = 2400;
        else if (matches('FEDERATION') || matches('HUMAN')) action = 2500;
        else if (matches('EMPIRE') || matches('KLINGON')) action = 2600;
      }
      if (action === 1400 && s.cmd !== K.BASCMD && s.cmd !== K.TARCMD) {
        if (matches('NEUTRAL')) action = 2700;
        else if (matches('CAPTURED')) action = 2800;
      }
      if (action === 1400) {
        if (matches('ALL')) action = 2850;
        else if (s.cmd !== K.SUMCMD && matches('CLOSEST')) action = 3000;
        else if (s.cmd !== K.LSTCMD && s.cmd !== K.SUMCMD && matches('LIST')) action = 3100;
        else if (s.cmd !== K.SUMCMD && matches('SUMMARY')) action = 3200;
      }
    }
    // The friendly/enemy branches alter SMASK before checking conflicting
    // side flags at 2500/2600, so failed groups retain those mutations.
    if (action === 2300 || action === 2400) {
      if (ctx.who === 0) return error(token);
      if (action === 2300) { s.smask &= ~B.ROMBIT; action = ctx.team === 1 ? 2500 : 2600; }
      else { s.smask |= B.ROMBIT; action = ctx.team === 1 ? 2600 : 2500; }
    }
    switch (action) {
      case 1400: return error(token, false);
      case 1700:
        if (has(B.ROMBIT)) return error(token);
        s.imask |= B.ROMBIT | B.NAMBIT; s.omask = B.SHPBIT; break;
      case 1800: {
        if (has(~(B.NAMBIT | B.ROMBIT))) return error(token);
        s.imask |= B.NAMBIT;
        if (!io.implicitShipWord) throw new UnresolvedListExecution('LSTSCN implicit local SHIP is read before assignment');
        const bit = 1n << BigInt(ship - 1); // BLKDAT bits(1:10).
        if ((signed36(io.implicitShipWord()) & bit) !== 0n) return error(token);
        s.ships |= bit; s.omask = B.SHPBIT; break;
      }
      case 1900: case 2000:
        if (has(B.OBJMSK | B.NEUBIT | B.CAPBIT)) return error(token);
        s.omask = action === 1900 ? B.SHPBIT : B.BASBIT; s.imask |= s.omask;
        s.smask &= B.FEDBIT | B.EMPBIT | (action === 1900 ? B.ROMBIT : 0n); break;
      case 2100:
        if (has(B.OBJMSK)) return error(token);
        s.imask |= B.PLNBIT; s.omask = B.PLNBIT; s.smask &= B.FEDBIT | B.EMPBIT | B.NEUBIT; break;
      case 2150:
        if (ctx.who === 0 || has(B.OBJMSK)) return error(token);
        s.imask |= B.PRTBIT;
        if (!has(B.NEUBIT)) s.omask = B.BASBIT | B.PLNBIT;
        if (!has(B.SIDMSK)) s.smask = listSideBit(ctx.team) | B.NEUBIT;
        s.smask &= ~B.ROMBIT; break;
      case 2200: {
        if (s.cmd === K.SUMCMD || has(B.OBJMSK | B.SIDMSK | B.ALLBIT | B.RNGBIT | B.CLSBIT | B.OUTMSK)) return error(token);
        s.imask |= B.CRDBIT;
        s.vpos = Number(token.value);
        if (s.p === K.KMAXTK && !io.coordinateValue) throw new UnresolvedListExecution('LSTSCN VALLST(P+1) coordinate read beyond token array');
        s.hpos = Number(s.p === K.KMAXTK ? io.coordinateValue!(s.p + 1) : input.tokens[s.p].value); s.p++;
        if (s.p > K.KMAXTK) return true;
        if (ingal(s.vpos, s.hpos)) break;
        out.out(M.lsts04.text); prloc(out, s.vpos, s.hpos, s.svpos, s.shpos, 1, 0, K.KABS, K.SHORT); return true;
      }
      case 2500: case 2600: {
        if (has(B.SIDMSK | B.CRDBIT)) return error(token);
        const bit = action === 2500 ? B.FEDBIT : B.EMPBIT;
        s.imask |= bit; s.smask = (s.smask & B.ROMBIT) | bit; break;
      }
      case 2700: case 2800:
        if (has(B.SIDMSK | (B.OBJMSK & ~B.PLNBIT))) return error(token);
        s.imask |= action === 2700 ? B.NEUBIT : B.CAPBIT;
        s.smask = action === 2700 ? B.NEUBIT : B.FEDBIT | B.EMPBIT; s.omask = B.PLNBIT; break;
      case 2850:
        if (has(B.ALLBIT | B.CRDBIT)) return error(token);
        s.imask |= B.ALLBIT;
        if (!has(B.SIDMSK) && s.cmd !== K.TARCMD) s.smask = allSides;
        if (!has(B.RNGBIT)) s.range = B.MAXINT; break;
      case 2900:
        if (ctx.who === 0 || has(B.RNGBIT | B.CRDBIT)) return error(token);
        s.imask |= B.RNGBIT; s.range = token.value;
        if (s.range < 1n) return error(token); break;
      case 3000:
        if (ctx.who === 0 || has(B.CLSBIT | B.CRDBIT | B.OUTMSK)) return error(token);
        s.imask |= B.CLSBIT; s.lmask = B.LSTBIT;
        if (!has(B.RNGBIT)) s.range = B.MAXINT; break;
      case 3100: case 3200: {
        if (has(B.OUTMSK | B.CRDBIT | B.CLSBIT | B.NAMBIT)) return error(token);
        const list = action === 3100, bit = list ? B.LSTBIT : B.SUMBIT;
        s.imask |= bit;
        if (!list && !has(B.RNGBIT)) s.range = B.MAXINT;
        s.lmask |= bit;
        if (s.cmd !== (list ? K.SUMCMD : K.LSTCMD) && !has(list ? B.SUMBIT : B.LSTBIT)) s.lmask = bit;
        break;
      }
    }
  }
}
