import { CommonBlock,WordBlock } from './memory.ts';
import type { MemoryCommandInput } from './input-memory.ts';
import { inputRuntimeLayout } from '../runtime/variant-values.ts';

// WARMAC:641-661 and LOWSEG/WARMAC's INFLAG/INWAIT alias. No initialization;
// callers supply loaded memory. This block overlaps MemoryCommandInput.
export function inputRuntime(input:MemoryCommandInput){
  const low:CommonBlock=input.low;
  const block=new WordBlock(input.memory,inputRuntimeLayout,input.block.base-BigInt(inputRuntimeLayout.fields.ccflgDot.offset));
  const state={
    get hungup(){return low.read('hungup');},set hungup(v:bigint){low.write('hungup',v);},
    get ccflg(){return low.read('ccflg');},set ccflg(v:bigint){low.write('ccflg',v);},
    get inwait(){return low.read('inflag');},set inwait(v:bigint){low.write('inflag',v);},
    get hcpos(){return low.read('hcpos');},set hcpos(v:bigint){low.write('hcpos',v);},
    get blank(){return low.read('blank');},set blank(v:bigint){low.write('blank',v);},
    get echflg(){return block.read('echflg');},set echflg(v:bigint){block.write('echflg',v);},
    get iniflg(){return block.read('iniflg');},set iniflg(v:bigint){block.write('iniflg',v);},
    get ccflgDot(){return block.read('ccflgDot');},set ccflgDot(v:bigint){block.write('ccflgDot',v);},
  };
  return {block,state};
}
