import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindGripeRuntime } from './gripe-runtime.ts';
import type { bindGetCommandRuntime } from './get-command-runtime.ts';
import type { bindTellRuntime } from './tell-runtime.ts';
import type { bindEndgameRuntime } from './endgame-runtime.ts';
import { interceptApr,setAprTrap } from '../../src/compat/apr.ts';
import type { AprServices } from '../../src/compat/apr.ts';
import { decwarExitStatements } from '../../src/game/fatal-statements.ts';
import type { DecwarExitLocals,DecwarExitServices } from '../../src/game/fatal-statements.ts';
import { decwarText } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from '../../src/compat/word36.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{gripe:ReturnType<typeof bindGripeRuntime>;getCommand:ReturnType<typeof bindGetCommandRuntime>;tell:ReturnType<typeof bindTellRuntime>;endgame:ReturnType<typeof bindEndgameRuntime>};
export function bindAprRuntime(f:Host){
  f.m.map(42400n,Array<bigint>(1600).fill(0n));
  const locals={} as DecwarExitLocals;for(const [i,key] of (['i','txppn','txnm1','txnm2','txsh1','txsh2','txtim','txwhy','txtem','txtot'] as const).entries()){locals[key]=42400n+BigInt(i);f.m.write(locals[key],77n);}
  const header=42420n,lines=42440n,fatalTarget=42450n,trapInstruction=42451n,fallback=42452n,events:string[]=diagnosticRecords(),labels=new Map<number,bigint>();
  let a=42500n;for(const group of decwarText.fatal)for(const item of group){labels.set(item.line,a);f.h.put(a,item.text);a+=20n;}
  f.m.write(fallback,42453n);f.m.write(42453n,5n);f.m.write(trapInstruction,0o254000012345n);
  const symbols={emergencyPushdownInitial:signed36(halfWords(-40n,f.file.address('stabuf',128)-1n)),dataStackInitial:f.s.initialStackWord,
    normalPushdownInitial:signed36(halfWords(-40n,6099n)),fallbackArgument:fallback};
  const state={get addrck(){return f.low.read('addrck');},set addrck(w:bigint){f.low.write('addrck',w);}},job={jbtpc:trapInstruction};
  const numeric=f.weapon.io,exitIO:DecwarExitServices<string>={logical:numeric.logical,*assign(...args){yield*numeric.assign(...args);},*binary(...args){return yield*numeric.binary(...args);},
    *crlf(){events.push('crlf');yield*f.rt.run('crlf');},*iran(n){events.push('iran:'+n);return yield*f.tell.random.iran(BigInt(n));},
    *out(item){events.push('out:'+item.line);f.m.write(lines,BigInt(item.newline));loadArgumentBlock(f.m,header,[labels.get(item.line)!,lines]);selectArgumentBlock(f.r,header);yield*f.rt.run('out');},
    *cctrap(){events.push('cctrap');yield*f.getCommand.io.cctrap();},*etim(start){events.push('etim');return yield*f.endgame.io.etim(start);},
    *points(final){events.push('points');yield*f.endgame.io.points(final);},*updsta(actuals){events.push('updsta');yield*f.endgame.io.updsta(actuals);},
    *free(who){events.push('free');yield*f.getCommand.io.free(who);},*exit(){events.push('exit');yield*f.endgame.io.exit();},
  };
  function* leave(entry:'fatal'|'leave'='fatal'){yield*decwarExitStatements(entry,f.high,f.low,locals,f.endgame.total,exitIO);}
  const io:AprServices<string>={
    *blt(ac,end){events.push('capture');let from=leftHalf(f.m.read(ac)),to=rightHalf(f.m.read(ac));assert.equal(ac,0n);assert.equal(from,1n);assert.equal(to,f.file.address('stabuf',3));
      while(to<=end)f.m.write(to++,f.m.read(from++));f.m.write(ac,signed36(halfWords(from,to)));}, // Declared ordinary BLT fixture, including AC0 result.
    *gripe(){events.push('gripe');yield*f.cpu.pushP(1000n);yield*f.gripe.run();assert.equal(yield*f.cpu.popP(),1000n);},
    *jump(address){events.push('jump:'+address);if(address!==fatalTarget)throw new Error('required APR target '+address);yield*leave();throw new Error('DECWAR EXIT unexpectedly returned');},
    *outstrIndirect(address){events.push('fallback:'+address);const target=yield*f.cpu.indirectAddress(address);yield*f.editor.io.outstr(target);},
    *monit(){events.push('monit');throw new Error('fixture MONIT transfer');},
  };
  return {locals,header,lines,labels,fatalTarget,trapInstruction,symbols,state,job,events,io,exitIO,leave,
    install:(address=fatalTarget)=>setAprTrap(f.locks,()=>address),run:()=>interceptApr(f.file,f.locks,state,job,symbols,io)};
}
