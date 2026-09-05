import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { pdist } from '../compat/board.ts';
import { TerminalOutput } from '../compat/output.ts';
import { objectText, prloc } from './format.ts';
import { listSideBit } from './list-state.ts';
import type { ListLocals, ListWord } from './list-state.ts';
import type { ListReportContext, ListRuntime, ListWorld } from './list-world.ts';
import { updateListSelection } from './list-update.ts';
import { listObject } from './list-report.ts';
import { UnresolvedListExecution } from './list-scan.ts';

// LSTFLG.FOR:32-229. True is the alternate return to the next input group.
export function flagListGroup(ctx: ListReportContext, w: ListWorld, s: ListLocals,
  out: TerminalOutput, io: ListRuntime): boolean {
  const has = (flag: number) => (s.imask & BigInt(flag)) !== 0n;
  const sideSelected = (flag: number) => (s.smask & BigInt(flag)) !== 0n;
  const upd = (mask: ListWord, count: ListWord, scanned: bigint, flags: ListWord) => {
    // TEAM/PASFLG belong to the session, not the LSTVAR reset region.
    s.team = ctx.team; s.password = ctx.password;
    updateListSelection(s, mask, count, { value: scanned }, flags);
  };
  const row = () => listObject(ctx, w, s, out, io);
  const location = (mode: number, verbosity: number) => {
    const own = io.ownPosition(ctx.who);
    prloc(out, s.vpos, s.hpos, own.v, own.h, 1, 0, mode, verbosity);
  };
  const tooFar = () => { out.out(M.lstf01.text); location(K.KABS, K.SHORT); return false; };
  const absent = () => {
    if (s.cmd === K.BASCMD) out.out(M.lstf02.text);
    if (s.cmd === K.PLNCMD) out.out(M.lstf03.text);
    if (s.cmd === K.TARCMD) out.out(M.lstf04.text);
    location(ctx.ocflg, K.LONG); return false;
  };
  const coordinate = () => {
    s.code = w.board.disp(s.vpos, s.hpos); s.object = Math.trunc(s.code / 100); s.index = s.code % 100; s.side = 0;
    const d = pdist(s.vpos, s.hpos, s.svpos, s.shpos);
    let scanned = 0n;
    if (s.object === 1 || s.object === 2) s.side = s.object;
    else if (s.object === 5) s.side = 3;
    else if (s.object === 3 || s.object === 4) {
      if ((s.omask & BigInt(K.BASBIT)) === 0n) return absent();
      s.side = s.object - 2; scanned = w.bases[s.side][s.index].scanned;
    } else if (s.object >= 6 && s.object <= 8) {
      if ((s.omask & BigInt(K.PLNBIT)) === 0n) return absent();
      s.side = s.object - 6; scanned = w.planets[s.index].scanned;
    } else {
      if (d > K.KRANGE) return tooFar();
      if (s.cmd !== K.LSTCMD) return absent();
      row(); return false; // XF is deliberately not assigned on this path.
    }
    const count = { value: 0n }; upd(io.dummy, count, scanned, io.dummy);
    if (count.value === 0n) return tooFar();
    row(); return false;
  };
  s.gxf = BigInt(K.IRNBIT);
  if (s.range > BigInt(K.KGALV)) s.gxf = BigInt(K.IGMBIT);
  if (has(K.RNGBIT)) s.gxf = BigInt(K.ISRBIT);
  s.grpbts = 0n;
  if (s.smask !== listSideBit(ctx.team) && s.range > BigInt(K.KRANGE) && s.gxf !== BigInt(K.IGMBIT)) s.grpbts = BigInt(K.KNOBIT);
  s.gxf |= s.lmask;
  if (has(K.CRDBIT)) return coordinate();
  if (has(K.NAMBIT)) {
    out.crlf();
    if (has(K.ROMBIT)) {
      if (!io.logical(w.romopt)) out.out(M.type06.text, 1);
      else if (!io.logical(w.rom)) out.out(M.lstf05.text, 1);
      else {
        s.side = 3; s.code = 500; s.object = 5; s.vpos = w.locr.v; s.hpos = w.locr.h;
        upd(io.dummy, io.dummy, -1n, io.dummy); row();
      }
    }
    if (s.ships !== 0n) for (s.index = 1; s.index <= K.KNPLAY; s.index++) {
      if ((s.ships & (1n << BigInt(s.index - 1))) === 0n) continue;
      s.side = s.index > K.KNPLAY / 2 ? 2 : 1; s.object = s.side; s.code = s.object * 100 + s.index;
      if (io.logical(w.players[s.index].alive)) {
        s.vpos = w.players[s.index].ship.v; s.hpos = w.players[s.index].ship.h;
        if (w.board.disp(s.vpos, s.hpos) !== 0) { upd(io.dummy, io.dummy, -1n, io.dummy); row(); continue; }
      }
      out.out(objectText(BigInt(s.code), ctx.oflg)); out.out(io.literal('inactiveShip'), 1);
    }
    return false;
  }
  s.clsest = BigInt(K.MAXINT);
  if ((s.omask & BigInt(K.SHPBIT)) !== 0n) {
    if (sideSelected(K.ROMBIT) && io.logical(w.rom)) {
      s.vpos = w.locr.v; s.hpos = w.locr.h; s.side = 3;
      let scn = (s.gxf & BigInt(K.IGMBIT)) !== 0n ? -1n : 0n;
      if (has(K.CLSBIT)) scn = 0n;
      upd(s.romlst, s.romctr, scn, s.rxf);
    }
    const first = sideSelected(K.FEDBIT) ? 1 : K.KNPLAY / 2 + 1;
    const last = sideSelected(K.EMPBIT) ? K.KNPLAY : K.KNPLAY / 2;
    for (let i = first; i <= last; i++) {
      if (!io.logical(w.players[i].alive)) continue;
      s.vpos = w.players[i].ship.v; s.hpos = w.players[i].ship.h;
      if (w.board.disp(s.vpos, s.hpos) === 0) continue;
      s.side = i > K.KNPLAY / 2 ? 2 : 1;
      if (has(K.CLSBIT) && i === ctx.who) continue;
      const scn = !has(K.CLSBIT) && (s.gxf & BigInt(K.IGMBIT)) !== 0n ? -1n : 0n;
      upd(s.shplst[i], s.shpctr[s.side], scn, s.sxf[s.side]);
    }
  }
  if ((s.omask & BigInt(K.BASBIT)) !== 0n) {
    const first = sideSelected(K.FEDBIT) ? 1 : 2, last = sideSelected(K.EMPBIT) ? 2 : 1;
    const visitSide = () => {
      for (let i = 1; i <= K.KNBASE; i++) {
        if (w.bases[s.side][i].strength <= 0n) continue;
        s.vpos = w.bases[s.side][i].v; s.hpos = w.bases[s.side][i].h;
        upd(s.baslst[s.side][i], s.basctr[s.side], w.bases[s.side][i].scanned, s.bxf[s.side]);
      }
    };
    if (first > last) {
      if (!io.reversedBaseLoop) throw new UnresolvedListExecution('LSTFLG reversed base DO bounds require compiler trip-count and final-variable policy');
      const loop = io.reversedBaseLoop(first, last);
      for (const side of loop.iterations) { s.side = side; visitSide(); }
      s.side = loop.after;
    } else {
      for (s.side = first; s.side <= last; s.side++) visitSide();
    }
  }
  if ((s.omask & BigInt(K.PLNBIT)) !== 0n && w.nplnet !== 0) {
    const last = w.nplnet;
    for (let i = 1; i <= last; i++) {
      s.vpos = w.planets[i].v; s.hpos = w.planets[i].h; s.side = w.board.dispc(s.vpos, s.hpos) - 6;
      if ((s.smask & listSideBit(s.side)) === 0n) continue;
      upd(s.plnlst[i], s.plnctr, w.planets[i].scanned, s.pxf[s.side]);
    }
  }
  if (has(K.CLSBIT)) {
    s.vpos = s.vposc; s.hpos = s.hposc; s.imask &= ~BigInt(K.CLSBIT);
    if (s.clsest !== BigInt(K.MAXINT)) return coordinate();
  } else if ((s.grpbts & BigInt(K.LSTBIT | K.SUMBIT)) !== 0n) return false;
  out.out((ctx.oflg === K.LONG ? M.lstf06 : M.lstf07).text);
  if ((s.grpbts & BigInt(K.KNOBIT)) !== 0n) out.out(M.known.text);
  let msg = '';
  if (s.smask === BigInt(K.NEUBIT)) msg = M.lstf08.text;
  if (s.smask === BigInt(K.FEDBIT)) msg = M.lstf09.text;
  if (s.smask === BigInt(K.EMPBIT)) msg = M.lstf10.text;
  if (s.smask === BigInt(K.FEDBIT | K.EMPBIT) && s.omask === BigInt(K.PLNBIT)) msg = M.lstf11.text;
  if (sideSelected(K.ROMBIT) && !sideSelected(K.NEUBIT)) msg = M.lstf12.text;
  out.out(msg);
  // MSG is not reset between adjective and object selection.
  if (s.omask === BigInt(K.PLNBIT)) msg = M.lstf13.text;
  if (s.omask === BigInt(K.BASBIT)) msg = M.lstf14.text;
  if (s.omask === BigInt(K.SHPBIT)) msg = M.lstf15.text;
  if (s.omask === BigInt(K.BASBIT | K.PLNBIT)) msg = M.lstf16.text;
  if (s.omask === BigInt(K.PLNBIT | K.BASBIT | K.SHPBIT)) msg = M.lstf17.text;
  out.out(msg);
  if (ctx.oflg !== K.SHORT) {
    msg = M.ingame.text;
    if ((s.grpbts & BigInt(K.IRNBIT)) !== 0n) msg = M.inrang.text;
    if ((s.grpbts & BigInt(K.ISRBIT)) !== 0n) msg = M.inspra.text;
    if ((s.grpbts & BigInt(K.IGMBIT)) !== 0n) msg = M.ingame.text;
    out.out(msg);
  }
  out.crlf(); return true;
}
