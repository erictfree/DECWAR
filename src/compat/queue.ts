import { HALF_MASK, halfWords, leftHalf, rightHalf, signed36 } from './word36.ts';
import { wordArray } from './memory.ts';
import type { WordMemory } from './memory.ts';

export type QueueMatch = { index: number; previous: number };
export type QueueServices<W> = {
  lock(routine: 'RSRV.' | 'UPDT.' | 'SRCH.' | 'REMV.'): Generator<W, boolean, void>;
  unlo(): void;
};
export class UnresolvedQueueState extends Error {}
const signedHalf = (word: bigint) => Number(BigInt.asIntN(18, word));
export type QueueLinkMemory = { memory: WordMemory; linksAddress: bigint };

// WARMAC Qmanager:3028-3292. Links retain actual 36-bit header/entry words.
// Index -1 denotes the header. Pure methods run inside the caller's QUELOK.
export class LinkedQueue {
  private localHeader = -1n;
  private storage?: QueueLinkMemory;
  get memoryBacked(): boolean { return this.storage !== undefined; }
  get header(): bigint { return this.storage ? this.storage.memory.read(this.storage.linksAddress - 1n) : this.localHeader; }
  set header(value: bigint) {
    if (this.storage) this.storage.memory.write(this.storage.linksAddress - 1n, value);
    else this.localHeader = signed36(value);
  }
  readonly links: bigint[];
  constructor(length: number, storage?: QueueLinkMemory) {
    this.storage = storage;
    this.links = storage ? wordArray(storage.memory, storage.linksAddress, length) : Array<bigint>(length).fill(0n);
  }
  initialize(): void { this.header = -1n; this.links.fill(0n); }
  private read(index: number): bigint {
    if (index === -1) return this.header;
    if (!this.storage && (index < 0 || index >= this.links.length)) throw new UnresolvedQueueState('Queue pointer outside link storage');
    return this.links[index];
  }
  private write(index: number, value: bigint): void {
    this.read(index);
    if (index === -1) this.header = signed36(value); else this.links[index] = signed36(value);
  }
  search(bit: bigint): QueueMatch | undefined {
    let previous = -1, index = signedHalf(leftHalf(this.header));
    const seen = new Set<number>();
    while (index >= 0) {
      if (seen.has(index)) throw new UnresolvedQueueState('Cyclic queue link storage');
      seen.add(index);
      const word = this.read(index);
      if ((word & bit) !== 0n) return { index, previous };
      previous = index; index = signedHalf(leftHalf(word));
    }
    return undefined;
  }
  reserve(): number {
    for (;;) {
      const index = this.links.findIndex(word => word === 0n);
      if (index >= 0) { this.links[index] = -1n; return index; }
      const first = signedHalf(leftHalf(this.header));
      if (first < 0) throw new UnresolvedQueueState('Full queue consists of unlinked reservations; source cannot make progress');
      const recipients = rightHalf(this.read(first));
      const bit = (-recipients) & recipients;
      if (bit === 0n) throw new UnresolvedQueueState('Oldest linked entry has no recipient');
      let match: QueueMatch | undefined;
      while ((match = this.search(bit))) this.remove(match, bit);
      // Deliberately does not decrement any MSGFLG counters.
    }
  }
  publish(index: number, recipients: bigint): void {
    const last = signedHalf(rightHalf(this.header));
    this.write(last, halfWords(BigInt(index), rightHalf(this.read(last))));
    this.header = signed36(halfWords(leftHalf(this.header), BigInt(index)));
    this.write(index, halfWords(HALF_MASK, recipients));
  }
  remove(match: QueueMatch, bit: bigint): void {
    const word = signed36(this.read(match.index) & ~bit);
    this.write(match.index, word);
    if (rightHalf(word) !== 0n) return;
    this.write(match.previous, halfWords(leftHalf(word), rightHalf(this.read(match.previous))));
    if (word < 0n) this.header = signed36(halfWords(leftHalf(this.header), BigInt(match.previous)));
    this.write(match.index, 0n);
  }
  cancelReservation(index: number): void {
    // MAKMSG's short-message path clears an unlinked reservation. Its X2 LH
    // is zero, so REMV also clobbers AC0's LH; no linked predecessor exists.
    if (this.links[index] !== -1n) throw new UnresolvedQueueState('Cancellation does not identify an unlinked reservation');
    this.links[index] = 0n;
  }
}

export function* reserve<W>(queue: LinkedQueue, io: QueueServices<W>): Generator<W, number | undefined, void> {
  if (!(yield* io.lock('RSRV.'))) return undefined;
  const index = queue.reserve(); io.unlo(); return index;
}
export function* publish<W>(queue: LinkedQueue, index: number, recipients: bigint,
  io: QueueServices<W>): Generator<W, void, void> {
  while (!(yield* io.lock('UPDT.'))) { /* source retries */ }
  queue.publish(index, recipients); io.unlo();
}
export function* search<W>(queue: LinkedQueue, bit: bigint,
  io: QueueServices<W>): Generator<W, QueueMatch | undefined, void> {
  if (!(yield* io.lock('SRCH.'))) return undefined;
  const match = queue.search(bit); io.unlo(); return match;
}
export function* remove<W>(queue: LinkedQueue, match: QueueMatch, bit: bigint,
  io: QueueServices<W>): Generator<W, void, void> {
  while (!(yield* io.lock('REMV.'))) { /* source retries */ }
  queue.remove(match, bit); io.unlo();
}
