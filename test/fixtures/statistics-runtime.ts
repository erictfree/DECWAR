import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindEndgameRuntime } from './endgame-runtime.ts';
import { statisticsRuntime } from '../../src/compat/statistics-runtime.ts';
import type { StatisticsEntry,StatisticsRuntimeServices } from '../../src/compat/statistics-runtime.ts';
import { openFile } from '../../src/compat/files.ts';
import type { OpenServices } from '../../src/compat/files.ts';
import { descriptorAddresses,installFileDescriptors } from '../../src/compat/file-descriptors.ts';
import { acquireLock } from '../../src/compat/lock.ts';
import { releaseLock } from '../../src/compat/unlock.ts';
import { statisticsText,commissionText,outputTables } from '../../src/generated/source-data.ts';
import { add36,halfWords,MIN_INTEGER,rightHalf } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{endgame:ReturnType<typeof bindEndgameRuntime>};
type Key='stared'|'staupd'|'stfred'|'stfupd';
export function bindStatisticsRuntime(f:Host){
  f.m.map(37000n,Array<bigint>(2000).fill(0n));
  const header=37080n,actuals=Array.from({length:10},(_,i)=>37900n+BigInt(i)),stabuf=f.file.address('stabuf',0),descriptors=descriptorAddresses(38200n);
  const s={stabuf,staend:stabuf+639n,stacap:stabuf+512n,stakil:stabuf+522n,staiow:stabuf+640n,stfiow:stabuf+642n,
    stared:descriptors.stared,staupd:descriptors.staupd,stfred:descriptors.stfred,stfupd:descriptors.stfupd,lePpn:f.file.address('le.ppn'),lkfail:f.low.address('lkfail'),hungup:f.low.address('hungup'),frebie:f.locks.address('frebie'),gameno:f.high.address('gameno'),lngshp:37700n,knstat:10n,
    clearLiteral:37610n,openLiterals:{stared:37600n,staupd:37601n,stfred:37602n,stfupd:37603n},statisticsText:statisticsText.map((_,i)=>37100n+BigInt(i*32)),commissionText:commissionText.map((_,i)=>37450n+BigInt(i*32))};
  f.symbols.staupd=s.staupd;
  f.m.write(s.clearLiteral,halfWords(stabuf,stabuf+1n));
  for(const d of [s.staiow,s.stfiow]){f.m.write(d,halfWords(-640n,stabuf-1n));f.m.write(d+1n,0n);}
  // Extracted descriptor words retain source channel 6, protection and PPN.
  // Missing monitor symbols are explicit fixture values. Other installed file
  // blocks are unused here; their entry points are not rebound into the host.
  const relocation:Record<string,bigint>={'.fored':1n,'.fowrt':2n,'.fosau':3n,'.iodmp':0n,'.ioasc':0n,'uu.phs':0n,'io.lem':0n,
    'ochr.b':201n,'ichr.t':f.editor.terminalTarget,'ichr.b':f.ini.symbols.bufferedTarget,'iich.':f.ini.symbols.iniTarget,'ogch.':202n,
    tobuf:18010n,tobcb:18020n,dibuf:f.file.address('dibuf',0),dbuf:f.file.address('dbuf',0),stabuf};
  installFileDescriptors(f.m,key=>{assert.ok(key in relocation,'required descriptor symbol '+key);return relocation[key];},38200n);
  for(const key of ['stared','staupd','stfred','stfupd'] as const)f.m.write(s.openLiterals[key],halfWords(s[key],s[key]));
  statisticsText.forEach((item,i)=>f.h.put(s.statisticsText[i],item.text));commissionText.forEach((item,i)=>f.h.put(s.commissionText[i],item.text));
  outputTables.lngshp.forEach((item,i)=>{const a=37800n+BigInt(i*8);f.m.write(s.lngshp+BigInt(i),a);f.h.put(a,item.text);});
  const events:string[]=[],files={stared:Array<bigint>(640).fill(0n),stfred:Array<bigint>(640).fill(0n)},writes:{key:Key;descriptor:bigint;words:bigint[]}[]=[],opens:Partial<Record<Key,{success:boolean;lePpn:bigint}>>={},date={value:123456n};
  let selected:Key='stared';
  const fileState={get jbff(){return f.job.jbff;},set jbff(w:bigint){f.job.jbff=w;},get jbrel(){return f.job.jbrel;},set jbrel(w:bigint){f.job.jbrel=w;},get hungup(){return f.low.read('hungup');}};
  const openIO:OpenServices<string>={...f.news.openIO,
    *filop(){events.push('filop:'+selected);const result=opens[selected]??{success:true,lePpn:-1n};f.file.write('le.ppn',result.lePpn);return result.success;},
    successReturn(){f.m.write(rightHalf(f.r.p),add36(f.m.read(rightHalf(f.r.p)),1n));},
  };
  const io:StatisticsRuntimeServices<string>={
    *pushData(w){yield*f.rt.stack.pushData(w);},*popData(){return yield*f.rt.stack.popData();},
    *lock(){events.push('lock');yield*acquireLock(f.locks,f.lockState,f.r,f.symbols,f.lockIO);},
    *unlo(){events.push('unlo');yield*releaseLock(f.locks,f.lockState,f.r,f.symbols,f.unlockIO);},
    *open(){selected=(['stared','staupd','stfred','stfupd'] as const).find(k=>s[k]===rightHalf(f.r.x1))!;assert.ok(selected,'relocated statistics descriptor');events.push('open:'+selected);
      yield*f.cpu.pushP(1000n);const success=yield*openFile(f.file,fileState,f.r,openIO);assert.equal(yield*f.cpu.popP(),success?1001n:1000n);return success;},
    *inputSTA(d){events.push('input:'+d);const file=selected.startsWith('stf')?files.stfred:files.stared;file.forEach((w,i)=>f.m.write(stabuf+BigInt(i),w));},
    *outputSTA(d){events.push('output:'+d);const words=Array.from({length:640},(_,i)=>f.m.read(stabuf+BigInt(i)));writes.push({key:selected,descriptor:d,words});const file=selected.startsWith('stf')?files.stfred:files.stared;file.splice(0,640,...words);},
    *closeSTA(){events.push('close');}, // Direct monitor CLOSE STA, not CLOSE.
    *outputTTY(){events.push('flush');yield*f.ini.controlIO.output();},
    *outstr(a){events.push('text:'+a);yield*f.editor.io.outstr(a);},*indirectAddress(a){return yield*f.cpu.indirectAddress(a);},
    *odec(){events.push('odec:'+f.r.x1);yield*f.rt.run('odec.');},*dateT3(){events.push('date');f.r.t3=date.value;},
    *bltT1(a){events.push('blt');yield*f.cpu.blt(a);},
    *aos(reg,a){const w=add36(f.m.read(a),1n);f.m.write(a,w);if(reg)f.r[reg]=w;},*sosX1(){f.r.x1=add36(f.r.x1,-1n);},
    *addi(reg,n){f.r[reg]=add36(f.r[reg],n);},*subiT1(n){f.r.t1=add36(f.r.t1,-n);},*movmX1(){assert.notEqual(f.r.t1,MIN_INTEGER,'MOVM overflow requires CPU policy');f.r.x1=f.r.t1<0n?-f.r.t1:f.r.t1;},
    *sojgT1(){f.r.t1=add36(f.r.t1,-1n);return f.r.t1>0n;},*sojaT4(){f.r.t4=add36(f.r.t4,-1n);},
    *continuation(site){events.push(site);}, // Explicit continuation-after-literal fixture; not assembler proof.
  };
  const call=(entry:StatisticsEntry)=>statisticsRuntime(entry,f.m,f.r,f.rt.args,s,io);
  const run=(entry:StatisticsEntry,addresses:readonly bigint[]=entry==='updcap'?[actuals[9]]:actuals)=>{loadArgumentBlock(f.m,header,addresses);selectArgumentBlock(f.r,header);return call(entry);};
  f.endgame.io.updsta=a=>run('updsta',a);
  return {symbols:s,header,actuals,files,writes,opens,date,events,io,openIO,call,run,buffer:()=>Array.from({length:640},(_,i)=>f.m.read(stabuf+BigInt(i)))};
}
