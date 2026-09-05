import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import { GameSession,SessionExit } from '../src/runtime/session.ts';
import type { SessionWait } from '../src/runtime/session.ts';

test('Session resumes fragmented byte input without line buffering or injected output',async()=>{
  const bytes:number[]=[],seen:(number|null)[]=[];
  const session=new GameSession(t=>({hangup(){},interrupt(){},run:(function*(){for(let i=0;i<3;i++){const byte=yield*t.read();seen.push(byte);t.write(Uint8Array.of(byte!));}})()}),data=>bytes.push(...data));
  session.start();session.receive(Uint8Array.of(65));await turn();assert.deepEqual(seen,[65]);
  session.receive(Uint8Array.of(13,10));assert.deepEqual(await session.done,{reason:'completed'});assert.deepEqual(bytes,[65,13,10]);
});
test('Session interrupt wakes input with source callback before continuation',async()=>{
  const events:string[]=[];const session=new GameSession(t=>({hangup(){},interrupt(){events.push('interrupt');},run:(function*(){assert.equal(yield*t.read(),null);events.push('resumed');})()}),()=>{});
  session.start();session.interrupt();await session.done;assert.deepEqual(events,['interrupt','resumed']);
});
test('An empty transport payload does not hide a suspended read from its interrupt',{timeout:1000},async t=>{
  const session=new GameSession(terminal=>({hangup(){},interrupt(){},run:(function*(){assert.equal(yield*terminal.read(),null);})()}),()=>{});
  t.after(()=>session.cancel());session.start();session.receive(new Uint8Array());session.interrupt();
  assert.deepEqual(await session.done,{reason:'completed'});
});
test('Disconnect resumes waiting source cleanup and suppresses writes to a lost terminal',async()=>{
  const events:string[]=[],bytes:number[]=[];const session=new GameSession(t=>({hangup(){events.push('hangup');},interrupt(){},run:(function*(){assert.equal(yield*t.read(),null);assert.equal(t.disconnected,true);events.push('cleanup');t.write(Uint8Array.of(65));})()}),data=>bytes.push(...data));
  session.start();session.disconnect();assert.deepEqual(await session.done,{reason:'completed'});assert.deepEqual(events,['hangup','cleanup']);assert.deepEqual(bytes,[]);
});
test('A disconnected source loop still cooperates with the host and can be cancelled',async()=>{
  let loops=0;
  const session=new GameSession(()=>({hangup(){},interrupt(){},run:(function*():Generator<SessionWait,void,void>{for(;;){loops++;yield {type:'cooperate'};}})()}),()=>{});
  session.start();session.disconnect();await turn();assert.ok(loops>1);
  session.cancel();assert.deepEqual(await session.done,{reason:'cancelled'});
});
test('Input wakes an input-enabled delay but does not consume its bytes',async()=>{
  const session=new GameSession(t=>({hangup(){},interrupt(){},run:(function*():Generator<SessionWait,void,void>{yield {type:'delay',milliseconds:60000,wakeOnInput:true};assert.equal(yield*t.read(),65);})()}),()=>{});
  session.start();session.receive(Uint8Array.of(65));assert.deepEqual(await session.done,{reason:'completed'});
});
test('Queued input cannot bypass a source delay that does not allow input wakeup',async()=>{
  let advanced=false;const session=new GameSession(t=>({hangup(){},interrupt(){},run:(function*():Generator<SessionWait,void,void>{yield {type:'delay',milliseconds:25,wakeOnInput:false};advanced=true;assert.equal(yield*t.read(),65);})()}),()=>{});
  session.start();session.receive(Uint8Array.of(65));await turn();assert.equal(advanced,false);await session.done;assert.equal(advanced,true);
});
test('Session failures remain host results and are not terminal messages',async()=>{
  const fault=new Error('unresolved compiler policy'),bytes:number[]=[];
  const session=new GameSession(()=>({hangup(){},interrupt(){},run:(function*(){throw fault;})()}),data=>bytes.push(...data));
  assert.deepEqual(await session.start(),{reason:'failed',error:fault});assert.deepEqual(bytes,[]);
});
test('Forced shutdown cancels a long wait and executes generator finally',async()=>{
  let cleaned=false;const session=new GameSession(()=>({hangup(){},interrupt(){},run:(function*():Generator<SessionWait,void,void>{try{yield {type:'delay',milliseconds:3_000_000_000,wakeOnInput:false};}finally{cleaned=true;}})()}),()=>{});
  session.start();session.cancel();assert.deepEqual(await session.done,{reason:'cancelled'});assert.equal(cleaned,true);
});
test('A source interrupt hook failure is reported without escaping the socket event handler',async()=>{
  const error=new Error('interrupt policy unavailable');
  const session=new GameSession(t=>({hangup(){},interrupt(){throw error;},run:(function*(){yield*t.read();})()}),()=>{});
  session.start();assert.doesNotThrow(()=>session.interrupt());assert.deepEqual(await session.done,{reason:'failed',error});
});
test('A monitor wake resumes a non-input delay without manufacturing input or Ctrl-C',async()=>{
  let resumed=false;
  const session=new GameSession(t=>({hangup(){assert.fail();},interrupt(){assert.fail();},run:(function*():Generator<SessionWait,void,void>{yield {type:'delay',milliseconds:60000,wakeOnInput:false};resumed=true;assert.equal(t.available(),false);})()}),()=>{});
  session.start();session.terminal.wake();assert.deepEqual(await session.done,{reason:'completed'});assert.equal(resumed,true);
});
test('Session CPU accounting includes current work and excludes waits and other jobs',async()=>{
  let cpu=0n;const readings:bigint[]=[];
  const first=new GameSession(t=>{cpu+=1500n;return {hangup(){},interrupt(){},run:(function*(){cpu+=1250n;readings.push(t.runtimeMilliseconds());yield*t.read();cpu+=750n;readings.push(t.runtimeMilliseconds());})()};},()=>{},()=>cpu);
  first.start();assert.equal(first.terminal.runtimeMilliseconds(),2n);
  const second=new GameSession(()=>({hangup(){},interrupt(){},run:(function*(){cpu+=9000n;})()}),()=>{},()=>cpu);
  await second.start();cpu+=100000n;assert.equal(first.terminal.runtimeMilliseconds(),2n);
  first.receive(Uint8Array.of(65));await first.done;
  assert.deepEqual(readings,[2n,3n]);assert.equal(first.terminal.runtimeMilliseconds(),3n);assert.equal(second.terminal.runtimeMilliseconds(),9n);
});
test('Deliberate source monitor exit completes a job without writing an error',async()=>{
  const bytes:number[]=[];
  const session=new GameSession(()=>({hangup(){},interrupt(){},run:(function*(){throw new SessionExit();})()}),data=>bytes.push(...data));
  assert.deepEqual(await session.start(),{reason:'completed'});assert.deepEqual(bytes,[]);
});
test('Yielding interrupt routine finishes before the suspended game continuation resumes',async()=>{
  const events:string[]=[];
  const session=new GameSession(t=>({hangup(){},interrupt:function*(){events.push('interrupt-save');yield {type:'cooperate'};events.push('interrupt-restore');},run:(function*(){assert.equal(yield*t.read(),null);events.push('game-resume');})()}),()=>{});
  session.start();session.interrupt();assert.deepEqual(await session.done,{reason:'completed'});
  assert.deepEqual(events,['interrupt-save','interrupt-restore','game-resume']);
});
test('Interrupt during a delay does not manufacture empty input for the next prompt',async()=>{
  let entered:()=>void=()=>{};const prompt=new Promise<void>(resolve=>{entered=resolve;});
  const session=new GameSession(t=>({hangup(){},interrupt(){},run:(function*():Generator<SessionWait,void,void>{yield {type:'delay',milliseconds:60000,wakeOnInput:false};entered();assert.equal(yield*t.read(),65);})()}),()=>{});
  session.start();session.interrupt();await prompt;session.receive(Uint8Array.of(65));assert.deepEqual(await session.done,{reason:'completed'});
});
