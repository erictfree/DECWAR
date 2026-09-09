import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindBlockRuntime } from './block-runtime.ts';
import { freeStatements } from '../../src/game/free-statements.ts';
import type { FreeStatementServices } from '../../src/game/free-statements.ts';
import { killedSearchStatements } from '../../src/game/killed-search-statements.ts';
import { WordBlock } from '../../src/compat/memory.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { clockRoutine } from '../../src/compat/clock-runtime.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { signed36 } from '../../src/compat/word36.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{block:ReturnType<typeof bindBlockRuntime>};
export function bindFreeRuntime(f:Host){
  f.m.map(25400n,Array<bigint>(400).fill(0n));f.m.map(BigInt(localLayout.savedShip.address),Array<bigint>(localLayout.savedShip.words).fill(0n));
  const fr=new WordBlock(f.m,localLayout.savedShip),locals={tteam:25400n,d:25401n,kindex:25402n,i:25403n},searchLocals={i:25405n,ii:25406n},snum=25410n,header=25420n,zero=25430n;
  f.m.write(snum,1n);for(const a of Object.values(locals))f.m.write(a,77n);const numeric=f.weapon.io,events:string[]=diagnosticRecords();
  const prepare=(args:bigint[])=>{loadArgumentBlock(f.m,header,args);selectArgumentBlock(f.r,header);};
  const searchIO={assign:numeric.assign,and:numeric.and,compare:numeric.compare,*bounds(s:Parameters<typeof f.location.io.bounds>[0],l:Parameters<typeof f.location.io.bounds>[1]){return yield*f.location.io.bounds(s,l,1);},enterLoop:(s:bigint,l:bigint)=>f.location.io.enterLoop(s,l,1)};
  const io:FreeStatementServices<string>={logical:numeric.logical,not:w=>!numeric.logical(w),
    *assign(...a){yield*numeric.assign(...a);},*binary(...a){return yield*numeric.binary(...a);},*and(...p){return yield*numeric.and(...p);},
    *integerOr(a,b){return signed36((yield*a.evaluate())|(yield*b.evaluate()));},*bounds(...a){return yield*searchIO.bounds(...a);},enterLoop:searchIO.enterLoop,
    *assignAliveOne(d){f.m.write(d(),1n);},
    *lock(a){events.push('lock');yield*f.io.lock(a);},*unlock(a){events.push('unlock');yield*f.io.unlock(a);},
    *setdsp(v,h,z){events.push('setdsp');f.m.write(zero,BigInt(z));prepare([v,h,zero]);yield*f.rawBoard.run('setdsp');},
    *daytim(d){events.push('daytim');prepare([d]);yield*clockRoutine('daytim',f.m,f.r,f.rt.args,f.clockIO);return f.r.f;},
    *trcoff(){throw new Error('fixture requires TRCOFF');},
    *kqsrch(tty,job,ppn,index){events.push('kqsrch');yield*killedSearchStatements(f.high,{tty,job,ppn,index},searchLocals,searchIO);},
    *gethit(){throw new Error('fixture requires GETHIT');},*getmsg(){throw new Error('fixture requires GETMSG');},
    *blkset(a,z,n){events.push('blkset');f.m.write(f.block.symbols.value,BigInt(z));f.m.write(f.block.symbols.count,BigInt(n));yield*f.block.run('blkset',[a,f.block.symbols.value,f.block.symbols.count]);},
  };
  return {fr,locals,searchLocals,searchIO,snum,events,io,run:(actual=snum)=>freeStatements(f.high,f.low,fr,actual,locals,io)};
}
