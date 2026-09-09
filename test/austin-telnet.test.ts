import test from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { EventEmitter,once } from 'node:events';
import { createTelnetServer } from '../src/transport/server.ts';
import { TelnetCodec } from '../src/transport/telnet.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { createVariantContext,variantDefinitions } from '../src/runtime/variant.ts';
import { createGameSession } from '../src/runtime/game-session.ts';
import { reloadableSession,SessionReload } from '../src/runtime/reloadable-session.ts';
import { constants as K } from '../src/generated/source-data.ts';
import type { SessionResult } from '../src/runtime/session.ts';

test('Austin Telnet startup, interrupts, ship reuse and eighteen concurrent captains',{timeout:30000},async t=>{
  const worlds=new WorldDirectory(undefined,createVariantContext('austin')),ends=new Map<number,SessionResult>(),events=new EventEmitter();
  const runtimes=new Map<number,ReturnType<typeof createGameSession>>();
  const host=createTelnetServer({createSession(terminal,{id}){return reloadableSession(()=>{
    const world=worlds.load(),r=createGameSession(terminal,'full',world,id,{playable:true,promptForName:true,lifecycle:{removeHighSegment(){worlds.remove(world);},run(){throw new SessionReload();}}});
    r.f.jobStatus.monitor.job=BigInt(id);r.f.jobStatus.monitor.sequenceJob=BigInt(id);runtimes.set(id,r);return r.program;
  },()=>worlds.monitor.releaseJob(id));},onSessionEnd(id,result){worlds.monitor.releaseJob(id);ends.set(id,result);events.emit('end:'+id);}});
  t.after(()=>host.close());host.server.listen(0,'127.0.0.1');await once(host.server,'listening');const address=host.server.address();assert.ok(address&&typeof address!=='string');
  const port=address.port;
  async function client(name:string,ship:string,fresh=false,team='FEDERATION',characterMode=false){
    const socket=connect(port,'127.0.0.1'),decoder=new TelnetCodec(),data=new EventEmitter();let text='',closed=false;
    t.after(()=>socket.destroy());socket.on('data',bytes=>{text+=decoder.feed(Buffer.from(bytes)).data.toString('latin1');data.emit('change');});socket.on('end',()=>{closed=true;data.emit('change');});
    async function until(pattern:string,start=0){while(!text.slice(start).includes(pattern)){if(closed)throw new Error('Connection ended before '+pattern+': '+text);await once(data,'change');}}
    async function request(input:string,pattern:string){const start=text.length;socket.write(input+(characterMode?'\r\0':'\r\n'));await until(pattern,start);}
    async function quit(){await request('QUIT','Do you really want to quit? ');const end=once(socket,'end');socket.write('YES\r\n');await end;}
    await once(socket,'connect');if(characterMode)socket.write(Buffer.from([255,253,3,255,253,1]));
    await until('Your name please: ');assert.ok(text.startsWith('DECWAR, Edit     0\r\n'));
    await request(name,'line: ');await request('\r\n'+(fresh?'\r\nNO\r\nNO\r\n':'')+team+'\r\n'+ship,'> srscan 2 w');
    await until('\r\n> ',text.indexOf('> srscan 2 w')+1);await request('STATUS','Radio  On');
    return {socket,request,quit,until,text:()=>text};
  }
  const first=await client('Alpha','YORKTOWN',true,'FEDERATION',true),second=await client('Beta','VULCAN');
  async function midnightDock(c:Awaited<ReturnType<typeof client>>,id:number,disconnect=false){
    const r=runtimes.get(id)!,f=r.f,who=Number(f.low.read('who'));
    let adjacent:number[]|undefined;
    for(let b=1;b<=K.KNBASE&&!adjacent;b++){
      const v=Number(f.high.read('base',b,K.KVPOS,1)),h=Number(f.high.read('base',b,K.KHPOS,1));
      adjacent=[[v,h+1],[v,h-1],[v+1,h],[v-1,h]].find(([sv,sh])=>sv>=1&&sv<=K.KGALV&&sh>=1&&sh<=K.KGALH&&f.views.high.board.disp(sv,sh)===0);
    }
    assert.ok(adjacent);
    f.views.high.board.setdsp(Number(f.high.read('shpcon',who,K.KVPOS)),Number(f.high.read('shpcon',who,K.KHPOS)),0);
    f.high.write('shpcon',BigInt(adjacent[0]),who,K.KVPOS);f.high.write('shpcon',BigInt(adjacent[1]),who,K.KHPOS);f.views.high.board.setdsp(adjacent[0],adjacent[1],100+who);
    let wall=86399950,reads=0;const clock=f.wait.io.mstime,now=t.mock.method(Date,'now',()=>wall);
    f.wait.io.mstime=function*(reg){yield*clock(reg);reads++;if(reg==='t3')wall=50;};
    try{
      await c.request('DOCK','DOCKED.');
      if(disconnect){const gone=once(events,'end:'+id);c.socket.end();await gone;assert.deepEqual(ends.get(id),{reason:'completed'});assert.equal(f.low.read('who'),0n);}
      else{await c.request('STATUS','Radio  On');assert.equal(f.high.read('docked',who),-1n);}
      assert.ok(reads>=2,'DOCK crosses the real PAUSE clock boundary');
      assert.equal(f.wait.operands.length,0);
    }finally{f.wait.io.mstime=clock;now.mock.restore();}
  }
  await midnightDock(first,1);

  assert.equal(runtimes.get(1)!.f.low.read('who'),9n);assert.equal(runtimes.get(2)!.f.low.read('who'),8n);
  // WARMAC INLI.: a first ESC repeats the retained line immediately, without LF.
  for(let repeat=0;repeat<2;repeat++){
    const before=first.text().length;first.socket.write(Buffer.from([27]));
    await first.until('Radio  On',before);
    assert.equal(runtimes.get(1)!.f.input.rawLine,'STATUS');
    assert.equal(runtimes.get(1)!.f.editor.state.rptflg,-1n);
  }
  const editing=first.text().length;
  await first.request('STATUX\bS','Radio  On');
  assert.ok(first.text().slice(editing).includes('STATUX\b \bS\r\n'));
  await first.request('WRONG\x15STATUS','Radio  On');
  assert.equal(runtimes.get(1)!.f.input.rawLine,'STATUS');
  await first.request('STA\x12TUS','Radio  On');
  assert.equal(runtimes.get(1)!.f.input.rawLine,'STATUS');
  // Austin ECHOFF (e.g. killed-player reentry) suppresses negotiated echo.
  const quiet=first.text().length;runtimes.get(1)!.f.editor.state.echflg=-1n;
  await first.request('STATUS','Radio  On');
  assert.equal(first.text().slice(quiet).includes('STATUS'),false);
  assert.equal(runtimes.get(1)!.f.editor.state.echflg,0n);
  for(const control of [Buffer.from([3]),Buffer.from([255,244,255,253,6])]){
    await first.request('BUILD','Coordinates: ');const before=first.text().length;first.socket.write(control);await first.until('> ',before);await first.request('STATUS','Radio  On');
  }
  await first.request('TELL VULCAN; Across Telnet','> ');await second.request('STATUS','Radio  On');await second.request('STATUS','Radio  On');assert.match(second.text(),/Across Telnet/);
  await first.quit();assert.deepEqual(ends.get(1),{reason:'completed'});
  const third=await client('Gamma','YORKTOWN');await third.quit();
  await midnightDock(second,2,true);
  assert.equal(runtimes.get(1)!.f.high.read('numply'),0n);assert.equal(worlds.monitor.files.read('DECWAR.STA'),undefined);
  // Unlike the original zero-action fixture, docking advances the galaxy;
  // after the last captain leaves, the next login selects a fresh game.
  const fleet:Awaited<ReturnType<typeof client>>[]=[];
  for(let i=0;i<9;i++)for(const slot of [i,i+9])fleet.push(await client('Captain'+slot,variantDefinitions.austin.ships[slot].name,slot===0,slot<9?'FEDERATION':'EMPIRE'));
  assert.equal(runtimes.get(4)!.f.high.read('numply'),18n);
  for(let round=0;round<3;round++)await Promise.all(fleet.map(c=>c.request('STATUS','Radio  On')));
  await Promise.all(fleet.map(c=>c.quit()));assert.equal(runtimes.get(4)!.f.high.read('numply'),0n);
  assert.equal(worlds.monitor.locks.owner(1n),undefined);assert.equal(worlds.monitor.locks.owner(2n),undefined);
  assert.ok([...ends.values()].every(result=>result.reason==='completed'));
});
