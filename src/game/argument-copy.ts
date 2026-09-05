import type { WordMemory } from '../compat/memory.ts';
import { currentVariant } from '../runtime/variant-execution.ts';

// The Austin reconstruction adds named INTEGER copies before selected calls.
// These are real private words: callee writes affect the copy, not the DO index.
// The factory must supply storage; never invent an untracked host-only reference.
export function copiedArgument(memory:WordMemory,original:bigint,temporary:bigint|undefined,source:string):bigint{
  if(currentVariant().definition.id!=='austin')return original;
  if(temporary===undefined)throw new Error('Missing Austin argument-copy storage: '+source);
  memory.write(temporary,memory.read(original));return temporary;
}
