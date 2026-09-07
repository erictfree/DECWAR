import type { Decision, Observation, StrategyDefinition, StrategySession } from './types.ts';

export type DecisionFixture = {
  readonly id: string;
  readonly session: StrategySession;
  readonly now: number;
  readonly observation: Observation;
  readonly expected: Decision;
};

/** Run a definition against a fixture without opening a socket. */
export function evaluateFixture(definition: StrategyDefinition, fixture: DecisionFixture): Decision {
  return definition.create(fixture.session).decide({ observation: fixture.observation, now: fixture.now });
}
