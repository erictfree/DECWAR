import { constants as K, outputTables, statisticsText, commissionText } from '../generated/source-data.ts';
import { add36, halfWords, signed36 } from '../compat/word36.ts';
import type { StatisticsRecord } from './get-command.ts';

// WARMAC.MAC:676-692. The named bases precede one-based ship indices:
// STACAP(1) is word 513, and STAKIL(1) is word 523, not 512/522.
export const STATISTICS_WORDS = 640;
export const STATISTICS_ROWS = 10;
export class StatisticsBuffer {
  readonly words = Array<bigint>(STATISTICS_WORDS).fill(0n);
  clear(): void { this.words.fill(0n); }
  missions(who: number): bigint { return this.words[512 + who]; }
  killed(who: number): bigint { return this.words[512 + K.KNPLAY + who]; }
}

export type StatisticsContext = { buffer: StatisticsBuffer; hungup: bigint; frebie: bigint };
export type StatisticsFileBlock = 'stared' | 'stfred' | 'staupd' | 'stfupd';
export type StatisticsIOWord = 'staiow' | 'stfiow';
export type StatisticsOpen = { opened: boolean; lePpn: bigint };
export type StatisticsServices<W> = {
  lock(resource: 'staupd'): Generator<W, boolean, void>;
  unlo(resource: 'staupd'): void;
  open(block: StatisticsFileBlock): Generator<W, StatisticsOpen, void>;
  input(buffer: StatisticsBuffer, descriptor: StatisticsIOWord): Generator<W, void, void>;
  output(buffer: StatisticsBuffer, descriptor: StatisticsIOWord): Generator<W, void, void>;
  close(): Generator<W, void, void>;
  date(): bigint; // Raw DATE UUO result, not a modern timestamp.
  flushTerminal(): void; // OUTPUT TTY, does not add characters.
  outstr(text: string): void; // Direct monitor output: does not update HCPOS/BLANK.
  odec(value: bigint): void; // ODEC. through the current output dispatch, width zero.
};

// WARMAC.MAC:5694-5882. File and terminal monitor effects remain mandatory
// services. This ports the source buffer algorithm, not a new file format.
export function* updateStatistics<W>(ctx: StatisticsContext, record: StatisticsRecord,
  io: StatisticsServices<W>): Generator<W, void, void> {
  // @6(ARG) is elapsed time at every supplied caller, despite the score comment.
  if (record.elapsed < 1000n) return;
  if (ctx.hungup === 0n) io.flushTerminal();
  while (!(yield* io.lock('staupd'))) { /* Source retries without another flush. */ }
  const buffer = ctx.buffer, words = buffer.words;
  buffer.clear();
  const normal = yield* io.open('stared');
  if (normal.opened) {
    if (normal.lePpn < 0n) yield* io.input(buffer, 'staiow');
    yield* io.close();
    if (ctx.frebie !== 0n) {
      buffer.clear();
      const free = yield* io.open('stfred');
      if (free.opened) {
        if (free.lePpn < 0n) yield* io.input(buffer, 'stfiow');
        yield* io.close();
      }
    }
  }
  const text = (index: number) => { if (ctx.hungup === 0n) io.outstr(statisticsText[index].text); };
  if (record.why === 0n) {
    const offset = 512 + K.KNPLAY + record.who;
    words[offset] = add36(words[offset], 1n);
    if (words[offset] !== 1n) {
      if (ctx.hungup === 0n) io.flushTerminal();
      text(0);
      if (ctx.hungup === 0n) {
        const name = outputTables.lngshp[record.who - 1]?.text;
        if (name == null) throw new RangeError('UPDSTA ship name lookup outside source table');
        io.outstr(name);
      }
      text(1);
      io.odec(add36(buffer.killed(record.who), -1n));
      if (ctx.hungup === 0n) io.flushTerminal();
      text(2); io.odec(buffer.missions(record.who));
      if (ctx.hungup === 0n) io.flushTerminal();
      text(3);
    }
  }

  const start = 3 + (record.teamIndex === 0 ? 0 : 256);
  let placement = -1;
  for (let rank = 0; rank < STATISTICS_ROWS; rank++) {
    const at = start + rank * 10;
    // CAML skips the next-entry jump only when old elapsed < new elapsed.
    if (words[at] === 0n || record.total > words[at + 6] ||
      (record.total === words[at + 6] && words[at + 7] < record.elapsed)) {
      placement = rank; break;
    }
  }
  let write = record.why === 0n;
  if (placement < 0) {
    text(9);
  } else {
    let higher = false;
    for (let rank = 0; rank < placement; rank++) {
      if (words[start + rank * 10] === record.ppn) { higher = true; break; }
    }
    if (!higher) {
      if (ctx.hungup === 0n) {
        if (placement === 0) text(4);
        else if (placement === STATISTICS_ROWS - 1) text(5);
        else { io.outstr(statisticsText[6].text); io.odec(BigInt(placement + 1)); io.flushTerminal(); io.outstr(statisticsText[7].text); }
      }
      if (ctx.hungup === 0n && record.why === 0n) text(8);
      const at = start + placement * 10;
      for (let end = start + STATISTICS_ROWS * 10 - 1; at <= end - 10; end--) words[end] = words[end - 10];
      words[at] = record.ppn; words[at + 1] = record.name1; words[at + 2] = record.name2;
      words[at + 3] = record.shipName1; words[at + 4] = record.shipName2;
      words[at + 5] = signed36(io.date());
      words[at + 9] = signed36(halfWords(record.why, buffer.missions(record.who)));
      words[at + 6] = record.total; words[at + 7] = record.elapsed;
      // Word eight is never assigned. The insertion slot's old value survives.
      // Duplicate PPNs below the insertion point are shifted, not removed.
      write = true;
    }
  }
  if (write) {
    const opened = yield* io.open(ctx.frebie === 0n ? 'staupd' : 'stfupd');
    if (opened.opened) {
      yield* io.output(buffer, 'staiow'); // Also STAIOW for the free-user file.
      yield* io.close();
    }
  }
  io.unlo('staupd');
}

export type CommissionContext = StatisticsContext & { gameno: bigint };

// WARMAC.MAC:5589-5670. The free-user branch deliberately continues INPUT /
// OUTPUT / CLOSE after failed intermediate OPEN calls. The required monitor
// adapter must supply their effects; no invented recovery or successful write.
export function* updateCommission<W>(ctx: CommissionContext, who: number,
  io: StatisticsServices<W>): Generator<W, void, void> {
  while (!(yield* io.lock('staupd'))) { /* UPDCAP requires this lock. */ }
  const buffer = ctx.buffer;
  buffer.clear();
  const opened = yield* io.open('stared');
  if (opened.opened) {
    if (opened.lePpn < 0n) yield* io.input(buffer, 'staiow');
    yield* io.close();
  }
  if (ctx.gameno === 0n) buffer.words[0] = add36(buffer.words[0], 1n);
  ctx.gameno = buffer.words[0];
  if (ctx.frebie !== 0n) {
    yield* io.open('staupd');
    yield* io.output(buffer, 'staiow');
    yield* io.close();
    buffer.clear();
    const free = yield* io.open('stfred');
    if (free.lePpn < 0n) yield* io.input(buffer, 'staiow');
    yield* io.close();
    buffer.words[0] = ctx.gameno;
  }
  buffer.words[512 + who] = add36(buffer.missions(who), 1n);
  const updated = yield* io.open(ctx.frebie === 0n ? 'staupd' : 'stfupd');
  if (updated.opened) { yield* io.output(buffer, 'staiow'); yield* io.close(); }
  io.unlo('staupd');
  if (ctx.hungup === 0n) io.flushTerminal();
  io.outstr(commissionText[0].text); // This OUTSTR is unguarded in the source.
  io.odec(ctx.gameno);
  if (ctx.hungup === 0n) io.flushTerminal();
  if (ctx.hungup === 0n) io.outstr(commissionText[1].text);
  io.odec(buffer.missions(who));
  if (ctx.hungup === 0n) io.flushTerminal();
  if (ctx.hungup === 0n) io.outstr(commissionText[2].text);
  if (ctx.hungup === 0n) {
    const name = outputTables.lngshp[who - 1]?.text;
    if (name == null) throw new RangeError('UPDCAP ship name lookup outside source table');
    io.outstr(name);
  }
  // The trailing CRLF OUTSTR is commented out; retain no newline after name.
}
