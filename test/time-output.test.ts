import test from 'node:test';
import assert from 'node:assert/strict';
import { outputTime,outputTimePair } from '../src/compat/time-output.ts';
import type { TimeOutputServices } from '../src/compat/time-output.ts';
import { machineRegisters } from '../src/compat/registers.ts';
import { AddressSpace } from '../src/compat/memory.ts';
import { divide36,halfWords,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
import { TerminalOutput } from '../src/compat/output.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(time=3723456n){
  const m=new AddressSpace(),words=Array.from({length:16},(_,i)=>BigInt(100+i));m.map(0n,words);const r=machineRegisters(m),out=new TerminalOutput(),events:string[]=[];
  const io:TimeOutputServices<string>={argument(){events.push('argument');return time;},
    *idivHours(){events.push('hours');const d=divide36(r.x1,3600000n);r.x1=d.quotient;r.x2=d.remainder;},
    *idivi(pair,divisor){events.push(`${pair}/${divisor}`);const d=divide36(r[pair],divisor);r[pair]=d.quotient;r[pair==='x2'?'x3':pair==='x3'?'x4':'t2']=d.remainder;},
    *ochr(){out.character(r.c);},
  };return {m,words,r,out,events,io};
}
for(const [value,text] of [[0n,'00:00:00'],[3723456n,'01:02:03'],[3599999n,'00:59:59'],[360000000n,':0:00:00']] as const)
test(`raw OTIM ${value} emits ${text} without decimal field normalization`,()=>{
  const f=fixture(value);done(outputTime(f.r,f.io));assert.equal(f.out.drain(),text);assert.equal(f.r.x4,value%1000n);
  assert.deepEqual(f.events,['argument','hours','x2/60000','x3/1000','t1/10','t1/10','t1/10']);
});
test('OTIM exposes overlapping quotient/remainder registers and performs no saves',()=>{
  const f=fixture();done(outputTime(f.r,f.io));assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4],[1n,2n,3n,456n]);assert.equal(f.r.t1,0n);assert.equal(f.r.t2,3n);
  assert.equal(f.r.s,113n);assert.equal(f.r.p,115n);assert.equal(f.r.p1,110n);
});
test('OTIM negative seconds use MOVEI masking before O2D, including non-ASCII raw C',()=>{
  const f=fixture(-1000n),codes:bigint[]=[];f.io.ochr=function*(){codes.push(f.r.c);};done(outputTime(f.r,f.io));
  assert.deepEqual(codes,[48n,48n,58n,48n,48n,58n,26262n,51n]);assert.equal(f.r.x3,-1n);assert.equal(f.r.x4,0n);
});
test('OTIM reads minutes and seconds after earlier output calls',()=>{
  const f=fixture(),ochr=f.io.ochr;let colons=0;f.io.ochr=function*(){yield*ochr();if(f.r.c===58n){colons++;yield 'colon';}};
  const g=outputTime(f.r,f.io);assert.equal(g.next().value,'colon');f.r.x2=59n;assert.equal(g.next().value,'colon');f.r.x3=7n;done(g);
  assert.equal(f.out.drain(),'01:59:07');assert.equal(colons,2);
});
test('OTIM IDIV failure retains its source argument and existing remainder registers',()=>{
  const f=fixture();f.io.idivHours=function*(){throw new Error('Literal/CPU fault');};assert.throws(()=>done(outputTime(f.r,f.io)),/Literal\/CPU fault/);
  assert.equal(f.r.x1,3723456n);assert.equal(f.r.x2,106n);assert.deepEqual(f.events,['argument']);
});
test('OTIM third divide suspension sees the earlier pair writes in real AC storage',()=>{
  const f=fixture(),idivi=f.io.idivi;f.io.idivi=function*(pair,d){if(pair==='x3')yield 'divide';yield*idivi(pair,d);};
  const g=outputTime(f.r,f.io);assert.equal(g.next().value,'divide');assert.deepEqual([f.m.read(5n),f.m.read(6n),f.m.read(7n)],[1n,2n,3456n]);
  f.m.write(7n,59999n);done(g);assert.equal(f.out.drain(),'01:02:59');assert.equal(f.r.x4,999n);
});
test('O2D uses live remainder after the first character and never restores T1/T2',()=>{
  const f=fixture();f.r.t1=12n;f.io.ochr=function*(){f.out.character(f.r.c);yield 'char';};const g=outputTimePair(f.r,f.io);
  assert.equal(g.next().value,'char');f.r.t2=halfWords(7n,9n);done(g);assert.equal(f.out.drain(),'19');assert.equal(f.r.c,57n);assert.equal(f.r.t1,1n);
});
test('machine register views preserve retained words and all declared aliases',()=>{
  const f=fixture();assert.deepEqual(f.words,Array.from({length:16},(_,i)=>BigInt(100+i)));
  f.r.f=-1n;assert.equal(f.r.t0,-1n);f.r.cNext=1234n;assert.equal(f.r.p1,1234n);assert.equal(f.m.read(0o12n),1234n);
  f.m.write(0o10n,MAX_INTEGER);assert.equal(f.r.x4,MAX_INTEGER);f.r.x4=MAX_INTEGER+1n;assert.equal(f.r.x4,MIN_INTEGER);
  assert.equal(f.m.read(0o14n),112n);assert.equal(f.r.arg,114n);
});
test('register construction does not access missing memory or fabricate values',()=>{
  const r=machineRegisters(new AddressSpace());assert.throws(()=>r.x1,/Unmapped source address/);
});
