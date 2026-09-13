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
  // Initial bases are random; search the playable interior instead of assuming
  // the central rectangle contains three clear sectors outside every defense.
  for(let v=2;v<74&&!at;v++)for(let h=2;h<72;h++)if([0,1,2].every(d=>f.views.high.board.disp(v,h+d)===0)&&[1,2].every(team=>Array.from({length:K.KNBASE},(_,i)=>i+1).every(i=>f.high.read('base',i,3,team)<=0n||Math.max(Math.abs(v-Number(f.high.read('base',i,1,team))),Math.abs(h-Number(f.high.read('base',i,2,team))))>12))){at=[v,h];break;}
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

test('Austin final BUILD latches before completion, commits its award and tells an idle opponent',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin'));
  const builder=await captain(t,worlds,1,1,true),opponent=await captain(t,worlds,2,18);
  const world=worlds.load(),f=builder.runtime.f,K=variantDefinitions.austin.constants;
  // Staged final-planet encounter, followed by the real parsed BUILD command.
  for(let v=1;v<=75;v++)for(let h=1;h<=75;h++)f.views.high.board.setdsp(v,h,0);
  f.high.write('nplnet',1n);f.high.write('nbase',0n,1);f.high.write('nbase',0n,2);
  for(const side of [1,2])for(let i=1;i<=10;i++)f.high.write('base',0n,i,3,side);
  f.high.write('shpcon',20n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);f.views.high.board.setdsp(20,20,101);
  f.high.write('locpln',20n,1,1);f.high.write('locpln',21n,1,2);f.high.write('locpln',4n,1,3);
  f.high.write('numcap',1n,1);f.views.high.board.setdsp(20,21,701);
  f.high.write('dotime',-100n);f.high.write('romopt',0n);
  const before=f.high.read('score',K.KPBBAS,1),turns=f.high.read('shpcon',1,K.KNTURN);
  const finish=builder.runtime.main.io.finishTurn;
  let completed=false;
  builder.runtime.main.io.finishTurn=function*(auto){
    assert.equal(world.warEnding.outcome,'FEDERATION');
    assert.equal(f.high.read('base',1,3,1),1000n);
    assert.doesNotMatch(builder.output(),/THE WAR IS OVER/);
    yield*finish(auto);
    // A later completion effect cannot revise the first result.
    f.high.write('base',0n,1,3,1);f.high.write('nbase',0n,1);
    completed=true;
  };
  builder.session.receive(Buffer.from('BUILD ABSOLUTE 20 21\r\nSTATUS\r\n'));
  assert.deepEqual(await builder.session.done,{reason:'completed'});
  assert.deepEqual(await opponent.session.done,{reason:'completed'});
  assert.ok(completed);assert.equal(world.warEnding.outcome,'FEDERATION');
  assert.equal(f.high.read('score',K.KPBBAS,1),before+5000n);
  assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+1n);
  for(const game of [builder,opponent]){
    assert.equal((game.output().match(/THE WAR IS OVER!!/g)??[]).length,1);
    assert.match(game.output(),/Federation has successfully repelled/);
    assert.doesNotMatch(game.output(),/BOTH sides lose/);
    assert.equal(game.runtime.f.low.read('who'),0n);
  }
  assert.ok(builder.output().indexOf('builds planet')<builder.output().indexOf('THE WAR IS OVER!!'));
  assert.equal(f.high.read('numply'),0n);
});

test('Austin removal latches mutual destruction and all idle players finish without input',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin'));
  const a=await captain(t,worlds,1,1,true),b=await captain(t,worlds,2,18),world=worlds.load(),f=a.runtime.f;
  f.high.write('nplnet',1n);f.high.write('nbase',0n,1);f.high.write('nbase',0n,2);
  // Exercise the same count store observed from PLNRMV, including an idle wake.
  f.high.write('nplnet',0n);
  assert.equal(world.warEnding.outcome,'MUTUAL_DESTRUCTION');
  for(const game of [a,b]){
    assert.deepEqual(await game.session.done,{reason:'completed'});
    assert.equal((game.output().match(/THE WAR IS OVER!!/g)??[]).length,1);
    assert.match(game.output(),/BOTH sides lose!!/);
    assert.doesNotMatch(game.output(),/is VICTORIOUS|successfully repelled/);
    assert.equal(game.runtime.f.low.read('who'),0n);
  }
  assert.equal(f.high.read('numply'),0n);assert.notEqual(worlds.load(),world);
});

for(const fedBases of [0n,1n])test(`Austin final-planet torpedo finishes its burst with ${fedBases} Federation bases`,{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin'));
  const game=await captain(t,worlds,1,1,true),world=worlds.load(),f=game.runtime.f,K=variantDefinitions.austin.constants;
  for(let v=1;v<=75;v++)for(let h=1;h<=75;h++)f.views.high.board.setdsp(v,h,0);
  f.high.write('nplnet',1n);f.high.write('nbase',fedBases,1);f.high.write('nbase',0n,2);
  f.high.write('numcap',0n,1);f.high.write('numcap',0n,2);
  f.high.write('shpcon',20n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);f.views.high.board.setdsp(20,20,101);
  f.high.write('locpln',20n,1,1);f.high.write('locpln',21n,1,2);f.high.write('locpln',0n,1,3);f.views.high.board.setdsp(20,21,601);
  f.high.write('dotime',-100n);f.high.write('romopt',0n);f.low.write('tobank',0n);
  // Fix only integer combat choices: no misfire/drift; the planet loses a build.
  game.runtime.main.torpedo.io.iran=function*(n){return n===4?4n:1n;};
  const ammo=f.high.read('shpcon',1,K.KNTORP),turns=f.high.read('shpcon',1,K.KNTURN);
  const points=f.high.read('score',K.KNPDES,1);
  game.session.receive(Buffer.from('TORPEDOES ABSOLUTE 3 20 21\r\n'));
  assert.deepEqual(await game.session.done,{reason:'completed'});
  assert.equal(f.high.read('nplnet'),0n);
  assert.equal(f.high.read('shpcon',1,K.KNTORP),ammo-3n);
  assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+1n);
  assert.equal(f.high.read('score',K.KNPDES,1),points-1000n);
  assert.equal(world.warEnding.outcome,fedBases?'FEDERATION':'MUTUAL_DESTRUCTION');
  assert.equal((game.output().match(/THE WAR IS OVER!!/g)??[]).length,1);
  assert.equal(f.low.read('who'),0n);
});

test('Austin nova continues its queued explosions after destroying the final planet',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin'));
  const game=await captain(t,worlds,1,1,true),world=worlds.load(),f=game.runtime.f,K=variantDefinitions.austin.constants;
  for(let v=1;v<=75;v++)for(let h=1;h<=75;h++)f.views.high.board.setdsp(v,h,0);
  f.high.write('nplnet',1n);f.high.write('nbase',0n,1);f.high.write('nbase',0n,2);
  f.high.write('shpcon',20n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);f.views.high.board.setdsp(20,20,101);
  f.high.write('locpln',20n,1,1);f.high.write('locpln',24n,1,2);f.high.write('locpln',0n,1,3);
  f.views.high.board.setdsp(20,24,601);f.views.high.board.setdsp(20,23,900);f.views.high.board.setdsp(21,23,900);
  f.high.write('dotime',-100n);f.high.write('romopt',0n);f.low.write('tobank',0n);
  game.runtime.main.torpedo.io.iran=function*(){return 1n;};
  const nova=game.runtime.main.romulan.torpedoes.nova;
  nova.superIO.iran=function*(){return 1n;};
  let queuedAfterLatch=false;
  const hit=nova.superIO.makhit;
  nova.superIO.makhit=function*(){
    if(world.warEnding.outcome!==null)queuedAfterLatch=true;
    yield*hit();
  };
  game.session.receive(Buffer.from('TORPEDOES ABSOLUTE 1 20 23\r\n'));
  assert.deepEqual(await game.session.done,{reason:'completed'});
  assert.equal(world.warEnding.outcome,'MUTUAL_DESTRUCTION');assert.ok(queuedAfterLatch);
  assert.equal(f.high.read('nplnet'),0n);assert.equal(f.views.high.board.disp(20,23),0);assert.equal(f.views.high.board.disp(21,23),0);
  assert.equal(f.m.read(nova.superLocals.strptr),0n);assert.equal(f.low.read('who'),0n);
});

test('Austin PHASERS last-base destruction latches and commits before final reporting',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin'));
  const game=await captain(t,worlds,1,1,true),world=worlds.load(),f=game.runtime.f,K=variantDefinitions.austin.constants;
  for(let v=1;v<=75;v++)for(let h=1;h<=75;h++)f.views.high.board.setdsp(v,h,0);
  f.high.write('nplnet',0n);f.high.write('nbase',1n,1);f.high.write('nbase',1n,2);
  f.high.write('shpcon',20n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);f.views.high.board.setdsp(20,20,101);
  f.high.write('base',20n,1,1,2);f.high.write('base',21n,1,2,2);f.high.write('base',1n,1,3,2);f.views.high.board.setdsp(20,21,401);
  f.high.write('dotime',-100n);f.high.write('romopt',0n);
  const score=f.high.read('score',K.KPBDAM,1);
  game.session.receive(Buffer.from('PHASERS ABSOLUTE 500 20 21\r\n'));
  assert.deepEqual(await game.session.done,{reason:'completed'});
  assert.equal(world.warEnding.outcome,'FEDERATION');assert.equal(f.high.read('nbase',2),0n);
  assert.ok(f.high.read('score',K.KPBDAM,1)>score);
  assert.equal(f.low.read('tpoint',K.KPBDAM),0n);assert.equal(f.low.read('who'),0n);
});

test('Austin overlapping accepted commands finish separately using one frozen outcome',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin'));
  const a=await captain(t,worlds,1,1,true),b=await captain(t,worlds,2,18),world=worlds.load(),f=a.runtime.f;
  f.high.write('nplnet',0n);f.high.write('nbase',1n,1);f.high.write('nbase',1n,2);
  const gates=[{release:false},{release:false}];
  const started=[a,b].map((game,index)=>new Promise<void>(resolve=>{
    const invoke=game.runtime.main.io.invoke;
    game.runtime.main.io.invoke=function*(call){
      resolve();while(!gates[index].release)yield 'cooperate';
      return yield*invoke(call);
    };
  }));
  a.session.receive(Buffer.from('STATUS\r\n'));b.session.receive(Buffer.from('STATUS\r\n'));
  await Promise.all(started);
  f.high.write('nbase',0n,2);assert.equal(world.warEnding.outcome,'FEDERATION');
  gates[0].release=true;assert.deepEqual(await a.session.done,{reason:'completed'});
  assert.doesNotMatch(b.output(),/THE WAR IS OVER/);
  // Change counts while the second accepted command has not yet finished.
  b.runtime.f.high.write('nbase',0n,1);gates[1].release=true;
  assert.deepEqual(await b.session.done,{reason:'completed'});
  for(const game of [a,b]){
    assert.equal((game.output().match(/THE WAR IS OVER!!/g)??[]).length,1);
    assert.match(game.output(),/Federation has successfully repelled/);
    assert.doesNotMatch(game.output(),/BOTH sides lose/);
  }
});

test('Austin scheduled autonomous nova latches without interrupting the triggering turn',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin'));
  const game=await captain(t,worlds,1,1,true),world=worlds.load(),f=game.runtime.f,K=variantDefinitions.austin.constants;
  for(let v=1;v<=75;v++)for(let h=1;h<=75;h++)f.views.high.board.setdsp(v,h,0);
  f.high.write('nplnet',1n);f.high.write('nbase',0n,1);f.high.write('nbase',0n,2);
  f.high.write('numcap',0n,1);f.high.write('numcap',0n,2);
  f.high.write('shpcon',20n,1,K.KVPOS);f.high.write('shpcon',20n,1,K.KHPOS);f.views.high.board.setdsp(20,20,101);
  f.high.write('locpln',40n,1,1);f.high.write('locpln',41n,1,2);f.high.write('locpln',0n,1,3);f.views.high.board.setdsp(40,41,601);
  f.views.high.board.setdsp(40,40,900);f.high.write('dotime',0n);f.high.write('romopt',-1n);
  const turns=f.high.read('shpcon',1,K.KNTURN);
  let returned=false;
  // Select a deterministic autonomous explosion at the real world-cycle phase.
  // NOVA, PLNRMV, command completion and finalization execute their real paths.
  game.runtime.main.turnIO.romdrv=function*(){
    f.low.write('player',0n);f.out.write('h2',40n);f.out.write('v2',40n);
    yield*game.runtime.main.romulan.torpedoes.nova.supernova();
    assert.equal(world.warEnding.outcome,'MUTUAL_DESTRUCTION');
    assert.doesNotMatch(game.output(),/THE WAR IS OVER/);returned=true;
  };
  game.session.receive(Buffer.from('IMPULSE ABSOLUTE 20 21\r\n'));
  assert.deepEqual(await game.session.done,{reason:'completed'});
  assert.ok(returned);assert.equal(f.high.read('nplnet'),0n);
  assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+1n);assert.equal(f.low.read('who'),0n);
});
