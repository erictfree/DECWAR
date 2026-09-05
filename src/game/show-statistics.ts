import { honorRollText as T } from '../runtime/variant-values.ts';
import { formatInteger, o2dg, ostbx, TerminalOutput } from '../compat/output.ts';
import { add36, leftHalf, rightHalf, signed36, unsigned36, unpackSixbit, packSixbit } from '../compat/word36.ts';
import { STATISTICS_ROWS } from './statistics.ts';
import type { StatisticsContext, StatisticsFileBlock, StatisticsIOWord, StatisticsOpen, StatisticsBuffer } from './statistics.ts';

export type HonorRollContext = StatisticsContext & { ccflg: bigint; terwid: bigint };
export type HonorRollServices<W> = {
  open(block: StatisticsFileBlock): Generator<W, StatisticsOpen & { leName: bigint }, void>;
  input(buffer: StatisticsBuffer, descriptor: StatisticsIOWord): Generator<W, void, void>;
  close(): Generator<W, void, void>;
  flushTerminal(): void;
};

// Local DACON macro, WARMAC.MAC:34-44. This converts the raw DATE word;
// year is relative to 2000. No Gregorian Date or Unix-time interpretation.
export function decodeStatisticsDate(value: bigint): { day: bigint; month: bigint; year: bigint } {
  value = signed36(value);
  const months = value / 31n;
  return { day: add36(value % 31n, 1n), month: add36(months % 12n, 1n), year: add36(months / 12n, -36n) };
}

// DSPSTA, WARMAC.MAC:6001-6102. The argument is read at both source tests,
// independently of terminal width. OUTSTR is not used here: OSTR uses OCHR.
export function displayStatistics(ctx: HonorRollContext, start: number, argument: () => bigint,
  out: TerminalOutput, flushTerminal: () => void): void {
  if (ctx.ccflg !== 0n) return;
  const words = ctx.buffer.words;
  out.out(T[6].text);
  if (argument() <= 0n) out.out(T[7].text);
  out.crlf();
  for (let rank = 0; rank < STATISTICS_ROWS; rank++) {
    const at = start + rank * STATISTICS_ROWS; // Source adds KNSTAT, also ten.
    if (words[at] === 0n) continue; // Not a loop exit: gaps are skipped.
    out.write(leftHalf(words[at + 9]) === 0n ? '*' : ' ');
    out.write(unpackSixbit(words[at + 1])); out.write(unpackSixbit(words[at + 2])); out.spaces(1);
    out.write(formatInteger(leftHalf(words[at]), 6, 'negative', 8)); out.write('-');
    const ppn = formatInteger(rightHalf(words[at]), 0, 'negative', 8);
    out.write(ppn); out.spaces(Math.max(1, 5 - ppn.length));
    out.odec(add36(words[at + 6], 0o500n) / 1000n, 6);
    // Positive argument forces wide ROWS but suppresses the wide HEADER.
    const width = ctx.terwid; // MOVE TERWID precedes the argument test.
    if (argument() > 0n || width >= 80n) {
      out.spaces(1); ostbx(out, words.slice(at + 3, at + 5));
      out.odec(add36(words[at + 7], 30000n) / 60000n, 5); out.spaces(1);
      out.out(T[8].text);
      const date = decodeStatisticsDate(words[at + 5]);
      o2dg(out, date.day); out.out(T[9].text); o2dg(out, date.month); out.out(T[10].text); o2dg(out, date.year);
    }
    out.crlf(); // There is no in-loop CCFLG check.
  }
  if (ctx.hungup === 0n) flushTerminal();
}

// SHOSTA / SHOPAY / DOFED / DOEMP, WARMAC.MAC:5885-6000.
// No lock, buffer clear, or LE.PPN input guard occurs in this reader.
export function* showStatistics<W>(ctx: HonorRollContext, argument: () => bigint,
  out: TerminalOutput, io: HonorRollServices<W>): Generator<W, void, void> {
  let block: StatisticsFileBlock = ctx.frebie === 0n ? 'stared' : 'stfred';
  for (;;) {
    const opened = yield* io.open(block);
    if (!opened.opened) return;
    yield* io.input(ctx.buffer, 'staiow');
    yield* io.close();
    const words = ctx.buffer.words;
    if ((words[3] | words[103] | words[259] | words[359]) !== 0n) {
      if (ctx.hungup === 0n) io.flushTerminal();
      out.out(T[0].text);
      if (unsigned36(opened.leName) === packSixbit('DECWAF')) out.out(T[1].text);
      const sides = words[9] >= words[265] ? [0, 1] : [1, 0];
      for (const side of sides) {
        const base = 3 + side * 256;
        if (words[base] !== 0n) {
          out.out(T[side === 0 ? 2 : 4].text);
          displayStatistics(ctx, base, argument, out, () => io.flushTerminal());
          if (ctx.ccflg !== 0n) continue; // Return from DOFED/DOEMP; still call other side.
        }
        if (words[base + 100] !== 0n) {
          out.out(T[side === 0 ? 3 : 5].text);
          displayStatistics(ctx, base + 100, argument, out, () => io.flushTerminal());
        }
      }
    }
    if (ctx.ccflg !== 0n) { ctx.ccflg = 0n; return; }
    if (ctx.frebie === 0n || argument() === 0n || unsigned36(opened.leName) !== packSixbit('DECWAF')) return;
    block = 'stared'; // Free pre-game requests can continue into the paid file.
  }
}
