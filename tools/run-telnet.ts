// Playable host over the existing source composition. Historical diagnostic
// behavior remains available with --strict. See docs/playable-decisions.md.
import { mkdirSync,appendFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { once } from 'node:events';
import { isIP } from 'node:net';
import { createTelnetServer } from '../src/transport/server.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { reloadableSession,SessionReload } from '../src/runtime/reloadable-session.ts';
import { MAX_DIAGNOSTIC_RECORDS } from '../src/runtime/diagnostic-records.ts';
import { createGameSession } from '../src/runtime/game-session.ts';
import { DiskWordFiles } from '../src/runtime/word-files.ts';
import { createVariantContext, type VariantId } from '../src/runtime/variant.ts';
import { verifyVariantStorage } from '../src/runtime/variant-storage.ts';
import { acquireDataDirectory } from '../src/runtime/data-directory.ts';

const args=process.argv.slice(2);
if(args.includes('--help')){
  process.stdout.write('Usage: npm start -- [--bind 127.0.0.1] [--port 2323] [--variant austin|compuserve] [--data directory] [--log logs/telnet-runtime.log] [--strict] [--input-interval-ms 500] [--diagnostic-records 0..100000]\nPlayable DECWAR; localhost by default. Use --bind 0.0.0.0 or --bind :: only when external access is intended. --strict selects historical diagnostic behavior.\nSee docs/playable-decisions.md and docs/external-server.md.\n');
  process.exit(0);
}
let variant:VariantId='austin',bind='127.0.0.1',port=2323,playable=true,inputIntervalMs=500,diagnosticLimit=0,data:string|undefined,log=resolve('logs','telnet-runtime-'+new Date().toISOString().replaceAll(':','-')+'.log');
for(let i=0;i<args.length;i++){
  const option=args[i];if(option==='--strict'){playable=false;continue;}const value=args[++i];
  if(option==='--variant'&&(value==='austin'||value==='compuserve'))variant=value;
  else if(option==='--bind'&&value!==undefined&&isIP(value)!==0)bind=value;
  else if(option==='--port'&&value!==undefined&&/^\d+$/.test(value)&&Number(value)<=65535)port=Number(value);
  else if(option==='--input-interval-ms'&&value!==undefined&&/^\d+$/.test(value)&&Number(value)<=60000)inputIntervalMs=Number(value);
  else if(option==='--diagnostic-records'&&value!==undefined&&/^\d+$/.test(value)&&Number(value)<=MAX_DIAGNOSTIC_RECORDS)diagnosticLimit=Number(value);
  else if(option==='--log'&&value)log=resolve(value);
  else if(option==='--data'&&value)data=resolve(value);
  else{process.stderr.write('Invalid option or value: '+option+'\nUse --help for usage.\n');process.exit(2);}
}
data??=resolve('data',variant);
const context=createVariantContext(variant,playable?'playable':'historical-diagnostic');
mkdirSync(dirname(log),{recursive:true});
function record(event:Record<string,unknown>){appendFileSync(log,JSON.stringify({time:new Date().toISOString(),...event})+'\n');}
let releaseData:()=>void;
try{releaseData=acquireDataDirectory(data);try{verifyVariantStorage(data,variant);}catch(error){releaseData();throw error;}}catch(error){process.stderr.write(String(error)+'\n');record({event:'host-error',error:String(error)});process.exit(1);}
const worlds=new WorldDirectory(new DiskWordFiles(data),context);
const host=createTelnetServer({
  createSession(terminal,connection){
    record({event:'session-start',job:connection.id});
    return reloadableSession(()=>{
      const world=worlds.load();
      const runtime=createGameSession(terminal,'full',world,connection.id,{promptForName:true,playable,diagnosticLimit,inputIntervalMs,onInputRejected(){record({event:'input-rejected',job:connection.id});},lifecycle:{
        removeHighSegment(){worlds.remove(world);},run(){throw new SessionReload();},
      }});
      runtime.f.jobStatus.monitor.job=BigInt(connection.id);runtime.f.jobStatus.monitor.sequenceJob=BigInt(connection.id);
      return runtime.program;
    },()=>{worlds.monitor.releaseJob(connection.id);record({event:'session-reload',job:connection.id});});
  },
  onSessionEnd(id,result){
    worlds.monitor.releaseJob(id);
    record({event:'session-end',job:id,reason:result.reason,...(result.reason==='failed'?{error:result.error instanceof Error?result.error.stack:String(result.error)}:{})});
    if(result.reason==='failed')process.stderr.write(`Session ${id} stopped: ${String(result.error)}\nDetails: ${log}\n`);
  },
  onTelemetry(event){ record({event:'session-telemetry',...event}); },
});
let stopping=false;
async function stop(signal:string){
  if(stopping)return;stopping=true;record({event:'shutdown',signal});
  await host.close();releaseData();record({event:'stopped'});
}
process.on('SIGINT',()=>{void stop('SIGINT').catch(failed);});
process.on('SIGTERM',()=>{void stop('SIGTERM').catch(failed);});
function failed(error:unknown){
  process.exitCode=1;process.stderr.write(String(error)+'\n');
  record({event:'host-error',error:error instanceof Error?error.stack:String(error)});
  void host.close().then(()=>releaseData()).catch(closeError=>process.stderr.write(String(closeError)+'\n'));
}
try{
  host.server.listen(port,bind);await once(host.server,'listening');
  host.server.on('error',failed);
  const address=host.server.address();if(!address||typeof address==='string')throw new Error('Expected a TCP listener address');
  record({event:'listening',diagnosticLimit,inputIntervalMs:playable?inputIntervalMs:0,variant,source:context.definition.evidence.sourceRoot,mapSha256:context.definition.evidence.mapSha256,host:bind,port:address.port,data,profile:playable?'playable':'historical-diagnostic',limitations:playable?'docs/playable-decisions.md':'docs/running.md'});
  process.stdout.write(`DECWAR ${variant} ${playable?'playable':'historical diagnostic'} runtime: telnet ${bind} ${address.port}\nHost log: ${log}\nData: ${data}\n${playable?'Documented repairs enabled; see docs/playable-decisions.md.':'Exact historical behavior remains unresolved in some paths; see docs/running.md.'}\n`);
}catch(error){failed(error);}
