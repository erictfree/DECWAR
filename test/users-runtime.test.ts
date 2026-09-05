import test from 'node:test';
import assert from 'node:assert/strict';
import { usersStatements } from '../src/game/users.ts';
import type { UsersStatementServices } from '../src/game/users.ts';
import { prlocStatements } from '../src/game/prloc-statements.ts';
import type { PrlocServices } from '../src/game/prloc-statements.ts';
import { rawPdist } from '../src/compat/pdist.ts';
import { CommonBlock } from '../src/compat/memory.ts';
import { commonLayout } from '../src/generated/common-layout.ts';
import { constants as K,messages as M,outputTables as T } from '../src/generated/source-data.ts';
import { add36,halfWords,packSixbit,MIN_INTEGER } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { outputRuntimeFixture } from './fixtures/output-runtime.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const f=outputRuntimeFixture();for(const l of [commonLayout.lowseg,commonLayout.hiseg])f.m.map(BigInt(l.address),Array<bigint>(l.words).fill(0n));f.m.map(10000n,Array<bigint>(4000).fill(0n));
  const high=new CommonBlock(f.m,'hiseg'),low=new CommonBlock(f.m,'lowseg');for(const key of ['who','hcpos','blank','hungup','oflg'] as const)Object.defineProperty(f.state,key,{get:()=>low.read(key),set:(v:bigint)=>low.write(key,v)});
  low.write('who',1n);low.write('oflg',BigInt(K.SHORT));low.write('ocflg',BigInt(K.KABS));high.write('alive',-1n,1);
  T.lngshp.forEach((name,i)=>{const a=12000n+BigInt(i*4);f.m.write(f.s.status.lngshp+BigInt(i),a);f.h.put(a,name.text);});
  const fields={name1:K.KNAM1,name2:K.KNAM2,speed:K.KTTYSP,ppn:K.KPPN,tty:K.KTTYN,job:K.KJOB};
  const values={name1:packSixbit('ERIC  '),name2:packSixbit('TEST  '),speed:1200n,ppn:halfWords(1n,0o27n),tty:packSixbit('TTY12 '),job:7n};
  for(const key of Object.keys(fields) as (keyof typeof fields)[]){f.s.status.player[key]=high.address('job',1,fields[key]);for(let p=1;p<=K.KNPLAY;p++)high.write('job',values[key],p,fields[key]);}
  high.write('shpcon',12n,1,K.KVPOS);high.write('shpcon',34n,1,K.KHPOS);
  const labels={users1:10000n,users2:10100n,users5:10200n};for(const name of Object.keys(labels) as (keyof typeof labels)[])f.h.put(labels[name],M[name].text);
  const locals={i:11000n,num:11001n},a={v:11010n,h:11011n,prcflg:11012n,w:11013n,prlflg:11014n,proflg:11015n,tw:11016n};
  f.m.write(a.v,14n);f.m.write(a.h,36n);f.m.write(a.w,2n);f.m.write(a.prlflg,BigInt(K.KABS));f.m.write(a.proflg,BigInt(K.SHORT));
  const events:string[]=[];
  const prepare=(words:bigint[],header=10600n)=>{loadArgumentBlock(f.m,header,words);selectArgumentBlock(f.r,header);};
  const distanceCPU={*sub(reg:'f'|'t1',word:bigint):Generator<string,void,void>{f.r[reg]=add36(f.r[reg],-word);},*movm(reg:'f'|'t1'):Generator<string,void,void>{assert.notEqual(f.r[reg],MIN_INTEGER);if(f.r[reg]<0n)f.r[reg]=-f.r[reg];}};
  const pi:PrlocServices<string>={
    *outc(c){events.push(c);f.h.put(11100n,c);prepare([11100n]);yield*f.rt.run('outc');},
    *space(){yield*f.rt.run('space');},*crlf(){yield*f.rt.run('crlf');},
    *odec(v,w){prepare([v,w]);yield*f.rt.run('odec');},
    *osdec(v,w){f.m.write(11101n,v);prepare([11101n,w]);yield*f.rt.run('osdec');},
    *pdist(v,h,ov,oh){events.push('pdist');prepare([v,h,ov,oh],10620n);yield*rawPdist(f.r,f.rt.args,distanceCPU);return f.r.f;},
    *difference(v,o){return add36(f.m.read(v),-f.m.read(o));},
    *omitRelative(distance,width){return(yield*distance())===0n&&width()===0n;}, // Explicit eager-distance compiler fixture.
  };
  const ui:UsersStatementServices<string>={logical:w=>w<0n,
    *out(name,lines){events.push(name);f.m.write(11102n,BigInt(lines));prepare([labels[name],11102n]);yield*f.rt.run('out');},
    *crlf(){yield*f.rt.run('crlf');},*spaces(n){f.m.write(11103n,n);prepare([11103n]);yield*f.rt.run('spaces');},
    *stat(count,player){events.push(`stat:${player}`);f.m.write(11104n,player);prepare([count,11104n]);yield*f.rt.run('stat');},
    *prloc(v,h,mode){f.m.write(a.prcflg,0n);f.m.write(a.w,2n);f.m.write(a.proflg,BigInt(K.SHORT));yield*prlocStatements(f.m,high,low,{...a,v,h,prlflg:mode},pi);},
  }; // Call blocks, locals, arithmetic and .AND./LOGICAL behavior are explicit compiler fixtures.
  return {...f,high,low,locals,a,events,prepare,distanceCPU,pi,ui,users:()=>usersStatements(high,low,locals,ui),prloc:()=>prlocStatements(f.m,high,low,a,pi)};
}
const row='Lexington  ERIC  TEST   1200       1,27    TTY12     7';
test('USERS dispatch composes source memory, STAT and shared output for all six fields',()=>{
  const f=fixture(),ctx={who:1,player:-1n,ptime:55n,shared:{players:[{alive:0n},{alive:-1n}]}};
  done(dispatchCommand(ctx,31,{*invoke(call){assert.equal(call.routine,'users');yield*f.users();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},*finishTurn(){assert.fail();},movementContinuation(){assert.fail();}}));
  assert.equal(f.text(),'\r\n'+row+'\r\n'+M.users5.text+'\r\n');assert.equal(f.m.read(f.locals.i),11n);assert.equal(f.m.read(f.locals.num),6n);assert.equal(ctx.ptime,55n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('USERS LONG header checks PASFLG after the first header output',()=>{
  const f=fixture();f.low.write('oflg',BigInt(K.LONG));const out=f.ui.out;f.ui.out=function*(name,lines){yield*out(name,lines);if(name==='users1')f.low.write('pasflg',-1n);};
  done(f.users());assert.ok(f.text().includes(M.users1.text+M.users2.text));assert.ok(f.text().includes(row+'   12-34'));
});
test('USERS divider precedes the alive read and can make its slot visible',()=>{
  const f=fixture();f.high.write('alive',0n,1);const out=f.ui.out;f.ui.out=function*(name,lines){yield*out(name,lines);if(name==='users5')f.high.write('alive',-1n,6);};
  done(f.users());assert.deepEqual(f.events.filter(e=>e.startsWith('stat:')),['stat:6']);assert.ok(f.text().indexOf(M.users5.text)<f.text().indexOf('Cobra'));
});
test('USERS rereads PASFLG after STAT and coordinates after the three spaces',()=>{
  const f=fixture(),stat=f.ui.stat,spaces=f.ui.spaces;f.ui.stat=function*(c,p){yield*stat(c,p);f.low.write('pasflg',-1n);};
  f.ui.spaces=function*(n){yield*spaces(n);f.high.write('shpcon',55n,1,K.KVPOS);f.high.write('shpcon',66n,1,K.KHPOS);};
  done(f.users());assert.ok(f.text().includes(row+'   55-66'));
});
test('USERS NUM is passed by reference while I+0 has its own caller temporary',()=>{
  const f=fixture(),stat=f.ui.stat;f.ui.stat=function*(count,p){f.m.write(count,1n);yield*stat(count,p);f.m.write(11104n,99n);};
  done(f.users());assert.equal(f.text(),'\r\nLexington \r\n'+M.users5.text+'\r\n');assert.equal(f.m.read(f.locals.i),11n);
});
test('USERS accepts an explicit compiler logical policy rather than coercing words',()=>{
  const f=fixture();f.high.write('alive',1n,1);done(f.users());assert.ok(!f.text().includes('Lexington'));
  f.emitted.length=0;f.ui.logical=w=>w!==0n;done(f.users());assert.ok(f.text().includes('Lexington'));
});
test('USERS initial newline can suspend before its format test or loop initialization',()=>{
  const f=fixture();f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'output';};const g=f.users();assert.equal(g.next().value,'output');assert.equal(f.m.read(f.locals.i),0n);
  f.low.write('oflg',BigInt(K.LONG));done(g);assert.ok(f.text().startsWith('\r\n'+M.users1.text));assert.equal(f.m.read(f.locals.i),11n);
});
for(const [mode,width,expected] of [[K.KABS,2n,'14-36'],[K.KREL,2n,' +2, +2'],[K.KBOTH,2n,'14-36  +2, +2']] as const)
test(`PRLOC mode ${mode} width ${width} composes decimal/signed output and PDIST`,()=>{
  const f=fixture();f.m.write(f.a.prlflg,BigInt(mode));f.m.write(f.a.w,width);done(f.prloc());assert.equal(f.text(),expected);assert.equal(f.r.s,f.s.initialStackWord);
});
test('PRLOC suppresses free relative output at own location without changing TW',()=>{
  const f=fixture();f.m.write(f.a.v,12n);f.m.write(f.a.h,34n);f.m.write(f.a.w,0n);f.m.write(f.a.prlflg,BigInt(K.KREL));f.m.write(f.a.tw,77n);done(f.prloc());assert.equal(f.text(),'');assert.equal(f.m.read(f.a.tw),77n);
});
test('PRLOC suppression uses actual PDIST masking rather than coordinate equality',()=>{
  const f=fixture();f.m.write(f.a.v,12n);f.m.write(f.a.h,262144n);f.high.write('shpcon',0n,1,K.KHPOS);f.m.write(f.a.w,0n);f.m.write(f.a.prlflg,BigInt(K.KREL));
  done(f.prloc());assert.equal(f.text(),'');assert.ok(f.events.includes('pdist'));
});
test('PRLOC reads horizontal coordinate after vertical output and separator',()=>{
  const f=fixture(),outc=f.pi.outc;f.pi.outc=function*(c){yield*outc(c);if(c==='-')f.m.write(f.a.h,50n);};done(f.prloc());assert.equal(f.text(),'14-50');
});
test('PRLOC reevaluates WHO for the horizontal relative subtraction after comma output',()=>{
  const f=fixture();f.m.write(f.a.prlflg,BigInt(K.KREL));f.high.write('shpcon',30n,2,K.KHPOS);const outc=f.pi.outc;
  f.pi.outc=function*(c){yield*outc(c);if(c===',')f.low.write('who',2n);};done(f.prloc());assert.equal(f.text(),' +2, +6');
});
test('PRLOC reads newline flag after the coordinate output',()=>{
  const f=fixture(),odec=f.pi.odec;f.pi.odec=function*(v,w){yield*odec(v,w);f.m.write(f.a.prcflg,1n);};done(f.prloc());assert.equal(f.text(),'14-36\r\n');
});
test('PRLOC retains width/TW aliasing and exposes TW changes during relative output',()=>{
  const f=fixture();f.a.tw=f.a.w;f.m.write(f.a.prlflg,BigInt(K.KREL));const osdec=f.pi.osdec;let first=true;
  f.pi.osdec=function*(v,w){yield*osdec(v,w);if(first){first=false;f.m.write(w,4n);}};done(f.prloc());assert.equal(f.text(),' +2,  +2');assert.equal(f.m.read(f.a.w),4n);
});
test('PRLOC .AND. policy can skip PDIST for nonzero width, or retain its fault',()=>{
  const f=fixture();f.m.write(f.a.prlflg,BigInt(K.KREL));f.pi.pdist=function*(){throw new Error('PDIST fault');};
  assert.throws(()=>done(f.prloc()),/PDIST fault/);f.pi.omitRelative=function*(d,w){return w()===0n&&(yield*d())===0n;};done(f.prloc());assert.equal(f.text(),' +2, +2');
});
test('PRLOC WHO zero reads adjacent SHPCON words without adding a pre-game guard',()=>{
  const f=fixture();f.low.write('who',0n);f.high.write('shpcon',10n,0,K.KVPOS);f.high.write('shpcon',30n,0,K.KHPOS);f.m.write(f.a.prlflg,BigInt(K.KREL));done(f.prloc());assert.equal(f.text(),' +4, +6');
});
for(const [vertical,horizontal,expected] of [[3n,7n,7n],[300000n,400000n,300000n],[0n,262144n,0n]] as const)
test(`raw PDIST keeps halfword comparison for distances ${vertical}/${horizontal}`,()=>{
  const f=fixture();f.m.write(11200n,vertical);f.m.write(11201n,horizontal);f.m.write(11202n,0n);f.prepare([11200n,11201n,11202n,11202n]);
  done(rawPdist(f.r,f.rt.args,f.distanceCPU));assert.equal(f.r.f,expected);assert.equal(f.r.t1,horizontal);
});
test('raw PDIST reads horizontal arguments only after vertical magnitude completes',()=>{
  const f=fixture();f.m.write(11200n,1n);f.m.write(11201n,2n);f.m.write(11202n,0n);f.prepare([11200n,11201n,11202n,11202n]);const movm=f.distanceCPU.movm;
  f.distanceCPU.movm=function*(reg){yield*movm(reg);if(reg==='f')yield 'magnitude';};const g=rawPdist(f.r,f.rt.args,f.distanceCPU);assert.equal(g.next().value,'magnitude');f.m.write(11201n,9n);done(g);assert.equal(f.r.f,9n);
});
