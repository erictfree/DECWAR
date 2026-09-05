import assert from 'node:assert/strict';
import { basePhaserStatements } from '../../src/game/base-phaser-statements.ts';
import type { BasePhaserServices } from '../../src/game/base-phaser-statements.ts';
import { highState,lowState } from '../../src/game/common-state.ts';
import { combatDisplacementRuntimeFixture } from './combat-displacement-runtime.ts';
import { weaponStatementRuntimeFixture } from './weapon-statement-runtime.ts';
import { romulanDamageStatements } from '../../src/game/romulan-damage-statements.ts';
import type { RomulanDamageStatementServices } from '../../src/game/romulan-damage-statements.ts';
import { priorityDistanceRuntimeFixture } from './priority-distance-runtime.ts';
import { HitQueue } from '../../src/game/hit-queue.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { rawPdist } from '../../src/compat/pdist.ts';
import { add36,multiply36,divide36,signed36,MIN_INTEGER } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { constants as K } from '../../src/runtime/variant-values.ts';
import { statusRuntimeFixture } from './status-runtime.ts';
import { boardRuntimeFixture } from './board-runtime.ts';
import { powerRuntimeFixture } from './power-runtime.ts';
import { weaponFixture } from '../support/weapon-damage-fixture.ts';
export function finish<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
export function basePhaserRuntimeFixture(){
  const f=statusRuntimeFixture(),rawBoard=boardRuntimeFixture(f,f.high,f.low),policy={logical:(w:bigint)=>w<0n,trueWord:-1n,falseWord:0n};
  const high=highState(f.high,policy),low=lowState(f.low),hit=low.hit;
  const world={get rom(){return f.high.read('rom');},set rom(w:bigint){f.high.write('rom',w);},get erom(){return f.high.read('erom');},set erom(w:bigint){f.high.write('erom',w);},locr:high.locr};
  const damage=weaponFixture({players:high.players,board:high.board,hit,bases:high.bases,world,tpoint:low.tpoint});
  const ctx={get who(){return f.low.read('who');},get team(){return f.low.read('team');},get player(){return f.low.read('player');},tpoint:low.tpoint,rsr:high.scores.romulan};
  f.low.write('team',1n);f.low.write('player',-1n);f.high.write('numply',2n);f.high.write('erom',1001n);
  for(let i=1;i<=K.KNPLAY;i++)f.high.write('bits',1n<<BigInt(i-1),i);
  Object.assign(high.players[1].ship,{v:10,h:20,energy:50000n,damage:0n,shieldCondition:-1n});high.players[1].alive=-1n;high.board.setdsp(10,20,101);
  const base=(team=2,index=1,v=12,h=20,strength=1000n)=>{Object.assign(high.bases[team][index],{v,h,strength});f.high.write('nbase',1n,team);};base();
  const locals={jb:13000n,je:13001n,i:13002n,j:13003n,k:13004n,id:13005n,ka:13006n},events:string[]=[],calls:bigint[][]=[],queued:(typeof hit)[]=[];
  const queue=new HitQueue(),priority=priorityDistanceRuntimeFixture(f,f.high,f.low);
  const prepare=(words:bigint[])=>{loadArgumentBlock(f.m,13500n,words);selectArgumentBlock(f.r,13500n);};
  const ref=(address:bigint)=>({get value(){return f.m.read(address);},set value(w:bigint){f.m.write(address,w);}});
  const pdistCPU={*sub(reg:'f'|'t1',w:bigint):Generator<string,void,void>{f.r[reg]=add36(f.r[reg],-w);},*movm(reg:'f'|'t1'):Generator<string,void,void>{assert.notEqual(f.r[reg],MIN_INTEGER);if(f.r[reg]<0n)f.r[reg]=-f.r[reg];}};
  const ldisCPU={*subT1(w:bigint):Generator<string,void,void>{yield*pdistCPU.sub('t1',w);},*movmT1():Generator<string,void,void>{yield*pdistCPU.movm('t1');}};
  const rawPower=powerRuntimeFixture(f);
  const weapon=weaponStatementRuntimeFixture(f,rawPower,damage,function*(v,h,zero){
    assert.equal(zero,0);f.m.write(13630n,0n);prepare([v,h,13630n]);yield*rawBoard.run('setdsp');
  });
  const displacement=combatDisplacementRuntimeFixture(f,rawBoard,rawPower,weapon.io);
  weapon.io.jump=function*(kind,index){damage.events.push('jump');yield*displacement.jump(kind,index);};
  weapon.io.baskil=function*(team){f.m.write(13970n,yield*team.evaluate());damage.events.push('baskil:'+f.m.read(13970n));yield*displacement.baskil(13970n);};
  const io:BasePhaserServices<string>={logical:policy.logical,enterLoop:(s,l)=>s<=l,
    *integer(op,left,right){const l=yield*left(),r=yield*right();switch(op){case 'add':return add36(l,r);case 'sub':return add36(l,-r);case 'mul':return multiply36(l,r);case 'div':return divide36(l,r).quotient;case 'or':return signed36(l|r);}},
    *assign(d,v){const n=yield*v();f.m.write(d(),n);},*bounds(s,l){return {start:yield*s(),limit:yield*l()};},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*rawBoard.run('disp');return f.r.t0;},
    *ldis(v,h,ov,oh,n){events.push('ldis');f.m.write(13610n,BigInt(n));prepare([v,h,ov,oh,13610n]);yield*rawLdis(f.r,f.rt.args,ldisCPU);return f.r.f;},
    *pdist(v,h,ov,oh){events.push('pdist');prepare([v,h,ov,oh]);yield*rawPdist(f.r,f.rt.args,pdistCPU);return f.r.f;},
    *phadam(kind,k,id,power,ship){assert.equal(ship,false);f.m.write(13620n,yield*kind());f.m.write(13621n,yield*power());f.m.write(13622n,0n);events.push('phadam');calls.push([f.m.read(13620n),f.m.read(k),f.m.read(id),f.m.read(13621n),0n]);
      yield*weapon.run('phadam',{nplc:13620n,j:k,id,phit:13621n,ship:13622n});},
    *pharom(power,id){f.m.write(13621n,yield*power());events.push('pharom');calls.push([500n,f.m.read(13621n),f.m.read(id)]);yield*romulanDamageStatements('pharom',f.high,f.low,{phit:13621n,id},romulanIO);},
    *pridis(v,h,n,flag,z){events.push(`pridis:${f.m.read(v)},${f.m.read(h)},${n},${flag===null?0n:f.m.read(flag)},${z}`);
      f.m.write(13700n,BigInt(n));f.m.write(13701n,0n);f.m.write(13702n,BigInt(z));
      yield*priority.run({iv:v,ih:h,ilim:13700n,iflag:flag??13701n,zero:13702n});},
    *makhit(){events.push('makhit');queued.push({...hit});queue.make(Number(f.low.read('who')),hit,high.players,f.low.read('pasflg'),low.output);},
  }; // Explicit compiler, rational REAL, call-temporary and component bindings.
  const romulanIO:RomulanDamageStatementServices<string>={falseWord:0n,assign:io.assign,
    *integer(op,l,r){if(op==='min'){const a=yield*l(),b=yield*r();return a<b?a:b;}return yield*io.integer(op,l,r);},
    *iran(n){return damage.io.iran(BigInt(n));},
    *setdsp(v,h,zero){assert.equal(zero,0);f.m.write(13630n,0n);prepare([v,h,13630n]);yield*rawBoard.run('setdsp');},
  };
  return {...f,romulanIO,rawBoard,rawPower,views:{high,low},hit,world,damage,weapon,displacement,ctx,locals,events,calls,queued,queue,priority,io,prepare,ref,base,ldisCPU,pdistCPU,run:()=>basePhaserStatements(f.high,f.low,locals,io)};
}
