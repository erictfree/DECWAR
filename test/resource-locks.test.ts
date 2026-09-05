import test from 'node:test';
import assert from 'node:assert/strict';
import { ResourceLocks } from '../src/runtime/resource-locks.ts';
import { SharedGameWorld } from '../src/runtime/shared-world.ts';
import { liveSessionRuntime } from './fixtures/live-session-runtime.ts';
import { acquireLock } from '../src/compat/lock.ts';
import { releaseLock } from '../src/compat/unlock.ts';
import type { SessionTerminal } from '../src/runtime/session.ts';

test('Resource ownership passes once to each pending job in the selected FIFO order',()=>{
  const locks=new ResourceLocks(),grants:number[]=[];
  assert.equal(locks.request(12n,1,()=>assert.fail()),'granted');
  assert.equal(locks.request(12n,1,()=>assert.fail()),'granted');
  assert.equal(locks.request(12n,2,()=>{assert.equal(locks.owner(12n),2);grants.push(2);}), 'queued');
  locks.request(12n,2,()=>assert.fail('duplicate request must not add a second grant'));
  locks.request(12n,3,()=>grants.push(3));
  assert.equal(locks.release(12n,9),false);assert.deepEqual(grants,[]);
  assert.equal(locks.release(12n,1),true);assert.deepEqual(grants,[2]);
  assert.equal(locks.release(12n,2),true);assert.deepEqual(grants,[2,3]);
  assert.equal(locks.release(12n,3),true);assert.equal(locks.owner(12n),undefined);
});
test('DEQ cancels a waiting claim without releasing the current owner',()=>{
  const locks=new ResourceLocks();locks.request(12n,1,()=>assert.fail());
  locks.request(12n,2,()=>assert.fail('cancelled waiter granted'));
  assert.equal(locks.dequeue(12n,2),true);assert.equal(locks.owner(12n),1);
  assert.equal(locks.dequeue(12n,2),false);assert.equal(locks.dequeue(99n,1),false);
  assert.equal(locks.dequeue(12n,1),true);assert.equal(locks.owner(12n),undefined);
});
test('Job teardown withdraws all pending claims and releases its owned resources',()=>{
  const locks=new ResourceLocks(),grants:number[]=[];
  locks.request(1n,1,()=>assert.fail());locks.request(2n,1,()=>assert.fail());locks.request(3n,3,()=>assert.fail());
  locks.request(1n,2,()=>grants.push(2));locks.request(2n,3,()=>grants.push(3));
  locks.request(3n,1,()=>assert.fail('dead job granted'));
  locks.releaseJob(1);assert.deepEqual(grants,[2,3]);assert.equal(locks.owner(1n),2);assert.equal(locks.owner(2n),3);
  locks.releaseJob(3);assert.equal(locks.owner(2n),undefined);assert.equal(locks.owner(3n),undefined);
});

function jobs(){
  const world=new SharedGameWorld(),wakes=[0,0];
  const jobs=[1,2].map(job=>{
    const terminal:SessionTerminal={*read(){return null;},available:()=>false,clearInput(){},wake(){wakes[job-1]++;},runtimeMilliseconds:()=>0n,write(){},disconnected:false};
    return liveSessionRuntime(terminal,'initialize',world,job).f;
  });
  return {world,wakes,first:jobs[0],second:jobs[1]};
}
type Job=ReturnType<typeof jobs>['first'];
function lock(job:Job,key:bigint){job.r.t1=key;return acquireLock(job.locks,job.lockState,job.r,job.symbols,job.lockIO);}
function unlock(job:Job,key:bigint){job.r.t1=key;return releaseLock(job.locks,job.lockState,job.r,job.symbols,job.unlockIO);}
function done(g:Generator<string,void,void>){for(;;){const step=g.next();if(step.done)return;assert.fail('Unexpected wait: '+step.value);}}

test('Actual LOCK busy path resumes on actual UNLO grant with private tables and HVLOK',()=>{
  const {world,wakes,first,second}=jobs(),key=first.high.address('alive',1);
  done(lock(first,key));const queueKey=first.m.read(first.symbols.queuen);
  assert.equal(world.locks.owner(queueKey),1);
  const waiting=lock(second,key);assert.equal(waiting.next().value,'hibernate:100');
  assert.equal(waiting.next().value,'hibernate:5000');assert.equal(second.lockState.hvLok,0n);
  done(unlock(first,key));assert.equal(world.locks.owner(queueKey),2);
  assert.equal(first.locks.read('loktab',19),0n);assert.equal(second.locks.read('loktab',19),key);
  assert.equal(second.lockState.hvLok,-1n);assert.deepEqual(wakes,[0,1]);done(waiting);
  assert.equal(second.lockState.lkfail,0n);done(unlock(second,key));assert.equal(world.locks.owner(queueKey),undefined);
});
test('Source UNLO withdraws a pending claim so a later release cannot wake that job',()=>{
  const {world,wakes,first,second}=jobs(),key=first.high.address('alive',1);done(lock(first,key));
  const waiting=lock(second,key);assert.equal(waiting.next().value,'hibernate:100');
  done(unlock(second,key));done(unlock(first,key));assert.deepEqual(wakes,[0,0]);
  assert.equal(world.locks.owner(first.m.read(first.symbols.queuen)),undefined);waiting.return();
});
test('Grant during initial 100 ms wait preserves the source subsequent 5000 ms wait',()=>{
  const {wakes,first,second}=jobs(),key=first.high.address('alive',1);done(lock(first,key));
  const waiting=lock(second,key);assert.equal(waiting.next().value,'hibernate:100');
  done(unlock(first,key));assert.equal(second.lockState.hvLok,-1n);assert.deepEqual(wakes,[0,1]);
  assert.equal(waiting.next().value,'hibernate:5000');done(waiting);done(unlock(second,key));
});
