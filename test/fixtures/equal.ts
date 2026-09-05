import assert from 'node:assert/strict';
import type { EqualServices } from '../../src/compat/equal.ts';
import { rightHalf,signed36,unsigned36 } from '../../src/compat/word36.ts';
import type { outputRuntimeFixture } from './output-runtime.ts';

// Explicit ordinary POINT 7/ILDB instruction fixture; shared real S/AC memory.
export function equalServices(f:ReturnType<typeof outputRuntimeFixture>):EqualServices<string>{
  return {...f.rt.stack,*ildb(pointer){
    const word=unsigned36(f.r[pointer]);let pos=Number((word>>30n)&63n),address=rightHalf(word);
    const size=Number((word>>24n)&63n);assert.equal(size,7);
    if(pos<size){pos=36;address=rightHalf(address+1n);}pos-=size;
    f.r[pointer]=signed36((word&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|address);
    return (unsigned36(f.m.read(address))>>BigInt(pos))&127n;
  }};
}
