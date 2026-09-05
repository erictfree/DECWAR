import type { WordMemory } from '../compat/memory.ts';
import type { FileBlock } from '../compat/files.ts';
import type { StatisticsSymbols } from '../compat/statistics-runtime.ts';
import { leftHalf,rightHalf,unpackSixbit } from '../compat/word36.ts';
import type { WordFiles } from './word-files.ts';

// Host file boundary for WARMAC's DECWAR.STA / DECWAF.STA descriptors (875–923)
// and the 640-word STAIow/STFIow transfers (676–692). OPEN, UPDCAP, UPDSTA,
// SHOSTA and STAZAP retain their original statement/register sequences.
export function statisticsFiles(m:WordMemory,r:{x1:bigint},file:FileBlock,s:Pick<StatisticsSymbols,'stared'|'staupd'|'stfred'|'stfupd'>,files:WordFiles){
  let current:{name:string;mode:'read'|'write';words?:bigint[]}|undefined;
  function transfer(descriptor:bigint){
    const word=m.read(descriptor),count=-BigInt.asIntN(18,leftHalf(word));
    if(count!==640n||m.read(descriptor+1n)!==0n)throw new Error('Unsupported statistics transfer descriptor');
    return rightHalf(word)+1n;
  }
  return {
    *filop():Generator<string,boolean,void>{
      current=undefined;const address=rightHalf(r.x1);
      if(!Object.values(s).includes(address))throw new Error('Unknown statistics file descriptor');
      const name=unpackSixbit(m.read(address+7n)).trim()+'.'+unpackSixbit(m.read(address+8n)).trim();
      const mode=address===s.stared||address===s.stfred?'read':'write';
      if(mode==='read'){
        const words=files.read(name);if(words===undefined)return false;
        if(words.length!==640)throw new Error('Statistics file must contain 640 words: '+name);
        current={name,mode,words};
        // Required monitor-result policy: negative LE.PPN selects source INPUT.
        // Exact historical monitor descriptor results are not established.
        file.write('le.ppn',-1n);
      }else current={name,mode};
      return true;
    },
    *inputSTA(descriptor:bigint):Generator<string,void,void>{
      const start=transfer(descriptor);if(current?.mode!=='read'||!current.words)throw new Error('Statistics INPUT without an open read file');
      current.words.forEach((word,i)=>m.write(start+BigInt(i),word));
    },
    *outputSTA(descriptor:bigint):Generator<string,void,void>{
      const start=transfer(descriptor);if(current?.mode!=='write')throw new Error('Statistics OUTPUT without an open write file');
      files.write(current.name,Array.from({length:640},(_,i)=>m.read(start+BigInt(i))));
    },
    *closeSTA():Generator<string,void,void>{current=undefined;},
  };
}
