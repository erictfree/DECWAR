import test from 'node:test';
import assert from 'node:assert/strict';
import { rawEqual,rawEqualStrings } from '../src/compat/equal.ts';
import { halfWords,packAscii,rightHalf } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { outputRuntimeFixture } from './fixtures/output-runtime.ts';
import { equalServices } from './fixtures/equal.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(a='SH',b='SH'){
  const f=outputRuntimeFixture(),io=equalServices(f);f.h.put(8500n,a);f.h.put(8510n,b);
  loadArgumentBlock(f.m,5400n,[8500n,8510n]);selectArgumentBlock(f.r,5400n);
  f.r.p1=123n;f.r.p2=456n;f.r.c=789n;f.r.t0=0o140n;
  return {...f,io,run:()=>rawEqual(f.r,f.rt.args,f.s.point7LeftHalf,io)};
}
for(const [a,b,result] of [['SH','sh',-2n],['S','SH',-1n],['sh','SH',0n],['','SH',0n],[' SH',' SH',0n],['SH ','SH',-2n],['SH','SHIELDS',-1n],['SHIELDS','SH',0n],['ABCDE!','ABCDE?',-2n]] as const)
test(`raw EQUAL ${JSON.stringify(a)}/${JSON.stringify(b)} preserves result ${result}`,()=>{
  const f=fixture(a,b);done(f.run());assert.equal(f.r.f,result);assert.equal(f.r.p1,123n);assert.equal(f.r.p2,456n);assert.equal(f.r.c,789n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('raw EQUAL saves five real words and reads the first token byte twice',()=>{
  const f=fixture(),ildb=f.io.ildb,reads:string[]=[];f.io.ildb=function*(p){reads.push(p);assert.equal(rightHalf(f.r.s),rightHalf(f.s.initialStackWord)+5n);return yield*ildb(p);};
  done(f.run());assert.deepEqual(reads,['t1','p1','p2','p1','p2','p1','p2']);assert.equal(f.r.t1,3n);
});
test('raw EQUAL does not read master bytes for an empty substring',()=>{
  const f=fixture('');loadArgumentBlock(f.m,5400n,[8500n,40000n]);done(f.run());assert.equal(f.r.f,0n);
});
test('raw EQUAL rereads the first token byte after its initial null test suspends',()=>{
  const f=fixture(),ildb=f.io.ildb;f.io.ildb=function*(p){const c=yield*ildb(p);if(p==='t1')yield 'first';return c;};
  const g=f.run();assert.equal(g.next().value,'first');f.m.write(8500n,packAscii('TO'));done(g);assert.equal(f.r.f,0n);
});
test('raw EQUAL retains the mistaken T0 conversion before reading the master byte',()=>{
  const f=fixture('S','s'),ildb=f.io.ildb;let seen:bigint|undefined;
  f.io.ildb=function*(p){if(p==='p2'&&seen===undefined)seen=f.r.t0;return yield*ildb(p);};done(f.run());assert.equal(seen,0o100n);assert.equal(f.r.f,-2n);
});
test('raw EQUAL resolves current ARG only after its outer SAVE calls',()=>{
  const f=fixture(),push=f.io.pushData;loadArgumentBlock(f.m,5450n,[8510n,8500n]);f.h.put(8510n,'S');let n=0;
  f.io.pushData=function*(w){yield*push(w);if(++n===2)selectArgumentBlock(f.r,5450n);};done(f.run());assert.equal(f.r.f,-1n);
});
test('internal EQUAL. replaces incoming pointer left halves and restores three registers',()=>{
  const f=fixture();f.r.p1=halfWords(1n,8500n);f.r.p2=halfWords(2n,8510n);const p1=f.r.p1,p2=f.r.p2;
  done(rawEqualStrings(f.r,f.s.point7LeftHalf,f.io));assert.equal(f.r.f,-2n);assert.equal(f.r.p1,p1);assert.equal(f.r.p2,p2);assert.equal(f.r.c,789n);assert.equal(f.r.s,f.s.initialStackWord);
});
