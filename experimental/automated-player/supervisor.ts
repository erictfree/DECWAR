import { setTimeout as delay } from 'node:timers/promises';
import { ConnectionFailure, VesselUnavailable } from './client.ts';
import { play, type PlayerOptions } from './player.ts';

export type RecoveryOptions = PlayerOptions & { retries?: number; retryDelayMs?: number; persistent?: boolean };
// Reconnection commissions the same requested vessel through normal login.
// Never replay an uncertain command or carry observations across connections.
export async function supervise(options: RecoveryOptions, attempt: typeof play = play) {
  let rounds = 0, deaths = 0, retries = 0;
  let hasJoined = false;
  const limit = options.retries ?? 20;
  const persistent = options.persistent ?? false;
  while (!options.signal?.aborted && (persistent || (rounds < options.rounds && deaths < (options.lives ?? 3)))) {
    try {
      if (retries > 0) options.record({ event: 'retry-started', attempt: retries + 1 });
      const result = await attempt({ ...options,
        rounds: persistent ? Number.MAX_SAFE_INTEGER : options.rounds - rounds,
        lives: persistent ? Number.MAX_SAFE_INTEGER : (options.lives ?? 3) - deaths,
        record(event) {
          if (event.event === 'joined') {
            if (hasJoined) options.record({ event: 'reconnected', attempt: retries + 1 });
            hasJoined = true;
          }
          if (event.event === 'decision') rounds++;
          if (event.event === 'death') { rounds++; deaths++; }
          options.record({ ...event, attempt: retries + 1, totalRounds: rounds, totalDeaths: deaths });
        },
      });
      return { ...result, rounds, deaths, retries };
    } catch (error) {
      if (options.signal?.aborted) break;
      if (!(error instanceof ConnectionFailure || error instanceof VesselUnavailable) || (!persistent && retries >= limit)) throw error;
      const waitMs = Math.min(30000, (options.retryDelayMs ?? 1000) * 2 ** Math.min(retries, 5));
      retries++;
      options.record({ event: 'reconnecting', retries, waitMs, error: String(error), rounds, deaths });
      try { await delay(waitMs, undefined, { signal: options.signal }); }
      catch (error) { if (!options.signal?.aborted) throw error; }
    }
  }
  return { rounds, deaths, retries, outcome: options.signal?.aborted ? 'interrupted' : deaths >= (options.lives ?? 3) ? 'dead' : 'limit', reason: persistent ? 'Persistent player received a stop request.' : 'Fleet budget or stop request reached.' };
}
