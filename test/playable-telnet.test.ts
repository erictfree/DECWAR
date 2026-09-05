import test from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { EventEmitter,once } from 'node:events';
import { createTelnetServer } from '../src/transport/server.ts';
import { TelnetCodec } from '../src/transport/telnet.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { reloadableSession,SessionReload } from '../src/runtime/reloadable-session.ts';
import { liveSessionRuntime } from './fixtures/live-session-runtime.ts';
import type { SessionResult } from '../src/runtime/session.ts';

test('Playable Telnet captains exchange messages, quit normally, disconnect and reuse released ships',{timeout:15000},async t=>{
  const worlds=new WorldDirectory(),ends=new Map<number,SessionResult>(),events=new EventEmitter();
  const host=createTelnetServer({createSession(terminal,{id}){
    return reloadableSession(()=>{
      const world=worlds.load(),r=liveSessionRuntime(terminal,'full',world,id,{playable:true,promptForName:true,lifecycle:{removeHighSegment(){worlds.remove(world);},run(){throw new SessionReload();}}});
      r.f.jobStatus.monitor.job=BigInt(id);r.f.jobStatus.monitor.sequenceJob=BigInt(id);return r.program;
    },()=>worlds.monitor.releaseJob(id));
  },onSessionEnd(id,result){worlds.monitor.releaseJob(id);ends.set(id,result);events.emit('end:'+id,result);}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
  const address=host.server.address();assert.ok(address&&typeof address!=='string');const port=address.port;
  async function client(name:string,ship:string,fresh=false){
    const socket=connect(port,'127.0.0.1'),decoder=new TelnetCodec(),data=new EventEmitter();let text='',closed=false;
    t.after(()=>socket.destroy());socket.on('data',bytes=>{text+=decoder.feed(Buffer.from(bytes)).data.toString('latin1');data.emit('change');});
    socket.on('end',()=>{closed=true;data.emit('change');});
    async function until(pattern:string,start:number){while(!text.slice(start).includes(pattern)){if(closed)throw new Error('Connection ended before '+pattern);await once(data,'change');}}
    async function request(input:string,pattern:string){const start=text.length;socket.write(input+'\r\n');await until(pattern,start);}
    async function quit(){await request('QUIT','Do you really want to quit? ');const end=once(socket,'end');socket.write('YES\r\n');await end;}
    await once(socket,'connect');await request('EXPERT\r\n'+name+'\r\n\r\n'+(fresh?'\r\nNO\r\nNO\r\n':'')+'FEDERATION\r\n'+ship+'\r\nSTATUS','T10 E5000');
    return {socket,request,quit,until,text:()=>text};
  }
  const first=await client('Alpha','LEXINGTON',true),second=await client('Beta','NIMITZ');
  const before=second.text().length;
  first.socket.write('TELL NIMITZ; Live network message\r\n');
  // Two commands permit the original GETCMD notification cycle to run even
  // if the first STATUS was already waiting when TELL arrived.
  await second.request('STATUS','T10 E5000');await second.request('STATUS','T10 E5000');await second.until('Live network message',before);
  await first.request('POINTS ALL','Lexington');await first.quit();assert.deepEqual(ends.get(1),{reason:'completed'});
  const third=await client('Gamma','LEXINGTON');await third.quit();assert.deepEqual(ends.get(3),{reason:'completed'});
  const disconnected=once(events,'end:2');second.socket.end();await disconnected;assert.deepEqual(ends.get(2),{reason:'completed'});
  assert.equal(host.sessions.size,0);
  const fourth=await client('Delta','NIMITZ');await fourth.quit();assert.deepEqual(ends.get(4),{reason:'completed'});
});
