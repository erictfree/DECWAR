import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindStatisticsRuntime } from './statistics-runtime.ts';
import { honorRollRuntime,statisticsDateRuntime } from '../../src/compat/honor-roll-runtime.ts';
import type { HonorRollEntry,HonorRollRuntimeServices } from '../../src/compat/honor-roll-runtime.ts';
import { honorRollText } from '../../src/runtime/variant-values.ts';
import { add36,packSixbit } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{statistics:ReturnType<typeof bindStatisticsRuntime>};
export function bindHonorRollRuntime(f:Host){
  f.m.map(39000n,Array<bigint>(1000).fill(0n));const stats=f.statistics,header=39010n,argument=39020n;
  const s={day:39000n,month:39001n,year:39002n,stabuf:stats.symbols.stabuf,staiow:stats.symbols.staiow,frebie:stats.symbols.frebie,hungup:f.low.address('hungup'),ccflg:f.low.address('ccflg'),terwid:f.low.address('terwid'),leName:f.file.address('le.nam'),freeLabelLiteral:39021n,freeContinueLiteral:39021n,knstat:10n,
    openLiterals:stats.symbols.openLiterals,text:honorRollText.map((_,i)=>39100n+BigInt(i*32))};
  // Explicit pooled-literal fixture; the runtime also permits distinct sites.
  f.m.write(s.freeLabelLiteral,packSixbit('DECWAF'));honorRollText.forEach((item,i)=>f.h.put(s.text[i],item.text));
  const events:string[]=diagnosticRecords(),io:HonorRollRuntimeServices<string>={
    *pushData(w){yield*f.rt.stack.pushData(w);},*popData(){return yield*f.rt.stack.popData();},
    *open(){return yield*stats.io.open();},*inputSTA(d){yield*stats.io.inputSTA(d);},*closeSTA(){yield*stats.io.closeSTA();},*outputTTY(){events.push('flush');yield*stats.io.outputTTY();},
    *ostr(){events.push('ostr:'+f.r.p1);yield*f.rt.run('ostr.');},*ochr(){events.push('ochr:'+f.r.c);yield*f.rt.run('ochr.');},*osix(){events.push('osix');yield*f.rt.run('osix.');},*space(){events.push('space');yield*f.rt.run('ospc.');},
    *ooct(){events.push('ooct:'+f.r.x1);yield*f.rt.run('ooct.');},*odec(){events.push('odec:'+f.r.x1);yield*f.rt.run('odec.');},*ostbx(){events.push('ostbx');yield*f.rt.run('ostbx.');},*o2dg(){events.push('o2dg:'+f.r.x1);yield*f.rt.run('o2dg.');},*crlf(){events.push('crlf');yield*f.rt.run('crlf');},
    *call(entry){events.push(entry);yield*call(entry);},
    *idivi(reg,n){events.push(`idivi:${reg}:${n}`);yield*f.cpu.idivi(reg,n);},*addi(reg,n){f.r[reg]=add36(f.r[reg],n);},*subi(reg,n){f.r[reg]=add36(f.r[reg],-n);},
    *aojlX2(){f.r.x2=add36(f.r.x2,1n);return f.r.x2<0n;},*aosX3(){f.r.x3=add36(f.r.x3,1n);},
    *continuation(site){events.push(site);}, // Explicit continuation-after-literal fixture.
  };
  function* call(entry:HonorRollEntry):Generator<string,void,void>{yield*f.cpu.pushP(1000n);yield*honorRollRuntime(entry,f.m,f.r,f.rt.args,s,io);assert.equal(yield*f.cpu.popP(),1000n);}
  const run=(entry:HonorRollEntry='shosta',actual=argument)=>{loadArgumentBlock(f.m,header,[actual]);selectArgumentBlock(f.r,header);return call(entry);};
  return {symbols:s,header,argument,events,io,run,call,date:()=>statisticsDateRuntime(f.m,f.r,s,io)};
}
