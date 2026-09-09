import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import { WordBlock } from '../../src/compat/memory.ts';
import type { CommonBlock } from '../../src/compat/memory.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { localState } from '../../src/game/local-state.ts';
import { rawIngal } from '../../src/compat/ingal.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { rawPdist } from '../../src/compat/pdist.ts';
import { jumpStatements } from '../../src/game/jump-statements.ts';
import { baseKilledStatements } from '../../src/game/base-killed-statements.ts';
import type { JumpStatementServices } from '../../src/game/jump-statements.ts';
import type { BaseKilledStatementServices } from '../../src/game/base-killed-statements.ts';
import type { WeaponStatementServices } from '../../src/game/weapon-damage-statements.ts';
import type { statusRuntimeFixture } from './status-runtime.ts';
import type { boardRuntimeFixture } from './board-runtime.ts';
import type { powerRuntimeFixture } from './power-runtime.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { orderedRational as real } from '../support/rational-real.ts';
import { add36,MIN_INTEGER } from '../../src/compat/word36.ts';
// Explicit ordinary CPU, compiler DO/numeric/logical and argument temporaries.
// CHKOUT is at its linked base; REAL handles come from the shared power fixture.
export function combatDisplacementRuntimeFixture(f:Pick<ReturnType<typeof statusRuntimeFixture>,'m'|'r'|'rt'>&{high:CommonBlock;low:CommonBlock},
  board:ReturnType<typeof boardRuntimeFixture>,power:ReturnType<typeof powerRuntimeFixture>,numeric:WeaponStatementServices<string>){
  f.m.map(BigInt(localLayout.check.address),Array<bigint>(localLayout.check.words).fill(0n));
  const chkout=new WordBlock(f.m,localLayout.check),path=localState(f.m).check(power);
  path.dhs=real.literal('1');path.dvs=real.literal('0');
  const jumpLocals={iloc1:13950n,jloc1:13951n,ivv:13952n,ihh:13953n,l:13954n},baseLocals={ib:13955n,ie:13956n,i:13957n,j:13958n};
  const events:string[]=diagnosticRecords(),prepare=(words:bigint[])=>{loadArgumentBlock(f.m,13960n,words);selectArgumentBlock(f.r,13960n);};
  const cpu={*sub(reg:'f'|'t1',n:bigint):Generator<string,void,void>{f.r[reg]=add36(f.r[reg],-n);},
    *movm(reg:'f'|'t1'):Generator<string,void,void>{assert.notEqual(f.r[reg],MIN_INTEGER);if(f.r[reg]<0n)f.r[reg]=-f.r[reg];}};
  const ldisCPU={*subT1(n:bigint){yield*cpu.sub('t1',n);},*movmT1(){yield*cpu.movm('t1');}};
  const jumpIO:JumpStatementServices<string>={
    *binary(...a){return yield*numeric.binary(...a);},*assign(...a){yield*numeric.assign(...a);},logical:n=>numeric.logical(n),*assignLogicalZero(d){yield*numeric.assignLogicalZero(d);},
    *assignFalse(d,_type){f.m.write(d(),0n);},
    *ingal(v,h){events.push('ingal');prepare([v,h]);yield*rawIngal(f.r,f.rt.args);return f.r.f;},
    *pdist(v,h,nv,nh){events.push('pdist');prepare([v,h,nv,nh]);yield*rawPdist(f.r,f.rt.args,cpu);return f.r.f;},
    *dispc(v,h){events.push('dispc');prepare([v,h]);yield*board.run('dispc');return f.r.t0;},
    *setdsp(v,h,code){const n=yield*code.evaluate();events.push(`set:${f.m.read(v)},${f.m.read(h)},${n}`);f.m.write(13968n,n);prepare([v,h,13968n]);yield*board.run('setdsp');},
  };
  const baseIO:BaseKilledStatementServices<string>={
    *binary(...a){return yield*numeric.binary(...a);},*assign(...a){yield*numeric.assign(...a);},*compare(...a){return yield*numeric.compare(...a);},logical:n=>numeric.logical(n),
    *assignFalse(...a){yield*jumpIO.assignFalse(...a);},*dispc(...a){return yield*jumpIO.dispc(...a);},
    *bounds(s,l){return {start:yield*s.evaluate(),limit:yield*l.evaluate()};},enterLoop:(s,l)=>s<=l,
    *ldis(v,h,pv,ph,n){events.push('ldis');f.m.write(13969n,BigInt(n));prepare([v,h,pv,ph,13969n]);yield*rawLdis(f.r,f.rt.args,ldisCPU);return f.r.f;},
  };
  return {chkout,path,jumpLocals,baseLocals,events,cpu,ldisCPU,jumpIO,baseIO,
    jump:(nplc:bigint,j:bigint)=>jumpStatements(f.high,f.low,{nplc,j},{disv:chkout.address('dhs'),dish:chkout.address('dvs')},jumpLocals,jumpIO),
    baskil:(team:bigint)=>baseKilledStatements(f.high,f.low,team,baseLocals,baseIO),
  };
}
