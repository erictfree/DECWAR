import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindHonorRollRuntime } from './honor-roll-runtime.ts';
import type { bindStatisticsRuntime } from './statistics-runtime.ts';
import type { bindGetHitRuntime } from './get-hit-runtime.ts';
import { rawGripe,eraseTextShip,restoreTextShip } from '../../src/compat/gripe.ts';
import type { GripeServices } from '../../src/compat/gripe.ts';
import { writeGripeDiagnostic,octalStackOutput } from '../../src/compat/gripe-diagnostic.ts';
import { openFile,closeFile } from '../../src/compat/files.ts';
import type { OpenServices,CloseServices } from '../../src/compat/files.ts';
import { descriptorAddresses,installFileDescriptors } from '../../src/compat/file-descriptors.ts';
import { constants as K,gripeText } from '../../src/runtime/variant-values.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36,unsigned36,unpackAscii } from '../../src/compat/word36.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{honorRoll:ReturnType<typeof bindHonorRollRuntime>;statistics:ReturnType<typeof bindStatisticsRuntime>;getHit:ReturnType<typeof bindGetHitRuntime>};
export function bindGripeRuntime(f:Host){
  f.m.map(40000n,Array<bigint>(2000).fill(0n));f.m.map(60000n,Array<bigint>(10000).fill(0n));f.job.jbff=60000n;f.job.jbrel=69999n;
  const descriptors=descriptorAddresses(40100n),block=f.editor.runtime.block,labels=gripeText.map((_,i)=>40400n+BigInt(i*40)),statsArgument=40010n;
  gripeText.forEach((item,i)=>f.h.put(labels[i],item.text));f.m.write(statsArgument,40011n);f.m.write(40011n,1n);
  const relocation:Record<string,bigint>={'.fored':1n,'.fowrt':2n,'.fosau':3n,'.iodmp':0n,'.ioasc':0n,'uu.phs':0n,'io.lem':0n,
    'ochr.b':201n,'ichr.t':f.editor.terminalTarget,'ichr.b':f.ini.symbols.bufferedTarget,'iich.':f.ini.symbols.iniTarget,'ogch.':202n,
    tobuf:40060n,tobcb:40050n,dibuf:f.file.address('dibuf',0),dbuf:f.file.address('dbuf',0),stabuf:f.file.address('stabuf',0)};
  installFileDescriptors(f.m,key=>{assert.ok(key in relocation,'required descriptor symbol '+key);return relocation[key];},40100n);
  f.m.write(40050n,40060n);f.m.write(40051n,halfWords(0o440700n,40060n));f.m.write(40052n,80n);
  const s={grpfil:descriptors.grpfil,ttyfil:descriptors.ttyfil,separator:labels[8],linbuf:f.input.lineAddress,...f.s.gripe,fileBusyCode:23n,
    shpcon:f.high.address('shpcon',1,1),alive:f.high.address('alive',1),active:f.high.address('active',1),prompt:labels[1],onlyTwo:labels[2],tooMany:labels[3],linePointer:halfWords(0o444400n,f.input.lineAddress),statisticsArgument:statsArgument};
  // The selected terminal sink needs its remembered descriptor for SETO's
  // swaps during line-limit warnings. Startup/monitor initialization is a
  // fixture boundary; GRIPE itself does not initialize OBFLB.
  block.write('obflb',s.ttyfil);
  const state={get who(){return f.low.read('who');},get hungup(){return f.low.read('hungup');},get addrck(){return f.low.read('addrck');},get ccflg(){return f.low.read('ccflg');},set ccflg(w:bigint){f.low.write('ccflg',w);}};
  // Header identity now points at actual COMMON/JOBSTA words. These fixtures
  // still supply the monitor's UNDAT/UNTIM strings; no host clock is inferred.
  for(const key of ['versio','gameno','blhopt','romopt'] as const)Object.defineProperty(f.state,key,{get:()=>f.high.read(key),set:(w:bigint)=>f.high.write(key,w)});
  for(const [key,col] of [['name1',K.KNAM1],['name2',K.KNAM2],['speed',K.KTTYSP],['ppn',K.KPPN],['tty',K.KTTYN],['job',K.KJOB]] as const)f.s.status.player[key]=f.high.address('job',1,col);
  for(const [key,offset] of [['job',0],['name1',1],['name2',2],['ppn',3],['tty',4],['speed',5]] as const)f.s.status.pregame[key]=BigInt(localLayout.local.address+offset);
  const deposit=f.cpu.idpb;f.cpu.idpb=(c,a)=>{
    if(a!==f.file.address('dbuf',0)+s.bufferPointerOffset){deposit(c,a);return;}
    const w=unsigned36(f.m.read(a));assert.equal((w>>24n)&63n,7n);assert.equal((w>>18n)&63n,0n);
    let pos=(w>>30n)&63n,address=rightHalf(w);if(pos<7n){pos=36n;address=rightHalf(address+1n);}pos-=7n;
    f.m.write(a,(w&~((63n<<30n)|0o777777n))|(pos<<30n)|address);f.m.write(address,(unsigned36(f.m.read(address))&~(127n<<pos))|((c&127n)<<pos));
  }; // Ordinary nonindexed 7-bit IDPB selected explicitly for the log buffer.
  const events:string[]=diagnosticRecords(),disk:bigint[]=[],writes:bigint[][]=diagnosticRecords(),openResults:{success:boolean;error?:bigint}[]=[],monitor={inputError:false,outputError:false,hiberSkip:true,coreSuccess:true};
  const jobState={get jbff(){return f.job.jbff;},set jbff(w:bigint){f.job.jbff=w;},get jbrel(){return f.job.jbrel;},set jbrel(w:bigint){f.job.jbrel=w;},get hungup(){return state.hungup;}};
  const openIO:OpenServices<string>={...f.statistics.openIO,*filop(){events.push('filop');const result=openResults.shift()??{success:true};if(!result.success){f.file.write('leblk',result.error??1n,1);return false;}f.file.write('leblk',disk.length?halfWords(-BigInt(disk.length),0n):0n,3);return true;}};
  const closeIO:CloseServices<string>={...f.ini.closeIO,*executeClose(){events.push('close-instruction');},*core(w:bigint){events.push('close-core:'+w);f.job.jbrel=w;return true;}};
  const grow=f.cpu.core;f.cpu.core=function*(){if(rightHalf(block.read('obflb'))!==s.grpfil)return yield*grow();events.push('grow:'+f.r.t3);assert.ok(f.r.t3<70000n,'scheduled fixture core region');if(monitor.coreSuccess)f.job.jbrel=f.r.t3;return monitor.coreSuccess;};
  const io:GripeServices<string>={
    *afterAlertCheck(){events.push('alert-return');}, // Explicit literal continuation.
    *eshp(){events.push('eshp');yield*eraseTextShip(f.file,state,f.r,s,()=>f.rawBoard.internal('sdsp'));},
    *pshp(){events.push('pshp');yield*restoreTextShip(f.file,state,f.r,s,()=>f.rawBoard.internal('sdsp'));},
    *osts(){events.push('header');yield*f.rt.run('osts.');},*inli(){events.push('inli');yield*f.editor.run();},
    *ostrx(){events.push('ostrx');yield*f.rt.run('ostr.x');},*ostr(){events.push('ostr:'+f.r.p1);yield*f.rt.run('ostr.');},*ocrl(){yield*f.rt.run('ocrl.');},
    *seto(){events.push('seto');yield*f.rt.run('seto.');},
    *shosta(){events.push('shosta');yield*f.honorRoll.call('shosta');}, // Preserve GRIP.Z's actual ARG.
    *diagnostic(){events.push('diagnostic');const d={...diagnosticOutput,*octal(){yield*octalStackOutput(f.m,{...f.rt.stack,ochr:diagnosticOutput.ochr});}};yield*writeGripeDiagnostic(f.m,{linbuf:s.linbuf,stabuf:f.file.address('stabuf',0),pdl:6100n,
      loktab:f.locks.address('loktab',0),header:labels[4],pdlLabel:labels[5],hitLabel:labels[6],lockLabel:labels[7],...diagnosticSymbols},d);},
    *open(){events.push('open');yield*f.cpu.pushP(1000n);const ok=yield*openFile(f.file,jobState,f.r,openIO);assert.equal(yield*f.cpu.popP(),ok?1001n:1000n);return ok;},
    *hibernate(){events.push('hibernate:'+f.r.t1);yield 'gripe-hibernate';return monitor.hiberSkip;},*halt(){throw new Error('required HIBER HALT continuation');},
    *core(){events.push('read-core:'+f.r.t1);assert.ok(f.r.t1<70000n,'scheduled fixture core region');if(monitor.coreSuccess)f.job.jbrel=f.r.t1;return monitor.coreSuccess;},
    *input(a){events.push('input');if(monitor.inputError)return true;const w=f.m.read(a),start=rightHalf(w)+1n,count=Number(-BigInt.asIntN(18,leftHalf(w)));assert.equal(count,disk.length);disk.forEach((v,i)=>f.m.write(start+BigInt(i),v));return false;},
    *output(a){events.push('output');if(monitor.outputError)return true;const w=f.m.read(a),start=rightHalf(w)+1n,count=Number(-BigInt.asIntN(18,leftHalf(w)));const words=Array.from({length:count},(_,i)=>f.m.read(start+BigInt(i)));writes.push(words);disk.splice(0,disk.length,...words);return false;},
    *useto(n){events.push('useto:'+n);},*close(){events.push('close');yield*closeFile(f.file,jobState,f.r,closeIO);},
    *outputTTY(){events.push('flush');yield*f.ini.controlIO.output();},*outstr(text){events.push('direct');f.h.put(41200n,text);yield*f.editor.io.outstr(41200n);},
  };
  const diagnosticSymbols={hitql:f.getHit.queues.address('hitql')},diagnosticOutput={*ochr(){yield*f.rt.run('ochr.');},*ostr(){yield*f.rt.run('ostr.');},*space(){yield*f.rt.run('ospc.');},*crlf(){yield*f.rt.run('ocrl.');}};
  const text=()=>disk.flatMap(w=>unpackAscii(w)).join('');
  return {symbols:s,state,events,io,openIO,closeIO,openResults,monitor,disk,writes,text,diagnosticSymbols,run:()=>rawGripe(f.file,state,f.job,f.r,s,io)};
}
