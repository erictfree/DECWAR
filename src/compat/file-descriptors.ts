import { fileDescriptors as source } from '../generated/file-descriptors.ts';
import type { WordMemory } from './memory.ts';
import { halfWords,packSixbit,rightHalf,signed36 } from './word36.ts';

export type DescriptorName=keyof typeof source.blocks;
export function descriptorAddresses(base=BigInt(source.address)){
  return Object.fromEntries(Object.entries(source.blocks).map(([name,b])=>[name,rightHalf(base+BigInt(b.offset))])) as Record<DescriptorName,bigint>;
}
// Assembler/monitor symbols and relocated private routine/buffer addresses
// remain required. Numeric words, SIXBIT and source channel values are explicit.
export function installFileDescriptors(memory:WordMemory,resolve:(symbol:string)=>bigint,base=BigInt(source.address)):void{
  function expression(text:string):bigint{
    const pair=text.split(',,');
    if(pair.length===2)return signed36(halfWords(expression(pair[0]),expression(pair[1])));
    if(pair.length!==1)throw new Error('Unsupported descriptor expression '+text);
    return signed36(text.split('+').reduce((sum,term)=>{
      if(term==='z')return sum;
      if(/^-?[0-7]+$/.test(term))return sum+BigInt(parseInt(term,8));
      const channel=(source.channels as Record<string,number>)[term];
      if(channel!==undefined)return sum+BigInt(channel);
      const constant=(source.constants as Record<string,string>)[term];
      if(constant!==undefined)return sum+expression(constant);
      const value=resolve(term);if(typeof value!=='bigint')throw new Error('Unresolved descriptor symbol '+term);
      return sum+value;
    },0n));
  }
  // Resolve completely before installation. This is a loader boundary policy,
  // not a claim about historical LINK/LOADER partial failure writes.
  const words=source.words.map(w=>w.kind==='sixbit'?signed36(packSixbit(w.text)):
    w.kind==='byte9'?signed36(w.values.reduce((word,value)=>(word<<9n)|BigInt(value),0n)):expression(w.expression));
  words.forEach((word,i)=>memory.write(base+BigInt(i),word));
}
