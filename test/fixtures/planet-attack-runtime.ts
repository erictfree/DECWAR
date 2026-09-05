import assert from 'node:assert/strict';
import { planetAttackStatements } from '../../src/game/planet-attack-statements.ts';
import type { PlanetAttackServices } from '../../src/game/planet-attack-statements.ts';
import { basePhaserRuntimeFixture } from './base-phaser-runtime.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { constants as K } from '../../src/generated/source-data.ts';
export function planetAttackRuntimeFixture(){
  const f=basePhaserRuntimeFixture(),locals={k:13800n,pcode:13801n,pteam:13802n,j:13803n,jtype:13804n,phit:13805n,id:13806n};
  const integerDraws:bigint[]=[];
  const io:PlanetAttackServices<string>={...f.io,
    *and(l,r){return (yield*l())&&(yield*r());},*or(l,r){return (yield*l())||(yield*r());},
    *iran(n){f.events.push(`planet-iran:${n}`);assert.ok(integerDraws.length,'unscheduled planet IRAN');return integerDraws.shift()!;},
    *dispc(v,h){f.events.push('dispc');f.prepare([v,h]);yield*f.rawBoard.run('dispc');return f.r.t0;},
    *ldis(v,h,ov,oh,n){f.events.push('planet-ldis');f.m.write(13610n,BigInt(n));f.prepare([v,h,ov,oh,13610n]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *phadam(kind,j,id,phit,ship){assert.equal(ship,false);f.m.write(13620n,BigInt(kind));f.m.write(13622n,0n);f.events.push('phadam');f.calls.push([BigInt(kind),f.m.read(j),f.m.read(id),f.m.read(phit),0n]);
      yield*f.weapon.run('phadam',{nplc:13620n,j,id,phit,ship:13622n});},
  }; // Explicit short-circuit compiler fixture; other policies tested separately.
  const planet=(index=1,code=801,builds=5n,v=12,h=20)=>{f.high.write('nplnet',BigInt(index));f.high.write('locpln',BigInt(v),index,K.KVPOS);f.high.write('locpln',BigInt(h),index,K.KHPOS);f.high.write('locpln',builds,index,3);f.views.high.board.setdsp(v,h,code);};
  f.high.write('nbase',0n,2);planet();
  return {...f,baseRun:f.run,baseIO:f.io,baseLocals:f.locals,locals,integerDraws,planet,io,run:()=>planetAttackStatements(f.high,f.low,locals,io)};
}
