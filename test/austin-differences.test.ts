import test from 'node:test';
import assert from 'node:assert/strict';
import { withVariant } from '../src/runtime/variant-execution.ts';
import { createVariantContext } from '../src/runtime/variant.ts';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { damageRuntimeFixture } from './fixtures/damage-runtime.ts';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindRomulanTargetRuntime } from './fixtures/romulan-target-runtime.ts';
import { austinEchoControl } from '../src/compat/inli-runtime.ts';
import { austinDecini } from '../src/compat/austin-decini.ts';
import { moveRuntimeFixture } from './fixtures/move-runtime.ts';
import { variantDefinitions } from '../src/runtime/variant.ts';
import { messageText } from '../src/game/message-queue.ts';
import { rightHalf } from '../src/compat/word36.ts';
import { acquireLock } from '../src/compat/lock.ts';
const austin=<T>(f:()=>T)=>withVariant(createVariantContext('austin'),f);

test('Austin raw hit queue fills all 720 entries, overwrites only the sender slice and reaches bit 18',()=>austin(()=>{
  const f=pregameRuntimeFixture([]),q=f.getHit.queues.hit;
  for(let sender=1;sender<=18;sender++)for(let n=0;n<40;n++){
    f.low.write('who',BigInt(sender));f.low.write('dbits',1n<<17n);f.low.write('iwhat',1n);f.low.write('ihita',BigInt(sender*100+n));finish(f.makeHit.run());
  }
  assert.equal(q.links.length,720);assert.ok(q.links.every(w=>rightHalf(w)===(1n<<17n)));assert.equal(f.high.read('hitflg',18),720n);
  const first=q.links.slice(0,680);f.low.write('who',18n);f.low.write('dbits',1n<<17n);f.low.write('iwhat',1n);finish(f.makeHit.run());
  assert.deepEqual(q.links.slice(0,680),first);assert.equal(f.high.read('hitflg',18),721n); // Source retains the stale count after overwrite.
  f.m.write(f.getHit.player,18n);for(let i=0;i<720;i++)finish(f.getHit.run());assert.ok(q.links.every(w=>rightHalf(w)===0n));
  finish(f.getHit.run());assert.equal(f.high.read('hitflg',18),0n);assert.equal(f.low.read('iwhat'),0n);
}));

test('Austin ROMSPK uses four broadcast draws even when PLAYER is set, with all three source masks',()=>austin(()=>{
  for(const population of [1,2,3]){
    const f=pregameRuntimeFixture([]),b=f.romulanSpeech,draws:number[]=[],values=[population,1,1,3];
    f.low.write('player',-1n);f.low.write('who',18n);b.io.iran=function*(){draws.push(Number(f.rt.args.read(0)));f.r.t0=BigInt(values.shift()!);};
    finish(b.run());assert.deepEqual(draws,[3,4,5,5]);assert.equal(f.low.read('dbits'),BigInt(variantDefinitions.austin.romulanText.masks[population-1]));
    const text=messageText(Array.from({length:17},(_,i)=>f.m.read(b.buffer+BigInt(i))));assert.equal(text,'Death to mindless '+['sub-Romulan','human','klingon'][population-1]+' toads!');assert.ok(!b.events.includes('player-quip'));
  }
}));

test('Austin public and internal locks use keys 1 and 2; failed ENQ returns LKFAIL after 25 ms',()=>austin(()=>{
  const f=moveRuntimeFixture(),keys:bigint[]=[];f.lockIO.enq=function*(){keys.push(f.r.t1);return false;};
  for(const key of [1,2] as const){const g=acquireLock(f.locks,f.lockState,f.r,f.symbols,f.lockIO,key);assert.equal(g.next().value,'hibernate:25');assert.equal(f.low.read('lkfail'),-1n);finish(g);}
  assert.deepEqual(keys,[1n,2n]);
}));

test('Austin BASPHA callee mutation changes KA and later report coordinates, preserving loop K and its recipient bit',()=>austin(()=>{
  const f=basePhaserRuntimeFixture();f.io.phadam=function*(_kind,k){assert.equal(k,f.locals.ka);f.m.write(k,2n);f.low.write('ihita',3n);};
  f.high.write('shpcon',40n,2,variantDefinitions.austin.constants.KVPOS);f.high.write('shpcon',40n,2,variantDefinitions.austin.constants.KHPOS);finish(f.run());
  assert.equal(f.m.read(f.locals.ka),2n);assert.equal(f.m.read(f.locals.k),10n);
  assert.ok(f.events.includes('pridis:40,40,10,1,0'));assert.ok((f.queued[0].dbits&1n)!==0n);
}));
test('Austin DAMAGE passes copies of both named-device J and general-report I',()=>austin(()=>{
  for(const named of [false,true]){
    const f=damageRuntimeFixture();if(named)f.token(2,'SH');const odev=f.io.odev;
    f.io.odev=function*(index){assert.equal(index,named?f.locals.ja:f.locals.ia);yield*odev(index);f.m.write(index,9n);};
    finish(f.run());assert.match(f.text(),/300/);assert.equal(f.m.read(named?f.locals.j:f.locals.i),10n);
  }
}));
test('Austin ROMSTR returns the DO coordinates even when DISPC changes its copies',()=>austin(()=>{
  const f=pregameRuntimeFixture([]),r=bindRomulanTargetRuntime(f);f.m.write(r.s.iv,20n);f.m.write(r.s.ih,30n);
  r.starIO.dispc=function*(v,h){assert.equal(v,r.starLocals.ia);assert.equal(h,r.starLocals.ja);f.m.write(v,70n);f.m.write(h,70n);return 9n;};
  finish(r.star());assert.equal(f.m.read(r.s.iv),19n);assert.equal(f.m.read(r.s.ih),29n);
}));
test('Austin ECHOFF/ECHON update the flag after monitor OPEN, including a resumed failure',()=>{
  const state={echflg:0n},events:string[]=[];
  finish(austinEchoControl('echoff',state,{*openTTY(echo){events.push(String(echo));assert.equal(state.echflg,0n);return false;},*halt(){events.push('halt');}}));
  assert.equal(state.echflg,-1n);finish(austinEchoControl('echon',state,{*openTTY(){return true;},*halt(){assert.fail();}}));assert.equal(state.echflg,0n);assert.deepEqual(events,['false','halt']);
});
test('Austin missing INI emits source messages, restores registers and makes no invented default assignments',()=>austin(()=>{
  const f=moveRuntimeFixture(),r=f.r;r.x1=111n;r.p1=222n;const text=variantDefinitions.austin.fileDescriptors,output:string[]=[];f.input.pointer=42n;
  finish(austinDecini(f.input,f.ini.state,r,{prompt:text.prompt.text,missing:text.missingInitialization.text},{
    *outstr(value){output.push(value);},*inchwl(){assert.fail();},*clearInput(){},*hibernate(){assert.fail();},files:{inibeg:333n,iniint:0n,iniexp:0n},
    *open(){assert.equal(r.x1,333n);return false;},*ttyon(){assert.fail();},*ocrl(){assert.fail();},*seti(){assert.fail();},
  }));assert.deepEqual(output,[text.prompt.text,text.missingInitialization.text]);assert.equal(f.input.pointer,-1n);assert.equal(r.x1,111n);assert.equal(r.p1,222n);assert.equal(f.ini.state.iniflg,0n);
}));
