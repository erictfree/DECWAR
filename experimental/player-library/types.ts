import type { Observation } from '../automated-player/captain.ts';
import type { Decision } from '../automated-player/policy.ts';
import type { Team } from '../automated-player/client.ts';

export type { Observation, Decision, Team };

export interface StrategyContext {
  readonly observation: Observation;
  readonly now: number;
}

export interface Strategy {
  decide(context: StrategyContext): Decision;
}

export interface StrategySession {
  readonly team: Team;
  readonly ship: string;
}

export interface StrategyDefinition {
  readonly id: string;
  readonly version: string;
  create(session: StrategySession): Strategy;
}
