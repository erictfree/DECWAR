import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldDirectory } from '../src/runtime/world-directory.ts';
import { GameSession } from '../src/runtime/session.ts';
import { reloadableSession,SessionReload } from '../src/runtime/reloadable-session.ts';

test('Retired worlds retain references and share monitor locks/files with their replacement',()=>{
  const directory=new WorldDirectory(),old=directory.load();assert.equal(directory.load(),old);
  old.files.write('DECWAR.STA',[7n]);assert.ok(old.openExclusiveFile('DECWAR.GRP',1));
  assert.equal(old.locks.request(99n,1,()=>assert.fail()),'granted');
  directory.remove(old);const next=directory.load();assert.notEqual(next,old);assert.equal(next.locks,old.locks);
  assert.deepEqual(next.files.read('DECWAR.STA'),[7n]);assert.equal(next.openExclusiveFile('DECWAR.GRP',2),false);
  let granted=false;assert.equal(next.locks.request(99n,2,()=>{granted=true;}),'queued');
  old.releaseJob(1);assert.equal(granted,true);assert.equal(next.locks.owner(99n),2);assert.ok(next.openExclusiveFile('DECWAR.GRP',2));
  directory.remove(old);assert.equal(directory.load(),next);
});
test('Monitor RUN replaces the program in the same terminal and redirects subsequent controls',async()=>{
  const events:string[]=[],bytes:number[]=[];let generation=0,ready:()=>void=()=>{};
  const loaded=new Promise<void>(resolve=>{ready=resolve;});
  const session=new GameSession(terminal=>reloadableSession(()=>{
    const id=++generation;events.push('load:'+id);
    return {hangup(){events.push('hangup:'+id);},interrupt(){events.push('interrupt:'+id);},run:(function*(){
      if(id===1){assert.equal(yield*terminal.read(),65);throw new SessionReload();}
      assert.equal(yield*terminal.read(),66);terminal.write(Uint8Array.of(67));ready();assert.equal(yield*terminal.read(),null);
    })()};
  },()=>events.push('release')),data=>bytes.push(...data));
  session.start();session.receive(Uint8Array.of(65,66));await loaded;session.interrupt();
  assert.deepEqual(await session.done,{reason:'completed'});assert.deepEqual(events,['load:1','release','load:2','interrupt:2']);assert.deepEqual(bytes,[67]);
});
test('An ordinary source error does not trigger monitor RUN or discard its failure',async()=>{
  const error=new Error('unresolved source behavior');let loads=0;
  const session=new GameSession(()=>reloadableSession(()=>{loads++;return {hangup(){},interrupt(){},run:(function*(){throw error;})()};},()=>assert.fail()),()=>{});
  assert.deepEqual(await session.start(),{reason:'failed',error});assert.equal(loads,1);
});
