// WARMAC.MAC:1578-1627, 1973-2101, 2253-2381.
import { accountCharacter } from './ochr.ts';
import { HALF_MASK, signed36, unsigned36, unpackAscii } from './word36.ts';
export type SignMode = 'negative' | 'nonzero' | 'always-positive-zero' | 'always-negative-zero';

export function formatInteger(value: bigint, width = 0, signMode: SignMode = 'negative', radix = 10): string {
  if (!Number.isSafeInteger(width)) throw new RangeError('Integer field width required');
  if (radix !== 8 && radix !== 10) throw new RangeError('Only source octal and decimal output supported');
  const negative = value < 0n || (value === 0n && signMode === 'always-negative-zero');
  const plus = !negative && (signMode === 'always-positive-zero' || signMode === 'always-negative-zero' || (signMode === 'nonzero' && value !== 0n));
  const sign = negative ? '-' : plus ? '+' : '';
  const digits = (value < 0n ? -value : value).toString(radix);
  const result = sign + digits;
  if (width > 0 && result.length > width) return sign + '*'.repeat(Math.max(0, width - sign.length));
  return result.padStart(Math.abs(width), ' ');
}

export function formatTenths(value: bigint, integerWidth = 0, verbosity = 0, signed = false): string {
  const whole = value / 10n;
  const fraction = value % 10n;
  // OFLT loses the sign of -0.x. OSFLT explicitly chooses a sign before division.
  const sign: SignMode = signed ? (value > 0n ? 'always-positive-zero' : 'always-negative-zero') : 'negative';
  return formatInteger(whole, integerWidth, sign) + (verbosity < 0 ? '' : '.' + (fraction < 0n ? -fraction : fraction));
}

// WARMAC.MAC:2145-2170. OSTBX stops at a space/NUL or ten characters.
// SOJLE in the padding loop emits only 9-n spaces after an early terminator.
export function ostbx(out: TerminalOutput, words: readonly bigint[]): void {
  const text = words.slice(0, 2).map(unpackAscii).join('');
  let count = 0;
  for (const char of text.slice(0, 10)) {
    if (char === ' ' || char === '\0') break;
    out.write(char); count++;
  }
  out.spaces(9 - count);
}

// WARMAC.MAC:2180-2189. Retain remainder then MOVEI masking, including
// unexpected control characters for negative input. This is not zero-padding.
export function o2dg(out: TerminalOutput, value: bigint): void {
  const remainder = (signed36(value) % 100n) & HALF_MASK;
  out.character((48n + remainder / 10n) & HALF_MASK);
  out.character((48n + remainder % 10n) & HALF_MASK);
}

// WARMAC.MAC:2194-2204. Two characters with a blank tens zero; unlike O2DG,
// this entry does not discard hundreds or mask the remainder before division.
export function o2db(out: TerminalOutput, value: bigint): void {
  value = signed36(value);
  const tens = (48n + value / 10n) & HALF_MASK;
  out.character(tens === 48n ? 32n : tens);
  out.character((48n + value % 10n) & HALF_MASK);
}

export class TerminalOutput {
  hcpos = 0;
  blank = 0;
  private chunks: string[] = [];

  write(text: string): void {
    for (const character of text) {
      const code = character.charCodeAt(0);
      if (code > 127) throw new RangeError('Original terminal output must be 7-bit ASCII');
      this.character(BigInt(code));
    }
  }
  // OCHR stores a 7-bit byte, but bookkeeping operates on the original C
  // register (then its right half). OTIM/O2D can produce values above ASCII.
  character(value: bigint): void {
    const raw = unsigned36(value);
    this.chunks.push(String.fromCharCode(Number(raw & 127n)));
    const output=this;
    accountCharacter({
      get hcpos(){return BigInt(output.hcpos);},set hcpos(n:bigint){output.hcpos=Number(n);},
      get blank(){return BigInt(output.blank);},set blank(n:bigint){output.blank=Number(n);},
    },{c:signed36(value)});
  }
  out(text: string, lines = 0): void {
    this.write(text.split('\0', 1)[0]);
    this.skip(lines);
  }
  skip(lines: number): void { for (let i = 0; i < lines; i++) this.write('\r\n'); }
  crlf(): void { if (!(this.blank > 0 && this.hcpos === 0)) this.write('\r\n'); }
  spaces(count: number): void { this.write(' '.repeat(Math.max(0, count))); }
  tab(column: number): void { this.spaces(column - this.hcpos - 1); }
  odec(value: bigint, width = 0): void { this.write(formatInteger(value, width)); }
  oflt(value: bigint, width = 0, verbosity = 0): void { this.write(formatTenths(value, width, verbosity)); }
  drain(): string { const result = this.chunks.join(''); this.chunks = []; return result; }
}
