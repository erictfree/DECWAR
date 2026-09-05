import type { WordMemory } from '../compat/memory.ts';
import { rightHalf } from '../compat/word36.ts';
import { queueLayout } from '../runtime/variant-values.ts';
import { HitQueue } from './hit-queue.ts';
import { MessageQueue } from './message-queue.ts';

// WARMAC.MAC:754-766; DECWAR.MAP:697. No constructor initializes memory.
// Map the same backing words in each job; supply its live source BITS reader.
export function queueState(memory: WordMemory, readBits: (index: number) => bigint,
  base = BigInt(queueLayout.address)) {
  const address = (name: keyof typeof queueLayout.fields) => rightHalf(base + BigInt(queueLayout.fields[name].offset));
  const hit = new HitQueue({ memory, serialAddress: address('hitser'), linksAddress: address('hitql'),
    dataAddress: address('hitq'), readBits });
  const message = new MessageQueue({ memory, linksAddress: address('msgql'), dataAddress: address('msgq'), readBits });
  return { hit, message, address,
    // GRIPTT reads HITQL(-1) through HITQL(401), reaching the first two HITQ words.
    hitql: (index: number) => memory.read(address('hitql') + BigInt(index)) };
}
