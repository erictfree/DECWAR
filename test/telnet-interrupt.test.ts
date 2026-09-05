import test from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { EventEmitter,once } from 'node:events';
import { createTelnetServer } from '../src/transport/server.ts';
import { TelnetCodec } from '../src/transport/telnet.ts';
import { liveSessionRuntime } from './fixtures/live-session-runtime.ts';
import type { SessionResult } from '../src/runtime/session.ts';

for(const [name,control] of [['Telnet IP',[255,244]],['Telnet IP with timing mark',[255,244,255,253,6]],['raw Ctrl-C',[3]]] as const){
  test(`${name} cancels BUILD coordinates and permits another command`,{timeout:5000},async t=>{
    let runtime!:ReturnType<typeof liveSessionRuntime>,end:SessionResult|undefined;
    const changes=new EventEmitter();
    const host=createTelnetServer({createSession(terminal){
      runtime=liveSessionRuntime(terminal,'full',undefined,1,{playable:true});
      const inchwl=runtime.f.editor.terminalIO.inchwl;
      runtime.f.editor.terminalIO.inchwl=function*(){yield*inchwl();changes.emit('read:'+runtime.f.r.c);};
      return runtime.program;
    },onSessionEnd(_id,result){end=result;changes.emit('change');}});
    t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');
    const address=host.server.address();assert.ok(address&&typeof address!=='string');
    const socket=connect(address.port,'127.0.0.1'),decoder=new TelnetCodec();let text='',wire=Buffer.alloc(0);
    t.after(()=>socket.destroy());
    socket.on('data',bytes=>{wire=Buffer.concat([wire,Buffer.from(bytes)]);text+=decoder.feed(Buffer.from(bytes)).data.toString('latin1');changes.emit('change');});
    async function request(bytes:string|Uint8Array,expected:string){
      const start=text.length;socket.write(bytes);
      while(!text.slice(start).includes(expected)){
        assert.equal(end,undefined,JSON.stringify(end,(_key,v)=>v instanceof Error?v.stack:v));
        await once(changes,'change');
      }
      return text.slice(start);
    }
    await once(socket,'connect');
    await request('EXPERT\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS\r\n','> ');
    // Startup also emits a prompt before STATUS. Wait for the report itself.
    while(!text.includes('T10 E5000'))await once(changes,'change');
    for(const partial of ['','12','queued']){
      await request('BUILD\r\n','Coordinates: ');
      if(partial==='12'){const input=once(changes,'read:50');socket.write('12');await input;}
      const bytes=partial==='queued'?Buffer.concat([Buffer.from('BAD\r\n'),Uint8Array.from(control)]):Uint8Array.from(control);
      const interrupted=await request(bytes,'> ');
      assert.equal(interrupted.includes('Do you really want to quit?'),false);
      const status=await request('STATUS\r\n','T10 E5000');
      assert.equal(status.includes('Unknown command'),false);
    }
    assert.equal(runtime.interrupts.returns.length,3);
    assert.equal(runtime.f.low.read('who'),1n);
    assert.equal(runtime.f.low.read('ccflg'),0n);
    if(name==='Telnet IP with timing mark')assert.equal(wire.toString('hex').split('fffc06').length-1,3);
  });
}
