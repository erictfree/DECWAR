import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainDefensesRuntime } from './main-defenses-runtime.ts';
import type { bindRomulanTorpedoRuntime } from './romulan-torpedo-runtime.ts';
import { torpedoStatements } from '../../src/game/torpedo-statements.ts';
import type { TorpedoStatementServices,TorpedoWords,TorpedoMessage } from '../../src/game/torpedo-statements.ts';
import { romulanDamageStatements } from '../../src/game/romulan-damage-statements.ts';
import { WordBlock } from '../../src/compat/memory.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { constants as K,messages } from '../../src/runtime/variant-values.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainTorpedoRuntime(f:ReturnType<typeof pregameRuntimeFixture>,defenses:ReturnType<typeof bindMainDefensesRuntime>,rom:ReturnType<typeof bindRomulanTorpedoRuntime>){
  f.m.map(55500n,Array<bigint>(500).fill(77n));f.m.map(BigInt(localLayout.torpedo.address),Array<bigint>(7).fill(77n));const torps=new WordBlock(f.m,localLayout.torpedo),locals={} as TorpedoWords;
  for(const [i,key] of (['iflg','i','tem','ntorp','id','iv','ih','idis','aran','nplc','j','d','idum','d1','d2'] as const).entries())locals[key]=55500n+BigInt(i);f.m.write(locals.d,f.realWord('99'));
  const s={header:55520n,count:55530n,zero:55531n,pteam:55532n,kind:55533n,index:55534n},labels={} as Record<TorpedoMessage,bigint>;f.m.write(s.kind,BigInt(K.DXROM));f.m.write(s.index,1n);
  for(const [i,key] of (['torp00','torp01','torp02','torp03','torp04','torp05','torp06','torp07','phacn1','error1','error2','empty'] as const).entries()){labels[key]=55600n+BigInt(i*30);f.h.put(labels[key],key==='empty'?'Sorry, Captain, but the torpedo tubes are empty!':messages[key].text);}
  const events:string[]=[],hits:(typeof f.hit)[]=[],prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:TorpedoStatementServices<string>={...rom.io,
    *iran(n){events.push('iran:'+n);return yield*f.tell.random.iran(BigInt(n));},
    *locate(entry,e){events.push(entry);f.m.write(f.location.n,yield*e.evaluate());return yield*f.location.run(entry);},
    *pause(e){events.push('pause');f.m.write(f.wait.argument,yield*e.evaluate());yield*f.wait.pause();},
    *ldis(v,h,ov,oh,range){f.m.write(s.count,BigInt(range));prepare([v,h,ov,oh,s.count]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *blkset(a,z,n){events.push('blkset');f.m.write(s.zero,BigInt(z));f.m.write(s.count,BigInt(n));yield*f.points.block.run('blkset',[a,s.zero,s.count]);},
    *out(key,n){events.push(key);f.m.write(s.count,BigInt(n));prepare([labels[key],s.count]);yield*f.rt.run('out');},*crlf(){yield*f.rt.run('crlf');},*odec(a,n){f.m.write(s.count,BigInt(n));prepare([a,s.count]);yield*f.rt.run('odec');},
    *lockPlanet(){events.push('lock');yield*f.io.lock(f.high.address('plnlok'));},
    *plnrmv(i,team){events.push('plnrmv');f.m.write(s.pteam,yield*team.evaluate());yield*rom.removal.run(i,s.pteam);},
    *torom(d1,d2){events.push('torom');yield*romulanDamageStatements('torom',f.high,f.low,{phit:d1,id:d2},defenses.romulanIO);},
    *jumpRomulan(){events.push('jump');yield*defenses.weaponIO.jump(s.kind,s.index);},
    *makhit(){events.push('makhit');hits.push({...f.hit});yield*f.makeHit.run();},
  };
  return {torps,locals,s,labels,events,hits,io,run:()=>torpedoStatements(f.high,f.low,f.out,torps,locals,io)};
}
