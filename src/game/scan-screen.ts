import { scanObjects, outputTables as T } from '../generated/source-data.ts';
import { HALF_MASK, add36, signed36 } from '../compat/word36.ts';
import { PackedBoard, ingal } from '../compat/board.ts';
import { o2db, TerminalOutput } from '../compat/output.ts';

export type ScanOutputContext = { scnflg: number; ccflg: bigint };

// WARMAC.MAC:532-538,2799-2843. Six metadata words precede SCREEN, and rows
// start nine words apart. IDPB replaces only the selected seven-bit field.
export class ScanScreen {
  readonly words: bigint[];
  private surroundingMemory: boolean;
  constructor(words = Array<bigint>(200).fill(0n), surroundingMemory = false) {
    if (words.length !== 200) throw new RangeError('SCAN requires the 200-word LOCAL window');
    this.words = words; this.surroundingMemory = surroundingMemory;
  }
  get hmin(): number { return Number(this.words[0]); } set hmin(n: number) { this.words[0] = BigInt(n); }
  get hmax(): number { return Number(this.words[1]); } set hmax(n: number) { this.words[1] = BigInt(n); }
  get vmin(): number { return Number(this.words[2]); } set vmin(n: number) { this.words[2] = BigInt(n); }
  get vmax(): number { return Number(this.words[3]); } set vmax(n: number) { this.words[3] = BigInt(n); }
  get dh(): number { return Number(this.words[4]); } set dh(n: number) { this.words[4] = BigInt(n); }
  get dv(): number { return Number(this.words[5]); } set dv(n: number) { this.words[5] = BigInt(n); }
  private field(byte: number): { index: number; shift: bigint } {
    const index = 6 + Math.floor(byte / 5);
    if (!Number.isInteger(byte) || (!this.surroundingMemory && (byte < 0 || index >= this.words.length))) throw new RangeError('SCAN byte pointer outside represented LOCAL storage');
    return { index, shift: BigInt(29 - ((byte % 5 + 5) % 5) * 7) };
  }
  put(byte: number, value: number): void {
    const { index, shift } = this.field(byte);
    this.words[index] = signed36((this.words[index] & ~(127n << shift)) | ((BigInt(value) & 127n) << shift));
  }
  get(byte: number): number { const { index, shift } = this.field(byte); return Number((this.words[index] >> shift) & 127n); }
}

// OBJTBL/GETSHP:2846-2860. The scan symbols intentionally differ from ODISP.
function scanPair(code: number, warning: boolean): string {
  if (code === -1 || code === 4095) code = 0; // 12-bit all-ones cloaked cell.
  const kind = warning && code === 0 ? -1 : Math.trunc(code / 100);
  if (kind === 1 || kind === 2) {
    const name = T.shtshp[code % 100 - 1]?.text;
    if (name == null) throw new RangeError('SCAN ship lookup requires original out-of-table memory');
    return ' ' + name[0];
  }
  const pair = scanObjects[kind + 1]?.text;
  if (pair == null) throw new RangeError('SCAN OBJTBL execution outside supplied object table');
  return pair;
}

export function setScan(screen: ScanScreen, board: PackedBoard, ctx: ScanOutputContext,
  hmin: number, hmax: number, vmin: number, vmax: number): void {
  screen.hmin = hmin; screen.vmin = vmin; screen.vmax = vmax; screen.dv = vmax - vmin + 1;
  screen.hmax = hmax; screen.dh = hmax - hmin + 1;
  if (!ingal(vmin, hmin) || !ingal(vmax, hmax) || screen.dv < 1 || screen.dh < 1) {
    throw new RangeError('SETSCN bounds require original board/pointer memory semantics');
  }
  for (let v = vmin; v <= vmax; v++) {
    let byte = (v - vmin) * 45;
    for (let h = hmin; h <= hmax; h++) {
      const pair = scanPair(board.disp(v, h), false);
      if (ctx.scnflg >= 0) screen.put(byte++, pair.charCodeAt(0));
      screen.put(byte++, pair.charCodeAt(1));
    }
    screen.put(byte, 0);
  }
}

// RELOC.:2932-2942. Immediate operands use eighteen-bit effective addresses;
// HRREI sign-extends the final eighteen-bit inclusive distance.
export function scanRelocate(center: bigint, radius: bigint, min: bigint, max: bigint): { first: bigint; count: bigint } {
  let end = add36(center & HALF_MASK, radius & HALF_MASK);
  if (end > (max & HALF_MASK)) end = max & HALF_MASK;
  let first = add36(center, -(radius & HALF_MASK));
  if (first < (min & HALF_MASK)) first = min & HALF_MASK;
  const delta = add36(end, -(first & HALF_MASK));
  return { first, count: BigInt.asIntN(18, delta + 1n) };
}

// MARK:2867-2924. Rebuilds each affected cell from the live board; does not
// just paint over saved dots. It does not replace the row's terminating byte.
export function markScan(screen: ScanScreen, board: PackedBoard, ctx: ScanOutputContext,
  vcenter: number, hcenter: number, radius: bigint): void {
  const h = scanRelocate(BigInt(hcenter), radius, BigInt(screen.hmin), BigInt(screen.hmax));
  if (h.count <= 0n) return;
  const v = scanRelocate(BigInt(vcenter), radius, BigInt(screen.vmin), BigInt(screen.vmax));
  if (v.count <= 0n) return;
  for (let row = Number(v.first); row < Number(v.first + v.count); row++) {
    let byte = (row - screen.vmin) * 45 + (Number(h.first) - screen.hmin) * (ctx.scnflg < 0 ? 1 : 2);
    for (let column = Number(h.first); column < Number(h.first + h.count); column++) {
      const pair = scanPair(board.disp(row, column), true);
      if (ctx.scnflg >= 0) screen.put(byte++, pair.charCodeAt(0));
      screen.put(byte++, pair.charCodeAt(1));
    }
  }
}

// SHWSCN/LABL.:2948-3000. Descending row order, mandatory first horizontal
// label, and Ctrl-C tested/cleared only after printing a whole row.
export function showScan(screen: ScanScreen, ctx: ScanOutputContext, out: TerminalOutput): void {
  const labels = () => {
    out.spaces(1); let column = screen.hmin;
    if (ctx.scnflg < 0) column++;
    out.spaces(2);
    for (;;) {
      o2db(out, BigInt(column)); column += ctx.scnflg < 0 ? 3 : 2;
      if (column > screen.hmax) break;
      out.spaces(1); if (ctx.scnflg >= 0) out.spaces(1);
    }
    out.crlf();
  };
  out.crlf(); labels();
  let row = screen.vmax, byte = (screen.dv - 1) * 45;
  for (;;) {
    o2db(out, BigInt(row)); out.spaces(1);
    for (let p = byte; ; p++) { const char = screen.get(p); if (char === 0) break; out.character(BigInt(char)); }
    out.spaces(1); o2db(out, BigInt(row)); out.crlf();
    if (ctx.ccflg !== 0n) { ctx.ccflg = 0n; return; }
    row--; if (row < screen.vmin) break;
    byte -= 45;
  }
  labels();
}
