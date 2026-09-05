import { ResourceLocks } from './resource-locks.ts';
import { MemoryWordFiles } from './word-files.ts';
import type { WordFiles } from './word-files.ts';

// One modern monitor domain across galaxies. WARMAC LOCK:4493–4497 omits
// game-number bits for FRELOK/STAUPD; preserve its actual keys without adding
// a host world identifier. In particular, statistics locking is universal.
export class MonitorResources{
  readonly locks=new ResourceLocks();
  readonly files:WordFiles;
  private fileOwners=new Map<string,number>();
  constructor(files:WordFiles=new MemoryWordFiles()){this.files=files;}
  openExclusiveFile(name:string,job:number):boolean{
    const owner=this.fileOwners.get(name);if(owner!==undefined&&owner!==job)return false;
    this.fileOwners.set(name,job);return true;
  }
  closeExclusiveFile(name:string,job:number):void{if(this.fileOwners.get(name)===job)this.fileOwners.delete(name);}
  releaseJob(job:number):void{
    for(const [name,owner] of this.fileOwners)if(owner===job)this.fileOwners.delete(name);
    this.locks.releaseJob(job);
  }
}
