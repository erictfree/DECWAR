import { constants as K, messages } from '../generated/source-data.ts';

export type PromptState = {
  prtype: number;
  lifeDamage: bigint;
  lifeReserves: bigint;
  shieldStrength: bigint;
  shieldCondition: bigint;
  shipDamage: bigint;
  energy: bigint;
};
// PROMPT.FOR:36-50. Follow executable >=/<= tests, not prose '>'/'<'.
export function prompt(state: PromptState): string {
  if (state.prtype === 0) return messages.comlin.text;
  let text = '';
  if (state.lifeDamage >= BigInt(K.KCRIT)) text += state.lifeReserves + 'L';
  if (state.shieldStrength <= 100n || state.shieldCondition < 0n) text += 'S';
  if (state.shipDamage >= 20000n) text += 'D';
  if (state.energy <= 10000n) text += 'E';
  return text + '> ';
}
