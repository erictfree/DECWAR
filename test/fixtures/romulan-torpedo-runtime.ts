import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainDefensesRuntime } from './main-defenses-runtime.ts';
import type { bindRomulanTargetRuntime } from './romulan-target-runtime.ts';
import { romulanTorpedoStatements } from '../../src/game/romulan-torpedo-statements.ts';
import type { RomulanTorpedoStatementLocals,RomulanTorpedoStatementServices } from '../../src/game/romulan-torpedo-statements.ts';
import { checkStatements } from '../../src/game/check-statements.ts';
import { weaponDamageStatements } from '../../src/game/weapon-damage-statements.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { signed36 } from '../../src/compat/word36.ts';
import { bindRemovePlanetRuntime } from './remove-planet-runtime.ts';
import { bindNovaRuntime } from './nova-runtime.ts';
export function bindRomulanTorpedoRuntime(f:ReturnType<typeof pregameRuntimeFixture>,defenses:ReturnType<typeof bindMainDefensesRuntime>,targets:ReturnType<typeof bindRomulanTargetRuntime>){
  f.m.map(46400n,Array<bigint>(600).fill(77n));const locals={} as RomulanTorpedoStatementLocals;
  for(const [i,key] of (['misfir','tpaus','id','idis','aran','nplc','j','iob','num99','iv2','ih2','i','pteam','d','idum'] as const).entries())locals[key]=46400n+BigInt(i);
  f.m.write(locals.d,f.realWord('99'));
  const s={header:46430n,flag:46455n,thirty:46456n,ship:46457n,zero:46458n,dv:46500n,dh:46501n};f.m.write(s.thirty,30n);f.m.write(s.ship,-1n);f.m.write(s.zero,0n);
  const events:string[]=diagnosticRecords(),checks:bigint[][]=diagnosticRecords(),damageCalls:bigint[][]=diagnosticRecords(),numeric=defenses.weaponIO;
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:RomulanTorpedoStatementServices<string>={...numeric,
    *ran(z){events.push('ran');return yield*numeric.ran(z);},*iran(max){events.push('iran:'+max);return yield*f.tell.random.iran(BigInt(max));},
    *mod(...a){return yield*f.checkIO.mod(...a);},*mask(a,b){return signed36((yield*a.evaluate())&~(yield*b.evaluate()));},
    *bounds(a,b){return {start:yield*a.evaluate(),limit:yield*b.evaluate()};},enterLoop:(a,b)=>a<=b,
    *check(v,h,dv,dh,range,d){events.push('check');checks.push([v,h,dv,dh,range,d]);yield*checkStatements(f.m,f.out,{h:v,v:h,dh:dv,dv:dh,dist:range,displ:d},f.checkLocals,f.checkIO);},
    *pridis(v,h,range,flag,zero){events.push('pridis');f.m.write(s.flag,yield*flag.evaluate());yield*defenses.baseIO.pridis(v===30?s.thirty:v,h===30?s.thirty:h,range,s.flag,zero);},
    *makhit(){events.push('makhit');yield*defenses.baseIO.makhit();},
    *snova(){events.push('snova');yield*nova.supernova();},
    *tordam(kind,index,id,size,ship){events.push('tordam');f.m.write(s.ship,ship?-1n:0n);damageCalls.push([kind,index,id,size,s.ship]);yield*weaponDamageStatements('tordam',f.high,f.low,{nplc:kind,j:index,id,phit:size,ship:s.ship},f.weapon.locals,numeric);},
    *trcoff(index){events.push('trcoff');yield*f.getHit.tractor(index);},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*f.rawBoard.run('disp');return f.r.f;},
    *setdsp(v,h,zero){events.push('setdsp');f.m.write(s.zero,BigInt(zero));prepare([v,h,s.zero]);yield*f.rawBoard.run('setdsp');},
    *dist(...a){events.push('dist');yield*targets.dist(...a);},*romstr(...a){events.push('romstr');yield*targets.star(...a);},
    *lockPlanet(caller){events.push('lock:'+caller);yield*f.io.lock(f.high.address('plnlok'));},*unlockPlanet(){events.push('unlock');yield*f.io.unlock(f.high.address('plnlok'));},
    *plnrmv(i,team){events.push('plnrmv');yield*removal.run(i,team);},
    *etim(a){events.push('etim');return yield*f.io.etim(a);},
  }; // Existing explicit rational REAL/RAN, ordinary CPU, compiler and lock fixtures.
  const removal=bindRemovePlanetRuntime(f);
  const nova=bindNovaRuntime(f,defenses,removal);
  return {locals,s,io,events,checks,damageCalls,removal,nova,run:(iv1=s.dv,ih1=s.dh)=>romulanTorpedoStatements(f.high,f.low,f.out,{iv1,ih1},locals,io)};
}
