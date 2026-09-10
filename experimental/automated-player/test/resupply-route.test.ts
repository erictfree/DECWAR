import test from 'node:test';
import assert from 'node:assert/strict';
import { ResupplyRoute } from '../resupply-route.ts';
import { ObservedMap, neighbors } from '../navigation.ts';
import { distance, parseDevices } from '../observations.ts';
import { Captain, type Observation } from '../captain.ts';

function fixture(): Observation {
 const cells=[];
 for(let v=1;v<=30;v++)for(let h=1;h<=30;h++)cells.push({v,h,symbol:' .',observedAt:1000});
 return {scan:{cells,observedAt:1000},bases:[{v:10,h:16},{v:10,h:2}],devices:parseDevices('All devices functional.'),status:{position:{v:10,h:10},observedAt:1000,stardate:1,energy:2000,shieldPercent:100,shieldsUp:true,torpedoes:10,hullDamage:0,condition:'Green',docked:false}};
}
test('Retain a reachable refuge even when another becomes nearer; release on completion',()=>{
 const o=fixture(),map=new ObservedMap(),planner=new ResupplyRoute();map.ingest(o.scan,o.status.position);
 const first=planner.choose(map,o.status.position,o.bases,'FEDERATION',1000)!;assert.deepEqual(first.destination,{v:10,h:16});
 const displaced={v:10,h:6};map.ingest(o.scan,displaced);
 assert.deepEqual(planner.choose(map,displaced,o.bases,'FEDERATION',1000)!.destination,first.destination);
 planner.clear();assert.deepEqual(planner.choose(map,displaced,o.bases,'FEDERATION',1000)!.destination,{v:10,h:2});
});
test('Select a shorter safe route instead of the geometrically nearest blocked refuge',()=>{
 const o=fixture(),map=new ObservedMap();
 for(const c of o.scan.cells)if(c.h===12&&c.v<=20)c.symbol=' *';
 map.ingest(o.scan,o.status.position);
 const plan=new ResupplyRoute().choose(map,o.status.position,o.bases,'FEDERATION',1000)!;
 assert.deepEqual(plan.destination,{v:10,h:2});assert.ok(plan.next.h<10);
});
test('Reassess a refuge when a fresh enemy threatens it, or when it disappears from BASES',()=>{
 const o=fixture(),map=new ObservedMap(),planner=new ResupplyRoute();map.ingest(o.scan,o.status.position);
 assert.equal(planner.choose(map,o.status.position,o.bases,'FEDERATION',1000)!.destination.h,16);
 o.scan.cells.find(c=>c.v===10&&c.h===17)!.symbol=' W';map.ingest(o.scan,o.status.position);
 assert.equal(planner.choose(map,o.status.position,o.bases,'FEDERATION',1000)!.destination.h,2);
 assert.equal(planner.choose(map,o.status.position,[o.bases[0]],'FEDERATION',1000)!.destination.h,16);
});
test('Replan when a retained refuge becomes unreachable and refuse stale first steps',()=>{
 const o=fixture(),map=new ObservedMap(),planner=new ResupplyRoute();map.ingest(o.scan,o.status.position);
 planner.choose(map,o.status.position,o.bases,'FEDERATION',1000);
 for(const n of neighbors(o.bases[0]))map.block(n,1000);
 assert.equal(planner.choose(map,o.status.position,o.bases,'FEDERATION',1000)!.destination.h,2);
 assert.equal(planner.choose(map,o.status.position,o.bases,'FEDERATION',7000),undefined);
});
test('Captain opt-in reports the retained destination; baseline decisions remain unannotated',()=>{
 const o=fixture(),captain=new Captain('FEDERATION','siege',false,true,false,true);
 const a=captain.choose(o,1000);assert.equal(a.kind,'act');if(a.kind!=='act')return;
 assert.deepEqual(a.refuge?.destination,{v:10,h:16});
 const [v,h]=a.command.split(' ').slice(-2).map(Number);o.status.position={v,h};
 const b=captain.choose(o,1100);assert.equal(b.kind,'act');if(b.kind==='act')assert.equal(b.refuge?.reason,'retained');
 const legacy=new Captain('FEDERATION','siege').choose(fixture(),1000);if(legacy.kind==='act')assert.equal(legacy.refuge,undefined);
 o.status.position={v:10,h:15};assert.equal(captain.choose(o,1200).command,'DOCK');
 o.status.energy=5000;o.status.docked=true;assert.notEqual(captain.choose(o,1300).command,'DOCK');
 assert.equal(distance({v,h}, {v:10,h:10}),1);
});
