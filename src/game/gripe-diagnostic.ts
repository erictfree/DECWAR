import { gripeText as T } from '../runtime/variant-values.ts';
import { add36, rightHalf, unsigned36 } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';

export type GripeDiagnosticMemory = {
  linbuf(index: number): bigint; stabuf(index: number): bigint;
  pdlAddress: number; pdl(index: number): bigint;
  hitqlAddress: number; hitql(index: number): bigint; // Includes -1 header and two words beyond 400 entries.
  loktab(index: number): bigint;
};
// OCT.O: WARMAC:4896-4908. Logical shifts retain low octal digits; sign
// and field overflow do not use ONUM's sign/asterisk conventions.
export function octalDump(out: TerminalOutput, word: bigint, width: number): void {
  out.write(unsigned36(word).toString(8).padStart(width, '0').slice(-width));
}

// GRIP.A..GRIPTU, WARMAC:4771-4894. Reads remain live through output calls.
export function gripeDiagnostic(memory: GripeDiagnosticMemory, out: TerminalOutput): void {
  const oct = (word: bigint, width: number) => octalDump(out, word, width);
  out.out(T[4].text);
  for (let i = 0; ; i++) {
    let c = memory.linbuf(i);
    if (c <= 0o37n) { out.write('^'); c = add36(memory.linbuf(i),64n); }
    out.character(c);
    if (i + 1 >= 80 || memory.linbuf(i) === 0n) break;
  }
  out.crlf(); out.crlf();
  oct(rightHalf(memory.stabuf(0)), 6); out.spaces(2); oct(memory.stabuf(1), 12); out.spaces(2);
  oct((memory.stabuf(1) >> 27n) & 511n, 3); out.spaces(1);
  oct((memory.stabuf(1) >> 23n) & 15n, 2); out.write(',');
  if ((memory.stabuf(1) & (1n << 22n)) !== 0n) out.write('@');
  oct(rightHalf(memory.stabuf(1)), 6);
  const index = (memory.stabuf(1) >> 18n) & 15n;
  if (index !== 0n) { out.write('('); oct(index, 2); out.write(')'); }
  out.crlf();
  const locked = (memory.stabuf(0) >> 18n) & 0o777777n;
  if (locked !== 0n) oct(locked, 6); out.crlf();
  for (let i = 0; i < 16; i++) { oct(memory.stabuf(i + 2), 12); out.spaces(1); if ((i + 1) % 8 === 0) out.crlf(); }
  out.crlf(); out.out(T[5].text); oct(BigInt(memory.pdlAddress), 6); out.crlf();
  for (let i = 0; ; i++) {
    oct(memory.pdl(i), 12); out.spaces(1); if ((i + 1) % 8 === 0) out.crlf();
    if (rightHalf(BigInt(memory.pdlAddress + i + 1)) > rightHalf(memory.stabuf(2 + 0o17))) break;
  }
  out.crlf(); out.out(T[6].text); oct(BigInt(memory.hitqlAddress - 1), 6); out.crlf();
  for (let i = 1; i <= 403; i++) { oct(memory.hitql(i - 2), 12); out.spaces(1); if (i % 8 === 0) out.crlf(); }
  out.crlf(); out.out(T[7].text); out.crlf();
  for (let i = 1; i <= 20; i++) { oct(memory.loktab(i - 1), 12); out.spaces(1); if (i % 8 === 0) out.crlf(); }
  out.crlf();
}
