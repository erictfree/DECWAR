import { constants as K, messages as M, ships } from '../generated/source-data.ts';
import { TerminalOutput } from '../compat/output.ts';
import { objectText } from './format.ts';
import { messageText } from './message-queue.ts';
import type { MessageRegisters, MessageFlags } from './message-queue.ts';

export type MessageOutputContext = MessageRegisters & { who: number; oflg: number; gagmsg: bigint };

// OUTMSG.FOR:32-61. OMLOCL persists across calls, so callers own the buffer.
// There is no radio damage or NOMSG check here: TELL filters destinations.
export function* outMessage<W>(ctx: MessageOutputContext, flags: MessageFlags, buffer: bigint[], out: TerminalOutput,
  getmsg: (who: number, buffer: bigint[]) => Generator<W, void, void>,
  readBits?: (index: number) => bigint): Generator<W, void, void> {
  for (;;) {
    ctx.dbits = 0n; ctx.dispfr = 0n;
    if (flags[ctx.who].msgflg === 0n) return;
    yield* getmsg(ctx.who, buffer);
    if (ctx.dispfr !== 0n) {
      const sender = Number(ctx.dispfr % 100n);
      if (!readBits && (sender < 1 || sender > K.KNPLAY))
        throw new RangeError('OUTMSG sender requires actual BITS/surrounding memory');
      const mask = readBits ? readBits(sender) : 1n << BigInt(sender - 1);
      if ((ctx.gagmsg & mask) !== 0n) continue;
      out.out(M.mess01.text); out.out(objectText(ctx.dispfr, ctx.oflg, 1)); out.out(M.mess02.text);
      for (const ship of ships) if ((ctx.dbits & (1n << BigInt(ship.id - 1))) !== 0n) out.out(ship.symbol.slice(0, 2));
      out.crlf();
    }
    out.out(messageText(buffer), 1);
  }
}
