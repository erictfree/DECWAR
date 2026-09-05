import type { CommonBlock } from './memory.ts';
import type { MemoryCommandInput } from './input-memory.ts';
import { inputRuntime } from './input-runtime.ts';
import type { LockBlock } from './unlock.ts';
// HV.LOK is a private assembler word; its actual relocated reference is required.
// LOWSEG names and the shared GAMENO remain live; no construction initializes them.
export function lockState(input:MemoryCommandInput,high:CommonBlock,locks:LockBlock,hvLok:{value:bigint}){
  if(high.layout.file!=='HISEG.FOR')throw new TypeError('Lock state requires HISEG');
  const low=input.low,base=inputRuntime(input).state;
  return {
    get lkfail(){return low.read('lkfail');},set lkfail(v:bigint){low.write('lkfail',v);},
    get hvLok(){return hvLok.value;},set hvLok(v:bigint){hvLok.value=v;},
    get gameno(){return high.read('gameno');},set gameno(v:bigint){high.write('gameno',v);},
    get hungup(){return base.hungup;},set hungup(v:bigint){base.hungup=v;},
    get ccflg(){return base.ccflg;},set ccflg(v:bigint){base.ccflg=v;},
    get ccflgDot(){return base.ccflgDot;},set ccflgDot(v:bigint){base.ccflgDot=v;},
    get iniflg(){return base.iniflg;},set iniflg(v:bigint){base.iniflg=v;},
    get locked(){return locks.read('locked');},set locked(v:bigint){locks.write('locked',v);},
    get svlock(){return locks.read('svlock');},set svlock(v:bigint){locks.write('svlock',v);},
  };
}
