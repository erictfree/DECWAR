import { existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DiskWordFiles } from './word-files.ts';
import type { VariantId } from './variant.ts';

// Host metadata is deliberately outside the original word-file format. Invoke
// only while owning the data-directory lock, before constructing any session.
export function verifyVariantStorage(directory:string,variant:VariantId):void{
  mkdirSync(directory,{recursive:true});const path=join(directory,'variant.json');
  const expected={format:'DECWAR-HOST-1',variant,wordFormat:'DECWAR-WORDS-1'};
  if(existsSync(path)){
    const actual=JSON.parse(readFileSync(path,'utf8')) as Record<string,unknown>;
    if(actual.format!==expected.format||actual.variant!==variant||actual.wordFormat!==expected.wordFormat)throw new Error('Incompatible DECWAR variant or storage format: '+path);
    return;
  }
  const records=readdirSync(directory).filter(name=>name.endsWith('.words'));
  if(records.length&&variant!=='compuserve')throw new Error('Unidentified existing word files cannot be used for Austin: '+directory);
  const files=new DiskWordFiles(directory);
  for(const record of records){
    const name=record.slice(0,-6);
    if(!['DECWAR.STA','DECWAF.STA','DECWAR.GRP'].includes(name))throw new Error('Unrecognized legacy CompuServe record: '+record);
    const words=files.read(name);
    if(name.endsWith('.STA')&&words?.length!==640)throw new Error('Invalid legacy statistics length: '+record);
  }
  writeFileSync(path,JSON.stringify(expected,null,2)+'\n',{flag:'wx',mode:0o600});
}
