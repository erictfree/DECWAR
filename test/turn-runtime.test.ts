import test from 'node:test';
import assert from 'node:assert/strict';
import { turnStatements } from '../src/game/turn-statements.ts';
import type { TurnStatementServices } from '../src/game/turn-statements.ts';
import { rebuildBaseStatements } from '../src/game/base-rebuild-statements.ts';
import { repairRuntimeFixture } from './fixtures/repair-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { add36,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const f=repairRuntimeFixture();f.low.write('team',1n);f.low.write('player',-1n);f.high.write('numply',2n);f.high.write('numsid',1n,1);f.high.write('numsid',1n,2);
  const locals={i:12700n,d1:12701n,d2:12702n},labels={lifdam:12800n,strdat:12820n};f.h.put(labels.lifdam,M.lifdam.text);f.h.put(labels.strdat,M.strdat.text);f.m.write(locals.d1,71n);f.m.write(locals.d2,72n);
  const events:string[]=[],prepare=(words:bigint[])=>{loadArgumentBlock(f.m,10800n,words);selectArgumentBlock(f.r,10800n);};
  const io:TurnStatementServices<string>={logical:w=>w<0n,integer:f.io.integer,assign:f.io.assign,
    *repair(mode){events.push('repair');f.m.write(f.il,BigInt(mode));return yield*f.repair();},
    *debugLine(operation,routine){events.push(`${operation}:${routine}`);}, // Explicit fixture of column-D selection, not actual timer execution.
    *baspha(){events.push('baspha');},*plnatk(){events.push('plnatk');},
    *basbld(){events.push('basbld');yield*rebuildBaseStatements(f.high,f.low,{ib:13000n,ie:13001n,n:13002n,j:13003n,i:13004n},{logical:w=>io.logical(w),integer:f.io.integer,assign:f.io.assign,enterTeams:(s,l)=>s<=l});},
    *romdrv(d1,d2){events.push('romdrv');assert.equal(d1,locals.d1);assert.equal(d2,locals.d2);},
    *out(name,lines){events.push(name);f.m.write(12711n,BigInt(lines));prepare([labels[name],12711n]);yield*f.rt.run('out');},
    *odec(v,w){events.push('odec');f.m.write(12710n,BigInt(w));prepare([v,12710n]);yield*f.rt.run('odec');},
  }; // Explicit compiler arithmetic/assignment/LOGICAL/call fixtures; BASPHA/PLNATK/ROMDRV callbacks are observed boundaries, BASBLD runs its body.
  return {...f,locals,repairLocals:f.locals,repairEvents:f.events,events,io,turn:(repair=false)=>turnStatements(f.high,f.low,repair,locals,io)};
}
test('REPAIR dispatch composes resumable DAMAGE, automatic REPAIR and end-of-turn memory updates',()=>{
  const f=fixture();f.parse('REPAIR 50 DAMAGE SH');f.low.write('tpoint',9n,1);
  const ctx={who:1,player:-1n,get ptime(){return f.low.read('ptime');},set ptime(n){f.low.write('ptime',n);},shared:{players:[{alive:0n},{alive:-1n}]}};
  done(dispatchCommand(ctx,18,{*invoke(){return yield*f.repair();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},movementContinuation(){assert.fail();},*finishTurn(auto){yield*f.turn(auto);}}));
  assert.equal(f.text(),'\r\nSH   250\r\n');assert.equal(f.high.read('shpdam',1,1),2200n);assert.equal(f.high.read('dotime'),1n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.high.read('tmturn',1),1n);assert.equal(f.high.read('score',1,1),9n);assert.equal(f.high.read('tmscor',1,1),9n);assert.equal(f.low.read('tpoint',1),0n);assert.equal(ctx.ptime,3000n);assert.deepEqual(f.events,['repair']);
});
test('Turn entry 3500 skips repair and leaves PTIME and PLAYER untouched',()=>{
  const f=fixture();f.low.write('player',0n);done(f.turn());assert.equal(f.high.read('shpdam',1,1),3000n);assert.equal(f.low.read('ptime'),77n);assert.equal(f.low.read('player'),0n);assert.equal(f.high.read('dotime'),1n);assert.deepEqual(f.events,[]);
});
test('Turn repair alternate return still resumes at label 3500',()=>{
  const f=fixture();f.io.repair=function*(){return {alternateReturn:true,pause:-10n};};done(f.turn(true));assert.equal(f.high.read('dotime'),1n);assert.equal(f.low.read('ptime'),77n);
});
test('Turn rereads NUMPLY after automatic repair and resets DOTIME before defense calls',()=>{
  const f=fixture(),repair=f.io.repair;f.io.repair=function*(mode){yield*repair(mode);f.high.write('numply',1n);};f.io.baspha=function*(){assert.equal(f.high.read('dotime'),0n);f.events.push('baspha');};done(f.turn(true));
  assert.deepEqual(f.events,['repair','timin:BASPHA','baspha','timout:BASPHA','timin:PLNATK','plnatk','timout:PLNATK','timin:BASBLD','basbld','timout:BASBLD']);
});
test('Turn maintains defense and column-D call order across suspension',()=>{
  const f=fixture();f.high.write('numply',1n);f.io.baspha=function*(){f.events.push('baspha');yield 'defense';};const g=f.turn();assert.equal(g.next().value,'defense');assert.deepEqual(f.events,['timin:BASPHA','baspha']);assert.equal(f.high.read('shpcon',1,K.KNTURN),0n);done(g);assert.equal(f.events.at(-1),'timout:BASBLD');assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
test('Turn profiling policy can omit column-D effects without omitting defense bodies',()=>{
  const f=fixture();f.high.write('numply',1n);f.io.debugLine=function*(){};done(f.turn());assert.deepEqual(f.events,['baspha','plnatk','basbld']);
});
test('Turn does not invent profiling cleanup if a defense transfer fails',()=>{
  const f=fixture();f.high.write('numply',1n);f.io.baspha=function*(){throw new Error('defense transfer');};assert.throws(()=>done(f.turn()),/defense transfer/);assert.deepEqual(f.events,['timin:BASPHA']);assert.equal(f.high.read('dotime'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),0n);
});
test('Turn ROMOPT is read after the final profiling call and passes actual D1/D2 words',()=>{
  const f=fixture();f.high.write('numply',1n);const debug=f.io.debugLine;f.io.debugLine=function*(op,routine){yield*debug(op,routine);if(op==='timout'&&routine==='BASBLD')f.high.write('romopt',-1n);};f.io.romdrv=function*(d1,d2){assert.equal(f.m.read(d1),71n);assert.equal(f.m.read(d2),72n);f.m.write(d2,88n);f.low.write('player',0n);f.events.push('romdrv');};done(f.turn());assert.equal(f.events.at(-1),'romdrv');assert.equal(f.m.read(f.locals.d2),88n);assert.equal(f.low.read('player'),0n);
});
test('Turn ROMOPT uses the explicit compiler logical policy rather than host nonzero coercion',()=>{
  const f=fixture();f.high.write('numply',1n);f.high.write('romopt',1n);done(f.turn());assert.ok(!f.events.includes('romdrv'));f.io.logical=w=>w!==0n;done(f.turn());assert.ok(f.events.includes('romdrv'));
});
test('Turn current WHO and TEAM after ROMDRV determine ship and team stardates',()=>{
  const f=fixture();f.high.write('numply',1n);f.high.write('romopt',-1n);f.io.romdrv=function*(){f.low.write('who',2n);f.low.write('team',2n);};done(f.turn());assert.equal(f.high.read('shpcon',1,K.KNTURN),0n);assert.equal(f.high.read('shpcon',2,K.KNTURN),1n);assert.equal(f.high.read('tmturn',1),0n);assert.equal(f.high.read('tmturn',2),1n);
});
test('Turn critical life-support damage reduces reserves and emits original output through raw ODEC',()=>{
  const f=fixture();f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDLIFE);f.high.write('shpcon',5n,1,K.KLFSUP);done(f.turn());assert.equal(f.high.read('shpcon',1,K.KLFSUP),4n);assert.equal(f.text(),M.lifdam.text+'4'+M.strdat.text+'\r\n');assert.equal(f.r.s,f.s.initialStackWord);
});
test('Turn automatic repair can remove the critical condition before the warning test',()=>{
  const f=fixture();f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDLIFE);f.high.write('shpcon',5n,1,K.KLFSUP);done(f.turn(true));assert.equal(f.high.read('shpdam',1,K.KDLIFE),BigInt(K.KCRIT)-300n);assert.equal(f.high.read('shpcon',1,K.KLFSUP),5n);assert.equal(f.text(),'');
});
test('Turn docked ships retain reserves but negative reserves still mark hull fatal',()=>{
  const f=fixture();f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDLIFE);f.high.write('docked',-1n,1);f.high.write('shpcon',-1n,1,K.KLFSUP);done(f.turn());assert.equal(f.high.read('shpcon',1,K.KLFSUP),-1n);assert.equal(f.high.read('shpcon',1,K.KSDAM),BigInt(K.KENDAM));assert.equal(f.text(),M.lifdam.text+'-1'+M.strdat.text+'\r\n');
});
test('Turn prompt suppression is evaluated after depletion and uses a required LOGICAL policy',()=>{
  const f=fixture();f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDLIFE);f.low.write('prtype',1n);done(f.turn());assert.ok(f.text().includes(M.lifdam.text));assert.equal(f.high.read('shpcon',1,K.KSDAM),BigInt(K.KENDAM));f.emitted.length=0;f.io.logical=w=>w!==0n;done(f.turn());assert.equal(f.text(),'');
});
test('Turn warning selects current reserves after its heading, and scores after its suffix',()=>{
  const f=fixture();f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDLIFE);f.high.write('shpcon',5n,1,K.KLFSUP);f.high.write('shpcon',9n,2,K.KLFSUP);const out=f.io.out;
  f.io.out=function*(name,lines){yield*out(name,lines);if(name==='lifdam')f.low.write('who',2n);else{f.low.write('team',2n);f.low.write('tpoint',17n,1);}};done(f.turn());assert.equal(f.text(),M.lifdam.text+'9'+M.strdat.text+'\r\n');assert.equal(f.high.read('score',1,1),0n);assert.equal(f.high.read('score',1,2),17n);assert.equal(f.high.read('tmscor',2,1),17n);
});
test('Turn warning suspension precedes score-loop initialization and point commits',()=>{
  const f=fixture();f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDLIFE);f.high.write('shpcon',5n,1,K.KLFSUP);f.low.write('tpoint',19n,1);f.m.write(f.locals.i,77n);f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'byte';};const g=f.turn();assert.equal(g.next().value,'byte');assert.equal(f.m.read(f.locals.i),77n);assert.equal(f.high.read('score',1,1),0n);assert.equal(f.low.read('tpoint',1),19n);done(g);assert.equal(f.high.read('score',1,1),19n);assert.equal(f.low.read('tpoint',1),0n);
});
test('Turn rereads TPOINT separately for player and team score before clearing it',()=>{
  const f=fixture();f.low.write('tpoint',10n,1);const assign=f.io.assign;f.io.assign=function*(d,v){const a=d();yield*assign(d,v);if(a===f.high.address('score',1,1))f.low.write('tpoint',20n,1);};done(f.turn());assert.equal(f.high.read('score',1,1),10n);assert.equal(f.high.read('tmscor',1,1),20n);assert.equal(f.low.read('tpoint',1),0n);
});
test('Turn score categories traverse all eight slots and preserve independent totals',()=>{
  const f=fixture();for(let i=1;i<=K.KNPOIN;i++){f.low.write('tpoint',BigInt(i),i);f.high.write('score',100n,i,1);f.high.write('tmscor',200n,1,i);}done(f.turn());
  for(let i=1;i<=K.KNPOIN;i++){assert.equal(f.high.read('score',i,1),100n+BigInt(i));assert.equal(f.high.read('tmscor',1,i),200n+BigInt(i));assert.equal(f.low.read('tpoint',i),0n);}assert.equal(f.m.read(f.locals.i),9n);
});
test('Turn counter and score arithmetic uses the supplied 36-bit policy',()=>{
  const f=fixture();f.high.write('dotime',MAX_INTEGER);f.high.write('shpcon',MAX_INTEGER,1,K.KNTURN);f.high.write('tmturn',MAX_INTEGER,1);f.high.write('score',MAX_INTEGER,1,1);f.low.write('tpoint',1n,1);done(f.turn());assert.equal(f.high.read('dotime'),MIN_INTEGER);assert.equal(f.high.read('shpcon',1,K.KNTURN),MIN_INTEGER);assert.equal(f.high.read('tmturn',1),MIN_INTEGER);assert.equal(f.high.read('score',1,1),MIN_INTEGER);assert.deepEqual(f.events,[]);
});
test('Turn assignment policy retains destination timing during a changed WHO expression',()=>{
  const f=fixture(),integer=f.io.integer;let calls=0;f.io.integer=function*(op,l,r){const n=yield*integer(op,l,r);if(++calls===2)f.low.write('who',2n);return n;};done(f.turn());assert.equal(f.high.read('shpcon',1,K.KNTURN),0n);assert.equal(f.high.read('shpcon',2,K.KNTURN),1n);
});
test('Turn compiler arithmetic failure stops before score clearing',()=>{
  const f=fixture();f.low.write('tpoint',10n,1);const assign=f.io.assign;f.io.assign=function*(d,v){if(d()===f.high.address('tmscor',1,1))throw new Error('compiler assignment fault');yield*assign(d,v);};assert.throws(()=>done(f.turn()),/compiler assignment fault/);assert.equal(f.high.read('score',1,1),10n);assert.equal(f.high.read('tmscor',1,1),0n);assert.equal(f.low.read('tpoint',1),10n);
});
