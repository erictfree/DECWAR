import test from 'node:test';
import assert from 'node:assert/strict';
import { dockStatements } from '../src/game/dock-statements.ts';
import type { DockServices } from '../src/game/dock-statements.ts';
import { rawLdis } from '../src/compat/ldis.ts';
import { rawEqual } from '../src/compat/equal.ts';
import { clockRoutine } from '../src/compat/clock-runtime.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { add36,multiply36,divide36,MIN_INTEGER,rightHalf } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { turnStatements } from '../src/game/turn-statements.ts';
import { repairStatements } from '../src/game/repair-statements.ts';
import type { RepairServices } from '../src/game/repair-statements.ts';
import { highState } from '../src/game/common-state.ts';
import { boardRuntimeFixture } from './fixtures/board-runtime.ts';
import { statusRuntimeFixture } from './fixtures/status-runtime.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const f=statusRuntimeFixture(),board=new PackedBoard(f.high.array('board',K.BRDSIZ,[1]));f.parse('DOCK');f.low.write('team',1n);f.low.write('ptime',77n);f.high.write('alive',-1n,1);f.high.write('slwest',2n);f.high.write('tim0',1000n);
  const locals={v:11300n,ifract:11301n,i:11302n,j:11303n},labels={dock01:12200n,dockin:12220n},statusWord=12240n;
  f.h.put(labels.dock01,M.dock01.text);f.h.put(labels.dockin,M.dockin.text);f.h.put(statusWord,'STATUS');
  f.m.write(f.s.object.lngdsp+1n,(1n<<22n)|(2n<<18n)|rightHalf(f.s.status.lngshp-1n));f.m.write(f.s.object.shtdsp+1n,12260n);f.h.put(12260n,'L');
  const prepare=(words:bigint[])=>{loadArgumentBlock(f.m,10700n,words);selectArgumentBlock(f.r,10700n);},events:string[]=[],clock=[11000n,12000n];
  const rawBoard=boardRuntimeFixture(f,f.high,f.low);
  const ldisCPU={*subT1(w:bigint):Generator<string,void,void>{f.r.t1=add36(f.r.t1,-w);},*movmT1():Generator<string,void,void>{assert.notEqual(f.r.t1,MIN_INTEGER);if(f.r.t1<0n)f.r.t1=-f.r.t1;}};
  const clockIO={*mstime():Generator<string,void,void>{events.push('clock');assert.ok(clock.length>0);f.r.f=clock.shift()!;},*runtim():Generator<string,void,void>{assert.fail();},*sub0(w:bigint):Generator<string,void,void>{f.r.f=add36(f.r.f,-w);}};
  const io:DockServices<string>={logical:w=>w<0n,trueWord:-1n,enterPlanets:(s,l)=>s<=l,
    *integer(op,left,right){const l=yield*left(),r=yield*right();switch(op){case 'add':return add36(l,r);case 'sub':return add36(l,-r);case 'mul':return multiply36(l,r);case 'min':return l<r?l:r;case 'max':return l>r?l:r;}},
    *different(left,right){return(yield*left())!==(yield*right());},
    *assign(destination,value){const v=yield*value();f.m.write(destination(),v);}, // Explicit RHS-first compiler fixture.
    *etim(a){prepare([a]);yield*clockRoutine('etim',f.m,f.r,f.rt.args,clockIO);return f.r.f;},
    *ldis(v,h,ov,oh,n){events.push(`ldis:${ov}:${oh}`);f.m.write(11500n,BigInt(n));prepare([v,h,ov,oh,11500n]);yield*rawLdis(f.r,f.rt.args,ldisCPU);return f.r.f;},
    *dispc(v,h){events.push(`dispc:${v}`);prepare([v,h]);yield*rawBoard.run('dispc');return f.r.t0;},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*rawBoard.run('disp');return f.r.t0;},
    *equal(t,s){events.push('equal');prepare([t,s]);yield*rawEqual(f.r,f.rt.args,f.s.point7LeftHalf,f.eq);return f.r.f;},
    *crlf(){yield*f.rt.run('crlf');},*odisp(v,s){f.m.write(11501n,v);f.m.write(11502n,BigInt(s));prepare([11501n,11502n]);yield*f.rt.run('odisp');},
    *out(name,lines){events.push(name);f.m.write(11503n,BigInt(lines));prepare([labels[name],11503n]);yield*f.rt.run('out');},
    *status(n){events.push('status');f.m.write(f.stoken,BigInt(n));yield*f.run();},
  }; // Compiled local/call/literal/assignment/arithmetic/LOGICAL policies and monitor/CPU operations are explicit fixtures.
  const base=(index:number,v=12n,h=35n,strength=1n,team=1)=>{f.high.write('base',v,index,1,team);f.high.write('base',h,index,2,team);f.high.write('base',strength,index,3,team);};
  const planet=(index:number,v:number,h:number,owner=1)=>{f.high.write('locpln',BigInt(v),index,1);f.high.write('locpln',BigInt(h),index,2);board.setdsp(v,h,(K.DXNPLN+owner)*100);};
  return {...f,board,locals,statusLocals:f.locals,labels,statusWord,io,events,clock,clockIO,ldisCPU,prepare,base,planet,dock:()=>dockStatements(f.high,f.low,locals,statusWord,io)};
}
test('DOCK dispatch composes raw clocks, LDIS, EQUAL, STATUS and normal turn accounting',()=>{
  const f=fixture();f.base(1);f.parse('DOCK STATUS T E');f.high.write('shpdam',500n,1,1);f.high.write('numply',2n);
  const h=highState(f.high,{logical:w=>w<0n,trueWord:-1n,falseWord:0n}),ctx={who:1,player:-1n,get ptime(){return f.low.read('ptime');},set ptime(v){f.low.write('ptime',v);},shared:{players:h.players}};
  const repairLocals={v:12600n,l:12601n,repsiz:12602n,ntoken:12603n,maxd:12604n,i:12605n},il=12606n,rs={all:12608n,damage:12612n};f.h.put(rs.all,'ALL');f.h.put(rs.damage,'DAMAGE');
  const ri:RepairServices<string>={logical:f.io.logical,*and(l,r){return l()&&r();},assign:f.io.assign,equal:f.io.equal,etim:f.io.etim,*damage(){assert.fail();},
    *integer(op,l,r){if(op==='div')return divide36(yield*l(),yield*r()).quotient;return yield*f.io.integer(op,l,r);}};
  done(dispatchCommand(ctx,5,{*invoke(call){assert.equal(call.routine,'dock');return yield*f.dock();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},movementContinuation(){assert.fail();},
    *finishTurn(auto){f.events.push('turn');yield*turnStatements(f.high,f.low,auto,{i:12900n,d1:12901n,d2:12902n},{logical:f.io.logical,integer:f.io.integer,assign:f.io.assign,*debugLine(){assert.fail();},*out(){assert.fail();},*odec(){assert.fail();},*repair(mode){f.events.push('repair');f.m.write(il,BigInt(mode));yield*repairStatements(f.high,f.low,il,repairLocals,rs,ri);},*baspha(){assert.fail();},*plnatk(){assert.fail();},*basbld(){assert.fail();},*romdrv(){assert.fail();}});}}));
  assert.equal(f.text(),M.dockin.text+'\r\n\r\nT10 E5000 \r\n');assert.equal(ctx.ptime,2000n);assert.equal(f.high.read('shpdam',1,1),200n);assert.equal(f.high.read('shpcon',1,K.KNTURN),18n);assert.equal(f.high.read('dotime'),1n);assert.equal(f.high.read('tmturn',1),1n);
  assert.deepEqual(f.events.filter(e=>['clock','dockin','equal','status','turn','repair'].includes(e)),['clock','dockin','equal','status','clock','turn','repair','equal']);assert.equal(f.r.s,f.s.initialStackWord);
});
test('DOCK accumulates all live adjacent bases and friendly planets in physical order',()=>{
  const f=fixture();f.base(1);f.base(2,13n,34n);f.base(3,12n,34n,0n);f.base(4,40n,40n);f.planet(1,12,33);f.planet(2,13,35);f.planet(3,11,34,2);f.high.write('numcap',2n,1);f.high.write('nplnet',3n);
  for(const [c,v] of [[K.KNTORP,0n],[K.KSNRGY,0n],[K.KSSHPC,0n],[K.KSDAM,10000n]] as const)f.high.write('shpcon',v,1,c);
  done(f.dock());assert.equal(f.m.read(f.locals.ifract),6n);assert.equal(f.high.read('shpcon',1,K.KNTORP),10n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),30000n);assert.equal(f.high.read('shpcon',1,K.KSSHPC),600n);assert.equal(f.high.read('shpcon',1,K.KSDAM),7000n);assert.equal(f.events.filter(e=>e.startsWith('dispc:')).length,3);assert.equal(f.events.filter(e=>e.startsWith('ldis:')).length,5);
});
test('DOCK already-docked hull repair occurs twice, resets life support and condition, and does not lower shields',()=>{
  const f=fixture();f.base(1);f.high.write('docked',-1n,1);f.high.write('shpcon',2500n,1,K.KSDAM);f.high.write('shpcon',-7n,1,K.KLFSUP);f.high.write('shpcon',3n,1,K.KSPCON);f.high.write('shpcon',-1n,1,K.KSHCON);done(f.dock());
  assert.equal(f.high.read('shpcon',1,K.KSDAM),500n);assert.equal(f.high.read('shpcon',1,K.KLFSUP),5n);assert.equal(f.high.read('shpcon',1,K.KSPCON),BigInt(K.GREEN));assert.equal(f.high.read('shpcon',1,K.KSHCON),-1n);
});
test('DOCK no-adjacency branch prints object plus original leading space and leaves PTIME intact',()=>{
  const f=fixture();const result=done(f.dock());assert.deepEqual(result,{alternateReturn:true});assert.equal(f.text(),'\r\n. '+M.dock01.text+'\r\n');assert.equal(f.low.read('ptime'),77n);assert.equal(f.events.filter(e=>e==='clock').length,1);assert.equal(f.high.read('docked',1),0n);
});
test('DOCK dispatch alternate return bypasses automatic repair and turn accounting',()=>{
  const f=fixture(),ctx={who:1,player:-1n,ptime:77n,shared:{players:[{alive:0n},{alive:-1n}]}};
  done(dispatchCommand(ctx,5,{*invoke(){return yield*f.dock();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},*finishTurn(){assert.fail();},movementContinuation(){assert.fail();}}));assert.equal(ctx.ptime,77n);
});
test('DOCK dead ship with an adjacent supplier returns silently after scans',()=>{
  const f=fixture();f.base(1);f.high.write('alive',0n,1);assert.deepEqual(done(f.dock()),{alternateReturn:true});assert.equal(f.text(),'');assert.equal(f.low.read('ptime'),77n);assert.equal(f.events.filter(e=>e==='clock').length,1);
});
test('DOCK tests ALIVE after distance checking, not before the scans',()=>{
  const f=fixture();f.base(1);f.high.write('alive',0n,1);const ldis=f.io.ldis;f.io.ldis=function*(...a){const n=yield*ldis(...a);f.high.write('alive',-1n,1);return n;};assert.equal(done(f.dock()).alternateReturn,false);
});
test('DOCK reads future base slots and current TEAM after each LDIS call',()=>{
  const f=fixture();f.base(1);f.base(2,12n,34n,1n,2);const ldis=f.io.ldis;f.io.ldis=function*(...a){const n=yield*ldis(...a);f.low.write('team',2n);return n;};done(f.dock());assert.equal(f.m.read(f.locals.ifract),4n);assert.equal(f.events.filter(e=>e.startsWith('ldis:')).length,2);
});
test('DOCK NUMCAP gate skips planets regardless of NPLNET, retaining unused I',()=>{
  const f=fixture();f.base(1);f.planet(1,12,33);f.high.write('nplnet',1n);f.m.write(f.locals.i,99n);done(f.dock());assert.equal(f.m.read(f.locals.ifract),2n);assert.equal(f.m.read(f.locals.i),99n);assert.ok(!f.events.some(e=>e.startsWith('dispc:')));
});
test('DOCK NPLNET is a DO bound evaluated before the first DISPC call',()=>{
  const f=fixture();f.planet(1,12,33);f.planet(2,13,35);f.high.write('numcap',2n,1);f.high.write('nplnet',1n);const dispc=f.io.dispc;f.io.dispc=function*(v,h){const n=yield*dispc(v,h);f.high.write('nplnet',2n);return n;};done(f.dock());assert.equal(f.m.read(f.locals.ifract),1n);assert.equal(f.m.read(f.locals.i),2n);
});
test('DOCK planet comparison requires compiler operand order across DISPC suspension',()=>{
  const f=fixture();f.planet(1,12,33,2);f.high.write('numcap',1n,1);f.high.write('nplnet',1n);const dispc=f.io.dispc;f.io.dispc=function*(v,h){const n=yield*dispc(v,h);f.low.write('team',2n);return n;};
  assert.equal(done(f.dock()).alternateReturn,true); // Fixture reads TEAM+DXNPLN first.
  f.low.write('team',1n);f.clock.push(11000n,12000n);f.io.different=function*(l,r){const right=yield*r();return(yield*l())!==right;};assert.equal(done(f.dock()).alternateReturn,false);
});
test('DOCK no-adjacency output selects WHO and coordinates after CRLF resumes',()=>{
  const f=fixture();f.high.write('shpcon',22n,2,K.KVPOS);f.high.write('shpcon',44n,2,K.KHPOS);f.board.setdsp(22,44,101);const crlf=f.io.crlf;f.io.crlf=function*(){yield*crlf();f.low.write('who',2n);};done(f.dock());assert.equal(f.text(),'\r\nL '+M.dock01.text+'\r\n');
});
test('DOCK STATUS switch is read after DOCKED output, and late report time may leave negative PTIME',()=>{
  const f=fixture();f.base(1);const out=f.io.out;f.io.out=function*(name,n){yield*out(name,n);if(name==='dockin'){f.token(2,'STATU');f.token(3,'T');f.clock[0]=16000n;}};const result=done(f.dock());assert.deepEqual(result,{alternateReturn:false,pause:-2000n});assert.equal(f.low.read('ptime'),-2000n);assert.ok(f.text().includes('T10 '));
});
test('DOCK final elapsed call occurs after actual STATUS output suspension',()=>{
  const f=fixture();f.base(1);f.parse('DOCK STATUS T');f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'byte';};const g=f.dock();
  while(!f.text().endsWith('T10')){const n=g.next();assert.equal(n.done,false);assert.equal(n.value,'byte');}
  assert.equal(f.clock.length,1);assert.equal(f.low.read('ptime'),77n);f.clock[0]=17000n;assert.deepEqual(done(g),{alternateReturn:false,pause:-3000n});assert.equal(f.r.s,f.s.initialStackWord);
});
test('DOCK deadline expression preserves late SLWEST reads under an elapsed-first compiler fixture',()=>{
  const f=fixture();f.base(1);const clock=f.clockIO.mstime;let first=true;f.clockIO.mstime=function*(){yield*clock();if(first){first=false;f.high.write('slwest',4n);}};done(f.dock());assert.equal(f.m.read(f.locals.v),15000n);assert.equal(f.low.read('ptime'),4000n);
});
test('DOCK final subtraction can read V before ETIM or after it under explicit policies',()=>{
  const f=fixture();f.base(1);const clock=f.clockIO.mstime;let n=0;f.clockIO.mstime=function*(){yield*clock();if(++n===2)f.m.write(f.locals.v,20000n);};done(f.dock());assert.equal(f.low.read('ptime'),2000n);
  f.clock.push(11000n,12000n);n=0;const integer=f.io.integer;f.io.integer=function*(op,l,r){if(op==='sub'){const right=yield*r();return add36(yield*l(),-right);}return yield*integer(op,l,r);};done(f.dock());assert.equal(f.low.read('ptime'),9000n);
});
test('DOCK assignment policy controls the destination when WHO changes during a resource expression',()=>{
  const f=fixture();f.base(1);f.high.write('shpcon',0n,1,K.KNTORP);const integer=f.io.integer;let changed=false;f.io.integer=function*(op,l,r){const n=yield*integer(op,l,r);if(op==='min'&&!changed){changed=true;f.low.write('who',2n);}return n;};done(f.dock());assert.equal(f.high.read('shpcon',1,K.KNTORP),0n);assert.equal(f.high.read('shpcon',2,K.KNTORP),10n);
});
test('DOCK also accepts an explicit destination-first compiler assignment policy',()=>{
  const f=fixture();f.base(1);f.high.write('shpcon',0n,1,K.KNTORP);f.io.assign=function*(d,v){const address=d();f.m.write(address,yield*v());};const integer=f.io.integer;let changed=false;f.io.integer=function*(op,l,r){const n=yield*integer(op,l,r);if(op==='min'&&!changed){changed=true;f.low.write('who',2n);}return n;};done(f.dock());assert.equal(f.high.read('shpcon',1,K.KNTORP),10n);assert.equal(f.high.read('shpcon',2,K.KNTORP),0n);
});
test('DOCK stores the supplied LOGICAL true word and uses its policy for ALIVE',()=>{
  const f=fixture();f.base(1);f.high.write('alive',1n,1);assert.equal(done(f.dock()).alternateReturn,true);f.clock.push(11000n,12000n);f.io.logical=w=>w!==0n;f.io.trueWord=1n;assert.equal(done(f.dock()).alternateReturn,false);assert.equal(f.high.read('docked',1),1n);
});
test('DOCK empty planet bounds can perform one iteration only under the explicit compiler policy',()=>{
  const f=fixture();f.planet(1,12,33);f.high.write('numcap',1n,1);assert.equal(done(f.dock()).alternateReturn,true);f.clock.push(11000n,12000n);f.io.enterPlanets=()=>true;assert.equal(done(f.dock()).alternateReturn,false);assert.equal(f.m.read(f.locals.ifract),1n);
});
for(const [v,h,n,result] of [[1n,1n,1n,-1n],[1n,2n,1n,0n],[0n,262144n,1n,0n],[0n,0n,-1n,0n]] as const)test(`raw LDIS full-word comparison ${v}/${h} within ${n}`,()=>{
  const f=fixture();[v,h,0n,n].forEach((w,i)=>f.m.write(11600n+BigInt(i),w));f.prepare([11600n,11601n,11602n,11602n,11603n]);done(rawLdis(f.r,f.rt.args,f.ldisCPU));assert.equal(f.r.f,result);
});
test('raw LDIS vertical failure avoids horizontal memory reads',()=>{
  const f=fixture();f.m.write(11600n,2n);f.m.write(11601n,0n);f.m.write(11602n,1n);f.prepare([11600n,40000n,11601n,40001n,11602n]);done(rawLdis(f.r,f.rt.args,f.ldisCPU));assert.equal(f.r.f,0n);
});
test('raw LDIS rereads the range after horizontal magnitude',()=>{
  const f=fixture();[0n,1n,0n].forEach((w,i)=>f.m.write(11600n+BigInt(i),w));f.prepare([11600n,11601n,11600n,11600n,11602n]);const movm=f.ldisCPU.movmT1;let n=0;
  f.ldisCPU.movmT1=function*(){yield*movm();if(++n===2)yield 'horizontal';};const g=rawLdis(f.r,f.rt.args,f.ldisCPU);assert.equal(g.next().value,'horizontal');f.m.write(11602n,1n);done(g);assert.equal(f.r.f,-1n);
});
test('raw LDIS range arguments may alias the current magnitude accumulator',()=>{
  const f=fixture();[40n,90n,0n].forEach((w,i)=>f.m.write(11600n+BigInt(i),w));f.prepare([11600n,11601n,11602n,11602n,1n]);done(rawLdis(f.r,f.rt.args,f.ldisCPU));assert.equal(f.r.f,-1n);assert.equal(f.r.t1,90n);
});
test('raw LDIS resolves the current argument block after a suspended vertical operation',()=>{
  const f=fixture();[0n,9n,1n].forEach((w,i)=>f.m.write(11600n+BigInt(i),w));f.prepare([11600n,11601n,11600n,11600n,11602n]);
  loadArgumentBlock(f.m,10720n,[11600n,11600n,11600n,11600n,11602n]);const movm=f.ldisCPU.movmT1;let first=true;
  f.ldisCPU.movmT1=function*(){yield*movm();if(first){first=false;yield 'vertical';}};const g=rawLdis(f.r,f.rt.args,f.ldisCPU);assert.equal(g.next().value,'vertical');selectArgumentBlock(f.r,10720n);done(g);assert.equal(f.r.f,-1n);assert.equal(f.r.t1,0n);
});
