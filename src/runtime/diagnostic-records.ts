import {AsyncLocalStorage} from 'node:async_hooks';

// Fixture histories are observations, not game queues. Select their retention
// when composing a runtime; each array keeps that policy for its lifetime.
// Outside a live composition, unit fixtures retain their full expected history.
const retention=new AsyncLocalStorage<number>();
const limits=new WeakMap<object,number>();
export const MAX_DIAGNOSTIC_RECORDS=100_000;
export function diagnosticRecordLimit(records:object):number|undefined{return limits.get(records);}
export function withDiagnosticRecords<T>(limit:number,compose:()=>T):T{
  if(!Number.isSafeInteger(limit)||limit<0||limit>MAX_DIAGNOSTIC_RECORDS)throw new RangeError(`Diagnostic record limit must be 0..${MAX_DIAGNOSTIC_RECORDS}`);
  return retention.run(limit,compose);
}
export function diagnosticRecords<T>():T[]{
  const limit=retention.getStore(),records:T[]=[];
  if(limit===undefined)return records;
  if(limit===0){Object.defineProperty(records,'push',{value:()=>0});limits.set(records,0);return records;}
  let head=0;
  const index=(key:PropertyKey)=>typeof key==='string'&&/^(0|[1-9]\d*)$/.test(key)&&Number(key)<0xffffffff?Number(key):undefined;
  const logical=(i:number)=>records[(head+i)%limit];
  // Ordinary array inspection (slice, includes, iteration and JSON) sees source
  // order. Ring replacement is constant time once full, unlike shifting a large
  // history on every character/token event.
  const append=(...items:T[])=>{
    if(limit===0)return 0;
    for(const item of items){
      if(records.length<limit)records.push(item);
      else{records[head]=item;head=(head+1)%limit;}
    }
    return records.length;
  };
  function linearize(){
    if(head===0)return;
    const ordered=Array.from({length:records.length},(_,i)=>logical(i));
    head=0;for(let i=0;i<ordered.length;i++)records[i]=ordered[i];
  }
  const proxy=new Proxy(records,{
    get(target,key,receiver){if(key==='push')return append;const i=index(key);return i!==undefined&&i<target.length?logical(i):Reflect.get(target,key,receiver);},
    getOwnPropertyDescriptor(target,key){const descriptor=Reflect.getOwnPropertyDescriptor(target,key),i=index(key);return descriptor&&i!==undefined&&i<target.length?{...descriptor,value:logical(i)}:descriptor;},
    // Test callers may clear or edit history. Normalize before those uncommon
    // mutations; no game service consumes history to choose a game action.
    set(target,key,value){linearize();return Reflect.set(target,key,value);},
    deleteProperty(target,key){linearize();return Reflect.deleteProperty(target,key);},
  });
  limits.set(proxy,limit);
  return proxy;
}
