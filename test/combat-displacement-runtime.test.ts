import test from 'node:test';
import assert from 'node:assert/strict';
import { basePhaserRuntimeFixture,finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { orderedRational as real } from './support/rational-real.ts';
import { check,CheckLocals } from '../src/game/check.ts';
import { ingal } from '../src/compat/board.ts';
function fixture(){
  const f=basePhaserRuntimeFixture(),d=f.displacement,args={nplc:13980n,j:13981n,team:13982n};
  f.m.write(args.nplc,1n);f.m.write(args.j,1n);f.m.write(args.team,1n);
  const ship=f.views.high.players[1].ship;ship.docked=true;ship.condition=K.GREEN;d.path.dvs=real.literal('.5');
  const jump=()=>d.jump(args.nplc,args.j),baskil=()=>d.baskil(args.team);
  const planet=(code=601,v=50,h=50)=>{f.high.write('nplnet',1n);f.high.write('locpln',BigInt(v),1,K.KVPOS);f.high.write('locpln',BigInt(h),1,K.KHPOS);f.views.high.board.setdsp(v,h,code);};planet();
  return {...f,d,args,ship,jump,baskil,planet};
}
test('Memory JUMP moves using physical CHKOUT words, truncates each coordinate and undocks the ship',()=>{
  const f=fixture();f.hit.klflg=2n;f.hit.dbits=9n;finish(f.jump());
  assert.deepEqual([f.ship.v,f.ship.h,f.ship.docked,f.ship.condition],[11,20,false,K.RED]);assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.views.high.board.disp(11,20),101);
  assert.deepEqual([f.hit.vto,f.hit.hto,f.hit.shjump,f.hit.klflg,f.hit.dbits],[11n,20n,1n,2n,9n]);assert.deepEqual(f.d.events,['ingal','pdist','dispc','set:10,20,0','set:11,20,101']);
});
for(const [dv,dh,events] of [['.1','.1',['ingal','pdist']],['2','0',['ingal','pdist']],['-20','0',['ingal']]] as const)test(`Memory JUMP rejects displacement ${dv}/${dh} before board access`,()=>{
  const f=fixture();f.d.path.dhs=real.literal(dv);f.d.path.dvs=real.literal(dh);f.hit.shjump=1n;f.hit.vto=70n;finish(f.jump());assert.equal(f.hit.shjump,0n);assert.equal(f.hit.vto,70n);assert.equal(f.ship.docked,true);assert.deepEqual(f.d.events,events);
});
test('Memory JUMP adds negative fractions before integer conversion',()=>{
  const f=fixture();f.d.path.dhs=real.literal('-.5');f.d.path.dvs=real.literal('0');finish(f.jump());assert.equal(f.ship.v,9);assert.equal(f.ship.h,20);
});
for(const code of [101,301,500,601,901,-1])test(`Memory JUMP destination code ${code} follows raw DISPC classification`,()=>{
  const f=fixture();f.views.high.board.setdsp(11,20,code);finish(f.jump());assert.equal(f.hit.shjump,code===-1?1n:0n);assert.equal(f.views.high.board.disp(11,20),code===-1?101:code);
});
test('Memory JUMP base movement preserves strength and leaves ship docking untouched',()=>{
  const f=fixture();f.m.write(f.args.nplc,4n);f.m.write(f.args.j,2n);f.base(2,2,10,20,777n);f.views.high.board.setdsp(10,20,402);finish(f.jump());
  assert.deepEqual([f.high.read('base',2,1,2),f.high.read('base',2,2,2),f.high.read('base',2,3,2)],[11n,20n,777n]);assert.equal(f.views.high.board.disp(11,20),402);assert.equal(f.ship.docked,true);
});
test('Memory JUMP Romulan board code retains the dummy J argument',()=>{
  const f=fixture();f.m.write(f.args.nplc,5n);f.m.write(f.args.j,7n);f.world.locr.v=10;f.world.locr.h=20;f.world.rom=-1n;finish(f.jump());assert.deepEqual([f.world.locr.v,f.world.locr.h],[11,20]);assert.equal(f.views.high.board.disp(11,20),507);assert.equal(f.ship.docked,true);
});
for(const kind of [1n,4n,5n])test(`Memory JUMP black-hole path for class ${kind} preserves old coordinates and the hole`,()=>{
  const f=fixture();f.m.write(f.args.nplc,kind);f.base(2,1,10,20,777n);f.world.locr.v=10;f.world.locr.h=20;f.world.rom=-1n;f.views.high.board.setdsp(11,20,1000);finish(f.jump());
  assert.deepEqual([f.hit.shjump,f.hit.klflg,f.hit.vto,f.hit.hto],[1n,1n,11n,20n]);assert.equal(f.views.high.board.disp(11,20),1000);assert.equal(f.views.high.board.disp(10,20),0);
  assert.equal(f.ship.v,10);assert.equal(f.high.read('base',1,1,2),10n);assert.equal(f.world.locr.v,10);assert.equal(f.ship.docked,true);assert.equal(f.ship.condition,K.GREEN);
  assert.equal(f.ship.damage,kind===1n?BigInt(K.KENDAM):0n);assert.equal(f.high.read('alive',1),kind===1n?0n:-1n);assert.equal(f.high.read('base',1,3,2),kind===4n?0n:777n);assert.equal(f.world.rom,kind===5n?0n:-1n);
});
test('CHECK writes the same CHKOUT words that the resumable JUMP reads',()=>{
  const f=fixture();f.ship.v=12;f.ship.h=21;f.views.high.board.setdsp(10,20,0);f.views.high.board.setdsp(12,21,101);const w=(value:bigint)=>({value});
  check(w(10n),w(20n),w(4n),w(2n),w(4n),{value:real.literal('0')},f.d.path,new CheckLocals(real.literal('0')),{
    real,ran:()=>real.literal('.75'),ingal:(v,h)=>ingal(Number(v),Number(h)),disp:(v,h)=>BigInt(f.views.high.board.disp(Number(v),Number(h))),
  });assert.equal(f.d.chkout.read('dcode'),101n);finish(f.jump());assert.deepEqual([f.ship.v,f.ship.h],[13,21]);assert.equal(f.views.high.board.disp(13,21),101);
});
test('JUMP captures its source position through separate assignments with live J',()=>{
  const f=fixture(),assign=f.d.jumpIO.assign;f.high.write('shpcon',25n,2,K.KHPOS);f.d.jumpIO.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.d.jumpLocals.iloc1)f.m.write(f.args.j,2n);};
  finish(f.jump());assert.equal(f.m.read(f.d.jumpLocals.iloc1),10n);assert.equal(f.m.read(f.d.jumpLocals.jloc1),25n);assert.equal(f.views.high.board.disp(11,25),102);
});
for(const rightFirst of [false,true])test(`JUMP mixed addition exposes operand order: right first ${rightFirst}`,()=>{
  const f=fixture(),binary=f.d.jumpIO.binary;let pause=true;
  f.d.jumpIO.binary=function*(op,l,r){if(pause&&r.type==='real'){pause=false;if(rightFirst){const n=yield*r.evaluate();yield 'addition';return yield*binary(op,l,{...r,evaluate:function*(){return n;}});}const n=yield*l.evaluate();yield 'addition';return yield*binary(op,{...l,evaluate:function*(){return n;}},r);}return yield*binary(op,l,r);};
  const g=f.jump();assert.equal(g.next().value,'addition');f.m.write(f.d.jumpLocals.iloc1,20n);f.d.path.dhs=real.literal('2');finish(g);
  assert.equal(f.m.read(f.d.jumpLocals.ivv),rightFirst?21n:12n);assert.equal(f.hit.shjump,rightFirst?1n:0n);
});
test('JUMP horizontal displacement reads the current CHKOUT word after vertical conversion',()=>{
  const f=fixture(),assign=f.d.jumpIO.assign;f.d.jumpIO.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.d.jumpLocals.ivv)yield 'vertical';};const g=f.jump();assert.equal(g.next().value,'vertical');f.d.path.dvs=real.literal('-.5');finish(g);assert.deepEqual([f.ship.v,f.ship.h],[11,19]);
});
test('JUMP horizontal conversion fault preserves IVV and the copied source coordinates',()=>{
  const f=fixture(),assign=f.d.jumpIO.assign;f.m.write(f.d.jumpLocals.ihh,77n);f.d.jumpIO.assign=function*(d,t,v){if(d()===f.d.jumpLocals.ihh)throw new Error('conversion fault');yield*assign(d,t,v);};assert.throws(()=>finish(f.jump()),/conversion fault/);assert.equal(f.m.read(f.d.jumpLocals.ivv),11n);assert.equal(f.m.read(f.d.jumpLocals.ihh),77n);assert.equal(f.hit.shjump,0n);assert.deepEqual(f.d.events,[]);
});
test('JUMP missing NPLC fails after resetting only SHJUMP',()=>{
  const f=fixture();f.hit.shjump=9n;f.hit.klflg=8n;f.m.write(f.d.jumpLocals.iloc1,77n);f.args.nplc=250000n;assert.throws(()=>finish(f.jump()),/Unmapped/);assert.equal(f.hit.shjump,0n);assert.equal(f.hit.klflg,8n);assert.equal(f.m.read(f.d.jumpLocals.iloc1),77n);
});
test('JUMP source-clear suspension defers destination code evaluation and coordinate writes',()=>{
  const f=fixture(),dpb=f.rawBoard.io.dpb;let first=true;f.rawBoard.io.dpb=function*(){if(first){first=false;yield 'clear';}yield*dpb();};const g=f.jump();assert.equal(g.next().value,'clear');
  assert.equal(f.ship.v,10);assert.equal(f.hit.shjump,0n);f.m.write(f.args.j,2n);finish(g);assert.equal(f.views.high.board.disp(11,20),102);assert.equal(f.high.read('shpcon',2,K.KVPOS),11n);assert.equal(f.ship.v,10);
});
test('JUMP second deposit fault leaves old cell cleared and object coordinates unchanged',()=>{
  const f=fixture(),dpb=f.rawBoard.io.dpb;let writes=0;f.rawBoard.io.dpb=function*(){if(++writes===2)throw new Error('arrival fault');yield*dpb();};assert.throws(()=>finish(f.jump()),/arrival fault/);
  assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.views.high.board.disp(11,20),0);assert.equal(f.ship.v,10);assert.equal(f.hit.shjump,0n);assert.equal(f.ship.docked,true);
});
test('JUMP black-hole clear fault precedes all new death flags',()=>{
  const f=fixture();f.views.high.board.setdsp(11,20,1000);f.hit.klflg=8n;f.hit.vto=77n;f.rawBoard.io.dpb=function*(){throw new Error('clear fault');};assert.throws(()=>finish(f.jump()),/clear fault/);assert.equal(f.hit.shjump,0n);assert.equal(f.hit.klflg,8n);assert.equal(f.hit.vto,77n);assert.equal(f.high.read('alive',1),-1n);
});
test('JUMP repeats class tests between ship and base coordinate stores',()=>{
  const f=fixture(),assign=f.d.jumpIO.assign;f.d.jumpIO.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.high.address('shpcon',1,K.KVPOS))f.m.write(f.args.nplc,4n);};finish(f.jump());
  assert.equal(f.ship.v,11);assert.equal(f.ship.h,20);assert.deepEqual([f.high.read('base',1,1,2),f.high.read('base',1,2,2)],[11n,20n]);assert.equal(f.ship.docked,true);assert.equal(f.views.high.board.disp(11,20),101);
});
test('JUMP delegates .FALSE. conversion separately for INTEGER DOCKED and LOGICAL ROM',()=>{
  const f=fixture();f.d.jumpIO.assignFalse=function*(d,type){assert.equal(type,'integer');f.m.write(d(),7n);};finish(f.jump());assert.equal(f.high.read('docked',1),7n);
  const g=fixture();g.m.write(g.args.nplc,5n);g.world.locr.v=10;g.world.locr.h=20;g.views.high.board.setdsp(11,20,1000);g.d.jumpIO.assignFalse=function*(d,type){assert.equal(type,'logical');g.m.write(d(),9n);};finish(g.jump());assert.equal(g.world.rom,9n);
});
for(const cap of [-1n,0n])test(`Memory BASKIL NUMCAP ${cap} preserves docking without a remaining port`,()=>{
  const f=fixture();f.high.write('numcap',cap,1);finish(f.baskil());assert.equal(f.ship.docked,true);assert.equal(f.ship.condition,K.GREEN);assert.equal(f.m.read(f.d.baseLocals.i),6n);assert.deepEqual(f.d.events,[]);
});
test('Memory BASKIL undocks a non-alive ship when captured count is positive but no friendly port is nearby',()=>{
  const f=fixture();f.high.write('numcap',1n,1);f.high.write('alive',1n,1);finish(f.baskil());assert.equal(f.ship.docked,false);assert.equal(f.ship.condition,K.RED);assert.equal(f.m.read(f.d.baseLocals.j),2n);
});
for(const count of [0n,1n])for(const strength of [0n,1n])test(`Memory BASKIL base count ${count} and slot-ten strength ${strength} preserve the full-slot scan`,()=>{
  const f=fixture();f.base(1,10,11,21,strength);f.high.write('nbase',count,1);f.high.write('numcap',1n,1);finish(f.baskil());assert.equal(f.ship.docked,count>0n&&strength>0n);assert.equal(f.d.events.includes('ldis'),count>0n&&strength>0n);
});
for(const code of [601,701,801])test(`Memory BASKIL planet class ${code} uses live DISPC and inclusive adjacency`,()=>{
  const f=fixture();f.high.write('numcap',1n,1);f.planet(code,11,21);finish(f.baskil());assert.equal(f.ship.docked,code===701);assert.equal(f.d.events.includes('ldis'),code===701);
});
test('Memory BASKIL restricts team two to slots six through ten',()=>{
  const f=fixture();f.m.write(f.args.team,2n);f.high.write('numcap',1n,2);const other=f.views.high.players[6].ship;Object.assign(other,{docked:true,v:40,h:40});finish(f.baskil());assert.equal(f.ship.docked,true);assert.equal(other.docked,false);assert.equal(f.m.read(f.d.baseLocals.ib),6n);assert.equal(f.m.read(f.d.baseLocals.i),11n);
});
test('Memory BASKIL skips undocked slots before port-count reads',()=>{
  const f=fixture();f.ship.docked=false;const read=f.m.read.bind(f.m);f.m.read=a=>{assert.notEqual(a,f.high.address('nbase',1));return read(a);};finish(f.baskil());assert.deepEqual(f.d.events,[]);
});
test('Memory BASKIL retains NBASE(0)/NUMCAP(0) physical aliases and full player range for ITYPE zero',()=>{
  const f=fixture();f.m.write(f.args.team,0n);f.high.write('nbase',0n,0);f.high.write('numcap',1n,0);f.planet(601,11,21);finish(f.baskil());assert.equal(f.ship.docked,true);assert.equal(f.m.read(f.d.baseLocals.i),11n);assert.ok(f.d.events.includes('ldis'));
});
for(const oneTrip of [false,true])test(`BASKIL reversed planet bounds use explicit compiler entry policy: one trip ${oneTrip}`,()=>{
  const f=fixture();f.high.write('numcap',1n,1);f.planet(701,11,21);f.high.write('nplnet',0n);f.d.baseIO.enterLoop=(s,l)=>oneTrip||s<=l;finish(f.baskil());assert.equal(f.ship.docked,oneTrip);assert.equal(f.m.read(f.d.baseLocals.j),1n);assert.equal(f.d.events.includes('dispc'),oneTrip);
});
test('BASKIL snapshots the planet loop limit before DISPC suspension',()=>{
  const f=fixture(),dispc=f.d.baseIO.dispc;f.high.write('numcap',1n,1);f.d.baseIO.dispc=function*(...a){yield 'planet';return yield*dispc(...a);};const g=f.baskil();assert.equal(g.next().value,'planet');f.high.write('nplnet',10n);finish(g);assert.equal(f.ship.docked,false);assert.equal(f.m.read(f.d.baseLocals.j),2n);assert.equal(f.d.events.filter(e=>e==='dispc').length,1);
});
for(const rightFirst of [false,true])test(`BASKIL ITYPE comparison uses explicit operand order: right first ${rightFirst}`,()=>{
  const f=fixture(),compare=f.d.baseIO.compare,dispc=f.d.baseIO.dispc;f.high.write('numcap',1n,1);f.planet(801,11,21);f.d.baseIO.dispc=function*(...a){yield 'planet';return yield*dispc(...a);};
  if(rightFirst)f.d.baseIO.compare=function*(op,l,r){const n=yield*r.evaluate();return yield*compare(op,l,{...r,evaluate:function*(){return n;}});};
  const g=f.baskil();assert.equal(g.next().value,'planet');f.m.write(f.args.team,2n);finish(g);assert.equal(f.ship.docked,rightFirst);
});
test('BASKIL reads current coordinates through raw LDIS after a yielded call',()=>{
  const f=fixture(),ldis=f.d.baseIO.ldis;f.base(1,1,50,50,100n);f.high.write('numcap',1n,1);f.d.baseIO.ldis=function*(...a){yield 'range';return yield*ldis(...a);};
  const g=f.baskil();assert.equal(g.next().value,'range');f.high.write('base',11n,1,1,1);f.high.write('base',21n,1,2,1);finish(g);assert.equal(f.ship.docked,true);
});
test('BASKIL condition and docked stores use current I independently',()=>{
  const f=fixture(),assign=f.d.baseIO.assign;f.high.write('numcap',1n,1);f.high.write('docked',-1n,2);f.d.baseIO.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.high.address('shpcon',1,K.KSPCON))f.m.write(f.d.baseLocals.i,2n);};finish(f.baskil());assert.equal(f.ship.condition,K.RED);assert.equal(f.ship.docked,true);assert.equal(f.high.read('docked',2),0n);assert.equal(f.m.read(f.d.baseLocals.i),6n);
});
test('BASKIL failed DO bound evaluation retains initial IB/IE before I changes',()=>{
  const f=fixture();f.m.write(f.d.baseLocals.i,77n);f.d.baseIO.bounds=function*(){throw new Error('bounds fault');};assert.throws(()=>finish(f.baskil()),/bounds fault/);assert.equal(f.m.read(f.d.baseLocals.ib),1n);assert.equal(f.m.read(f.d.baseLocals.ie),5n);assert.equal(f.m.read(f.d.baseLocals.i),77n);assert.equal(f.ship.docked,true);
});
test('BASKIL raw board read fault leaves docking and loop indices at the current planet',()=>{
  const f=fixture();f.high.write('numcap',1n,1);f.rawBoard.io.ldb=function*(){throw new Error('load fault');};assert.throws(()=>finish(f.baskil()),/load fault/);assert.equal(f.ship.docked,true);assert.equal(f.ship.condition,K.GREEN);assert.equal(f.m.read(f.d.baseLocals.i),1n);assert.equal(f.m.read(f.d.baseLocals.j),1n);
});

test('JUMP Romulan black-hole path never reads its unused J argument',()=>{
  const f=fixture();f.m.write(f.args.nplc,5n);f.args.j=250000n;f.world.locr.v=10;f.world.locr.h=20;f.world.rom=-1n;f.views.high.board.setdsp(11,20,1000);finish(f.jump());assert.equal(f.world.rom,0n);assert.equal(f.hit.klflg,1n);
});
test('BASKIL missing ITYPE retains initial IB/IE before any slot or port read',()=>{
  const f=fixture();f.args.team=250000n;f.m.write(f.d.baseLocals.i,77n);assert.throws(()=>finish(f.baskil()),/Unmapped/);assert.equal(f.m.read(f.d.baseLocals.ib),1n);assert.equal(f.m.read(f.d.baseLocals.ie),BigInt(K.KNPLAY));assert.equal(f.m.read(f.d.baseLocals.i),77n);
});
function damageArgs(f:ReturnType<typeof fixture>){f.m.write(13983n,200n);f.m.write(13984n,-1n);return {nplc:f.args.nplc,j:f.args.j,id:250000n,phit:13983n,ship:13984n};}
test('TORDAM awaits both raw JUMP deposits before displacement metadata and undocking',()=>{
  const f=fixture(),args=damageArgs(f),dpb=f.rawBoard.io.dpb;f.damage.draws.push('0','0','.5');f.rawBoard.io.dpb=function*(){yield 'deposit';yield*dpb();};
  const g=f.weapon.run('tordam',args);assert.equal(g.next().value,'deposit');assert.equal(f.ship.damage,6000n);assert.equal(f.hit.shjump,0n);assert.equal(f.ship.v,10);assert.equal(f.ship.docked,true);
  assert.equal(g.next().value,'deposit');assert.equal(f.views.high.board.disp(10,20),0);assert.equal(f.views.high.board.disp(11,20),0);assert.equal(f.hit.shjump,0n);finish(g);
  assert.equal(f.views.high.board.disp(11,20),101);assert.equal(f.hit.shjump,1n);assert.equal(f.ship.v,11);assert.equal(f.ship.docked,false);
});
test('TORDAM black-hole JUMP completes death stores before its second source clear and kill bonus',()=>{
  const f=fixture(),args=damageArgs(f),dpb=f.rawBoard.io.dpb;f.damage.draws.push('0','0','.5');f.views.high.board.setdsp(11,20,1000);f.rawBoard.io.dpb=function*(){yield 'deposit';yield*dpb();};
  const g=f.weapon.run('tordam',args);assert.equal(g.next().value,'deposit');assert.equal(f.high.read('alive',1),-1n);assert.equal(f.hit.klflg,0n);
  assert.equal(g.next().value,'deposit');assert.equal(f.high.read('alive',1),0n);assert.equal(f.hit.klflg,1n);assert.equal(f.ship.damage,BigInt(K.KENDAM));assert.equal(f.low.read('tpoint',K.KPEKIL),0n);finish(g);
  assert.equal(f.low.read('tpoint',K.KPEKIL),5000n);assert.equal(f.views.high.board.disp(11,20),1000);assert.equal(f.ship.v,10);assert.equal(f.ship.docked,true);
});
test('TORDAM base death awaits BASKIL planet lookup before undocking, count and kill score',()=>{
  const f=fixture(),args=damageArgs(f),dispc=f.d.baseIO.dispc;f.m.write(f.args.nplc,4n);f.base(2,1,12,20,50n);f.views.high.board.setdsp(12,20,401);f.high.write('numcap',1n,2);
  Object.assign(f.views.high.players[6].ship,{v:12,h:20,docked:true,condition:K.GREEN});f.damage.draws.push('0','0','.5','.2');f.damage.integers.push(1n);
  f.d.baseIO.dispc=function*(...a){yield 'planet';return yield*dispc(...a);};const g=f.weapon.run('tordam',args);assert.equal(g.next().value,'planet');
  assert.equal(f.high.read('base',1,3,2),-70n);assert.equal(f.high.read('nbase',2),1n);assert.equal(f.high.read('docked',6),-1n);assert.equal(f.low.read('tpoint',K.KPBDAM),5700n);finish(g);
  assert.equal(f.high.read('docked',6),0n);assert.equal(f.high.read('shpcon',6,K.KSPCON),BigInt(K.RED));assert.equal(f.high.read('nbase',2),0n);assert.equal(f.low.read('tpoint',K.KPBDAM),15700n);assert.equal(f.views.high.board.disp(12,20),0);
});
test('TORDAM positive-strength critical base kill still supplies an adjacent port during BASKIL',()=>{
  const f=fixture(),args=damageArgs(f),ldis=f.d.baseIO.ldis;f.m.write(f.args.nplc,4n);f.base(2,1,12,20,100n);f.views.high.board.setdsp(12,20,401);f.high.write('numcap',1n,2);
  Object.assign(f.views.high.players[6].ship,{v:12,h:20,docked:true});f.damage.draws.push('0','.5','.5','.2');f.damage.integers.push(5n,10n);
  f.d.baseIO.ldis=function*(...a){yield 'range';return yield*ldis(...a);};const g=f.weapon.run('tordam',args);assert.equal(g.next().value,'range');assert.equal(f.high.read('base',1,3,2),11n);assert.equal(f.high.read('nbase',2),1n);finish(g);
  assert.equal(f.high.read('docked',6),-1n);assert.equal(f.high.read('nbase',2),0n);assert.equal(f.high.read('base',1,3,2),0n);assert.equal(f.hit.shstto,11n);
});
