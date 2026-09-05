import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import { userNameRuntime } from '../../src/compat/user-name-runtime.ts';
import type { UserNameServices } from '../../src/compat/user-name-runtime.ts';
import { constants as K } from '../../src/runtime/variant-values.ts';
import { characterBits } from '../../src/runtime/variant-values.ts';
import { halfWords,rightHalf,signed36,unsigned36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindUserNameRuntime(f:ReturnType<typeof pregameInputRuntimeFixture>){
  f.m.map(23200n,Array<bigint>(100).fill(0n));const header=23200n,index=23210n,zero=23211n;
  f.m.write(index,2n);
  const symbols={ptrlst:f.low.address('ptrlst',1),linbuf:f.input.lineAddress,cbits:f.tokens.symbols.cbits,delimiter:BigInt(characterBits.flags['cf.dlm']),tmp:f.file.address('tmp',0),sixbitPointer:signed36(halfWords(0o440600n,f.file.address('tmp',0))),who:f.low.address('who'),name1Base:f.high.address('job',1,K.KNAM1)-1n,name2Base:f.high.address('job',1,K.KNAM2)-1n,bufptr:f.input.block.address('bufptr')};
  const events:string[]=[],io:UserNameServices<string>={
    *idpb(){events.push('idpb');const word=unsigned36(f.r.p2);let pos=(word>>30n)&63n,a=rightHalf(word);assert.equal((word>>24n)&63n,6n);assert.equal((word>>18n)&63n,0n,'fixture requires direct unindexed pointer');if(pos<6n){pos=36n;a=rightHalf(a+1n);}pos-=6n;f.r.p2=signed36((word&~((63n<<30n)|0o777777n))|(pos<<30n)|a);const mask=63n<<pos;f.m.write(a,(unsigned36(f.m.read(a))&~mask)|((f.r.c&63n)<<pos));},
    *dmove(){events.push('dmove');const a=f.m.read(symbols.tmp),b=f.m.read(symbols.tmp+1n);f.r.t1=a;f.r.t2=b;}, // Explicit ordinary DMOVE fixture, not exceptional CPU semantics.
  };
  return {symbols,header,index,zero,events,io,run:(actual=index)=>{loadArgumentBlock(f.m,header,[actual]);selectArgumentBlock(f.r,header);return userNameRuntime(f.m,f.r,f.rt.args,symbols,io);}};
}
