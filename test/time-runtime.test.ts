import test from 'node:test';
import assert from 'node:assert/strict';
import { clockRoutine } from '../src/compat/clock-runtime.ts';
import type { ClockServices } from '../src/compat/clock-runtime.ts';
import { timeStatements } from '../src/game/time-command.ts';
import type { TimeStatementServices,TimeHeading } from '../src/game/time-command.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { CommonBlock } from '../src/compat/memory.ts';
import { commonLayout } from '../src/generated/common-layout.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { add36,packAscii } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { outputRuntimeFixture } from './fixtures/output-runtime.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(who=1n){
  const f=outputRuntimeFixture();for(const l of [commonLayout.lowseg,commonLayout.hiseg])f.m.map(BigInt(l.address),Array<bigint>(l.words).fill(0n));f.m.map(10000n,Array<bigint>(2000).fill(0n));
  const high=new CommonBlock(f.m,'hiseg'),low=new CommonBlock(f.m,'lowseg');low.write('who',who);high.write('tim0',1000n);high.write('job',2000n,1,K.KJOBTM);high.write('job',1000n,1,K.KRUNTM);
  for(const key of ['who','hcpos','blank','hungup','oflg'] as const)Object.defineProperty(f.state,key,{get:()=>low.read(key),set:(v:bigint)=>low.write(key,v)});
  const headings:TimeHeading[]=['time01','time02','time03','time04','time05'],blocks={} as Record<TimeHeading,bigint>;
  headings.forEach((name,i)=>{const text=M[name].text,address=10000n+BigInt(i*50),header=10500n+BigInt(i*4);for(let j=0;j<=text.length;j+=5)f.m.write(address+BigInt(j/5),packAscii(text.slice(j,j+5)));
    loadArgumentBlock(f.m,header,[address,11000n]);blocks[name]=header;});
  const days=who===0n?[10000n,3661999n]:[10000n,12000n,3661999n],runs=who===0n?[7000n]:[5000n,7000n],events:string[]=[],subtractions:bigint[]=[];
  const monitor:ClockServices<string>={*mstime(){events.push('day');yield 'clock';assert.ok(days.length);f.r.f=days.shift()!;},
    *runtim(){assert.equal(f.r.f,0n);events.push('run');yield 'clock';assert.ok(runs.length);f.r.f=runs.shift()!;},
    *sub0(word){subtractions.push(word);f.r.f=add36(f.r.f,-word);}};
  // Explicit compiled-call/temporary fixture: these addresses are not inferred compiler defaults.
  function* clock(entry:'etim'|'daytim'|'runtim',address:bigint):Generator<string,bigint,void>{loadArgumentBlock(f.m,10600n,[address]);selectArgumentBlock(f.r,10600n);yield*clockRoutine(entry,f.m,f.r,f.rt.args,monitor);return f.r.f;}
  const io:TimeStatementServices<string>={
    *out(name){events.push(name);selectArgumentBlock(f.r,blocks[name]);yield*f.rt.run('out');},
    *otim(value){f.m.write(11001n,value);loadArgumentBlock(f.m,10610n,[11001n]);selectArgumentBlock(f.r,10610n);yield*f.rt.run('otim');},
    *crlf(){yield*f.rt.run('crlf');},*etim(address){return yield*clock('etim',address);},
    *runtim(){return yield*clock('runtim',11002n);},*daytim(){return yield*clock('daytim',11002n);},
    *runtimeDifference(runtime,started){const result=yield*runtime();return add36(result,-started());}, // Explicit left-operand-first compiler fixture.
  };
  return {...f,high,low,blocks,days,runs,events,subtractions,monitor,clock,io,run:()=>timeStatements(high,low,io)};
}
test('TIME command dispatch composes live COMMON, raw clocks, source arguments and output runtime',()=>{
  const f=fixture();const ctx={who:1,player:-1n,ptime:55n,shared:{players:[{alive:0n},{alive:-1n}]}};
  done(dispatchCommand(ctx,27,{*invoke(call){assert.equal(call.routine,'time');yield*f.run();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},*finishTurn(){assert.fail();},movementContinuation(){assert.fail();}}));
  assert.equal(f.text(),"\r\nGame's elapsed time:  00:00:09\r\nShip's elapsed time:  00:00:10\r\nRun time in game:     00:00:04\r\nJob's total run time: 00:00:07\r\nCurrent time of day:  01:01:01\r\n");
  assert.deepEqual(f.events,['time01','day','time02','day','time03','run','time04','run','time05','day']);assert.equal(ctx.ptime,55n);assert.equal(f.m.read(11002n),3661999n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('pre-game TIME skips ship calls while retaining RUNTIM/DAYTIM argument writes',()=>{
  const f=fixture(0n);done(f.run());assert.deepEqual(f.events,['time01','day','time04','run','time05','day']);
  assert.equal(f.text(),"\r\nGame's elapsed time:  00:00:09\r\nJob's total run time: 00:00:07\r\nCurrent time of day:  01:01:01\r\n");assert.equal(f.m.read(11002n),3661999n);
});
test('TIME finishes a suspended heading before reading a clock or ETIM start value',()=>{
  const f=fixture(0n);f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'output';};const g=f.run();assert.equal(g.next().value,'output');assert.deepEqual(f.events,['time01']);
  f.high.write('tim0',5000n);done(g);assert.ok(f.text().includes("Game's elapsed time:  00:00:05"));
});
test('TIME checks current WHO after game-time output before selecting the ship path',()=>{
  const f=fixture(0n),otim=f.io.otim;let first=true;f.days.splice(0,f.days.length,10000n,12000n,3661999n);f.runs.splice(0,f.runs.length,5000n,7000n);
  f.io.otim=function*(v){yield*otim(v);if(first){first=false;f.low.write('who',1n);}};done(f.run());assert.ok(f.text().includes("Ship's elapsed time"));
});
test('TIME chooses the ship start address after its heading, even if WHO becomes zero',()=>{
  const f=fixture(),out=f.io.out;f.high.write('job',3000n,0,K.KJOBTM);f.io.out=function*(name){yield*out(name);if(name==='time02')f.low.write('who',0n);};
  done(f.run());assert.ok(f.text().includes("Ship's elapsed time:  00:00:09"));
});
for(const order of ['runtime-first','job-first'] as const)test(`TIME leaves RUNTIM-minus-JOB evaluation to ${order} compiler fixture`,()=>{
  const f=fixture(),runtime=f.monitor.runtim;let first=true;f.monitor.runtim=function*(){yield*runtime();if(first){first=false;f.high.write('job',3000n,1,K.KRUNTM);}};
  if(order==='job-first')f.io.runtimeDifference=function*(runtime,started){const start=started();return add36(yield*runtime(),-start);};
  done(f.run());assert.ok(f.text().includes('Run time in game:     '+(order==='runtime-first'?'00:00:02':'00:00:04')));
});
test('DAYTIM writes to the current argument after MSTIME suspension',()=>{
  const f=fixture();f.days.splice(0,f.days.length,12345n);const g=f.clock('daytim',11002n);assert.equal(g.next().value,'clock');
  loadArgumentBlock(f.m,10620n,[11003n]);selectArgumentBlock(f.r,10620n);done(g);assert.equal(f.m.read(11002n),0n);assert.equal(f.m.read(11003n),12345n);assert.equal(f.r.t0,12345n);
});
test('RUNTIM clears AC0 before the monitor and writes its result through ARG',()=>{
  const f=fixture();f.r.f=77n;f.runs.splice(0,f.runs.length,54321n);const g=f.clock('runtim',11002n);assert.equal(g.next().value,'clock');assert.equal(f.r.f,0n);done(g);
  assert.equal(f.m.read(11002n),54321n);assert.equal(f.r.f,54321n);
});
test('ETIM reads start memory after MSTIME returns and does not overwrite that argument',()=>{
  const f=fixture();f.days.splice(0,f.days.length,10000n);f.m.write(11002n,1000n);const g=f.clock('etim',11002n);assert.equal(g.next().value,'clock');f.m.write(11002n,7000n);
  assert.equal(done(g),3000n);assert.equal(f.m.read(11002n),7000n);assert.deepEqual(f.subtractions,[7000n]);
});
test('ETIM argument aliasing AC0 observes the monitor result rather than its entry value',()=>{
  const f=fixture();f.days.splice(0,f.days.length,10000n);f.r.f=77n;assert.equal(done(f.clock('etim',0n)),0n);assert.deepEqual(f.subtractions,[10000n]);
});
for(const [now,since,value] of [[43200000n,0n,43200000n],[0n,43200000n,-43200000n],[43200001n,0n,-43199999n],[0n,43200001n,43199999n],[0n,259200000n,-172800000n]] as const)
test(`raw ETIM ${now} minus ${since} retains strict one-pass correction`,()=>{
  const f=fixture();f.days.splice(0,f.days.length,now);f.m.write(11002n,since);assert.equal(done(f.clock('etim',11002n)),value);
});
test('ETIM reevaluates the positive threshold after a suspended negative correction',()=>{
  const f=fixture();f.days.splice(0,f.days.length,0n);f.m.write(11002n,43200001n);const sub=f.monitor.sub0;
  f.monitor.sub0=function*(word){yield*sub(word);if(word===-86400000n)yield 'correction';};const g=f.clock('etim',11002n);assert.equal(g.next().value,'clock');assert.equal(g.next().value,'correction');
  f.r.f=50000000n;assert.equal(done(g),-36400000n);assert.deepEqual(f.subtractions,[43200001n,-86400000n,86400000n]);
});
test('clock monitor failure preserves prior writes and cannot emit later TIME fields',()=>{
  const f=fixture();f.monitor.runtim=function*(){throw new Error('Monitor transfer');};assert.throws(()=>done(f.run()),/Monitor transfer/);
  assert.equal(f.r.f,0n);assert.ok(f.text().endsWith('Run time in game:     '));assert.ok(!f.text().includes("Job's total"));
});
