import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import { repairStatements } from '../../src/game/repair-statements.ts';
import type { RepairServices } from '../../src/game/repair-statements.ts';
import { clockRoutine } from '../../src/compat/clock-runtime.ts';
import { rawEqual } from '../../src/compat/equal.ts';
import { MemoryCommandInput } from '../../src/compat/input-memory.ts';
import { add36,multiply36,divide36,packAscii,MAX_INTEGER } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { TerminalOutput } from '../../src/compat/output.ts';
import { constants as K,messages as M } from '../../src/runtime/variant-values.ts';
import { damageRuntimeFixture } from './damage-runtime.ts';
export function repairRuntimeFixture(format:number=K.SHORT){
  const f=damageRuntimeFixture(format),locals={v:11300n,l:11301n,repsiz:11302n,ntoken:11303n,maxd:11304n,i:11305n},il=11306n,symbols={all:12500n,damage:12510n};
  f.h.put(symbols.all,'ALL');f.h.put(symbols.damage,'DAMAGE');f.m.write(il,1n);f.high.write('tim0',1000n);f.low.write('ptime',77n);
  const input=new MemoryCommandInput(f.low,packAscii),parse=(line:string)=>{input.acceptLine(line);assert.equal(input.acquire(new TerminalOutput()),true);};parse('REPAIR');
  const events:string[]=diagnosticRecords(),clock=[11000n,12000n],prepare=(words:bigint[])=>{loadArgumentBlock(f.m,10700n,words);selectArgumentBlock(f.r,10700n);};
  const clockIO={*mstime():Generator<string,void,void>{events.push('clock');assert.ok(clock.length>0);f.r.f=clock.shift()!;},*runtim():Generator<string,void,void>{assert.fail();},*sub0(w:bigint):Generator<string,void,void>{f.r.f=add36(f.r.f,-w);}};
  const io:RepairServices<string>={logical:w=>w<0n,*and(l,r){return l()&&r();},
    *integer(op,l,r){const a=yield*l(),b=yield*r();switch(op){case 'add':return add36(a,b);case 'sub':return add36(a,-b);case 'mul':return multiply36(a,b);case 'div':return divide36(a,b).quotient;case 'min':return a<b?a:b;case 'max':return a>b?a:b;}},
    *assign(d,v){const n=yield*v();f.m.write(d(),n);}, // Explicit RHS-first compiler fixture.
    *equal(t,s){events.push(s===symbols.all?'all':'damage?');prepare([t,s]);yield*rawEqual(f.r,f.rt.args,f.s.point7LeftHalf,f.eq);return f.r.f;},
    *etim(a){prepare([a]);yield*clockRoutine('etim',f.m,f.r,f.rt.args,clockIO);return f.r.f;},
    *damage(n){events.push(`damage:${n}`);f.m.write(f.stoken,n);yield*f.run();},
  }; // Required compiler arithmetic/evaluation/assignment/logical and call storage are explicit fixtures.
  return {...f,locals,damageLocals:f.locals,il,symbols,input,parse,events,clock,clockIO,io,repair:()=>repairStatements(f.high,f.low,il,locals,symbols,io)};
}
