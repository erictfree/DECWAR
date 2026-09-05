import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainBuildRuntime } from './main-build-runtime.ts';
import type { bindMainDefensesRuntime } from './main-defenses-runtime.ts';
import { captureStatements } from '../../src/game/capture-statements.ts';
import type { CaptureServices,CaptureMessage } from '../../src/game/capture-statements.ts';
import { weaponDamageStatements } from '../../src/game/weapon-damage-statements.ts';
import { prlocStatements } from '../../src/game/prloc-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { rawPdist } from '../../src/compat/pdist.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainCaptureRuntime(f:ReturnType<typeof pregameRuntimeFixture>,build:ReturnType<typeof bindMainBuildRuntime>,defenses:ReturnType<typeof bindMainDefensesRuntime>){
  f.m.map(54500n,Array<bigint>(500).fill(77n));const locals={v:54500n,tem:54501n,vloc:54502n,hloc:54503n,c:54504n,i:54505n,tcap:54506n,phit:54507n,id:54508n,idsp:54509n},s={header:54520n,count:54530n,prcflg:54531n,w:54532n,tw:54533n,ship:54534n},labels={} as Record<CaptureMessage,bigint>;
  for(const [i,key] of (['captu0','captu1','captu2','captu4','captu5','captu6','captu7','captu8','noplnt','nosur1','nosur2','nosur3','nosur4','refuses'] as const).entries()){labels[key]=54570n+BigInt(i*30);f.h.put(labels[key],key==='refuses'?"The planet's government refuses to surrender.":messages[key].text);}
  const events:string[]=[],hits:(typeof f.hit)[]=[],prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:CaptureServices<string>={...build.io,
    *out(key,n){events.push(key);f.m.write(s.count,BigInt(n));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *lock(){events.push('lock');yield*f.io.lock(f.high.address('plnlok'));},*unlock(){events.push('unlock');yield*f.io.unlock(f.high.address('plnlok'));},
    *prloc(v,h){f.m.write(s.prcflg,1n);f.m.write(s.w,0n);yield*prlocStatements(f.m,f.high,f.low,{v,h,prcflg:s.prcflg,w:s.w,tw:s.tw,prlflg:f.low.address('ocflg'),proflg:f.low.address('oflg')},f.pi);},
    *pridis(...a){events.push('pridis:'+a[2]);yield*defenses.baseIO.pridis(...a);},
    *baskil(a){events.push('baskil');yield*f.displacement.baskil(a);},
    *pdist(...a){prepare(a);yield*rawPdist(f.r,f.rt.args,f.pdistCPU);return f.r.f;},
    *phadam(team,who,id,phit){events.push('phadam');f.m.write(s.ship,0n);yield*weaponDamageStatements('phadam',f.high,f.low,{nplc:team,j:who,id,phit,ship:s.ship},f.weapon.locals,defenses.weaponIO);},
    *makhit(){events.push('makhit');hits.push({...f.hit});yield*f.makeHit.run();},
  };
  return {locals,s,labels,events,hits,io,run:()=>captureStatements(f.high,f.low,locals,io)};
}
