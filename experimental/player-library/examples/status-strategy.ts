import type { Strategy, StrategyDefinition } from '../index.ts';

/** Minimal public-library strategy: request one status report each cycle. */
const statusStrategy: Strategy = {
  decide() { return { kind: 'act', command: 'STATUS', reason: 'Example strategy requested a status report.' }; },
};

export const statusStrategyDefinition: StrategyDefinition = {
  id: 'example-status',
  version: '1',
  create() { return statusStrategy; },
};
