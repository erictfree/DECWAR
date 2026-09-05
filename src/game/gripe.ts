import { constants as K, gripeText as T } from '../generated/source-data.ts';
import { divide36, halfWords, rightHalf, signed36 } from '../compat/word36.ts';
import { PackedBoard } from '../compat/board.ts';
import { TerminalOutput } from '../compat/output.ts';
import { pregameStat, stat } from './users.ts';
import type { IdentityFields } from './users.ts';
import { messageText } from './message-queue.ts';
import { GripeOutput } from './gripe-buffer.ts';

export type GripePlayer = { alive: bigint; active: bigint; ship: { v: number; h: number; condition: number } };
export type GripeContext = { who: number; addrck: bigint; ccflg: bigint; fileLength: bigint; players: readonly GripePlayer[] };
export type GripeServices<W> = {
  outstr(text: string): void;
  osts(out: TerminalOutput): void;
  inli(): Generator<W, { words: readonly bigint[]; eof: boolean }, void>; // 36-bit LINBUF characters, including NUL.
  diagnostic(out: TerminalOutput): void | Generator<W, void, void>; // GRIP.A can suspend in stack/output calls.
  shosta(argument: bigint, out: TerminalOutput): Generator<W, void, void>;
  open(): Generator<W, { opened: boolean; busy?: boolean }, void>; // OPEN. grpfil; writes ctx.fileLength from LEBLK+3.
  hiber(milliseconds: bigint): Generator<W, void, void>; // Failure is the source HALT, not a retry result.
  input(descriptor: bigint): Generator<W, boolean, void>; // IN GRP; writes into the shared core image.
  useto(block: number): void;
  output(descriptor: bigint): Generator<W, boolean, void>; // OUT GRP.
  close(): Generator<W, void, void>; // CLOSE. uses core.flff to release buffer space.
};

// WARMAC:5295-5325. Used by GRIPE/HELP; ESHP writes 1000, despite its
// comment saying "10". PSHP tests raw negative ALIVE and recomputes the code.
export function eraseForText(ctx: Pick<GripeContext, 'who' | 'players'>, board: PackedBoard): void {
  if (ctx.who <= 0) return;
  const ship = ctx.players[ctx.who].ship;
  if (ship.condition !== K.RED) board.setdsp(ship.v, ship.h, 1000);
}
export function restoreAfterText(ctx: Pick<GripeContext, 'who' | 'players'>, board: PackedBoard): void {
  if (ctx.who <= 0 || ctx.players[ctx.who].alive >= 0n) return;
  const ship = ctx.players[ctx.who].ship;
  board.setdsp(ship.v, ship.h, ctx.who + (ctx.who <= K.KNPLAY / 2 ? 100 : 200));
}

// OSTS./XFRTMP, WARMAC:2536-2593. UNDAT./UNTIM. use the SAME scratch
// words, including stale bytes on a monitor call that doesn't replace them.
export function gripeStatus(ctx: { who: number; version: bigint; game: bigint; blhopt: bigint; romopt: bigint;
  players: readonly { job: readonly bigint[] }[]; identity: IdentityFields; scratch: bigint[] }, out: TerminalOutput,
  io: { undat(words: bigint[]): void; untim(words: bigint[]): void }): void {
  out.write('[V'); const version = divide36(ctx.version, 10n);
  out.character(rightHalf(48n + version.quotient)); out.write('.'); out.character(rightHalf(48n + version.remainder));
  out.spaces(2); io.undat(ctx.scratch); out.out(messageText(ctx.scratch)); out.spaces(1);
  io.untim(ctx.scratch); out.out(messageText(ctx.scratch)); out.spaces(2);
  const counter = -rightHalf(-0o100n); // MOVNI X4,-100: negate the 18-bit immediate EA.
  if (ctx.who === 0) pregameStat(counter, ctx.identity, out); else stat(-counter, ctx.who, ctx.players, out);
  out.spaces(1); out.odec(ctx.game, 5);
  if (ctx.blhopt < 0n) out.write(' B'); if (ctx.romopt < 0n) out.write(' R'); out.write(']'); out.skip(1);
}

// GRIPE, WARMAC:4714-4977. File UUOs, crash-dump memory and terminal INLI
// are source call boundaries; the command is not replaced by an append-only log.
export function* gripe<W>(ctx: GripeContext, board: PackedBoard, out: GripeOutput,
  io: GripeServices<W>): Generator<W, void, void> {
  if (ctx.who !== 0 && ctx.players[ctx.who].ship.condition === K.RED) { io.outstr(T[0].text); return; }
  eraseForText(ctx, board); out.buffer.initialize(out.core);
  if (ctx.addrck === 0n) out.out(T[1].text);
  out.destination = 'gripe'; io.osts(out);
  let keep = true;
  if (ctx.addrck !== 0n) {
    if (ctx.addrck < 0n) { const effect=io.diagnostic(out); if(effect!==undefined)yield*effect; }
    else yield* io.shosta(1n, out);
  } else {
    let remaining = 20;
    for (;;) {
      remaining--; const line = yield* io.inli();
      if (ctx.ccflg !== 0n) { keep = false; break; }
      for (let i = 0; ; i++) {
        const word = line.words[i];
        if (word === undefined) throw new RangeError('GRIPE OSTR.X requires LINBUF memory through its NUL terminator');
        if (word === 0n) break; out.character(word);
      }
      if (line.eof) {
        if (remaining === 19 && line.words[0] === 0n) keep = false;
        else if (line.words[0] !== 0n) out.crlf();
        break;
      }
      out.crlf();
      if (ctx.who !== 0 && ctx.players[ctx.who].alive < 0n) ctx.players[ctx.who].active = 0n;
      if (remaining === 2 || remaining === 0) {
        out.destination = 'tty'; out.out(T[remaining === 2 ? 2 : 3].text); out.destination = 'gripe';
      }
      if (remaining === 0) break;
    }
  }
  if (keep) {
    out.out(T[8].text); out.crlf();
    const lastNew = out.buffer.last;
    let last = lastNew;
    for (;;) {
      const opened = yield* io.open();
      if (opened.opened) break;
      if (!opened.busy) { out.core.warn(T[9].text); keep = false; break; }
      out.core.warn(T[10].text); yield* io.hiber(3000n);
      if (ctx.ccflg !== 0n) { keep = false; break; }
    }
    if (keep) {
      if (ctx.fileLength >= 0n) ctx.fileLength = 0n; // Supplied virgin-file workaround.
      else {
        const words = -BigInt.asIntN(18, ctx.fileLength >> 18n); last += Number(words);
        if (last > out.core.jbrel && !out.core.core(last)) { out.core.warn(T[11].text); keep = false; }
        if (keep && !(yield* io.input(signed36(halfWords(-words, BigInt(lastNew)))))) {
          out.core.warn(T[12].text); keep = false;
        }
      }
      if (keep) {
        const descriptor = signed36(halfWords(BigInt(out.buffer.base - last - 1), BigInt(out.buffer.base - 1)));
        io.useto(1);
        if (!(yield* io.output(descriptor))) out.core.warn(T[13].text);
      }
    }
  }
  out.core.flff = out.buffer.base; yield* io.close();
  out.destination = 'tty'; restoreAfterText(ctx, board); ctx.ccflg = 0n;
}
