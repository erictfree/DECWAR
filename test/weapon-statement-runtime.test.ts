import test from 'node:test';
import assert from 'node:assert/strict';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { planetAttackRuntimeFixture } from './fixtures/planet-attack-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { orderedRational as real } from './support/rational-real.ts';
function fixture(){
  const f=basePhaserRuntimeFixture(),args={nplc:13940n,j:13941n,id:13942n,phit:13943n,ship:13944n};
  [2n,6n,2n,200n,-1n].forEach((w,i)=>f.m.write(13940n+BigInt(i),w));
  const target=f.views.high.players[6].ship;
  Object.assign(target,{v:12,h:20,energy:50000n,damage:0n,shieldStrength:1000n,shieldCondition:-1n});
  f.high.write('alive',-1n,6);f.views.high.board.setdsp(12,20,206);
  const base=(strength=1000n)=>{f.m.write(args.nplc,4n);f.m.write(args.j,1n);f.base(2,1,12,20,strength);f.views.high.board.setdsp(12,20,401);};
  return {...f,args,target,base,io:f.weapon.io,locals:f.weapon.locals,readReal:f.weapon.readReal,
    run:(entry:'phadam'|'tordam'='phadam')=>f.weapon.run(entry,args)};
}
function equalReal(a:ReturnType<typeof real.literal>,text:string){assert.equal(real.compare(a,real.literal(text)),0);}
function fixedPower(f:ReturnType<typeof fixture>,text='1'){f.io.pwr=function*(b){yield*b.evaluate();return f.rawPower.encode(real.literal(text));};}

test('Memory PHADAM preserves separate real-to-integer damage, energy and score assignments',()=>{
  const f=fixture();f.damage.draws.push('0','.5');finish(f.run());
  assert.deepEqual([f.hit.iwhat,f.hit.ihita,f.target.damage,f.target.energy,f.low.read('tpoint',K.KPEDAM)],[1n,13249n,13249n,36750n,13249n]);
  assert.equal(f.target.condition,K.RED);assert.equal(f.hit.shcnto,-1n);assert.equal(f.m.read(f.locals.powfac),80n);
  equalReal(f.readReal('rand'),'99');equalReal(f.readReal('ranb'),'99');equalReal(f.readReal('hita'),'13249.6');
  assert.deepEqual(f.damage.events,['ran','ran','pwr:2']);
});
for(const [condition,powfac,strength] of [[1n,40n,800n],[0n,80n,602n]] as const)test(`Memory PHADAM shield condition ${condition} keeps source absorption and POWFAC`,()=>{
  const f=fixture();f.target.shieldCondition=condition;f.damage.draws.push('0','.5');finish(f.run());
  assert.deepEqual([f.m.read(f.locals.powfac),f.target.shieldStrength,f.target.damage,f.hit.shcnto],[powfac,strength,0n,condition]);
  assert.deepEqual(f.weapon.events,['float']);
});
test('Memory PHADAM base absorption precedes secondary hull damage and scoring',()=>{
  const f=fixture();f.base(750n);f.damage.draws.push('0','.5');finish(f.run());
  assert.deepEqual([f.high.read('base',1,3,2),f.hit.ihita,f.hit.shstto,f.low.read('tpoint',K.KPBDAM)],[583n,1656n,583n,1656n]);
  assert.deepEqual(f.weapon.events,['float','int']);
});
test('Memory PHADAM overfull shields produce negative damage without a cap',()=>{
  const f=fixture();fixedPower(f);f.m.write(f.args.phit,50n);f.target.shieldCondition=1n;f.target.shieldStrength=1500n;f.damage.draws.push('0','0');finish(f.run());
  assert.deepEqual([f.target.shieldStrength,f.hit.ihita,f.target.damage,f.target.energy,f.low.read('tpoint',K.KPEDAM)],[1409n,-1000n,-1000n,51000n,-1000n]);
});
for(const player of [-1n,0n,1n])for(const ship of [-1n,0n])test(`Memory PHADAM attacker device damage observes PLAYER ${player} and SHIP ${ship}`,()=>{
  const f=fixture();f.low.write('player',player);f.m.write(f.args.ship,ship);f.high.write('shpdam',1n,1,K.KDCOMP);f.damage.draws.push('0','.5');finish(f.run());
  assert.equal(f.hit.ihita,player<0n&&ship<0n?10599n:13249n);
  assert.equal(f.low.read('tpoint',K.KPEDAM),player<0n&&ship<0n?10599n:0n);
  assert.equal(f.high.read('rsr',K.KPEDAM),player>=0n&&ship<0n?13249n:0n);
});
for(const reason of ['damage','energy','base'] as const)test(`Memory TORDAM ${reason} guard returns before RNG and unused argument reads`,()=>{
  const f=fixture();if(reason==='base')f.base(0n);else if(reason==='damage')f.target.damage=BigInt(K.KENDAM);else f.target.energy=0n;
  f.args.id=250000n;f.args.phit=250001n;f.args.ship=250002n;f.hit.iwhat=19n;finish(f.run('tordam'));
  assert.equal(f.hit.iwhat,19n);assert.deepEqual(f.damage.events,[]);equalReal(f.readReal('hit'),'99');
});
test('Memory PHADAM bypasses the destroyed-ship entry guard',()=>{
  const f=fixture();f.target.energy=0n;f.damage.draws.push('0','.5');finish(f.run());
  assert.equal(f.hit.klflg,2n);assert.equal(f.high.read('alive',6),0n);assert.equal(f.low.read('tpoint',K.KPEKIL),5000n);
});
test('Memory PHADAM bypasses the destroyed-base entry guard',()=>{
  const f=fixture();f.base(0n);f.damage.draws.push('0','.5','.2');f.damage.integers.push(1n);finish(f.run());
  assert.equal(f.high.read('base',1,3,2),0n);assert.equal(f.high.read('nbase',2),0n);assert.equal(f.hit.shstto,-70n);
});
test('TORDAM eager guard policy reads the physical BASE alias even for a ship',()=>{
  const f=fixture(),read=f.m.read.bind(f.m),alias=f.high.address('base',6,3,0);let seen=false;
  f.m.read=a=>{if(a===alias)seen=true;return read(a);};
  f.io.and=function*(...terms){const values=[];for(const term of terms)values.push(yield*term());return values.every(Boolean);};
  f.io.ran=function*(){throw new Error('after guards');};assert.throws(()=>finish(f.run('tordam')),/after guards/);assert.equal(seen,true);assert.equal(f.hit.iwhat,2n);
});
test('Memory PHADAM critical equality takes the device path and preserves original random order',()=>{
  const f=fixture();fixedPower(f);f.m.write(f.args.phit,50n);f.damage.draws.push('.325','0','0','.75');f.damage.integers.push(5n);finish(f.run());
  assert.deepEqual([f.hit.critdv,f.hit.critdm,f.target.devices[1],f.hit.ihita,f.target.damage],[1n,2000n,2000n,2250n,2250n]);
  assert.deepEqual(f.damage.events,['ran','ran','iran:5','ran','ran']);assert.deepEqual(f.weapon.events,['int']);
});
test('Memory PHADAM subcritical hit leaves old critical words and REAL locals intact',()=>{
  const f=fixture();fixedPower(f);f.m.write(f.args.phit,50n);f.damage.draws.push('.3249','0');f.hit.critdv=8n;f.hit.critdm=19n;finish(f.run());
  assert.equal(f.hit.critdv,8n);assert.equal(f.hit.critdm,19n);equalReal(f.readReal('rand'),'99');equalReal(f.readReal('ranb'),'99');
});
test('Memory critical device overflow uses adjacent SHPDAM memory without adding an array guard',()=>{
  const f=fixture();fixedPower(f);f.m.write(f.args.phit,50n);const alias=f.high.address('shpdam',6,K.KNDEV+1);f.m.write(alias,7n);
  f.damage.draws.push('.5','0','1','.5');f.damage.integers.push(1n);finish(f.run());
  assert.equal(f.hit.critdv,10n);assert.equal(f.m.read(alias),2007n);assert.equal(f.hit.critdm,2000n);
});
test('Memory critical shield-device damage drops shields before the hit snapshot',()=>{
  const f=fixture();fixedPower(f);f.m.write(f.args.phit,100n);f.target.shieldCondition=1n;f.target.shieldStrength=100n;
  f.damage.draws.push('.5','0','0','.5');f.damage.integers.push(1n);finish(f.run());assert.equal(f.hit.critdv,BigInt(K.KDSHLD));assert.equal(f.hit.shcnto,-1n);assert.equal(f.hit.critdm,1800n);
});
test('Memory compiler condition order can skip IRAN(5) for a critical ship',()=>{
  const f=fixture();fixedPower(f);f.m.write(f.args.phit,50n);f.damage.draws.push('.5','0','0','.5');
  f.io.and=function*(...terms){for(const term of [...terms].reverse())if(!(yield*term()))return false;return true;};finish(f.run());assert.equal(f.hit.critdm,2000n);assert.ok(!f.damage.events.includes('iran:5'));
});
for(const [shield,strength,draws,hit,left,iwhat] of [
  [-1n,1000n,['.2','.1','.5'],6000n,1000n,2n],
  [0n,1000n,['.2','.1','.5'],0n,1000n,2n],
  [1n,1000n,['.9','.1','.5'],0n,995n,3n],
  [1n,50n,['0','0','.5'],5700n,31n,2n],
  [1n,1n,['0','0','.5'],5994n,0n,2n],
] as const)test(`Memory TORDAM ship shield ${shield}/${strength} follows penetration, deflection and JUMP`,()=>{
  const f=fixture();f.target.shieldCondition=shield;f.target.shieldStrength=strength;f.damage.draws.push(...draws);f.args.id=250000n;f.args.phit=250001n;finish(f.run('tordam'));
  assert.deepEqual([f.hit.ihita,f.target.damage,f.target.shieldStrength,f.hit.iwhat],[hit,hit,left,iwhat]);assert.equal(f.hit.shjump,1n);assert.equal(f.target.v,13);assert.equal(f.views.high.board.disp(13,20),206);
  equalReal(f.readReal('ranb'),draws[0]==='.2'?'-.3':draws[0]==='.9'?'.4':'-.5');
});
test('Memory two-label torpedo IF remains a required compiler branch service',()=>{
  const f=fixture();f.target.shieldCondition=1n;f.damage.draws.push('.2','.1','.5');f.io.torpedoShieldBranch=function*(condition){assert.equal(yield*condition(),true);return 300;};finish(f.run('tordam'));
  assert.equal(f.hit.ihita,0n);assert.equal(f.target.shieldStrength,1000n);
});
test('Memory TORDAM base deflection avoids JUMP and ordinary damage',()=>{
  const f=fixture();f.base();f.damage.draws.push('.9','.1','.5');finish(f.run('tordam'));assert.deepEqual([f.hit.iwhat,f.hit.ihita,f.high.read('base',1,3,2)],[3n,0n,995n]);assert.deepEqual(f.damage.events,['ran','ran','ran']);
});
for(const roll of [4n,5n])test(`Memory TORDAM base critical roll ${roll} selects distinct damage/scoring paths`,()=>{
  const f=fixture();f.base(100n);f.damage.draws.push('0','.5','.5');f.damage.integers.push(roll);if(roll===5n){f.damage.draws.push('.2');f.damage.integers.push(1n);}finish(f.run('tordam'));
  assert.equal(f.hit.ihita,5400n);assert.equal(f.high.read('base',1,3,2),roll===5n?11n:27n);assert.equal(f.low.read('tpoint',K.KPBDAM),roll===5n?0n:5400n);
});
test('Memory base death awaits BASKIL before count, kill bonus and raw board clearing',()=>{
  const f=fixture(),baskil=f.io.baskil;f.base(50n);f.damage.draws.push('0','0','.5','.2');f.damage.integers.push(1n);
  f.io.baskil=function*(team){assert.equal(f.high.read('nbase',2),1n);assert.equal(f.high.read('base',1,3,2),-70n);yield 'base';yield*baskil(team);};
  const g=f.run('tordam');assert.equal(g.next().value,'base');assert.equal(f.low.read('tpoint',K.KPBDAM),5700n);assert.equal(f.views.high.board.disp(12,20),401);finish(g);
  assert.deepEqual([f.high.read('nbase',2),f.high.read('base',1,3,2),f.hit.shstto,f.low.read('tpoint',K.KPBDAM)],[0n,0n,-70n,15700n]);assert.equal(f.views.high.board.disp(12,20),0);
});
test('Memory base critical kill can preserve positive SHSTTO while clearing the base',()=>{
  const f=fixture();f.base(100n);f.damage.draws.push('0','.5','.5','.2');f.damage.integers.push(5n,10n);finish(f.run('tordam'));
  assert.equal(f.hit.shstto,11n);assert.equal(f.high.read('base',1,3,2),0n);assert.equal(f.low.read('tpoint',K.KPBDAM),10000n);
});
test('Memory surviving base retains a stale kill flag without killing or decrementing',()=>{
  const f=fixture();f.base();f.hit.klflg=2n;f.damage.draws.push('0','.5');finish(f.run());assert.equal(f.high.read('base',1,3,2),800n);assert.equal(f.high.read('nbase',2),1n);assert.equal(f.hit.klflg,2n);
});
test('Memory stale kill flag clears a surviving ship and preserves tractor and dock state',()=>{
  const f=fixture();f.hit.klflg=1n;f.target.docked=true;f.target.tractor=1;f.damage.draws.push('0','.5');finish(f.run());
  assert.equal(f.hit.klflg,1n);assert.equal(f.high.read('alive',6),0n);assert.equal(f.target.docked,true);assert.equal(f.target.tractor,1);assert.equal(f.low.read('tpoint',K.KPEKIL),5000n);assert.ok(!f.damage.events.includes('jump'));
});
test('Memory torpedo JUMP composes black-hole death before the second source clear',()=>{
  const f=fixture();f.views.high.board.setdsp(13,20,1000);f.damage.draws.push('0','0','.5');finish(f.run('tordam'));
  assert.equal(f.hit.klflg,1n);assert.equal(f.high.read('alive',6),0n);assert.equal(f.target.damage,BigInt(K.KENDAM));assert.equal(f.low.read('tpoint',K.KPEKIL),5000n);assert.equal(f.views.high.board.disp(13,20),1000);
});

test('PHADAM first RAN suspension retains entry writes and previous REAL locals until assignment',()=>{
  const f=fixture(),ran=f.io.ran;f.damage.draws.push('0','0');let first=true;
  f.io.ran=function*(z){if(first){first=false;yield 'random';}return yield*ran(z);};const g=f.run();assert.equal(g.next().value,'random');
  assert.equal(f.hit.iwhat,1n);assert.equal(f.m.read(f.locals.powfac),80n);equalReal(f.readReal('rana'),'99');equalReal(f.readReal('hit'),'99');finish(g);equalReal(f.readReal('rana'),'0');
});
test('PHADAM second RAN suspension precedes PWR exponent and later PHIT reads',()=>{
  const f=fixture(),ran=f.io.ran;f.damage.draws.push('0','0');let draws=0;
  f.io.ran=function*(z){if(++draws===2)yield 'random';return yield*ran(z);};const g=f.run();assert.equal(g.next().value,'random');equalReal(f.readReal('hit'),'0');
  f.m.write(f.args.id,3n);f.m.write(f.args.phit,100n);finish(g);assert.equal(f.hit.ihita,5832n);assert.deepEqual(f.rawPower.events,['t1*x2','t1*x2']);
});
test('PHADAM raw PWR can suspend on FMPR without publishing HIT or reading later PHIT',()=>{
  const f=fixture(),fmpr=f.rawPower.io.fmpr;f.damage.draws.push('0','0');f.rawPower.io.fmpr=function*(...a){yield 'multiply';yield*fmpr(...a);};
  const g=f.run();assert.equal(g.next().value,'multiply');equalReal(f.readReal('hit'),'0');assert.notEqual(f.r.s,f.s.initialStackWord);f.m.write(f.args.phit,100n);finish(g);
  assert.equal(f.hit.ihita,6480n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('PHADAM PHIT alias reads the preceding IWHAT store rather than a copied argument value',()=>{
  const f=fixture();f.args.phit=f.low.address('iwhat');f.hit.iwhat=99n;f.damage.draws.push('0','0');finish(f.run());assert.equal(f.hit.ihita,64n);equalReal(f.readReal('hita'),'64.8');
});
test('PHADAM saved HIT word is reread after suspension at the HITA assignment',()=>{
  const f=fixture(),assign=f.io.assign;f.damage.draws.push('0','0');let pause=true;
  f.io.assign=function*(d,t,v){if(d()===f.locals.hita&&pause){pause=false;yield 'magnitude';}yield*assign(d,t,v);};
  const g=f.run();assert.equal(g.next().value,'magnitude');f.m.write(f.locals.hit,f.rawPower.encode(real.literal('.5')));finish(g);assert.equal(f.hit.ihita,8000n);
});
for(const lhsFirst of [false,true])test(`PHADAM compiler assignment destination order remains explicit: LHS first ${lhsFirst}`,()=>{
  const f=fixture(),assign=f.io.assign;f.damage.draws.push('0','0');f.m.write(f.args.phit,100n);
  Object.assign(f.views.high.players[7].ship,{damage:100n,energy:50000n,shieldStrength:1000n,shieldCondition:-1n});
  const oldAddress=f.high.address('shpcon',6,K.KSDAM);let pause=true;
  f.io.assign=function*(d,t,v){if(d()===oldAddress&&pause){pause=false;const address=lhsFirst?d():null;yield 'destination';yield*assign(address===null?d:()=>address,t,v);}else yield*assign(d,t,v);};
  const g=f.run();assert.equal(g.next().value,'destination');f.m.write(f.args.j,7n);finish(g);
  assert.equal(f.high.read('shpcon',lhsFirst?6:7,K.KSDAM),6580n);assert.equal(f.high.read('shpcon',lhsFirst?7:6,K.KSDAM),lhsFirst?100n:0n);
  assert.equal(f.high.read('shpcon',7,K.KSNRGY),43520n);
});
for(const rightFirst of [false,true])test(`PHADAM critical jitter observes compiler operand order: right first ${rightFirst}`,()=>{
  const f=fixture(),binary=f.io.binary,ran=f.io.ran;fixedPower(f);f.m.write(f.args.phit,50n);f.damage.draws.push('.5','0','0','.5');f.damage.integers.push(1n);let draws=0;
  f.io.ran=function*(z){if(++draws===4)yield 'jitter';return yield*ran(z);};
  if(rightFirst)f.io.binary=function*(op,l,r){if(op==='add'&&l.type==='real'&&r.type==='real'){const word=yield*r.evaluate();return yield*binary(op,l,{type:r.type,evaluate:function*(){return word;}});}return yield*binary(op,l,r);};
  const g=f.run();assert.equal(g.next().value,'jitter');assert.equal(f.hit.critdm,2000n);f.m.write(f.locals.hita,f.rawPower.encode(real.literal('3000')));finish(g);
  assert.equal(f.hit.ihita,rightFirst?3000n:2000n);
});
test('PHADAM PWR service failure retains RANA and zero HIT before the pending assignment',()=>{
  const f=fixture();f.damage.draws.push('0');f.io.pwr=function*(){throw new Error('power fault');};assert.throws(()=>finish(f.run()),/power fault/);
  assert.equal(f.hit.iwhat,1n);equalReal(f.readReal('rana'),'0');equalReal(f.readReal('hit'),'0');equalReal(f.readReal('hita'),'99');assert.equal(f.target.damage,0n);
});
test('PHADAM failed energy conversion retains earlier hull damage and hit size but no score',()=>{
  const f=fixture(),assign=f.io.assign;f.damage.draws.push('0','.5');f.io.assign=function*(d,t,v){if(d()===f.high.address('shpcon',6,K.KSNRGY))throw new Error('conversion trap');yield*assign(d,t,v);};
  assert.throws(()=>finish(f.run()),/conversion trap/);assert.equal(f.target.damage,13249n);assert.equal(f.hit.ihita,13249n);assert.equal(f.target.energy,50000n);assert.equal(f.low.read('tpoint',K.KPEDAM),0n);
});
test('PHADAM failure storing RANA leaves caller-supplied local memory uninitialized',()=>{
  const f=fixture();f.locals.rana=250000n;f.damage.draws.push('.25');assert.throws(()=>finish(f.run()),/Unmapped/);assert.equal(f.hit.iwhat,1n);assert.equal(f.m.read(f.locals.powfac),80n);assert.equal(f.damage.draws.length,0);equalReal(f.readReal('hit'),'99');
});
test('PHADAM raw CPU fault retains source saves, zero HIT and completed random draws',()=>{
  const f=fixture();f.damage.draws.push('0','0');f.rawPower.io.fmpr=function*(){throw new Error('multiply trap');};assert.throws(()=>finish(f.run()),/multiply trap/);
  equalReal(f.readReal('hit'),'0');assert.equal(f.target.damage,0n);assert.equal(f.damage.draws.length,0);assert.notEqual(f.r.s,f.s.initialStackWord);
});
test('PHADAM IRAN(5) suspension leaves IHITA before the critical device assignment',()=>{
  const f=fixture(),iran=f.io.iran;fixedPower(f);f.m.write(f.args.phit,50n);f.damage.draws.push('.5','0','0','.5');f.damage.integers.push(1n);
  f.io.iran=function*(n){yield 'critical';return yield*iran(n);};const g=f.run();assert.equal(g.next().value,'critical');assert.equal(f.hit.ihita,4000n);assert.equal(f.hit.critdm,0n);assert.equal(f.target.damage,0n);finish(g);assert.equal(f.hit.critdm,2000n);
});
test('TORDAM JUMP receives actual argument words and cleanup rereads the changed target index',()=>{
  const f=fixture();f.damage.draws.push('0','0','.5');Object.assign(f.views.high.players[7].ship,{v:15,h:20});f.high.write('alive',-1n,7);f.views.high.board.setdsp(15,20,207);
  f.io.jump=function*(n,j){assert.deepEqual([n,j],[f.args.nplc,f.args.j]);yield 'jump';f.m.write(j,7n);f.hit.klflg=1n;};
  const g=f.run('tordam');assert.equal(g.next().value,'jump');assert.equal(f.low.read('tpoint',K.KPEDAM),6000n);finish(g);
  assert.equal(f.high.read('alive',6),-1n);assert.equal(f.high.read('alive',7),0n);assert.equal(f.views.high.board.disp(15,20),0);assert.equal(f.low.read('tpoint',K.KPEKIL),5000n);
});
test('Ship death awaits raw board deposit before ALIVE and the kill bonus',()=>{
  const f=fixture(),dpb=f.rawBoard.io.dpb;f.target.energy=1n;f.damage.draws.push('0','0');f.rawBoard.io.dpb=function*(){yield 'deposit';yield*dpb();};
  const g=f.run();assert.equal(g.next().value,'deposit');assert.equal(f.hit.klflg,2n);assert.equal(f.high.read('alive',6),-1n);assert.equal(f.low.read('tpoint',K.KPEKIL),0n);assert.equal(f.views.high.board.disp(12,20),206);finish(g);assert.equal(f.high.read('alive',6),0n);assert.equal(f.low.read('tpoint',K.KPEKIL),5000n);
});
test('Ship death clear fault preserves ALIVE and score after damage and KLFLG',()=>{
  const f=fixture();f.target.energy=1n;f.damage.draws.push('0','0');f.rawBoard.io.dpb=function*(){throw new Error('deposit fault');};assert.throws(()=>finish(f.run()),/deposit fault/);
  assert.equal(f.hit.klflg,2n);assert.equal(f.target.energy,-12959n);assert.equal(f.high.read('alive',6),-1n);assert.equal(f.low.read('tpoint',K.KPEDAM),12960n);assert.equal(f.low.read('tpoint',K.KPEKIL),0n);
});
test('Ship death retains coordinate argument addresses across the SETDSP call suspension',()=>{
  const f=fixture(),set=f.io.setdsp;f.hit.klflg=1n;f.damage.draws.push('0','0');f.views.high.board.setdsp(15,21,207);f.high.write('alive',-1n,7);
  f.io.setdsp=function*(v,h,z){assert.deepEqual([v,h],[f.high.address('shpcon',6,K.KVPOS),f.high.address('shpcon',6,K.KHPOS)]);yield 'clear';yield*set(v,h,z);};
  const g=f.run();assert.equal(g.next().value,'clear');f.target.v=15;f.target.h=21;f.m.write(f.args.j,7n);finish(g);
  assert.equal(f.views.high.board.disp(15,21),0);assert.equal(f.views.high.board.disp(12,20),206);assert.equal(f.high.read('alive',6),-1n);assert.equal(f.high.read('alive',7),0n);
});
test('ALIVE integer-zero assignment is delegated to explicit compiler logical conversion',()=>{
  const f=fixture();f.hit.klflg=1n;f.damage.draws.push('0','0');f.io.assignLogicalZero=function*(d){f.m.write(d(),7n);};finish(f.run());assert.equal(f.high.read('alive',6),7n);
});
test('Base critical random failure keeps absorbed strength and IHITA before CRITDM',()=>{
  const f=fixture();f.base(100n);f.damage.draws.push('0','.5','.5');f.damage.integers.push(5n);assert.throws(()=>finish(f.run('tordam')),/Unscheduled RAN/);
  assert.equal(f.high.read('base',1,3,2),81n);assert.equal(f.hit.ihita,5400n);assert.equal(f.hit.critdm,0n);assert.equal(f.low.read('tpoint',K.KPBDAM),0n);
});
test('Base death rereads NPLC and J after BASKIL before count and board updates',()=>{
  const f=fixture();f.base(50n);f.high.write('nbase',3n,1);f.high.write('base',17n,2,K.KVPOS,1);f.high.write('base',21n,2,K.KHPOS,1);f.high.write('base',999n,2,3,1);f.views.high.board.setdsp(17,21,302);
  f.damage.draws.push('0','0','.5','.2');f.damage.integers.push(1n);
  f.io.baskil=function*(team){assert.equal(yield*team.evaluate(),2n);yield 'base';f.m.write(f.args.nplc,3n);f.m.write(f.args.j,2n);};
  const g=f.run('tordam');assert.equal(g.next().value,'base');finish(g);
  assert.equal(f.high.read('nbase',2),1n);assert.equal(f.high.read('nbase',1),2n);assert.equal(f.high.read('base',1,3,2),-70n);assert.equal(f.high.read('base',2,3,1),0n);assert.equal(f.views.high.board.disp(17,21),0);assert.equal(f.views.high.board.disp(12,20),401);
});
test('Base board fault retains decremented count and kill bonus before final strength zero',()=>{
  const f=fixture();f.base(50n);f.damage.draws.push('0','0','.5','.2');f.damage.integers.push(1n);f.rawBoard.io.dpb=function*(){throw new Error('deposit fault');};assert.throws(()=>finish(f.run('tordam')),/deposit fault/);
  assert.equal(f.high.read('nbase',2),0n);assert.equal(f.low.read('tpoint',K.KPBDAM),15700n);assert.equal(f.high.read('base',1,3,2),-70n);assert.equal(f.views.high.board.disp(12,20),401);
});
for(const build of [basePhaserRuntimeFixture,planetAttackRuntimeFixture])test(`${build.name} waits for PHADAM raw PWR before damage, scoring and recipients`,()=>{
  const f=build(),fmpr=f.rawPower.io.fmpr;f.damage.draws.push('0','0');f.rawPower.io.fmpr=function*(...a){yield 'multiply';yield*fmpr(...a);};
  const g=f.run();assert.equal(g.next().value,'multiply');assert.equal(f.high.read('shpcon',1,K.KSDAM),0n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),0n);assert.equal(f.queued.length,0);assert.ok(!f.events.some(e=>e.startsWith('pridis:')));finish(g);
  assert.equal(f.queued[0].ihita,6480n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),6480n);assert.equal(f.r.s,f.s.initialStackWord);
});
for(const build of [basePhaserRuntimeFixture,planetAttackRuntimeFixture])test(`${build.name} waits for PHADAM ship clearing before owner score and hit publication`,()=>{
  const f=build(),dpb=f.rawBoard.io.dpb;f.high.write('shpcon',1n,1,K.KSNRGY);f.damage.draws.push('0','0');f.rawBoard.io.dpb=function*(){yield 'deposit';yield*dpb();};
  const g=f.run();assert.equal(g.next().value,'deposit');assert.equal(f.high.read('alive',1),-1n);assert.equal(f.high.read('tmscor',2,K.KPEDAM),0n);assert.equal(f.queued.length,0);finish(g);
  assert.equal(f.high.read('alive',1),0n);assert.equal(f.queued[0].klflg,2n);assert.equal(f.high.read('tmscor',2,K.KPEKIL),5000n);
});

test('TORDAM first random failure preserves previous REAL locals and POWFAC after IWHAT',()=>{
  const f=fixture();f.m.write(f.locals.powfac,17n);f.io.ran=function*(){throw new Error('random failure');};assert.throws(()=>finish(f.run('tordam')),/random failure/);
  assert.equal(f.hit.iwhat,2n);assert.equal(f.m.read(f.locals.powfac),17n);for(const name of ['rand','rana','hit','hita','ranb'] as const)equalReal(f.readReal(name),'99');
});
test('TORDAM followed by PHADAM shares persistent REAL locals without a second initialization',()=>{
  const f=fixture();f.damage.draws.push('.2','.1','.5');finish(f.run('tordam'));equalReal(f.readReal('rand'),'.2');equalReal(f.readReal('ranb'),'-.3');
  f.damage.draws.push('0','0');finish(f.run('phadam'));equalReal(f.readReal('rand'),'.2');equalReal(f.readReal('ranb'),'-.3');equalReal(f.readReal('rana'),'0');assert.equal(f.target.damage,18960n);
});
test('PHADAM POWFAC remains an integer local and halves through the required integer operation',()=>{
  const f=fixture(),ran=f.io.ran,binary=f.io.binary;f.target.shieldCondition=1n;f.damage.draws.push('0','0');let calls=0;
  f.io.ran=function*(z){if(++calls===1)f.m.write(f.locals.powfac,81n);return yield*ran(z);};let sawInteger=false;
  f.io.binary=function*(op,l,r){if(op==='div'){assert.equal(l.type,'integer');assert.equal(r.type,'integer');sawInteger=true;}return yield*binary(op,l,r);};finish(f.run());assert.equal(sawInteger,true);assert.equal(f.m.read(f.locals.powfac),40n);
});
for(const [id,phit,hit] of [[0n,200n,16000n],[-1n,200n,16000n],[2n,-100n,-6480n]] as const)test(`PHADAM distance ${id} and power ${phit} reach raw PWR and damage without added guards`,()=>{
  const f=fixture();f.m.write(f.args.id,id);f.m.write(f.args.phit,phit);f.damage.draws.push('0','0');finish(f.run());assert.equal(f.hit.ihita,hit);assert.equal(f.target.damage,hit);assert.deepEqual(f.damage.events,['ran','ran',`pwr:${id}`]);
});
test('BASKIL receives an expression temporary rather than an alias to NPLC',()=>{
  const f=fixture();f.base(50n);f.damage.draws.push('0','0','.5','.2');f.damage.integers.push(1n);
  f.displacement.baskil=function*(team){assert.equal(f.m.read(team),2n);f.m.write(team,1n);};finish(f.run('tordam'));
  assert.equal(f.m.read(f.args.nplc),4n);assert.equal(f.high.read('nbase',2),0n);assert.equal(f.high.read('nbase',1),0n);
});
