import { constants as K } from '../runtime/variant-values.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { add36, multiply36 } from '../compat/word36.ts';
import { min, max } from './ship.ts';
import type { Ship } from './ship.ts';

// REPAIR.FOR:32-72. The caller must execute the returned DAMAGE report request
// before computing final pause via finish(); its output time counts as elapsed.
export function repair(ship: Ship, mode: 1 | 2 | 3, tokens: readonly Token[], now: () => bigint): {
  damageTokenIndex?: number;
  finish: () => { pause?: bigint; alternateReturn: boolean };
} {
  let l: number = mode;
  let targetTime = 0n;
  if (ship.docked && l !== 3) l = 2;
  let size = l === 1 ? 500n : l === 2 ? 1000n : 300n;
  let nextToken = 2; // One-based source token index.
  if (l !== 3 && tokens[1]?.type === K.KINT) { size = multiply36(tokens[1].value, 10n); nextToken = 3; }
  const maximum = ship.devices.slice(1, K.KNDEV + 1).reduce((a, b) => max(a, b), 0n);
  if (maximum !== 0n) {
    size = min(size, maximum);
    if (equal(tokens[1]?.text ?? '', 'ALL')) { size = maximum; nextToken = 3; }
    if (l !== 3) targetTime = add36(now(), multiply36(size, 8n) / BigInt(l));
    for (let i = 1; i <= K.KNDEV; i++) ship.devices[i] = max(add36(ship.devices[i], -size), 0n);
  }
  // Source returns before touching PTIME: retain the preceding command's delay.
  if (l === 3) return { finish: () => ({ alternateReturn: false }) };
  const damageTokenIndex = equal(tokens[nextToken - 1]?.text ?? '', 'DAMAGE') ? nextToken + 1 : undefined;
  return { damageTokenIndex, finish: () => {
    const pause = add36(targetTime, -now());
    return { pause, alternateReturn: pause <= 0n };
  } };
}
