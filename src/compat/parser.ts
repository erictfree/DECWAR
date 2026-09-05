import { commands, pregame } from '../generated/source-data.ts';
import type { CommandWordReader } from '../game/data-initialization.ts';
import { add36, multiply36, signed36 } from './word36.ts';

export type Token = { text: string; type: -1 | 0 | 1 | 3; value: bigint; offset: number };
export type ParsedCommand = { tokens: Token[]; scanned: Token[]; error?: 'too-many-words' };
export class UnresolvedFloatInput extends Error {
  constructor() { super('ANUM. floating-point instructions and X3 clobber require a PDP-10 float implementation'); }
}

// WARMAC.MAC:4370-4402. The source mistakenly folds T0, not C, for the
// substring. GTKN already folds input. Preserve this for direct EQUAL calls.
export function equal(substring: string, master: string): 0 | -1 | -2 {
  if (!substring[0] || substring[0] === ' ' || substring[0] === '\0') return 0;
  for (let i = 0; i < 5; i++) {
    const c = substring.charCodeAt(i) || 0;
    const m = master.charCodeAt(i) || 0;
    if (c === 0 || c === 32) return m === 0 || m === 32 ? -2 : -1;
    const folded = m > 0o137 ? m & ~0o40 : m;
    if (c !== folded) return 0;
  }
  return -2;
}

export function resolveCommand(token: string, phase: 'game' | 'pregame' = 'game', commandWord?: CommandWordReader):
  { kind: 'command'; id: number; name: string } | { kind: 'ambiguous' | 'unknown' | 'unavailable' } {
  const table = phase === 'game' ? commands : pregame;
  let match: typeof table[number] | undefined;
  for (const command of table) {
    if (!equal(token, commandWord ? commandWord(phase, command.id) : command.words[0])) continue;
    if (match) return { kind: 'ambiguous' }; // GETCMD/XGTCMD stop at match two.
    match = command;
  }
  if (match) return { kind: 'command', id: match.id, name: match.name };
  if (phase === 'pregame' && commands.some(command => equal(token, commandWord ? commandWord('game', command.id) : command.words[0]) !== 0)) return { kind: 'unavailable' };
  return { kind: 'unknown' };
}

const spacing = (c: string) => c === ' ' || c === '\t';
const endLine = (c: string) => c === '' || '\0\x03\n\v\f\x1a\x1b'.includes(c);
const endCommand = (c: string) => endLine(c) || c === '/' || c === ';';
const delimiter = (c: string) => spacing(c) || c === ',';
const eol = (offset: number): Token => ({ text: '', type: -1, value: 0n, offset });

// GTKN/NXTT./ANUM. integer and alpha paths, WARMAC.MAC:1670-1848.
// One physical line may yield multiple commands; semicolon discards its tail.
export class CommandScanner {
  private cursor = 0;
  private done = false;
  private line: string;
  get pending(): boolean { return !this.done; }
  constructor(line: string) {
    if ([...line].some(c => c.charCodeAt(0) > 127)) throw new RangeError('7-bit input required');
    this.line = line;
  }
  next(): ParsedCommand | undefined {
    if (this.done) return undefined;
    const tokens: Token[] = [];
    const scanned: Token[] = [];
    while (true) {
      while (spacing(this.line[this.cursor] ?? '')) this.cursor++;
      const offset = this.cursor;
      let text = '', numeric = 0n, negative = false, hasSign = false, hasDigit = false, alpha = false, chars = 0;
      let c = this.line[this.cursor] ?? '';
      while (!endCommand(c) && !delimiter(c)) {
        let code = c.charCodeAt(0);
        if (code > 0o137) code -= 0o40; // Literal SUBI, including punctuation after z.
        const folded = String.fromCharCode(code);
        if (!alpha) {
          if (folded === '+' || folded === '-') {
            if (hasSign || chars > 0) alpha = true;
            else { hasSign = true; negative = folded === '-'; }
          } else if (folded === '.') {
            // Do not silently replace original FLTR/FDV/FAD/FMPRI with Number.
            throw new UnresolvedFloatInput();
          } else if (folded >= '0' && folded <= '9') {
            hasDigit = true;
            numeric = add36(multiply36(numeric, 10n), BigInt(code - 48));
          } else alpha = true;
        }
        if (chars < 5) text += folded;
        chars++;
        this.cursor++;
        c = this.line[this.cursor] ?? '';
      }
      let ended = endCommand(c);
      if (delimiter(c)) {
        while (spacing(this.line[this.cursor] ?? '')) this.cursor++;
        c = this.line[this.cursor] ?? '';
        if (delimiter(c)) this.cursor++;
        ended = endCommand(c);
      }
      const token: Token = { text, type: alpha ? 3 : hasDigit ? 1 : 0, value: alpha ? 0n : signed36(negative ? -numeric : numeric), offset };
      scanned.push(token); // NXTT writes even a final empty token and before overflow is discovered.
      if (chars || tokens.length || !ended) tokens.push(token);
      if (ended) {
        if (c === '/') this.cursor++;
        else this.done = true;
        tokens.push(eol(this.cursor));
        return { tokens, scanned };
      }
      if (tokens.length >= 14) {
        this.done = true;
        return { tokens: [eol(this.cursor)], scanned, error: 'too-many-words' };
      }
    }
  }
}
