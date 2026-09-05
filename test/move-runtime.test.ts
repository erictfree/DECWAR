import test from 'node:test';
import assert from 'node:assert/strict';
import { moveRuntimeFixture as fixture } from './fixtures/move-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { orderedRational as real } from './support/rational-real.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import type { CommandLoopServices,LoopContext } from '../src/game/command-loop.ts';
const locking=(f:ReturnType<typeof fixture>)=>f.events.filter(e=>e.startsWith('lock:')||e.startsWith('unlock:'));
const lockAddress=(f:ReturnType<typeof fixture>,i:number)=>f.high.address('board',i);

for(const [id,entry,line] of [[11,'move','MOVE 12 20'],[9,'impuls','IMPULSE 11 20']] as const){
  for(const outcome of ['normal','alternate','dead'] as const)test(`Memory ${entry} dispatch follows ${outcome} return through live PTIME and ALIVE`,()=>{
    const f=fixture(line),calls:string[]=[];
    if(outcome==='alternate')f.high.write('shpdam',BigInt(K.KCRIT),1,entry==='move'?K.KDWARP:K.KDIMP);
    const ctx:LoopContext={get who(){return Number(f.low.read('who'));},set who(v){f.low.write('who',BigInt(v));},player:-1n,
      get ptime(){return f.low.read('ptime');},set ptime(v){f.low.write('ptime',v);},shared:{players:f.views.high.players}};
    const io:CommandLoopServices<string>={
      *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},
      *invoke(call){assert.deepEqual(call,{routine:entry});const result=yield*f.run(entry);if(outcome==='dead')f.high.write('alive',0n,1);return result;},
      movementContinuation(alive){calls.push('alive');assert.equal(alive,f.high.read('alive',1));return outcome==='dead'?'leave':'repair';},
      *leave(){calls.push('leave');yield 'exit';throw new Error('fixture exit transfer');},
      *finishTurn(repair){assert.equal(repair,true);assert.equal(ctx.ptime,2600n);calls.push('repair');yield 'turn';},
    };
    const g=dispatchCommand(ctx,id,io);
    if(outcome==='alternate'){assert.equal(g.next().done,true);assert.deepEqual(calls,[]);assert.equal(ctx.ptime,99n);assert.equal(f.ship.v,10);}
    else if(outcome==='dead'){assert.equal(g.next().value,'exit');assert.deepEqual(calls,['alive','leave']);assert.equal(ctx.ptime,2600n);assert.throws(()=>g.next(),/fixture exit transfer/);}
    else{assert.equal(g.next().value,'turn');assert.deepEqual(calls,['alive','repair']);assert.equal(g.next().done,true);assert.equal(f.ship.v,entry==='move'?12:11);}
  });
}

test('Memory MOVE composes LOCATE, CHECK, raw locks/board/clocks and commits PTIME',()=>{
  const f=fixture();assert.deepEqual(finish(f.run()),{alternateReturn:false,pause:2600n});assert.deepEqual([f.ship.v,f.ship.h,f.ship.energy,f.ship.condition,f.ship.docked],[12,20,9840n,K.GREEN,false]);
  assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.views.high.board.disp(12,20),101);assert.equal(f.text(),'');assert.equal(f.low.read('ptime'),2600n);
  assert.deepEqual(locking(f),[`lock:${lockAddress(f,282)}`,`lock:${lockAddress(f,232)}`,`unlock:${lockAddress(f,232)}`,`unlock:${lockAddress(f,282)}`]);assert.equal(f.events.filter(e=>e==='enq').length,2);assert.equal(f.events.filter(e=>e==='deq').length,2);assert.equal(f.locks.read('locked'),0n);for(let i=0;i<20;i++)assert.equal(f.locks.read('loktab',i),0n);
});
for(const entry of ['move','impuls'] as const)test(`Memory ${entry} critical engine damage returns before clock/RNG/input`,()=>{
  const f=fixture();f.high.write('shpdam',BigInt(K.KCRIT),1,entry==='move'?K.KDWARP:K.KDIMP);assert.deepEqual(finish(f.run(entry)),{alternateReturn:true});assert.deepEqual(f.events,[entry==='move'?'wrpdam':'impdam']);assert.equal(f.text(),M[entry==='move'?'wrpdam':'impdam'].text+'\r\n');assert.equal(f.ship.docked,true);assert.equal(f.low.read('ptime'),99n);assert.equal(f.m.read(f.locals.iflg),entry==='move'?0n:1n);
});
test('Memory MOVE consumes the initial random draw before invalid coordinate input',()=>{
  const f=fixture('MOVE WRONG');assert.equal(finish(f.run()).alternateReturn,true);assert.deepEqual(f.events,['clock','iran:4000','locate']);assert.equal(f.ship.docked,true);assert.equal(f.ship.energy,10000n);assert.equal(f.m.read(f.locals.randam),1234n);
});
test('Memory MOVE waits for repeated RELOC results without resetting its original deadline',()=>{
  const f=fixture('MOVE'),g=f.run();assert.equal(g.next().value,'input');f.editor.feed('ABSOLUTE\n');assert.equal(g.next().value,'input');f.editor.feed('12 20\n');f.clock[0]=5000n;
  assert.deepEqual(finish(g),{alternateReturn:false,pause:-1900n});assert.equal(f.ship.v,12);assert.equal(f.events.filter(e=>e==='iran:4000').length,1);
});
for(const format of [-1,0,1])test(`Memory MOVE same-position retry preserves TEM and exact output at verbosity ${format}`,()=>{
  const f=fixture('MOVE 10 20',format),g=f.run();assert.equal(g.next().value,'input');assert.equal(f.text(),M[format<=0?'error2':'error1'].text+'\r\n'+M.coord1.text);f.editor.feed('12 20\n');finish(g);assert.equal(f.m.read(f.locals.tem),2n);assert.equal(f.ship.v,12);
});
test('Memory MOVE label-600 RELOC zero is followed by relative conversion without a count retry',()=>{
  const f=fixture('MOVE 10 20'),locate=f.io.locate;let n=0;f.io.locate=function*(...a){if(++n===1)return yield*locate(...a);f.low.write('vallst',12n,1);f.low.write('vallst',20n,2);return 0n;};assert.equal(finish(f.run()).alternateReturn,false);assert.equal(n,2);assert.equal(f.m.read(f.locals.tem),2n);
});
test('Memory IMPULS moves one diagonal sector despite damaged warp engines',()=>{
  const f=fixture('IMPULSE 11 21');f.high.write('shpdam',99999n,1,K.KDWARP);assert.equal(finish(f.run('impuls')).alternateReturn,false);assert.deepEqual([f.ship.v,f.ship.h,f.ship.energy],[11,21,9960n]);
});
for(const format of [-1,0,1])test(`Memory IMPULS rejects distance after undocking and computer RAN at verbosity ${format}`,()=>{
  const f=fixture('IMPULSE 12 20',format);f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDCOMP);f.damage.draws.push('.75');assert.equal(finish(f.run('impuls')).alternateReturn,true);assert.equal(f.ship.docked,false);assert.equal(f.ship.condition,K.GREEN);assert.equal(f.ship.energy,10000n);assert.ok(f.events.includes('ran'));assert.equal(f.text(),(format===K.LONG?M.move1a.text:'')+M.move1b.text+'\r\n');
});
for(const format of [-1,0,1])for(const damage of [-1n,0n,1n])test(`Memory MOVE range limit retains output without newline, verbosity ${format}, damage ${damage}`,()=>{
  const f=fixture('MOVE 17 20',format);f.high.write('shpdam',damage,1,K.KDWARP);assert.equal(finish(f.run()).alternateReturn,true);assert.equal(f.text(),M[format<=0?'move3s':'move3l'].text+(damage>0n?'3.':damage===0n?'6.':''));assert.equal(f.ship.docked,false);assert.equal(f.ship.energy,10000n);
});
for(const format of [-1,0,1])test(`Memory MOVE damaged warp limit rejects before CHECK at verbosity ${format}`,()=>{
  const f=fixture('MOVE 14 20',format);f.high.write('shpdam',1n,1,K.KDWARP);assert.equal(finish(f.run()).alternateReturn,true);assert.equal(f.text(),M[format<=0?'move2s':'move2l'].text+'\r\n');assert.ok(!f.events.includes('check'));
});
for(const distance of [5,6])for(const roll of [80n,81n,90n,91n])test(`Memory MOVE warp ${distance} heat roll ${roll} follows strict source thresholds`,()=>{
  const f=fixture(`MOVE ${10+distance} 20`);f.damage.integers[1]=roll;assert.equal(finish(f.run()).alternateReturn,false);assert.equal(f.high.read('shpdam',1,K.KDWARP),(distance===5?roll>90n:roll>80n)?1234n:0n);assert.equal(f.ship.v,10+distance);assert.equal(f.ship.energy,10000n-40n*BigInt(distance*distance));assert.deepEqual(f.events.filter(e=>e.startsWith('iran:')),['iran:4000','iran:100']);
});
for(const format of [-1,0,1])test(`Memory MOVE heat messages compose raw OFLT at verbosity ${format}`,()=>{
  const f=fixture('MOVE 16 20',format);f.damage.integers[1]=100n;finish(f.run());assert.equal(f.text(),(format===K.LONG?M.engoff.text:'')+M[format===K.SHORT?'move5s':'move5l'].text+'\r\n'+M.move06.text+(format===K.SHORT?'123':'123.4')+M.move08.text+'\r\n'+(format===K.SHORT?'':M.move09.text+' 4.1'+M.strdat.text+'\r\n'));assert.equal(f.m.read(f.locals.time),41n);
});
for(const shield of [-1n,0n,1n])test(`Memory MOVE blocked path charges requested range with shield condition ${shield}`,()=>{
  const f=fixture('MOVE 14 20');f.ship.shieldCondition=shield;f.views.high.board.setdsp(11,20,301);finish(f.run());assert.equal(f.ship.energy,10000n-640n*(shield>0n?2n:1n));assert.equal(f.ship.v,10);assert.deepEqual(locking(f),[]);assert.equal(f.text(),M.move10.text+'\r\n');
});
test('Memory MOVE permits negative remaining energy at the inclusive galaxy boundary',()=>{
  const f=fixture('MOVE 75 20');f.ship.v=74;f.ship.energy=0n;f.views.high.board.setdsp(10,20,0);f.views.high.board.setdsp(74,20,101);finish(f.run());assert.equal(f.ship.v,75);assert.equal(f.ship.energy,-40n);
});
test('MOVE failed destination lock preserves energy charge and PTIME without cleanup',()=>{
  const f=fixture();f.io.lock=function*(){yield 'lock';f.low.write('lkfail',-1n);};const g=f.run();assert.equal(g.next().value,'lock');assert.equal(f.ship.energy,9840n);assert.equal(f.ship.docked,false);assert.deepEqual(finish(g),{alternateReturn:true});assert.equal(f.ship.v,10);assert.equal(f.low.read('ptime'),99n);assert.equal(f.clock.length,1);assert.equal(f.events.filter(e=>e.startsWith('unlock')).length,0);
});
test('MOVE failed source lock awaits destination unlock before alternate return',()=>{
  const f=fixture(),lock=f.io.lock,unlock=f.io.unlock;let n=0;f.io.lock=function*(a){if(++n===1)yield*lock(a);else f.low.write('lkfail',-1n);};f.io.unlock=function*(a){yield 'release';yield*unlock(a);};const g=f.run();assert.equal(g.next().value,'release');assert.equal(f.locks.read('loktab',19),lockAddress(f,282));assert.equal(f.ship.energy,9840n);assert.equal(finish(g).alternateReturn,true);assert.equal(f.locks.read('loktab',19),0n);assert.equal(f.low.read('ptime'),99n);
});
test('MOVE same packed board word uses one raw ENQ/DEQ',()=>{
  const f=fixture('MOVE 10 21');finish(f.run());assert.deepEqual(locking(f),[`lock:${lockAddress(f,232)}`,`unlock:${lockAddress(f,232)}`]);assert.equal(f.events.filter(e=>e==='enq').length,1);assert.equal(f.events.filter(e=>e==='deq').length,1);
});
test('MOVE raw ENQ suspension retains remembered lock and charged energy before board writes',()=>{
  const f=fixture(),enq=f.lockIO.enq;let first=true;f.lockIO.enq=function*(){if(first){first=false;yield 'enq';}return yield*enq();};const g=f.run();assert.equal(g.next().value,'enq');assert.equal(f.locks.read('locked'),lockAddress(f,282));assert.equal(f.locks.read('loktab',19),lockAddress(f,282));assert.equal(f.ship.energy,9840n);assert.equal(f.views.high.board.disp(10,20),101);finish(g);assert.equal(f.ship.v,12);
});
test('MOVE does not recheck destination and clears live source coordinates after lock wait',()=>{
  const f=fixture(),lock=f.io.lock;let first=true;f.io.lock=function*(a){if(first){first=false;yield 'lock';}yield*lock(a);};const g=f.run();assert.equal(g.next().value,'lock');f.views.high.board.setdsp(12,20,301);f.ship.v=9;f.views.high.board.setdsp(9,20,101);finish(g);assert.equal(f.views.high.board.disp(12,20),101);assert.equal(f.views.high.board.disp(9,20),0);assert.equal(f.views.high.board.disp(10,20),101);assert.ok(f.events.includes(`unlock:${lockAddress(f,232)}`));
});
test('MOVE towing unlocks first and preserves fractional board/stored-coordinate mismatch',()=>{
  const f=fixture('MOVE 12 21');f.high.write('trstat',2n,1);const tow=f.views.high.players[2].ship;Object.assign(tow,{v:9,h:20});f.views.high.board.setdsp(9,20,102);f.damage.draws.push('.75');finish(f.run());assert.equal(f.ship.energy,9520n);assert.deepEqual([f.ship.v,f.ship.h],[12,21]);assert.equal(f.views.high.board.disp(11,21),102);assert.deepEqual([tow.v,tow.h],[11,20]);assert.equal(f.views.high.board.disp(11,20),0);assert.ok(f.events.indexOf(`unlock:${lockAddress(f,282)}`)<f.events.indexOf('set:11,21,102'));
});
test('MOVE towing deposits before clearing even when the two cells coincide',()=>{
  const f=fixture();f.high.write('trstat',2n,1);Object.assign(f.views.high.players[2].ship,{v:11,h:20});f.views.high.board.setdsp(11,20,102);f.io.check=function*(){f.out.write('h1',12n);f.out.write('v1',20n);f.out.write('dcode',0n);f.out.write('dhs',f.realWord('1'));f.out.write('dvs',f.realWord('0'));};finish(f.run());assert.equal(f.views.high.board.disp(11,20),0);assert.equal(f.high.read('shpcon',2,K.KVPOS),11n);
});
test('MOVE blocked tow with shields charges sixfold without reading the partner',()=>{
  const f=fixture('MOVE 14 20');f.high.write('trstat',99999n,1);f.ship.shieldCondition=1n;f.views.high.board.setdsp(11,20,102);finish(f.run());assert.equal(f.ship.energy,6160n);assert.equal(f.ship.v,10);assert.ok(!f.events.some(e=>e.startsWith('set:')));
});
test('MOVE awaits CHECK on actual argument addresses and charges current IA after return',()=>{
  const f=fixture(),check=f.io.check;f.io.check=function*(a){assert.deepEqual(a,{h:f.high.address('shpcon',1,K.KVPOS),v:f.high.address('shpcon',1,K.KHPOS),dh:f.locals.iv,dv:f.locals.ih,dist:f.locals.ia,displ:f.locals.d});yield*check(a);yield 'check';};const g=f.run();assert.equal(g.next().value,'check');assert.equal(f.ship.energy,10000n);f.m.write(f.locals.ia,3n);finish(g);assert.equal(f.ship.energy,9640n);
});
test('MOVE raw MSTIME wait precedes live TIM0 and SLWEST reads for deadline',()=>{
  const f=fixture(),mstime=f.clockIO.mstime;let first=true;f.clockIO.mstime=function*(){if(first){first=false;yield 'clock';}yield*mstime();};const g=f.run();assert.equal(g.next().value,'clock');f.high.write('tim0',50n);f.high.write('slwest',3n);finish(g);assert.equal(f.m.read(f.locals.v),4050n);assert.equal(f.low.read('ptime'),3600n);
});
test('MOVE first random failure preserves deadline and zero D before RANDAM assignment',()=>{
  const f=fixture();f.m.write(f.locals.randam,77n);f.io.iran=function*(){throw new Error('random fault');};assert.throws(()=>finish(f.run()),/random fault/);assert.equal(f.m.read(f.locals.v),3100n);assert.equal(real.compare(f.realAt(f.locals.d),real.literal('0')),0);assert.equal(f.m.read(f.locals.randam),77n);assert.equal(f.ship.docked,true);
});
test('MOVE source-clear failure leaves locks held and prevents coordinate and PTIME updates',()=>{
  const f=fixture();f.rawBoard.io.dpb=function*(){throw new Error('deposit fault');};assert.throws(()=>finish(f.run()),/deposit fault/);assert.equal(f.ship.energy,9840n);assert.equal(f.ship.v,10);assert.equal(f.low.read('ptime'),99n);assert.equal(f.locks.read('loktab',19),lockAddress(f,282));assert.equal(f.locks.read('loktab',18),lockAddress(f,232));assert.equal(f.events.filter(e=>e==='deq').length,0);
});
test('MOVE arrival fault retains a cleared source cell and both held locks',()=>{
  const f=fixture(),dpb=f.rawBoard.io.dpb;let calls=0;f.rawBoard.io.dpb=function*(){if(++calls===2)throw new Error('arrival fault');yield*dpb();};assert.throws(()=>finish(f.run()),/arrival fault/);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.views.high.board.disp(12,20),0);assert.equal(f.ship.v,10);assert.equal(f.low.read('ptime'),99n);assert.equal(f.events.filter(e=>e==='deq').length,0);
});
test('MOVE awaits raw DEQ after coordinate stores and before the final clock',()=>{
  const f=fixture(),deq=f.unlockIO.deq;let first=true;f.unlockIO.deq=function*(){if(first){first=false;yield 'deq';}return yield*deq();};const g=f.run();assert.equal(g.next().value,'deq');assert.equal(f.ship.v,12);assert.equal(f.views.high.board.disp(12,20),101);assert.equal(f.clock.length,1);assert.equal(f.low.read('ptime'),99n);finish(g);assert.equal(f.low.read('ptime'),2600n);
});
test('MOVE repeats damage predicates after a yielded maximum-speed suffix',()=>{
  const f=fixture('MOVE 17 20'),out=f.io.out2c;f.high.write('shpdam',1n,1,K.KDWARP);f.io.out2c=function*(s){yield*out(s);if(s==='3.')yield 'suffix';};const g=f.run();assert.equal(g.next().value,'suffix');f.high.write('shpdam',0n,1,K.KDWARP);finish(g);assert.equal(f.text(),M.move3s.text+'3.6.');
});
test('MOVE heat output finishes before applying warp damage and starting CHECK',()=>{
  const f=fixture('MOVE 16 20'),oflt=f.io.oflt;f.damage.integers[1]=100n;let first=true;f.io.oflt=function*(...a){if(first){first=false;yield 'number';}yield*oflt(...a);};const g=f.run();assert.equal(g.next().value,'number');assert.equal(f.high.read('shpdam',1,K.KDWARP),0n);assert.ok(!f.events.includes('check'));f.m.write(f.locals.randam,1000n);finish(g);assert.equal(f.high.read('shpdam',1,K.KDWARP),1000n);assert.ok(f.text().includes('100.0'));
});
test('MOVE final clock failure preserves completed movement and unlocked state with old PTIME',()=>{
  const f=fixture(),mstime=f.clockIO.mstime;let n=0;f.clockIO.mstime=function*(){if(++n===2)throw new Error('clock fault');yield*mstime();};assert.throws(()=>finish(f.run()),/clock fault/);assert.equal(f.ship.v,12);assert.equal(f.ship.energy,9840n);assert.equal(f.low.read('ptime'),99n);assert.equal(f.events.filter(e=>e==='deq').length,2);
});
