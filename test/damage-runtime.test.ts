import test from 'node:test';
import assert from 'node:assert/strict';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { packAscii } from '../src/compat/word36.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { damageRuntimeFixture as fixture } from './fixtures/damage-runtime.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
for(const [format,expected] of [[K.SHORT,'\r\nSH   300\r\n'],[0,'\r\nDevice    Damage\r\n\r\nShields   300.0\r\n'],[K.LONG,'\r\nDamage Report for Lexington\r\n\r\nDevice             Damage\r\n\r\nDeflector Shields  300.0 units\r\n']] as const)
test(`DAMAGE slot 4 composes source memory, raw output and exact format ${format}`,()=>{
  const f=fixture(format),ctx={who:1,player:-1n,ptime:55n,shared:{players:[{alive:0n},{alive:-1n}]}};
  done(dispatchCommand(ctx,4,{*invoke(call){assert.equal(call.routine,'damage');assert.equal(call.argument,2);f.m.write(f.stoken,BigInt(call.argument));yield*f.run();},*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},*finishTurn(){assert.fail();},movementContinuation(){assert.fail();}}));
  assert.equal(f.text(),expected);assert.equal(f.r.s,f.s.initialStackWord);assert.equal(ctx.ptime,55n);assert.equal(f.m.read(f.locals.i),10n);
});
test('DAMAGE all-operational branch ignores requested tokens and leaves J untouched',()=>{
  const f=fixture();f.high.write('shpdam',0n,1,1);f.token(2,'SH');f.m.write(f.locals.j,77n);done(f.run());assert.equal(f.text(),'\r\n'+M.alldok.text+'\r\n');assert.equal(f.m.read(f.locals.j),77n);assert.ok(!f.events.some(x=>x.startsWith('equal:')));
});
test('DAMAGE prefix matches both T devices, ignores unknown switches, repeats and stops at non-alpha',()=>{
  const f=fixture();f.token(2,'T');f.token(3,'WARP');f.token(4,'TO');f.token(5,'5',K.KINT);f.token(6,'SH');done(f.run());
  assert.equal(f.text(),'\r\nTO     0\r\nTR     0\r\nTO     0\r\n');assert.equal(f.m.read(f.locals.i),5n);
});
test('DAMAGE STOKEN three uses the REPAIR caller token position',()=>{
  const f=fixture();f.m.write(f.stoken,3n);f.token(2,'WA');f.token(3,'SH');done(f.run());assert.equal(f.text(),'\r\nSH   300\r\n');
});
test('DAMAGE initial newline suspends before WHO, damage, or STOKEN reads',()=>{
  const f=fixture();f.high.write('shpdam',0n,1,1);f.high.write('shpdam',25n,2,2);f.token(3,'WA');f.cpu.outchr=function*(c){f.emitted.push({sink:'tty',c});yield 'output';};
  const g=f.run();assert.equal(g.next().value,'output');assert.equal(f.m.read(f.locals.i),0n);f.low.write('who',2n);f.m.write(f.stoken,3n);done(g);assert.equal(f.text(),'\r\nWA     2\r\n');
});
test('DAMAGE reads OFLG after ODEV and WHO/damage after the spacing call',()=>{
  const f=fixture(),odev=f.io.odev,tab=f.io.tab;f.high.write('shpdam',456n,2,1);
  f.io.odev=function*(a){yield*odev(a);f.low.write('oflg',0n);};f.io.tab=function*(n){yield*tab(n);f.low.write('who',2n);};done(f.run());
  assert.equal(f.text(),'\r\nSH         45.6\r\n');assert.ok(f.events.includes('tab:10'));assert.ok(f.events.includes(`oflt:${f.high.address('shpdam',2,1)}`));
});
test('DAMAGE units flag is read after OFLT completes',()=>{
  const f=fixture(),oflt=f.io.oflt;f.io.oflt=function*(a,w){yield*oflt(a,w);f.low.write('oflg',BigInt(K.LONG));};done(f.run());assert.equal(f.text(),'\r\nSH   300 units\r\n');
});
test('DAMAGE positive header falls through to both column labels after OFLG turns negative',()=>{
  const f=fixture(K.LONG),out=f.io.out;f.io.out=function*(name,lines){yield*out(name,lines);if(name==='damrep')f.low.write('oflg',BigInt(K.SHORT));};done(f.run());
  assert.equal(f.text(),'\r\nDamage Report for L\r\n\r\nDevice    Damage\r\n\r\nSH   300\r\n');
});
test('DAMAGE DISP coordinates are selected after the heading, and object output uses its returned value',()=>{
  const f=fixture(K.LONG),out=f.io.out,disp=f.io.disp;f.high.write('shpcon',22n,2,K.KVPOS);f.high.write('shpcon',44n,2,K.KHPOS);f.high.write('shpdam',10n,2,1);f.board.setdsp(22,44,102);
  f.io.out=function*(name,lines){yield*out(name,lines);if(name==='damrep')f.low.write('who',2n);};f.io.disp=function*(v,h){const n=yield*disp(v,h);f.board.setdsp(22,44,0);return n;};done(f.run());assert.ok(f.text().startsWith('\r\nDamage Report for Nimitz'));
});
test('DAMAGE general scan reads future devices after earlier rows and omits nonpositive values',()=>{
  const f=fixture(),crlf=f.io.crlf;f.high.write('shpdam',-1n,1,3);let n=0;f.io.crlf=function*(){yield*crlf();if(++n===2)f.high.write('shpdam',10n,1,2);};done(f.run());assert.equal(f.text(),'\r\nSH   300\r\nWA     1\r\n');
});
test('DAMAGE specific scan rereads the same token word for each device comparison',()=>{
  const f=fixture();f.token(2,'SH');const crlf=f.io.crlf;let n=0;f.io.crlf=function*(){yield*crlf();if(++n===2)f.token(2,'T');};done(f.run());assert.equal(f.text(),'\r\nSH   300\r\nTO     0\r\nTR     0\r\n');
});
test('DAMAGE reads token type at the next outer iteration, not after each match',()=>{
  const f=fixture();f.token(2,'T');f.token(3,'SH');const crlf=f.io.crlf;let n=0;f.io.crlf=function*(){yield*crlf();if(++n===2){f.low.write('typlst',BigInt(K.KEOL),2);f.low.write('typlst',BigInt(K.KEOL),3);}};done(f.run());assert.equal(f.text(),'\r\nTO     0\r\nTR     0\r\n');
});
test('DAMAGE EQUAL reads compiled DEVICE words and preserves lowercase-token mismatch',()=>{
  const f=fixture();f.token(2,'sh');done(f.run());assert.equal(f.text(),'\r\n');f.emitted.length=0;f.token(2,'ZX');f.high.write('device',packAscii('zx'),1);done(f.run());assert.equal(f.text(),'SH   300\r\n');
});
test('DAMAGE LOGICAL interpretation is supplied explicitly',()=>{
  const f=fixture();f.token(2,'SH');f.io.equal=function*(){return 1n;};done(f.run());assert.equal(f.text(),'\r\n');f.emitted.length=0;f.io.logical=w=>w!==0n;done(f.run());assert.equal(f.events.filter(x=>x.startsWith('odev:')).length,9);
});
test('DAMAGE OFLT retains the reference selected before a suspended adapter resumes',()=>{
  const f=fixture(),oflt=f.io.oflt;f.io.oflt=function*(a,w){yield 'oflt';yield*oflt(a,w);};const g=f.run();assert.equal(g.next().value,'oflt');f.low.write('who',2n);f.high.write('shpdam',123n,1,1);done(g);assert.equal(f.text(),'\r\nSH    12\r\n');
});
test('DAMAGE reversed token bounds are an explicit compiler DO entry decision',()=>{
  const f=fixture();f.m.write(f.stoken,16n);f.token(16,'SH');done(f.run());assert.equal(f.text(),'\r\n');assert.equal(f.m.read(f.locals.i),16n);
  f.emitted.length=0;f.io.enterTokenLoop=()=>true;done(f.run());assert.equal(f.text(),'SH   300\r\n');assert.equal(f.m.read(f.locals.i),17n);
});
test('DAMAGE tests LONG for header padding after the first column label returns',()=>{
  const f=fixture(0),out=f.io.out;f.io.out=function*(name,lines){yield*out(name,lines);if(name==='dmhdr1')f.low.write('oflg',BigInt(K.LONG));};done(f.run());
  assert.equal(f.text(),'\r\nDevice             Damage\r\n\r\nDeflector Shields  300.0 units\r\n');assert.ok(!f.events.includes('damrep'));
});
test('DAMAGE positive format other than LONG selects long names without LONG-only padding or units',()=>{
  const f=fixture(2);done(f.run());assert.equal(f.text(),'\r\nDamage Report for Lexington\r\n\r\nDevice    Damage\r\n\r\nDeflector Shields  300.0\r\n');
});
test('DAMAGE processes KMAXTK inclusively without reading the following token type',()=>{
  const f=fixture();f.m.write(f.stoken,BigInt(K.KMAXTK));f.token(K.KMAXTK,'SH');done(f.run());assert.equal(f.text(),'\r\nSH   300\r\n');assert.equal(f.m.read(f.locals.i),BigInt(K.KMAXTK+1));
});
