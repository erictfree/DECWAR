import test from 'node:test';
import assert from 'node:assert/strict';
import { ObservationReader } from '../player.ts';

const status = 'Stardate\t1\nCondition\tGreen\nLocation\t10-10\nTorpedoes\t10\nEnergy left\t5000.0\nDamage\t0.0\nShields\t+100.0% 2500.0 units\n';
const scan = '\n    9  11\n11  . . . 11\n10  . Y . 10\n 9  . . .  9\n    9  11\n';

test('quiet observations halve report count while retaining fresh sensors and expiring caches', async t => {
  let now=1000, hostile=false, damage=false;
  t.mock.method(Date,'now',()=>now);
  const calls:string[]=[];
  const reader=new ObservationReader();
  const client={async command(line:string){
    calls.push(line);
    if(line==='BASES')return ' Fed Base\t@10-11 100.0%\n';
    if(line==='DAMAGES')return 'All devices functional.\n';
    if(line==='LIST')return ' Yorktown\t@10-10 +100.0%\n';
    if(line==='SCAN 10 WARNING')return hostile?scan.replace(' Y',' W'):scan;
    if(line==='TARGETS')return ' Wolf\t@10-10 +100.0%\n';
    if(line==='STATUS')return damage?status.replace('Damage\t0.0','Damage\t10.0'):status;
    throw new Error(line);
  }};
  await reader.observe(client,'FEDERATION');
  assert.deepEqual(calls,['BASES','LIST','SCAN 10 WARNING','STATUS','DAMAGES']);
  calls.length=0;now+=2000;
  const fresh=await reader.observe(client,'FEDERATION');
  assert.deepEqual(calls,['LIST','SCAN 10 WARNING','STATUS']);
  assert.equal(fresh.scan.observedAt,now);assert.equal(fresh.objects![0].observedAt,now);
  calls.length=0;hostile=true;
  assert.equal((await reader.observe(client,'FEDERATION')).targets!.length,1);
  assert.ok(calls.includes('TARGETS'));
  calls.length=0;hostile=false;
  assert.deepEqual((await reader.observe(client,'FEDERATION')).targets,[]);
  assert.ok(!calls.includes('TARGETS'),'never reuse old firing targets');
  calls.length=0;damage=true;
  await reader.observe(client,'FEDERATION');assert.ok(calls.includes('DAMAGES'));
  calls.length=0;reader.afterAction('DOCK');
  await reader.observe(client,'FEDERATION');assert.ok(calls.includes('BASES'));assert.ok(calls.includes('DAMAGES'));
  calls.length=0;now+=15000;
  await reader.observe(client,'FEDERATION');assert.ok(calls.includes('BASES'));assert.ok(calls.includes('DAMAGES'));
});
