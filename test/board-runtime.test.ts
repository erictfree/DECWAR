import test from 'node:test';
import assert from 'node:assert/strict';
import { statusRuntimeFixture } from './fixtures/status-runtime.ts';
import { boardRuntimeFixture } from './fixtures/board-runtime.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { halfWords,rightHalf,unsigned36 } from '../src/compat/word36.ts';
import type { BoardEntry } from '../src/compat/board-runtime.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const f=statusRuntimeFixture(),b=boardRuntimeFixture(f,f.high,f.low),v=13300n,h=13301n,value=13302n;
  const prepare=(vv=1n,hh=1n,nn=0n,third=value)=>{f.m.write(v,vv);f.m.write(h,hh);f.m.write(value,nn);loadArgumentBlock(f.m,13310n,[v,h,third]);selectArgumentBlock(f.r,13310n);};
  const run=(entry:BoardEntry,vv=1n,hh=1n,nn=0n)=>{prepare(vv,hh,nn);done(b.run(entry));return f.r.t0;};
  return {...f,b,v,h,value,prepare,run};
}
for(const entry of ['disp','dispc','dispx'] as const)test(`${entry} reads every physical cell through B12TBL and destroys ARG`,()=>{
  const f=fixture(),base=f.high.address('board',1);
  for(let row=1;row<=75;row++)for(let col=1;col<=75;col++){
    const n=BigInt((row*75+col)%1000),offset=BigInt((row-1)*25+Math.floor((col-1)/3)),shift=BigInt(24-12*((col-1)%3));
    f.m.write(base+offset,n<<shift);assert.equal(f.run(entry,BigInt(row),BigInt(col)),entry==='disp'?n:entry==='dispc'?n/100n:n%100n);
    assert.equal(f.r.arg,BigInt(row*25));
  }
});
for(const [entry,expected] of [['disp',-1n],['dispc',0n],['dispx',262143n]] as const)test(`${entry} preserves the all-ones cell behavior`,()=>{
  const f=fixture();f.m.write(f.high.address('board',1),4095n<<24n);assert.equal(f.run(entry),expected);
  if(entry!=='disp')assert.equal(f.r.t1,-1n);
});
for(let col=1;col<=3;col++)test(`SETDSP byte ${col} preserves neighbors, ARG and full input for CHKD`,()=>{
  const f=fixture(),base=f.high.address('board',1),initial=0x123456789n,shift=BigInt(36-col*12);f.m.write(base,initial);
  assert.equal(f.run('setdsp',1n,BigInt(col),0xABCDEFn),rightHalf(0xABCDEFn));
  assert.equal(unsigned36(f.m.read(base)),(initial&~(4095n<<shift))|(0xDEFn<<shift));
  assert.equal(f.m.read(f.b.s.oldobj),(initial>>shift)&4095n);assert.equal(f.r.arg,13311n);assert.equal(f.r.t2,25n);assert.equal(f.r.t1,0xABCDEFn);
  assert.deepEqual(f.b.events,['chkc','chkd']);
});
test('SETDSP snapshots OLDOBJ before resolving an aliased third argument',()=>{
  const f=fixture(),base=f.high.address('board',1);f.m.write(base,101n<<24n);f.m.write(f.b.s.oldobj,999n);
  f.prepare(1n,1n,0n,f.b.s.oldobj);done(f.b.run('setdsp'));assert.equal(f.r.t1,101n);assert.equal(f.m.read(base),101n<<24n);
});
test('SETDSP negative input deposits low twelve bits but exposes its right half to CHKD',()=>{
  const f=fixture();assert.equal(f.run('setdsp',1n,1n,-1n),262143n);assert.equal(f.m.read(f.b.s.oldobj),0n);assert.equal(f.run('disp'),-1n);
});
test('DISP reads horizontal argument after CHKC resumes',()=>{
  const f=fixture();f.m.write(f.high.address('board',1),201n<<12n);f.prepare();
  f.b.io.chkc=function*(){yield 'debug';};const g=f.b.run('disp');assert.equal(g.next().value,'debug');f.m.write(f.h,2n);done(g);assert.equal(f.r.t0,201n);
});
test('DISP resolves vertical argument after horizontal division and follows live ARG',()=>{
  const f=fixture(),divide=f.b.io.idiviT0;f.m.write(f.high.address('board',1)+25n,301n<<24n);f.prepare();
  loadArgumentBlock(f.m,13320n,[13330n]);f.m.write(13330n,2n);
  f.b.io.idiviT0=function*(n){yield*divide(n);yield 'divide';};const g=f.b.run('disp');assert.equal(g.next().value,'divide');selectArgumentBlock(f.r,13320n);done(g);assert.equal(f.r.t0,301n);assert.equal(f.r.arg,50n);
});
test('DISP ADDI receives the masked effective address, not a signed row offset',()=>{
  const f=fixture();f.prepare(0n,1n);let operand=-1n;
  f.b.io.addiT0=function*(w){operand=w;yield 'addi';};const g=f.b.run('disp');assert.equal(g.next().value,'addi');assert.equal(operand,262119n);assert.equal(f.r.arg,0n);
});
test('DISP consumes the live B12TBL memory word after ADDI',()=>{
  const f=fixture(),addi=f.b.io.addiT0;f.prepare();f.m.write(13340n,888n);
  f.b.io.addiT0=function*(w){yield*addi(w);yield 'addi';};const g=f.b.run('disp');assert.equal(g.next().value,'addi');f.m.write(f.b.s.b12tbl,halfWords(12n<<6n,13340n));done(g);assert.equal(f.r.t0,888n);
});
test('DISP leaves unchecked negative remainder to address the preceding pointer table entry',()=>{
  const f=fixture();f.prepare(1n,0n);f.m.write(13340n,42n);f.m.write(f.b.s.b12tbl-1n,halfWords(12n<<6n,13340n));done(f.b.run('disp'));assert.equal(f.r.t0,42n);assert.equal(f.r.t1,-1n);
});
test('DISP does not add a board coordinate bounds guard',()=>{
  const f=fixture(),base=f.high.address('board',1);f.m.write(base+1875n,505n<<24n);assert.equal(f.run('disp',76n,1n),505n);
});
test('DISP applies the sentinel conversion before calling CHKD',()=>{
  const f=fixture();f.m.write(f.high.address('board',1),4095n<<24n);f.prepare();f.b.io.chkd=function*(){assert.equal(f.r.t0,-1n);yield 'check';};const g=f.b.run('disp');assert.equal(g.next().value,'check');done(g);
});
for(const entry of ['dispc','dispx'] as const)test(`${entry} divides current T0 after CHKD returns`,()=>{
  const f=fixture();f.b.io.chkd=function*(){f.r.t0=725n;};assert.equal(f.run(entry),entry==='dispc'?7n:25n);
});
test('SETDSP reads its third argument after LDB resumes and OLDOBJ is committed',()=>{
  const f=fixture(),ldb=f.b.io.ldb;f.prepare();f.b.io.ldb=function*(d){yield*ldb(d);yield 'load';};const g=f.b.run('setdsp');assert.equal(g.next().value,'load');f.m.write(f.value,901n);done(g);assert.equal(f.run('disp'),901n);
});
test('SETDSP uses live T1 after the deposit service returns',()=>{
  const f=fixture(),dpb=f.b.io.dpb;f.b.io.dpb=function*(){yield*dpb();f.r.t1=-2n;};assert.equal(f.run('setdsp',1n,1n,400n),262142n);assert.equal(f.run('disp'),400n);
});
test('Public board calls compose actual privileged diagnostics for valid coordinates and cells',()=>{
  const f=fixture();f.low.write('pasflg',1n);assert.equal(f.run('setdsp',1n,1n,101n),101n);assert.equal(f.run('disp'),101n);assert.equal(f.text(),'');assert.equal(f.r.s,f.s.initialStackWord);
});
