import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { WordBlock } from '../../src/compat/memory.ts';
import { localLayout } from '../../src/generated/local-layout.ts';
import { romulanDistanceStatements,romulanStarStatements } from '../../src/game/romulan-target-statements.ts';
import type { DistanceStatementServices,StarStatementServices } from '../../src/game/romulan-target-statements.ts';
import { add36,multiply36,divide36 } from '../../src/compat/word36.ts';
import { rawPdist } from '../../src/compat/pdist.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindRomulanTargetRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(45600n,Array<bigint>(400).fill(77n));f.m.map(BigInt(localLayout.distance.address),Array<bigint>(localLayout.distance.words).fill(77n));
  const memory=new WordBlock(f.m,localLayout.distance),locals={rv:45600n,rh:45601n,j:45602n,k:45603n,ztem:45604n},starLocals={ivf:45610n,ivl:45611n,ihf:45612n,ihl:45613n,i:45614n,j:45615n};
  const s={header:45630n,ip:45700n,np:45701n,num:45702n,iv:45710n,ih:45711n};const events:string[]=[];
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:DistanceStatementServices<string>={logical:f.weapon.io.logical,
    *integer(op,l,r){const a=yield*l(),b=yield*r();switch(op){case 'add':return add36(a,b);case 'sub':return add36(a,-b);case 'mul':return multiply36(a,b);case 'div':return divide36(a,b).quotient;case 'min':return a<b?a:b;case 'max':return a>b?a:b;}},
    *compare(op,l,r){const a=yield*l(),b=yield*r();return op==='lt'?a<b:op==='eq'?a===b:a>=b;},
    *assign(a,e){const word=yield*e();f.m.write(a(),word);},*bounds(a,b){return {start:yield*a(),limit:yield*b()};},enterLoop:(a,b)=>a<=b,
    *and(a,b){return (yield*a())&&(yield*b());},*or(a,b){return (yield*a())||(yield*b());},
    *blkset(a,value,count){events.push('blkset');const b=f.points.block;f.m.write(b.symbols.value,BigInt(value));f.m.write(b.symbols.count,BigInt(count));yield*b.run('blkset',[a,b.symbols.value,b.symbols.count]);},
    *disp(v,h){events.push(`disp:${f.m.read(v)},${f.m.read(h)}`);prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *pdist(v,h,rv,rh){events.push('pdist');prepare([v,h,rv,rh]);yield*rawPdist(f.r,f.rt.args,f.pdistCPU);return f.r.f;},
    *iran(max){events.push('iran:'+max);return yield*f.tell.random.iran(BigInt(max));},
  }; // Explicit left-first/RHS-first, sign-logical, short-circuit and ordinary DO policies.
  const starIO:StarStatementServices<string>={...io,*dispc(v,h){events.push(`dispc:${f.m.read(v)},${f.m.read(h)}`);prepare([v,h]);yield*f.rawBoard.run('dispc');return f.r.f;}};
  return {memory,locals,starLocals,s,events,io,starIO,
    dist:(ip=s.ip,np=s.np,num=s.num)=>romulanDistanceStatements(f.high,memory,{ip,np,num},locals,io),
    star:(iv=s.iv,ih=s.ih)=>romulanStarStatements(f.m,{iv,ih},starLocals,starIO)};
}
