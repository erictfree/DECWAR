import { constants as K, deviceKeys, messages as M } from '../generated/source-data.ts';
import { PackedBoard } from '../compat/board.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { formatTenths, TerminalOutput } from '../compat/output.ts';
import { multiply36 } from '../compat/word36.ts';
import type { Ship } from './ship.ts';
import { conditionText, deviceText, objectText, prloc } from './format.ts';

export type ReportContext = { ship: Ship; who: number; board: PackedBoard; oflg: number; nomsg: bigint; deviceWord?: (index: number) => string };
const eol: Token = { text: '', type: -1, value: 0n, offset: 0 };

// DAMAGE.FOR:32-78. Unknown alpha device switches are silently ignored;
// matching a prefix can print multiple devices and includes undamaged devices.
export function damage(context: ReportContext, tokens: readonly Token[], stoken: number, out: TerminalOutput): void {
  const { ship, oflg, board } = context;
  out.crlf();
  if (!ship.devices.slice(1, K.KNDEV + 1).some(value => value > 0n)) { out.out(M.alldok.text, 1); return; }
  const row = (device: number) => {
    out.out(deviceText(device, oflg));
    if (oflg < 0) out.spaces(1); else out.tab(oflg === 0 ? 10 : 19);
    out.oflt(ship.devices[device], 4, oflg);
    if (oflg === K.LONG) out.out(M.units1.text);
    out.crlf();
  };
  if (tokens[stoken - 1]?.type === K.KALF) {
    for (let i = stoken - 1; i < K.KMAXTK; i++) {
      const token = tokens[i] ?? eol;
      if (token.type !== K.KALF) return;
      for (let device = 1; device <= K.KNDEV; device++) if (equal(token.text, context.deviceWord ? context.deviceWord(device) : deviceKeys[device - 1])) row(device);
    }
    return;
  }
  if (oflg > 0) {
    out.out(M.damrep.text);
    out.out(objectText(BigInt(board.disp(ship.v, ship.h)), oflg));
    out.skip(2);
  }
  if (oflg >= 0) {
    out.out(M.dmhdr1.text);
    if (oflg === K.LONG) out.spaces(9);
    out.out(M.dmhdr2.text, 2);
  }
  for (let device = 1; device <= K.KNDEV; device++) if (ship.devices[device] > 0n) row(device);
}

// STATUS.FOR:34-164. Full reports intentionally rewrite the caller's tokens.
// NTOK is a separate source scalar and remains unchanged. A session driver
// must not infer NTOK from the expanded backing array's length after this call.
export function status(context: ReportContext, tokens: Token[], stoken: number, out: TerminalOutput): void {
  const { ship, oflg } = context;
  const short = oflg === K.SHORT, width = short ? 0 : 4;
  const label = (s: string, m: string, l: string) => out.out(oflg < 0 ? s : oflg === 0 ? m : l);
  const endItem = () => { if (oflg < 0) out.spaces(1); else out.crlf(); };
  out.crlf();
  if ((tokens[stoken - 1] ?? eol).type === K.KEOL) {
    label('SD', M.stat2m.text, M.stat2l.text);
    out.odec(ship.turns, width); endItem();
    // Memory-backed token arrays expose neighboring source words beyond their
    // declared length; only component arrays need synthetic backing slots.
    for (let i = tokens.length; i < stoken + 7; i++) if (tokens[i] === undefined) tokens.push({ ...eol });
    tokens[stoken + 6].type = K.KEOL;
    for (const [i, text] of ['C', 'L', 'T', 'E', 'D', 'S', 'R'].entries()) {
      tokens[stoken - 1 + i].text = text;
    }
    for (let i = 0; i < 7; i++) tokens[stoken - 1 + i].type = K.KALF;
  }
  for (let i = stoken - 1; i < K.KMAXTK; i++) {
    const token = tokens[i] ?? eol;
    if (token.type !== K.KALF) { if (short) out.crlf(); return; }
    if (equal(token.text, 'SHIELDS')) {
      label('SH', M.stat3m.text, M.stat3l.text);
      out.write(formatTenths(multiply36(ship.shieldCondition, ship.shieldStrength), width, oflg, true));
      if (!short) out.write('%');
      out.spaces(1);
      if (short) continue;
      out.oflt(multiply36(ship.shieldStrength, 25n), width, oflg);
      out.out(M.stat05.text); out.crlf();
    } else if (equal(token.text, 'LOCATION')) {
      label('', M.stat6m.text, M.stat6l.text);
      prloc(out, ship.v, ship.h, ship.v, ship.h, 0, 0, K.KABS, K.SHORT); endItem();
    } else if (equal(token.text, 'CONDITION')) {
      label('', M.stat7m.text, M.stat7l.text);
      out.out(conditionText(ship.condition, ship.docked ? -1n : 0n, oflg)); endItem();
    } else if (equal(token.text, 'TORPEDO')) {
      label('T', M.stat8m.text, M.stat8l.text); out.odec(ship.torpedoes, width); endItem();
    } else if (equal(token.text, 'ENERGY')) {
      label('E', M.stat9m.text, M.stat9l.text); out.oflt(ship.energy, width, oflg); endItem();
    } else if (equal(token.text, 'DAMAGE')) {
      label('D', M.sta10m.text, M.sta10l.text); out.oflt(ship.damage, width, oflg); endItem();
    } else if (equal(token.text, M.radio3.text)) {
      label('R', M.radio3.text, M.radio1.text);
      if (ship.devices[K.KDRAD] >= BigInt(K.KCRIT)) out.out(M.stat11.text);
      else out.write(((1n << BigInt(context.who - 1)) & context.nomsg) !== 0n ? 'Off' : 'On');
      endItem();
    } else out.out(M.syntax.text, 1);
  }
}
