import type { WordMemory } from './memory.ts';
import { halfWords,rightHalf,signed36 } from './word36.ts';

// WARMAC ARGBLK:201-208. Loader operation for already-resolved EXP words;
// not a runtime allocator and not a claim about the absent FORTRAN compiler.
export function loadArgumentBlock(m:WordMemory,header:bigint,words:readonly bigint[]):void{
  m.write(rightHalf(header),signed36(halfWords(-BigInt(words.length),0n)));
  for(let i=0;i<words.length;i++)m.write(rightHalf(header+1n+BigInt(i)),words[i]);
}
// The macro executes only MOVEI ARG,literal+1 after loading the static block.
export function selectArgumentBlock(r:{arg:bigint},header:bigint):void{r.arg=rightHalf(header+1n);}

export type SourceArguments={address(index:number|bigint):bigint;read(index:number|bigint):bigint};
// @n(ARG) in WARMAC's public entries: use current ARG on every access.
// Effective-address resolution includes actual indexed/indirect argument words.
// No missing-argument defaults or count checks are added to these reads.
export function sourceArguments(m:WordMemory,r:{arg:bigint},resolveIndirect:(wordAddress:bigint)=>bigint):SourceArguments{
  const address=(index:number|bigint)=>rightHalf(resolveIndirect(rightHalf(r.arg+BigInt(index))));
  return {address,read:index=>m.read(address(index))};
}

// WARMAC CPOPJ1/CPOPJ:932-933. AOS changes the actual stack return word;
// CPU flags/overflow and POPJ transfer remain required operations. POPJ must
// use live P after AOS returns, rather than the address captured for AOS.
export function* commonReturn<W>(r:{p:bigint},entry:'cpopj'|'cpopj1',io:{
  aos(address:bigint):Generator<W,void,void>;popjP():Generator<W,void,void>;
}):Generator<W,void,void>{if(entry==='cpopj1')yield*io.aos(rightHalf(r.p));yield*io.popjP();}
