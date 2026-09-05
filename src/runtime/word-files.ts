import { mkdirSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,unlinkSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MIN_INTEGER,WORD_MASK,signed36,unsigned36 } from '../compat/word36.ts';

export interface WordFiles{
  read(name:string):bigint[]|undefined;
  write(name:string,words:readonly bigint[]):void;
}
function checkName(name:string):void{if(!/^[A-Z0-9]{1,6}\.[A-Z0-9]{1,3}$/.test(name))throw new Error('Invalid source word-file name: '+name);}
function words36(words:readonly bigint[]):bigint[]{return words.map(word=>{
  if(typeof word!=='bigint'||word<MIN_INTEGER||word>WORD_MASK)throw new RangeError('Word file value outside 36 bits');
  return signed36(word);
});}
export class MemoryWordFiles implements WordFiles{
  private files=new Map<string,bigint[]>();
  read(name:string):bigint[]|undefined{checkName(name);return this.files.get(name)?.slice();}
  write(name:string,words:readonly bigint[]):void{checkName(name);this.files.set(name,words36(words));}
}
// Modern, versioned container for exact word patterns. This is deliberately not
// labeled a TOPS-10 disk image: one header, then one nine-digit hex word per line.
// Replacement is atomic on one filesystem; flush the file before rename. No
// cross-process locking or power-loss durability of directory metadata is claimed.
export class DiskWordFiles implements WordFiles{
  private directory:string;
  constructor(directory:string){this.directory=resolve(directory);mkdirSync(this.directory,{recursive:true});}
  private path(name:string){checkName(name);return join(this.directory,name+'.words');}
  read(name:string):bigint[]|undefined{
    const path=this.path(name);let text:string;
    try{text=readFileSync(path,'utf8');}catch(error){if(error instanceof Error&&'code'in error&&error.code==='ENOENT')return undefined;throw error;}
    const lines=text.split('\n');
    if(lines.shift()!=='DECWAR-WORDS-1'||lines.pop()!=='')throw new Error('Invalid word-file framing: '+name);
    if(lines.some(line=>! /^[0-9a-f]{9}$/.test(line)))throw new Error('Invalid word-file data: '+name);
    return lines.map(line=>signed36(BigInt('0x'+line)));
  }
  write(name:string,words:readonly bigint[]):void{
    const path=this.path(name),text='DECWAR-WORDS-1\n'+words36(words).map(word=>unsigned36(word).toString(16).padStart(9,'0')+'\n').join('');
    const temporary=path+'.'+randomUUID()+'.tmp';let fd:number|undefined;
    try{fd=openSync(temporary,'wx',0o600);writeFileSync(fd,text,'utf8');fsyncSync(fd);closeSync(fd);fd=undefined;renameSync(temporary,path);}
    finally{if(fd!==undefined)closeSync(fd);try{unlinkSync(temporary);}catch(error){if(!(error instanceof Error&&'code'in error&&error.code==='ENOENT'))throw error;}}
  }
}
