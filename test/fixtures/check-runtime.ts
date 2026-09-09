import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import { basePhaserRuntimeFixture } from './base-phaser-runtime.ts';
import { checkStatements,checkPointStatements } from '../../src/game/check-statements.ts';
import type { CheckStatementServices } from '../../src/game/check-statements.ts';
import { rawIngal } from '../../src/compat/ingal.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { MIN_INTEGER,signed36,divide36 } from '../../src/compat/word36.ts';
import { orderedRational as real } from '../support/rational-real.ts';
// Exact rational handles and explicit ordinary integer intrinsic/DO fixtures.
// No historical floating rounding, CPU flags or compiler evaluation claim.
export function checkRuntimeFixture(){
  const f=basePhaserRuntimeFixture();f.m.map(14000n,Array<bigint>(200).fill(0n));
  const out=f.displacement.chkout,locals={inc:14010n,i:14011n,rh:14012n,rv:14013n,ih1:14014n,ih2:14015n,iv1:14016n,iv2:14017n};
  const args={h:14000n,v:14001n,dh:14002n,dv:14003n,dist:14004n,displ:14005n};
  [10n,20n,4n,2n,4n,f.rawPower.encode(real.literal('0'))].forEach((w,i)=>f.m.write(14000n+BigInt(i),w));
  f.m.write(locals.rh,f.rawPower.encode(real.literal('99')));f.m.write(locals.rv,f.rawPower.encode(real.literal('99')));
  const events:string[]=diagnosticRecords(),numeric=f.weapon.io;
  const prepare=(words:bigint[])=>{loadArgumentBlock(f.m,14050n,words);selectArgumentBlock(f.r,14050n);};
  const io:CheckStatementServices<string>={
    *binary(...a){return yield*numeric.binary(...a);},*convert(...a){return yield*numeric.convert(...a);},*compare(...a){return yield*numeric.compare(...a);},*assign(...a){yield*numeric.assign(...a);},realLiteral:t=>numeric.realLiteral(t),logical:w=>numeric.logical(w),
    *iabs(v){const n=yield*v.evaluate();assert.notEqual(n,MIN_INTEGER,'IABS minimum requires compiler semantics');return n<0n?-n:n;},
    *mod(l,r){return divide36(yield*l.evaluate(),yield*r.evaluate()).remainder;},
    *isign(l,r){const n=yield*io.iabs(l),sign=yield*r.evaluate();return sign<0n?signed36(-n):n;},
    *bounds(s,l){return {start:yield*s.evaluate(),limit:yield*l.evaluate()};},enterLoop:(s,l)=>s<=l,
    *ingal(a,b){f.m.write(14040n,5n);const v=a===5?14040n:a,h=b===5?14040n:b;events.push(`ingal:${f.m.read(v)},${f.m.read(h)}`);prepare([v,h]);yield*rawIngal(f.r,f.rt.args);return f.r.f;},
    *disp(v,h){events.push(`disp:${f.m.read(v)},${f.m.read(h)}`);prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.t0;},
    *chkpnt(c,c1,c2){yield*checkPointStatements(f.m,{c,c1,c2},io);},
    *ran(zero){events.push('ran');return yield*numeric.ran(zero);},
  };
  return {...f,out,locals,args,io,events,
    run:()=>checkStatements(f.m,out,args,locals,io),point:(c:bigint,c1:bigint,c2:bigint)=>checkPointStatements(f.m,{c,c1,c2},io),
    realWord:(text:string)=>f.rawPower.encode(real.literal(text)),realAt:(a:bigint)=>f.rawPower.decode(f.m.read(a)),
  };
}
