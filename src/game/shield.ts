import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { TerminalOutput } from '../compat/output.ts';
import { add36, multiply36 } from '../compat/word36.ts';
import { min, max } from './ship.ts';
import type { Ship } from './ship.ts';

const empty: Token = { text: '', value: 0n, type: -1, offset: 0 };

// SHIELD.FOR:29-104. Generator suspension replaces GTKN without changing branch
// order; caller owns terminal input, disconnect handling, and TRCOFF behavior.
export function* shield(ship: Ship, tokens: readonly Token[], out: TerminalOutput, trcoff: () => void): Generator<'input', void, readonly Token[]> {
  out.crlf();
  let word = tokens[1] ?? empty;
  let amount: Token = tokens[2] ?? empty;
  let action: 'up' | 'down' | 'transfer' | undefined;
  if (word.type === K.KALF) {
    if (equal(word.text, 'TRANSFER')) action = 'transfer';
    else if (equal(word.text, 'UP')) action = 'up';
    else if (equal(word.text, 'DOWN')) action = 'down';
  }
  while (!action) {
    out.out(M.shld01.text);
    const response = yield 'input';
    word = response[0] ?? empty;
    amount = response[1] ?? empty;
    if (word.type === K.KEOL) return;
    if (equal(word.text, 'UP')) action = 'up';
    else if (equal(word.text, 'DOWN')) action = 'down';
    else if (equal(word.text, 'TRANSFER')) action = 'transfer';
  }
  if (action === 'up') {
    // Source uses GT here; 3000 damage still allows raising shields.
    if (ship.devices[K.KDSHLD] > BigInt(K.KCRIT)) { out.out(M.shld09.text, 1); return; }
    ship.shieldCondition = 1n;
    ship.energy = max(add36(ship.energy, -1000n), 0n);
    out.out(M.shld06.text, 1);
    if (ship.tractor !== 0) trcoff();
    if (ship.energy <= 0n) out.out(M.shld07.text, 1);
    return;
  }
  if (action === 'down') {
    ship.shieldCondition = -1n;
    out.out(M.shld08.text, 1);
    return;
  }
  if (amount.type !== K.KINT) {
    out.out(M.shld02.text);
    const response = yield 'input';
    amount = response[0] ?? empty;
    if (amount.type !== K.KINT) return;
  }
  let energy = multiply36(amount.value, 10n);
  energy = min(energy, multiply36(add36(1000n, -ship.shieldStrength), 25n));
  if (energy >= ship.energy) {
    out.out(M.shld03.text);
    const response = yield 'input';
    if (!equal((response[0] ?? empty).text, 'YES')) { out.out(M.shld04.text, 1); return; }
  }
  if (multiply36(-1n, energy) > multiply36(ship.shieldStrength, 25n)) energy = multiply36(-25n, ship.shieldStrength);
  if (add36(ship.energy, -energy) > 50000n) energy = add36(ship.energy, -50000n);
  ship.shieldStrength = add36(ship.shieldStrength, energy / 25n);
  ship.energy = add36(ship.energy, -energy);
  out.out(M.shld05.text, 1);
  if (ship.shieldStrength <= 0n) ship.shieldCondition = -1n;
  ship.condition = ship.energy < 10000n ? K.YELLOW : K.GREEN;
}
