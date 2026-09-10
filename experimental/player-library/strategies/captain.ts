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
  /** Allow conservative, installation-focused deliberate star novas. */
  readonly experimentalNovas?: boolean;
  readonly torpedoCorridor?: boolean;
  readonly persistentResupply?: boolean;
  readonly coordinatedBases?: boolean;
  readonly surveyHandoff?: boolean;
  readonly preferClosePlanetFire?: boolean;
  readonly systematicExploration?: boolean;
  readonly longMoves?: boolean;
  /** Enable the combined high-tempo profile: all six experimental policies. */
  readonly aggressive?: boolean;
  /** Reserve this captain for frontier discovery during aggressive fleet play. */
  readonly explorationPriority?: boolean;
};

export function createCaptainStrategy(options: CaptainStrategyOptions = {}): StrategyDefinition {
  const aggressive = options.aggressive ?? false;
  return {
  id: 'austin-captain',
  version: aggressive ? 'v21-installation-assault' : options.persistentResupply || options.coordinatedBases || options.surveyHandoff || options.preferClosePlanetFire || options.systematicExploration || options.longMoves || options.experimentalNovas ? 'v19-experiments' : 'v18',
  create(session: StrategySession) {
    // Session identity is explicit even though Captain currently only needs team.
    void session.ship;
    return new CaptainStrategy(new Captain(session.team, options.mode ?? (aggressive ? 'objective' : 'patrol'), options.experimentalNovas || aggressive, options.torpedoes ?? true, options.torpedoCorridor || aggressive, options.persistentResupply || aggressive, options.surveyHandoff || aggressive, options.preferClosePlanetFire || aggressive, options.systematicExploration || aggressive, options.longMoves || aggressive, aggressive, options.explorationPriority ?? false));
  },
  };
}

export const captainStrategy = createCaptainStrategy();
