import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SourceCatalog } from '../tools/source-catalog.ts';
import { declarationScope } from '../tools/fortran-scope.ts';
import { commonLayouts } from '../tools/common.ts';
import { variantData } from '../tools/variant-data.ts';
import { variantDefinitions, createVariantContext } from '../src/runtime/variant.ts';
import { commonLayout } from '../src/generated/common-layout.ts';
import { localLayout } from '../src/generated/local-layout.ts';
import { queueLayout } from '../src/generated/queue-layout.ts';
import { inputLayout } from '../src/generated/input-layout.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { constants,ships } from '../src/generated/source-data.ts';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { SharedGameWorld } from '../src/runtime/shared-world.ts';
import { WorldDirectory } from '../src/runtime/world-directory.ts';

test('Source catalogs verify both pinned archives and Austin map/INI; unknown evidence never falls back',()=>{
  assert.deepEqual(new SourceCatalog('compuserve').verify(),{files:135,referenceFiles:0});
  const a=new SourceCatalog('austin');assert.deepEqual(a.verify(),{files:39,referenceFiles:2});
  assert.throws(()=>a.read('DECCMP.CMD'),/No austin source evidence/);
  assert.throws(()=>a.read('../../package.json'),/No austin source evidence/);
  const view=a.document('POINTS.FOR');assert.equal(view.file,'legacy/utexas/DECWAR.FOR');
  assert.match(view.text.split('\n')[2892],/subroutine POINTS/i);
  const scope=declarationScope('POINTS.FOR','POINTS',a.read);
  assert.equal(scope.type('dfLg').type,'implicit-integer');
  assert.equal(a.units().find(u=>u.name==='POINTS')?.line,2893);
  assert.equal(a.units().length,69);
  assert.match(a.document('DECWAR.HLP').file,/legacy\/utexas\/HLP\/DECWAR.HLP$/);
});

test('Variant extraction retains the entire established CompuServe layout and constants',()=>{
  const c=variantData('compuserve');
  assert.deepEqual(c.constants,constants);assert.deepEqual(c.ships.map(({words,...s})=>s),ships);
  assert.deepEqual(c.commonLayout,commonLayout);assert.deepEqual(c.localLayout,localLayout);
  assert.deepEqual(c.queueLayout,queueLayout);assert.deepEqual(c.inputLayout,inputLayout);
  assert.deepEqual(c.inputRuntimeLayout,inputRuntimeLayout);assert.deepEqual(c.fileLayout,fileLayout);
});

test('Austin evidence agrees across declarations, executable roster tables and the freshly generated map',()=>{
  const a=variantData('austin');
  assert.equal(a.constants.KNPLAY,18);assert.equal(a.constants.KNPLNT,20);
  assert.deepEqual(a.ships.map(s=>s.name),['Excalibur','Farragut','Intrepid','Lexington','Nimitz','Savannah','Trenton','Vulcan','Yorktown','Buzzard','Cobra','Demon','Goblin','Hawk','Jackal','Manta','Panther','Wolf']);
  assert.deepEqual(a.groupMasks.map(m=>m.mask),[0o777777,0o777000,0o777000,0o777,0o777]);
  assert.equal(a.commonLayout.hiseg.words,3122);assert.equal(a.commonLayout.lowseg.words,129);
  assert.equal(a.queueLayout.constants.knhit,720);assert.equal(a.queueLayout.words,4190);
  assert.equal(a.timers.address,0o406072);assert.equal(a.evidence.roster.line,489);
  assert.equal(a.evidence.roster.file,'legacy/utexas/DECWAR.FOR');
  assert.equal(a.pregame[1].name,'');assert.equal(a.pregame[4].name,'');assert.equal(a.pregame[5].id,6);
  assert.equal(a.evidence.entryPoints.find(e=>e.name==='TRCOFF')?.line,4504);
  assert.equal(a.fortranDataWords.length,251);
  assert.deepEqual(Buffer.from(a.assets.initialization!.text,'latin1'),readFileSync('legacy/utexas-reference/f78f2ec/DECWAR.INI'));
  for(const [key,message] of Object.entries(a.messages))assert.equal(message.text,variantDefinitions.compuserve.messages[key as keyof typeof variantDefinitions.compuserve.messages].text,key);
});

test('Austin permits only its documented trailing HILST omission, retaining live-field and map checks',()=>{
  const a=new SourceCatalog('austin'),K=variantDefinitions.austin.constants;
  assert.throws(()=>commonLayouts(K,a.read),/Incomplete assembly COMMON/);
  const changed=(file:string)=>file==='WARMAC.MAC'?a.read(file).replace('integer usppn','integer missing'):a.read(file);
  assert.throws(()=>commonLayouts(K,changed,{fortranOnlyTrailingHilst:true}),/COMMON declaration disagreement/);
  const wrongMap=(file:string)=>file==='DECWAR.MAP'?a.read(file).replace('3122.','3121.'):a.read(file);
  assert.throws(()=>commonLayouts(K,wrongMap,{fortranOnlyTrailingHilst:true}),/COMMON map length disagreement/);
});

test('Two variant worlds use distinct memory dimensions, share their own captains, and survive rollover',()=>{
  const makeMemory=(world:SharedGameWorld)=>{
    const v=world.variant.definition,m=new AddressSpace();
    for(const r of [v.commonLayout.hiseg,v.timers,v.queueLayout])m.map(BigInt(r.address),Array<bigint>(r.words).fill(0n));
    world.attach(m);return new CommonBlock(m,'hiseg',undefined,v.commonLayout);
  };
  const directory=new WorldDirectory(undefined,createVariantContext('austin'));
  const world=directory.load(),one=makeMemory(world),two=makeMemory(world);
  one.write('shpcon',123n,18,8);assert.equal(two.read('shpcon',18,8),123n);
  one.write('bits',1n<<17n,18);assert.equal(two.read('bits',18),1n<<17n);
  const c=makeMemory(new SharedGameWorld());assert.equal(c.field('shpcon').dimensions[0].length,10);
  assert.equal(one.field('shpcon').dimensions[0].length,18);assert.equal(c.read('bits',10),0n);
  directory.remove(world);const fresh=directory.load();assert.equal(fresh.variant,world.variant);
  assert.equal(makeMemory(fresh).read('shpcon',18,8),0n);assert.equal(two.read('shpcon',18,8),123n);
  assert.ok(Object.isFrozen(world.variant.definition.constants));assert.ok(Object.isFrozen(world.variant.definition.ships));
});
