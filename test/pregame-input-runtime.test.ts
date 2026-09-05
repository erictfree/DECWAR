import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameInputRuntimeFixture as fixture,drivePregame } from './fixtures/pregame-input-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { pregame,constants as K,messages as M } from '../src/generated/source-data.ts';
import { packAscii } from '../src/compat/word36.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { dispatchPregame } from '../src/game/pregame.ts';

for(const [i,entry] of pregame.entries())test(`Statement XGTCMD matches source slot ${i+1} ${entry.words.join('')}`,()=>{
  const f=fixture(entry.words.join('').trim());drivePregame(f);assert.equal(f.m.read(f.pregameInput.cmd),BigInt(i+1));assert.equal(f.m.read(f.pregameInput.locals.i),17n);assert.equal(f.text(),'\r\nPG> \r');
});
test('Statement XGTCMD emits separate PG and greater-than-space literal calls',()=>{
  const f=fixture(),out=f.pregameInput.io.out2c;f.pregameInput.io.out2c=function*(t){yield*out(t);yield t;};const g=f.pregameInput.run();assert.equal(g.next().value,'PG');assert.equal(f.text(),'\r\nPG');assert.equal(f.m.read(f.pregameInput.cmd),77n);assert.equal(g.next().value,'> ');assert.equal(f.text(),'\r\nPG> ');drivePregame(f,g);
});
test('Statement XGTCMD clears CCFLG only after initial CRLF returns',()=>{
  const f=fixture(),crlf=f.pregameInput.io.crlf;f.ini.state.ccflg=-1n;f.pregameInput.io.crlf=function*(){yield*crlf();yield 'crlf';};const g=f.pregameInput.run();assert.equal(g.next().value,'crlf');assert.equal(f.ini.state.ccflg,-1n);drivePregame(f,g);assert.equal(f.ini.state.ccflg,0n);
});
test('Statement XGTCMD repeated false INPUT results do not reprompt or check interrupt flags',()=>{
  const f=fixture(),input=f.pregameInput.io.input;let n=0;f.pregameInput.io.input=function*(ms){if(++n<=2){f.ini.state.ccflg=-1n;yield 'timeout';return 0n;}f.ini.state.ccflg=0n;return yield*input(ms);};const g=f.pregameInput.run();assert.equal(g.next().value,'timeout');assert.equal(g.next().value,'timeout');assert.equal(f.text(),'\r\nPG> ');assert.ok(!f.pregameInput.events.includes('gtkn'));drivePregame(f,g);assert.equal(f.m.read(f.pregameInput.cmd),4n);
});
for(const [text,message] of [['T','ambcom'],['MOVE','maicom'],['ZZZZZ','unkcom']] as const)test(`Statement XGTCMD ${text} prints source ${message} before retrying`,()=>{
  const f=fixture(text);f.editor.feed('HELP\n');drivePregame(f);assert.equal(f.text(),'\r\nPG> \r'+M[message].text+M.forhlp.text+'\r\n\r\nPG> \r');assert.equal(f.m.read(f.pregameInput.cmd),4n);
});
test('Statement XGTCMD empty line retries before CMD initialization',()=>{
  const f=fixture('');f.editor.feed('HELP\n');const gtkn=f.pregameInput.io.gtkn;let n=0;f.pregameInput.io.gtkn=function*(){yield*gtkn();if(++n===1)yield 'empty';};const g=f.pregameInput.run();assert.ok(String(g.next().value).startsWith('hiber:'));assert.equal(g.next().value,'empty');assert.equal(f.m.read(f.pregameInput.cmd),77n);drivePregame(f,g);assert.equal(f.m.read(f.pregameInput.cmd),4n);assert.equal(f.pregameInput.events.filter(e=>e==='crlf').length,2);
});
test('Statement XGTCMD command type and NTOK do not gate pre-game matching',()=>{
  const f=fixture('HELP'),gtkn=f.pregameInput.io.gtkn;f.pregameInput.io.gtkn=function*(){yield*gtkn();f.input.ntok=0;f.low.write('typlst',BigInt(K.KINT),1);};drivePregame(f);assert.equal(f.m.read(f.pregameInput.cmd),4n);
});
test('Statement XGTCMD raw command slash tail bypasses another HIBER',()=>{
  const f=fixture('HELP/TIME');drivePregame(f);assert.equal(f.m.read(f.pregameInput.cmd),4n);const waits=f.wait.operands.length;drivePregame(f);assert.equal(f.m.read(f.pregameInput.cmd),11n);assert.equal(f.wait.operands.length,waits);
});
for(const field of ['ccflg','hungup'] as const)test(`Statement XGTCMD ${field} after GTKN transfers to MONIT before changing CMD`,()=>{
  const f=fixture(),gtkn=f.pregameInput.io.gtkn;f.pregameInput.io.gtkn=function*(){yield*gtkn();f.low.write(field,-1n);};assert.throws(()=>drivePregame(f),/MONIT transfer/);assert.equal(f.m.read(f.pregameInput.cmd),77n);assert.ok(!f.pregameInput.events.some(e=>e.startsWith('equal:')));
});
test('Statement XGTCMD a returning MONIT continues at the next source statement',()=>{
  const f=fixture(),gtkn=f.pregameInput.io.gtkn;f.pregameInput.io.gtkn=function*(){yield*gtkn();f.ini.state.ccflg=-1n;};f.pregameInput.io.monit=function*(){yield 'monit';};const g=f.pregameInput.run();assert.ok(String(g.next().value).startsWith('hiber:'));assert.equal(g.next().value,'monit');finish(g);assert.equal(f.m.read(f.pregameInput.cmd),4n);
});
test('Statement XGTCMD compiler OR controls whether the second operand is evaluated',()=>{
  const f=fixture(),gtkn=f.pregameInput.io.gtkn;f.pregameInput.io.gtkn=function*(){yield*gtkn();f.ini.state.ccflg=-1n;};f.pregameInput.io.or=function*(...p){assert.equal(yield*p[0](),true);yield 'logical';return true;};const g=f.pregameInput.run();assert.ok(String(g.next().value).startsWith('hiber:'));assert.equal(g.next().value,'logical');assert.throws(()=>finish(g),/MONIT transfer/);
});
test('Statement XGTCMD PRECMD uses current compiler storage after EQUAL suspension',()=>{
  const f=fixture('ZZZZZ'),equal=f.pregameInput.io.equal;let first=true;f.pregameInput.io.equal=function*(...a){const v=yield*equal(...a);if(first){first=false;yield 'equal';}return v;};const g=f.pregameInput.run();assert.ok(String(g.next().value).startsWith('hiber:'));assert.equal(g.next().value,'equal');f.m.write(f.pregameInput.locals.precmd+2n,packAscii('ZZZZZ'));finish(g);assert.equal(f.m.read(f.pregameInput.cmd),2n);
});
test('Statement XGTCMD first matching CMD remains live while searching for ambiguity',()=>{
  const f=fixture('T'),out=f.pregameInput.io.out;f.editor.feed('HELP\n');f.pregameInput.io.out=function*(m,n){if(m==='ambcom')yield 'ambiguous';yield*out(m,n);};const g=f.pregameInput.run();assert.ok(String(g.next().value).startsWith('hiber:'));assert.equal(g.next().value,'ambiguous');assert.equal(f.m.read(f.pregameInput.cmd),11n);assert.equal(f.m.read(f.pregameInput.locals.i),12n);drivePregame(f,g);
});
test('Statement XGTCMD negative CMD arithmetic-IF branch is retained after the full scan',()=>{
  const f=fixture('HELP'),equal=f.pregameInput.io.equal,out=f.pregameInput.io.out;f.editor.feed('HELP\n');let first=true;f.pregameInput.io.equal=function*(...a){const v=yield*equal(...a);if(first&&a[1]===f.pregameInput.locals.precmd+30n){first=false;f.m.write(f.pregameInput.cmd,-1n);}return v;};f.pregameInput.io.out=function*(m,n){if(m==='ambcom')yield 'negative';yield*out(m,n);};const g=f.pregameInput.run();assert.ok(String(g.next().value).startsWith('hiber:'));assert.equal(g.next().value,'negative');assert.equal(f.m.read(f.pregameInput.locals.i),17n);assert.equal(f.m.read(f.pregameInput.cmd),-1n);drivePregame(f,g);
});
test('Statement XGTCMD EQUAL call observes current I when assigning a first match',()=>{
  const f=fixture('HELP'),equal=f.pregameInput.io.equal;f.pregameInput.io.equal=function*(...a){const v=yield*equal(...a);if(a[1]===f.pregameInput.locals.precmd+6n)f.m.write(f.pregameInput.locals.i,9n);return v;};drivePregame(f);assert.equal(f.m.read(f.pregameInput.cmd),9n);
});
test('Statement XGTCMD CMD can alias a source token word and change later matching',()=>{
  const f=fixture('HELP'),out=f.pregameInput.io.out;f.pregameInput.io.out=function*(m,n){yield m;yield*out(m,n);};const g=f.pregameInput.run(f.low.address('tknlst',1));assert.ok(String(g.next().value).startsWith('hiber:'));assert.equal(g.next().value,'unkcom');assert.equal(f.low.read('tknlst',1),0n);assert.equal(f.m.read(f.pregameInput.cmd),77n);
});
test('Statement XGTCMD initial input failure preserves caller CMD and prior I',()=>{
  const f=fixture();f.pregameInput.io.input=function*(){throw new Error('input fault');};assert.throws(()=>drivePregame(f),/input fault/);assert.equal(f.m.read(f.pregameInput.cmd),77n);assert.equal(f.m.read(f.pregameInput.locals.i),88n);assert.equal(f.text(),'\r\nPG> ');
});
test('Statement XGTCMD failed EQUAL retains zero CMD and the current DO index',()=>{
  const f=fixture();f.pregameInput.io.equal=function*(){throw new Error('equal fault');};assert.throws(()=>drivePregame(f),/equal fault/);assert.equal(f.m.read(f.pregameInput.cmd),0n);assert.equal(f.m.read(f.pregameInput.locals.i),1n);
});
test('Statement XGTCMD failed CMD assignment retains prior value after completed token input',()=>{
  const f=fixture(),assign=f.pregameInput.io.assign;f.pregameInput.io.assign=function*(a,t,v){if(a()===f.pregameInput.cmd)throw new Error('store fault');yield*assign(a,t,v);};assert.throws(()=>drivePregame(f),/store fault/);assert.equal(f.m.read(f.pregameInput.cmd),77n);assert.equal(f.input.tokens[0].text,'HELP');
});
test('Statement XGTCMD preserves compiler zero-trip loop policy without inventing a match',()=>{
  const f=fixture(),out=f.pregameInput.io.out;f.pregameInput.io.enterLoop=()=>false;f.pregameInput.io.out=function*(m,n){yield m;yield*out(m,n);};const g=f.pregameInput.run();assert.ok(String(g.next().value).startsWith('hiber:'));assert.equal(g.next().value,'unkcom');assert.equal(f.m.read(f.pregameInput.cmd),0n);assert.equal(f.m.read(f.pregameInput.locals.i),1n);
});
test('Statement XGTCMD HELP result dispatches to raw HELP with the same modifier words',()=>{
  const f=fixture('HELP ENERGY');drivePregame(f);const before=f.text();const ctx={ccflg:0n,hungup:0n,pasflg:0n};finish(dispatchPregame(ctx,Number(f.m.read(f.pregameInput.cmd)),new TerminalOutput(),{logical:w=>w<0n,*monit(){throw new Error('unexpected MONIT');},literal(){throw new Error('unexpected literal');},*invoke(call){assert.deepEqual(call,{routine:'help'});yield*f.command.run();}}));assert.equal(f.text().slice(before.length),'\r\nBody\n');assert.equal(f.low.read('who'),0n);
});

test('Statement XGTCMD consumes INI input through raw INPUT, GTKN and IICH without HIBER',()=>{
  const f=fixture();f.ini.install();f.ini.load('HELP\n');drivePregame(f);assert.equal(f.m.read(f.pregameInput.cmd),4n);assert.equal(f.wait.operands.length,0);assert.equal(f.ini.state.iniflg,-1n);assert.ok(f.text().includes('HELP\n'));
});
test('Statement XGTCMD INI EOF can switch to terminal midway through its command token',()=>{
  const f=fixture();f.editor.bytes.length=0;f.editor.feed('LP\n');f.ini.install();f.ini.load('HE');drivePregame(f);assert.equal(f.m.read(f.pregameInput.cmd),4n);assert.equal(f.input.tokens[0].text,'HELP');assert.equal(f.ini.state.iniflg,0n);assert.equal(f.ini.block.read('ic'),f.editor.terminalTarget);
});
test('Statement XGTCMD aliased CMD and I retain the compiled-loop fixture writes',()=>{
  const f=fixture('ZZZZZ');drivePregame(f,f.pregameInput.run(f.pregameInput.locals.i));assert.equal(f.m.read(f.pregameInput.locals.i),17n);assert.equal(f.m.read(f.pregameInput.cmd),77n);assert.ok(!f.pregameInput.events.includes('unkcom'));
});
