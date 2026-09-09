import { Captain } from '../../automated-player/captain.ts';
import type { Strategy, StrategyDefinition, StrategySession } from '../types.ts';

class CaptainStrategy implements Strategy {
  private readonly captain: Captain;
  constructor(captain: Captain) { this.captain = captain; }

  decide({ observation, now }: Parameters<Strategy['decide']>[0]) {
    return this.captain.choose(observation, now);
  }
}

export type CaptainStrategyOptions = {
  readonly mode?: 'patrol' | 'resupply' | 'objective' | 'defense' | 'siege';
  readonly torpedoes?: boolean;
  readonly torpedoCorridor?: boolean;
};

export function createCaptainStrategy(options: CaptainStrategyOptions = {}): StrategyDefinition {
  return {
  id: 'austin-captain',
  version: 'v18',
  create(session: StrategySession) {
    // Session identity is explicit even though Captain currently only needs team.
    void session.ship;
    return new CaptainStrategy(new Captain(session.team, options.mode ?? 'patrol', false, options.torpedoes ?? true, options.torpedoCorridor ?? false));
  },
  };
}

export const captainStrategy = createCaptainStrategy();
