import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter,once } from 'node:events';
import { GameSession } from '../src/runtime/session.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { reloadableSession,SessionReload } from '../src/runtime/reloadable-session.ts';
import { liveSessionRuntime } from './fixtures/live-session-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { DiskWordFiles } from '../src/runtime/word-files.ts';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function captain(t:TestContext,worlds=new WorldDirectory(),id=1,ship='LEXINGTON',fresh=true,team='FEDERATION'){
  let runtime!:ReturnType<typeof liveSessionRuntime>,output='';const events=new EventEmitter();
  const session=new GameSession(terminal=>reloadableSession(()=>{
    const world=worlds.load();runtime=liveSessionRuntime(terminal,'full',world,id,{playable:true,lifecycle:{removeHighSegment(){worlds.remove(world);},run(){throw new SessionReload();}}});
    const r=runtime;r.f.jobStatus.monitor.job=BigInt(id);r.f.jobStatus.monitor.sequenceJob=BigInt(id);
    const invoke=r.main.io.invoke,hiber=r.f.wait.io.hiber,gtkn=r.main.io.gtkn;
    r.main.io.invoke=function*(call){const result=yield*invoke(call);events.emit('command:'+call.routine);return result;};
    r.f.wait.io.hiber=function*(){if(!terminal.available()&&!r.f.editor.bytes.length&&r.f.r.t1>>18n===r.f.wait.wakeInputLeftHalf)events.emit('idle');return yield*hiber();};
    r.main.io.gtkn=function*(){events.emit('confirmation');yield*gtkn();};
    return r.program;
  },()=>worlds.monitor.releaseJob(id)),bytes=>{output+=Buffer.from(bytes).toString('latin1');});
  t.after(async()=>{session.cancel();await session.done;worlds.monitor.releaseJob(id);});
  const ended=session.done.then(result=>{worlds.monitor.releaseJob(id);throw new Error('Unexpected session end: '+JSON.stringify(result,(_k,v)=>v instanceof Error?v.stack:v));});ended.catch(()=>{});
  async function command(text:string,routine:string){
    const idle=new Promise<void>(resolve=>events.once('command:'+routine,()=>events.once('idle',resolve)));
    session.receive(Buffer.from(text+'\r\n'));await Promise.race([idle,ended]);
  }
  async function quit(){
    const confirm=once(events,'confirmation');session.receive(Buffer.from('QUIT\r\n'));await Promise.race([confirm,ended]);
    session.receive(Buffer.from('YES\r\n'));assert.deepEqual(await session.done,{reason:'completed'});
  }
  session.start();await command('EXPERT\r\n\r\n'+(fresh?'\r\nNO\r\nNO\r\n':'')+team+'\r\n'+ship+'\r\nSTATUS','status');
  return {session,runtime,command,quit,worlds,events,output:()=>output};
}

test('Live startup preserves RESET terminal width for bare SC and SRSCAN',{timeout:10000},async t=>{
  const game=await captain(t),{f,main}=game.runtime;
  const v=Number(f.high.read('shpcon',1,K.KVPOS)),h=Number(f.high.read('shpcon',1,K.KHPOS));
  for(const [command,routine,radius] of [['SC','scan',K.KRANGE],['SRSCAN','srscan',7]] as const){
    const start=game.output().length;
    await game.command(command,routine);
    const bounds=['vmin','vmax','hmin','hmax'].map(key=>f.m.read(main.scan.locals[key as 'vmin']));
    assert.deepEqual(bounds,[Math.max(1,v-radius),Math.min(K.KGALV,v+radius),Math.max(1,h-radius),Math.min(K.KGALH,h+radius)].map(BigInt));
    // Check actual terminal rows as well as bounds; do not seed TERWID in this test.
    const report=game.output().slice(start);
    for(let row=Number(bounds[0]);row<=Number(bounds[1]);row++)assert.match(report,new RegExp('^ *'+row+' .* '+row+'\\r?$','m'));
  }
  assert.equal(f.low.read('terwid'),80n);
  await game.quit();
});

test('Playable zero-turn scoring, named LIST, TRACTOR OFF, final score and ship reuse',{timeout:10000},async t=>{
  const directory=mkdtempSync(join(tmpdir(),'decwar-playable-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const first=await captain(t,new WorldDirectory(new DiskWordFiles(directory))),{f}=first.runtime;
  await first.command('POINTS ALL','points');await first.command('LIST LEXINGTON','list');await first.command('TRACTOR OFF','tractr');
  f.high.write('score',12345n,1,1);f.high.write('tmscor',12345n,1,1);
  f.high.write('job',f.high.read('job',1,K.KJOBTM)-2000n,1,K.KJOBTM); // Known elapsed time above source's save threshold.
  const scoreFile=f.locks.read('frebie')!==0n?'DECWAF.STA':'DECWAR.STA';
  const v=Number(f.high.read('shpcon',1,K.KVPOS)),h=Number(f.high.read('shpcon',1,K.KHPOS));
  await first.quit();assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('numply'),0n);assert.equal(f.high.read('numsid',1),0n);
  assert.equal(f.high.read('alive',1),1n);assert.equal(f.views.high.board.disp(v,h),0);assert.ok(first.worlds.monitor.files.read('DECWAR.STA'));
  assert.equal(new DiskWordFiles(directory).read(scoreFile)![9],12345n); // First leaderboard row's total, in the source-selected file.
  const next=await captain(t,first.worlds,2,'LEXINGTON',false);assert.equal(next.runtime.f.low.read('who'),1n);assert.equal(next.runtime.f.high.read('numply'),1n);await next.quit();
});

test('Playable disconnect during a report completes scoring and frees the ship while its teammate continues',{timeout:10000},async t=>{
  const first=await captain(t),second=await captain(t,first.worlds,2,'NIMITZ',false),{f,main}=first.runtime;
  let start:()=>void=()=>{},inStatus=false;const printing=new Promise<void>(resolve=>{start=resolve;}),invoke=main.io.invoke,out=f.cpu.outchr;
  main.io.invoke=function*(call){inStatus=call.routine==='status';return yield*invoke(call);};
  f.cpu.outchr=function*(byte){if(inStatus)start();yield*out(byte);};
  first.session.receive(Buffer.from('STATUS\r\n'));await printing;first.session.disconnect();assert.deepEqual(await first.session.done,{reason:'completed'});
  assert.equal(f.high.read('numply'),1n);assert.equal(f.high.read('alive',1),1n);assert.equal(f.low.read('who'),0n);
  await second.command('STATUS','status');await second.quit();assert.equal(f.high.read('numply'),0n);
});

test('Playable TRACTOR OFF and quitting both release an active beam and its queued notifications',{timeout:10000},async t=>{
  const first=await captain(t),second=await captain(t,first.worlds,2,'NIMITZ',false),{f}=first.runtime;
  const v=Number(f.high.read('shpcon',1,K.KVPOS)),h=Number(f.high.read('shpcon',1,K.KHPOS));
  const adjacent=[[v,h+1],[v,h-1],[v+1,h],[v-1,h]].find(([v,h])=>v>=1&&v<=K.KGALV&&h>=1&&h<=K.KGALH&&f.views.high.board.disp(v,h)===0);assert.ok(adjacent);
  f.views.high.board.setdsp(Number(f.high.read('shpcon',2,K.KVPOS)),Number(f.high.read('shpcon',2,K.KHPOS)),0);
  f.high.write('shpcon',BigInt(adjacent[0]),2,K.KVPOS);f.high.write('shpcon',BigInt(adjacent[1]),2,K.KHPOS);f.views.high.board.setdsp(adjacent[0],adjacent[1],102);
  await first.command('SHIELD DOWN','shield');await second.command('SHIELD DOWN','shield');
  await first.command('TRACTOR NIMITZ','tractr');assert.equal(f.high.read('trstat',1),2n);
  await first.command('TRACTOR OFF','tractr');assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',2),0n);
  await first.command('TRACTOR NIMITZ','tractr');await first.quit();assert.equal(f.high.read('trstat',2),0n);
  await second.command('STATUS','status');assert.equal(f.high.read('hitflg',2),0n);await second.quit();assert.equal(f.high.read('numply'),0n);
});

test('Playable destroyed ship completes GETCMD scoring and returns to pregame',{timeout:10000},async t=>{
  const game=await captain(t),{f}=game.runtime;
  // Deterministic destruction trigger; use real GETCMD, POINTS, UPDSTA and FREE.
  f.high.write('shpcon',BigInt(K.KENDAM),1,K.KSDAM);
  let ready:()=>void=()=>{};const pregame=new Promise<void>(resolve=>{ready=resolve;}),gtkn=f.pregame.io.gtkn;
  f.pregame.io.gtkn=function*(){ready();yield*gtkn();};game.session.receive(Buffer.from('\r\n'));await pregame;
  assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('numply'),0n);assert.equal(f.high.read('alive',1),1n);
  game.session.disconnect();assert.deepEqual(await game.session.done,{reason:'completed'});
});

test('Playable phaser kill completes the victim score/cleanup and leaves the attacker able to play',{timeout:10000},async t=>{
  const attacker=await captain(t),victim=await captain(t,attacker.worlds,2,'COBRA',false,'EMPIRE'),{f}=attacker.runtime,enemy=6;
  for(const who of [1,enemy])f.views.high.board.setdsp(Number(f.high.read('shpcon',who,K.KVPOS)),Number(f.high.read('shpcon',who,K.KHPOS)),0);
  let at:[number,number]|undefined;
  for(let v=15;v<45&&!at;v++)for(let h=15;h<44;h++)if(f.views.high.board.disp(v,h)===0&&f.views.high.board.disp(v,h+1)===0){at=[v,h];break;}
  assert.ok(at);const [v,h]=at;
  for(const [who,col,code] of [[1,h,101],[enemy,h+1,206]]){f.high.write('shpcon',BigInt(v),who,K.KVPOS);f.high.write('shpcon',BigInt(col),who,K.KHPOS);f.views.high.board.setdsp(v,col,code);}
  f.high.write('shpcon',BigInt(K.KENDAM)-1n,enemy,K.KSDAM);f.high.write('shpcon',-1n,enemy,K.KSHCON);f.file.write('seed',12345n);
  f.high.write('job',f.high.read('job',enemy,K.KJOBTM)-2000n,enemy,K.KJOBTM);
  const statistics=victim.runtime.f.locks.read('frebie')!==0n?'DECWAF.STA':'DECWAR.STA';
  await attacker.command(`PHASERS ABSOLUTE 50 ${v} ${h+1}`,'phacon');assert.ok(f.high.read('alive',enemy)>=0n);
  let ready:()=>void=()=>{};const pregame=new Promise<void>(resolve=>{ready=resolve;}),gtkn=victim.runtime.f.pregame.io.gtkn;
  victim.runtime.f.pregame.io.gtkn=function*(){ready();yield*gtkn();};victim.session.receive(Buffer.from('\r\n'));await pregame;
  assert.equal(victim.runtime.f.low.read('who'),0n);assert.equal(f.high.read('numply'),1n);assert.equal(f.high.read('alive',enemy),1n);
  assert.equal(attacker.worlds.monitor.files.read(statistics)![512+K.KNPLAY+enemy],1n);
  await attacker.command('STATUS','status');await attacker.quit();victim.session.disconnect();assert.deepEqual(await victim.session.done,{reason:'completed'});
});

test('Playable endgame removes the old world, scores remaining captain and permits a fresh game',{timeout:10000},async t=>{
  const game=await captain(t),{f}=game.runtime,old=game.worlds.load();
  f.high.write('nplnet',0n);f.high.write('nbase',0n,2); // Source ENDGAM trigger.
  game.session.receive(Buffer.from('\r\n'));assert.deepEqual(await game.session.done,{reason:'completed'});
  assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('numply'),0n);assert.equal(f.high.read('endflg'),-1n);
  assert.notEqual(game.worlds.load(),old);
  const next=await captain(t,game.worlds,2);assert.equal(next.runtime.f.high.read('gameno'),2n);await next.quit();
});

for(const disconnect of [false,true])test(`Playable DOCK crossing UTC midnight ${disconnect?'cleans up after disconnect':'returns to command input'}`,{timeout:10000},async t=>{
  const game=await captain(t),{f}=game.runtime;
  // Controlled placement beside an existing friendly base; DOCK, its timing,
  // prompt and disconnect cleanup all run through the production session.
  let adjacent:number[]|undefined;
  for(let b=1;b<=K.KNBASE&&!adjacent;b++){
    const v=Number(f.high.read('base',b,K.KVPOS,1)),h=Number(f.high.read('base',b,K.KHPOS,1));
    adjacent=[[v,h+1],[v,h-1],[v+1,h],[v-1,h]].find(([sv,sh])=>sv>=1&&sv<=K.KGALV&&sh>=1&&sh<=K.KGALH&&f.views.high.board.disp(sv,sh)===0);
  }
  assert.ok(adjacent);
  f.views.high.board.setdsp(Number(f.high.read('shpcon',1,K.KVPOS)),Number(f.high.read('shpcon',1,K.KHPOS)),0);
  f.high.write('shpcon',BigInt(adjacent[0]),1,K.KVPOS);f.high.write('shpcon',BigInt(adjacent[1]),1,K.KHPOS);f.views.high.board.setdsp(adjacent[0],adjacent[1],101);
  let wall=86399950,clockReads=0;
  t.mock.method(Date,'now',()=>wall);
  const clock=f.wait.io.mstime,hiber=f.wait.io.hiber;
  f.wait.io.mstime=function*(reg){yield*clock(reg);clockReads++;if(reg==='t3')wall=50;};
  f.wait.io.hiber=function*(){
    if(disconnect&&clockReads===1)setImmediate(()=>game.session.disconnect());
    return yield*hiber();
  };
  const start=game.output().length;
  if(disconnect){
    game.session.receive(Buffer.from('DOCK\r\n'));
    assert.deepEqual(await game.session.done,{reason:'completed'});
    assert.equal(f.high.read('numply'),0n);assert.equal(f.low.read('who'),0n);
  }else{
    await game.command('DOCK','dock');
    assert.equal(f.high.read('docked',1),-1n);
    await game.command('STATUS','status');
  }
  assert.match(game.output().slice(start),/DOCKED\./);
  assert.ok(clockReads>=2,'DOCK must actually cross a PAUSE clock boundary');
  assert.equal(f.wait.operands.length,0,'live waits do not retain fixture operands');
});
