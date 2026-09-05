import { constants as K } from '../runtime/variant-values.ts';
import { fortranDataWords } from '../runtime/variant-values.ts';
import type { CommonBlock, WordMemory } from '../compat/memory.ts';
import { signed36, unpackAscii } from '../compat/word36.ts';

export type DataOrigin = { readonly file:string;readonly line:number;readonly field:string;readonly indices:readonly number[];readonly storageType:string };
export type DataLiteral = { readonly kind:'quoted'|'hollerith';readonly text:string;readonly source:string };
export type DataImageWord = DataOrigin & { readonly scope:'hiseg'|'precmd';readonly offset:number;readonly word:bigint };
// This produces an image, not executable DATA statements. Literal encoding is
// required even for five-character strings; no compiler padding policy is chosen.
export function createDataImage(compileLiteral:(literal:DataLiteral,origin:DataOrigin)=>bigint):readonly DataImageWord[]{
  return fortranDataWords.map(item=>({file:item.file,line:item.line,field:item.field,indices:item.indices,scope:item.scope,offset:item.offset,storageType:item.storageType,
    word:signed36(item.value.kind==='integer'?BigInt(item.value.word):compileLiteral(item.value,item))}));
}
// Install only explicit image words. Call when loading a fresh shared segment,
// NOT each SETUP invocation or each connection to an existing galaxy.
export function loadHighData(image:readonly DataImageWord[],high:CommonBlock):void {
  if(high.layout.file!=='HISEG.FOR')throw new TypeError('HISEG DATA requires HISEG memory');
  for(const item of image)if(item.scope==='hiseg')high.memory.write(high.base+BigInt(item.offset),item.word);
}
// PRECMD belongs to XGTCMD's private compiled storage, not HISEG or LOWSEG.
// The address must come from the chosen loader/compiler binding.
export function loadPregameData(image:readonly DataImageWord[],memory:WordMemory,address:bigint):void {
  for(const item of image)if(item.scope==='precmd')memory.write(address+BigInt(item.offset),item.word);
}

export type CommandWordReader=(phase:'game'|'pregame',index:number)=>string;
// Read five 7-bit positions as the assembly EQUAL/OUT2W routines do, from the
// current compiled word. NUL/space termination is handled by each consumer.
export function dataTables(high:CommonBlock,precmd:{memory:WordMemory;address:bigint}) {
  const pairs=(field:string,count:number)=>Array.from({length:count},(_,i)=>Object.defineProperties(['',''],{
    0:{get:()=>unpackAscii(high.read(field,1,i+1))},1:{get:()=>unpackAscii(high.read(field,2,i+1))},
  }) as [string,string]);
  return {
    helpTables:{commands:pairs('isaydo',K.KNCMD),extra:pairs('xhelp',K.KNXTR)},
    commandWord:((phase,index)=>unpackAscii(phase==='game'?high.read('isaydo',1,index):precmd.memory.read(precmd.address+BigInt((index-1)*2)))) as CommandWordReader,
    terminalWord:(column:number,index:number)=>unpackAscii(high.read('ttydat',column,index)),
    deviceWord:(index:number)=>unpackAscii(high.read('device',index)),
    helpWord:(column:number,index:number)=>unpackAscii(high.read('xhelp',column,index)),
  };
}
