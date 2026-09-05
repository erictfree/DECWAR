import { commands, constants as K, extraHelpWords, helpText as T } from '../runtime/variant-values.ts';
import { equal } from '../compat/parser.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { PackedBoard } from '../compat/board.ts';
import { TerminalOutput } from '../compat/output.ts';
import { eraseForText, restoreAfterText } from './gripe.ts';
import type { GripePlayer } from './gripe.ts';
import { boundedWord, showHelp } from './text-files.ts';
import type { TextFileServices } from './text-files.ts';

export type WordList = readonly (readonly [string, string])[];
export type ListMatch = { kind: 'unique'; index: number; words: readonly [string, string] }
  | { kind: 'unknown' | 'ambiguous' };

// SLST, WARMAC:5207-5263. EQUAL tests the first word; OSTB emits up to ten
// characters. Negative X2 suppresses the hit list and stops at match two.
export function searchList(token: string, table: WordList, out: TerminalOutput,
  options: { suppressHits?: boolean; unknownText?: string } = {}): ListMatch {
  let first = -1, matches = 0;
  for (let i = 0; i < table.length; i++) {
    if (!equal(token, table[i][0])) continue;
    matches++;
    if (matches === 1) { first = i; continue; }
    if (matches === 2) {
      out.out(boundedWord(token)); out.out(T[8].text);
      if (options.suppressHits) break;
      out.out(T[9].text); out.out(boundedWord(table[first].join('')));
    }
    out.write(', '); out.out(boundedWord(table[i].join('')));
  }
  if (matches === 1) return { kind: 'unique', index: first, words: table[first] };
  if (matches > 1) { out.skip(1); return { kind: 'ambiguous' }; }
  if (options.unknownText !== undefined) { out.out(options.unknownText); out.out(boundedWord(token)); out.skip(1); }
  return { kind: 'unknown' };
}

// OLST:5268-5285. MOVEI X2,7 means SEVEN entries per row, despite the
// "6 columns" comment. Ten stored bytes are emitted without trimming.
export function outputList(table: WordList, out: TerminalOutput): void {
  if (!table.length) throw new RangeError('OLST empty table requires original AOBJ pointer/memory behavior');
  for (let i = 0; i < table.length; i++) {
    out.out(table[i].join(''));
    if ((i + 1) % 7 === 0 || i + 1 === table.length) out.skip(1);
  }
}
const commandWords = (pasflg: bigint, live?: WordList): WordList => (live ?? commands.map(c => c.words)).slice(0, pasflg < 0n ? K.KNCMD : K.KNCMD - K.KSCMD);
// HLPXTR/HLPALL, WARMAC:5074-5103. Standalone entries do not remove ships,
// reset Ctrl-C, or apply HELP's RED gate.
export function extraHelp(out: TerminalOutput, live: WordList = extraHelpWords): void { out.out(T[3].text); outputList(live, out); out.out(T[4].text); }
export function allHelp(pasflg: bigint, out: TerminalOutput, live?: WordList): void { out.skip(1); out.out(T[5].text); out.skip(1); outputList(commandWords(pasflg, live), out); }

export type HelpContext = { who: number; ccflg: bigint; jbren: bigint; pasflg: bigint; players: readonly GripePlayer[] };
// HELP, WARMAC:5013-5061. The TTYON call before HELP.1 is unreachable.
export function* help<W>(ctx: HelpContext, input: TokenMemory, board: PackedBoard, out: TerminalOutput,
  io: TextFileServices<W> & { outstr(text: string): void; tables?: { commands: WordList; extra: WordList } }): Generator<W, void, void> {
  if (ctx.who !== 0 && ctx.players[ctx.who].ship.condition === K.RED) { io.outstr(T[0].text); return; }
  eraseForText(ctx, board);
  if (input.tokens[1].type < 0) extraHelp(out, io.tables?.extra);
  else for (let i = 1; ; i++) {
    const token = input.tokens[i];
    if (!token) throw new RangeError('HELP modifier address outside token memory');
    if (token.type < 0 || ctx.ccflg !== 0n) break;
    if (equal(token.text, T[1].text)) { allHelp(ctx.pasflg, out, io.tables?.commands); continue; }
    let match = searchList(token.text, commandWords(ctx.pasflg, io.tables?.commands), out);
    if (match.kind === 'ambiguous') continue;
    if (match.kind === 'unknown') match = searchList(token.text, io.tables?.extra ?? extraHelpWords, out, { unknownText: T[2].text });
    if (match.kind === 'unique') yield* showHelp(ctx, match.words.join(''), out, io);
  }
  ctx.ccflg = 0n; restoreAfterText(ctx, board);
}
