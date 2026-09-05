import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter,once } from 'node:events';
import { GameSession } from '../src/runtime/session.ts';
import { SharedGameWorld } from '../src/runtime/shared-world.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { reloadableSession,SessionReload } from '../src/runtime/reloadable-session.ts';
import { liveSessionRuntime } from './fixtures/live-session-runtime.ts';
import { constants as K,messages } from '../src/generated/source-data.ts';
import { DiskWordFiles } from '../src/runtime/word-files.ts';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unpackAscii,packAscii,signed36,packSixbit } from '../src/compat/word36.ts';
import { sourceFile } from '../tools/source.ts';

async function game(t:TestContext,world=new SharedGameWorld(),job=1,startup='EXPERT\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS',options:{promptForName?:boolean}={}){
  const events=new EventEmitter();let runtime!:ReturnType<typeof liveSessionRuntime>,output='';
  const session=new GameSession(terminal=>{
    runtime=liveSessionRuntime(terminal,'full',world,job,options);
    runtime.f.jobStatus.monitor.job=BigInt(job);runtime.f.jobStatus.monitor.sequenceJob=BigInt(job);
    const hiber=runtime.f.wait.io.hiber;
    runtime.f.wait.io.hiber=function*(){if(!terminal.available()&&!runtime.f.editor.bytes.length&&runtime.f.r.t1>>18n===runtime.f.wait.wakeInputLeftHalf)events.emit('idle');return yield*hiber();};
    const invoke=runtime.main.io.invoke,turn=runtime.main.io.finishTurn,sure=runtime.main.io.outSure;
    runtime.main.io.invoke=function*(call){const result=yield*invoke(call);events.emit('command:'+call.routine);return result;};
    runtime.main.io.finishTurn=function*(auto){yield*turn(auto);events.emit('turn');};
    runtime.main.io.outSure=function*(){yield*sure();events.emit('quit-prompt');};
    return runtime.program;
  },bytes=>{output+=Buffer.from(bytes).toString('latin1');});
  t.after(async()=>{session.cancel();await session.done;world.releaseJob(job);});
  const failed=session.done.then(result=>{throw new Error('Session ended: '+JSON.stringify(result,(_k,v)=>v instanceof Error?v.stack:v));});
  // Each awaited source event competes with session failure; no fabricated reply
  // or direct command dispatch substitutes for input through the live driver.
  async function send(input:string,event:string){
    const ready=once(events,event),idle=ready.then(()=>once(events,'idle'));
    session.receive(Buffer.from(input+'\r\n'));await Promise.race([idle,failed]);
  }
  session.start();await send(startup,'command:status');
  return {session,runtime,send,events,output:()=>output};
}
test('A full galaxy follows KILHGH and START into a new world while its existing captain continues',{timeout:10000},async t=>{
  const worlds=new WorldDirectory(),oldWorld=worlds.load(),first=await game(t,oldWorld),runtimes:ReturnType<typeof liveSessionRuntime>[]=[],attached:SharedGameWorld[]=[];
  first.runtime.f.high.write('numply',BigInt(K.KNPLAY));first.runtime.f.high.write('score',123n,1,1); // Controlled full-galaxy condition.
  let output='',ready:()=>void=()=>{},reloads=0;const status=new Promise<void>(resolve=>{ready=resolve;});
  const session=new GameSession(terminal=>reloadableSession(()=>{
    const world=worlds.load(),runtime=liveSessionRuntime(terminal,'full',world,2,{lifecycle:{removeHighSegment(){worlds.remove(world);},run(){throw new SessionReload();}}});
    runtime.f.jobStatus.monitor.job=2n;runtime.f.jobStatus.monitor.sequenceJob=2n;runtimes.push(runtime);attached.push(world);
    const invoke=runtime.main.io.invoke;runtime.main.io.invoke=function*(call){const result=yield*invoke(call);if(call.routine==='status')ready();return result;};
    return runtime.program;
  },()=>{worlds.monitor.releaseJob(2);reloads++;}),bytes=>{output+=Buffer.from(bytes).toString('latin1');});
  t.after(async()=>{session.cancel();await session.done;worlds.monitor.releaseJob(2);});
  session.start();session.receive(Buffer.from('EXPERT\r\n\r\nEXPERT\r\n\r\n\r\nNO\r\nNO\r\nEMPIRE\r\nCOBRA\r\nSTATUS\r\n'));
  await Promise.race([status,session.done.then(result=>{throw new Error('Reloaded session ended: '+JSON.stringify(result,(_k,v)=>v instanceof Error?v.stack:v));})]);
  assert.equal(reloads,1);assert.equal(runtimes.length,2);assert.equal(attached[0],oldWorld);assert.notEqual(attached[1],oldWorld);assert.equal(worlds.load(),attached[1]);
  assert.equal(first.runtime.f.high.read('dead'),-1n);assert.equal(first.runtime.f.high.read('numply'),BigInt(K.KNPLAY));assert.equal(first.runtime.f.high.read('score',1,1),123n);
  assert.equal(runtimes[1].f.high.read('numply'),1n);assert.equal(runtimes[1].f.high.read('gameno'),2n);assert.equal(runtimes[1].f.low.read('who'),6n);
  assert.ok(output.includes(messages.setu01.text));assert.ok(output.includes('[DECWAR high segment removed from swapper]'));
  assert.equal(output.split(messages.decver.text).length-1,4); // DECWAR startup and TYPE:95 each print it on both loads.
  assert.deepEqual(Array.from({length:6},(_,i)=>runtimes[0].f.file.read('tmp',i)),[signed36(packSixbit('DSK')),signed36(packSixbit('DECWAR')),0n,0n,0n,0n]);
  await first.send('STATUS','command:status');assert.equal(first.runtime.f.high.read('alive',1),-1n);
});
test('Live prompted captain name reaches JOBSTA, USERS and the saved GRIPE report',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),{runtime,send,output}=await game(t,world,1,'EXPERT\r\nAb9\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS',{promptForName:true});
  assert.equal(runtime.f.high.read('job',1,K.KNAM1),signed36(packSixbit('AB9')));
  assert.equal(output().split('Your name please: ').length-1,1);await send('USERS','command:users');assert.ok(output().includes('AB9'));
  await send('GRIPE\r\nNamed captain report\x1a','command:gripe');
  assert.ok(world.files.read('DECWAR.GRP')!.map(unpackAscii).join('').includes('AB9'));
});
for(const action of ['interrupt','disconnect'] as const)test(`Live ${action} during raw JOBSTA name input completes pregame MONIT`,{timeout:10000},async t=>{
  const world=new SharedGameWorld();let runtime!:ReturnType<typeof liveSessionRuntime>,ready:()=>void=()=>{},output='';
  const prompted=new Promise<void>(resolve=>{ready=resolve;});
  const session=new GameSession(terminal=>{
    runtime=liveSessionRuntime(terminal,'full',world,1,{promptForName:true});
    const inchwl=runtime.f.jobStatus.io.inchwl;
    runtime.f.jobStatus.io.inchwl=function*(){if(!terminal.available()&&!runtime.f.editor.bytes.length)ready();yield*inchwl();};
    return runtime.program;
  },bytes=>{output+=Buffer.from(bytes).toString('latin1');});
  t.after(async()=>{session.cancel();await session.done;world.releaseJob(1);});session.start();session.receive(Buffer.from('EXPERT\r\n'));
  await Promise.race([prompted,session.done.then(result=>{throw new Error('Exited before name prompt: '+JSON.stringify(result));})]);
  assert.ok(output.includes('Your name please: ')); // JOBSTA clears CCFLG after printing this, before INCHWL.
  session[action]();assert.deepEqual(await session.done,{reason:'completed'});assert.equal(runtime.f.high.read('numply'),0n);assert.equal(runtime.f.low.read('who'),0n);
});
test('Admission CLRBUF interrupt rings four bells, discards queued input, and restores registers before JOBSTA',{timeout:10000},async t=>{
  const world=new SharedGameWorld();let runtime!:ReturnType<typeof liveSessionRuntime>,output='',atTrap:()=>void=()=>{},afterTrap:()=>void=()=>{};
  const ready=new Promise<void>(resolve=>{atTrap=resolve;}),resumed=new Promise<void>(resolve=>{afterTrap=resolve;});
  let before:bigint[]=[],after:bigint[]=[],outputStart=0,outputEnd=0;
  const session=new GameSession(terminal=>{
    runtime=liveSessionRuntime(terminal,'full',world,1);
    const jobsta=runtime.main.admission.io.jobsta;
    runtime.main.admission.io.jobsta=function*(address){
      assert.equal(runtime.f.file.read('trpadr'),runtime.main.admission.trapAddresses.clrbuf);
      before=Array.from({length:16},(_,i)=>runtime.f.m.read(BigInt(i)));outputStart=output.length;
      atTrap();yield 'output'; // Test scheduling boundary at the actual installed trap.
      after=Array.from({length:16},(_,i)=>runtime.f.m.read(BigInt(i)));outputEnd=output.length;
      assert.equal(terminal.available(),false);assert.deepEqual(runtime.f.editor.bytes,[]);assert.equal(runtime.f.input.pointer,-1n);
      afterTrap();yield*jobsta(address);
    };
    return runtime.program;
  },bytes=>{output+=Buffer.from(bytes).toString('latin1');});
  t.after(async()=>{session.cancel();await session.done;world.releaseJob(1);});
  const failed=session.done.then(result=>{throw new Error('Admission ended: '+JSON.stringify(result,(_k,v)=>v instanceof Error?v.stack:v));});
  session.start();session.receive(Buffer.from('EXPERT\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\n'));
  await Promise.race([ready,failed]);
  session.receive(Buffer.from('discard this'));runtime.f.editor.bytes.push(88n);runtime.f.input.pointer=3n;
  session.interrupt();await Promise.race([resumed,failed]);
  assert.equal(output.slice(outputStart,outputEnd),'\x07\x07\x07\x07');assert.deepEqual(after,before);
  assert.deepEqual(runtime.interrupts.traps,[runtime.main.admission.trapAddresses.clrbuf]);
  assert.deepEqual(runtime.interrupts.returns,[0n]);assert.equal(runtime.f.file.read('intflg'),-1n);
  assert.equal(runtime.f.high.read('alive',1),-1n);assert.equal(runtime.f.high.read('numply'),1n);
});
test('Two live captains exchange TELL messages, honor RADIO OFF and continue command processing',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),first=await game(t,world),second=await game(t,world,2,'EXPERT\r\n\r\nFEDERATION\r\nNIMITZ\r\nSTATUS');
  await first.send('TELL NIMITZ; Mixed Case / TIME; literal tail','command:tell');
  await second.send('STATUS','command:status');
  assert.ok(second.output().includes('Mixed Case / TIME; literal tail'));
  assert.equal(first.runtime.main.calls.some(call=>call.routine==='time'),false);
  await second.send('TELL LEXINGTON; Reply from Nimitz','command:tell');
  await first.send('STATUS','command:status');assert.ok(first.output().includes('Reply from Nimitz'));
  await second.send('RADIO OFF','command:radio');
  await first.send('TELL NIMITZ; Must not arrive','command:tell');
  await second.send('STATUS','command:status');assert.equal(second.output().includes('Must not arrive'),false);
  await second.send('RADIO ON','command:radio');
  await first.send('TELL NIMITZ; Radio restored','command:tell');
  await second.send('STATUS','command:status');assert.ok(second.output().includes('Radio restored'));
  assert.equal(first.runtime.f.high.read('numply'),2n);assert.equal(first.runtime.f.high.read('shpcon',1,K.KNTURN),0n);
  assert.equal(second.runtime.f.high.read('shpcon',2,K.KNTURN),0n);
});
test('Live opposing captains fire PHASERS and TORPEDO through native arithmetic and receive shared hits',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),first=await game(t,world),second=await game(t,world,2,'EXPERT\r\n\r\nEMPIRE\r\nCOBRA\r\nSTATUS');
  const {f,main}=first.runtime,enemy=Number(second.runtime.f.low.read('who'));
  // Controlled encounter geometry, retaining all commissioned ship resources.
  // No command, damage, random or turn routine is replaced by this setup.
  for(const who of [1,enemy])f.views.high.board.setdsp(Number(f.high.read('shpcon',who,K.KVPOS)),Number(f.high.read('shpcon',who,K.KHPOS)),0);
  let location:[number,number]|undefined;
  for(let v=15;v<=45&&!location;v++)for(let h=15;h<=44;h++)if(f.views.high.board.disp(v,h)===0&&f.views.high.board.disp(v,h+1)===0){location=[v,h];break;}
  assert.ok(location);const [v,h]=location;
  for(const [who,column,code] of [[1,h,101],[enemy,h+1,200+enemy]]){
    f.high.write('shpcon',BigInt(v),who,K.KVPOS);f.high.write('shpcon',BigInt(column),who,K.KHPOS);f.views.high.board.setdsp(v,column,code);
  }
  f.file.write('seed',12345n);
  const energy=f.high.read('shpcon',1,K.KSNRGY),shield=f.high.read('shpcon',enemy,K.KSSHPC),turns=f.high.read('shpcon',1,K.KNTURN),enemyOutput=second.output().length;
  let firingEnergy:bigint|undefined;
  first.events.once('command:phacon',()=>{firingEnergy=f.high.read('shpcon',1,K.KSNRGY);});
  await first.send(`PHASERS ABSOLUTE 50 ${v} ${h+1}`,'command:phacon');
  assert.equal(firingEnergy,energy-2500n);assert.ok(main.phaser.events.includes('phadam'));
  assert.ok(f.high.read('shpcon',enemy,K.KSSHPC)<shield);assert.notEqual(f.file.read('seed'),12345n);
  assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+1n);
  assert.ok(main.phaser.hits.some(hit=>hit.dispfr===101n&&hit.dispto===BigInt(200+enemy)));
  await second.send('STATUS','command:status');
  assert.ok(second.output().slice(enemyOutput).includes('P  C '));assert.equal(f.high.read('hitflg',enemy),0n);
  assert.ok(second.runtime.f.outHit.events.includes('odisp:101'));assert.ok(second.runtime.f.outHit.events.includes('odisp:'+String(200+enemy)));
  await first.send('STATUS','command:status');assert.equal(f.high.read('alive',enemy),-1n);
  f.file.write('seed',1n);const rounds=f.high.read('shpcon',1,K.KNTORP),torpedoOutput=second.output().length;
  await first.send(`TORPEDO ABSOLUTE 1 ${v} ${h+1}`,'command:torp');
  assert.equal(f.high.read('shpcon',1,K.KNTORP),rounds-1n);assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+2n);
  assert.ok(main.romulan.torpedoes.events.includes('tordam'));assert.ok(main.torpedo.hits.some(hit=>hit.dispto===BigInt(200+enemy)));
  await second.send('STATUS','command:status');assert.ok(second.output().slice(torpedoOutput).includes('T  C '));assert.equal(f.high.read('hitflg',enemy),0n);
});
test('Live SCAN, USERS and LIST FRIENDLY complete through the source command loop',{timeout:10000},async t=>{
  const {runtime,send}=await game(t);
  await send('SCAN 1','command:scan');await send('SRSCAN 1','command:srscan');
  await send('USERS','command:users');await send('LIST FRIENDLY','command:list');
  await send('BASES','command:bases');await send('PLANETS','command:planet');await send('TARGETS','command:target');
  await send('STATUS','command:status');assert.equal(runtime.f.low.read('who'),1n);
});
test('Live HELP reads actual archive topics on every open and NEWS retains its separate archive file',{timeout:10000},async t=>{
  const {runtime,send,output}=await game(t),{f}=runtime,file=sourceFile('DECWAR.HLP');
  const headings=[...file.matchAll(/(?:\n|\f)\.([^\r\n]*)/g)];
  const body=(term:string)=>{
    const index=headings.findIndex(m=>m[1].slice(0,5).toUpperCase()===term.slice(0,5));assert.ok(index>=0);
    const start=file.indexOf('\n',headings[index].index+1)+1,end=headings[index+1]?headings[index+1].index+1:file.length;
    return file.slice(start,end).replaceAll('\f','');
  };
  const v=Number(f.high.read('shpcon',1,K.KVPOS)),h=Number(f.high.read('shpcon',1,K.KHPOS)),turns=f.high.read('shpcon',1,K.KNTURN);
  let start=output().length;await send('HELP MOVE NEWS','command:help');
  assert.ok(output().slice(start).includes(body('MOVE')));assert.ok(output().slice(start).includes(body('NEWS')));
  start=output().length;await send('NEWS','command:news');assert.ok(output().slice(start).includes(sourceFile('DECWAR.NWS')));
  f.low.write('pasflg',-1n);const opens=f.help.events.length;start=output().length;
  await send('HELP MOVE','command:help');assert.ok(output().slice(start).includes(body('MOVE')));
  assert.deepEqual(f.help.events.slice(opens).filter(event=>event.startsWith('open:')),[`open:${f.help.symbols.hl1fil}`,`open:${f.help.symbols.hl2fil}`]);
  assert.equal(f.views.high.board.disp(v,h),101);assert.equal(f.high.read('shpcon',1,K.KNTURN),turns);
  await send('STATUS','command:status');
});
test('Live interrupt inside scan output finishes its current row, clears CCFLG and accepts another command',{timeout:10000},async t=>{
  const {session,runtime,send}=await game(t),{f,main}=runtime;
  const first=main.scan.events.length;await send('SCAN 1','command:scan');
  const completeRows=main.scan.events.slice(first).filter(event=>event==='ocrl.').length;assert.ok(completeRows>1);
  let showing=false,characters=0,ready:()=>void=()=>{};
  const printing=new Promise<void>(resolve=>{ready=resolve;}),output=main.scan.machineIO.output,outchr=f.cpu.outchr;
  main.scan.machineIO.output=function*(entry){if(entry==='ostr.')showing=true;yield*output(entry);showing=false;};
  f.cpu.outchr=function*(byte){if(showing&&++characters===2)ready();yield*outchr(byte);};
  const start=main.scan.events.length,pending=send('SCAN 1','command:scan');
  await Promise.race([printing,pending.then(()=>{throw new Error('SCAN finished before output interruption');})]);
  assert.equal(showing,true);session.interrupt();await pending;
  // One leading blank line, one coordinate header, then exactly one data row.
  assert.equal(main.scan.events.slice(start).filter(event=>event==='ocrl.').length,3);
  assert.equal(f.low.read('ccflg'),0n);assert.deepEqual(runtime.interrupts.traps,[]);assert.deepEqual(runtime.interrupts.returns,[0n]);
  await send('STATUS','command:status');assert.equal(main.events.includes('sure'),false);assert.equal(f.high.read('alive',1),-1n);
});
test('Hangup during STATUS preserves the source GETCMD loop while another captain and host shutdown continue',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),first=await game(t,world),second=await game(t,world,2,'EXPERT\r\n\r\nFEDERATION\r\nNIMITZ\r\nSTATUS');
  const {session,runtime}=first,{f,main}=runtime;
  let inStatus=false,printing:()=>void=()=>{},looping:()=>void=()=>{},loops=0;
  const started=new Promise<void>(resolve=>{printing=resolve;}),repeated=new Promise<void>(resolve=>{looping=resolve;});
  const invoke=main.io.invoke,outchr=f.cpu.outchr,endgam=f.getCommand.io.endgam;
  main.io.invoke=function*(call){inStatus=call.routine==='status';const result=yield*invoke(call);inStatus=false;return result;};
  f.cpu.outchr=function*(byte){if(inStatus)printing();yield*outchr(byte);};
  f.getCommand.io.endgam=function*(){if(f.low.read('hungup')!==0n&&++loops===3)looping();yield*endgam();};
  const failure=session.done.then(result=>{throw new Error('Session unexpectedly ended: '+JSON.stringify(result));});
  session.receive(Buffer.from('STATUS\r\n'));await Promise.race([started,failure]);session.disconnect();await Promise.race([repeated,failure]);
  assert.equal(f.low.read('hungup'),-1n);assert.equal(f.high.read('alive',1),-1n);assert.equal(main.events.includes('leave'),false);
  await second.send('STATUS','command:status');assert.ok(loops>=3);assert.equal(f.high.read('numply'),2n);
  session.cancel();assert.deepEqual(await session.done,{reason:'cancelled'});
});
test('Two live friendly captains establish a tractor beam and release it by raising shields',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),first=await game(t,world),second=await game(t,world,2,'EXPERT\r\n\r\nFEDERATION\r\nNIMITZ\r\nSTATUS'),f=first.runtime.f;
  const v=Number(f.high.read('shpcon',1,K.KVPOS)),h=Number(f.high.read('shpcon',1,K.KHPOS));
  const target=[[v,h+1],[v,h-1],[v+1,h],[v-1,h]].find(([v,h])=>v>=1&&v<=K.KGALV&&h>=1&&h<=K.KGALH&&f.views.high.board.disp(v,h)===0);assert.ok(target);
  f.views.high.board.setdsp(Number(f.high.read('shpcon',2,K.KVPOS)),Number(f.high.read('shpcon',2,K.KHPOS)),0);
  f.high.write('shpcon',BigInt(target[0]),2,K.KVPOS);f.high.write('shpcon',BigInt(target[1]),2,K.KHPOS);f.views.high.board.setdsp(...target as [number,number],102);
  await first.send('SHIELD DOWN','command:shield');await second.send('SHIELD DOWN','command:shield');
  await first.send('TRACTOR NIMITZ','command:tractr');assert.equal(f.high.read('trstat',1),2n);assert.equal(f.high.read('trstat',2),1n);
  await second.send('STATUS','command:status');assert.ok(second.runtime.f.outHit.events.includes('outh24'));
  await second.send('SHIELD UP','command:shield');assert.equal(f.high.read('trstat',1),0n);assert.equal(f.high.read('trstat',2),0n);
  await first.send('STATUS','command:status');assert.ok(first.runtime.f.outHit.events.includes('outh26'));
  assert.equal(f.high.read('shpcon',1,K.KNTURN),0n);assert.equal(f.high.read('shpcon',2,K.KNTURN),0n);
});
test('Live CAPTURE, BUILD, DOCK and POINTS preserve shared ownership, supplies and score',{timeout:30000},async t=>{
  const {runtime,send}=await game(t,new SharedGameWorld(),1,'EXPERT\r\n\r\nTOURNAMENT PORT\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS'),{f}=runtime;
  let encounter:{planet:number;v:number;h:number;shipV:number;shipH:number}|undefined;
  for(let i=1;i<=Number(f.high.read('nplnet'))&&!encounter;i++){
    const v=Number(f.high.read('locpln',i,K.KVPOS)),h=Number(f.high.read('locpln',i,K.KHPOS));
    for(const [sv,sh] of [[v,h+1],[v,h-1],[v+1,h],[v-1,h]]){
      if(sv<1||sv>K.KGALV||sh<1||sh>K.KGALH||f.views.high.board.disp(sv,sh)!==0)continue;
      const nearEnemy=Array.from({length:K.KNBASE},(_,b)=>b+1).some(b=>Math.max(Math.abs(Number(f.high.read('base',b,K.KVPOS,2))-sv),Math.abs(Number(f.high.read('base',b,K.KHPOS,2))-sh))<=K.KRANGE);
      if(!nearEnemy){encounter={planet:i,v,h,shipV:sv,shipH:sh};break;}
    }
  }
  assert.ok(encounter);const {planet,v,h,shipV,shipH}=encounter;
  // Place a commissioned, depleted ship beside an existing neutral planet.
  // Preserve that world's objects and all capture/build/dock command services.
  f.views.high.board.setdsp(Number(f.high.read('shpcon',1,K.KVPOS)),Number(f.high.read('shpcon',1,K.KHPOS)),0);
  f.high.write('shpcon',BigInt(shipV),1,K.KVPOS);f.high.write('shpcon',BigInt(shipH),1,K.KHPOS);f.views.high.board.setdsp(shipV,shipH,101);
  f.high.write('shpcon',20000n,1,K.KSNRGY);f.high.write('shpcon',0n,1,K.KNTORP);f.file.write('seed',1n);
  const captures=f.high.read('numcap',1);
  await send(`CAPTURE ABSOLUTE ${v} ${h}`,'command:captur');
  assert.equal(f.views.high.board.disp(v,h),700+planet);assert.equal(f.high.read('numcap',1),captures+1n);assert.equal(f.high.read('score',K.KPPCAP,1),1000n);
  await send(`BUILD ABSOLUTE ${v} ${h}`,'command:build');assert.equal(f.high.read('locpln',planet,3),1n);assert.equal(f.high.read('score',K.KPBBAS,1),500n);
  const energy=f.high.read('shpcon',1,K.KSNRGY);await send('DOCK STATUS T E','command:dock');
  assert.equal(f.high.read('docked',1),-1n);assert.ok(f.high.read('shpcon',1,K.KNTORP)>=5n);assert.ok(f.high.read('shpcon',1,K.KSNRGY)>=energy+5000n);
  await send('POINTS','command:points');assert.equal(f.points.po.read('total',1),1500n);assert.equal(f.high.read('shpcon',1,K.KNTURN),3n);
  assert.equal(f.high.read('plnlok'),0n);await send('STATUS','command:status');
});
test('Live Romulan creation and movement execute native CHECK from successive source turns',{timeout:30000},async t=>{
  const {runtime,send}=await game(t,new SharedGameWorld(),1,'EXPERT\r\n\r\nTOURNAMENT PORT\r\nYES\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS'),{f,main}=runtime;
  assert.equal(f.high.read('romopt'),-1n);f.file.write('seed',1n);
  const ammo=f.high.read('shpcon',1,K.KNTORP);
  // Exercise ROMDRV through real movement turns, without dispatching it directly.
  for(let turn=0;turn<8&&!main.romulan.events.includes('check');turn++){
    const v=Number(f.high.read('shpcon',1,K.KVPOS)),h=Number(f.high.read('shpcon',1,K.KHPOS));
    const target=[[v,h+1],[v,h-1],[v+1,h],[v-1,h]].find(([v,h])=>v>=1&&v<=K.KGALV&&h>=1&&h<=K.KGALH&&f.views.high.board.disp(v,h)===0);
    assert.ok(target);await send('MOVE ABSOLUTE '+target.join(' '),'turn');
  }
  assert.ok(main.romulan.events.includes('place'));assert.ok(main.romulan.events.includes('check'));
  assert.equal(f.m.read(main.romulan.s.realZero),0n);
  assert.equal(f.high.read('numrom'),1n);assert.equal(f.high.read('shpcon',1,K.KNTORP),ammo);
  assert.ok(main.romulan.events.some(event=>/^setdsp:.*?,500$/.test(event)));
  // Nearby base/planet defenses may kill it in this same turn. Check the live
  // board only while it remains active; do not suppress those source defenses.
  if(f.high.read('rom')<0n){const v=Number(f.high.read('locr',K.KVPOS)),h=Number(f.high.read('locr',K.KHPOS));assert.equal(f.views.high.board.disp(v,h),500);}
  await send('STATUS','command:status');
});
for(const action of ['disconnect','interrupt'] as const)for(const [stage,input,prompt,players,team] of [
  ['pregame','EXPERT\r\n','strtup',0,0],
  ['choose-side','EXPERT\r\n\r\n\r\nNO\r\nNO\r\n','setu18',1,0],
  ['choose-ship','EXPERT\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\n','setu14',1,1],
] as const)test(`Live ${action} at ${stage} follows source MONIT and its stage-specific cancellation`,{timeout:10000},async t=>{
  const world=new SharedGameWorld();let runtime!:ReturnType<typeof liveSessionRuntime>,output='',ready:()=>void=()=>{};
  const reached=new Promise<void>(resolve=>{ready=resolve;});
  const session=new GameSession(terminal=>{runtime=liveSessionRuntime(terminal,'full',world,1);return runtime.program;},bytes=>{
    output+=Buffer.from(bytes).toString('latin1');if(output.includes(messages[prompt].text))ready();
  });
  t.after(async()=>{session.cancel();await session.done;world.releaseJob(1);});
  session.start();session.receive(Buffer.from(input));
  await Promise.race([reached,session.done.then(result=>{throw new Error('Exited before setup prompt: '+JSON.stringify(result,(_k,v)=>v instanceof Error?v.stack:v));})]);
  assert.equal(runtime.f.high.read('numply'),BigInt(players));assert.equal(runtime.f.high.read('numsid',1),BigInt(team));
  session[action]();assert.deepEqual(await session.done,{reason:'completed'});
  if(action==='interrupt')assert.deepEqual(runtime.interrupts.traps,stage==='pregame'?[]:[runtime.main.admission.trapAddresses[stage==='choose-side'?'cc1':'cc2']]);
  assert.equal(runtime.f.high.read('numply'),0n);assert.equal(runtime.f.high.read('numsid',1),0n);assert.equal(runtime.f.low.read('who'),0n);
  assert.equal(runtime.f.high.read('numshp',1),BigInt(team)); // CC2 does not undo this source count.
  for(let i=0;i<20;i++)assert.equal(runtime.f.locks.read('loktab',i),0n);
  assert.equal(world.files.read('DECWAR.STA'),undefined);assert.equal(output.includes('MONIT transfer'),false);
});
test('Live TIME uses current clock/CPU bindings and later shield commands remain in the same session',{timeout:10000},async t=>{
  const {session,runtime,send,output}=await game(t),{f,main}=runtime;
  await send('TIME','command:time');
  for(const key of ['time01','time02','time03','time04','time05'] as const)assert.ok(output().includes(messages[key].text));
  assert.equal(main.time.runs.length,0);assert.ok(session.terminal.runtimeMilliseconds()>=0n);
  const energy=f.high.read('shpcon',1,K.KSNRGY),turns=f.high.read('shpcon',1,K.KNTURN);
  await send('SHIELD DOWN','command:shield');assert.equal(f.high.read('shpcon',1,K.KSHCON),-1n);
  await send('SHIELD UP','command:shield');assert.equal(f.high.read('shpcon',1,K.KSHCON),1n);
  assert.equal(f.high.read('shpcon',1,K.KSNRGY),energy-1000n);assert.equal(f.high.read('shpcon',1,K.KNTURN),turns);
  await send('STATUS','command:status');assert.equal(main.calls.filter(call=>call.routine==='status').length,2);
});
test('Live main interrupt runs INTH, prompts QUIT, and accepts NO followed by STATUS',{timeout:10000},async t=>{
  const {session,runtime,send,events}=await game(t),prompt=once(events,'quit-prompt');
  session.interrupt();await Promise.race([prompt,session.done.then(result=>{throw new Error('Interrupted session ended: '+JSON.stringify(result,(_k,v)=>v instanceof Error?v.stack:v));})]);
  await send('NO\r\nSTATUS','command:status');
  assert.equal(runtime.main.calls.filter(call=>call.routine==='status').length,2);
  assert.equal(runtime.main.events.includes('leave'),false);assert.equal(runtime.interrupts.returns.length,1);
  assert.deepEqual(runtime.interrupts.traps,[]);assert.equal(runtime.f.low.read('who'),1n);
});
test('Source commission and game counters survive a new world with reopened disk statistics',{timeout:10000},async t=>{
  const directory=mkdtempSync(join(tmpdir(),'decwar-live-stats-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const files=new DiskWordFiles(directory),first=await game(t,new SharedGameWorld(files));
  const name=first.runtime.f.locks.read('frebie')!==0n?'DECWAF.STA':'DECWAR.STA';
  assert.equal(first.runtime.f.high.read('gameno'),1n);assert.equal(files.read(name)![513],1n);
  first.session.cancel();await first.session.done;
  const reopened=new DiskWordFiles(directory),second=await game(t,new SharedGameWorld(reopened));
  assert.equal(second.runtime.f.high.read('gameno'),2n);assert.equal(reopened.read(name)![513],2n);
  assert.equal(second.runtime.f.statistics.writes.length,0); // Uses the host store, not fixture write arrays.
});
test('Corrupt statistics length stops source admission without overwriting the file',{timeout:10000},async t=>{
  const directory=mkdtempSync(join(tmpdir(),'decwar-live-stats-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const files=new DiskWordFiles(directory);files.write('DECWAR.STA',[123n]);
  await assert.rejects(game(t,new SharedGameWorld(files)),/Statistics file must contain 640 words/);
  assert.deepEqual(files.read('DECWAR.STA'),[123n]);
});
test('Live GRIPE persists packed reports in source prepend order and restores the ship',{timeout:10000},async t=>{
  const directory=mkdtempSync(join(tmpdir(),'decwar-live-gripe-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const files=new DiskWordFiles(directory),world=new SharedGameWorld(files),{runtime,send}=await game(t,world),{f}=runtime;
  const v=Number(f.high.read('shpcon',1,K.KVPOS)),h=Number(f.high.read('shpcon',1,K.KHPOS)),turns=f.high.read('shpcon',1,K.KNTURN);
  await send('GRIPE\r\nFirst report\x1a','command:gripe');
  const first=files.read('DECWAR.GRP');assert.ok(first);assert.ok(first.map(unpackAscii).join('').includes('First report\r\n'));
  await send('GRIPE\r\nSecond report\x1a','command:gripe');
  const combined=new DiskWordFiles(directory).read('DECWAR.GRP')!;
  assert.deepEqual(combined.slice(-first.length),first);
  const text=combined.map(unpackAscii).join('');assert.ok(text.indexOf('Second report')<text.indexOf('First report'));
  assert.equal(f.views.high.board.disp(v,h),101);assert.equal(f.high.read('shpcon',1,K.KNTURN),turns);
  assert.equal(f.gripe.writes.length,0);assert.ok(world.openExclusiveFile('DECWAR.GRP',2));world.closeExclusiveFile('DECWAR.GRP',2);
  await send('STATUS','command:status');
});
test('Live GRIPE follows source busy-file retry after a monitor wake and owner teardown',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),{session,runtime,send,output}=await game(t,world);
  assert.ok(world.openExclusiveFile('DECWAR.GRP',2));
  let sleeping:()=>void=()=>{};const blocked=new Promise<void>(resolve=>{sleeping=resolve;});
  const hibernate=runtime.f.gripe.io.hibernate;
  runtime.f.gripe.io.hibernate=function*(){assert.equal(runtime.f.r.t1,3000n);sleeping();return yield*hibernate();};
  const pending=send('GRIPE\r\nQueued report\x1a','command:gripe');
  await Promise.race([blocked,pending]);assert.equal(world.files.read('DECWAR.GRP'),undefined);
  assert.equal(world.openExclusiveFile('DECWAR.GRP',3),false);
  world.releaseJob(2);session.terminal.wake();await pending;
  assert.ok(output().includes('DECWAR.GRP being modified; trying again'));
  assert.ok(world.files.read('DECWAR.GRP')!.map(unpackAscii).join('').includes('Queued report'));
});
test('Live empty GRIPE EOF restores the terminal without creating a report file',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),{runtime,send}=await game(t,world);
  await send('GRIPE\r\n\x1a','command:gripe');assert.equal(world.files.read('DECWAR.GRP'),undefined);
  assert.equal(runtime.f.low.read('ccflg'),0n);await send('STATUS','command:status');
});
test('Live GRIPE grows past the old fixture heap and shrinks after preserving old words',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),old=Array<bigint>(12000).fill(signed36(packAscii('OLD  ')));world.files.write('DECWAR.GRP',old);
  const {runtime,send}=await game(t,world);await send('GRIPE\r\nHeap growth report\x1a','command:gripe');
  const combined=world.files.read('DECWAR.GRP')!;assert.ok(combined.length>old.length);
  assert.equal(combined.slice(-old.length).findIndex((word,i)=>word!==old[i]),-1,'Old word tail must be unchanged');
  assert.equal(runtime.f.job.jbff,0o240000n);assert.equal(runtime.f.job.jbrel,0o240777n);
  assert.throws(()=>runtime.f.m.read(0o240000n+12000n),/Unmapped/);await send('STATUS','command:status');
});
test('An oversized old GRIPE file takes source CORE failure cleanup without data loss',{timeout:10000},async t=>{
  const world=new SharedGameWorld(),old=Array<bigint>(50000).fill(signed36(packAscii('OLD  ')));world.files.write('DECWAR.GRP',old);
  const {runtime,send,output}=await game(t,world);await send('GRIPE\r\nCannot fit report\x1a','command:gripe');
  assert.equal(world.files.read('DECWAR.GRP')!.findIndex((word,i)=>word!==old[i]),-1);assert.ok(output().includes("Can't get core to read DECWAR.GRP"));
  assert.equal(runtime.f.low.read('ccflg'),0n);assert.ok(world.openExclusiveFile('DECWAR.GRP',2));world.closeExclusiveFile('DECWAR.GRP',2);
  await send('STATUS','command:status');
});
test('Live MOVE completes source movement, lock release and automatic turn accounting',{timeout:10000},async t=>{
  const {runtime,send}=await game(t),{f,main}=runtime;
  const v=Number(f.high.read('shpcon',1,K.KVPOS)),h=Number(f.high.read('shpcon',1,K.KHPOS));
  const target=[[v,h+1],[v,h-1],[v+1,h],[v-1,h]].find(([v,h])=>v>=1&&v<=K.KGALV&&h>=1&&h<=K.KGALH&&f.views.high.board.disp(v,h)===0);
  assert.ok(target,'Startup ship needs an adjacent empty sector for this movement probe');
  const turns=f.high.read('shpcon',1,K.KNTURN);
  await send('MOVE ABSOLUTE '+target.join(' '),'turn');
  assert.equal(f.high.read('shpcon',1,K.KVPOS),BigInt(target[0]));assert.equal(f.high.read('shpcon',1,K.KHPOS),BigInt(target[1]));
  assert.equal(f.views.high.board.disp(v,h),0);assert.equal(f.views.high.board.disp(...target as [number,number]),101);
  assert.equal(f.high.read('shpcon',1,K.KNTURN),turns+1n);assert.ok(main.events.includes('movement'));
  for(let i=0;i<20;i++)assert.equal(f.locks.read('loktab',i),0n);
});
