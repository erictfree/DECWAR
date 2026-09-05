import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { constants as K,messages,ships } from '../src/generated/source-data.ts';
import { halfWords,packAscii,packSixbit,signed36 } from '../src/compat/word36.ts';
import type { StatementCommandCall } from '../src/game/command-loop-statements.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<2000;i++){const step=g.next();if(step.done)return step.value;}throw new Error('test schedule exhausted');}
function fixture(line=''){
  const f=pregameRuntimeFixture([]),b=bindMainLoopRuntime(f);b.policy.debug='omit';b.policy.quit=function*(word){return word<0n?'leave':'next';};b.policy.movement=function*(alive){return alive()<0n?'repair':'leave';};
  for(const [key,w] of [['who',1n],['team',1n],['player',0n],['ptime',0n],['pasflg',0n],['ccflg',0n],['hungup',0n],['addrck',0n],['prtype',0n],['gagmsg',0n],['oflg',-1n],['hcpos',0n],['blank',0n]] as const)f.low.write(key,w);
  f.high.write('nplnet',1n);f.high.write('endflg',0n);f.high.write('comknt',0n);f.high.write('numply',2n);f.high.write('dotime',0n);f.high.write('tim0',0n);f.high.write('docked',0n,1);f.high.write('shpcon',50000n,1,K.KSNRGY);f.high.write('shpcon',0n,1,K.KSDAM);f.high.write('shpcon',BigInt(K.GREEN),1,K.KSPCON);f.high.write('shpcon',1n,1,K.KNTURN);
  for(const ship of ships){f.high.write('hitflg',0n,ship.id);f.high.write('msgflg',0n,ship.id);f.high.write('names',packAscii(ship.symbol),ship.id,3);}
  f.high.write('job',halfWords(12n,34n),1,K.KPPN);f.high.write('job',packSixbit('ALICE '),1,K.KNAM1);f.high.write('job',packSixbit('SMITH '),1,K.KNAM2);f.high.write('alive',-1n,1);f.locks.write('frebie',0n);
  f.getCommand.trapAddress.value=0n;f.endgame.io.etim=function*(){return 2000n;};f.endgame.io.points=function*(){f.m.write(f.endgame.total,789n);};f.clock.splice(0,f.clock.length,3000n);
  if(line)f.editor.feed(line+'\n');const before=f.text().length;
  return {...f,b,run:()=>done(b.run()),quit:()=>done(b.quit()),dispatch:(n:bigint)=>{f.m.write(b.n,n);return done(b.dispatch());},output:()=>f.text().slice(before)};
}
function confirmation(f:ReturnType<typeof fixture>,answer:string){const clear=f.b.io.clear;f.b.io.clear=function*(){yield*clear();f.editor.feed(answer+'\n');};}
test('Main loop raw command input, RADIO, POINTS and confirmed QUIT reach statistics and FREE',()=>{
  const f=fixture('RADIO OFF/POINTS/QUIT');confirmation(f,'YES');assert.throws(f.run,/EXIT transfer/);
  assert.deepEqual(f.b.calls.map(c=>c.routine),['radio','points']);assert.equal(f.b.events.filter(e=>e==='getcmd').length,3);assert.equal(f.high.read('nomsg'),1n);assert.equal(f.low.read('who'),0n);assert.equal(f.statistics.writes.length,1);assert.equal(f.statistics.files.stared[9],789n);assert.equal(f.statistics.files.stared[12],signed36(halfWords(-1n,0n)));assert.ok(f.output().includes(messages.sure00.text));assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);
});
test('QUIT raw CLEAR discards both command tail and pretyped transport input before confirmation',()=>{
  const f=fixture('QUIT/YES\nYES');confirmation(f,'NO');let commands=0;const get=f.b.io.getcmd;f.b.io.getcmd=function*(a){if(commands++===0)yield*get(a);else{f.low.write('who',0n);}};
  assert.equal(f.run(),'pregame');assert.equal(f.statistics.writes.length,0);assert.equal(f.b.events.includes('leave'),false);assert.equal(f.editor.bytes.length,0);assert.ok(f.output().includes(messages.sure00.text));
});
test('QUIT decline returns to GETCMD without resetting the command-local word',()=>{
  const f=fixture('QUIT');confirmation(f,'NO');const get=f.b.io.getcmd;let calls=0;f.b.io.getcmd=function*(a){if(calls++===0)yield*get(a);else{assert.equal(f.m.read(a),16n);assert.equal(f.low.read('player'),-1n);throw new Error('next GETCMD');}};assert.throws(f.run,/next GETCMD/);assert.equal(f.low.read('who'),1n);assert.equal(f.statistics.writes.length,0);
});
for(const answer of ['Y','YE','YES'])test(`QUIT raw EQUAL accepts ${answer} as a YES prefix`,()=>{const f=fixture();confirmation(f,answer);assert.throws(f.quit,/EXIT transfer/);assert.equal(f.statistics.writes.length,1);assert.equal(f.low.read('who'),0n);});
test('QUIT overlong YES token is rejected by raw EQUAL',()=>{const f=fixture();confirmation(f,'YESPLEASE');f.quit();assert.equal(f.statistics.writes.length,0);assert.equal(f.low.read('who'),1n);});
test('QUIT pending CCFLG clears only after its original prompt returns',()=>{
  const f=fixture();f.low.write('ccflg',-1n);const out=f.b.io.outSure;f.b.io.outSure=function*(){yield*out();yield 'prompt';};confirmation(f,'NO');const g=f.b.quit();assert.equal(g.next().value,'prompt');assert.equal(f.low.read('ccflg'),-1n);assert.ok(f.output().endsWith(messages.sure00.text));done(g);assert.equal(f.low.read('ccflg'),0n);
});
test('QUIT prompt failure leaves CCFLG, token tail and transport input untouched',()=>{
  const f=fixture('YES');f.low.write('ccflg',-1n);const before=[...f.editor.bytes],pointer=f.input.pointer;f.b.io.outSure=function*(){throw new Error('prompt fault');};assert.throws(f.quit,/prompt fault/);assert.equal(f.low.read('ccflg'),-1n);assert.deepEqual(f.editor.bytes,before);assert.equal(f.input.pointer,pointer);assert.ok(!f.b.events.includes('clear'));
});
test('QUIT follows compiler HUNGUP logic and skips confirmation on a negative word',()=>{
  const f=fixture();f.low.write('hungup',-1n);assert.throws(f.quit,/EXIT transfer/);assert.ok(!f.b.events.includes('sure'));assert.ok(!f.b.events.includes('gtkn'));assert.equal(f.statistics.writes.length,1);
  const other=fixture();other.low.write('hungup',1n);confirmation(other,'NO');other.quit();assert.ok(other.b.events.includes('sure'));assert.equal(other.statistics.writes.length,0);
});
test('QUIT does not add a second HUNGUP or CCFLG test after GTKN',()=>{
  const f=fixture();confirmation(f,'NO');const gtkn=f.b.io.gtkn;f.b.io.gtkn=function*(){yield*gtkn();f.low.write('hungup',-1n);f.low.write('ccflg',-1n);};f.quit();assert.ok(!f.b.events.includes('leave'));assert.equal(f.low.read('who'),1n);
});
test('QUIT reads TKNLST independent of token type and uses required two-label result policy',()=>{
  const f=fixture();f.b.io.gtkn=function*(){f.low.write('tknlst',packAscii('YES'),1);f.low.write('typlst',BigInt(K.KINT),1);};f.b.policy.quit=function*(word){assert.equal(word,-2n);yield 'two-label';return 'next';};const g=f.b.quit();assert.equal(g.next().value,'two-label');done(g);assert.equal(f.statistics.writes.length,0);
});
test('QUIT without a two-label IF policy stops after input and EQUAL',()=>{
  const f=fixture();delete f.b.policy.quit;confirmation(f,'YES');assert.throws(f.quit,/two-label QUIT IF policy/);assert.equal(f.low.read('ccflg'),0n);assert.equal(f.low.read('who'),1n);assert.equal(f.statistics.writes.length,0);
});
test('All 33 main slots preserve call arguments, alternate labels, profiling names and turn categories',()=>{
  const names=['bases','build','captur','damage','dock','energy','gripe','help','impuls','list','move','news','phacon','planet','points',null,'radio','repair','scan','set','shield','srscan','status','summar','target','tell','time','torp','tractr','type','users','debug','paswrd'];
  const labels=['CMDBA ','CMDBU ','CMDCA ','CMDDA ','CMDDO ','CMDEN ','CMDGR ','CMDHEL','CMDIMP','CMDLIS','CMDMOV','CMDNEW','CMDPHA','CMDPLA','CMDPOI',null,'CMDRAD','CMDREP','CMDSCA','CMDSET','CMDSHI','CMDSRS','CMDSTA','CMDSUM','CMDTAR','CMDTEL','CMDTIM','CMDTOR','CMDTRA','CMDTYP','CMDUSE',null,null];
  for(let id=1;id<=33;id++){
    if(id===16)continue;const f=fixture(),calls:StatementCommandCall[]=[],turns:boolean[]=[];f.b.io.invoke=function*(call){calls.push(call);return 'normal';};f.b.io.finishTurn=function*(auto){turns.push(auto);};f.dispatch(BigInt(id));
    const expected:Record<string,unknown>={routine:names[id-1]};if([2,3,5,9,11,13,18,28].includes(id))expected.alternate=49;if([4,23].includes(id))expected.argument=2;if(id===18)expected.argument=1;if(id===15)expected.argument=false;if(id===30)expected.argument=0;
    assert.deepEqual(calls,[expected]);assert.deepEqual(turns,[2,3,5,9,11,18].includes(id)?[true]:[13,28].includes(id)?[false]:[]);assert.deepEqual(f.b.events.filter(e=>e.startsWith('timin:')||e.startsWith('timout:')),labels[id-1]?[`timin:${labels[id-1]}`,`timout:${labels[id-1]}`]:[]);
  }
});
test('Computed GOTO out-of-range signed words fall through to BASES without narrowing',()=>{
  for(const word of [-34359738368n,-1n,0n,34n,34359738367n]){const f=fixture();f.b.io.invoke=function*(call){assert.deepEqual(call,{routine:'bases'});return 'normal';};f.dispatch(word);assert.equal(f.m.read(f.b.n),word);}
});
test('Every source alternate command skips trailing TIMOUT and all turn or movement work',()=>{
  for(const id of [2,3,5,9,11,13,18,28]){const f=fixture();f.b.io.invoke=function*(){return 'alternate';};f.b.io.finishTurn=function*(){assert.fail();};f.b.io.movementBranch=function*(){assert.fail();};f.dispatch(BigInt(id));assert.equal(f.b.events.length,1);assert.ok(f.b.events[0].startsWith('timin:'));}
});
test('Main dispatch retains PTIME written by the routine and never applies a returned host pause',()=>{
  const f=fixture();f.b.io.invoke=function*(){f.low.write('ptime',123n);yield 'routine';return 'alternate';};f.m.write(f.b.n,11n);const g=f.b.dispatch();assert.equal(g.next().value,'routine');f.low.write('ptime',456n);done(g);assert.equal(f.low.read('ptime'),456n);
});
test('Main movement branch reads current WHO and ALIVE after TIMOUT',()=>{
  const f=fixture();f.b.io.invoke=function*(){return 'normal';};f.b.policy.debug=function*(op){if(op==='timout')f.low.write('who',2n);};f.high.write('alive',123n,2);f.b.policy.movement=function*(alive){assert.equal(alive(),123n);yield 'movement-policy';assert.equal(alive(),-1n);return 'repair';};f.b.io.finishTurn=function*(auto){assert.equal(auto,true);};
  f.m.write(f.b.n,11n);const g=f.b.dispatch();assert.equal(g.next().value,'movement-policy');f.high.write('alive',-1n,2);done(g);
});
test('Main movement death uses common source leave path without adding repair or turn',()=>{
  const f=fixture();f.b.io.invoke=function*(){return 'normal';};f.b.policy.movement=function*(){return 'leave';};assert.throws(()=>f.dispatch(9n),/EXIT transfer/);assert.equal(f.statistics.writes.length,1);assert.equal(f.low.read('who'),0n);assert.ok(!f.b.events.some(e=>e.startsWith('turn:')));
});
test('Main missing movement IF policy stops after normal call and profiling',()=>{
  const f=fixture();f.b.io.invoke=function*(){return 'normal';};delete f.b.policy.movement;assert.throws(()=>f.dispatch(11n),/two-label movement IF policy/);assert.deepEqual(f.b.events,['timin:CMDMOV','timout:CMDMOV','movement']);
});
test('Main loop reads N and WHO after GETCMD TIMOUT and preserves PLAYER assignment order',()=>{
  const f=fixture(),calls:bigint[]=[];f.b.io.getcmd=function*(a){assert.equal(a,f.b.n);assert.equal(f.low.read('player'),-1n);f.m.write(a,7n);};let count=0;f.b.policy.debug=function*(op,label){if(label==='GETCMD'&&op==='timout'){if(count++===0)f.m.write(f.b.n,17n);else f.low.write('who',0n);}};
  f.b.io.invoke=function*(call){assert.equal(call.routine,'radio');calls.push(f.m.read(f.b.n));f.low.write('player',0n);return 'normal';};assert.equal(f.run(),'pregame');assert.deepEqual(calls,[17n]);assert.equal(f.m.read(f.b.n),7n);assert.equal(f.low.read('player'),-1n);
});
test('Main loop WHO zero after GETCMD returns pregame without dispatching the retained N',()=>{
  const f=fixture();f.b.io.getcmd=function*(){f.low.write('who',0n);};f.m.write(f.b.n,33n);assert.equal(f.run(),'pregame');assert.equal(f.m.read(f.b.n),33n);assert.deepEqual(f.b.calls,[]);assert.equal(f.low.read('player'),-1n);
});
test('Main missing profiling policy stops after PLAYER assignment before GETCMD',()=>{const f=fixture('QUIT');delete f.b.policy.debug;assert.throws(f.run,/column-D compilation policy/);assert.equal(f.low.read('player'),-1n);assert.equal(f.m.read(f.b.n),77n);assert.ok(!f.b.events.includes('getcmd'));});
test('Main profiling entry failure prevents command and trailing profiling calls',()=>{const f=fixture();f.b.policy.debug=function*(){throw new Error('profiling fault');};assert.throws(()=>f.dispatch(7n),/profiling fault/);assert.deepEqual(f.b.calls,[]);assert.equal(f.gripe.writes.length,0);});
test('Main GETCMD death records statistics and returns pregame without dispatching stale N',()=>{
  const f=fixture();f.high.write('shpcon',BigInt(K.KENDAM),1,K.KSDAM);assert.equal(f.run(),'pregame');assert.equal(f.m.read(f.b.n),77n);assert.deepEqual(f.b.calls,[]);assert.equal(f.statistics.writes.length,1);assert.equal(f.low.read('who'),0n);assert.ok(!f.apr.events.includes('exit'));
});
test('Main QUIT reached through GETCMD hangup exits without confirmation input',()=>{
  const f=fixture();f.getCommand.io.input=function*(){f.low.write('hungup',-1n);return -1n;};assert.throws(f.run,/EXIT transfer/);assert.equal(f.m.read(f.b.n),16n);assert.equal(f.statistics.writes.length,1);assert.ok(!f.b.events.includes('sure'));
});
test('Main GRIPE returns to GETCMD, preserving packed log before a later confirmed QUIT',()=>{
  const f=fixture('GRIPE');let inputs=0;const get=f.b.io.getcmd;f.b.io.getcmd=function*(a){if(inputs++)f.editor.feed('QUIT\n');yield*get(a);};const gripe=f.gripe.io.inli;let line=true;f.gripe.io.inli=function*(){if(line){line=false;f.editor.feed('Command-loop log\x1a');}yield*gripe();};confirmation(f,'YES');assert.throws(f.run,/EXIT transfer/);assert.equal(f.gripe.writes.length,1);assert.ok(f.gripe.text().includes('Command-loop log\r\n'));assert.equal(f.low.read('who'),0n);
});
test('Main REPAIR composes automatic repair and live score/turn accounting',()=>{
  const f=fixture('REPAIR');f.clock.splice(0,f.clock.length,1000n,1100n);f.high.write('tim0',0n);f.high.write('shpdam',1000n,1,1);f.low.write('tpoint',55n,1);
  let commands=0;const get=f.b.io.getcmd;f.b.io.getcmd=function*(a){if(commands++===0)yield*get(a);else f.low.write('who',0n);};assert.equal(f.run(),'pregame');assert.equal(f.high.read('shpdam',1,1),200n);assert.equal(f.low.read('ptime'),3900n);assert.equal(f.high.read('dotime'),1n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.equal(f.high.read('score',1,1),55n);assert.equal(f.high.read('tmscor',1,1),55n);assert.equal(f.low.read('tpoint',1),0n);assert.ok(f.b.events.includes('automatic-repair'));assert.equal(f.m.read(f.apr.locals.i),BigInt(K.KNPOIN+1));
});
test('Main REPAIR nonpositive pause takes alternate return without a timed turn',()=>{
  const f=fixture('REPAIR');f.clock.splice(0,f.clock.length,1100n);for(let d=1;d<=K.KNDEV;d++)f.high.write('shpdam',0n,1,d);
  let commands=0;const get=f.b.io.getcmd;f.b.io.getcmd=function*(a){if(commands++===0)yield*get(a);else f.low.write('who',0n);};assert.equal(f.run(),'pregame');assert.equal(f.low.read('ptime'),-1100n);assert.equal(f.high.read('dotime'),0n);assert.ok(!f.b.events.includes('timout:CMDREP'));assert.ok(!f.b.events.includes('automatic-repair'));
});
test('Main timed turn retains committed DOTIME reset on a nonreturning defense call',()=>{
  const f=fixture();f.b.io.invoke=function*(){return 'normal';};f.b.turnIO.baspha=function*(){throw new Error('BASPHA failure');};f.high.write('dotime',1n);assert.throws(()=>f.dispatch(13n),/BASPHA failure/);assert.equal(f.high.read('dotime'),0n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.ok(!f.b.events.includes('automatic-repair'));
});
test('Main routine failures do not invoke profiling return or extra turn/cleanup',()=>{const f=fixture();f.b.io.invoke=function*(){f.low.write('ptime',123n);throw new Error('command fault');};assert.throws(()=>f.dispatch(2n),/command fault/);assert.equal(f.low.read('ptime'),123n);assert.deepEqual(f.b.events,['timin:CMDBU ']);assert.equal(f.statistics.writes.length,0);});
for(const [command,entry,v,device,label] of [['MOVE 12 20','move',12,K.KDWARP,'CMDMOV'],['IMPULSE 11 20','impuls',11,K.KDIMP,'CMDIMP']] as const){
  test(`Main ${entry} runs raw input, board movement and automatic turn accounting`,()=>{
    const f=fixture(command);f.clock.splice(0,f.clock.length,100n,500n);let commands=0;const get=f.b.io.getcmd;f.b.io.getcmd=function*(a){if(commands++===0)yield*get(a);else f.low.write('who',0n);};assert.equal(f.run(),'pregame');assert.equal(f.high.read('shpcon',1,K.KVPOS),BigInt(v));assert.equal(f.high.read('shpcon',1,K.KHPOS),20n);assert.equal(f.views.high.board.disp(v,20),101);assert.equal(f.low.read('ptime'),2600n);assert.equal(f.high.read('shpcon',1,K.KNTURN),2n);assert.ok(f.b.events.includes('timout:'+label));assert.ok(f.b.events.includes('automatic-repair'));
  });
  test(`Main ${entry} critical-device alternate return skips movement branch and turn`,()=>{
    const f=fixture(command);f.high.write('shpdam',BigInt(K.KCRIT),1,device);f.clock.splice(0,f.clock.length,100n);let commands=0;const get=f.b.io.getcmd;f.b.io.getcmd=function*(a){if(commands++===0)yield*get(a);else f.low.write('who',0n);};assert.equal(f.run(),'pregame');assert.equal(f.high.read('shpcon',1,K.KVPOS),10n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.ok(!f.b.events.includes('timout:'+label));assert.ok(!f.b.events.includes('movement'));assert.ok(!f.b.events.includes('automatic-repair'));
  });
}
test('Main command explicitly entering APR transfers through diagnostics and fatal cleanup',()=>{
  const f=fixture('RADIO');f.apr.install();f.file.write('seed',1n);f.b.io.invoke=function*(){return yield*f.apr.run();};assert.throws(f.run,/EXIT transfer/);assert.equal(f.gripe.writes.length,1);assert.ok(f.gripe.text().includes('**** Command line:\r\nRADIO'));assert.equal(f.statistics.writes.length,1);assert.equal(f.low.read('who'),0n);assert.ok(!f.b.events.includes('timout:CMDRAD'));assert.equal(f.file.read('seed'),260543n);
});
