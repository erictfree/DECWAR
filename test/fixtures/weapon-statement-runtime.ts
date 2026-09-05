import assert from 'node:assert/strict';
import type { CommonBlock,AddressSpace } from '../../src/compat/memory.ts';
import { add36,multiply36,divide36,signed36 } from '../../src/compat/word36.ts';
import { weaponDamageStatements } from '../../src/game/weapon-damage-statements.ts';
import type { WeaponStatementServices,WeaponDamageArguments } from '../../src/game/weapon-damage-statements.ts';
import type { powerRuntimeFixture } from './power-runtime.ts';
import type { weaponFixture } from '../support/weapon-damage-fixture.ts';
import { orderedRational as real } from '../support/rational-real.ts';
// Explicit source-order compiler fixture and rational handles, NOT a floating
// codec or compiler implementation. All five REAL locals reside in AddressSpace.
export function weaponStatementRuntimeFixture(f:{m:AddressSpace;high:CommonBlock;low:CommonBlock},
  power:ReturnType<typeof powerRuntimeFixture>,damage:ReturnType<typeof weaponFixture>,
  setdsp:WeaponStatementServices<string>['setdsp']){
  const locals={rand:13930n,rana:13931n,hit:13932n,ranb:13933n,hita:13934n,powfac:13935n};
  for(const [name,a] of Object.entries(locals))f.m.write(a,name==='powfac'?0n:power.encode(real.literal('99')));
  const ref=(a:bigint)=>({get value(){return f.m.read(a);},set value(w:bigint){f.m.write(a,w);}});
  const numeric=(v:bigint,type:'integer'|'real')=>type==='real'?power.decode(v):real.fromInteger(v);
  const events:string[]=[];
  const random:Pick<WeaponStatementServices<string>,'ran'|'iran'>={
    *ran(zero){assert.equal(zero,0);return power.encode(damage.io.ran(0));},
    *iran(max){return damage.io.iran(BigInt(max));},
  };
  const io:WeaponStatementServices<string>={
    realLiteral(text){return power.encode(real.literal(text));},logical:w=>w<0n,
    *binary(op,l,r){const a=yield*l.evaluate(),b=yield*r.evaluate();
      if(l.type==='integer'&&r.type==='integer'){
        switch(op){case 'add':return add36(a,b);case 'sub':return add36(a,-b);case 'mul':return multiply36(a,b);case 'div':return divide36(a,b).quotient;case 'max':return a>b?a:b;}
      }
      const x=numeric(a,l.type),y=numeric(b,r.type);
      return power.encode(({add:real.add,sub:real.subtract,mul:real.multiply,div:real.divide,max:real.amax1}[op])(x,y));
    },
    *convert(type,reason,v){events.push(reason);const n=yield*v.evaluate();return type===v.type?n:type==='real'?power.encode(real.fromInteger(n)):signed36(real.toInteger(power.decode(n)));},
    *compare(op,l,r){const a=yield*l.evaluate(),b=yield*r.evaluate();const n=l.type==='integer'&&r.type==='integer'?(a<b?-1:a>b?1:0):real.compare(numeric(a,l.type),numeric(b,r.type));return ({lt:n<0,le:n<=0,eq:n===0,ne:n!==0,ge:n>=0,gt:n>0})[op];},
    *assign(d,type,v){let n=yield*v.evaluate();if(type!==v.type)n=type==='real'?power.encode(real.fromInteger(n)):signed36(real.toInteger(power.decode(n)));f.m.write(d(),n);},
    *assignLogicalZero(d){f.m.write(d(),0n);},
    *and(...terms){for(const term of terms)if(!(yield*term()))return false;return true;},
    *or(...terms){for(const term of terms)if(yield*term())return true;return false;},
    *torpedoShieldBranch(test){const b=yield*test();damage.events.push('shield-if:'+b);return b?1000:300;},
    *ran(zero){return yield*random.ran(zero);},
    *iran(max){return yield*random.iran(max);},
    *pwr(base,n){const value=yield*base.evaluate();damage.events.push('pwr:'+f.m.read(n));return power.encode(yield*power.call(power.decode(value),n));},
    *jump(kind,index){yield*damage.io.jump(ref(kind),ref(index));},
    *baskil(team){yield*damage.io.baskil({value:yield*team.evaluate()});},setdsp,
  };
  // Copied main-loop services retain these delegating functions, so an explicit
  // numeric-policy selection reaches CHECK, defenses and both weapon paths.
  const arithmetic={realLiteral:io.realLiteral,binary:io.binary,convert:io.convert,compare:io.compare,assign:io.assign};
  io.realLiteral=text=>arithmetic.realLiteral(text);
  io.binary=function*(...a){return yield*arithmetic.binary(...a);};
  io.convert=function*(...a){return yield*arithmetic.convert(...a);};
  io.compare=function*(...a){return yield*arithmetic.compare(...a);};
  io.assign=function*(...a){yield*arithmetic.assign(...a);};
  const powerBinding={call:io.pwr};io.pwr=function*(...a){return yield*powerBinding.call(...a);};
  const run=(entry:'tordam'|'phadam',args:WeaponDamageArguments)=>weaponDamageStatements(entry,f.high,f.low,args,locals,io);
  const readReal=(name:Exclude<keyof typeof locals,'powfac'>)=>power.decode(f.m.read(locals[name]));
  return {locals,io,events,run,readReal,numeric,random,arithmetic,powerBinding};
}
