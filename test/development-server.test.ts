import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp,readFile,rm,access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect } from 'node:net';
import { TelnetCodec } from '../src/transport/telnet.ts';

test('Explicit CompuServe development entry serves source STATUS and logs forced shutdown',{timeout:15000},async t=>{
  const directory=await mkdtemp(join(tmpdir(),'decwar-host-')),log=join(directory,'host.log');
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const data=join(directory,'data');
  const child=spawn(process.execPath,['tools/run-telnet.ts','--variant','compuserve','--port','0','--data',data,'--log',log],{stdio:['ignore','pipe','pipe']});
  const exit=once(child,'exit');let stdout='',stderr='';
  t.after(async()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');await exit;});
  child.stderr.on('data',bytes=>{stderr+=bytes.toString();});
  let listen:(port:number)=>void=()=>{};const listening=new Promise<number>(resolve=>{listen=resolve;});
  child.stdout.on('data',bytes=>{stdout+=bytes.toString();const match=/telnet 127\.0\.0\.1 (\d+)/.exec(stdout);if(match)listen(Number(match[1]));});
  const port=await Promise.race([listening,exit.then(()=>{throw new Error('Host exited before listen: '+stderr);})]);
  const socket=connect(port,'127.0.0.1'),decoder=new TelnetCodec();let output='';
  t.after(()=>socket.destroy());let ready:()=>void=()=>{};const status=new Promise<void>(resolve=>{ready=resolve;});
  socket.on('data',bytes=>{output+=decoder.feed(Buffer.from(bytes)).data.toString('latin1');if(output.includes('T10 E5000'))ready();});
  await once(socket,'connect');socket.write('EXPERT\r\nCaptain\r\n\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nLEXINGTON\r\nSTATUS\r\n');
  await Promise.race([status,once(socket,'end').then(()=>{throw new Error('Connection ended before STATUS: '+stderr);})]);
  assert.ok(output.startsWith('[DECWAR Version 2.3, 20-Nov-81]\r\n'));assert.equal(output.includes('development runtime'),false);
  assert.equal(output.split('Your name please: ').length-1,1);
  child.kill('SIGTERM');assert.deepEqual(await exit,[0,null]);assert.equal(stderr,'');
  const records=(await readFile(log,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  assert.deepEqual(records.map(record=>record.event),['listening','session-start','shutdown','session-end','stopped']);
  assert.equal(records[3].reason,'cancelled');assert.equal(records[0].profile,'playable');
  assert.equal(records[0].variant,'compuserve');
  assert.equal(records[0].data,data);await access(join(data,'DECWAR.STA.words'));
  await assert.rejects(access(join(data,'.host.lock')),error=>error instanceof Error&&'code'in error&&error.code==='ENOENT');
});

test('Omitted variant starts Austin, executes its INI and quits without CompuServe statistics',{timeout:15000},async t=>{
  const directory=await mkdtemp(join(tmpdir(),'decwar-austin-host-')),log=join(directory,'host.log'),data=join(directory,'data');
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const child=spawn(process.execPath,['tools/run-telnet.ts','--port','0','--data',data,'--log',log],{stdio:['ignore','pipe','pipe']});
  const exit=once(child,'exit');let stdout='',stderr='';
  t.after(async()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');await exit;});
  child.stderr.on('data',bytes=>{stderr+=bytes.toString();});
  let listen:(port:number)=>void=()=>{};const listening=new Promise<number>(resolve=>{listen=resolve;});
  child.stdout.on('data',bytes=>{stdout+=bytes.toString();const match=/telnet 127\.0\.0\.1 (\d+)/.exec(stdout);if(match)listen(Number(match[1]));});
  const port=await Promise.race([listening,exit.then(()=>{throw new Error('Host exited: '+stderr);})]);
  const socket=connect(port,'127.0.0.1'),decoder=new TelnetCodec();let output='',ended=false;const waiting:{pattern:string;start:number;resolve:()=>void;reject:(error:Error)=>void}[]=[];
  t.after(()=>socket.destroy());
  function changed(){for(const item of [...waiting])if(output.slice(item.start).includes(item.pattern)){waiting.splice(waiting.indexOf(item),1);item.resolve();}else if(ended){waiting.splice(waiting.indexOf(item),1);item.reject(new Error('EOF before '+item.pattern+': '+output));}}
  socket.on('data',bytes=>{output+=decoder.feed(Buffer.from(bytes)).data.toString('latin1');changed();});socket.on('end',()=>{ended=true;changed();});
  function until(pattern:string,start=0){return new Promise<void>((resolve,reject)=>{waiting.push({pattern,start,resolve,reject});changed();});}
  async function request(input:string,pattern:string){const start=output.length;socket.write(input+'\r\n');await until(pattern,start);}
  await once(socket,'connect');await until('Your name please: ');assert.ok(output.startsWith('DECWAR, Edit     0\r\n'));
  await request('Captain','line: ');await request('\r\n\r\nNO\r\nNO\r\nFEDERATION\r\nYORKTOWN','> srscan 2 w');
  await until('\r\n> ',output.indexOf('> srscan 2 w')+1);await request('STATUS','Radio  On');await request('QUIT','Do you really want to quit? ');
  const end=once(socket,'end');socket.write('YES\r\n');await end;
  child.kill('SIGTERM');assert.deepEqual(await exit,[0,null]);assert.equal(stderr,'');
  const records=(await readFile(log,'utf8')).trim().split('\n').map(line=>JSON.parse(line));assert.equal(records[0].variant,'austin');
  assert.equal(records.find(record=>record.event==='session-end').reason,'completed');assert.equal(JSON.parse(await readFile(join(data,'variant.json'),'utf8')).variant,'austin');
  await assert.rejects(access(join(data,'DECWAR.STA.words')),error=>error instanceof Error&&'code'in error&&error.code==='ENOENT');
  await assert.rejects(access(join(data,'.host.lock')),error=>error instanceof Error&&'code'in error&&error.code==='ENOENT');
});
