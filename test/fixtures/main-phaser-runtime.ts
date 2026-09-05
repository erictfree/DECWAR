import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainDefensesRuntime } from './main-defenses-runtime.ts';
import { phaserStatements } from '../../src/game/phaser-statements.ts';
import type { PhaserStatementServices,PhaserMessage } from '../../src/game/phaser-statements.ts';
import { weaponDamageStatements } from '../../src/game/weapon-damage-statements.ts';
import { romulanDamageStatements } from '../../src/game/romulan-damage-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { rawPdist } from '../../src/compat/pdist.ts';
import { signed36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainPhaserRuntime(f:ReturnType<typeof pregameRuntimeFixture>,defenses:ReturnType<typeof bindMainDefensesRuntime>){
  f.m.map(55000n,Array<bigint>(500).fill(77n));const locals={tem:55000n,bank:55001n,iv:55002n,ih:55003n,nplc:55004n,ip:55005n,id:55006n,phit:55007n},s={header:55020n,count:55030n,ship:55031n,flag:55032n,thirty:55033n},labels={} as Record<PhaserMessage,bigint>;
  f.m.write(s.thirty,30n);for(const [i,key] of (['phacn0','erloc1','error1','error2','phacn1','phacn2','phacn4','phacn5','phacn7','phacn8','phacn9'] as const).entries()){labels[key]=55100n+BigInt(i*30);f.h.put(labels[key],messages[key].text);}
  const events:string[]=[],hits:(typeof f.hit)[]=[],prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:PhaserStatementServices<string>={...defenses.weaponIO,
    *locate(entry,n){events.push(entry);f.m.write(f.location.n,BigInt(n));return yield*f.location.run(entry);},
    *board(entry,v,h){prepare([v,h]);yield*f.rawBoard.run(entry);return f.r.f;},
    *pdist(...a){prepare(a);yield*rawPdist(f.r,f.rt.args,f.pdistCPU);return f.r.f;},
    *pause(e){events.push('pause');f.m.write(f.wait.argument,yield*e.evaluate());yield*f.wait.pause();},
    *etim(a){return yield*f.io.etim(a);},*iran(n){events.push('iran:'+n);return yield*f.tell.random.iran(BigInt(n));},
    *out(key,n){events.push(key);f.m.write(s.count,BigInt(n));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *phadam(kind,index,id,phit){events.push('phadam');f.m.write(s.ship,-1n);yield*weaponDamageStatements('phadam',f.high,f.low,{nplc:kind,j:index,id,phit,ship:s.ship},f.weapon.locals,defenses.weaponIO);},
    *pharom(phit,id){events.push('pharom');yield*romulanDamageStatements('pharom',f.high,f.low,{phit,id},defenses.romulanIO);},
    *pridis(v,h,range,flag,zero){events.push('pridis:'+range);f.m.write(s.flag,yield*flag.evaluate());yield*defenses.baseIO.pridis(v,h,range,s.flag,zero);},
    *mask(a,b){return signed36((yield*a.evaluate())&~(yield*b.evaluate()));},*integerOr(a,b){return signed36((yield*a.evaluate())|(yield*b.evaluate()));},
    *makhit(){events.push('makhit');hits.push({...f.hit});yield*f.makeHit.run();},
  };
  return {locals,s,labels,events,hits,io,run:()=>phaserStatements(f.high,f.low,locals,s.thirty,io)};
}
