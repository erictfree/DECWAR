import { mkdirSync,openSync,writeFileSync,closeSync,readFileSync,unlinkSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// One host owns a data directory. The in-process source ENQ coordinator cannot
// serialize another Node process. A crash leaves a lock for explicit inspection;
// do not guess that an old timestamp means its owner is dead.
export function acquireDataDirectory(directory:string):()=>void{
  const root=resolve(directory);mkdirSync(root,{recursive:true});const path=join(root,'.host.lock');
  const owner=JSON.stringify({pid:process.pid,token:randomUUID()})+'\n';let fd:number;
  try{fd=openSync(path,'wx',0o600);}catch(error){
    if(error instanceof Error&&'code'in error&&error.code==='EEXIST')throw new Error('Data directory is already in use or has a stale host lock: '+path);
    throw error;
  }
  try{writeFileSync(fd,owner,'utf8');}catch(error){unlinkSync(path);throw error;}finally{closeSync(fd);}
  let released=false;
  return ()=>{if(released)return;if(readFileSync(path,'utf8')!==owner)throw new Error('Data directory lock ownership changed: '+path);unlinkSync(path);released=true;};
}
