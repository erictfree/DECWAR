import test from 'node:test';
import assert from 'node:assert/strict';
import { moveRuntimeFixture } from './fixtures/move-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { tokenFlags as tf } from '../src/compat/token-runtime.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36,packAscii,unpackAscii } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { orderedRational as real } from './support/rational-real.ts';
import { inli } from '../src/compat/inli.ts';
import { inputRuntime } from '../src/compat/input-runtime.ts';
function fixture(line='MOVE 12 20'){
  const f=moveRuntimeFixture();f.input.acceptEditedLine(line);f.tokens.state.bufptr=f.input.lineAddress-1n;f.tokens.gtknIO.inli=function*(){f.tokens.events.push('inli');yield 'input';};return f;
}
function next(f:ReturnType<typeof fixture>){f.tokens.state.bufptr=f.input.lineAddress;f.r.x1=0n;return f.tokens.next();}
const words=(f:ReturnType<typeof fixture>,field='vallst',count=Number(f.low.read('ntok')))=>Array.from({length:count},(_,i)=>f.low.read(field,i+1));
for(const [line,text,type,value] of [['123','123',K.KINT,123n],['-123','-123',K.KINT,-123n],['+','+',K.KNUL,0n],['-','-',K.KNUL,0n],['--1','--1',K.KALF,0n],['1-2','1-2',K.KALF,0n],['123AB','123AB',K.KALF,0n],['abcdefg','ABCDE',K.KALF,0n]] as const)test(`Raw GTKN token ${line} preserves flags, type and five-character text`,()=>{
  const f=fixture(line),stack=f.r.s;f.r.x1=77n;f.r.x2=88n;finish(f.tokens.run());assert.equal(f.low.read('ntok'),1n);assert.equal(f.input.tokens[0].text,text);assert.equal(f.low.read('typlst',1),BigInt(type));assert.equal(f.low.read('vallst',1),value);assert.equal(f.r.s,stack);assert.equal(f.r.x1,77n);assert.equal(f.r.x2,88n);assert.equal(f.low.read('ptrlst',1),f.input.lineAddress);assert.equal(f.tokens.state.bufptr,-1n);
});
for(const line of ['', '   ', '\t\t'])test(`Raw GTKN empty spacing ${JSON.stringify(line)} returns zero and leaves EOL pointer`,()=>{
  const f=fixture(line);f.low.write('ptrlst',91n,2);finish(f.tokens.run());assert.equal(f.low.read('ntok'),0n);assert.equal(f.low.read('typlst',1),-1n);assert.equal(f.low.read('tknlst',1),0n);assert.equal(f.low.read('ptrlst',2),91n);
});
test('Raw GTKN slash continuation increments the pointer and uses raw OCRL before scanning',()=>{
  const f=fixture('TIME / USERS');finish(f.tokens.run());assert.equal(f.input.tokens[0].text,'TIME');const slash=f.tokens.state.bufptr;assert.equal(f.m.read(slash),47n);finish(f.tokens.run());assert.equal(f.input.tokens[0].text,'USERS');assert.equal(f.text(),'\r\n');assert.equal(f.tokens.events.filter(e=>e==='ocrl').length,2);assert.equal(f.tokens.events.filter(e=>e==='inli').length,0);
});
for(const tail of ['; ignored','\0'])test(`Raw NXTT command ending ${JSON.stringify(tail)} discards the tail`,()=>{
  const f=fixture('TIME');if(tail==='\0'){}else f.input.acceptEditedLine('TIME'+tail);finish(next(f));assert.equal(f.tokens.state.bufptr,-1n);assert.ok((f.r.f&tf.eol)!==0n);assert.equal(f.low.read('tknlst',1),signed36(packAscii('TIME')));
});
test('Raw GTKN numeric overflow wraps before source MOVN rather than using JS numbers',()=>{
  const f=fixture('34359738368 -34359738368');finish(f.tokens.run());assert.deepEqual(words(f),[-34359738368n,-34359738368n]);
});
test('Raw GTKN retains stale token fields and never writes EOL PTRLST',()=>{
  const f=fixture('TIME');f.low.write('ptrlst',777n,2);f.low.write('tknlst',packAscii('STALE'),3);f.low.write('vallst',99n,3);finish(f.tokens.run());assert.equal(f.low.read('ptrlst',2),777n);assert.equal(f.low.read('tknlst',3),signed36(packAscii('STALE')));assert.equal(f.low.read('vallst',3),99n);
});
test('Raw GTKN fourteen tokens ending at EOL fit, but fourteen followed by another token overflow',()=>{
  for(const count of [14,15]){const f=fixture(Array.from({length:count},(_,i)=>String(i+1)).join(' '));finish(f.tokens.run());assert.equal(f.low.read('ntok'),count===14?14n:0n);assert.equal(f.text(),count===14?'\r\n':'\r\nToo many words -- line ignored\r\n');if(count===15){assert.equal(f.low.read('vallst',14),14n);assert.equal(f.tokens.state.bufptr,-1n);}}
});
test('Raw GTKN overflow waits for raw OSTR before clearing NTOK and BUFPTR',()=>{
  const f=fixture(Array(15).fill('X').join(' ')),ostr=f.tokens.gtknIO.ostr;f.low.write('ntok',99n);f.tokens.gtknIO.ostr=function*(){yield 'message';yield*ostr();};const g=f.tokens.run();assert.equal(g.next().value,'message');assert.equal(f.low.read('ntok'),99n);assert.ok(f.tokens.state.bufptr>0n);assert.equal(f.r.x1,14n);assert.equal(f.low.read('typlst',14),BigInt(K.KALF));finish(g);assert.equal(f.low.read('ntok'),0n);
});
test('Raw GTKN preexisting hangup leaves saves, pointer, flags and tokens untouched',()=>{
  const f=fixture();f.wait.state.hungup=-1n;const stack=f.r.s,p=f.tokens.state.bufptr,flag=f.tokens.state.ccflgDot,count=f.low.read('ntok');finish(f.tokens.run());assert.equal(f.r.s,stack);assert.equal(f.tokens.state.bufptr,p);assert.equal(f.tokens.state.ccflgDot,flag);assert.equal(f.low.read('ntok'),count);assert.deepEqual(f.tokens.events,[]);
});
test('Raw GTKN hangup during INLI keeps the AOJA loop-counter half in NTOK',()=>{
  const f=fixture();f.tokens.state.bufptr=-1n;f.low.write('vallst',999n,1);f.low.write('ptrlst',777n,1);f.low.write('ptrlst',888n,2);const g=f.tokens.run();assert.equal(g.next().value,'input');f.wait.state.hungup=-1n;finish(g);assert.equal(f.low.read('ntok'),-3670015n);assert.equal(f.input.tokens[0].text,'QUIT');assert.equal(f.low.read('vallst',1),999n);assert.equal(f.low.read('ptrlst',1),777n);assert.equal(f.low.read('ptrlst',2),888n);assert.equal(f.low.read('typlst',2),-1n);assert.equal(f.tokens.state.bufptr,f.input.lineAddress);
});
test('Raw GTKN interrupt flag skips pointer increment and waits for new input',()=>{
  const f=fixture('TIME / USERS');f.tokens.state.ccflgDot=-1n;const p=f.tokens.state.bufptr,g=f.tokens.run();assert.equal(g.next().value,'input');assert.equal(f.tokens.state.ccflgDot,0n);assert.equal(f.tokens.state.bufptr,p);f.input.acceptEditedLine('STATUS');finish(g);assert.equal(f.input.tokens[0].text,'STATU');assert.equal(f.text(),'');
});
test('Raw GTKN releases remembered lock, awaits INLI and reacquires before parsing',()=>{
  const f=fixture();f.tokens.state.bufptr=-1n;f.locks.write('locked',777n);f.locks.write('loktab',777n,19);const g=f.tokens.run();assert.equal(g.next().value,'input');assert.equal(f.locks.read('loktab',19),0n);assert.equal(f.locks.read('svlock'),777n);f.input.acceptEditedLine('TIME');finish(g);assert.equal(f.locks.read('loktab',19),777n);assert.equal(f.input.tokens[0].text,'TIME');assert.deepEqual(f.wait.events,['unlo:777','lock:777','branch:success']);
});
test('Raw GTKN buffered OCRL suspension precedes F and X1 initialization',()=>{
  const f=fixture('TIME'),ocrl=f.tokens.gtknIO.ocrl;f.r.f=123n;f.r.x1=77n;f.tokens.gtknIO.ocrl=function*(){yield 'newline';yield*ocrl();};const g=f.tokens.run();assert.equal(g.next().value,'newline');assert.equal(f.r.f,123n);assert.equal(f.r.x1,77n);finish(g);assert.equal(f.input.tokens[0].text,'TIME');
});
test('Raw NXTT preserves F left half and restores saved registers through actual S words',()=>{
  const f=fixture('12');f.r.f=signed36(halfWords(123n,0o777777n));f.r.x2=88n;f.r.x3=99n;f.r.p1=77n;const stack=f.r.s;finish(next(f));assert.equal(leftHalf(f.r.f),123n);assert.equal(rightHalf(f.r.f),tf.num|tf.chr|tf.eol);assert.deepEqual([f.r.x2,f.r.x3,f.r.p1,f.r.s],[88n,99n,77n,stack]);
});
test('Raw NXTT byte deposit failure retains partial token, live pointer and saved frames',()=>{
  const f=fixture('ABCDE'),idpb=f.tokens.io.idpb;let n=0;f.tokens.io.idpb=function*(){if(++n===3)throw new Error('deposit fault');yield*idpb();};const stack=f.r.s;assert.throws(()=>finish(next(f)),/deposit fault/);assert.equal(unpackAscii(f.low.read('tknlst',1)).slice(0,2),'AB');assert.equal(f.tokens.state.bufptr,f.input.lineAddress+2n);assert.equal(f.r.x3,2n);assert.notEqual(f.r.s,stack);
});
test('Raw NXTT reads live character/table words after suspension without an ASCII range guard',()=>{
  const f=fixture('A'),read=f.tokens.io.readCharacter;let first=true;f.tokens.io.readCharacter=function*(){if(first){first=false;yield 'read';}return yield*read();};const g=next(f);assert.equal(g.next().value,'read');f.m.write(f.input.lineAddress,200n);f.m.write(f.tokens.symbols.cbits+200n,0n);f.m.write(f.tokens.symbols.cbits+168n,0n);finish(g);assert.equal(f.low.read('tknlst',1),packAscii('('));assert.ok((f.r.f&tf.nnm)!==0n);
});
test('Raw SKPB uses mutable CBITS and leaves full current character classification in C',()=>{
  const f=fixture('A B');f.tokens.state.bufptr=f.input.lineAddress;f.m.write(f.tokens.symbols.cbits+65n,2048n);finish(f.tokens.blanks());assert.equal(f.tokens.state.bufptr,f.input.lineAddress+2n);assert.equal(rightHalf(f.r.c),66n);
});
test('Raw NXTT floating entry requires explicit CPU binding after setting decimal flag',()=>{
  const f=fixture('12.5'),stack=f.r.s;assert.throws(()=>finish(next(f)),/FLTR requires/);assert.ok((f.r.f&tf.pnt)!==0n);assert.equal(f.r.x2,12n);assert.equal(f.r.x3,3n);assert.equal(f.tokens.state.bufptr,f.input.lineAddress+2n);assert.notEqual(f.r.s,stack);
});
for(const line of ['12.5','.5','0.123456','12.'])test(`Raw ANUM explicit rational fixture computes ${line} with source scale operations`,()=>{
  const f=fixture(line);f.tokens.floats();finish(next(f));const wanted=real.literal(line.endsWith('.')?line+'0':line);assert.equal(real.compare(f.rawPower.decode(f.low.read('vallst',1)),wanted),0);assert.ok((f.r.f&tf.pnt)!==0n);
});
test('Raw ANUM overwrites NXTT X3 so decimal token text spills beyond five characters',()=>{
  const f=fixture('0.123456');f.tokens.floats();f.low.write('tknlst',0n,2);finish(next(f));assert.equal(unpackAscii(f.low.read('tknlst',1)),'0.123');assert.equal(unpackAscii(f.low.read('tknlst',2)).slice(0,3),'456');assert.equal(f.tokens.events.filter(e=>e.startsWith('byte:')).length,8);
});
for(const line of ['1.2.3','1.2X','1.2-3'])test(`Raw ANUM ${line} clears numeric flags/value after malformed fractional input`,()=>{
  const f=fixture(line);f.tokens.floats();finish(next(f));assert.equal(f.low.read('vallst',1),0n);assert.ok((f.r.f&tf.nnm)!==0n);assert.equal(f.r.f&(tf.num|tf.pnt|tf.neg|tf.sgn),0n);
});
test('Raw NXTT negative floating token uses MOVN word operation rather than inferred floating negation',()=>{
  const f=fixture('-1.5');f.tokens.floats();let before=0n;const movn=f.tokens.io.movn;f.tokens.io.movn=function*(){before=f.r.x2;yield*movn();};finish(next(f));assert.equal(real.compare(f.rawPower.decode(before),real.literal('1.5')),0);assert.equal(f.low.read('vallst',1),signed36(-before));
});
test('Raw ANUM FAD failure retains scaled T1 and earlier SCALE without a new token byte',()=>{
  const f=fixture('1.5');f.tokens.floats();f.tokens.io.fad=function*(){throw new Error('FAD fault');};assert.throws(()=>finish(next(f)),/FAD fault/);assert.equal(real.compare(f.rawPower.decode(f.r.t1),real.literal('.5')),0);assert.equal(f.m.read(f.tokens.symbols.scale),halfWords(f.tokens.symbols.tenLeftHalf,0n));assert.equal(f.tokens.state.bufptr,f.input.lineAddress+2n);assert.equal(f.tokens.events.filter(e=>e.startsWith('byte:')).length,2);
});
test('Raw GTKN composes existing INLI with typed characters and raw output into token words',()=>{
  const f=fixture();f.tokens.state.bufptr=-1n;const bytes=[...'12 24\n'].map(c=>BigInt(c.charCodeAt(0))),state=inputRuntime(f.input).state;
  f.tokens.gtknIO.inli=function*(){yield*inli(f.input,state,f.r,{*ichr(){assert.ok(bytes.length);return bytes.shift()!;},*flush(){},*ochr(c){f.r.c=c;yield*f.rt.run('ochr.');},*outstr(){throw new Error('unexpected editing');},*outchr(){throw new Error('unexpected editing');},aobjp:w=>add36(w,0o1000001n)});};
  finish(f.tokens.run());assert.deepEqual(words(f),[12n,24n]);assert.equal(f.text(),'\r');assert.equal(f.input.block.read('chrcnt'),6n);
});
test('MOVE RELOC uses raw GTKN on slash-buffered coordinates and retains following command',()=>{
  const f=moveRuntimeFixture('MOVE / 12 20 / TIME');assert.equal(finish(f.run()).alternateReturn,false);assert.deepEqual([f.ship.v,f.ship.h],[12,20]);assert.ok(f.tokens.state.bufptr>0n);finish(f.tokens.run());assert.equal(f.input.tokens[0].text,'TIME');assert.ok(!f.tokens.events.includes('inli'));
});

test('Raw GTKN failed second SAVE retains first saved word before changing input flags',()=>{
  const f=fixture(),push=f.tokens.gtknIO.pushData;f.r.x1=777n;let n=0;f.tokens.gtknIO.pushData=function*(w){if(++n===2)throw new Error('stack fault');yield*push(w);};const flag=f.tokens.state.ccflgDot,p=f.tokens.state.bufptr;assert.throws(()=>finish(f.tokens.run()),/stack fault/);assert.equal(f.m.read(rightHalf(f.r.s)),777n);assert.equal(f.tokens.state.ccflgDot,flag);assert.equal(f.tokens.state.bufptr,p);
});
test('Raw GTKN type selection keeps nonnumeric precedence over decimal and numeric flags',()=>{
  const f=fixture();f.tokens.gtknIO.nxtt=function*(){f.r.f=tf.num|tf.pnt|tf.nnm|tf.eol|tf.chr;};finish(f.tokens.run());assert.equal(f.low.read('typlst',1),BigInt(K.KALF));assert.equal(f.low.read('ntok'),1n);
});
test('Raw GTKN zero-character later token still counts when X1 right half is nonzero',()=>{
  const f=fixture('A,');finish(f.tokens.run());assert.equal(f.low.read('ntok'),2n);assert.equal(f.low.read('typlst',2),BigInt(K.KNUL));assert.equal(f.low.read('typlst',3),BigInt(K.KEOL));
});
test('Raw NXTT restoring a changed saved X2 observes shared stack storage',()=>{
  const f=fixture('12'),pop=f.tokens.io.popData;let first=true;f.tokens.io.popData=function*(){if(first){first=false;yield 'restore';}return yield*pop();};const g=next(f);assert.equal(g.next().value,'restore');f.m.write(rightHalf(f.r.s)-2n,321n);finish(g);assert.equal(f.r.x2,321n);assert.equal(f.low.read('vallst',1),12n);
});
test('Raw decimal point restarts deposits after integer characters exhausted X3',()=>{
  const f=fixture('123456.7');f.tokens.floats();f.low.write('tknlst',0n,2);finish(next(f));assert.equal(unpackAscii(f.low.read('tknlst',1)),'12345');assert.equal(unpackAscii(f.low.read('tknlst',2)).slice(0,2),'.7');assert.equal(real.compare(f.rawPower.decode(f.low.read('vallst',1)),real.literal('123456.7')),0);
});
test('Raw GTKN floating type and EOL clear follow token spill in source order',()=>{
  const f=fixture('0.123456');f.tokens.floats();finish(f.tokens.run());assert.equal(f.low.read('ntok'),1n);assert.equal(f.low.read('typlst',1),BigInt(K.KFLT));assert.equal(f.low.read('tknlst',2),0n);assert.equal(f.low.read('typlst',2),-1n);assert.equal(real.compare(f.rawPower.decode(f.low.read('vallst',1)),real.literal('.123456')),0);
});
test('Raw GTKN forced QUIT reads the supplied literal word after INLI returns',()=>{
  const f=fixture();f.tokens.state.bufptr=-1n;const g=f.tokens.run();g.next();f.wait.state.hungup=1n;f.m.write(f.tokens.symbols.quitWord,packAscii('HALT'));finish(g);assert.equal(f.input.tokens[0].text,'HALT');assert.equal(f.low.read('ntok'),-3670015n);
});
test('MOVE prompted float coordinates use raw scanner then source LOCATE type rejection',()=>{
  const f=moveRuntimeFixture('MOVE');f.tokens.floats();const g=f.run();assert.equal(g.next().value,'input');f.editor.feed('12.5 20\n');assert.equal(finish(g).alternateReturn,true);assert.equal(f.ship.docked,true);assert.equal(f.low.read('typlst',1),BigInt(K.KFLT));assert.ok(f.location.events.includes('erloc7'));
});
