import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { removePlanetStatements } from '../../src/game/remove-planet-statements.ts';
import type { RemovePlanetStatementServices } from '../../src/game/remove-planet-statements.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { bindKillHighRuntime } from './kill-high-runtime.ts';
export function bindRemovePlanetRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(47000n,Array<bigint>(400).fill(77n));const locals={j:47000n},s={i:47020n,pteam:47021n,header:47030n,count:47050n,code:47051n};
  const events:string[]=[],copies:bigint[][]=[],numeric=f.weapon.io,killHigh=bindKillHighRuntime(f),prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:RemovePlanetStatementServices<string>={...numeric,
    *baskil(team){events.push('baskil');yield*f.displacement.baskil(team);},
    *blkmov(from,to,count){const a=from(),b=to();f.m.write(s.count,yield*count.evaluate());events.push('blkmov');copies.push([a,b,f.m.read(s.count)]);yield*f.points.block.run('blkmov',[a,b,s.count]);},
    *bounds(a,b){return {start:yield*a.evaluate(),limit:yield*b.evaluate()};},enterLoop:(a,b)=>a<=b,
    *disp(v,h){events.push('disp');prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *setdsp(v,h,code){f.m.write(s.code,yield*code.evaluate());events.push('setdsp');prepare([v,h,s.code]);yield*f.rawBoard.run('setdsp');},
    *endgam(){events.push('endgam');yield*f.endgame.run();},
  }; // Explicit left-first expression/call and ordinary DO/BLT fixture.
  return {locals,s,events,copies,io,killHigh,run:(i=s.i,pteam=s.pteam)=>removePlanetStatements(f.high,{i,pteam},locals,io)};
}
