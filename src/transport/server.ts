import { createServer } from 'node:net';
import type { Server,Socket } from 'node:net';
import { GameSession } from '../runtime/session.ts';
import type { SessionTerminal,SessionProgram,SessionResult } from '../runtime/session.ts';
import { TelnetCodec,TelnetEncoder } from './telnet.ts';

export type TelnetSessionFactory=(terminal:SessionTerminal,connection:{id:number;remoteAddress:string|undefined})=>SessionProgram;
export type TelnetServerOptions={
  createSession:TelnetSessionFactory;
  onSessionEnd?:(id:number,result:SessionResult)=>void;
};
// Wire negotiation uses the project's documented D-003 boundary policy.
// No banners, prompts or exception messages are injected into game output.
export function createTelnetServer(options:TelnetServerOptions):{server:Server;close:()=>Promise<void>;sessions:ReadonlyMap<number,GameSession>}{
  let nextId=1;
  const sessions=new Map<number,GameSession>(),sockets=new Set<Socket>();
  const server=createServer({allowHalfOpen:true},socket=>{
    const id=nextId++,decoder=new TelnetCodec(),encoder=new TelnetEncoder();
    sockets.add(socket);socket.setNoDelay(true);
    let session:GameSession;
    try{
      session=new GameSession(terminal=>options.createSession(terminal,{id,remoteAddress:socket.remoteAddress}),bytes=>{
        const data=encoder.encode(bytes);if(data.length&&!socket.destroyed)socket.write(data);
      });
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
