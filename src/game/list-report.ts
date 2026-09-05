import { constants as K, messages as M } from '../generated/source-data.ts';
import { add36, multiply36, signed36 } from '../compat/word36.ts';
import { formatTenths, TerminalOutput } from '../compat/output.ts';
import { objectText, prloc } from './format.ts';
import type { ListLocals, ListWord } from './list-state.ts';
import type { ListReportContext, ListRuntime, ListWorld } from './list-world.ts';
import { UnresolvedListExecution } from './list-scan.ts';

// LSTOBJ.FOR:43-87. Out-of-table computed GOTO falls through to the Romulan
// path, even for empty space, stars and black holes. PRLOC reads current WHO.
export function listObject(ctx: ListReportContext, w: ListWorld, s: ListLocals,
  out: TerminalOutput, io: ListRuntime): void {
  out.write(s.side === 0 || s.side === ctx.team || s.cmd === K.TARCMD ? ' ' : '*');
  out.out(objectText(BigInt(s.code), ctx.oflg)); out.tab(ctx.oflg === K.LONG ? 14 : 5);
  const location = () => {
    const own = io.ownPosition(ctx.who);
    prloc(out, s.vpos, s.hpos, own.v, own.h, 0, 2, ctx.ocflg, ctx.oflg);
  };
  const distant = (s.xf & BigInt(K.ORNBIT)) !== 0n;
  if (s.object === 3 || s.object === 4) {
    location();
    if ((s.xf & BigInt(K.ORNBIT)) === 0n) { out.oflt(w.bases[s.side][s.index].strength, 6, ctx.oflg); if (ctx.oflg !== K.SHORT) out.write('%'); }
  } else if (s.object >= 6 && s.object <= 8) {
    location(); const b = w.planets[s.index].builds;
    if (b !== 0n) {
      out.odec(b, 6);
      if (ctx.oflg === K.LONG) out.out(b === 1n ? M.build3.text : io.literal('builds'));
      if (ctx.oflg === K.MEDIUM) out.out(io.literal('buildAbbreviation'));
    }
  } else if (distant) out.out(io.literal('outOfRange'));
  else {
    location();
    if (s.object === 1 || s.object === 2) {
      const ship = w.players[s.index].ship;
      out.write(formatTenths(multiply36(ship.shieldCondition, ship.shieldStrength), 6, ctx.oflg, true));
    } else out.oflt(w.erom, 6, ctx.oflg);
    if (ctx.oflg !== K.SHORT) out.write('%');
  }
  out.crlf();
}

// LSTSUM.FOR:30-44. N is read again after output, and is zeroed only at the
// final statement. Readers retain argument aliasing and output-time changes.
export function listSummary(ctx: Pick<ListReportContext, 'oflg'>, count: ListWord,
  text: () => string, flags: ListWord, out: TerminalOutput): void {
  if (count.value === 0n) return;
  out.odec(count.value, 3);
  if ((flags.value & BigInt(K.KNOBIT)) !== 0n) out.out(M.known.text);
  out.spaces(1); out.out(text()); if (count.value !== 1n) out.write('s');
  if (ctx.oflg !== K.SHORT) {
    let msg = M.inrang.text as string;
    if ((flags.value & BigInt(K.ISRBIT)) !== 0n) msg = M.inspra.text;
    if ((flags.value & BigInt(K.IGMBIT)) !== 0n) msg = M.ingame.text;
    out.out(msg);
  }
  out.crlf(); count.value = 0n;
}

// LSTOUT.FOR:31-132. SUM persists across categories; calls to LSTSUM clear
// each passed element unless TARGETS skips those calls. Scan updates occur
// after the actual row output, and depend on the then-current XF/PASBIT.
export function outputList(ctx: ListReportContext, w: ListWorld, s: ListLocals,
  out: TerminalOutput, io: ListRuntime): void {
  const sum = [{ value: 0n }, { value: 0n }, { value: 0n }], nt = { value: 0n };
  const has = (flag: number) => (s.xf & BigInt(flag)) !== 0n;
  const row = () => listObject(ctx, w, s, out, io);
  if (s.romctr.value !== 0n) {
    s.xf = s.romlst.value;
    if (has(K.LSTBIT)) {
      s.side = 3; s.code = K.DXROM * 100; s.object = K.DXROM;
      s.vpos = w.locr.v; s.hpos = w.locr.h; out.crlf(); row();
    }
    if (has(K.SUMBIT)) { nt.value = add36(nt.value, 1n); out.crlf(); listSummary(ctx, s.romctr, () => io.literal('romulan'), s.rxf, out); }
  }
  let first = s.shpctr[1].value === 0n ? K.KNPLAY / 2 + 1 : 1;
  let last = s.shpctr[2].value === 0n ? K.KNPLAY / 2 : K.KNPLAY;
  if (first <= last) {
    out.crlf();
    for (s.index = first; s.index <= last; s.index++) {
      s.xf = s.shplst[s.index].value; if (s.xf === 0n) continue;
      s.side = s.index > K.KNPLAY / 2 ? 2 : 1;
      if (has(K.LSTBIT)) {
        s.object = s.side; s.code = s.object * 100 + s.index;
        s.vpos = w.players[s.index].ship.v; s.hpos = w.players[s.index].ship.h; row();
      }
      if (has(K.SUMBIT)) { sum[s.side].value = add36(sum[s.side].value, 1n); if (s.side !== ctx.team) nt.value = add36(nt.value, 1n); }
    }
    if (s.cmd !== K.TARCMD) {
      out.crlf(); listSummary(ctx, sum[1], () => M.fedshp.text, s.sxf[1], out);
      listSummary(ctx, sum[2], () => M.empshp.text, s.sxf[2], out);
    }
  }
  first = s.basctr[1].value === 0n ? 2 : 1; last = s.basctr[2].value === 0n ? 1 : 2;
  if (first <= last) {
    out.crlf();
    for (s.side = first; s.side <= last; s.side++) for (s.index = 1; s.index <= K.KNBASE; s.index++) {
      s.xf = s.baslst[s.side][s.index].value; if (s.xf === 0n) continue;
      if (has(K.LSTBIT)) {
        s.object = s.side + 2; s.code = s.object * 100 + s.index;
        s.vpos = w.bases[s.side][s.index].v; s.hpos = w.bases[s.side][s.index].h; row();
        if (!has(K.PASBIT)) w.bases[s.side][s.index].scanned = signed36(w.bases[s.side][s.index].scanned | BigInt(ctx.team));
      }
      if (has(K.SUMBIT)) { sum[s.side].value = add36(sum[s.side].value, 1n); if (s.side !== ctx.team) nt.value = add36(nt.value, 1n); }
    }
    if (s.cmd !== K.TARCMD) {
      out.crlf(); listSummary(ctx, sum[1], () => M.fedbas.text, s.bxf[1], out);
      listSummary(ctx, sum[2], () => M.empbas.text, s.bxf[2], out);
    }
  }
  if (s.plnctr.value !== 0n) {
    out.crlf(); const lastPlanet = w.nplnet;
    const visitPlanet = () => {
      s.xf = s.plnlst[s.index].value; if (s.xf === 0n) return;
      s.vpos = w.planets[s.index].v; s.hpos = w.planets[s.index].h;
      s.object = w.board.dispc(s.vpos, s.hpos); s.side = s.object - 6;
      if (has(K.LSTBIT)) {
        s.code = s.object * 100 + s.index; row();
        if (!has(K.PASBIT)) w.planets[s.index].scanned = signed36(w.planets[s.index].scanned | BigInt(ctx.team));
      }
      if (has(K.SUMBIT)) { sum[s.side].value = add36(sum[s.side].value, 1n); if (s.side === 3 - ctx.team) nt.value = add36(nt.value, 1n); }
    };
    if (lastPlanet < 1) {
      if (!io.reversedPlanetOutputLoop) throw new UnresolvedListExecution('LSTOUT reversed planet DO bounds require compiler trip-count and final-variable policy');
      const loop = io.reversedPlanetOutputLoop(1, lastPlanet);
      for (const index of loop.iterations) { s.index = index; visitPlanet(); }
      s.index = loop.after;
    } else {
      for (s.index = 1; s.index <= lastPlanet; s.index++) visitPlanet();
    }
    if (s.cmd !== K.TARCMD) {
      out.crlf(); listSummary(ctx, sum[0], () => M.neupln.text, s.pxf[0], out);
      listSummary(ctx, sum[1], () => M.fedpln.text, s.pxf[1], out);
      listSummary(ctx, sum[2], () => M.emppln.text, s.pxf[2], out);
    }
  }
  if (s.cmd === K.TARCMD && nt.value !== 0n) { out.crlf(); listSummary(ctx, nt, () => io.literal('target'), s.targetFlags, out); }
}
