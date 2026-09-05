import type { AddressSpace } from '../compat/memory.ts';
import { commonLayout } from '../generated/common-layout.ts';
import { queueLayout } from '../generated/queue-layout.ts';
import { MonitorResources } from './monitor-resources.ts';
import { MemoryWordFiles } from './word-files.ts';
import type { WordFiles } from './word-files.ts';

// Shared data regions identified by HISEG.FOR/WARMAC and DECWAR.MAP. Private
// LOWSEG, registers, stacks, compiler scratch and SEED are never attached here.
// Timer region: WARMAC TIMERS / DECWAR.MAP, same address used by raw DEBUG.
const regions=[
  {address:BigInt(commonLayout.hiseg.address),words:commonLayout.hiseg.words},
  {address:0o405562n,words:250},
  {address:BigInt(queueLayout.address),words:queueLayout.words},
] as const;
export class SharedGameWorld{
  readonly monitor:MonitorResources;
  private segments:{address:bigint;words:bigint[]}[]|undefined;
  constructor(files:WordFiles|MonitorResources=new MemoryWordFiles()){this.monitor=files instanceof MonitorResources?files:new MonitorResources(files);}
  get locks(){return this.monitor.locks;}
  get files(){return this.monitor.files;}
  openExclusiveFile(name:string,job:number):boolean{return this.monitor.openExclusiveFile(name,job);}
  closeExclusiveFile(name:string,job:number):void{this.monitor.closeExclusiveFile(name,job);}
  releaseJob(job:number):void{this.monitor.releaseJob(job);}
  attach(memory:AddressSpace):void{
    // Only the first loader provides initial words. Later job construction must
    // not overwrite an existing galaxy, DATA tables or pending hit/message queues.
    if(!this.segments)this.segments=regions.map(region=>({address:region.address,words:Array.from({length:region.words},(_,i)=>memory.read(region.address+BigInt(i)))}));
    for(const segment of this.segments)memory.share(segment.address,segment.words);
  }
}
