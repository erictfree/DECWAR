import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanetMissions } from '../planet-missions.ts';
import { planetFiringRoute, planetSurveyRoute } from '../planet-firing-route.ts';
import { ObservedMap } from '../navigation.ts';
import { parseDevices, distance } from '../observations.ts';
import type { Observation } from '../captain.ts';
function observation(): Observation {
  const cells = [];
  for(let v=1;v<=40;v++) for(let h=1;h<=40;h++) cells.push({v,h,symbol:' .',observedAt:1000});
  cells.find(c=>c.v===20&&c.h===20)!.symbol=' @';
  cells.find(c=>c.v===20&&c.h===23)!.symbol=' @';
  return { scan:{cells,observedAt:1000}, status:{position:{v:12,h:20},observedAt:1000,energy:5000,torpedoes:10,shieldPercent:100,shieldsUp:true,hullDamage:0,stardate:0,docked:false,condition:'Green'},devices:parseDevices('All devices functional.'),bases:[],objects:[{name:'Neu planet',kind:'planet',faction:'NEUTRAL',position:{v:20,h:20},observedAt:1000,builds:0},{name:'Neu planet',kind:'planet',faction:'NEUTRAL',position:{v:20,h:23},observedAt:1000,builds:0}] };
}
test('Planet leases split teammates, retain missions through resupply, isolate factions and expire',()=>{
 const m=new PlanetMissions(),o=observation();
 assert.deepEqual(m.assign('EMPIRE','A',o,1000),{v:20,h:20});
 assert.deepEqual(m.assign('EMPIRE','B',o,1000),{v:20,h:23});
 assert.equal(m.assign('EMPIRE','C',o,1000),null);
 assert.deepEqual(m.assign('FEDERATION','D',o,1000),{v:20,h:20});
 o.status.energy=1000;o.objects=[];
 assert.deepEqual(m.assign('EMPIRE','A',o,2000),{v:20,h:20});
 const fresh=observation();fresh.objects!.forEach(x=>x.observedAt=40000);
 assert.deepEqual(m.assign('EMPIRE','C',fresh,40000),{v:20,h:20});
});
test('Fresh friendly capture invalidates lease and redirects captain',()=>{
 const m=new PlanetMissions(),o=observation();m.assign('EMPIRE','A',o,1000);
 o.scan.cells.find(c=>c.v===20&&c.h===20)!.symbol='@E';o.objects![0].faction='EMPIRE';
 assert.deepEqual(m.assign('EMPIRE','A',o,1001),{v:20,h:23});
});
test('Firing route can retain a destination more than one move away around blocked shots',()=>{
 const o=observation(),map=new ObservedMap();
 for(let h=17;h<=23;h++) o.scan.cells.find(c=>c.v===16&&c.h===h)!.symbol=' *';
 map.ingest(o.scan,o.status.position);
 const plan=planetFiringRoute(map,o.status.position,{v:20,h:20},'EMPIRE',1000);
 assert.ok(plan?.next);assert.ok(distance(o.status.position,plan.destination)>1);
 const next=planetFiringRoute(map,plan.next,{v:20,h:20},'EMPIRE',1001,plan.destination);
 assert.deepEqual(next?.destination,plan.destination);
 map.block(plan.destination,1001);
 assert.notDeepEqual(planetFiringRoute(map,plan.next,{v:20,h:20},'EMPIRE',1002,plan.destination)?.destination,plan.destination);
});

test('Range-three survey moves repeatedly instead of treating blocked firing range as arrival',()=>{
 const o=observation(),map=new ObservedMap(),target={v:20,h:20};
 let from={v:17,h:20},preferred;
 const seen=new Set<string>();
 for(let i=0;i<12;i++) {
   map.ingest(o.scan,from);
   const plan=planetSurveyRoute(map,from,target,'EMPIRE',1000+i,preferred);
   assert.ok(plan); assert.equal(distance(from,plan.next),1);assert.ok(distance(plan.next,target)>=3);
   seen.add(JSON.stringify(plan.next));from=plan.next;preferred=plan.destination;
 }
 assert.ok(seen.size>=8,'survey must visit new positions rather than bounce');
});
test('Survey does not move through unobserved or blocked immediate cells',()=>{
 const o=observation(),map=new ObservedMap(),from={v:17,h:20},target={v:20,h:20};
 for(const c of o.scan.cells) if(distance(c,from)===1)c.symbol=' *';
 map.ingest(o.scan,from);
 assert.equal(planetSurveyRoute(map,from,target,'EMPIRE',1000),undefined);
});


test('Adjacent Wing snapshot escapes through range two to the firing ring',()=>{
 const map=new ObservedMap(),target={v:55,h:62},cells=[];
 for(let v=44;v<=64;v++)for(let h=52;h<=72;h++)cells.push({v,h,symbol:v===55&&h===62?' @':' .',observedAt:1000});
 let from={v:54,h:62},preferred;
 for(const expected of [2,3]) {
   map.ingest({cells,observedAt:1000},from);
   const plan=planetSurveyRoute(map,from,target,'FEDERATION',1000,preferred);
   assert.ok(plan);assert.equal(distance(from,plan.next),1);
   assert.equal(distance(plan.next,target),expected);
   from=plan.next;preferred=plan.destination;
 }
});

test('Adjacent escape still refuses blocked, stale, unknown and dangerous first steps',()=>{
 for(const mode of ['blocked','stale','unknown','danger']) {
   const map=new ObservedMap(),from={v:54,h:62},target={v:55,h:62},cells=[];
   if(mode!=='unknown')for(let v=53;v<=55;v++)for(let h=61;h<=63;h++)
     cells.push({v,h,symbol:mode==='blocked'?' *':mode==='danger'?' !':' .',observedAt:mode==='stale'?0:10000});
   map.ingest({cells,observedAt:10000},from);
   assert.equal(planetSurveyRoute(map,from,target,'FEDERATION',10000),undefined,mode);
 }
});
