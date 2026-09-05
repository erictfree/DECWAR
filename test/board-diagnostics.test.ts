import test from 'node:test';
import assert from 'node:assert/strict';
import { statusRuntimeFixture } from './fixtures/status-runtime.ts';
import { boardRuntimeFixture } from './fixtures/board-runtime.ts';
import { halfWords,packSixbit,signed36 } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const f=statusRuntimeFixture(),board=boardRuntimeFixture(f,f.high,f.low),d=board.diagnostic;
  f.low.write('pasflg',-1n);f.m.write(13300n,1n);f.m.write(13301n,1n);
  loadArgumentBlock(f.m,13310n,[13300n,13301n]);selectArgumentBlock(f.r,13310n);
  // Explicit empty trace stack at entry, including the trace call itself.
  f.r.p=signed36(halfWords(-39n,6100n));
  return {...f,board,d,run:(entry:'chkc'|'chkd')=>done(d.run(entry))};
}
for(const entry of ['chkc','chkd'] as const)test(`${entry} PASFLG zero returns before saving registers or reading arguments`,()=>{
  const f=fixture();f.low.write('pasflg',0n);f.r.arg=260000n;f.r.s=0n;const before={...f.r};f.run(entry);assert.deepEqual({...f.r},before);assert.equal(f.text(),'');
});
for(const [v,h] of [[1n,1n],[75n,75n],[1n,75n],[75n,1n]])test(`CHKC legal boundary ${v},${h} leaves registers and stack unchanged`,()=>{
  const f=fixture();f.m.write(13300n,v);f.m.write(13301n,h);f.r.t0=-123n;const before={...f.r};f.run('chkc');assert.deepEqual({...f.r},before);assert.equal(f.text(),'');
});
for(const [v,h,text] of [[0n,76n,'0 *'],[-1n,76n,'-1 76'],[76n,1n,'76  1'],[1n,0n,'1 0']] as const)test(`CHKC invalid ${v},${h} preserves numeric-width reuse and saved registers`,()=>{
  const f=fixture();f.m.write(13300n,v);f.m.write(13301n,h);f.r.t0=987n;f.r.t1=23n;f.r.t2=-456n;f.r.t3=98n;f.r.x1=444n;f.r.x2=91n;const before={...f.r};
  f.run('chkc');assert.equal(f.text(),'%Illegal coordinate: '+text+'\r\n\r\n');assert.deepEqual({...f.r},before);assert.ok(f.d.events.includes('flush'));
});
test('CHKC bad vertical coordinate skips initial horizontal validation and rereads both after output',()=>{
  const f=fixture(),read=f.rt.args.read,events:string[]=[];f.m.write(13300n,0n);
  f.rt.args.read=i=>{events.push('read:'+i);return read(i);};const out=f.d.io.output;
  f.d.io.output=function*(e){events.push(e);yield*out(e);};f.run('chkc');
  assert.deepEqual(events,['read:0','ostr.','read:0','odec.','ospc.','read:1','odec.','ocrl.']);
});
test('CHKC diagnostic rereads live ARG after its heading suspends',()=>{
  const f=fixture();f.m.write(13300n,0n);f.m.write(13320n,12n);f.m.write(13321n,34n);loadArgumentBlock(f.m,13330n,[13320n,13321n]);
  const output=f.d.io.output;f.d.io.output=function*(e){yield*output(e);if(e==='ostr.')yield 'heading';};
  const g=f.d.run('chkc');assert.equal(g.next().value,'heading');selectArgumentBlock(f.r,13330n);done(g);assert.equal(f.text(),'%Illegal coordinate: 12 34\r\n\r\n');assert.equal(f.r.arg,13331n);
});
const ranges=[[0,0],[1,5],[6,10],[1,10],[1,10],[0,1],[1,80],[1,80],[1,80],[0,0],[0,0]];
for(let kind=0;kind<ranges.length;kind++)test(`CHKD uses both inclusive bounds of source class ${kind}`,()=>{
  const [lo,hi]=ranges[kind]!;
  for(const value of new Set([lo!,hi!,lo!-1,hi!+1])){
    const f=fixture(),code=BigInt(kind*100+value);f.r.t0=code;f.r.t1=-1n;f.r.t2=20n;f.r.t3=30n;const before={...f.r};f.run('chkd');
    const valid=value>=lo!&&value<=hi!;assert.equal(f.text(),valid?'':`%Illegal display code: ${code}\r\n\r\n`);assert.deepEqual({...f.r},before);
  }
});
for(const n of [-1n,4095n,1100n,262143n])test(`CHKD diagnoses ${n} without rejecting or changing the caller's value`,()=>{
  const f=fixture();f.r.t0=n;const before={...f.r};f.run('chkd');assert.equal(f.text(),`%Illegal display code: ${n}\r\n\r\n`);assert.deepEqual({...f.r},before);
});
test('CHKD validates the right half rather than the signed full word',()=>{
  const f=fixture();f.r.t0=signed36(halfWords(-1n,101n));const word=f.r.t0;f.run('chkd');assert.equal(f.r.t0,word);assert.equal(f.text(),'');
});
test('CHKD consumes actual RNGTBL memory and restores pre-division registers',()=>{
  const f=fixture();f.r.t0=199n;f.m.write(f.d.s.rngtbl+1n,halfWords(99n,99n));f.run('chkd');assert.equal(f.text(),'');assert.equal(f.r.t0,199n);
});
test('CHKD saves its diagnostic T0 only after the required division returns',()=>{
  const f=fixture(),div=f.d.io.idiviT1;f.r.t0=4095n;f.d.io.idiviT1=function*(w){yield*div(w);yield 'divide';};
  const g=f.d.run('chkd');assert.equal(g.next().value,'divide');f.r.t0=55555n;done(g);assert.equal(f.r.t0,55555n);assert.equal(f.text(),'%Illegal display code: 55555\r\n\r\n');
});
test('CHKD rejected class does not read an out-of-range RNGTBL address',()=>{
  const f=fixture();f.d.s.rngtbl=250000n;f.r.t0=1100n;f.run('chkd');assert.equal(f.text(),'%Illegal display code: 1100\r\n\r\n');
});
test('CHKC output suspension exposes saves on the same runtime S stack',()=>{
  const f=fixture();f.m.write(13300n,0n);const initial=f.r.s;
  f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'byte';};const g=f.d.run('chkc');assert.equal(g.next().value,'byte');assert.notEqual(f.r.s,initial);done(g);assert.equal(f.r.s,initial);
});
test('Public SETDSP commits an illegal value before its actual CHKD diagnostic',()=>{
  const f=fixture();f.m.write(13302n,106n);loadArgumentBlock(f.m,13310n,[13300n,13301n,13302n]);selectArgumentBlock(f.r,13310n);
  const output=f.d.io.output;f.d.io.output=function*(e){if(e==='ostr.')assert.equal(f.m.read(f.high.address('board',1)),106n<<24n);yield*output(e);};
  done(f.board.run('setdsp'));assert.equal(f.text(),'%Illegal display code: 106\r\n\r\n');assert.equal(f.r.t0,106n);assert.equal(f.r.s,f.s.initialStackWord);
});
test('Public DISP converts sentinel before running actual privileged CHKD',()=>{
  const f=fixture();f.m.write(f.high.address('board',1),4095n<<24n);done(f.board.run('disp'));assert.equal(f.r.t0,-1n);assert.equal(f.r.arg,25n);assert.equal(f.text(),'%Illegal display code: -1\r\n\r\n');
});
function frames(f:ReturnType<typeof fixture>){
  // Three return words: two visible callers and the TRAC call skipped at P.
  f.r.p=signed36(halfWords(-37n,6102n));
  f.m.write(6101n,halfWords(123n,13401n));f.m.write(6100n,13411n);
  f.m.write(13400n,halfWords(0o260740n,13421n));f.m.write(13410n,13431n);
  f.m.write(13420n,packSixbit('INNER'));f.m.write(13430n,packSixbit('OUTER'));
}
test('TRAC follows actual return/instruction/name words and prints six-character names newest first',()=>{
  const f=fixture();frames(f);f.r.x1=18n;f.r.x2=22n;f.r.x3=33n;const before={x1:f.r.x1,x2:f.r.x2,x3:f.r.x3,p:f.r.p,s:f.r.s};
  done(f.d.trace());assert.equal(f.text(),'INNER  OUTER  \r\n');assert.deepEqual({x1:f.r.x1,x2:f.r.x2,x3:f.r.x3,p:f.r.p,s:f.r.s},before);assert.ok(f.d.events.includes('flush'));
});
test('TRAC reads a later frame after output suspension',()=>{
  const f=fixture();frames(f);const output=f.d.traceIO.output;let first=true;f.d.traceIO.output=function*(e){yield*output(e);if(first&&e==='ospc.'){first=false;yield 'frame';}};
  const g=f.d.trace();assert.equal(g.next().value,'frame');f.m.write(13430n,packSixbit('LATER'));done(g);assert.equal(f.text(),'INNER  LATER  \r\n');
});
test('TRAC selects P after ADDI resumes and sign-extends its entry left half',()=>{
  const f=fixture(),addi=f.d.traceIO.addiX2;frames(f);let input=0n;
  f.d.traceIO.addiX2=function*(w){input=f.r.x2;yield*addi(w);yield 'depth';};const g=f.d.trace();assert.equal(g.next().value,'depth');assert.equal(input,-37n);
  f.r.p=halfWords(-37n,6112n);f.m.write(6111n,13411n);f.m.write(6110n,13401n);done(g);assert.equal(f.text(),'OUTER  INNER  \r\n');
});
test('TRAC checks live HUNGUP after OCRL returns before flushing the terminal',()=>{
  const f=fixture(),out=f.d.traceIO.output;f.d.traceIO.output=function*(e){yield*out(e);if(e==='ocrl.')f.low.write('hungup',-1n);};done(f.d.trace());assert.ok(!f.d.events.includes('flush'));assert.equal(f.r.s,f.s.initialStackWord);
});
test('TRAC flush suspension retains the saved registers until OUTPUT completes',()=>{
  const f=fixture();f.r.x1=11n;f.r.x2=12n;f.r.x3=13n;f.d.traceIO.outputTTY=function*(){yield 'flush';};const g=f.d.trace();assert.equal(g.next().value,'flush');assert.notEqual(f.r.s,f.s.initialStackWord);done(g);assert.equal(f.r.s,f.s.initialStackWord);assert.deepEqual([f.r.x1,f.r.x2,f.r.x3],[11n,12n,13n]);
});
test('CHKC real diagnostic and TRAC compose through shared output and saved registers',()=>{
  const f=fixture();frames(f);f.m.write(13300n,76n);f.m.write(13301n,22n);const before={...f.r};f.run('chkc');assert.equal(f.text(),'%Illegal coordinate: 76 22\r\nINNER  OUTER  \r\n');assert.deepEqual({...f.r},before);
});
