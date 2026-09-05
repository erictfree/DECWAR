import type { FileBlock } from '../compat/files.ts';
import type { WordMemory } from '../compat/memory.ts';
import type { WordFiles } from './word-files.ts';
import { halfWords,leftHalf,rightHalf,unpackSixbit } from '../compat/word36.ts';

// Host side of WARMAC GRIP.3–GRIP.8 (4922–4976). Source code allocates the new
// packed report, reads old words after it, constructs the combined IOWD, USETO 1,
// then writes the whole file. This adapter never reorders or re-encodes text.
export function gripeFiles(m:WordMemory,file:FileBlock,files:WordFiles,ownership:{acquire(name:string):boolean;release(name:string):void},busyCode:bigint){
  let current:{name:string;words:bigint[];rewound:boolean}|undefined;
  function transfer(descriptor:bigint){
    const word=m.read(descriptor),count=-BigInt.asIntN(18,leftHalf(word));
    if(count<0n||m.read(descriptor+1n)!==0n)throw new Error('Unsupported GRIPE transfer descriptor');
    return {start:rightHalf(word)+1n,count:Number(count)};
  }
  return {
    *filop():Generator<string,boolean,void>{
      if(current)throw new Error('GRIPE file already open');
      const name=unpackSixbit(file.read('le.nam')).trim()+'.'+unpackSixbit(file.read('le.ext')).trim();
      if(!ownership.acquire(name)){file.write('leblk',busyCode,1);return false;}
      try{
        const words=files.read(name)??[];
        if(words.length>=131072)throw new Error('GRIPE file length exceeds signed 18-bit monitor descriptor');
        current={name,words,rewound:false};file.write('leblk',words.length?halfWords(-BigInt(words.length),0n):0n,3);return true;
      }catch(error){ownership.release(name);throw error;}
    },
    *input(descriptor:bigint):Generator<string,boolean,void>{
      const {start,count}=transfer(descriptor);
      if(!current||count!==current.words.length)throw new Error('GRIPE INPUT does not match open file length');
      current.words.forEach((word,i)=>m.write(start+BigInt(i),word));return false;
    },
    *useto(block:bigint):Generator<string,void,void>{
      if(!current||block!==1n)throw new Error('Unsupported GRIPE USETO');current.rewound=true;
    },
    *output(descriptor:bigint):Generator<string,boolean,void>{
      const {start,count}=transfer(descriptor);if(!current?.rewound)throw new Error('GRIPE OUTPUT requires USETO 1');
      files.write(current.name,Array.from({length:count},(_,i)=>m.read(start+BigInt(i))));current.rewound=false;return false;
    },
    *close():Generator<string,void,void>{if(current){ownership.release(current.name);current=undefined;}},
  };
}
