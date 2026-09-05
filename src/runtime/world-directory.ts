import { MonitorResources } from './monitor-resources.ts';
import { SharedGameWorld } from './shared-world.ts';
import type { WordFiles } from './word-files.ts';
import { createVariantContext, type VariantContext } from './variant.ts';

// Modern replacement for the loader's shared-segment catalog. KILHGH's
// successful RENAME unpublishes a world; already-attached jobs retain it.
export class WorldDirectory{
  readonly monitor:MonitorResources;
  readonly variant:VariantContext;
  private current:SharedGameWorld|undefined;
  constructor(files?:WordFiles,variant:VariantContext=createVariantContext('compuserve')){this.monitor=new MonitorResources(files);this.variant=variant;}
  load():SharedGameWorld{return this.current??=new SharedGameWorld(this.monitor,this.variant);}
  remove(world:SharedGameWorld):void{if(this.current===world)this.current=undefined;}
}
