import { createServer } from 'node:net';
import type { Server,Socket } from 'node:net';
import { GameSession } from '../runtime/session.ts';
import type { SessionTerminal,SessionProgram,SessionResult,SessionTelemetry } from '../runtime/session.ts';
import { TelnetCodec,TelnetEncoder } from './telnet.ts';

export type TelnetSessionFactory=(terminal:SessionTerminal,connection:{id:number;remoteAddress:string|undefined})=>SessionProgram;
export type TelnetServerOptions={
  createSession:TelnetSessionFactory;
  onSessionEnd?:(id:number,result:SessionResult)=>void;
  onTelemetry?:(event:{id:number;steps:number;stepWallMs:number;stepCpuMs:number;maxStepWallMs:number;outputBytes:number;outputBackpressure:number})=>void;
};
// Wire negotiation uses the project's documented D-003 boundary policy.
// No banners, prompts or exception messages are injected into game output.
export function createTelnetServer(options:TelnetServerOptions):{server:Server;close:()=>Promise<void>;sessions:ReadonlyMap<number,GameSession>}{
  let nextId=1;
  const sessions=new Map<number,GameSession>(),sockets=new Set<Socket>();
  const server=createServer({allowHalfOpen:true},socket=>{
    const id=nextId++,decoder=new TelnetCodec(true),encoder=new TelnetEncoder();
    const metrics={steps:0,stepWallMs:0,stepCpuMs:0,maxStepWallMs:0,outputBytes:0,outputBackpressure:0};
    sockets.add(socket);socket.setNoDelay(true);
    socket.write(decoder.begin());
    const write=(bytes:Uint8Array)=>{
      const data=encoder.encode(bytes);if(data.length&&!socket.destroyed){metrics.outputBytes+=data.length;if(!socket.write(data))metrics.outputBackpressure++;}
    };
    const telemetry:SessionTelemetry={step(event){metrics.steps++;metrics.stepWallMs+=event.wallMs;metrics.stepCpuMs+=event.cpuMs;metrics.maxStepWallMs=Math.max(metrics.maxStepWallMs,event.wallMs);}};
    let session:GameSession;
    try{
      session=new GameSession(terminal=>{
        // Echo consumed keyboard input, not queued typeahead. Source INLI still
        // owns line editing, ESC repeat, redisplay and all command semantics.
        const read=terminal.read;let characters=0;
        terminal.read=function*(){
          const byte=yield*read();
          if(byte!==null&&decoder.echoEnabled&&(terminal.echoAllowed?.()??true)){
            if(byte>=32&&byte<127){write(Uint8Array.of(byte));characters++;}
            else if(byte===9){write(Uint8Array.of(byte));characters++;}
            else if(byte===8||byte===127){if(characters>0){write(Buffer.from('\b \b'));characters--;}}
            else if(byte===10){write(Buffer.from('\r\n'));characters=0;}
            else if(byte===11||byte===12){write(Uint8Array.of(byte));characters=0;}
            else if(byte===0||byte===21||byte===26||byte===27)characters=0;
          }
          return byte;
        };
        const clear=terminal.clearInput;
        terminal.clearInput=()=>{characters=0;clear();};
        return options.createSession(terminal,{id,remoteAddress:socket.remoteAddress});
      },write,undefined,telemetry);
    }catch(error){options.onSessionEnd?.(id,{reason:'failed',error});socket.destroy();sockets.delete(socket);return;}
    sessions.set(id,session);
    socket.on('data',bytes=>{
      if(typeof bytes==='string'){socket.destroy(new Error('Telnet socket requires byte input'));return;}
      const parsed=decoder.feed(bytes);if(parsed.reply.length)socket.write(parsed.reply);
      // Deliver controls before waking a suspended monitor read with data.
      // Clients may send Ctrl-C as ETX instead of Telnet IP (D-171).
      let interrupts=parsed.interrupts;
      const input=parsed.data.filter(byte=>{if(byte===3){interrupts++;return false;}return true;});
      for(let i=0;i<interrupts;i++)session.interrupt();
      session.receive(input);
    });
    socket.on('end',()=>session.disconnect());
    socket.on('error',()=>session.disconnect());
    socket.on('close',()=>{sockets.delete(socket);session.disconnect();});
    void session.start().then(result=>{
      sessions.delete(id);
      if(!socket.destroyed){const tail=encoder.flush();if(tail.length)socket.write(tail);socket.end();}
      options.onSessionEnd?.(id,result);
      options.onTelemetry?.({id,...metrics});
    });
  });
  return {server,sessions,async close(){
    for(const session of sessions.values()){session.disconnect();session.cancel();}
    for(const socket of sockets)socket.destroy();
    const pending=[...sessions.values()].map(session=>session.done);
    await new Promise<void>((resolve,reject)=>server.close(error=>error&&(!('code'in error)||error.code!=='ERR_SERVER_NOT_RUNNING')?reject(error):resolve()));
    await Promise.all(pending);
  }};
}
