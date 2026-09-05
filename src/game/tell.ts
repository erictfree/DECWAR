import { constants as K, messages as M, ships } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import { add36, signed36, unpackAscii } from '../compat/word36.ts';
import { ingal, PackedBoard } from '../compat/board.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import { TerminalOutput } from '../compat/output.ts';
import { objectText } from './format.ts';
import type { MessageRegisters } from './message-queue.ts';

export type TellGroup = { name: bigint; bits: bigint };
export type TellContext = MessageRegisters & {
  who: number; team: number; oflg: number; player: bigint; rptflg: bigint; gagmsg: bigint;
  groups: readonly TellGroup[]; // One-based LOWSEG GROUP, all KNGRP slots, not NGROUP.
  shared: { nomsg: bigint; rom: bigint; locr: { v: number; h: number };
    players: readonly { alive: bigint; ship: { v: number; h: number; devices: readonly bigint[] } }[] };
};
export class TellLocals {
  readonly message = Array<bigint>(17).fill(0n);
  sntrom = false; rmspk = false; p = 0; i = 0; j = 0; gm = false;
  gbits = 0n; svdb = 0n; mask = 0n; iship = 0;
  ph = 0; pv = 0; ix = 0; ir = 0; jr = 0;
}
export type TellServices<W> = {
  logical(word: bigint): boolean;
  gtkn(): Generator<W, void, void>;
  romspk(buffer: bigint[]): Generator<W, void, void>;
  // Undefined selects MAKMSG's no-argument LINBUF/INLI path; explicit LOCAL
  // selects the packed ASCII buffer. Both operate on this session's registers.
  makmsg(buffer?: bigint[]): Generator<W, void, void>;
  iran(n: bigint): bigint;
  literalRomulan(): string; // Compiled FORTRAN literal padding/termination.
};
function bit(who: number): bigint {
  if (who < 1 || who > K.KNPLAY) throw new RangeError('TELL requires a player BITS index');
  return 1n << BigInt(who - 1);
}
const plus = (a: number, b: number) => Number(add36(BigInt(a), BigInt(b)));

// TELL.FOR:29-163. This is the command body, with original call boundaries;
// ROMSPK, compiler logical/literal semantics and runtime bindings are required.
// LOCAL is this routine's 17-word array, not the /LOCAL/ command overlay.
export function* tell<W>(ctx: TellContext, input: TokenMemory, local: TellLocals,
  board: PackedBoard, out: TerminalOutput, io: TellServices<W>): Generator<W, void, void> {
  local.sntrom = false;
  if (io.logical(ctx.player)) {
    local.rmspk = false;
    if (ctx.shared.players[ctx.who].ship.devices[K.KDRAD] >= BigInt(K.KCRIT)) {
      out.out(M.tell01.text, 1); return;
    }
    ctx.shared.nomsg = signed36(ctx.shared.nomsg & ~bit(ctx.who));
    local.p = 2;
    if (input.ntok <= 1) {
      out.out(M.tell02.text); yield* io.gtkn(); local.p = 1;
      if (input.tokens[0].type === K.KEOL) return;
    }
    ctx.dbits = 0n;
    const end = input.ntok;
    if (end < local.p) throw new Error('TELL reversed destination DO bounds require the compiler contract');
    for (local.i = local.p; local.i <= end; local.i++) {
      const token = input.tokens[local.i - 1];
      if (!token) throw new RangeError('TELL token address outside token memory');
      if (equal(token.text, 'ROMULAN')) {
        if (!io.logical(ctx.shared.rom)) {
          out.out(M.tell07.text); out.out(io.literalRomulan(), 1); continue;
        }
        local.svdb = ctx.dbits;
        yield* io.romspk(local.message); yield* io.makmsg(local.message);
        local.sntrom = true; ctx.dbits = local.svdb;
        if (io.iran(4n) > 1n) continue;
        local.ph = ctx.shared.players[ctx.who].ship.h;
        local.pv = ctx.shared.players[ctx.who].ship.v;
        local.ix = Number(io.iran(10n) - 5n);
        relocation: for (local.ir = local.ix; local.ir <= 10; local.ir++) {
          for (local.jr = local.ix; local.jr <= 10; local.jr++) {
            const v = plus(local.pv, local.jr), h = plus(local.ph, local.ir);
            if (!ingal(v, h) || board.disp(v, h) !== 0) continue;
            board.setdsp(ctx.shared.locr.v, ctx.shared.locr.h, 0);
            ctx.shared.locr.h = h; ctx.shared.locr.v = v;
            board.setdsp(ctx.shared.locr.v, ctx.shared.locr.h, K.DXROM * 100);
            break relocation;
          }
        }
        continue;
      }
      if (io.logical(ctx.rptflg)) { out.out(M.tell09.text, 1); return; }
      for (local.j = 1; local.j <= K.KNPLAY; local.j++) {
        if (equal(token.text, ships[local.j - 1].name)) break;
      }
      if (local.j <= K.KNPLAY) {
        ctx.dbits = signed36(ctx.dbits | bit(local.j));
        if (local.j === ctx.who) out.out(M.tell05.text, 1);
        continue;
      }
      local.gm = false;
      for (local.j = 1; local.j <= K.KNGRP; local.j++) {
        const group = ctx.groups[local.j];
        if (!group) throw new RangeError('TELL group address outside GROUP');
        if (group.name === 0n || !equal(token.text, unpackAscii(group.name))) continue;
        if (local.gm) break;
        local.gm = true; local.gbits = group.bits;
      }
      if (!local.gm || local.j <= K.KNGRP) {
        out.out((local.gm ? M.tell04 : M.tell03).text); out.out(token.text.slice(0, 5)); out.crlf();
        continue;
      }
      for (local.j = 1; local.j <= K.KNPLAY; local.j++) {
        if (!io.logical(ctx.shared.players[local.j].alive)) local.gbits = signed36(local.gbits & -(bit(local.j) + 1n));
      }
      ctx.dbits = signed36(ctx.dbits | local.gbits);
    }
  } else {
    local.rmspk = true; yield* io.romspk(local.message);
  }
  local.mask = 1n;
  for (local.i = 1; local.i <= K.KNPLAY; local.i++, local.mask *= 2n) {
    local.iship = K.DXFSHP * 100 + local.i;
    if ((ctx.dbits & local.mask) === 0n) continue;
    const player = ctx.shared.players[local.i];
    let rejected: 'dead' | 'radio' | undefined;
    if (player.ship.devices[K.KDRAD] >= BigInt(K.KCRIT)) rejected = 'radio';
    else if (!io.logical(player.alive)) rejected = 'dead';
    else if ((ctx.shared.nomsg & local.mask) !== 0n) rejected = 'radio';
    if (rejected) {
      if (!local.rmspk) {
        out.out((rejected === 'dead' ? M.tell06 : M.tell07).text);
        out.out(objectText(BigInt(local.iship), ctx.oflg, 0)); out.crlf();
      }
      ctx.dbits = signed36(ctx.dbits & ~local.mask);
    }
  }
  if (io.logical(ctx.player)) ctx.dbits = signed36(ctx.dbits & ~bit(ctx.who));
  ctx.gagmsg = signed36(ctx.gagmsg & ~ctx.dbits);
  if (ctx.dbits === 0n) {
    if (!local.rmspk && !local.sntrom) out.out(M.tell08.text, 1);
    return;
  }
  if (local.rmspk) yield* io.makmsg(local.message);
  else {
    ctx.dispfr = BigInt(ctx.who + ctx.team * 100);
    yield* io.makmsg(); out.crlf();
  }
}
