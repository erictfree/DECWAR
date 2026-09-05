import assert from 'node:assert/strict';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { basePhaserStatements } from '../../src/game/base-phaser-statements.ts';
import type { BasePhaserServices } from '../../src/game/base-phaser-statements.ts';
import { planetAttackStatements } from '../../src/game/planet-attack-statements.ts';
import type { PlanetAttackServices } from '../../src/game/planet-attack-statements.ts';
import { rebuildBaseStatements } from '../../src/game/base-rebuild-statements.ts';
import type { BaseRebuildServices } from '../../src/game/base-rebuild-statements.ts';
import { weaponDamageStatements } from '../../src/game/weapon-damage-statements.ts';
import { romulanDamageStatements } from '../../src/game/romulan-damage-statements.ts';
import type { RomulanDamageStatementServices } from '../../src/game/romulan-damage-statements.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { rawPdist } from '../../src/compat/pdist.ts';
import { add36,multiply36,divide36,signed36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainDefensesRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(44400n,Array<bigint>(600).fill(0n));
  const baseLocals={jb:44400n,je:44401n,i:44402n,j:44403n,k:44404n,id:44405n,ka:44406n},planetLocals={k:44420n,pcode:44421n,pteam:44422n,j:44423n,jtype:44424n,phit:44425n,id:44426n,ja:44427n},buildLocals={ib:44440n,ie:44441n,n:44442n,j:44443n,i:44444n};
  const s={header:44500n,range:44510n,kind:44511n,power:44512n,ship:44513n,priorityRange:44514n,priorityZero:44515n,literalZero:44516n};
  const events:string[]=[],calls:bigint[][]=[],hits:(typeof f.hit)[]=[];
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const weaponIO={...f.weapon.io,*iran(n:number){events.push('weapon-iran:'+n);return yield*f.tell.random.iran(BigInt(n));}};
  // PHADAM keeps the existing explicit rational REAL/RAN fixture. Integer
  // draws in this call now consume the same physical SEED as TELL/PHAROM.
  const baseIO:BasePhaserServices<string>={logical:f.weapon.io.logical,enterLoop:(a,b)=>a<=b,
    *integer(op,l,r){const a=yield*l(),b=yield*r();switch(op){case 'add':return add36(a,b);case 'sub':return add36(a,-b);case 'mul':return multiply36(a,b);case 'div':return divide36(a,b).quotient;case 'or':return signed36(a|b);}},
    *assign(a,value){const word=yield*value();f.m.write(a(),word);},*bounds(a,b){return {start:yield*a(),limit:yield*b()};},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *ldis(v,h,ov,oh,range){events.push('ldis:'+range);f.m.write(s.range,BigInt(range));prepare([v,h,ov,oh,s.range]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *pdist(v,h,ov,oh){events.push('pdist');prepare([v,h,ov,oh]);yield*rawPdist(f.r,f.rt.args,f.pdistCPU);return f.r.f;},
    *phadam(kind,target,distance,power,ship){assert.equal(ship,false);f.m.write(s.kind,yield*kind());f.m.write(s.power,yield*power());f.m.write(s.ship,0n);events.push('phadam');calls.push([f.m.read(s.kind),f.m.read(target),f.m.read(distance),f.m.read(s.power),0n]);
      yield*weaponDamageStatements('phadam',f.high,f.low,{nplc:s.kind,j:target,id:distance,phit:s.power,ship:s.ship},f.weapon.locals,weaponIO);},
    *pharom(power,distance){f.m.write(s.power,yield*power());events.push('pharom');calls.push([500n,f.m.read(s.power),f.m.read(distance)]);yield*romulanDamageStatements('pharom',f.high,f.low,{phit:s.power,id:distance},romulanIO);},
    *pridis(v,h,range,flag,zero){events.push('pridis:'+range+':'+zero);f.m.write(s.priorityRange,BigInt(range));f.m.write(s.priorityZero,BigInt(zero));f.m.write(s.literalZero,0n);
      yield*f.priority.run({iv:v,ih:h,ilim:s.priorityRange,iflag:flag??s.literalZero,zero:s.priorityZero});},
    *makhit(){events.push('makhit');hits.push({...f.hit});yield*f.makeHit.run();},
  }; // Explicit left-first expressions, RHS-first stores and ordinary DO policy.
  const romulanIO:RomulanDamageStatementServices<string>={falseWord:0n,assign:baseIO.assign,
    *integer(op,l,r){if(op==='min'){const a=yield*l(),b=yield*r();return a<b?a:b;}return yield*baseIO.integer(op,l,r);},
    *iran(n){events.push('romulan-iran:'+n);return yield*f.tell.random.iran(BigInt(n));},
    *setdsp(v,h,zero){f.m.write(s.literalZero,BigInt(zero));prepare([v,h,s.literalZero]);yield*f.rawBoard.run('setdsp');},
  };
  const planetIO:PlanetAttackServices<string>={...baseIO,
    *and(a,b){return (yield*a())&&(yield*b());},*or(a,b){return (yield*a())||(yield*b());}, // Explicit short-circuit compiler fixture; replaceable.
    *iran(n){events.push('planet-iran:'+n);return yield*f.tell.random.iran(BigInt(n));},
    *dispc(v,h){events.push('dispc');prepare([v,h]);yield*f.rawBoard.run('dispc');return f.r.f;},
    *ldis(v,h,ov,oh,range){events.push('ldis:'+range);f.m.write(s.range,BigInt(range));prepare([v,h,ov,oh,s.range]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *phadam(kind,target,distance,power,ship){assert.equal(ship,false);f.m.write(s.kind,BigInt(kind));f.m.write(s.ship,0n);events.push('phadam');calls.push([BigInt(kind),f.m.read(target),f.m.read(distance),f.m.read(power),0n]);
      yield*weaponDamageStatements('phadam',f.high,f.low,{nplc:s.kind,j:target,id:distance,phit:power,ship:s.ship},f.weapon.locals,weaponIO);},
  };
  const buildIO:BaseRebuildServices<string>={logical:baseIO.logical,assign:baseIO.assign,enterTeams:baseIO.enterLoop,
    *integer(op,l,r){if(op==='min'){const a=yield*l(),b=yield*r();return a<b?a:b;}return yield*baseIO.integer(op,l,r);},
  };
  return {baseLocals,planetLocals,buildLocals,s,events,calls,hits,baseIO,planetIO,buildIO,romulanIO,weaponIO,
    base:()=>basePhaserStatements(f.high,f.low,baseLocals,baseIO),planet:()=>planetAttackStatements(f.high,f.low,planetLocals,planetIO),build:()=>rebuildBaseStatements(f.high,f.low,buildLocals,buildIO)};
}
