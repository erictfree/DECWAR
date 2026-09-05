import test from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { once } from 'node:events';
import { createTelnetServer } from '../src/transport/server.ts';
import { TelnetCodec } from '../src/transport/telnet.ts';
import { liveSessionRuntime } from './fixtures/live-session-runtime.ts';
import type { SessionResult } from '../src/runtime/session.ts';
import { constants as K,messages } from '../src/generated/source-data.ts';
import { SharedGameWorld } from '../src/runtime/shared-world.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { reloadableSession,SessionReload } from '../src/runtime/reloadable-session.ts';

test('Live Telnet connection runs original experience prompt and TYPE startup output',async t=>{
  const endings:SessionResult[]=[],runtimes:ReturnType<typeof liveSessionRuntime>[]=[];
  const host=createTelnetServer({createSession(terminal){const runtime=liveSessionRuntime(terminal);runtimes.push(runtime);return runtime.program;},onSessionEnd(_id,result){endings.push(result);}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
  const address=host.server.address();assert.ok(address&&typeof address!=='string');
  const socket=connect(address.port,'127.0.0.1'),chunks:Buffer[]=[];t.after(()=>socket.destroy());
  socket.on('data',bytes=>chunks.push(Buffer.from(bytes)));await once(socket,'connect');
  // Fragment an option request and application input across separate writes.
  socket.write(Uint8Array.of(255));socket.write(Uint8Array.of(251,1));
  socket.write('EXP');socket.write('ERT\r\n');await once(socket,'end');
  const wire=Buffer.concat(chunks),text=wire.toString('latin1');
  assert.ok(new TelnetCodec().feed(wire).data.toString('latin1').startsWith('[DECWAR Version 2.3, 20-Nov-81]\r\n'));
  assert.ok(wire.includes(Buffer.from([255,254,1])));
  assert.equal(runtimes[0].f.low.read('oflg'),BigInt(K.SHORT));
  assert.deepEqual(runtimes[0].entry.events,['clearLow','startupText','type:1','type:2','summar']);
  assert.deepEqual(endings,[{reason:'completed'}]);
  // Decode negotiation and NVT CR-NUL framing before comparing game bytes.
  assert.equal(new TelnetCodec().feed(wire).data.toString('latin1'),runtimes[0].f.text());
});
test('Separate live terminal sessions keep their startup preferences private',async t=>{
  const runtimes:ReturnType<typeof liveSessionRuntime>[]=[];
  const host=createTelnetServer({createSession(terminal){const r=liveSessionRuntime(terminal);runtimes.push(r);return r.program;}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
  const address=host.server.address();assert.ok(address&&typeof address!=='string');
  const first=connect(address.port,'127.0.0.1');first.resume();await once(first,'connect');
  const second=connect(address.port,'127.0.0.1');second.resume();await once(second,'connect');
  t.after(()=>{first.destroy();second.destroy();});
  const completed=Promise.all([once(first,'end'),once(second,'end')]);first.write('BEGINNER\r\n');second.write('EXPERT\r\n');await completed;
  assert.equal(runtimes[0].f.low.read('oflg'),BigInt(K.MEDIUM));assert.equal(runtimes[1].f.low.read('oflg'),BigInt(K.SHORT));
});
test('Live Telnet session creates a galaxy, admits a ship and executes STATUS',async t=>{
  let runtime:ReturnType<typeof liveSessionRuntime>|undefined;
  let ended:(result:SessionResult)=>void=()=>{};
  const endResult=new Promise<SessionResult>(resolve=>{ended=resolve;});
  const host=createTelnetServer({createSession(terminal){runtime=liveSessionRuntime(terminal,'full');return runtime.program;},onSessionEnd(_id,result){ended(result);}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
  const address=host.server.address();assert.ok(address&&typeof address!=='string');
  const socket=connect(address.port,'127.0.0.1'),decoder=new TelnetCodec();let output='';
  t.after(()=>socket.destroy());
  let ready:()=>void=()=>{};const status=new Promise<void>(resolve=>{ready=resolve;});
  socket.on('data',bytes=>{output+=decoder.feed(Buffer.from(bytes)).data.toString('latin1');if(output.includes('T10 E5000'))ready();});
  await once(socket,'connect');socket.write('EXPERT\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS\r\n');
  const reached=await Promise.race([status.then(()=>({status:true})),endResult.then(result=>({result}))]);
  assert.ok('status'in reached,JSON.stringify(reached,(_k,v)=>v instanceof Error?v.message:v));
  assert.ok(runtime);assert.equal(runtime.f.high.read('nplnet'),60n);assert.equal(runtime.f.low.read('who'),1n);
  assert.equal(runtime.f.high.read('alive',1),-1n);assert.deepEqual(runtime.main.calls,[{routine:'status',argument:2}]);
});
test('Two live captains join the same galaxy without reloading shared state',async t=>{
  const world=new SharedGameWorld(),runtimes:ReturnType<typeof liveSessionRuntime>[]=[],ends=new Map<number,SessionResult>();
  const host=createTelnetServer({createSession(terminal,connection){const r=liveSessionRuntime(terminal,'full',world,connection.id);r.f.jobStatus.monitor.job=BigInt(connection.id);r.f.jobStatus.monitor.sequenceJob=BigInt(connection.id);runtimes.push(r);return r.program;},onSessionEnd(id,result){world.releaseJob(id);ends.set(id,result);}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
  const address=host.server.address();assert.ok(address&&typeof address!=='string');
  const port=address.port;
  async function join(input:string){
    const socket=connect(port,'127.0.0.1'),decoder=new TelnetCodec();let text='';
    t.after(()=>socket.destroy());
    let ready:()=>void=()=>{};const status=new Promise<void>(resolve=>{ready=resolve;});
    socket.on('data',data=>{text+=decoder.feed(Buffer.from(data)).data.toString('latin1');if(text.includes('T10 E5000'))ready();});
    await once(socket,'connect');socket.write(input);
    await Promise.race([status,once(socket,'end').then(()=>{throw new Error('Session ended before STATUS: '+JSON.stringify([...ends.values()],(_k,v)=>v instanceof Error?v.message:v));})]);
    return socket;
  }
  await join('EXPERT\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS\r\n');
  const first=runtimes[0];first.f.high.write('score',123n,1,1);const firstSeed=first.f.file.read('seed');
  await join('EXPERT\r\n\r\nFEDERATION\r\nNIMITZ\r\nSTATUS\r\n');
  const second=runtimes[1];assert.equal(first.f.low.read('who'),1n);assert.equal(second.f.low.read('who'),2n);
  assert.equal(first.f.high.read('numply'),2n);assert.equal(second.f.high.read('numply'),2n);assert.equal(second.f.high.read('score',1,1),123n);
  assert.equal(first.f.file.read('seed'),firstSeed);assert.equal(first.f.high.read('alive',2),-1n);
  assert.equal(second.f.high.read('nplnet'),60n);assert.equal(second.main.setup.events.some(event=>event.startsWith('clear:')),false);
  const stats=world.files.read(first.f.locks.read('frebie')!==0n?'DECWAF.STA':'DECWAR.STA');
  assert.ok(stats);assert.equal(stats[513],1n);assert.equal(stats[514],1n);assert.equal(second.f.high.read('gameno'),1n);
});
test('Live disconnect reaches source cleanup and exposes final POINTS without inventing ship release',{timeout:10000},async t=>{
  const world=new SharedGameWorld();let runtime:ReturnType<typeof liveSessionRuntime>|undefined;
  let finish:(result:SessionResult)=>void=()=>{};const result=new Promise<SessionResult>(resolve=>{finish=resolve;});
  let idle:()=>void=()=>{};const waiting=new Promise<void>(resolve=>{idle=resolve;});
  const host=createTelnetServer({createSession(terminal,{id}){
    const r=liveSessionRuntime(terminal,'full',world,id);runtime=r;const hiber=r.f.wait.io.hiber;
    r.f.wait.io.hiber=function*(){if(r.main.calls.some(call=>call.routine==='status')&&!terminal.available()&&r.f.r.t1>>18n===r.f.wait.wakeInputLeftHalf)idle();return yield*hiber();};
    return r.program;
  },onSessionEnd(id,outcome){world.releaseJob(id);finish(outcome);}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
  const address=host.server.address();assert.ok(address&&typeof address!=='string');
  const socket=connect(address.port,'127.0.0.1'),decoder=new TelnetCodec();let output='';
  t.after(()=>socket.destroy());let ready:()=>void=()=>{};const status=new Promise<void>(resolve=>{ready=resolve;});
  socket.on('data',data=>{output+=decoder.feed(Buffer.from(data)).data.toString('latin1');if(output.includes('T10 E5000'))ready();});
  await once(socket,'connect');socket.write('EXPERT\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS\r\n');await Promise.all([status,waiting]);
  socket.end();const outcome=await result;
  assert.equal(outcome.reason,'failed');if(outcome.reason!=='failed')assert.fail();
  assert.match(String(outcome.error),/uninitialized POINTS DO continuation/);
  assert.ok(runtime);assert.equal(runtime.f.low.read('hungup'),-1n);assert.equal(runtime.f.low.read('who'),1n);
  assert.equal(runtime.f.high.read('alive',1),-1n);assert.equal(runtime.f.high.read('numply'),1n);
  assert.ok(runtime.main.events.includes('leave'));assert.equal(output.includes('uninitialized POINTS'),false);
  assert.equal(host.sessions.size,0);
});
test('Telnet IP during ship selection invokes original CC2 and completes monitor exit',{timeout:10000},async t=>{
  const world=new SharedGameWorld();let runtime!:ReturnType<typeof liveSessionRuntime>,finish:(result:SessionResult)=>void=()=>{};
  const result=new Promise<SessionResult>(resolve=>{finish=resolve;});
  const host=createTelnetServer({createSession(terminal,{id}){runtime=liveSessionRuntime(terminal,'full',world,id);return runtime.program;},onSessionEnd(id,outcome){world.releaseJob(id);finish(outcome);}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
  const address=host.server.address();assert.ok(address&&typeof address!=='string');
  const socket=connect(address.port,'127.0.0.1'),decoder=new TelnetCodec();let text='',ready:()=>void=()=>{};
  t.after(()=>socket.destroy());const selecting=new Promise<void>(resolve=>{ready=resolve;});
  socket.on('data',bytes=>{text+=decoder.feed(Buffer.from(bytes)).data.toString('latin1');if(text.includes(messages.setu14.text))ready();});
  await once(socket,'connect');socket.write('EXPERT\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\n');
  await Promise.race([selecting,result.then(outcome=>{throw new Error('Exited before ship selection: '+JSON.stringify(outcome));})]);
  assert.equal(runtime.f.high.read('numply'),1n);assert.equal(runtime.f.high.read('numsid',1),1n);
  const ended=once(socket,'end');socket.write(Uint8Array.of(255,244));await ended;
  assert.deepEqual(await result,{reason:'completed'});assert.deepEqual(runtime.interrupts.traps,[runtime.main.admission.trapAddresses.cc2]);
  assert.equal(runtime.f.high.read('numply'),0n);assert.equal(runtime.f.high.read('numsid',1),0n);
  assert.equal(runtime.f.high.read('numshp',1),1n);assert.equal(text.includes('Source monitor exit'),false);
});
test('Eleven real Telnet captains fill both fleets and reload the arriving connection into a new galaxy',{timeout:15000},async t=>{
  const worlds=new WorldDirectory(),loads=new Map<number,ReturnType<typeof liveSessionRuntime>[]>(),ends=new Map<number,SessionResult>();
  const host=createTelnetServer({createSession(terminal,{id}){
    const runtimes:ReturnType<typeof liveSessionRuntime>[]=[];loads.set(id,runtimes);
    return reloadableSession(()=>{
      const world=worlds.load(),r=liveSessionRuntime(terminal,'full',world,id,{promptForName:true,lifecycle:{removeHighSegment(){worlds.remove(world);},run(){throw new SessionReload();}}});
      r.f.jobStatus.monitor.job=BigInt(id);r.f.jobStatus.monitor.sequenceJob=BigInt(id);runtimes.push(r);return r.program;
    },()=>worlds.monitor.releaseJob(id));
  },onSessionEnd(id,result){worlds.monitor.releaseJob(id);ends.set(id,result);}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
  const address=host.server.address();assert.ok(address&&typeof address!=='string');
  const port=address.port;
  async function join(input:string){
    const socket=connect(port,'127.0.0.1'),decoder=new TelnetCodec();let output='',marker=0,ready:()=>void=()=>{};
    t.after(()=>socket.destroy());
    socket.on('data',bytes=>{output+=decoder.feed(Buffer.from(bytes)).data.toString('latin1');if(output.slice(marker).includes('T10 E5000'))ready();});
    const ended=once(socket,'end').then(()=>{throw new Error('Ended before STATUS: '+JSON.stringify([...ends.values()],(_k,v)=>v instanceof Error?v.stack:v));});
    async function send(text:string){marker=output.length;const reached=new Promise<void>(resolve=>{ready=resolve;});socket.write(text);await Promise.race([reached,ended]);}
    await once(socket,'connect');await send(input);return {send,output:()=>output};
  }
  const names=['LEXINGTON','COBRA','NIMITZ','DEMON','SAVANNAH','HAWK','VULCAN','JACKAL','YORKTOWN','WOLF'];
  let first:Awaited<ReturnType<typeof join>>|undefined;
  for(const [i,name] of names.entries()){
    const client=await join('EXPERT\r\nCaptain\r\n\r\n'+(i===0?'\r\nNO\r\nNO\r\n':'')+(i%2===0?'FEDERATION':'EMPIRE')+'\r\n'+name+'\r\nSTATUS\r\n');
    first??=client;
  }
  const old=loads.get(1)![0];assert.equal(old.f.high.read('numply'),10n);assert.equal(old.f.high.read('numsid',1),5n);assert.equal(old.f.high.read('numsid',2),5n);
  const arrival=await join('EXPERT\r\nArrive\r\n\r\nEXPERT\r\nArrive\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS\r\n');
  assert.equal(loads.get(11)!.length,2);const next=loads.get(11)![1];assert.equal(next.f.high.read('gameno'),2n);assert.equal(next.f.high.read('numply'),1n);assert.equal(next.f.low.read('who'),1n);
  assert.ok(arrival.output().includes(messages.setu01.text));assert.equal(old.f.high.read('numply'),10n);assert.equal(old.f.high.read('dead'),-1n);
  assert.ok(first);await first.send('STATUS\r\n');assert.equal(ends.size,0);assert.equal(host.sessions.size,11);
});
