import type { AddressSpace } from '../compat/memory.ts';

// Modern private allocation window for CORE requests. CLOSE's source page mask
// is 0777 (WARMAC 1495–1512), so the selected host rounds to 512-word pages.
// Base/limit and zero-filled new pages are explicit loader policies. This is not
// a reconstructed original link layout or a complete monitor CORE emulator.
export class PrivateCore{
  private memory:AddressSpace;
  private job:{jbff:bigint;jbrel:bigint};
  private base:bigint;
  private limit:bigint;
  constructor(memory:AddressSpace,job:{jbff:bigint;jbrel:bigint},base:bigint,limit:bigint){
    if(base<0n||base>=limit||limit>(1n<<18n)||(base&511n)!==0n||(limit&511n)!==0n)throw new RangeError('Private CORE window must use whole pages');
    memory.map(base,[]);this.memory=memory;this.job=job;this.base=base;this.limit=limit;job.jbff=base;job.jbrel=base-1n;
  }
  request(last:bigint):boolean{
    if(last<this.base||last>=this.limit)return false;
    const end=last|511n;
    try{this.memory.resize(this.base,Number(end-this.base+1n));}catch(error){if(error instanceof RangeError)return false;throw error;}
    this.job.jbrel=end;return true;
  }
}
