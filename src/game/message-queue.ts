import { constants as K } from '../runtime/variant-values.ts';
import { LinkedQueue, publish, remove, reserve, search } from '../compat/queue.ts';
import type { QueueServices } from '../compat/queue.ts';
import { add36, HALF_MASK, halfWords, leftHalf, rightHalf, signed36, unpackAscii, unsigned36 } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';
import { CommandInput } from '../compat/command-input.ts';
import { installEditedLine, type EditedLine } from '../compat/gtkn.ts';
import { objectArray, wordArray } from '../compat/memory.ts';
import type { QueueLinkMemory } from '../compat/queue.ts';
import { queueLayout } from '../runtime/variant-values.ts';

export type MessageQueueMemory = QueueLinkMemory & { dataAddress: bigint; readBits(index: number): bigint };

// WARMAC:242-243 are in RADIX 10. SETQM only resets links, not payloads.
export class MessageQueue extends LinkedQueue {
  readonly data: bigint[][];
  readonly readBits: (index: number) => bigint;
  constructor(storage?: MessageQueueMemory) {
    const { knmsg, msglen } = queueLayout.constants;
    super(knmsg, storage);
    this.data = storage ? objectArray(knmsg, index => wordArray(storage.memory,
      storage.dataAddress + BigInt(index * msglen), msglen))
      : Array.from({ length: knmsg }, () => Array<bigint>(msglen).fill(0n));
    this.readBits = storage ? index => storage.readBits(index) : index => 1n << BigInt(index - 1);
  }
}
export type MessageRegisters = { dispfr: bigint; dbits: bigint };
export type MessageFlags = { msgflg: bigint }[]; // Index zero unused.
export type MessageQueueServices<W> = QueueServices<W> & {
  incrementCounterOutsidePlayers?(index: number): void; // One-based MSGFLG index, aliases following HISEG words.
};
export type MessageInputServices<W> = MessageQueueServices<W> & {
  inliOwnsMemory?: boolean;
  inli(): Generator<W, EditedLine, void>;
  // Ctrl-C branches to REMV before RSRV has assigned X2. The machine adapter
  // must resolve this stale register/address path; do not invent a safe free.
  cancelUnreserved(): Generator<W, void, void>;
};
const eol = new Set([0, 3, 10, 11, 12, 26, 27]); // WARMAC CBITS, not the command terminators.

function deposit(words: bigint[], offset: number, code: number): void {
  const index = 1 + Math.floor(offset / 5), shift = BigInt(29 - offset % 5 * 7);
  words[index] = signed36((words[index] & ~(127n << shift)) | (BigInt(code) << shift));
}
export function messageText(words: readonly bigint[]): string {
  return words.map(unpackAscii).join('').split('\0', 1)[0];
}
function player(flags: MessageFlags, who: number, memoryBacked = false) {
  if ((!memoryBacked && (who < 1 || who > K.KNPLAY)) || !flags[who]) throw new RangeError('Message player outside source flag array');
  return flags[who];
}

// WARMAC MAKMSG's no-argument path:3548-3559. Scan the entire LINBUF for
// the first semicolon. A direct INLI call does not perform GTKN lock handling.
export function* makeMessageFromInput<W>(queue: MessageQueue, flags: MessageFlags,
  registers: MessageRegisters & { ccflg: bigint }, input: CommandInput, out: TerminalOutput,
  io: MessageInputServices<W>): Generator<W, void, void> {
  if (registers.dbits === 0n) return;
  const separator = input.rawLine.indexOf(';');
  let text: string;
  if (separator >= 0) text = input.rawLine.slice(separator + 1);
  else {
    out.out('Msg: ');
    if(!io.inliOwnsMemory)input.beginLine();
    const line = yield* io.inli();
    installEditedLine(input,line);
    if(!('stored' in line))input.discardTail(); // INLI leaves BUFPTR=-1; it does not tokenize the message.
    if (registers.ccflg !== 0n) {
      out.out('No message sent', 1);
      yield* io.cancelUnreserved();
      registers.dbits = 0n;
      return;
    }
    text = input.rawLine;
  }
  yield* makeMessage(queue, flags, registers, text, out, io);
}

// WARMAC MAKMSG:3560-3606, explicit resolved ASCII-string path. Argument
// indirection, raw-line selection and pre-reservation Ctrl-C remain separate.
export function* makeMessage<W>(queue: MessageQueue, flags: MessageFlags, registers: MessageRegisters,
  text: string, out: TerminalOutput, io: MessageQueueServices<W>): Generator<W, void, void> {
  if (registers.dbits === 0n) return;
  if (!io.incrementCounterOutsidePlayers && (registers.dbits & ~((1n << BigInt(K.KNPLAY)) - 1n)) !== 0n)
    throw new RangeError('MAKMSG recipient bits address outside MSGFLG');
  if ([...text].some(c => c.charCodeAt(0) > 127)) throw new RangeError('MAKMSG requires 7-bit input');
  let index: number | undefined;
  while ((index = yield* reserve(queue, io)) === undefined) { /* source retry */ }
  const words = queue.data[index];
  words[0] = signed36(halfWords(registers.dispfr, registers.dbits));
  let read = 0, stored = 0;
  for (;;) {
    const code = text.charCodeAt(read) || 0;
    read++;
    if (read < 77) deposit(words, stored++, code);
    if (eol.has(code)) break;
  }
  // DPB replaces the most recently stored byte, then two IDPB operations.
  // This retains at most 75 text bytes, even if many more were consumed.
  deposit(words, stored - 1, 13); deposit(words, stored, 10); deposit(words, stored + 1, 0);
  if (read <= 2) {
    out.out('No message sent', 1);
    while (!(yield* io.lock('REMV.'))) { /* source retry */ }
    queue.cancelReservation(index); io.unlo();
  } else {
    yield* publish(queue, index, registers.dbits, io);
    // MOVE T1,DBITS; LSH T1,-1: full unsigned 36-bit shift, not just KNPLAY
    // or the 18 recipient bits that fit into the queue link.
    let remaining = unsigned36(registers.dbits);
    for (let who = 1; remaining !== 0n; who++, remaining >>= 1n) {
      if ((remaining & 1n) === 0n) continue;
      if (who <= K.KNPLAY) player(flags, who).msgflg = add36(player(flags, who).msgflg, 1n);
      else io.incrementCounterOutsidePlayers!(who);
    }
  }
  registers.dbits = 0n; // DISPFR is deliberately retained.
}

// WARMAC GETMSG:3621-3652. A miss clears count/metadata but leaves the
// caller's sixteen-word buffer untouched. Search and removal lock separately.
export function* getMessage<W>(queue: MessageQueue, flags: MessageFlags, registers: MessageRegisters,
  who: number, buffer: bigint[], io: QueueServices<W>): Generator<W, void, void> {
  if (buffer.length < 16) throw new RangeError('GETMSG requires sixteen output words');
  const p = player(flags, who, queue.memoryBacked);
  p.msgflg = add36(p.msgflg, -1n);
  let bit = 0n;
  const match = p.msgflg >= 0n ? yield* search(queue, bit = queue.readBits(who), io) : undefined;
  if (!match) { p.msgflg = 0n; registers.dispfr = 0n; registers.dbits = 0n; return; }
  const words = queue.data[match.index];
  const from = leftHalf(words[0]), to = rightHalf(words[0]);
  registers.dispfr = from === HALF_MASK ? 0n : from;
  registers.dbits = to === HALF_MASK ? 0n : to;
  for (let i = 0; i < 16; i++) buffer[i] = words[i + 1];
  yield* remove(queue, match, bit, io);
}
