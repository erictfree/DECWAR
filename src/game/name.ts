import { CommandInput } from '../compat/command-input.ts';
import { signed36 } from '../compat/word36.ts';

// WARMAC USRNAM:4063-4102. Names come from the raw, un-tokenized physical
// line, including separators and control characters. Exactly one delimiter
// after the preceding token is skipped. Every return clears BUFPTR.
export function usrnam(input: CommandInput, precedingToken: number,
  writeJobName: (first: bigint, second: bigint) => void): boolean {
  const finish = (result:boolean) => { input.discardTail(); return result; };
  let position = 0;
  if (precedingToken !== 0) {
    const token = input.tokens[precedingToken - 1];
    if (!token) throw new RangeError('USRNAM token pointer is outside PTRLST');
    position = token.offset;
    while (input.characterAt(position) !== 0 && ![32,9,44].includes(input.characterAt(position))) position++;
    if (input.characterAt(position) === 0) return finish(false);
    position++;
  }
  const words = [0n, 0n];
  for (let i = 0; i < 12; i++) {
    let code = input.characterAt(position + i); if(code===0)break;
    if (code > 0o137) code &= ~0o40;
    code -= 0o40;
    if (code < 0) code += 0o100;
    words[Math.trunc(i / 6)] |= BigInt(code & 63) << BigInt(30 - (i % 6) * 6);
  }
  if (words[0] === 0n && words[1] === 0n) return finish(false);
  // Adapter must implement the actual JOB slot, including WHO=0 if invoked
  // in pre-game. Do not silently redirect the source's out-of-row access.
  writeJobName(signed36(words[0]), signed36(words[1]));
  return finish(true);
}
