import test from 'node:test';
import assert from 'node:assert/strict';
import { locateRuntimeFixture as fixture } from './fixtures/locate-runtime.ts';
import { moveRuntimeFixture } from './fixtures/move-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { packAscii,MIN_INTEGER } from '../src/compat/word36.ts';
import { orderedRational as real } from './support/rational-real.ts';
const readReal=(f:ReturnType<typeof fixture>,name:'dv'|'dh')=>real.toInteger(f.realAt(f.locals[name]));
const results=(f:ReturnType<typeof fixture>)=>[f.m.read(f.locals.locate),f.m.read(f.locals.reloc)];

test('Memory LOCATE absolute coordinates composes raw EQUAL and INGAL without moving other token fields',()=>{
  const f=fixture(),before=f.input.tokens.map(t=>({...t}));assert.equal(finish(f.run()),2n);assert.deepEqual(f.values(),[12n,20n]);assert.deepEqual(results(f),[2n,2n]);assert.equal(f.low.read('ntok'),3n);
  for(let i=0;i<K.KMAXTK;i++)assert.deepEqual({...f.input.tokens[i],value:before[i].value},before[i]);
  assert.equal(f.events.filter(e=>e.startsWith('equal:')).length,3);assert.deepEqual(f.checkEvents.filter(e=>e.startsWith('ingal:')),['ingal:12,5','ingal:5,20']);assert.equal(f.text(),'');
});
for(const [line,mode,expected] of [
  ['MOVE 1 -2',K.KREL,[11n,18n]],['MOVE A 1 2',K.KREL,[1n,2n]],['MOVE R 1 2',K.KABS,[11n,22n]],
  ['MOVE R 1 2',K.KREL,[11n,22n]],['MOVE A 1 2',K.KABS,[1n,2n]],
] as const)test(`Memory LOCATE ${line} with mode ${mode} retains source offsets`,()=>{
  const f=fixture(line);f.low.write('icflg',BigInt(mode));assert.equal(finish(f.run()),2n);assert.deepEqual(f.values(),expected);
});
for(const line of ['MOVE','MOVE ABSOLUTE','MOVE RELATIVE'])test(`Memory LOCATE ${line} returns zero before required count`,()=>{
  const f=fixture(line);assert.equal(finish(f.run()),0n);assert.deepEqual(results(f),[0n,0n]);assert.equal(f.text(),'');assert.equal(f.m.read(f.locals.index),77n);
});
test('Memory LOCATE EOL preserves REAL locals after ISIGN/IABS and stores both abort results',()=>{
  const f=fixture('');assert.equal(finish(f.run()),-1n);assert.deepEqual(results(f),[-1n,-1n]);assert.deepEqual([readReal(f,'dv'),readReal(f,'dh')],[99n,99n]);assert.equal(f.m.read(f.locals.sign),1n);assert.equal(f.m.read(f.locals.max),2n);assert.deepEqual(f.events,[]);
});
for(const [line,n,message] of [['MOVE X',2n,'erloc1'],['MOVE X 2 3',-2n,'erloc2'],['MOVE 11 X',2n,'erloc7']] as const)test(`Memory LOCATE ${message} retains values before raw output and abort`,()=>{
  const f=fixture(line,n),before=f.input.tokens.map(t=>t.value);assert.equal(finish(f.run()),-1n);assert.deepEqual(f.input.tokens.map(t=>t.value),before);assert.equal(f.text(),M[message].text+'\r\n');assert.deepEqual(results(f),[-1n,-1n]);
});
test('Memory LOCATE optional count and odd scalar bypass scalar conversion/range checks',()=>{
  const f=fixture('TORPEDO -999 1 2',-5n);f.low.write('icflg',BigInt(K.KREL));assert.equal(finish(f.run()),3n);assert.deepEqual(f.values(),[-999n,11n,22n]);
  assert.deepEqual(f.checkEvents.filter(e=>e.startsWith('ingal:')),['ingal:11,5','ingal:5,22']);
});
for(const [line,expected,message] of [['MOVE 0 22',[0n],'erloc8'],['MOVE 12 76',[12n,76n],'erloc9']] as const)test(`Memory LOCATE ${message} leaves invalid assignment intact`,()=>{
  const f=fixture(line);assert.equal(finish(f.run()),-1n);assert.deepEqual(f.values(expected.length),expected);assert.equal(f.text(),M[message].text+'\r\n');
});
for(const bound of [1,75])test(`Memory LOCATE raw INGAL includes boundary ${bound}`,()=>{
  const f=fixture(`MOVE ${bound} ${bound}`);assert.equal(finish(f.run()),2n);assert.deepEqual(f.values(),[BigInt(bound),BigInt(bound)]);
});
test('Memory LOCATE mixed REAL coordinate assignments use supplied conversion even in absolute mode',()=>{
  const f=fixture(),assign=f.io.assign;f.io.assign=function*(d,type,v){if(type==='integer'&&v.type==='real'){f.events.push('mixed');const a=yield*v.evaluate();f.m.write(d(),real.toInteger(f.rawPower.decode(a))+1n);}else yield*assign(d,type,v);};
  finish(f.run());assert.deepEqual(f.values(),[13n,21n]);assert.equal(f.events.filter(e=>e==='mixed').length,2);
});
test('Memory LOCATE COMPUTED expands backwards through raw name search and board reads',()=>{
  const f=fixture('MOVE COMPUTED NIMITZ ROMULAN',4n),offsets=f.input.tokens.map(t=>t.offset);assert.equal(finish(f.run()),4n);assert.deepEqual(f.values(),[30n,40n,50n,60n]);assert.equal(f.low.read('ntok'),4n);
  assert.deepEqual(f.input.tokens.slice(0,4).map(t=>t.text),['NIMIT','ROMUL','NIMIT','ROMUL']);assert.deepEqual(f.input.tokens.map(t=>t.offset),offsets);assert.deepEqual(f.input.tokens.slice(0,4).map(t=>t.type),[1,1,1,1]);assert.equal(f.m.read(f.locals.i),0n);assert.equal(f.m.read(f.locals.j),2n);assert.deepEqual(results(f),[4n,4n]);
});
test('Memory LOCATE COMPUTED keeps scalar and stale token text after NTOK',()=>{
  const f=fixture('TORPEDO COMPUTED 999 NIMITZ',3n);assert.equal(finish(f.run()),3n);assert.deepEqual(f.values(),[999n,30n,40n]);assert.equal(f.input.tokens[3].type,K.KALF);assert.equal(f.m.read(f.locals.p),2n);
});
for(const [n,message] of [[2n,'erloc1'],[-2n,'erloc2']] as const)test(`Memory LOCATE COMPUTED shifts and changes NTOK before ${message}`,()=>{
  const f=fixture('MOVE COMPUTED NIMITZ ROMULAN',n);assert.equal(finish(f.run()),-1n);assert.equal(f.low.read('ntok'),4n);assert.equal(f.input.tokens[0].text,'NIMIT');assert.equal(f.input.tokens[0].type,K.KALF);assert.equal(f.text(),M[message].text+'\r\n');
});
for(const [name,message] of [['MISSING','erloc4'],['123','erloc3']] as const)test(`Memory LOCATE COMPUTED retains later expansion before ${message}`,()=>{
  const f=fixture(`MOVE COMPUTED ${name} ROMULAN`,name==='123'?3n:4n);
  if(name==='123'){f.parse('MOVE COMPUTED NIMITZ 123');f.m.write(f.n,4n);}
  assert.equal(finish(f.run()),-1n);assert.equal(f.text(),M[message].text+'\r\n');if(name==='MISSING')assert.deepEqual(f.values(4).slice(2),[50n,60n]);
});
for(const alive of [-2n,-1n,0n,1n])for(const code of [0,102])test(`Memory LOCATE COMPUTED ALIVE ${alive}, board ${code}`,()=>{
  const f=fixture('MOVE COMPUTED N');f.high.write('alive',alive,2);f.views.high.board.setdsp(30,40,code);const valid=alive<0n&&code>0;assert.equal(finish(f.run()),valid?2n:-1n);assert.equal(f.text(),valid?'':M.noship.text+'\r\n');
});
for(const rom of [-1n,0n,1n])test(`Memory LOCATE COMPUTED ROM flag ${rom} uses required logical policy`,()=>{
  const f=fixture('MOVE COMPUTED ROM');f.high.write('rom',rom);assert.equal(finish(f.run()),rom<0n?2n:-1n);if(rom<0n)assert.deepEqual(f.values(),[50n,60n]);
});
test('Memory LOCATE computed computer damage outputs before token shift and pause',()=>{
  const f=fixture('MOVE COMPUTED N');f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDCOMP);f.high.write('job',9600n,1,K.KTTYSP);assert.equal(finish(f.run()),-1n);assert.equal(f.low.read('ntok'),3n);assert.equal(f.input.tokens[0].text,'MOVE');assert.ok(!f.events.some(e=>e.startsWith('pause')));assert.equal(f.text(),M.damcom.text+'\r\n');
});
for(const [baud,password,wait] of [[300n,0n,false],[301n,0n,true],[9600n,-1n,false]] as const)test(`Memory LOCATE computed baud ${baud}, password ${password}`,()=>{
  const f=fixture('MOVE COMPUTED N');f.high.write('job',baud,1,K.KTTYSP);f.low.write('pasflg',password);const g=f.run(),first=g.next();
  if(wait){assert.equal(first.value,`pause:${baud*2n}`);assert.equal(f.input.tokens[0].text,'MOVE');f.low.write('tknlst',packAscii('ROMUL'),3);assert.equal(finish(g),2n);assert.deepEqual(f.values(),[50n,60n]);}else assert.deepEqual(first,{done:true,value:2n});
});
test('Memory LOCATE COMPUTED exposes zero-trip policy for absent names and scalar-only expansion',()=>{
  const empty=fixture('MOVE COMPUTED');assert.equal(finish(empty.run()),0n);assert.equal(empty.low.read('ntok'),0n);assert.ok(empty.events.includes('bounds:1,0,1'));
  const scalar=fixture('MOVE COMPUTED 999',1n);assert.equal(finish(scalar.run()),1n);assert.deepEqual(scalar.values(),[999n]);assert.ok(scalar.events.includes('bounds:1,2,-1'));
});
test('Memory LOCATE supplied first-trip policy for empty COMPUTED executes the source shift',()=>{
  const f=fixture('MOVE COMPUTED');f.low.write('tknlst',packAscii('TAIL'),3);f.io.enterLoop=()=>true;assert.equal(finish(f.run()),0n);assert.equal(f.input.tokens[0].text,'TAIL');assert.equal(f.m.read(f.locals.i),2n);
});
test('Memory RELOC awaits prompt OUT and GTKN before P, sign and REAL initialization',()=>{
  const f=fixture('MOVE'),out=f.io.out;f.io.out=function*(...a){yield 'output';yield*out(...a);};const g=f.run('reloc');assert.equal(g.next().value,'output');assert.equal(f.m.read(f.locals.p),77n);assert.equal(f.text(),'');assert.equal(g.next().value,'input');assert.equal(f.text(),M.coord1.text);assert.equal(f.m.read(f.locals.p),77n);assert.equal(readReal(f,'dv'),99n);
  f.input.acceptLine('12 24');assert.equal(finish(g),2n);assert.deepEqual(f.values(),[12n,24n]);
});
test('Memory LOCATE awaits raw output before setting either error return word',()=>{
  const f=fixture('MOVE X'),out=f.io.out;f.io.out=function*(...a){yield 'output';yield*out(...a);};const g=f.run();assert.equal(g.next().value,'output');assert.deepEqual(results(f),[1n,1n]);assert.equal(f.text(),'');assert.equal(finish(g),-1n);assert.deepEqual(results(f),[-1n,-1n]);
});
test('Memory LOCATE error output failure leaves prior result and token mutation',()=>{
  const f=fixture('MOVE COMPUTED NIMITZ ROMULAN');f.io.out=function*(){throw new Error('output fault');};assert.throws(()=>finish(f.run()),/output fault/);assert.deepEqual(results(f),[4n,4n]);assert.equal(f.low.read('ntok'),4n);assert.equal(f.input.tokens[0].text,'NIMIT');
});
test('Memory LOCATE reads actual count again after ISIGN suspension before IABS',()=>{
  const f=fixture(),isign=f.io.isign;f.io.isign=function*(...a){const sign=yield*isign(...a);yield 'sign';return sign;};const g=f.run();assert.equal(g.next().value,'sign');f.m.write(f.n,-3n);assert.equal(finish(g),-1n);assert.equal(f.m.read(f.locals.sign),1n);assert.equal(f.m.read(f.locals.max),3n);assert.equal(f.text(),M.erloc1.text+'\r\n');
});
test('Memory LOCATE count aliases P and sees the entry assignment',()=>{
  const f=fixture();f.m.write(f.locals.p,-99n);assert.equal(finish(f.run('locate',f.locals.p)),2n);assert.equal(f.m.read(f.locals.sign),1n);assert.equal(f.m.read(f.locals.max),2n);
});
test('Memory LOCATE IABS minimum behavior remains a required intrinsic policy',()=>{
  const f=fixture('MOVE 12 20',MIN_INTEGER);assert.throws(()=>finish(f.run()),/IABS minimum/);assert.equal(f.m.read(f.locals.sign),-1n);assert.equal(f.m.read(f.locals.max),77n);assert.equal(readReal(f,'dv'),99n);
});
test('Memory LOCATE FLOAT offset calls reread WHO independently',()=>{
  const f=fixture('MOVE 1 2');f.low.write('icflg',BigInt(K.KREL));const convert=f.io.convert;let first=true;f.io.convert=function*(...a){const v=yield*convert(...a);if(first){first=false;yield 'float';}return v;};const g=f.run();assert.equal(g.next().value,'float');f.low.write('who',2n);assert.equal(finish(g),2n);assert.deepEqual(f.values(),[11n,42n]);assert.deepEqual([readReal(f,'dv'),readReal(f,'dh')],[10n,40n]);
});
test('Memory LOCATE raw EQUAL waits with live token memory and preserves the following match order',()=>{
  const f=fixture('MOVE A 1 2'),ildb=f.eq.ildb;let first=true;f.eq.ildb=function*(p){if(first){first=false;yield 'byte';}return yield*ildb(p);};const g=f.run();assert.equal(g.next().value,'byte');f.low.write('tknlst',packAscii('R'),2);assert.equal(finish(g),2n);assert.deepEqual(f.values(),[11n,22n]);assert.equal(f.events.filter(e=>e.startsWith('equal')).length,2);
});
test('Memory LOCATE computed DISP waits then rereads coordinates without rechecking ALIVE',()=>{
  const f=fixture('MOVE COMPUTED N'),disp=f.io.disp;f.io.disp=function*(...a){const code=yield*disp(...a);yield 'board';return code;};const g=f.run();assert.equal(g.next().value,'board');f.high.write('alive',0n,2);f.high.write('shpcon',31n,2,K.KVPOS);f.high.write('shpcon',41n,2,K.KHPOS);assert.equal(finish(g),2n);assert.deepEqual(f.values(),[31n,41n]);
});
test('Memory LOCATE computed coordinate/type stores remain separate after DISP',()=>{
  const f=fixture('MOVE COMPUTED N'),assign=f.io.assign;let armed=false;const disp=f.io.disp;f.io.disp=function*(...a){const result=yield*disp(...a);armed=true;return result;};f.io.assign=function*(d,...a){if(armed&&d()===f.low.address('typlst',1))throw new Error('type store fault');yield*assign(d,...a);};
  assert.throws(()=>finish(f.run()),/type store fault/);assert.equal(f.low.read('vallst',1),30n);assert.equal(f.low.read('typlst',1),BigInt(K.KALF));assert.deepEqual(results(f),[2n,2n]);
});
test('Memory LOCATE distinct return words permit partial second-result failure',()=>{
  const f=fixture(),assign=f.io.assign;f.io.assign=function*(d,...a){if(d()===f.locals.reloc)throw new Error('return store');yield*assign(d,...a);};assert.throws(()=>finish(f.run()),/return store/);assert.deepEqual(results(f),[2n,77n]);assert.equal(f.low.read('vallst',1),0n);
});
test('Memory RELOC returns its own live result word after coordinate conversion',()=>{
  const f=fixture('12 20'),ingal=f.io.ingal;f.io.gtkn=function*(){};f.io.ingal=function*(...a){const result=yield*ingal(...a);f.m.write(f.locals.reloc,19n);return result;};assert.equal(finish(f.run('reloc')),19n);assert.deepEqual(results(f),[2n,19n]);
});
test('Memory LOCATE and RELOC result storage can share the compiler-selected address',()=>{
  const f=fixture();f.locals.reloc=f.locals.locate;assert.equal(finish(f.run()),2n);assert.deepEqual(f.values(),[12n,20n]);
});
test('Memory LOCATE initial error retains separate return assignment alias effects',()=>{
  const f=fixture('');f.locals.reloc=f.locals.p;assert.equal(finish(f.run()),-1n);assert.equal(f.m.read(f.locals.p),-1n);
});
test('Memory MOVE now awaits LOCATE raw EQUAL before undocking or CHECK',()=>{
  const f=moveRuntimeFixture(),ildb=f.eq.ildb;let first=true;f.eq.ildb=function*(p){if(first){first=false;yield 'equal';}return yield*ildb(p);};const g=f.run();assert.equal(g.next().value,'equal');assert.equal(f.ship.docked,true);assert.equal(f.ship.energy,10000n);assert.ok(!f.events.includes('check'));assert.equal(finish(g).alternateReturn,false);assert.equal(f.ship.v,12);
});
test('Memory MOVE RELOC raw prompt failure leaves original deadline and LOCATE entry state',()=>{
  const f=moveRuntimeFixture('MOVE');f.location.io.out=function*(){throw new Error('prompt fault');};assert.throws(()=>finish(f.run()),/prompt fault/);assert.equal(f.m.read(f.locals.v),3100n);assert.equal(f.ship.docked,true);assert.equal(f.m.read(f.locateLocal.p),2n);assert.equal(f.low.read('ptime'),99n);
});

test('Memory LOCATE count zero uses ISIGN positive branch for nonempty coordinates',()=>{
  const f=fixture('MOVE 12 20',0n);assert.equal(finish(f.run()),-1n);assert.equal(f.m.read(f.locals.sign),1n);assert.equal(f.text(),M.erloc1.text+'\r\n');
});
test('Memory LOCATE raw EQUAL preserves source lowercase-token mismatch',()=>{
  const f=fixture('MOVE A 1 2');f.low.write('tknlst',packAscii('a'),2);assert.equal(finish(f.run()),-1n);assert.equal(f.text(),M.erloc1.text+'\r\n');assert.equal(f.events.filter(e=>e.startsWith('equal')).length,3);
});
test('Memory LOCATE computed first matching name wins even when that player is absent',()=>{
  const f=fixture('MOVE COMPUTED N');f.high.write('names',packAscii('NIMIT'),1,1);f.high.write('alive',0n,1);assert.equal(finish(f.run()),-1n);assert.equal(f.m.read(f.locals.j),1n);assert.equal(f.text(),M.noship.text+'\r\n');assert.ok(!f.events.includes('disp'));
});
test('Memory LOCATE COMPUTED applies the supplied logical interpretation to positive ALIVE',()=>{
  const f=fixture('MOVE COMPUTED N');f.high.write('alive',1n,2);f.io.logical=w=>w!==0n;assert.equal(finish(f.run()),2n);assert.deepEqual(f.values(),[30n,40n]);
});
test('Memory LOCATE COMPUTED rejects a raw DISP negative sentinel',()=>{
  const f=fixture('MOVE COMPUTED N');f.io.disp=function*(){return -1n;};assert.equal(finish(f.run()),-1n);assert.equal(f.text(),M.noship.text+'\r\n');
});
test('Memory LOCATE computed shift fails after text before type/value fields',()=>{
  const f=fixture('MOVE COMPUTED N'),assign=f.io.assign;f.io.assign=function*(d,...a){if(d()===f.low.address('typlst',1))throw new Error('shift type fault');yield*assign(d,...a);};
  assert.throws(()=>finish(f.run()),/shift type fault/);assert.equal(f.input.tokens[0].text,'N');assert.equal(f.low.read('vallst',1),0n);assert.equal(f.low.read('ntok'),3n);assert.deepEqual(results(f),[77n,77n]);assert.equal(f.m.read(f.locals.i),1n);
});
test('Memory LOCATE computed shift rereads P between text and type/value assignments',()=>{
  const f=fixture('MOVE COMPUTED N ROMULAN',4n),assign=f.io.assign;let first=true;
  f.io.assign=function*(d,...a){yield*assign(d,...a);if(first&&d()===f.low.address('tknlst',1)){first=false;yield 'shift';}};
  const g=f.run();assert.equal(g.next().value,'shift');assert.equal(f.input.tokens[0].text,'N');f.m.write(f.locals.p,3n);f.low.write('typlst',99n,4);f.low.write('vallst',123n,4);
  assert.equal(finish(g),-1n);assert.equal(f.low.read('typlst',1),99n);assert.equal(f.low.read('vallst',1),123n);assert.equal(f.text(),M.erloc3.text+'\r\n');
});
test('Memory LOCATE numeric DO limit is captured but coordinate termination reads current NTOK',()=>{
  const f=fixture(),bounds=f.io.bounds;f.io.bounds=function*(...a){const b=yield*bounds(...a);yield 'bounds';return b;};const g=f.run();assert.equal(g.next().value,'bounds');f.low.write('ntok',2n);assert.equal(finish(g),2n);assert.equal(f.m.read(f.locals.i),4n);assert.equal(f.m.read(f.locals.p),3n);assert.equal(f.m.read(f.locals.index),2n);assert.equal(f.low.read('vallst',1),12n);assert.equal(f.low.read('vallst',2),12n);assert.equal(f.events.filter(e=>e==='ingal').length,1);
});
test('Memory LOCATE numeric loop type failure keeps current I at the failing token',()=>{
  const f=fixture('MOVE 11 X');assert.equal(finish(f.run()),-1n);assert.equal(f.m.read(f.locals.i),3n);assert.equal(f.m.read(f.locals.index),77n);
});
test('Memory LOCATE computed pause evaluates live baud through the call expression',()=>{
  const f=fixture('MOVE COMPUTED N'),pause=f.io.pause;f.high.write('job',301n,1,K.KTTYSP);f.io.pause=function*(ms){yield 'before-pause';yield*pause(ms);};const g=f.run();assert.equal(g.next().value,'before-pause');f.high.write('job',9600n,1,K.KTTYSP);assert.equal(g.next().value,'pause:19200');assert.equal(finish(g),2n);
});
test('Memory LOCATE repeated entry retains inactive computed locals and error leaves REAL offsets',()=>{
  const f=fixture('MOVE COMPUTED N');finish(f.run());const saved=['k','j'].map(n=>f.m.read(f.locals[n as 'k'|'j']));f.parse('MOVE 1 2');f.low.write('icflg',BigInt(K.KREL));finish(f.run());assert.deepEqual(['k','j'].map(n=>f.m.read(f.locals[n as 'k'|'j'])),saved);f.parse('');assert.equal(finish(f.run()),-1n);assert.deepEqual([readReal(f,'dv'),readReal(f,'dh')],[10n,20n]);
});
test('Memory LOCATE error stores reread LOCATE when copying into RELOC',()=>{
  const f=fixture(''),assign=f.io.assign;f.io.assign=function*(d,...a){yield*assign(d,...a);if(d()===f.locals.locate)yield 'return';};const g=f.run();assert.equal(g.next().value,'return');assert.deepEqual(results(f),[-1n,77n]);f.m.write(f.locals.locate,23n);assert.equal(finish(g),23n);assert.deepEqual(results(f),[23n,23n]);
});
test('Memory MOVE COMPUTED composes raw location, path, energy and board writes',()=>{
  const f=moveRuntimeFixture('MOVE COMPUTED N');f.high.write('names',packAscii('NIMIT'),2,1);f.high.write('alive',-1n,2);f.high.write('shpcon',14n,2,K.KVPOS);f.high.write('shpcon',20n,2,K.KHPOS);f.views.high.board.setdsp(14,20,102);
  assert.equal(finish(f.run()).alternateReturn,false);assert.equal(f.ship.v,13);assert.equal(f.ship.energy,9360n);assert.equal(f.views.high.board.disp(13,20),101);assert.equal(f.views.high.board.disp(14,20),102);assert.equal(f.text(),M.move10.text+'\r\n');assert.deepEqual([f.low.read('vallst',1),f.low.read('vallst',2)],[14n,20n]);
});
