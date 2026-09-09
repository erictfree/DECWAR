import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { outputRuntimeFixture } from './output-runtime.ts';
import { blockRuntime } from '../../src/compat/block-runtime.ts';
import type { BlockServices } from '../../src/compat/block-runtime.ts';
import { add36,leftHalf,rightHalf } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=Pick<ReturnType<typeof outputRuntimeFixture>,'m'|'r'|'rt'|'cpu'>;
export function bindBlockRuntime(f:Host){
  f.m.map(25000n,Array<bigint>(400).fill(0n));const symbols={header:25000n,value:25010n,count:25011n,from:25100n,to:25200n},events:string[]=diagnosticRecords();
  const io:BlockServices<string>={
    *aojT1(){events.push('aoj');f.r.t1=add36(f.r.t1,1n);},*addT2(n){events.push('add:'+n);f.r.t2=add36(f.r.t2,n);},
    *blt(last){events.push('blt:'+last);assert.ok(rightHalf(f.r.t1)<=last,'fixture requires ascending nonempty BLT extent');assert.ok(leftHalf(f.r.t1)>15n&&rightHalf(f.r.t1)>15n,'fixture requires non-AC BLT extent');yield*f.cpu.blt(last);},
  }; // Ordinary forward-copy fixture; empty/wrapped/AC BLT behavior remains required.
  return {symbols,events,io,run:(entry:'blkset'|'blkmov'|'locf',args:bigint[])=>{loadArgumentBlock(f.m,symbols.header,args);selectArgumentBlock(f.r,symbols.header);return blockRuntime(entry,f.m,f.r,f.rt.args,io);}};
}
