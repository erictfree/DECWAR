import test from 'node:test';
import assert from 'node:assert/strict';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { initializeGripeBuffer } from '../src/compat/ogch.ts';
import { halfWords,rightHalf,packAscii,packSixbit } from '../src/compat/word36.ts';
import { outputRuntimeFixture as fixture } from './fixtures/output-runtime.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
test('runtime construction preserves memory and public text dispatch uses current OC',()=>{
  const f=fixture();f.args(packAscii('AB'));f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});f.output.write('oc',201n);};
  done(f.rt.run('out2c'));assert.equal(f.text(),'AB');assert.deepEqual(f.emitted.map(x=>x.sink),['tty','buffer']);assert.equal(f.state.hcpos,2n);assert.equal(f.r.s,f.s.initialStackWord);
});
for(const [entry,value,width,text] of [['odec',-12n,5n,'  -12'],['osdec',7n,0n,'+7'],['oflt',-7n,0n,'0.7'],['osflt',-7n,0n,'-0.7']] as const)
test(`runtime ${entry} uses source arguments, dynamic numeric call and shared stack`,()=>{
  const f=fixture();f.args(value,width);f.r.x1=71n;f.r.x2=72n;f.r.x3=73n;f.r.x4=74n;done(f.rt.run(entry));assert.equal(f.text(),text);
  assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4],[71n,72n,73n,74n]);assert.equal(f.r.s,f.s.initialStackWord);assert.ok(f.events.some(e=>e.startsWith('call:')));
});
test('runtime does not replace a changed indirect numeric target with its selected entry',()=>{
  const f=fixture();f.args(7n,0n);const push=f.cpu.pushS;let first=true;f.cpu.pushS=function*(w){yield*push(w);if(first){first=false;f.r.t1=999n;}};
  assert.throws(()=>done(f.rt.run('odec')),/External call 999/);assert.notEqual(f.r.s,f.s.initialStackWord);assert.equal(f.text(),'');
});
test('runtime resolves argument reads after output suspension',()=>{
  const f=fixture();f.h.put(5600n,'AB');loadArgumentBlock(f.m,5400n,[5600n,5500n]);f.m.write(5500n,0n);selectArgumentBlock(f.r,5400n);
  f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'char';};const g=f.rt.run('out');assert.equal(g.next().value,'char');f.m.write(5500n,1n);done(g);
  assert.equal(f.text(),'AB\r\n');assert.equal(f.r.s,f.s.initialStackWord);
});
test('runtime composes all status-header fields through character dispatch and real S words',()=>{
  const f=fixture();f.r.x1=71n;f.r.x2=72n;f.r.x3=73n;f.r.x4=74n;done(f.rt.run('osts.'));
  assert.equal(f.text(),'[V2.1  05-SEP-78 12:34  Pre-game   ERIC  TEST   1200       1,27    TTY12    7    17 B R]\r\n');
  assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4],[71n,72n,73n,74n]);assert.equal(f.r.s,f.s.initialStackWord);assert.equal(f.state.hcpos,0n);
});
test('runtime SETO selects OGCH and header output survives CORE suspension',()=>{
  const f=fixture();const descriptor=8400n;f.m.write(descriptor,halfWords(202n,0n));f.m.write(descriptor+2n,halfWords(3n,0n));f.m.write(descriptor+5n,halfWords(f.file.address('dbuf',0),0n));
  f.r.x1=halfWords(descriptor,123n);done(f.rt.run('seto.'));initializeGripeBuffer(f.file,f.job,f.r,f.s.gripe);f.job.jbrel=7000n;
  const g=f.rt.run('osts.');assert.equal(g.next().value,'core');assert.equal(rightHalf(f.r.s),rightHalf(f.s.initialStackWord)+4n);done(g);
  assert.ok(f.text().startsWith('[V2.1'));assert.ok(f.text().endsWith(' B R]\r\n'));assert.ok(f.emitted.every(x=>x.sink==='buffer'));assert.equal(f.r.s,f.s.initialStackWord);
});
test('runtime direct hangup suppresses bytes but retains control-character stack/accounting',()=>{
  const f=fixture();f.state.hungup=-1n;done(f.rt.run('crlf'));assert.equal(f.text(),'');assert.equal(f.state.blank,1n);assert.equal(f.r.s,f.s.initialStackWord);assert.equal(f.m.read(6000n),10n);
});
test('runtime buffered flush preserves AC0 on P and retries through the live count',()=>{
  const f=fixture();f.output.write('oc',201n);f.m.write(8300n,0n);f.r.c=65n;f.r.f=88n;const p=f.r.p,g=f.rt.run('ochr.');assert.equal(g.next().value,'output');done(g);
  assert.equal(f.text(),'A');assert.equal(f.r.f,88n);assert.equal(f.r.p,p);assert.equal(f.m.read(6100n),88n);assert.equal(f.m.read(8300n),79n);
});
test('runtime raw string pointer retains 36-bit LINBUF-style characters',()=>{
  const f=fixture();f.m.write(5600n,65n);f.m.write(5601n,66n);f.m.write(5602n,0n);f.r.p1=halfWords(0o444400n,5600n);done(f.rt.run('ostr.x'));assert.equal(f.text(),'AB');
});
test('runtime field and SIXBIT bodies preserve their source padding and register pair',()=>{
  const f=fixture();f.h.put(5600n,'ABC');f.r.p1=5600n;done(f.rt.run('ostbx.'));assert.equal(f.text(),'ABC      ');
  f.emitted.length=0;f.r.x1=packSixbit('NAME  ');const p1=f.r.p1;done(f.rt.run('osix.'));assert.equal(f.text(),'NAME  ');assert.equal(f.r.p1,p1);
});
test('runtime time and object/device/condition bodies share output state and argument binding',()=>{
  const f=fixture();f.args(3723456n);done(f.rt.run('otim'));assert.equal(f.text(),'01:02:03');f.emitted.length=0;
  f.args(0n,0n);done(f.rt.run('odisp'));assert.equal(f.text(),'.');f.emitted.length=0;
  f.args(1n);done(f.rt.run('odev'));assert.equal(f.text(),'Shields ');f.emitted.length=0;
  f.state.who=1n;f.m.write(f.s.condition.docked,-1n);done(f.rt.run('ocond'));assert.equal(f.text(),'Docked+Green');
});
test('runtime public STAT and internal octal body share radix restoration',()=>{
  const f=fixture();f.args(1n,1n);done(f.rt.run('stat'));assert.equal(f.text(),'Lexington ');f.emitted.length=0;
  f.r.x1=63n;f.r.x2=0n;f.r.x3=77n;done(f.rt.run('ooct.'));assert.equal(f.text(),'77');assert.equal(f.r.x3,77n);
});
test('runtime keeps an unknown character target external without fallback output',()=>{
  const f=fixture();f.output.write('oc',999n);f.r.c=65n;assert.throws(()=>done(f.rt.run('ochr.')),/External jump 999/);assert.equal(f.text(),'');
});
