import type { AddressSpace } from '../compat/memory.ts';
import { MonitorResources } from './monitor-resources.ts';
import { MemoryWordFiles } from './word-files.ts';
import type { WordFiles } from './word-files.ts';
import { createVariantContext, type VariantContext } from './variant.ts';
import { WarEndingState } from './war-ending-state.ts';

// Shared data regions identified by HISEG.FOR/WARMAC and DECWAR.MAP. Private
// LOWSEG, registers, stacks, compiler scratch and SEED are never attached here.
// Timer region: WARMAC TIMERS / DECWAR.MAP, same address used by raw DEBUG.
export class SharedGameWorld{
  readonly warEnding = new WarEndingState();
  readonly monitor:MonitorResources;
  readonly variant:VariantContext;
  private readonly regions:readonly {address:bigint;words:number}[];
  private segments:{address:bigint;words:bigint[]}[]|undefined;
  constructor(files:WordFiles|MonitorResources=new MemoryWordFiles(),variant:VariantContext=createVariantContext('compuserve')){
    this.monitor=files instanceof MonitorResources?files:new MonitorResources(files);this.variant=variant;
    const layout=variant.definition;
    // Use each map's actual TIMERS location rather than the former C literal.
    this.regions=[
      {address:BigInt(layout.commonLayout.hiseg.address),words:layout.commonLayout.hiseg.words},
      {address:BigInt(layout.timers.address),words:layout.timers.words},
      {address:BigInt(layout.queueLayout.address),words:layout.queueLayout.words},
    ];
  }
  get locks(){return this.monitor.locks;}
  get files(){return this.monitor.files;}
  openExclusiveFile(name:string,job:number):boolean{return this.monitor.openExclusiveFile(name,job);}
  closeExclusiveFile(name:string,job:number):void{this.monitor.closeExclusiveFile(name,job);}
  releaseJob(job:number):void{this.monitor.releaseJob(job);}
  attach(memory:AddressSpace):void{
    // Only the first loader provides initial words. Later job construction must
    // not overwrite an existing galaxy, DATA tables or pending hit/message queues.
    if(!this.segments)this.segments=this.regions.map(region=>({address:region.address,words:Array.from({length:region.words},(_,i)=>memory.read(region.address+BigInt(i)))}));
    for(const segment of this.segments)memory.share(segment.address,segment.words);
  }
}
