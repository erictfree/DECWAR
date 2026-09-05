import { clearStatisticsText as T } from '../generated/source-data.ts';
import { STATISTICS_WORDS } from './statistics.ts';
import type { StatisticsContext, StatisticsServices } from './statistics.ts';

export type ClearStatisticsContext = StatisticsContext & { addrck: bigint };
export type ClearStatisticsServices<W> = Pick<StatisticsServices<W>, 'open' | 'output' | 'close' | 'outstr'> & {
  lock(resource: 'stabuf'): Generator<W, boolean, void>;
  unlo(resource: 'stabuf'): void;
  gripe(): Generator<W, void, void>;
};

// STAZAP, WARMAC.MAC:6184-6225. This is the routine, not an authorization
// policy for the unported pre-game command dispatcher.
export function* clearStatistics<W>(ctx: ClearStatisticsContext, io: ClearStatisticsServices<W>): Generator<W, void, void> {
  io.outstr(T[0].text);
  while (!(yield* io.lock('stabuf'))) { /* Different source lock key from UPDSTA. */ }
  ctx.addrck = 1n;
  yield* io.gripe();
  // SOJG reaches zero without executing SETZM at index zero. Retain the word
  // left there by GRIPE, which shares STABUF; do not restore a saved serial.
  for (let i = STATISTICS_WORDS - 1; i > 0; i--) ctx.buffer.words[i] = 0n;
  for (const block of ['staupd', 'stfupd'] as const) {
    const opened = yield* io.open(block);
    if (!opened.opened) { io.outstr(T[2].text); break; }
    yield* io.output(ctx.buffer, 'staiow');
    yield* io.close();
  }
  io.unlo('stabuf');
  io.outstr(T[1].text);
  ctx.addrck = 0n;
}
