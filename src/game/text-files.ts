import { newsText as N, helpText as H } from '../generated/source-data.ts';
import { rightHalf } from '../compat/word36.ts';
import { equal } from '../compat/parser.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';

export type TextFileContext = { who: number; ccflg: bigint; jbren: bigint;
  players: readonly { alive: bigint; active: bigint }[] };
export type TextFileServices<W> = {
  open(block: 'nwsfil' | 'hl1fil' | 'hl2fil'): Generator<W, boolean, void>;
  close(): Generator<W, void, void>;
  seti(): void; // SETI with the live X1 old/new input-file fields; swaps source input.
  ichr(): Generator<W, bigint, void>; // Raw signed C register; negative means EOF.
  warn(text: string): void; // Original flush/OUTSTR warning macro, with HUNGUP guard.
};
function notIdle(ctx: TextFileContext): void {
  if (ctx.who !== 0 && ctx.players[ctx.who].alive < 0n) ctx.players[ctx.who].active = 0n;
}

// NEWS, WARMAC:4661-4705. Dots page only immediately after LF/VT/FF;
// NEWS does not call ESHP or reject RED alert. File CR/NUL bytes are emitted.
export function* news<W>(ctx: TextFileContext, input: TokenMemory, out: TerminalOutput,
  io: TextFileServices<W> & { ttyon(): void; gtkn(): Generator<W, void, void> }): Generator<W, void, void> {
  ctx.jbren = rightHalf(ctx.jbren);
  if (!(yield* io.open('nwsfil'))) { io.warn(N[0].text); return; }
  io.seti(); let lastEol = false;
  for (;;) {
    const c = yield* io.ichr();
    if (c < 0n) break;
    if (lastEol && c === 46n) {
      io.ttyon(); out.out(N[1].text); io.seti(); yield* io.gtkn(); io.seti();
      if (!equal(input.tokens[0].text, N[2].text)) break;
      lastEol = false; continue;
    }
    out.character(c);
    lastEol = c >= 0o12n && c <= 0o14n;
    if (lastEol) {
      if (ctx.ccflg !== 0n || ctx.jbren < 0n) break;
      notIdle(ctx);
    }
  }
  ctx.ccflg = 0n; ctx.jbren = rightHalf(ctx.jbren);
  yield* io.close(); io.seti();
}

export function boundedWord(text: string): string { return text.slice(0, 10).split(/[ \0]/, 1)[0]; }

// SHLP, WARMAC:5109-5185. This consumes source bytes rather than splitting
// the file into topics: lookahead may eat LF/EOF inside the keyword matcher.
export function* showHelp<W>(ctx: TextFileContext & { pasflg: bigint }, keyword: string,
  out: TerminalOutput, io: TextFileServices<W>): Generator<W, void, void> {
  ctx.jbren = rightHalf(ctx.jbren); ctx.ccflg = 0n; out.skip(1);
  let opened = false;
  if (ctx.pasflg < 0n) opened = yield* io.open('hl1fil');
  if (!opened) opened = yield* io.open('hl2fil');
  if (!opened) io.warn(H[6].text);
  else {
    io.seti(); let section = -1, current: bigint | undefined;
    for (;;) {
      const c = current === undefined ? yield* io.ichr() : current; current = undefined;
      if (c < 0n) {
        if (section <= 0) { out.out(H[7].text); out.out(boundedWord(keyword)); out.skip(1); }
        break;
      }
      if (c !== 0o14n) {
        if (section > 0) out.character(c);
        if (c !== 0o12n) continue;
      }
      if (ctx.ccflg !== 0n || ctx.jbren < 0n) break;
      notIdle(ctx);
      if (section === 0) { section = 1; continue; }
      const next = yield* io.ichr();
      if (next !== 46n) { current = next; continue; }
      if (section > 0) break;
      let matched = true;
      for (let i = 0; i < 5; i++) {
        let fileChar = yield* io.ichr();
        if (fileChar > 0o137n) fileChar &= ~0o40n;
        let keyChar = BigInt(keyword.charCodeAt(i) || 0);
        if (keyChar === 32n || keyChar === 0n) break;
        if (keyChar > 0o137n) keyChar &= ~0o40n;
        if (fileChar !== keyChar) { matched = false; break; }
      }
      if (matched) section = 0;
    }
    yield* io.close(); io.seti();
  }
  ctx.jbren = rightHalf(ctx.jbren); ctx.ccflg = 0n;
}
