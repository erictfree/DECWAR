import { MonitorResources } from './monitor-resources.ts';
import { SharedGameWorld } from './shared-world.ts';
import type { WordFiles } from './word-files.ts';

// Modern replacement for the loader's shared-segment catalog. KILHGH's
// successful RENAME unpublishes a world; already-attached jobs retain it.
export class WorldDirectory{
  readonly monitor:MonitorResources;
  private current:SharedGameWorld|undefined;
  constructor(files?:WordFiles){this.monitor=new MonitorResources(files);}
  load():SharedGameWorld{return this.current??=new SharedGameWorld(this.monitor);}
  remove(world:SharedGameWorld):void{if(this.current===world)this.current=undefined;}
}
