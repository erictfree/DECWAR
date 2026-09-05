import { constants as K, outputTables as T } from '../generated/source-data.ts';
import { formatInteger, TerminalOutput } from '../compat/output.ts';
import { signed36 } from '../compat/word36.ts';

// WARMAC.MAC:2393-2454. Both short and medium use the short object symbols.
export function objectText(code: bigint, verbosity: number, trailingSpace = 0): string {
  code = signed36(code);
  if (code < 0n || code / 100n > 10n) code = 0n;
  const kind = Number(code / 100n), index = Number(code % 100n);
  const objects = verbosity > 0 ? T.lngdsp : T.shtdsp;
  const names = verbosity > 0 ? T.lngshp : T.shtshp;
  const value = kind === 1 || kind === 2 ? names[index - 1]?.text : objects[kind]?.text;
  if (value == null) throw new RangeError('ODISP invalid ship index: original memory lookup is unresolved');
  return value + (trailingSpace > 0 ? ' ' : '');
}

// WARMAC.MAC:2464-2502. Trailing spaces are part of each ASCIZ string.
export function deviceText(device: number, verbosity: number): string {
  const table = verbosity < 0 ? T.shtdev : verbosity === 0 ? T.meddev : T.lngdev;
  const value = table[device - 1]?.text;
  if (value == null) throw new RangeError('ODEV invalid device index');
  return value;
}

// WARMAC.MAC:2511-2532. SKIPL tests negative DOCKED, not generic nonzero.
export function conditionText(condition: number, dockedWord: bigint, verbosity: number): string {
  const value = (verbosity < 0 ? T.shtcnd : T.lngcnd)[condition - 1]?.text;
  if (value == null) throw new RangeError('OCOND invalid condition');
  return (dockedWord < 0n ? verbosity < 0 ? 'D+' : 'Docked+' : '') + value;
}

// PRLOC.FOR:34-52. The caller's coordinate/output flags may override OFLG.
export function prloc(out: TerminalOutput, v: number, h: number, ownV: number, ownH: number,
  cr: number, width: number, coordinateMode: number, verbosity: number): void {
  if (coordinateMode !== K.KREL) {
    if (verbosity !== K.SHORT) out.write('@');
    out.odec(BigInt(v), width); out.write('-'); out.odec(BigInt(h), width);
  }
  if (!((v === ownV && h === ownH) && width === 0)) {
    if (coordinateMode === K.KBOTH) out.spaces(1);
    if (coordinateMode !== K.KABS) {
      const w = width === 0 ? 0 : width + 1;
      out.write(formatInteger(BigInt(v - ownV), w, 'nonzero'));
      out.write(',');
      out.write(formatInteger(BigInt(h - ownH), w, 'nonzero'));
    }
  }
  if (cr !== 0) out.crlf();
}
