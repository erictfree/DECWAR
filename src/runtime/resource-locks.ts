// Modern monitor boundary for WARMAC LOCK./UNLO. The source retains its ENQ
// result handling, wait loop, HVLOK check and diagnostics. This service only
// owns named resources and delivers a grant when the current owner releases.
// FIFO among waiters is an explicit host policy, not an undocumented TOPS-10
// fairness claim. Job teardown releases ownership without changing game words.
export class ResourceLocks{
  private resources=new Map<bigint,{owner:number;waiters:{job:number;grant:()=>void}[]}>();
  request(key:bigint,job:number,grant:()=>void):'granted'|'queued'{
    const resource=this.resources.get(key);
    if(!resource){this.resources.set(key,{owner:job,waiters:[]});return 'granted';}
    if(resource.owner===job)return 'granted';
    if(!resource.waiters.some(waiter=>waiter.job===job))resource.waiters.push({job,grant});
    return 'queued';
  }
  release(key:bigint,job:number):boolean{
    const resource=this.resources.get(key);if(!resource||resource.owner!==job)return false;
    const next=resource.waiters.shift();
    if(!next)this.resources.delete(key);
    else{resource.owner=next.job;next.grant();}
    return true;
  }
  owner(key:bigint):number|undefined{return this.resources.get(key)?.owner;}
  // WARMAC UNLO also cancels a pending claim on its Ctrl-C failure path.
  dequeue(key:bigint,job:number):boolean{
    const resource=this.resources.get(key);if(!resource)return false;
    if(resource.owner===job)return this.release(key,job);
    const index=resource.waiters.findIndex(waiter=>waiter.job===job);
    if(index<0)return false;resource.waiters.splice(index,1);return true;
  }
  releaseJob(job:number):void{
    // Remove pending requests first, including requests on resources this job
    // doesn't own. A dead job must never be granted a lock by teardown below.
    for(const resource of this.resources.values())resource.waiters=resource.waiters.filter(waiter=>waiter.job!==job);
    for(const [key,resource] of this.resources)if(resource.owner===job)this.release(key,job);
  }
}
