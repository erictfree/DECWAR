import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter,once } from 'node:events';
import { GameSession } from '../src/runtime/session.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { createVariantContext,variantDefinitions } from '../src/runtime/variant.ts';
import { liveSessionRuntime } from './fixtures/live-session-runtime.ts';
import { reloadableSession,SessionReload } from '../src/runtime/reloadable-session.ts';

async function captain(t:TestContext,worlds:WorldDirectory,id:number,slot:number,fresh=false,rollover=false){
  let runtime!:ReturnType<typeof liveSessionRuntime>,output='';const events=new EventEmitter();
  const session=new GameSession(terminal=>reloadableSession(()=>{
    const world=worlds.load();runtime=liveSessionRuntime(terminal,'full',world,id,{playable:true,lifecycle:{removeHighSegment(){worlds.remove(world);},run(){throw new SessionReload();}}});
    const r=runtime;const read=terminal.read;terminal.read=function*(){events.emit('input');if(r.f.low.read('who')>0n&&r.f.ini.state.iniflg===0n&&!terminal.available()&&!r.f.editor.bytes.length)events.emit('idle');return yield*read();};r.f.jobStatus.monitor.job=BigInt(id);r.f.jobStatus.monitor.sequenceJob=BigInt(id);
    const invoke=r.main.io.invoke,hiber=r.f.wait.io.hiber,gtkn=r.main.io.gtkn;
    r.main.io.invoke=function*(call){const result=yield*invoke(call);events.emit('command:'+call.routine);return result;};
    r.f.wait.io.hiber=function*(){if(!terminal.available()&&!r.f.editor.bytes.length&&r.f.r.t1>>18n===r.f.wait.wakeInputLeftHalf)events.emit('idle');return yield*hiber();};
    r.main.io.gtkn=function*(){events.emit('confirmation');yield*gtkn();};
    return r.program;
  },()=>worlds.monitor.releaseJob(id)),bytes=>{output+=Buffer.from(bytes).toString('latin1');});
  t.after(async()=>{if(!t.passed)console.error('DIAGNOSTIC slot',slot,output.slice(-2500),runtime.f.wait.events.slice(-12));session.cancel();await session.done;worlds.monitor.releaseJob(id);});
  const ended=session.done.then(result=>{worlds.monitor.releaseJob(id);throw new Error('Unexpected session end: '+JSON.stringify(result,(_k,v)=>v instanceof Error?v.stack:v));});ended.catch(()=>{});
  const ready=once(events,'idle'),input=once(events,'input');session.start();await Promise.race([input,ended]);
  const ship=variantDefinitions.austin.ships[slot-1].name,team=slot<=9?'FEDERATION':'EMPIRE';
  session.receive(Buffer.from('\r\n'+(rollover?'\r\n':'')+(fresh?'\r\nNO\r\nNO\r\n':'')+team+'\r\n'+ship+'\r\n'));
  await Promise.race([ready,ended,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Admission timed out: '+output.slice(-1500))),3000);timer.unref();})]);
  async function command(text:string,routine:string){
    const idle=new Promise<void>(resolve=>events.once('command:'+routine,()=>events.once('idle',resolve)));
    session.receive(Buffer.from(text+'\r\n'));await Promise.race([idle,ended]);
  }
  async function quit(){const confirm=once(events,'confirmation');session.receive(Buffer.from('QUIT\r\n'));await Promise.race([confirm,ended]);session.receive(Buffer.from('YES\r\n'));assert.deepEqual(await session.done,{reason:'completed'});}
  return {session,runtime,command,quit,output:()=>output};
}

test('Austin startup reads the pinned INI, admits Yorktown as slot 9, reports and quits without CompuServe standings',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin')),game=await captain(t,worlds,1,9,true),f=game.runtime.f;
  assert.equal(f.low.read('who'),9n);assert.equal(f.high.read('nplnet'),20n);
  assert.equal(f.low.read('prtype'),-1n);assert.equal(f.low.read('oflg'),0n);assert.equal(f.ini.state.iniflg,0n);
  assert.match(game.output(),/Reading Commands From DECWARINI/);assert.doesNotMatch(game.output(),/Are you:|Beginner|HONORROLL|missions/);
  assert.ok(game.runtime.main.calls.some(c=>c.routine==='target'));assert.ok(game.runtime.main.calls.some(c=>c.routine==='srscan'));
  await game.command('STATUS','status');await game.command('SC 10','scan');await game.command('POINTS ALL','points');await game.command('LIST YORKTOWN','list');await game.command('TRACTOR OFF','tractr');
  await game.quit();assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('numply'),0n);assert.equal(f.high.read('alive',9),1n);
  assert.equal(worlds.monitor.files.read('DECWAR.STA'),undefined);assert.equal(worlds.monitor.files.read('DECWAF.STA'),undefined);
});

test('All eighteen Austin slots share a galaxy and exchange messages across the fleet boundary',{timeout:20000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin')),games=new Map<number,Awaited<ReturnType<typeof captain>>>();
  for(let i=1;i<=9;i++)for(const slot of [i,i+9])games.set(slot,await captain(t,worlds,games.size+1,slot,games.size===0));
  const first=games.get(1)!,last=games.get(18)!,f=first.runtime.f;
  assert.equal(f.high.read('numply'),18n);assert.equal(f.high.read('numsid',1),9n);assert.equal(f.high.read('numsid',2),9n);
  for(const [slot,game] of games){assert.equal(game.runtime.f.low.read('who'),BigInt(slot));assert.equal(game.runtime.f.high.read('alive',slot),-1n);}
  const before=last.output().length;
  await first.command('TELL WOLF; Fleet boundary test','tell');await last.command('STATUS','status');await last.command('STATUS','status');
  assert.match(last.output().slice(before),/Fleet boundary test/);
  // Exercise interleaved output and shared queues with every ship active.
  for(let round=0;round<3;round++)await Promise.all([...games.values()].map(game=>game.command(round===1?'SC 2':'STATUS',round===1?'scan':'status')));
  const old=worlds.load(),nineteenth=await captain(t,worlds,19,1,true,true);
  assert.notEqual(worlds.load(),old);assert.equal(f.high.read('numply'),18n);assert.equal(nineteenth.runtime.f.high.read('numply'),1n);
  await nineteenth.quit();for(const game of games.values())await game.quit();assert.equal(f.high.read('numply'),0n);
  assert.equal(worlds.monitor.locks.owner(1n),undefined);assert.equal(worlds.monitor.locks.owner(2n),undefined);
});

test('Austin movement, capture, building and docking use the same live command composition',{timeout:45000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin')),game=await captain(t,worlds,1,18,true),f=game.runtime.f,K=variantDefinitions.austin.constants;
  let at:[number,number]|undefined;
  for(let v=15;v<45&&!at;v++)for(let h=15;h<43;h++)if([0,1,2].every(d=>f.views.high.board.disp(v,h+d)===0)&&[1,2].every(team=>Array.from({length:K.KNBASE},(_,i)=>i+1).every(i=>f.high.read('base',i,3,team)<=0n||Math.max(Math.abs(v-Number(f.high.read('base',i,1,team))),Math.abs(h-Number(f.high.read('base',i,2,team))))>12))){at=[v,h];break;}
  assert.ok(at);const [v,h]=at;
  // Only stage the encounter. Commands retain real parsing, arithmetic, locks,
  // turn accounting and waits. Move an existing neutral planet, preserving 20.
  f.views.high.board.setdsp(Number(f.high.read('shpcon',18,K.KVPOS)),Number(f.high.read('shpcon',18,K.KHPOS)),0);
  f.high.write('shpcon',BigInt(v),18,K.KVPOS);f.high.write('shpcon',BigInt(h),18,K.KHPOS);f.views.high.board.setdsp(v,h,218);
  f.views.high.board.setdsp(Number(f.high.read('locpln',1,1)),Number(f.high.read('locpln',1,2)),0);
  f.high.write('locpln',BigInt(v),1,1);f.high.write('locpln',BigInt(h+2),1,2);f.high.write('locpln',0n,1,3);f.views.high.board.setdsp(v,h+2,K.DXNPLN*100+1);
  await game.command(`MOVE ABSOLUTE ${v} ${h+1}`,'move');assert.equal(f.high.read('shpcon',18,K.KHPOS),BigInt(h+1));
  await game.command(`CAPTURE ABSOLUTE ${v} ${h+2}`,'captur');assert.equal(f.views.high.board.disp(v,h+2),(K.DXNPLN+2)*100+1);
  await game.command(`BUILD ABSOLUTE ${v} ${h+2}`,'build');assert.equal(f.high.read('locpln',1,3),1n);
  f.high.write('shpcon',10000n,18,K.KSNRGY);await game.command('DOCK','dock');assert.ok(f.high.read('shpcon',18,K.KSNRGY)>10000n);assert.equal(f.high.read('docked',18),-1n);
  await game.quit();assert.equal(worlds.monitor.locks.owner(1n),undefined);assert.equal(worlds.monitor.locks.owner(2n),undefined);
});

test('Austin phaser hits address slot 18, death frees it, and no standings persistence runs',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin')),attacker=await captain(t,worlds,1,9,true),victim=await captain(t,worlds,2,18),f=attacker.runtime.f,K=variantDefinitions.austin.constants;
  for(const who of [9,18])f.views.high.board.setdsp(Number(f.high.read('shpcon',who,K.KVPOS)),Number(f.high.read('shpcon',who,K.KHPOS)),0);
  let at:[number,number]|undefined;for(let v=15;v<45&&!at;v++)for(let h=15;h<44;h++)if(f.views.high.board.disp(v,h)===0&&f.views.high.board.disp(v,h+1)===0){at=[v,h];break;}
  assert.ok(at);const [v,h]=at;
  for(const [who,col,code] of [[9,h,109],[18,h+1,218]]){f.high.write('shpcon',BigInt(v),who,K.KVPOS);f.high.write('shpcon',BigInt(col),who,K.KHPOS);f.views.high.board.setdsp(v,col,code);}
  f.high.write('shpcon',BigInt(K.KENDAM)-1n,18,K.KSDAM);f.high.write('shpcon',-1n,18,K.KSHCON);f.file.write('seed',12345n);
  await attacker.command(`PHASERS ABSOLUTE 50 ${v} ${h+1}`,'phacon');assert.ok(f.high.read('alive',18)>=0n);
  let ready=()=>{};const pregame=new Promise<void>(resolve=>{ready=resolve;}),gtkn=victim.runtime.f.pregame.io.gtkn;
  victim.runtime.f.pregame.io.gtkn=function*(){ready();yield*gtkn();};victim.session.receive(Buffer.from('\r\n'));await pregame;
  assert.equal(victim.runtime.f.low.read('who'),0n);assert.equal(f.high.read('numply'),1n);assert.equal(f.high.read('alive',18),1n);
  assert.equal(worlds.monitor.files.read('DECWAR.STA'),undefined);await attacker.command('STATUS','status');await attacker.quit();victim.session.disconnect();assert.deepEqual(await victim.session.done,{reason:'completed'});
});

test('Austin endgame retires the old galaxy and releases its last ship',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin')),game=await captain(t,worlds,1,9,true),old=worlds.load(),f=game.runtime.f;
  f.high.write('nplnet',0n);f.high.write('nbase',0n,2);game.session.receive(Buffer.from('\r\n'));
  assert.deepEqual(await game.session.done,{reason:'completed'});assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('numply'),0n);
  assert.notEqual(worlds.load(),old);const next=await captain(t,worlds,2,18,true);await next.quit();
});
