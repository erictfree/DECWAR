import { add36, HALF_MASK, signed36 } from './word36.ts';
import { TerminalOutput } from './output.ts';

export interface MonitorClock {
  // Inject monitor-style values; application clock choice is a separate adapter.
  daytime(): bigint;
  runtime(): bigint;
}

// WARMAC.MAC:3990-3997. Strict comparisons, one correction in each direction;
// do not substitute a general modulo operation for arbitrarily large inputs.
export function etim(since: bigint, now: bigint): bigint {
  let elapsed = add36(now, -since);
  if (elapsed < -43200000n) elapsed = add36(elapsed, 86400000n);
  if (elapsed > 43200000n) elapsed = add36(elapsed, -86400000n);
  return elapsed;
}

// WARMAC.MAC:2110-2130. O2D emits exactly two characters, not a clamped/padded
// decimal field. 100 hours starts with ':0'; negative components use MOVEI.
export function otim(out: TerminalOutput, time: bigint): void {
  time = signed36(time);
  const hours = time / 3600000n;
  const minutes = (time % 3600000n) / 60000n;
  const seconds = (time % 60000n) / 1000n;
  for (const [i, part] of [hours, minutes, seconds].entries()) {
    if (i) out.write(':');
    const half = part & HALF_MASK;
    out.character((half / 10n + 48n) & HALF_MASK);
    out.character((half % 10n + 48n) & HALF_MASK);
  }
}
