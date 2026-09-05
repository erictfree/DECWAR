import { rightHalf, signed36 } from './word36.ts';
import { commonLayout,snapshotVariantValue } from '../runtime/variant-values.ts';

export interface WordMemory { read(address: bigint): bigint; write(address: bigint, value: bigint): void; }
// Mapping supplied words does not initialize, load or zero them. Different
// job address spaces can map the SAME backing array for shared high memory.
export class AddressSpace implements WordMemory {
  private regions: { start: bigint; words: bigint[] }[] = [];
  private outside?: WordMemory;
  constructor(outside?: WordMemory) { this.outside=outside; }
  map(start: bigint, words: bigint[]): void {
    if(start<0n||start+BigInt(words.length)>(1n<<18n))throw new RangeError('Region outside 18-bit address space');
    if(this.regions.some(r=>start<r.start+BigInt(r.words.length)&&r.start<start+BigInt(words.length)))throw new RangeError('Overlapping memory regions');
    this.regions.push({start,words});
  }
  // Replace an entire already-mapped region when attaching a job's address
  // space to an existing shared segment. No copies or initialization stores.
  share(start:bigint,words:bigint[]):void{
    const region=this.regions.find(region=>region.start===start);
    if(!region||region.words.length!==words.length)throw new RangeError('Shared segment must match an existing whole region');
    region.words=words;
  }
  resize(start:bigint,words:number):void{
    const region=this.regions.find(region=>region.start===start);
    if(!region||!Number.isSafeInteger(words)||words<0||start+BigInt(words)>(1n<<18n))throw new RangeError('Invalid memory region resize');
    if(this.regions.some(other=>other!==region&&start<other.start+BigInt(other.words.length)&&other.start<start+BigInt(words)))throw new RangeError('Resized memory region overlaps another region');
    const old=region.words.length;region.words.length=words;if(words>old)region.words.fill(0n,old);
  }
  read(address: bigint): bigint {
    address=rightHalf(address);const r=this.regions.find(r=>address>=r.start&&address<r.start+BigInt(r.words.length));
    if(r)return signed36(r.words[Number(address-r.start)]);
    if(this.outside)return signed36(this.outside.read(address));
    throw new RangeError(`Unmapped source address ${address.toString(8)}`);
  }
  write(address: bigint,value: bigint): void {
    address=rightHalf(address);value=signed36(value);const r=this.regions.find(r=>address>=r.start&&address<r.start+BigInt(r.words.length));
    if(r)r.words[Number(address-r.start)]=value;
    else if(this.outside)this.outside.write(address,value);
    else throw new RangeError(`Unmapped source address ${address.toString(8)}`);
  }
}
type Dimension={readonly lower:number;readonly length:number};
type Field={readonly offset:number;readonly dimensions:readonly Dimension[];readonly words:number};
export type BlockLayout={readonly file:string;readonly address:number;readonly words:number;readonly fields:Readonly<Record<string,Field>>};
export class WordBlock<L extends BlockLayout=BlockLayout> {
  readonly memory:WordMemory;readonly base:bigint;readonly layout:L;
  constructor(memory:WordMemory,layout:L,base=BigInt(layout.address)) {this.memory=memory;this.base=base;this.layout=snapshotVariantValue(layout);}
  field(name:string):Field {const field=(this.layout.fields as Record<string,Field>)[name];if(!field)throw new Error('Unknown COMMON field '+name);return field;}
  address(name:string,...indices:(number|bigint)[]):bigint {
    const field=this.field(name);if(indices.length!==field.dimensions.length)throw new RangeError('COMMON subscript rank mismatch: '+name);
    let offset=BigInt(field.offset),stride=1n;for(let i=0;i<indices.length;i++){const d=field.dimensions[i];offset+=(BigInt(indices[i])-BigInt(d.lower))*stride;stride*=BigInt(d.length);}
    // No array-bound check: out-of-range subscripts can name adjacent storage.
    return rightHalf(this.base+offset);
  }
  read(name:string,...indices:(number|bigint)[]):bigint{return this.memory.read(this.address(name,...indices));}
  write(name:string,value:bigint,...indices:(number|bigint)[]):void{this.memory.write(this.address(name,...indices),value);}
  ref(name:string,...indices:(number|bigint)[]):{value:bigint}{const address=this.address(name,...indices),memory=this.memory;return{get value(){return memory.read(address);},set value(n){memory.write(address,n);}};}
  array(name:string,length:number,indices:(number|bigint)[],axis=0):bigint[]{
    const stride=this.field(name).dimensions.slice(0,axis).reduce((n,d)=>n*d.length,1);
    return wordArray(this.memory,this.address(name,...indices),length,BigInt(stride));
  }
  // SETUP BLKSET(HFZ,0,LOCF(HLZ)-LOCF(HFZ)+1); DECWAR's LOWSEG clear.
  clear(first:string,last:string):void {const a=this.field(first).offset,b=this.field(last).offset;for(let i=a;i<=b;i++)this.memory.write(this.base+BigInt(i),0n);}
}
export class CommonBlock extends WordBlock<BlockLayout> {
  constructor(memory:WordMemory,name:'hiseg'|'lowseg',base?:bigint,layouts:Readonly<Record<'hiseg'|'lowseg',BlockLayout>>=commonLayout) {
    super(memory,layouts[name],base??BigInt(layouts[name].address));
  }
}
const numeric=(key:PropertyKey):key is string=>typeof key==='string'&&/^-?(0|[1-9]\d*)$/.test(key);
// Actual array accessors preserve existing port APIs and Array operations.
// Numeric subscripts beyond length still address machine words, not JS holes.
export function wordArray(memory:WordMemory,start:bigint,length:number,stride=1n):bigint[]{
  return new Proxy(Array<bigint>(length),{
    get(target,key,receiver){return numeric(key)?memory.read(start+BigInt(key)*stride):Reflect.get(target,key,receiver);},
    has(target,key){return numeric(key)||Reflect.has(target,key);},
    set(_target,key,value){if(!numeric(key))throw new TypeError('Source array shape is fixed');memory.write(start+BigInt(key)*stride,value);return true;},
    deleteProperty(){throw new TypeError('Source words cannot be deleted');},
  });
}
export function objectArray<T>(length:number,make:(index:number)=>T):T[]{
  const cache=new Map<number,T>();return new Proxy(Array<T>(length),{
    get(target,key,receiver){if(!numeric(key))return Reflect.get(target,key,receiver);const index=Number(key);if(!cache.has(index))cache.set(index,make(index));return cache.get(index);},
    has(target,key){return numeric(key)||Reflect.has(target,key);},
    set(){throw new TypeError('Source object views cannot be replaced');},
  });
}
