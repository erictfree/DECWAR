// Isolated operating diagnostic. Observe retained records and heap without
// changing gameplay services. Optional --expose-gc distinguishes live heap from
// allocated capacity; this is not a production setting or a parity capture.
import {appendFileSync,writeFileSync} from 'node:fs';
import {createTelnetServer} from '../../src/transport/server.ts';
import {diagnosticRecordLimit,MAX_DIAGNOSTIC_RECORDS} from '../../src/runtime/diagnostic-records.ts';
import {createGameSession} from '../../src/runtime/game-session.ts';
import {WorldDirectory} from '../../src/runtime/world-directory.ts';
import {createVariantContext} from '../../src/runtime/variant.ts';
import {reloadableSession,SessionReload} from '../../src/runtime/reloadable-session.ts';
const [output,limitText='0']=process.argv.slice(2);
if(!/^\d+$/.test(limitText)||Number(limitText)>MAX_DIAGNOSTIC_RECORDS)throw Error('Invalid diagnostic record limit');
const diagnosticLimit=Number(limitText);
if(!output)throw Error('Usage: node --expose-gc experimental/parity/memory-host.ts NEW_JSONL [RECORD_LIMIT]');
writeFileSync(output,'',{flag:'wx'});
const record=(event:Record<string,unknown>)=>appendFileSync(output,JSON.stringify({time:new Date().toISOString(),...event})+'\n');
const worlds=new WorldDirectory(undefined,createVariantContext('austin','playable'));
const runtimes=new Map<number,ReturnType<typeof createGameSession>>();
function arrays(root:unknown){
  const seen=new Set<object>(),found:{path:string;length:number;limit?:number}[]=[];
  function visit(value:unknown,path:string,depth:number){
    if(!value||typeof value!=='object'||seen.has(value)||depth>12)return;
    seen.add(value);
    if(Array.isArray(value)){found.push({path,length:value.length,limit:diagnosticRecordLimit(value)});return;}
    // Only plain composition objects: never invoke accessors or walk game memory.
    if(Object.getPrototypeOf(value)!==Object.prototype)return;
    for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value)))if('value'in descriptor)visit(descriptor.value,path+'.'+key,depth+1);
  }
  visit(root,'runtime',0);const histories=found.filter(a=>a.limit!==undefined);return {largest:found.sort((a,b)=>b.length-a.length).slice(0,20),historyCount:histories.length,historyRecords:histories.reduce((n,a)=>n+a.length,0),historyMax:Math.max(0,...histories.map(a=>a.length)),overLimit:histories.filter(a=>a.length>a.limit!)};
}
function sample(){global.gc?.();record({event:'memory',gc:!!global.gc,...process.memoryUsage(),sessions:[...runtimes].map(([id,r])=>({id,arrays:arrays(r)}))});}
const host=createTelnetServer({createSession(terminal,{id}){return reloadableSession(()=>{
  const world=worlds.load(),r=createGameSession(terminal,'full',world,id,{playable:true,promptForName:true,diagnosticLimit,lifecycle:{removeHighSegment(){worlds.remove(world);},run(){throw new SessionReload();}}});
  runtimes.set(id,r);return r.program;
},()=>{runtimes.delete(id);worlds.monitor.releaseJob(id);});},onSessionEnd(id,result){runtimes.delete(id);worlds.monitor.releaseJob(id);record({event:'session-end',id,result});}});
host.server.listen(0,'127.0.0.1',()=>{const address=host.server.address();if(address&&typeof address!=='string')record({event:'listening',port:address.port,pid:process.pid,diagnosticLimit});sample();});
const timer=setInterval(sample,10000);timer.unref();
for(const signal of ['SIGTERM','SIGINT']as const)process.once(signal,()=>{clearInterval(timer);void host.close().then(()=>sample());});
