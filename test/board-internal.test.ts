import test from 'node:test';
import assert from 'node:assert/strict';
import { eraseTextShip,restoreTextShip } from '../src/compat/gripe.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { statusRuntimeFixture } from './fixtures/status-runtime.ts';
import { boardRuntimeFixture } from './fixtures/board-runtime.ts';
import { halfWords,rightHalf,unsigned36 } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){const f=statusRuntimeFixture(),b=boardRuntimeFixture(f,f.high,f.low);return {...f,b};}
for(let col=1;col<=3;col++)test(`GPTR horizontal position ${col} returns its preceding-byte pointer`,()=>{
  const f=fixture();f.r.t1=2n;f.r.t2=BigInt(col);f.r.t3=999n;f.r.arg=777n;done(f.b.internal('gptr'));
  assert.equal(unsigned36(f.r.t2),halfWords((BigInt(48-col*12)<<12n)|(12n<<6n),f.high.address('board',1)+25n));assert.equal(f.r.t1,50n);assert.equal(f.r.t3,BigInt(col-1));assert.equal(f.r.arg,777n);
});
test('GDSP reads every physical cell through incremented actual pointers',()=>{
  const f=fixture(),base=f.high.address('board',1);
  for(let row=1;row<=75;row++)for(let col=1;col<=75;col++){
    const n=BigInt((row*75+col)%4096),offset=BigInt((row-1)*25+Math.floor((col-1)/3)),shift=BigInt(24-12*((col-1)%3));
    f.m.write(base+offset,n<<shift);f.r.t1=BigInt(row);f.r.t2=BigInt(col);done(f.b.internal('gdsp'));assert.equal(f.r.t3,n);assert.equal(f.r.t1,BigInt(row*25));assert.equal(rightHalf(f.r.t2),base+offset);
  }
});
test('GDSP returns the raw all-ones byte with no public DISP sentinel conversion or debug calls',()=>{
  const f=fixture();f.low.write('pasflg',-1n);f.r.t1=1n;f.r.t2=1n;f.m.write(f.high.address('board',1),4095n<<24n);done(f.b.internal('gdsp'));assert.equal(f.r.t3,4095n);assert.equal(f.text(),'');assert.deepEqual(f.b.events,[]);
});
for(let col=1;col<=3;col++)test(`SDSP saves the input across GPTR and deposits only byte ${col}`,()=>{
  const f=fixture(),base=f.high.address('board',1),initial=0x123456789n,shift=BigInt(36-col*12);f.m.write(base,initial);f.r.t1=1n;f.r.t2=BigInt(col);f.r.t3=-2n;
  done(f.b.internal('sdsp'));assert.equal(f.r.t3,-2n);assert.equal(unsigned36(f.m.read(base)),(initial&~(4095n<<shift))|(4094n<<shift));assert.equal(f.r.s,f.s.initialStackWord);
});
test('GPTR masks H-1 before division, unlike public DISP SUBI',()=>{
  const f=fixture();f.r.t1=1n;f.r.t2=0n;const div=f.b.internalIO.idiviT2;let n=-1n;
  f.b.internalIO.idiviT2=function*(w){n=f.r.t2;yield*div(w);yield 'div';};const g=f.b.internal('gptr');assert.equal(g.next().value,'div');assert.equal(n,262143n);assert.equal(f.r.t2,87381n);assert.equal(f.r.t3,0n);
});
test('GPTR ADDI receives the masked row effective address',()=>{
  const f=fixture();f.r.t1=0n;f.r.t2=1n;let value=-1n;f.b.internalIO.addiT2=function*(w){value=w;yield 'addi';};const g=f.b.internal('gptr');assert.equal(g.next().value,'addi');assert.equal(value,262119n);
});
test('GPTR uses current T1 after division and actual table after ADDI',()=>{
  const f=fixture(),div=f.b.internalIO.idiviT2,addi=f.b.internalIO.addiT2;f.r.t1=1n;f.r.t2=1n;
  f.b.internalIO.idiviT2=function*(w){yield*div(w);yield 'div';};f.b.internalIO.addiT2=function*(w){yield*addi(w);yield 'addi';};
  const g=f.b.internal('gptr');assert.equal(g.next().value,'div');f.r.t1=2n;assert.equal(g.next().value,'addi');f.m.write(f.b.s.b12tbl-1n,halfWords((36n<<12n)|(12n<<6n),13400n));done(g);assert.equal(rightHalf(f.r.t2),13425n);
});
test('SDSP holds the saved input on S across pointer calculation suspension',()=>{
  const f=fixture(),div=f.b.internalIO.idiviT2;f.r.t1=1n;f.r.t2=1n;f.r.t3=888n;
  f.b.internalIO.idiviT2=function*(w){yield*div(w);yield 'div';};const g=f.b.internal('sdsp');assert.equal(g.next().value,'div');assert.equal(f.m.read(rightHalf(f.r.s)),888n);assert.equal(f.r.t3,0n);
  f.r.t3=2n; // GPTR consumes the changed table index before RESTOR T3.
  done(g);assert.equal(f.r.t3,888n);assert.equal(f.m.read(f.high.address('board',1)),888n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('SDSP RESTOR observes the current saved memory word',()=>{
  const f=fixture(),add=f.b.internalIO.addT2;f.r.t1=1n;f.r.t2=1n;f.r.t3=100n;
  f.b.internalIO.addT2=function*(w){yield*add(w);yield 'pointer';};const g=f.b.internal('sdsp');assert.equal(g.next().value,'pointer');f.m.write(rightHalf(f.r.s),222n);done(g);assert.equal(f.r.t3,222n);assert.equal(f.m.read(f.high.address('board',1)),222n<<24n);
});
test('SDSP pointer failure leaves the source SAVE and already changed registers in place',()=>{
  const f=fixture();f.r.t1=1n;f.r.t2=1n;f.r.t3=77n;f.b.internalIO.idiviT2=function*(){throw new Error('CPU fault');};
  assert.throws(()=>done(f.b.internal('sdsp')),/CPU fault/);assert.equal(f.r.t2,0n);assert.equal(f.m.read(rightHalf(f.r.s)),77n);assert.notEqual(f.r.s,f.s.initialStackWord);
});
test('GDSP uses live pointer at the byte-operation boundary',()=>{
  const f=fixture(),load=f.b.internalIO.ildbT3T2;f.r.t1=1n;f.r.t2=1n;f.m.write(13400n,333n<<24n);
  f.b.internalIO.ildbT3T2=function*(){yield 'byte';yield*load();};const g=f.b.internal('gdsp');assert.equal(g.next().value,'byte');f.r.t2=halfWords((36n<<12n)|(12n<<6n),13400n);done(g);assert.equal(f.r.t3,333n);
});

for(const who of [1n,6n])test(`ESHP/PSHP compose raw SDSP and GDSP for ship ${who}`,()=>{
  const f=fixture(),symbols={shpcon:f.high.address('shpcon',1,1),alive:f.high.address('alive',1)},sdsp=()=>f.b.internal('sdsp');
  f.low.write('who',who);f.high.write('alive',-1n,who);f.high.write('shpcon',12n,who,K.KVPOS);f.high.write('shpcon',34n,who,K.KHPOS);f.high.write('shpcon',BigInt(K.GREEN),who,K.KSPCON);
  const read=()=>{f.r.t1=12n;f.r.t2=34n;done(f.b.internal('gdsp'));return f.r.t3;};
  done(eraseTextShip(f.file,f.state,f.r,symbols,sdsp));assert.equal(read(),1000n);
  done(restoreTextShip(f.file,f.state,f.r,symbols,sdsp));assert.equal(read(),who===1n?101n:206n);assert.equal(f.r.s,f.s.initialStackWord);assert.equal(f.text(),'');
});
test('PSHP dead-ship path leaves the prior raw ESHP board marker in place',()=>{
  const f=fixture(),symbols={shpcon:f.high.address('shpcon',1,1),alive:f.high.address('alive',1)},sdsp=()=>f.b.internal('sdsp');
  f.high.write('shpcon',BigInt(K.GREEN),1,K.KSPCON);done(eraseTextShip(f.file,f.state,f.r,symbols,sdsp));f.high.write('alive',0n,1);
  done(restoreTextShip(f.file,f.state,f.r,symbols,sdsp));f.r.t1=12n;f.r.t2=34n;done(f.b.internal('gdsp'));assert.equal(f.r.t3,1000n);
});
