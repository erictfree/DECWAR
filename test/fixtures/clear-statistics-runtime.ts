import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindStatisticsRuntime } from './statistics-runtime.ts';
import type { bindGripeRuntime } from './gripe-runtime.ts';
import { clearStatisticsRuntime } from '../../src/compat/clear-statistics-runtime.ts';
import type { ClearStatisticsRuntimeServices } from '../../src/compat/clear-statistics-runtime.ts';
import { clearStatisticsText } from '../../src/runtime/variant-values.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{statistics:ReturnType<typeof bindStatisticsRuntime>;gripe:ReturnType<typeof bindGripeRuntime>};
export function bindClearStatisticsRuntime(f:Host){
  f.m.map(42000n,Array<bigint>(400).fill(0n));const stats=f.statistics,s={stabuf:stats.symbols.stabuf,staiow:stats.symbols.staiow,lkfail:f.low.address('lkfail'),addrck:f.low.address('addrck'),normalLiteral:stats.symbols.openLiterals.staupd,freeLiteral:stats.symbols.openLiterals.stfupd,text:clearStatisticsText.map((_,i)=>42100n+BigInt(i*32))};
  clearStatisticsText.forEach((item,i)=>f.h.put(s.text[i],item.text));const events:string[]=diagnosticRecords(),io:ClearStatisticsRuntimeServices<string>={
    *outstr(a){events.push('outstr:'+a);yield*stats.io.outstr(a);},*lock(){events.push('lock');yield*stats.io.lock();},*unlo(){events.push('unlo');yield*stats.io.unlo();},
    *gripe(){events.push('gripe');yield*f.cpu.pushP(1000n);yield*f.gripe.run();assert.equal(yield*f.cpu.popP(),1000n);},
    *sojgT1(){return yield*stats.io.sojgT1();},*open(){events.push('open');return yield*stats.io.open();},*outputSTA(d){events.push('output');yield*stats.io.outputSTA(d);},*closeSTA(){events.push('close');yield*stats.io.closeSTA();},
  };
  return {symbols:s,events,io,run:()=>clearStatisticsRuntime(f.m,f.r,s,io)};
}
