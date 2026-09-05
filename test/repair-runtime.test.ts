import test from 'node:test';
import assert from 'node:assert/strict';
import { repairStatements } from '../src/game/repair-statements.ts';
import { multiply36,MAX_INTEGER,add36 } from '../src/compat/word36.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { turnStatements } from '../src/game/turn-statements.ts';
import { highState } from '../src/game/common-state.ts';
import { repairRuntimeFixture as fixture } from './fixtures/repair-runtime.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
test('REPAIR dispatch composes DAMAGE output, final clock, resumable automatic repair and turn accounting',()=>{
  const f=fixture();f.parse('REPAIR 50 DAMAGE SH');const h=highState(f.high,{logical:w=>w<0n,trueWord:-1n,falseWord:0n});
  const ctx={who:1,player:-1n,get ptime(){return f.low.read('ptime');},set ptime(v){f.low.write('ptime',v);},shared:{players:h.players}};
  f.high.write('numply',2n);f.low.write('team',1n);
  done(dispatchCommand(ctx,18,{*invoke(call){assert.equal(call.argument,1);f.m.write(f.il,BigInt(call.argument));return yield*f.repair();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},movementContinuation(){assert.fail();},
    *finishTurn(auto){f.events.push('turn');yield*turnStatements(f.high,f.low,auto,{i:12900n,d1:12901n,d2:12902n},{logical:f.io.logical,integer:f.io.integer,assign:f.io.assign,*debugLine(){assert.fail();},*out(){assert.fail();},*odec(){assert.fail();},*repair(mode){f.events.push('auto');f.m.write(f.il,BigInt(mode));yield*f.repair();},*baspha(){assert.fail();},*plnatk(){assert.fail();},*basbld(){assert.fail();},*romdrv(){assert.fail();}});}}));
  assert.equal(f.text(),'\r\nSH   250\r\n');assert.equal(ctx.ptime,3000n);assert.equal(f.high.read('shpdam',1,1),2200n);assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.high.read('dotime'),1n);assert.equal(f.high.read('tmturn',1),1n);
  assert.deepEqual(f.events,['all','clock','damage?','damage:4','clock','turn','auto','all']);assert.equal(f.r.s,f.s.initialStackWord);
});
for(const [format,expected] of [[-1,'\r\nSH   250\r\n'],[0,'\r\nShields   250.0\r\n'],[1,'\r\nDeflector Shields  250.0 units\r\n']] as const)test(`REPAIR to selected DAMAGE preserves output format ${format}`,()=>{
  const f=fixture(format);f.parse('REPAIR 50 DAMAGE SH');assert.deepEqual(done(f.repair()),{alternateReturn:false,pause:3000n});assert.equal(f.text(),expected);assert.equal(f.m.read(f.locals.ntoken),3n);
});
for(const [mode,docked,size,pause] of [[1,0n,500n,3000n],[1,-1n,1000n,3000n],[2,0n,1000n,3000n],[3,-1n,300n,undefined]] as const)test(`REPAIR mode ${mode} docked ${docked} retains source rate ${size}`,()=>{
  const f=fixture();f.m.write(f.il,BigInt(mode));f.high.write('docked',docked,1);const result=done(f.repair());assert.equal(f.m.read(f.locals.repsiz),size);assert.equal(f.high.read('shpdam',1,1),3000n-size);assert.equal(result.pause,pause);assert.equal(f.low.read('ptime'),pause??77n);
});
test('REPAIR automatic mode ignores numeric size but still honors token-two ALL',()=>{
  const f=fixture();f.m.write(f.il,3n);f.parse('REPAIR 999 DAMAGE');done(f.repair());assert.equal(f.m.read(f.locals.repsiz),300n);assert.equal(f.high.read('shpdam',1,1),2700n);assert.deepEqual(f.events,['all']);
  f.parse('REPAIR ALL DAMAGE');f.events.length=0;done(f.repair());assert.equal(f.high.read('shpdam',1,1),0n);assert.equal(f.m.read(f.locals.repsiz),2700n);assert.deepEqual(f.events,['all']);assert.equal(f.low.read('ptime'),77n);assert.equal(f.text(),'');
});
test('REPAIR ALL comparison has no token-type guard and runs after the maximum scan',()=>{
  const f=fixture();f.token(2,'ALL',K.KINT);f.low.write('vallst',1n,2);done(f.repair());assert.equal(f.m.read(f.locals.maxd),3000n);assert.equal(f.m.read(f.locals.repsiz),3000n);assert.equal(f.high.read('shpdam',1,1),0n);assert.equal(f.low.read('ptime'),23000n);
});
test('REPAIR no positive damage skips ALL, initial ETIM and device writes but can still report DAMAGE',()=>{
  const f=fixture();f.high.write('shpdam',-10n,1,1);f.parse('REPAIR DAMAGE SH');const result=done(f.repair());assert.deepEqual(f.events,['damage?','damage:3','clock']);assert.equal(f.high.read('shpdam',1,1),-10n);assert.equal(f.text(),'\r\n'+M.alldok.text+'\r\n');assert.deepEqual(result,{alternateReturn:true,pause:-10000n});
});
test('REPAIR empty automatic pass leaves PTIME and saved REPSIZ initialization semantics intact',()=>{
  const f=fixture();f.high.write('shpdam',0n,1,1);f.m.write(f.il,3n);done(f.repair());assert.equal(f.m.read(f.locals.repsiz),300n);assert.equal(f.m.read(f.locals.i),10n);assert.deepEqual(f.events,[]);assert.equal(f.low.read('ptime'),77n);
});
test('REPAIR unknown mode retains prior REPSIZ rather than selecting an invented default',()=>{
  const f=fixture();f.m.write(f.il,4n);f.m.write(f.locals.repsiz,111n);done(f.repair());assert.equal(f.m.read(f.locals.repsiz),111n);assert.equal(f.high.read('shpdam',1,1),2889n);assert.equal(f.low.read('ptime'),-778n);
});
test('REPAIR writes V before reading IL, retaining argument/local aliases',()=>{
  const f=fixture();f.high.write('shpdam',0n,1,1);f.m.write(f.locals.v,3n);f.m.write(f.locals.repsiz,91n);done(repairStatements(f.high,f.low,f.locals.v,f.locals,f.symbols,f.io));assert.equal(f.m.read(f.locals.l),0n);assert.equal(f.m.read(f.locals.repsiz),91n);assert.equal(f.events.filter(e=>e==='clock').length,1);
});
test('REPAIR numeric negative size increases even previously undamaged devices and returns alternate',()=>{
  const f=fixture();f.parse('REPAIR -2');const result=done(f.repair());assert.equal(f.m.read(f.locals.repsiz),-20n);assert.equal(f.high.read('shpdam',1,1),3020n);assert.equal(f.high.read('shpdam',1,9),20n);assert.deepEqual(result,{alternateReturn:true,pause:-1160n});
});
test('REPAIR device updates use MAX0 to clamp every device after the same selected amount',()=>{
  const f=fixture();f.high.write('shpdam',250n,1,2);f.high.write('shpdam',-10n,1,3);done(f.repair());assert.equal(f.high.read('shpdam',1,1),2500n);assert.equal(f.high.read('shpdam',1,2),0n);assert.equal(f.high.read('shpdam',1,3),0n);
});
test('REPAIR maximum scan reads later slots after previous intrinsic/assignment calls',()=>{
  const f=fixture(),assign=f.io.assign;let n=0;f.io.assign=function*(d,v){yield*assign(d,v);if(d()===f.locals.maxd&&++n===1)f.high.write('shpdam',4000n,1,9);};done(f.repair());assert.equal(f.m.read(f.locals.maxd),4000n);assert.equal(f.high.read('shpdam',1,9),3500n);
});
test('REPAIR destination WHO is selected by the explicit assignment policy during device updates',()=>{
  const f=fixture(),assign=f.io.assign;const first=f.high.address('shpdam',1,1);let changed=false;
  f.io.assign=function*(d,v){if(d()===first&&!changed){const n=yield*v();changed=true;f.low.write('who',2n);f.m.write(d(),n);}else yield*assign(d,v);};done(f.repair());assert.equal(f.high.read('shpdam',1,1),3000n);assert.equal(f.high.read('shpdam',2,1),2500n);
});
test('REPAIR DAMAGE actual argument uses NTOKEN after EQUAL returns',()=>{
  const f=fixture();f.parse('REPAIR DAMAGE BAD SH');const equal=f.io.equal;f.io.equal=function*(t,s){const r=yield*equal(t,s);if(s===f.symbols.damage)f.m.write(f.locals.ntoken,3n);return r;};done(f.repair());assert.ok(f.events.includes('damage:4'));assert.equal(f.text(),'\r\nSH   250\r\n');
});
test('REPAIR waits for actual DAMAGE output before computing nonpositive pause',()=>{
  const f=fixture();f.parse('REPAIR DAMAGE SH');f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'byte';};const g=f.repair();while(!f.text().endsWith('250')){const n=g.next();assert.equal(n.done,false);assert.equal(n.value,'byte');}
  assert.equal(f.events.filter(e=>e==='clock').length,1);assert.equal(f.low.read('ptime'),77n);f.clock[0]=16000n;assert.deepEqual(done(g),{alternateReturn:true,pause:-1000n});assert.equal(f.r.s,f.s.initialStackWord);
});
test('REPAIR nonpositive remaining pause bypasses dispatch turn accounting after performing repairs',()=>{
  const f=fixture();f.clock[1]=15000n;const ctx={who:1,player:-1n,ptime:77n,shared:{players:[{alive:0n},{alive:-1n}]}};
  done(dispatchCommand(ctx,18,{*invoke(){return yield*f.repair();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},*finishTurn(){assert.fail();},movementContinuation(){assert.fail();}}));assert.equal(ctx.ptime,0n);assert.equal(f.high.read('shpdam',1,1),2500n);
});
test('REPAIR deadline uses current REPSIZ after ETIM under the explicit elapsed-first fixture',()=>{
  const f=fixture(),clock=f.clockIO.mstime;let first=true;f.clockIO.mstime=function*(){yield*clock();if(first){first=false;f.m.write(f.locals.repsiz,100n);}};done(f.repair());assert.equal(f.m.read(f.locals.v),10800n);assert.equal(f.high.read('shpdam',1,1),2900n);assert.equal(f.low.read('ptime'),-200n);
});
test('REPAIR final subtraction supports explicit ETIM-first evaluation with a changed V',()=>{
  const f=fixture(),integer=f.io.integer,clock=f.clockIO.mstime;let n=0;f.clockIO.mstime=function*(){yield*clock();if(++n===2)f.m.write(f.locals.v,20000n);};
  f.io.integer=function*(op,l,r){if(op==='sub'){const b=yield*r();return add36(yield*l(),-b);}return yield*integer(op,l,r);};done(f.repair());assert.equal(f.low.read('ptime'),9000n);
});
test('REPAIR integer product is wrapped before division under the explicit 36-bit fixture',()=>{
  const f=fixture();f.parse('REPAIR 1');f.low.write('vallst',MAX_INTEGER,2);done(f.repair());assert.equal(f.m.read(f.locals.repsiz),multiply36(MAX_INTEGER,10n));assert.equal(f.low.read('ptime'),-1080n);assert.equal(f.high.read('shpdam',1,1),3010n);
});
test('REPAIR division by zero remains a compiler fault before device updates',()=>{
  const f=fixture();f.m.write(f.il,0n);f.m.write(f.locals.repsiz,100n);assert.throws(()=>done(f.repair()),/zero/i);assert.equal(f.high.read('shpdam',1,1),3000n);assert.equal(f.low.read('ptime'),77n);
});
test('REPAIR compound LOGICAL policy may evaluate automatic mode before the DOCKED operand',()=>{
  const f=fixture();f.m.write(f.il,3n);f.io.and=function*(d,n){assert.equal(n(),false);return false;};f.io.logical=()=>{throw new Error('logical read');};f.high.write('shpdam',0n,1,1);assert.deepEqual(done(f.repair()),{alternateReturn:false});
});
test('REPAIR ALL and DAMAGE comparisons use required compiler LOGICAL interpretation',()=>{
  const f=fixture();f.io.equal=function*(){return 1n;};done(f.repair());assert.equal(f.high.read('shpdam',1,1),2500n);assert.ok(!f.events.some(e=>e.startsWith('damage:')));
});
