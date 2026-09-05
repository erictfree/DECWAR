import test from 'node:test';
import assert from 'node:assert/strict';
import { rebuildBaseStatements } from '../src/game/base-rebuild-statements.ts';
import type { BaseRebuildServices } from '../src/game/base-rebuild-statements.ts';
import { turnStatements } from '../src/game/turn-statements.ts';
import type { TurnStatementServices } from '../src/game/turn-statements.ts';
import { repairRuntimeFixture } from './fixtures/repair-runtime.ts';
import { MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const f=repairRuntimeFixture();f.low.write('player',-1n);f.low.write('team',1n);f.high.write('numply',2n);f.high.write('numsid',3n,1);f.high.write('numsid',3n,2);
  const locals={ib:13000n,ie:13001n,n:13002n,j:13003n,i:13004n};
  const io:BaseRebuildServices<string>={logical:f.io.logical,integer:f.io.integer,assign:f.io.assign,enterTeams:(start,limit)=>start<=limit};
  const base=(team:number,index:number,n:bigint)=>f.high.write('base',n,index,3,team),strength=(team:number,index:number)=>f.high.read('base',index,3,team);
  return {...f,locals,io,compilerInteger:f.io.integer,base,strength,run:()=>rebuildBaseStatements(f.high,f.low,locals,io)};
}
for(const team of [1n,2n])test(`BASBLD player team ${team} rebuilds all opposing slots with truncated rate`,()=>{
  const f=fixture();f.low.write('team',team);f.base(1,1,500n);f.base(2,1,500n);f.base(Number(3n-team),10,500n);done(f.run());assert.equal(f.m.read(f.locals.n),8n);assert.equal(f.strength(Number(team),1),500n);assert.equal(f.strength(Number(3n-team),1),508n);assert.equal(f.strength(Number(3n-team),10),508n);assert.equal(f.m.read(f.locals.i),11n);assert.equal(f.m.read(f.locals.j),4n-team);
});
test('BASBLD nonplayer path rebuilds both teams without reading NUMSID',()=>{
  const f=fixture();f.low.write('player',0n);f.high.write('numsid',0n,1);f.high.write('numsid',0n,2);f.base(1,1,500n);f.base(2,10,500n);done(f.run());assert.equal(f.m.read(f.locals.n),16n);assert.equal(f.strength(1,1),516n);assert.equal(f.strength(2,10),516n);assert.equal(f.m.read(f.locals.j),3n);
});
test('BASBLD skips nonpositive strengths and caps overfull live bases without consulting NBASE',()=>{
  const f=fixture();[0n,-1n,995n,1200n].forEach((n,i)=>f.base(2,i+1,n));f.high.write('nbase',0n,2);done(f.run());assert.deepEqual([1,2,3,4].map(i=>f.strength(2,i)),[0n,-1n,1000n,1000n]);
});
test('BASBLD permits zero increments and negative results without a lower clamp',()=>{
  const f=fixture();f.high.write('numsid',26n,1);f.base(2,1,1n);done(f.run());assert.equal(f.strength(2,1),1n);assert.equal(f.m.read(f.locals.n),0n);f.high.write('numsid',-1n,1);done(f.run());assert.equal(f.strength(2,1),-24n);assert.equal(f.m.read(f.locals.n),-25n);
});
test('BASBLD initial divide failure retains old N after setting IB/IE even for a player',()=>{
  const f=fixture();f.high.write('numply',-1n);f.m.write(f.locals.n,77n);f.m.write(f.locals.j,88n);f.base(2,1,500n);assert.throws(()=>done(f.run()),/zero/i);assert.equal(f.m.read(f.locals.ib),1n);assert.equal(f.m.read(f.locals.ie),2n);assert.equal(f.m.read(f.locals.n),77n);assert.equal(f.m.read(f.locals.j),88n);assert.equal(f.strength(2,1),500n);
});
test('BASBLD player divide failure retains the first quotient and selected team bounds',()=>{
  const f=fixture();f.high.write('numsid',0n,1);assert.throws(()=>done(f.run()),/zero/i);assert.equal(f.m.read(f.locals.n),16n);assert.equal(f.m.read(f.locals.ib),2n);assert.equal(f.m.read(f.locals.ie),2n);
});
test('BASBLD reads PLAYER only after the unconditional division completes',()=>{
  const f=fixture();f.base(1,1,500n);f.base(2,1,500n);const integer=f.io.integer;let first=true;
  f.io.integer=function*(op,l,r){const n=yield*integer(op,l,r);if(op==='div'&&first){first=false;yield 'division';}return n;};const g=f.run();assert.equal(g.next().value,'division');f.low.write('player',0n);done(g);assert.equal(f.strength(1,1),516n);assert.equal(f.strength(2,1),516n);
});
test('BASBLD reads current TEAM after division rather than caching entry team',()=>{
  const f=fixture(),assign=f.io.assign;let first=true;f.io.assign=function*(d,v){yield*assign(d,v);if(first){first=false;f.low.write('team',2n);}};f.base(1,1,500n);f.base(2,1,500n);f.high.write('numsid',5n,2);done(f.run());assert.equal(f.m.read(f.locals.n),5n);assert.equal(f.strength(1,1),505n);assert.equal(f.strength(2,1),500n);
});
test('BASBLD logical PLAYER interpretation is required instead of host truthiness',()=>{
  const f=fixture();f.low.write('player',1n);f.base(1,1,500n);done(f.run());assert.equal(f.strength(1,1),516n);f.io.logical=w=>w!==0n;done(f.run());assert.equal(f.strength(1,1),516n);assert.equal(f.m.read(f.locals.n),8n);
});
test('BASBLD captures IE as a loop bound but reads future base slots live',()=>{
  const f=fixture();f.low.write('player',0n);f.base(1,1,500n);const assign=f.io.assign;f.io.assign=function*(d,v){const a=d();yield*assign(d,v);if(a===f.high.address('base',1,3,1)){f.m.write(f.locals.ie,1n);f.base(2,10,500n);}};done(f.run());assert.equal(f.strength(2,10),516n);assert.equal(f.m.read(f.locals.j),3n);
});
test('BASBLD reads N again for each live base',()=>{
  const f=fixture();f.base(2,1,500n);f.base(2,2,500n);const assign=f.io.assign;f.io.assign=function*(d,v){const a=d();yield*assign(d,v);if(a===f.high.address('base',1,3,2))f.m.write(f.locals.n,100n);};done(f.run());assert.equal(f.strength(2,1),508n);assert.equal(f.strength(2,2),600n);
});
test('BASBLD source live test does not replace the later strength read inside its expression',()=>{
  const f=fixture();f.base(2,1,500n);const assign=f.io.assign;f.io.assign=function*(d,v){if(d()===f.high.address('base',1,3,2)){yield 'base';}yield*assign(d,v);};const g=f.run();assert.equal(g.next().value,'base');f.base(2,1,-20n);done(g);assert.equal(f.strength(2,1),-12n);
});
test('BASBLD base addition wraps before the minimum under the explicit compiler fixture',()=>{
  const f=fixture();f.base(2,1,MAX_INTEGER);done(f.run());assert.equal(f.strength(2,1),MIN_INTEGER+7n);
});
test('BASBLD NUMPLY+1 uses full-word compiler addition before division',()=>{
  const f=fixture();f.low.write('player',0n);f.high.write('numply',MAX_INTEGER);f.base(1,1,500n);done(f.run());assert.equal(f.m.read(f.locals.n),0n);assert.equal(f.strength(1,1),500n);
});
test('BASBLD unmatched TEAM follows the source IB=1 path and reads that TEAM NUMSID word',()=>{
  const f=fixture();f.low.write('team',0n);f.high.write('numsid',5n,0);f.base(1,1,500n);done(f.run());assert.equal(f.m.read(f.locals.ib),1n);assert.equal(f.m.read(f.locals.ie),1n);assert.equal(f.m.read(f.locals.n),5n);assert.equal(f.strength(1,1),505n);
});
test('BASBLD retains partial rebuilding when a later compiler assignment fails',()=>{
  const f=fixture();f.base(2,1,500n);f.base(2,2,500n);const assign=f.io.assign;f.io.assign=function*(d,v){if(d()===f.high.address('base',2,3,2))throw new Error('assignment fault');yield*assign(d,v);};assert.throws(()=>done(f.run()),/assignment fault/);assert.equal(f.strength(2,1),508n);assert.equal(f.strength(2,2),500n);
});
test('Turn calls actual BASBLD between defense profiling and Romulan/score processing',()=>{
  const f=fixture();f.high.write('numply',1n);f.high.write('romopt',-1n);f.low.write('tpoint',9n,1);f.base(2,1,500n);const events:string[]=[];
  const io:TurnStatementServices<string>={logical:f.io.logical,integer:f.compilerInteger,assign:f.io.assign,*repair(){assert.fail();},*debugLine(op,name){events.push(`${op}:${name}`);},*baspha(){events.push('baspha');},*plnatk(){events.push('plnatk');f.high.write('numsid',5n,1);},*basbld(){events.push('basbld');yield*f.run();},*romdrv(){events.push('romdrv');assert.equal(f.strength(2,1),505n);assert.equal(f.high.read('score',1,1),0n);},*out(){assert.fail();},*odec(){assert.fail();}};
  done(turnStatements(f.high,f.low,false,{i:13100n,d1:13101n,d2:13102n},io));assert.equal(f.high.read('score',1,1),9n);assert.equal(f.high.read('dotime'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.deepEqual(events,['timin:BASPHA','baspha','timout:BASPHA','timin:PLNATK','plnatk','timout:PLNATK','timin:BASBLD','basbld','timout:BASBLD','romdrv']);
});
