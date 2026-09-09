import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainDefensesRuntime } from './main-defenses-runtime.ts';
import { romulanDriverStatements } from '../../src/game/romulan-driver-statements.ts';
import type { RomulanMainLocals,RomulanMainServices,RomulanExpression } from '../../src/game/romulan-driver-statements.ts';
import { checkStatements } from '../../src/game/check-statements.ts';
import { weaponDamageStatements } from '../../src/game/weapon-damage-statements.ts';
import { rawIngal } from '../../src/compat/ingal.ts';
import { prlocStatements } from '../../src/game/prloc-statements.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { constants as K,messages } from '../../src/runtime/variant-values.ts';
import { add36,multiply36,signed36,MIN_INTEGER } from '../../src/compat/word36.ts';
import { bindRomulanTargetRuntime } from './romulan-target-runtime.ts';
import { bindPlaceRuntime } from './place-runtime.ts';
import { bindRomulanTorpedoRuntime } from './romulan-torpedo-runtime.ts';
export function bindRomulanMainRuntime(f:ReturnType<typeof pregameRuntimeFixture>,defenses:ReturnType<typeof bindMainDefensesRuntime>,debug:RomulanMainServices<string>['debugLine']){
  f.m.map(45000n,Array<bigint>(600).fill(0n));const locals={} as RomulanMainLocals;
  for(const [i,key] of (['iplace','nplc','numsec','i','j','ctime','l','vt','ht','i1'] as const).entries()){locals[key]=45000n+BigInt(i);f.m.write(locals[key],77n);}
  const s={phit:45020n,id:45021n,header:45030n,args:45050n,realZero:45070n,power:45071n,ship:45072n,code:45073n,space:45074n,prc:45075n,width:45076n,tw:45077n,short:45078n,advance:45100n};
  f.m.write(s.phit,77n);f.m.write(s.id,88n);f.m.write(s.realZero,f.realWord('0.0'));f.h.put(s.advance,messages.romadv.text);f.m.write(s.short,BigInt(K.SHORT));
  const events:string[]=diagnosticRecords(),calls:bigint[][]=diagnosticRecords();
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  function* actual(expr:RomulanExpression<string>,offset:number){if(expr.address)return expr.address();const a=s.args+BigInt(offset);f.m.write(a,yield*expr());return a;}
  const io:RomulanMainServices<string>={logical:f.weapon.io.logical,
    *integer(op,l,r){const a=yield*l(),b=yield*r();switch(op){case 'add':return add36(a,b);case 'sub':return add36(a,-b);case 'mul':return multiply36(a,b);case 'min':return a<b?a:b;case 'max':return a>b?a:b;case 'and':return signed36(a&b);case 'or':return signed36(a|b);}},
    *complement(e){return signed36(~(yield*e()));},*iabs(e){const word=yield*e();assert.notEqual(word,MIN_INTEGER,'IABS overflow requires compiler policy');return word<0n?-word:word;},
    *assign(a,e){const word=yield*e();f.m.write(a(),word);},*assignBoolean(a,value){f.m.write(a(),value?-1n:0n);},
    *or(a,b){return (yield*a())||(yield*b());},*bounds(a,b){return {start:yield*a(),limit:yield*b()};},enterLoop:(a,b)=>a<=b,
    *debugLine(op,label){events.push(op+':'+label);yield*debug(op,label);},
    *iran(n){events.push('iran:'+n);return yield*f.tell.random.iran(BigInt(n));},
    *place(code,count,v,h){events.push('place');f.m.write(placement.s.object,BigInt(code));f.m.write(placement.s.n,BigInt(count));yield*placement.run({object:placement.s.object,n:placement.s.n,v,h});},*dist(ip,np,num){events.push('dist');yield*targets.dist(ip,np,num);},
    *check(v,h,dv,dh,range){events.push('check');yield*checkStatements(f.m,f.out,{h:v,v:h,dh:dv,dv:dh,dist:range,displ:s.realZero},f.checkLocals,f.checkIO);},
    *setdsp(v,h,code){const va=yield*actual(v,0),ha=yield*actual(h,1);f.m.write(s.code,BigInt(code));events.push(`setdsp:${f.m.read(va)},${f.m.read(ha)},${code}`);prepare([va,ha,s.code]);yield*f.rawBoard.run('setdsp');},
    *disp(v,h){const va=yield*actual(v,0),ha=yield*actual(h,1);events.push('disp');prepare([va,ha]);yield*f.rawBoard.run('disp');return f.r.f;},
    *ingal(v,h){const va=yield*actual(v,0),ha=yield*actual(h,1);events.push(`ingal:${f.m.read(va)},${f.m.read(ha)}`);prepare([va,ha]);yield*rawIngal(f.r,f.rt.args);return f.r.f;},
    *etim(a){events.push('etim');return yield*f.io.etim(a);},
    *romstr(v,h){events.push('romstr');yield*targets.star(v,h);},*romtor(v,h){events.push('romtor');yield*torpedoes.run(v,h);},
    *phadam(kind,index,distance,power,ship){f.m.write(s.power,BigInt(power));f.m.write(s.ship,ship?-1n:0n);events.push('phadam');calls.push([f.m.read(kind),f.m.read(index),f.m.read(distance),BigInt(power),f.m.read(s.ship)]);
      yield*weaponDamageStatements('phadam',f.high,f.low,{nplc:kind,j:index,id:distance,phit:s.power,ship:s.ship},f.weapon.locals,defenses.weaponIO);},
    *pdist(...args){events.push('pdist');return yield*defenses.baseIO.pdist(...args);},
    *pridis(v,h,range,flag,zero){const va=yield*actual(v,0),ha=yield*actual(h,1),fa=yield*actual(flag,2);events.push('pridis');yield*defenses.baseIO.pridis(va,ha,range,fa,zero);},
    *makhit(){events.push('makhit');yield*defenses.baseIO.makhit();},*tell(){events.push('tell');yield*f.tell.run();},
    *odisp(code,space){f.m.write(s.code,BigInt(code));f.m.write(s.space,BigInt(space));prepare([s.code,s.space]);yield*f.rt.run('odisp');},
    *outAdvance(){f.m.write(s.space,0n);prepare([s.advance,s.space]);yield*f.rt.run('out');},
    *prloc(v,h){f.m.write(s.prc,1n);f.m.write(s.width,0n);yield*prlocStatements(f.m,f.high,f.low,{v,h,prcflg:s.prc,w:s.width,tw:s.tw,prlflg:f.low.address('ocflg'),proflg:s.short},f.pi);},
    *baspha(){events.push('baspha');yield*defenses.base();},*plnatk(){events.push('plnatk');yield*defenses.planet();},*basbld(){events.push('basbld');yield*defenses.build();},
  }; // Explicit compiler evaluation/locals/literals and existing CPU/RNG services.
  const targets=bindRomulanTargetRuntime(f),placement=bindPlaceRuntime(f),torpedoes=bindRomulanTorpedoRuntime(f,defenses,targets);
  return {locals,s,events,calls,io,targets,placement,torpedoes,run:(phit=s.phit,id=s.id)=>romulanDriverStatements(phit,id,f.high,f.low,f.out,locals,io)};
}
