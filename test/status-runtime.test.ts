import test from 'node:test';
import assert from 'node:assert/strict';
import { statusRuntimeFixture as fixture } from './fixtures/status-runtime.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { packAscii,signed36,MAX_INTEGER,multiply36 } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
const full=[
  '\r\nSD17 G 12-34 T10 E5000 D0 SH+100 ROn \r\n',
  '\r\nSDate    17\r\nCond   Green\r\nLoc    12-34\r\nTorps    10\r\nEner   5000.0\r\nDam       0.0\r\nShlds  +100.0% 2500.0 units\r\nRadio  On\r\n',
  '\r\nStardate\t  17\r\nCondition\tGreen\r\nLocation\t12-34\r\nTorpedoes\t  10\r\nEnergy left\t5000.0\r\nDamage\t\t   0.0\r\nShields\t        +100.0% 2500.0 units\r\nRadio\t\tOn\r\n',
];
for(const [i,format] of [-1,0,1].entries())test(`STATUS dispatch composes parsed input, raw output/EQUAL/PRLOC in format ${format}`,()=>{
  const f=fixture(format),ctx={who:1,player:-1n,ptime:99n,shared:{players:[{alive:0n},{alive:-1n}]}};
  f.low.write('vallst',73n,2);const ntok=f.low.read('ntok');
  done(dispatchCommand(ctx,23,{*invoke(call){assert.equal(call.routine,'status');assert.equal(call.argument,2);f.m.write(f.stoken,BigInt(call.argument));yield*f.run();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},*finishTurn(){assert.fail();},movementContinuation(){assert.fail();}}));
  assert.equal(f.text(),full[i]);assert.equal(ctx.ptime,99n);assert.equal(f.r.s,f.s.initialStackWord);
  assert.deepEqual(Array.from({length:7},(_,n)=>f.low.read('tknlst',n+2)),['C','L','T','E','D','S','R'].map(c=>signed36(packAscii(c))));
  assert.deepEqual(Array.from({length:7},(_,n)=>f.low.read('typlst',n+2)),Array(7).fill(BigInt(K.KALF)));assert.equal(f.low.read('typlst',9),BigInt(K.KEOL));assert.equal(f.low.read('vallst',2),73n);assert.equal(f.low.read('ntok'),ntok);
});
test('STATUS unknown item reports syntax and continues in requested order',()=>{
  const f=fixture();f.parse('STATUS S BAD C R');f.high.write('shpcon',0n,1,K.KSSHPC);f.high.write('docked',-1n,1);f.high.write('shpdam',3000n,1,K.KDRAD);done(f.run());
  assert.equal(f.text(),'\r\nSH-0 %Syntax error\r\nD+G Rdamaged \r\n');
});
test('STATUS STOKEN three retains the DOCK switch and starts its own report at token three',()=>{
  const f=fixture();f.parse('DOCK STATUS T');f.m.write(f.stoken,3n);done(f.run());assert.equal(f.text(),'\r\nT10 \r\n');assert.equal(f.low.read('tknlst',2),signed36(packAscii('STATU')));
});
test('STATUS initial CRLF can suspend before OBIT or STOKEN selection',()=>{
  const f=fixture();f.parse('STATUS T E');f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'output';};f.m.write(f.locals.obit,77n);
  const g=f.run();assert.equal(g.next().value,'output');assert.equal(f.m.read(f.locals.obit),77n);f.m.write(f.stoken,3n);f.low.write('oflg',0n);done(g);assert.equal(f.text(),'\r\nEner   5000.0\r\n');assert.equal(f.m.read(f.locals.obit),4n);
});
test('STATUS full report selects current WHO only after the stardate label output',()=>{
  const f=fixture(),out=f.io.out2c;f.high.write('shpcon',33n,2,K.KNTURN);f.io.out2c=function*(c){yield*out(c);if(c==='SD')f.low.write('who',2n);};
  const odec=f.io.odec;f.io.odec=function*(v,w){yield*odec(v,w);if(v===f.high.address('shpcon',2,K.KNTURN))f.low.write('who',1n);};done(f.run());assert.ok(f.text().startsWith('\r\nSD33 G'));
});
test('STATUS full-report rewrite uses STOKEN after stardate output and writes every text before types',()=>{
  const f=fixture(),odec=f.io.odec,enter=f.io.enterLoop;f.io.odec=function*(v,w){yield*odec(v,w);if(v===f.high.address('shpcon',1,K.KNTURN))f.m.write(f.stoken,3n);};
  f.io.enterLoop=(start,limit,loop)=>{if(loop==='types'){assert.equal(start,3n);assert.equal(limit,9n);assert.equal(f.low.read('typlst',10),BigInt(K.KEOL));assert.equal(f.low.read('tknlst',9),signed36(packAscii('R')));assert.equal(f.low.read('typlst',3),0n);}return enter(start,limit,loop);};done(f.run());assert.equal(f.text(),full[0]);assert.equal(f.low.read('typlst',2),BigInt(K.KEOL));
});
test('STATUS rereads token type after the short non-alpha CRLF returns',()=>{
  const f=fixture();f.parse('STATUS T');const crlf=f.io.crlf;let n=0;f.io.crlf=function*(){yield*crlf();if(++n===2)f.token(3,'D');};done(f.run());assert.equal(f.text(),'\r\nT10 \r\nD0 \r\n');
});
test('STATUS repeats EQUAL reads in source order until a successful comparison',()=>{
  const f=fixture();f.parse('STATUS X');const equal=f.io.equal;let n=0;f.io.equal=function*(t,s){const v=yield*equal(t,s);if(++n===1)f.token(2,'T');return v;};done(f.run());assert.equal(f.text(),'\r\nT10 \r\n');assert.deepEqual(f.events.filter(e=>e.startsWith('equal:')),['shields','location','condition','torpedo'].map(k=>`equal:${f.symbols.switches[k as keyof typeof f.symbols.switches]}`));
});
test('STATUS uses the supplied compiled switch and 1H literal words',()=>{
  const f=fixture();f.symbols.tokens.T=packAscii('X');f.h.put(f.symbols.switches.torpedo,'X');done(f.run());assert.equal(f.text(),full[0]);assert.equal(f.low.read('tknlst',4),signed36(packAscii('X')));
});
test('STATUS OBIT remains by reference and is not recomputed when OFLG changes',()=>{
  const f=fixture();f.parse('STATUS T E');const out=f.io.outc;f.io.outc=function*(c){yield*out(c);if(c==='T')f.low.write('oflg',0n);};done(f.run());assert.equal(f.text(),'\r\nT10\r\nEner   5000.0\r\n');assert.equal(f.m.read(f.locals.obit),0n);
});
test('STATUS heading output may change the width word before numeric output',()=>{
  const f=fixture();f.parse('STATUS T');const out=f.io.outc;f.io.outc=function*(c){yield*out(c);if(c==='T')f.m.write(f.locals.obit,4n);};done(f.run());assert.equal(f.text(),'\r\nT  10 \r\n');
});
test('STATUS shield operands are read after the label and product arithmetic is required',()=>{
  const f=fixture();f.parse('STATUS S');const out=f.io.out2c;f.io.out2c=function*(c){yield*out(c);f.high.write('shpcon',-1n,1,K.KSHCON);f.high.write('shpcon',7n,1,K.KSSHPC);};done(f.run());assert.equal(f.text(),'\r\nSH-0 \r\n');
  f.io.product=function*(){throw new Error('compiler product fault');};assert.throws(()=>done(f.run()),/compiler product fault/);
});
test('STATUS tests percent and energy continuation separately around the space call',()=>{
  const f=fixture();f.parse('STATUS S');const space=f.io.space;let n=0;f.io.space=function*(){yield*space();if(++n===1)f.low.write('oflg',0n);};done(f.run());assert.equal(f.text(),'\r\nSH+100 2500.0 units\r\n');
});
test('STATUS shield energy rereads strength after percent output and skips its last CRLF if SHORT changes',()=>{
  const f=fixture(0);f.parse('STATUS S');const outc=f.io.outc,out=f.io.out;f.io.outc=function*(c){yield*outc(c);if(c==='%')f.high.write('shpcon',400n,1,K.KSSHPC);};f.io.out=function*(name,lines){yield*out(name,lines);if(name==='stat05')f.low.write('oflg',BigInt(K.SHORT));};done(f.run());assert.equal(f.text(),'\r\nShlds  +100.0% 1000.0 units\r\n');assert.equal(f.events.filter(x=>x==='crlf').length,2); // Initial + token-loop termination, no shield-tail CRLF.
});
test('STATUS noncanonical negative OFLG uses short labels but width four and non-SHORT shield branches',()=>{
  const f=fixture(-2);f.parse('STATUS S');done(f.run());assert.equal(f.text(),'\r\nSH+100% 2500 units\r\n');assert.equal(f.m.read(f.locals.obit),4n);
});
test('STATUS radio checks damage after label output and bypasses masks at KCRIT',()=>{
  const f=fixture();f.parse('STATUS R');const out=f.io.outc;f.io.outc=function*(c){yield*out(c);if(c==='R')f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDRAD);};done(f.run());assert.equal(f.text(),'\r\nRdamaged \r\n');assert.ok(!f.events.includes('mask'));
});
test('STATUS radio mask is reread between Of, f and On rather than cached as a word',()=>{
  const f=fixture();f.parse('STATUS R');f.high.write('nomsg',1n);const out=f.io.out2c;f.io.out2c=function*(c){yield*out(c);if(c==='Of')f.high.write('nomsg',0n);};done(f.run());assert.equal(f.text(),'\r\nROfOn \r\n');assert.equal(f.events.filter(e=>e==='mask').length,3);
});
test('STATUS radio rereads WHO/BITS after Of and after f',()=>{
  const f=fixture();f.parse('STATUS R');f.high.write('nomsg',3n);const out2=f.io.out2c,out=f.io.outc;f.io.out2c=function*(c){yield*out2(c);if(c==='Of')f.low.write('who',2n);};f.io.outc=function*(c){yield*out(c);if(c==='f')f.high.write('bits',0n,2);};done(f.run());assert.equal(f.text(),'\r\nROffOn \r\n');
});
test('STATUS current literal RADIO3 is also the EQUAL master, not a synthesized RADIO token',()=>{
  const f=fixture(0);f.parse('STATUS Z');f.h.put(f.labels.radio3,'Zed  ');done(f.run());assert.equal(f.text(),'\r\nZed  On\r\n');
});
test('STATUS location and condition select current arguments after their headings',()=>{
  const f=fixture(0);f.parse('STATUS L C');f.high.write('shpcon',55n,2,K.KVPOS);f.high.write('shpcon',66n,2,K.KHPOS);f.high.write('shpcon',BigInt(K.RED),2,K.KSPCON);const out=f.io.out;f.io.out=function*(name,lines){yield*out(name,lines);if(name==='stat6m')f.low.write('who',2n);};done(f.run());assert.equal(f.text(),'\r\nLoc    55-66\r\nCond   Red\r\n');
});
test('STATUS numeric references are selected before output suspension and reread inside the runtime',()=>{
  const f=fixture();f.parse('STATUS E');const oflt=f.io.oflt;f.io.oflt=function*(v,w){yield 'number';yield*oflt(v,w);};const g=f.run();assert.equal(g.next().value,'number');f.low.write('who',2n);f.high.write('shpcon',321n,1,K.KSNRGY);done(g);assert.equal(f.text(),'\r\nE32 \r\n');
});
test('STATUS LOGICAL and compound predicate have explicit compiler contracts',()=>{
  const f=fixture();f.parse('STATUS T');f.io.equal=function*(){return 1n;};done(f.run());assert.equal(f.text(),'\r\n'+M.syntax.text+'\r\n\r\n');
  f.emitted.length=0;f.io.logical=w=>w!==0n;f.io.newlinePredicate=function*(n,s){return s()&&n();};done(f.run());assert.equal(f.text(),'SH+100 \r\n');
});
test('STATUS KMAXTK loop does not add a non-alpha tail newline beyond the last token',()=>{
  const f=fixture();f.m.write(f.stoken,BigInt(K.KMAXTK));f.token(K.KMAXTK,'T');done(f.run());assert.equal(f.text(),'\r\nT10 ');assert.equal(f.m.read(f.locals.i),BigInt(K.KMAXTK+1));
});
test('STATUS reversed item bounds use the required compiler DO entry policy',()=>{
  const f=fixture();f.m.write(f.stoken,16n);f.token(16,'T');done(f.run());assert.equal(f.text(),'\r\n');f.emitted.length=0;f.io.enterLoop=()=>true;done(f.run());assert.equal(f.text(),'T10 ');
});
test('STATUS shield product passes the full 36-bit compiler result into its expression temporary',()=>{
  const f=fixture();f.parse('STATUS S');f.high.write('shpcon',MAX_INTEGER,1,K.KSSHPC);f.high.write('shpcon',2n,1,K.KSHCON);let got:bigint|undefined;
  const osflt=f.io.osfltValue;f.io.osfltValue=function*(v,w){got=v;yield*osflt(v,w);};done(f.run());assert.equal(got,multiply36(MAX_INTEGER,2n));assert.equal(f.text(),'\r\nSH-0 \r\n');
});
test('STATUS full-report stores follow physical token-array overflow without clamping',()=>{
  const f=fixture();f.m.write(f.stoken,15n);f.low.write('typlst',BigInt(K.KEOL),15);
  f.io.enterLoop=(_start,_limit,loop)=>{assert.equal(loop,'types');throw new Error('inspect before type loop');};
  assert.throws(()=>done(f.run()),/inspect before type loop/);
  for(const [i,c] of ['C','L','T','E','D','S','R'].entries())assert.equal(f.m.read(f.low.address('tknlst',15+i)),signed36(packAscii(c)));
  assert.equal(f.low.address('tknlst',16),f.low.address('vallst',1));assert.equal(f.low.read('vallst',1),signed36(packAscii('L')));assert.equal(f.low.read('typlst',22),BigInt(K.KEOL));
});
test('STATUS shield product policy controls operand evaluation across a suspension',()=>{
  const f=fixture();f.parse('STATUS S');f.high.write('shpcon',20n,2,K.KSSHPC);
  f.io.product=function*(left,right){const l=left();yield 'product';return multiply36(l,right());};
  const g=f.run();assert.equal(g.next().value,'product');f.low.write('who',2n);done(g);assert.equal(f.text(),'\r\nSH+2 \r\n');
});
test('STATUS shield product can use an explicit right-first compiler policy',()=>{
  const f=fixture();f.parse('STATUS S');f.high.write('shpcon',-1n,2,K.KSHCON);
  f.io.product=function*(left,right){const r=right();yield 'product';return multiply36(left(),r);};
  const g=f.run();assert.equal(g.next().value,'product');f.low.write('who',2n);done(g);assert.equal(f.text(),'\r\nSH-100 \r\n');
});
test('STATUS radio output reacts to mask changes while actual OUTCHR is suspended',()=>{
  const f=fixture();f.parse('STATUS R');f.high.write('nomsg',1n);f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'byte';};
  const g=f.run();while(!f.text().endsWith('ROf')){const next=g.next();assert.equal(next.done,false);assert.equal(next.value,'byte');}
  f.high.write('nomsg',0n);done(g);assert.equal(f.text(),'\r\nROfOn \r\n');assert.equal(f.r.s,f.s.initialStackWord);
});
