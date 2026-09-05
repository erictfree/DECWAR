import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainDefensesRuntime } from './main-defenses-runtime.ts';
import type { bindRemovePlanetRuntime } from './remove-planet-runtime.ts';
import { novaStatements,supernovaStatements } from '../../src/game/nova-statements.ts';
import type { NovaStatementServices,SupernovaStatementServices } from '../../src/game/nova-statements.ts';
import { WordBlock } from '../../src/compat/memory.ts';
import { localLayout } from '../../src/generated/local-layout.ts';
import { signed36,divide36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';

export function bindNovaRuntime(f:ReturnType<typeof pregameRuntimeFixture>,defenses:ReturnType<typeof bindMainDefensesRuntime>,removal:ReturnType<typeof bindRemovePlanetRuntime>){
  f.m.map(47800n,Array<bigint>(600).fill(77n));f.m.map(BigInt(localLayout.supernova.address),Array<bigint>(localLayout.supernova.words).fill(77n));
  const stack=new WordBlock(f.m,localLayout.supernova),locals={d:47800n,i:47801n,jbase:47802n,pteam:47803n},superLocals={objptr:47810n,strptr:47811n,v:47812n,h:47813n,object:47814n,thing:47815n};
  const s={header:47830n,zero:47850n,thirty:47851n,romKind:47852n,romIndex:47853n,kind:47854n,index:47855n};f.m.write(s.zero,0n);f.m.write(s.thirty,30n);f.m.write(s.romKind,5n);f.m.write(s.romIndex,1n);
  const events:string[]=[],calls:bigint[][]=[],numeric=defenses.weaponIO,prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:NovaStatementServices<string>={...numeric,
    *iran(max){events.push('iran:'+max);return yield*f.tell.random.iran(BigInt(max));},
    *bounds(a,b){return {start:yield*a.evaluate(),limit:yield*b.evaluate()};},enterLoop:(a,b)=>a<=b,
    *pridis(v,h,range,flag,zero){events.push('pridis');yield*defenses.baseIO.pridis(v===30?s.thirty:v,h===30?s.thirty:h,range,flag,zero);},
    *mask(a,b){return signed36((yield*a.evaluate())&~(yield*b.evaluate()));},
    *makhit(){events.push('makhit');yield*defenses.baseIO.makhit();},
    *jump(kind,index){events.push('jump');yield*numeric.jump(kind,index);},
    *jumpRomulan(){events.push('jump-romulan');yield*numeric.jump(s.romKind,s.romIndex);},
    *trcoff(index){events.push('trcoff');yield*f.getHit.tractor(index);},
    *baskil(team){events.push('baskil');yield*f.displacement.baskil(team);},
    *setdsp(v,h,zero){events.push('setdsp');f.m.write(s.zero,BigInt(zero));prepare([v,h,s.zero]);yield*f.rawBoard.run('setdsp');},
    *dispc(v,h){events.push('dispc');prepare([v,h]);yield*f.rawBoard.run('dispc');return f.r.f;},
    *lockPlanet(caller){events.push('lock:'+caller);yield*f.io.lock(f.high.address('plnlok'));},
    *unlockPlanet(){events.push('unlock');yield*f.io.unlock(f.high.address('plnlok'));},
    *plnrmv(i,team){events.push('plnrmv');yield*removal.run(i,team);},
  };
  const run=(nplc=s.kind,j=s.index)=>novaStatements(f.high,f.low,f.out,{nplc,j},locals,io);
  const superIO:SupernovaStatementServices<string>={...io,
    *min(a,b){const x=yield*a.evaluate(),y=yield*b.evaluate();return x<y?x:y;},
    *mod(a,b){return divide36(yield*a.evaluate(),yield*b.evaluate()).remainder;},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *nova(kind,index){f.m.write(s.kind,yield*kind.evaluate());f.m.write(s.index,yield*index.evaluate());events.push('nova');calls.push([f.m.read(s.kind),f.m.read(s.index)]);yield*run();},
  }; // Explicit left-first/RHS-first, ordinary DO, sign logical and rational REAL fixture.
  return {stack,locals,superLocals,s,io,superIO,events,calls,run,supernova:()=>supernovaStatements(f.high,f.low,f.out,stack,superLocals,superIO)};
}
