import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { TerminalOutput } from '../compat/output.ts';

// PASWRD.FOR:29-40. The unused third EQUAL argument has no effect in WARMAC.
// Project identity is supplied by the monitor adapter, never by command input.
export function password(tokens: readonly Token[], oflg: number, project: bigint, out: TerminalOutput): bigint {
  let flag = BigInt(equal(tokens[1]?.text ?? '', K.KPASS));
  if (flag === -1n) flag = 0n;
  if (![0o70000n, 0o337n, 0o70006n, 0o70725n].includes(project)) flag = 0n;
  if (flag !== 0n) return flag;
  out.out(M.unkcom.text);
  if (oflg !== K.SHORT) out.out(M.forhlp.text, 1);
  return 0n;
}
