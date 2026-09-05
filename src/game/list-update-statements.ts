import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36,signed36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
export type ListUpdateServices<W>={logical(word:bigint):boolean;pdist(v:bigint,h:bigint,ov:bigint,oh:bigint):Generator<W,bigint,void>};
// LSTUPD.FOR:31-64. Arguments are actual words and may all alias DUMMY.
// Bit assignments reread their operands after each preceding store.
export function* listUpdateStatements<W>(low:CommonBlock,list:WordBlock,d:bigint,a:{lstmsk:bigint;objctr:bigint;scnbts:bigint;xxf:bigint},io:ListUpdateServices<W>):Generator<W,void,void>{
  const m=low.memory,read=(key:string)=>list.read(key),put=(key:string,w:bigint)=>list.write(key,w),or=(key:string,w:bigint)=>put(key,signed36(read(key)|w)),has=(key:string,bit:number)=>(read(key)&BigInt(bit))!==0n;
  m.write(d,yield*io.pdist(list.address('svpos'),list.address('shpos'),list.address('vpos'),list.address('hpos')));put('xf',read('gxf'));let pc=400;
  if(m.read(d)>BigInt(K.KRANGE)&&read('side')!==low.read('team')){
    if(io.logical(low.read('pasflg')))or('xf',BigInt(K.PASBIT));else{
      or('xf',BigInt(K.ORNBIT));if(read('range')>BigInt(K.KRANGE)){or('grpbts',BigInt(K.KNOBIT));if(!has('xf',K.IGMBIT))or('xf',BigInt(K.KNOBIT));}
      or('txf',read('xf'));if((m.read(a.scnbts)&low.read('team'))===0n){
        if(!has('xf',K.SUMBIT)||!has('xf',K.IGMBIT))pc=700;else{put('xf',signed36(read('xf')&~BigInt(K.LSTBIT)));pc=500;}
      }
    }
  }
  if(pc===400){if(m.read(d)>read('range'))pc=700;else if(has('imask',K.CLSBIT))pc=600;else pc=500;}
  if(pc===500){m.write(a.lstmsk,signed36(m.read(a.lstmsk)|read('xf')));m.write(a.objctr,add36(m.read(a.objctr),1n));or('grpbts',read('xf'));m.write(a.xxf,signed36(m.read(a.xxf)|read('xf')));return;}
  if(pc===600&&m.read(d)<=read('clsest')){put('clsest',m.read(d));put('vposc',read('vpos'));put('hposc',read('hpos'));}
  or('grpbts',read('xf')&BigInt(K.IRNBIT|K.ISRBIT|K.IGMBIT|K.ORNBIT));m.write(a.xxf,signed36(m.read(a.xxf)|read('xf')));
}
