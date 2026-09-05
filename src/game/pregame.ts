import { constants as K, messages as M, pregame as table, commands } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import type { CommandWordReader } from './data-initialization.ts';
import type { JobStatusArguments } from './lifecycle.ts';

// PREGAM/SETUP/KILCHK share these first six /LOCAL/ words. The caller binds
// the actual command overlay, rather than copying the identity on each call.
export class EntryIdentity {
  readonly words: bigint[];
  constructor(words: bigint[]) {
    if (words.length < 6) throw new RangeError('Entry identity needs six LOCAL words');
    this.words = words;
  }
  get job(): bigint { return this.words[0]; }
  get ppn(): bigint { return this.words[3]; }
  get tty(): bigint { return this.words[4]; }
  arguments(): JobStatusArguments {
    const thisWords = this.words;
    return Array.from({ length: 6 }, (_, i) => ({ get value() { return thisWords[i]; }, set value(value: bigint) { thisWords[i] = value; } })) as JobStatusArguments;
  }
}

export type PregameContext = { ccflg: bigint; hungup: bigint; pasflg: bigint };
export type PregameInputServices<W> = {
  commandWord?: CommandWordReader; // Live PRECMD/ISAYDO; omitted component fixtures use extracted text.
  logical(word: bigint): boolean;
  dmpbuf(): void;
  input(milliseconds: bigint): Generator<W, boolean, void>;
  gtkn(): Generator<W, void, void>;
  monit(): Generator<W, void, void>;
};
export class PregameCommandLocals { cmd = 0; i = 0; }

// XGTCMD, SETUP.FOR:498-556. The private pre-game table includes all three
// '*' commands regardless of PASFLG. Only *ZAP is gated by PREGAM afterward.
export function* getPregameCommand<W>(ctx: PregameContext, input: TokenMemory, local: PregameCommandLocals,
  out: TerminalOutput, io: PregameInputServices<W>): Generator<W, number, void> {
  for (;;) {
    out.crlf(); ctx.ccflg = 0n; out.out('PG> '); io.dmpbuf();
    while (!(yield* io.input(10000n))) { /* No separate Ctrl-C/endgame/idle check here. */ }
    yield* io.gtkn();
    if (io.logical(ctx.ccflg | ctx.hungup)) yield* io.monit();
    if (input.tokens[0].type === K.KEOL) continue;
    local.cmd = 0;
    let ambiguous = false;
    for (local.i = 1; local.i <= K.KNPCMD; local.i++) {
      if (!equal(input.tokens[0].text, io.commandWord ? io.commandWord('pregame', local.i) : table[local.i - 1].words[0])) continue;
      if (local.cmd !== 0) { ambiguous = true; break; }
      local.cmd = local.i;
    }
    if (!ambiguous && local.cmd > 0) return local.cmd;
    if (ambiguous) out.out(M.ambcom.text);
    else {
      for (local.i = 1; local.i <= K.KNCMD; local.i++) if (equal(input.tokens[0].text, io.commandWord ? io.commandWord('game', local.i) : commands[local.i - 1].words[0])) break;
      out.out((local.i <= K.KNCMD ? M.maicom : M.unkcom).text);
    }
    out.out(M.forhlp.text, 1);
  }
}

export const pregameLiterals = {
  honorInstruction: { file: 'SETUP.FOR', line: 148, text: 'Use the HO command to view the honor roll.' },
  documentInstruction: { file: 'SETUP.FOR', line: 150, text: 'Use the DO command to purchase' },
  documentInstructionEnd: { file: 'SETUP.FOR', line: 151, text: 'documentation for DECWAR.' },
  documentMessage: { file: 'SETUP.FOR', line: 166, text: 'This is where CompuServe rips you off for Documentation!' },
} as const;
export type PregameCall = { routine: 'gripe' | 'help' | 'news' | 'set' | 'summar' | 'time' | 'type' | 'users'
  | 'debug' | 'paswrd' | 'stazap' | 'hlpxtr' | 'hlpall' | 'points' | 'shosta'; argument?: boolean };
export type PregameServices<W> = PregameInputServices<W> & {
  jobsta(args: JobStatusArguments): Generator<W, void, void>;
  ttyon(): void;
  literal(key: keyof typeof pregameLiterals): string; // Compiled FORTRAN bytes, including the continued literal.
  invoke(call: PregameCall): Generator<W, void, void>;
};
const dispatch: readonly (PregameCall | null)[] = [
  null, null, { routine: 'gripe' }, { routine: 'help' }, { routine: 'shosta', argument: true },
  { routine: 'news' }, { routine: 'points', argument: false }, null, { routine: 'set' }, { routine: 'summar' },
  { routine: 'time' }, { routine: 'type' }, { routine: 'users' }, { routine: 'debug' }, { routine: 'paswrd' }, { routine: 'stazap' },
];

// PREGAM computed GOTO, SETUP.FOR:154-194. Outside-table values fall into
// ACTIVATE. PRGNAM immediately returns in this archive (WARMAC:4052-4053).
export function* dispatchPregame<W>(ctx: PregameContext, id: number, out: TerminalOutput,
  io: Pick<PregameServices<W>, 'invoke' | 'literal' | 'monit' | 'logical'>): Generator<W, 'activate' | 'again', void> {
  if (!Number.isSafeInteger(id)) throw new RangeError('PREGAM command index must be a source integer');
  if (id <= 1 || id > K.KNPCMD) return 'activate';
  if (id === 2) out.out(io.literal('documentMessage'), 1);
  else if (id === 8) yield* io.monit();
  else if (id !== 16 || io.logical(ctx.pasflg)) yield* io.invoke({ ...dispatch[id - 1]! });
  return 'again';
}

// PREGAM, SETUP.FOR:117-194. Returning asks the DECWAR driver to call SETUP;
// it does not itself create a player, zero WHO/PLAYER, or initialize the galaxy.
export function* pregame<W>(ctx: PregameContext, identity: EntryIdentity, input: TokenMemory,
  local: PregameCommandLocals, out: TerminalOutput, io: PregameServices<W>): Generator<W, void, void> {
  yield* io.jobsta(identity.arguments());
  if (io.logical(ctx.ccflg)) yield* io.monit();
  for (;;) {
    io.ttyon(); out.out(M.strtup.text); yield* io.gtkn();
    if (io.logical(ctx.ccflg | ctx.hungup)) yield* io.monit();
    if (input.ntok === 0) return;
    if (equal(input.tokens[0].text, 'HONORROLL')) { yield* io.invoke({ routine: 'shosta', argument: true }); continue; }
    if (equal(input.tokens[0].text, 'HELP')) {
      yield* io.invoke({ routine: 'hlpxtr' }); yield* io.invoke({ routine: 'hlpall' }); io.ttyon(); continue;
    }
    if (equal(input.tokens[0].text, 'PREGAME')) break;
  }
  out.out(M.pgame1.text, 1);
  out.out(io.literal('honorInstruction'), 1); out.out(io.literal('documentInstruction'), 1); out.out(io.literal('documentInstructionEnd'), 1);
  for (;;) {
    const id = yield* getPregameCommand(ctx, input, local, out, io);
    if ((yield* dispatchPregame(ctx, id, out, io)) === 'activate') return;
  }
}
