import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { FileBlock } from '../src/compat/files.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { constants as K,gripeText } from '../src/generated/source-data.ts';
import { rawGripe,eraseTextShip,restoreTextShip } from '../src/compat/gripe.ts';
import type { GripeServices } from '../src/compat/gripe.ts';
import { halfWords,packAscii,signed36 } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(lines=[{text:'hello',eof:true}]){
  const m=new AddressSpace();m.map(0o140n,Array<bigint>(128).fill(0n));m.map(0o400010n,Array<bigint>(2922).fill(0n));
  m.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));m.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));
  const low=new CommonBlock(m,'lowseg'),high=new CommonBlock(m,'hiseg'),input=new MemoryCommandInput(low,packAscii),file=new FileBlock(m);
  const state={get who(){return low.read('who');},set who(v){low.write('who',v);},get hungup(){return low.read('hungup');},set hungup(v){low.write('hungup',v);},
    get ccflg(){return low.read('ccflg');},set ccflg(v){low.write('ccflg',v);},get addrck(){return low.read('addrck');},set addrck(v){low.write('addrck',v);}};
  const r={x1:0n,x2:0n,t1:0n,t2:0n,t3:0n,t4:0n,p1:0n,f:0n,c:0n,arg:0n},job={jbff:40000n,jbrel:50000n};
  const s={grpfil:31000n,ttyfil:32000n,separator:33000n,linbuf:input.lineAddress,bufferAddressOffset:0n,bufferPointerOffset:1n,bufferCountOffset:2n,
    point7LeftHalf:0o440700n,fileBusyCode:23n,shpcon:high.address('shpcon',1,1),alive:high.address('alive',1),active:high.address('active',1),
    prompt:34000n,onlyTwo:34001n,tooMany:34002n,linePointer:halfWords(0o444400n,input.lineAddress),statisticsArgument:34003n};
  const events:string[]=[],displays:bigint[][]=[];let count=0;
  const sdsp=function*(){displays.push([r.t1,r.t2,r.t3]);};
  const io:GripeServices<string>={
    *afterAlertCheck(){events.push('alert-return');},*eshp(){events.push('eshp');yield*eraseTextShip(file,state,r,s,sdsp);},
    *osts(){events.push('header');},*diagnostic(){events.push('diagnostic');yield 'diagnostic';},*shosta(){events.push(`shosta:${r.arg}`);yield 'statistics';},
    *inli(){count++;events.push(`line:${count}`);yield 'line';const line=lines.shift();assert.ok(line,'Input fixture exhausted');
      [...line.text].forEach((c,i)=>input.block.write('linbuf',BigInt(c.charCodeAt(0)),i));input.block.write('linbuf',0n,line.text.length);r.f=line.eof?32n:0n;},
    *ostrx(){events.push(`copy:${r.p1}`);},*ostr(){events.push(`text:${r.p1}`);},*ocrl(){events.push('ocrl');},
    *open(){events.push('open');return true;},*hibernate(){assert.fail();},*halt(){assert.fail();},*core(){assert.fail();},*input(){assert.fail();},
    *output(){events.push('output');return false;},*useto(){},*close(){events.push('close');yield 'close';},*seto(){events.push(`seto:${r.x1}`);},
    *pshp(){events.push('pshp');yield*restoreTextShip(file,state,r,s,sdsp);},*outputTTY(){events.push('flush');},*outstr(text){events.push(text);},
  };
  return {m,low,high,input,file,state,r,job,s,events,displays,io,sdsp,count:()=>count,run:()=>rawGripe(file,state,job,r,s,io)};
}
function ship(f:ReturnType<typeof fixture>,who=1n){f.state.who=who;f.high.write('shpcon',10n,who,K.KVPOS);f.high.write('shpcon',20n,who,K.KHPOS);f.high.write('alive',-1n,who);f.high.write('active',9n,who);}
test('RED alert writes the direct original refusal even while hung up, before erasure or DBUF initialization',()=>{
  const f=fixture();ship(f);f.state.hungup=-1n;f.high.write('shpcon',BigInt(K.RED),1,K.KSPCON);f.file.write('dbuf',77n,0);
  done(f.run());assert.deepEqual(f.events,[gripeText[0].text]);assert.equal(f.file.read('dbuf',0),77n);assert.equal(f.r.t3,1n);assert.deepEqual(f.displays,[]);
});
test('non-RED nonzero WHO requires the literal continuation before any erasure',()=>{
  const f=fixture();ship(f);f.io.afterAlertCheck=function*(){throw new Error('Unresolved literal target');};
  assert.throws(()=>done(f.run()),/Unresolved literal/);assert.deepEqual(f.events,[]);assert.equal(f.file.read('dbuf',0),0n);
});
test('WHO zero bypasses alert lookup and literal continuation',()=>{
  const f=fixture();f.s.shpcon=60000n;done(f.run());assert.equal(f.events[0],'eshp');assert.ok(!f.events.includes('alert-return'));assert.equal(f.count(),1);
});
test('initialization reads JBFF only after ESHP returns',()=>{
  const f=fixture();f.io.eshp=function*(){yield 'erase';};const g=f.run();assert.equal(g.next().value,'erase');f.job.jbff=40100n;
  assert.equal(g.next().value,'line');assert.equal(f.file.read('dbuf',0),40100n);assert.equal(f.file.read('dbuf',1),signed36(halfWords(0o440700n,40100n)));done(g);
});
test('ADDRCK suppresses prompt output but P1 is still loaded before SETO; header can change the branch',()=>{
  const f=fixture([]);f.state.addrck=1n;const seto=f.io.seto;f.io.seto=function*(){if(f.events.length===1)assert.equal(f.r.p1,f.s.prompt);yield*seto();};
  f.io.osts=function*(){f.events.push('header');f.state.addrck=-1n;};done(f.run());
  assert.ok(!f.events.includes(`text:${f.s.prompt}`));assert.ok(f.events.includes('diagnostic'));assert.equal(f.count(),0);
});
test('ordinary prompt precedes header; an ADDRCK change during header selects statistics with explicit argument',()=>{
  const f=fixture([]);f.s.statisticsArgument=halfWords(7n,34567n);f.io.osts=function*(){f.events.push('header');f.state.addrck=1n;};
  done(f.run());assert.ok(f.events.indexOf(`text:${f.s.prompt}`)<f.events.indexOf('header'));assert.ok(f.events.includes('shosta:34567'));assert.ok(f.events.includes('output'));assert.equal(f.count(),0);
});
test('diagnostic completion goes to file output even if it clears ADDRCK',()=>{
  const f=fixture([]);f.state.addrck=-1n;f.io.diagnostic=function*(){f.state.addrck=0n;};done(f.run());assert.ok(f.events.includes('open'));assert.equal(f.count(),0);
});
test('Ctrl-C during INLI discards the line before OSTR.X and file OPEN',()=>{
  const f=fixture();const g=f.run();assert.equal(g.next().value,'line');f.state.ccflg=-1n;done(g);
  assert.ok(!f.events.some(e=>e.startsWith('copy:')));assert.ok(!f.events.includes('open'));assert.ok(f.events.includes('close'));assert.equal(f.state.ccflg,0n);
});
test('EOF is tested from live F after OSTR.X, not snapshotted at input return',()=>{
  const f=fixture([{text:'hello',eof:false}]);f.io.ostrx=function*(){assert.equal(f.r.p1,signed36(f.s.linePointer));f.r.f=32n;};done(f.run());assert.equal(f.count(),1);assert.ok(f.events.includes('output'));
});
test('non-EOF activity clearing uses WHO reread after OCRL and raw negative ALIVE',()=>{
  const f=fixture([{text:'a',eof:false},{text:'b',eof:true}]);ship(f,1n);f.high.write('alive',-1n,2);f.high.write('active',8n,2);
  f.io.ocrl=function*(){f.events.push('ocrl');f.state.who=2n;};done(f.run());assert.equal(f.high.read('active',1),9n);assert.equal(f.high.read('active',2),0n);
});
test('EOF line skips activity clearing',()=>{
  const f=fixture();ship(f);done(f.run());assert.equal(f.high.read('active',1),9n);assert.deepEqual(f.displays,[[10n,20n,1000n],[10n,20n,101n]]);
});
test('twenty non-EOF lines emit exact warning pointers after lines eighteen and twenty, then file output',()=>{
  const f=fixture(Array.from({length:20},()=>({text:'a',eof:false})));done(f.run());
  const at18=f.events.indexOf(`text:${f.s.onlyTwo}`),at20=f.events.indexOf(`text:${f.s.tooMany}`);
  assert.ok(at18>f.events.indexOf('line:18')&&at18<f.events.indexOf('line:19'));assert.ok(at20>f.events.indexOf('line:20'));
  assert.equal(f.count(),20);assert.equal(f.events.filter(e=>e.startsWith('seto:')).length,6);assert.ok(f.events.includes('output'));
});
test('warning output can change live X2 before the next-line decision',()=>{
  const f=fixture([{text:'a',eof:false}]);const input=f.io.inli;f.io.inli=function*(){yield*input();f.r.x2=2n;};const ostr=f.io.ostr;
  f.io.ostr=function*(){yield*ostr();if(f.r.p1===f.s.onlyTwo)f.r.x2=0n;};done(f.run());assert.equal(f.count(),1);assert.ok(f.events.includes('output'));assert.ok(f.events.includes(`text:${f.s.onlyTwo}`));
});
test('ESHP erases a non-RED ship as decimal 1000 and exposes live coordinates to SDSP',()=>{
  const f=fixture();ship(f,6n);done(eraseTextShip(f.file,f.state,f.r,f.s,f.sdsp));assert.deepEqual(f.displays,[[10n,20n,1000n]]);
});
for(const who of [0n,-1n])test(`ESHP/PSHP skip ship memory for WHO ${who}`,()=>{
  const f=fixture();f.state.who=who;f.s.shpcon=60000n;f.s.alive=60000n;
  done(eraseTextShip(f.file,f.state,f.r,f.s,f.sdsp));done(restoreTextShip(f.file,f.state,f.r,f.s,f.sdsp));assert.deepEqual(f.displays,[]);assert.equal(f.r.t3,who);
});
for(const alive of [0n,1n])test(`PSHP does not restore nonnegative ALIVE ${alive}`,()=>{
  const f=fixture();ship(f);f.high.write('alive',alive,1);done(restoreTextShip(f.file,f.state,f.r,f.s,f.sdsp));assert.deepEqual(f.displays,[]);
});
test('PSHP restores current Empire ship even if now RED, using no condition check',()=>{
  const f=fixture();ship(f,6n);f.high.write('shpcon',BigInt(K.RED),6,K.KSPCON);done(restoreTextShip(f.file,f.state,f.r,f.s,f.sdsp));assert.deepEqual(f.displays,[[10n,20n,206n]]);
});
