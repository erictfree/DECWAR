import test from 'node:test';
import assert from 'node:assert/strict';
import { moveRuntimeFixture } from './fixtures/move-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from '../src/compat/word36.ts';
import { characterBits } from '../src/generated/character-bits.ts';
const cf=characterBits.flags;
function fixture(text=''){const f=moveRuntimeFixture();f.editor.feed(text);return f;}

test('Raw INLI reads characters through live IC and ICHR.T into the shared line',()=>{
  const f=fixture('12 24\n');finish(f.editor.run());assert.equal(f.input.rawLine,'12 24');assert.equal(f.editor.state.chrcnt,6n);assert.equal(f.editor.state.bufptr,-1n);assert.equal(f.low.read('inflag'),0n);assert.equal(f.text(),'\r');assert.equal(f.editor.events.filter(e=>e==='inchwl').length,6);
});
for(const [text,result] of [['AB\bC\n','AC'],['AB\x7fC\n','AC'],['\b\bA\n','A'],['AB\x15C\n','C'],['AB\x07C\n','ABC']] as const)test(`Raw INLI editing ${JSON.stringify(text)} retains source text ${result}`,()=>{
  const f=fixture(text);finish(f.editor.run());assert.equal(f.input.rawLine,result);assert.equal(f.editor.state.chrcnt,BigInt(result.length+1));assert.equal(f.editor.state.rptflg,0n);
});
for(const echo of [-1n,0n,1n])test(`Raw INLI Ctrl-G echo selection ${echo} calls linked no-op and preserves flag`,()=>{
  const f=fixture('A\x07B\n');f.editor.state.echflg=echo;finish(f.editor.run());assert.equal(f.editor.state.echflg,echo);assert.equal(f.input.rawLine,'AB');assert.ok(f.editor.events.includes(echo<0n?'echon':'echoff'));
});
for(const [echo,ini,expected] of [[0n,0n,'\r'],[-1n,0n,'\r\n'],[1n,0n,'\r\n'],[-1n,-1n,'\r']] as const)test(`Raw INLI linefeed echo ${echo} INIFLG ${ini} preserves raw output`,()=>{
  const f=fixture('A\n');f.editor.state.echflg=echo;f.editor.state.iniflg=ini;finish(f.editor.run());assert.equal(f.text(),expected);assert.equal(f.editor.state.echflg,echo);assert.equal(f.editor.events.filter(e=>e==='echon').length,echo!==0n?1:0);
});
test('Raw INLI first ESC repeats current line without resetting CHRCNT or data',()=>{
  const f=fixture('\x1b');f.input.acceptEditedLine('12 24');const count=f.editor.state.chrcnt;f.m.write(f.input.lineAddress,51n);finish(f.editor.run());assert.equal(f.input.rawLine,'32 24');assert.equal(f.editor.state.chrcnt,count);assert.equal(f.editor.state.rptflg,-1n);assert.equal(f.text(),'\r\n');
});
test('Raw INLI later ESC terminates new input instead of repeating',()=>{
  const f=fixture('NEW\x1b');f.input.acceptEditedLine('OLD');finish(f.editor.run());assert.equal(f.input.rawLine,'NEW');assert.equal(f.editor.state.rptflg,0n);
});
test('Raw INLI full eighty characters stores NUL in word eighty-one and leaves queued input',()=>{
  const f=fixture('X'.repeat(80)+'Y\n');finish(f.editor.run());assert.equal(f.input.rawLine,'X'.repeat(80));assert.equal(f.editor.state.chrcnt,81n);assert.equal(f.m.read(f.input.lineAddress+80n),0n);assert.deepEqual(f.editor.bytes,[89n,10n]);
});
test('Raw INLI waits for OUTPUT before discarding old buffer pointer',()=>{
  const f=fixture('A\n');f.editor.state.bufptr=77n;f.editor.io.output=function*(){yield 'flush';};const g=f.editor.run();assert.equal(g.next().value,'flush');assert.equal(f.editor.state.bufptr,77n);finish(g);assert.equal(f.editor.state.bufptr,-1n);
});
test('Raw INLI OUTPUT failure preserves old pointer, repeat and line contents',()=>{
  const f=fixture();f.editor.state.bufptr=77n;f.editor.state.rptflg=9n;const line=f.input.rawLine;f.editor.io.output=function*(){throw new Error('output fault');};assert.throws(()=>finish(f.editor.run()),/output fault/);assert.equal(f.editor.state.bufptr,77n);assert.equal(f.editor.state.rptflg,9n);assert.equal(f.input.rawLine,line);
});
test('Raw INLI first INCHWL wait precedes new-line count and repeat initialization',()=>{
  const f=fixture();f.editor.state.chrcnt=33n;f.editor.state.rptflg=9n;const g=f.editor.run();assert.equal(g.next().value,'input');assert.equal(f.editor.state.bufptr,-1n);assert.equal(f.low.read('inflag'),-1n);assert.equal(f.editor.state.chrcnt,33n);assert.equal(f.editor.state.rptflg,9n);f.editor.feed('A\n');finish(g);assert.equal(f.low.read('inflag'),0n);assert.equal(f.input.rawLine,'A');
});
test('Raw ICHR.T skips NUL and CR before returning the next register character',()=>{
  const f=fixture('\0\rA');finish(f.editor.character());assert.equal(f.r.c,65n);assert.equal(f.editor.events.filter(e=>e==='inchwl').length,3);assert.equal(f.low.read('inflag'),0n);
});
for(const hungup of [0n,-1n])test(`Raw ICHR.T pending Ctrl-C with hangup ${hungup} returns source LF`,()=>{
  const f=fixture('A');f.low.write('ccflg',-1n);f.editor.state.hungup=hungup;finish(f.editor.character());assert.equal(f.r.c,10n);assert.equal(f.editor.events.includes('clrbfi'),hungup===0n);assert.ok(!f.editor.events.includes('inchwl'));assert.equal(f.editor.bytes.length,hungup===0n?0:1);
});
test('Raw ICHR.T post-read hangup discards monitor character and clears INWAIT',()=>{
  const f=fixture(),g=f.editor.character();assert.equal(g.next().value,'input');f.editor.state.hungup=1n;finish(g);assert.equal(f.r.c,10n);assert.equal(f.low.read('inflag'),0n);assert.ok(!f.editor.events.includes('clrbfi'));
});
test('Raw ICHR.T CLRBFi wait follows forced LF and INWAIT clear',()=>{
  const f=fixture(),g=f.editor.character();g.next();f.low.write('ccflg',-1n);f.editor.terminalIO.clrbfi=function*(){yield 'clear';};assert.equal(g.next().value,'clear');assert.equal(f.r.c,10n);assert.equal(f.low.read('inflag'),0n);finish(g);
});
test('Raw ICHR.T monitor failure leaves INWAIT set and prior C',()=>{
  const f=fixture();f.r.c=77n;f.editor.terminalIO.inchwl=function*(){throw new Error('read fault');};assert.throws(()=>finish(f.editor.character()),/read fault/);assert.equal(f.low.read('inflag'),-1n);assert.equal(f.r.c,77n);
});
test('Raw ICHR dispatch reads current IC and allows a supplied alternate transfer',()=>{
  const f=fixture();f.editor.runtime.block.write('ic',17777n);f.editor.dispatchIO.transfer=function*(a){assert.equal(a,17777n);f.r.c=65n;};finish(f.editor.next());assert.equal(f.r.c,65n);assert.ok(!f.editor.events.includes('inchwl'));
});
test('Raw ICHR dispatch awaits effective-address resolution before target transfer',()=>{
  const f=fixture('A');const resolve=f.editor.dispatchIO.indirectAddress;f.editor.dispatchIO.indirectAddress=function*(a){yield 'address';return yield*resolve(a);};const g=f.editor.next();assert.equal(g.next().value,'address');assert.deepEqual(f.editor.events,[]);finish(g);assert.equal(f.r.c,65n);
});
test('Raw NXCH preserves F left half and reads CBITS after a yielded ICHR',()=>{
  const f=fixture();f.r.f=signed36(halfWords(123n,0o777777n));const g=f.editor.next();assert.equal(g.next().value,'input');f.m.write(f.tokens.symbols.cbits+65n,BigInt(cf['cf.eol']));f.editor.feed('A');finish(g);assert.equal(leftHalf(f.r.f),123n);assert.equal(rightHalf(f.r.f),BigInt(cf['cf.eol']));
});
test('Raw NXCH ignored classification loops without losing the F left half',()=>{
  const f=fixture('AB');f.r.f=halfWords(12n,0n);f.m.write(f.tokens.symbols.cbits+65n,BigInt(cf['cf.ign']));finish(f.editor.next());assert.equal(f.r.c,66n);assert.equal(leftHalf(f.r.f),12n);assert.equal(f.editor.events.filter(e=>e==='inchwl').length,2);
});
test('Raw NXCH permits wide character words and uses actual table address',()=>{
  const f=fixture();f.editor.bytes.push(200n);f.m.write(f.tokens.symbols.cbits+200n,BigInt(cf['cf.eol']));finish(f.editor.next());assert.equal(f.r.c,200n);assert.equal(rightHalf(f.r.f),BigInt(cf['cf.eol']));
});
test('Raw INLI stores full C at a changed CHRCNT without a host line guard',()=>{
  const f=fixture('A'),ichr=f.editor.io.ichr;let calls=0;f.editor.io.ichr=function*(){yield*ichr();if(++calls===2){f.editor.state.chrcnt=79n;f.r.c=511n;}};const g=f.editor.run();assert.equal(g.next().value,'input');f.editor.feed('B');finish(g);assert.equal(f.m.read(f.input.lineAddress+79n),511n);assert.equal(f.editor.state.chrcnt,81n);
});
test('Raw INLI Ctrl-R redisplays live line through direct monitor output',()=>{
  const f=fixture('AB\x12C\n');finish(f.editor.run());assert.equal(f.input.rawLine,'ABC');assert.equal(f.text(),'\r\nAB\r');assert.ok(f.editor.events.includes('outchr:65'));assert.ok(f.editor.events.includes('outchr:66'));
});
test('Raw DISP caret rendering preserves printing control range and direct-output accounting',()=>{
  const f=fixture();f.editor.state.chrcnt=5n;[1n,7n,13n,14n,65n].forEach((v,i)=>f.m.write(f.input.lineAddress+BigInt(i),v));f.low.write('hcpos',17n);f.editor.state.blank=9n;finish(f.editor.display());assert.equal(f.text(),'\r\n^A\x07\r^NA');assert.equal(f.low.read('hcpos'),17n);assert.equal(f.editor.state.blank,9n);
});
test('Raw DISP resumes after caret output using changed C and live hangup',()=>{
  const f=fixture(),out=f.editor.io.outchr;f.editor.state.chrcnt=1n;f.m.write(f.input.lineAddress,1n);f.editor.io.outchr=function*(a){yield*out(a);if(a!=='c')yield 'caret';};const g=f.editor.display();assert.equal(g.next().value,'caret');f.r.c=2n;f.editor.state.hungup=-1n;finish(g);assert.equal(f.r.c,66n);assert.equal(f.text(),'\r\n^');
});
test('Raw DISP MOVN wait precedes HRLZI using live T1',()=>{
  const f=fixture(),movn=f.editor.io.movnT1;f.editor.state.chrcnt=2n;f.m.write(f.input.lineAddress,65n);f.m.write(f.input.lineAddress+1n,66n);f.editor.io.movnT1=function*(w){yield*movn(w);yield 'negate';};const g=f.editor.display();assert.equal(g.next().value,'negate');f.r.t1=-1n;finish(g);assert.equal(f.text(),'\r\nA');
});
test('Raw INLI special-action predicates reread F after redisplay',()=>{
  const f=fixture('AB\x12C\n'),display=f.editor.io.outstr;f.editor.io.outstr=function*(a){yield*display(a);f.r.f=BigInt(cf['cf.bsc']);};finish(f.editor.run());assert.equal(f.input.rawLine,'AC');
});
test('Raw INLI CR output wait precedes live INIFLG and CF.FF tests',()=>{
  const f=fixture('A\n'),ochr=f.editor.io.ochr;f.editor.io.ochr=function*(){yield*ochr();if(f.r.c===13n)yield 'cr';};const g=f.editor.run();assert.equal(g.next().value,'cr');f.r.f=0n;f.editor.state.iniflg=0n;finish(g);assert.equal(f.text(),'\r\n');
});
test('Raw INLI CR failure retains completed NUL and prevents final echo call',()=>{
  const f=fixture('A\n');f.editor.state.echflg=-1n;f.editor.io.ochr=function*(){throw new Error('CR fault');};assert.throws(()=>finish(f.editor.run()),/CR fault/);assert.equal(f.input.rawLine,'A');assert.equal(f.editor.state.chrcnt,2n);assert.equal(f.r.c,13n);assert.ok(!f.editor.events.includes('echon'));
});
test('Raw INLI whole-line erase clears count before a yielded monitor newline',()=>{
  const f=fixture('AB\x15C\n'),out=f.editor.io.outstr;f.editor.io.outstr=function*(a){yield 'newline';yield*out(a);};const g=f.editor.run();assert.equal(g.next().value,'newline');assert.equal(f.editor.state.chrcnt,0n);assert.equal(f.m.read(f.input.lineAddress),65n);finish(g);assert.equal(f.input.rawLine,'C');
});
test('Raw INLI skips initial OUTPUT on hangup but still finishes a source LF line',()=>{
  const f=fixture();f.editor.state.hungup=-1n;finish(f.editor.run());assert.ok(!f.editor.events.includes('output'));assert.equal(f.editor.state.chrcnt,1n);assert.equal(f.m.read(f.input.lineAddress),0n);assert.equal(f.editor.state.rptflg,0n);
});
test('MOVE prompted editing now flows through IC/ICHR/NXCH/INLI/GTKN into CHECK',()=>{
  const f=moveRuntimeFixture('MOVE'),g=f.run();assert.equal(g.next().value,'input');assert.equal(f.low.read('inflag'),-1n);f.editor.feed('12 21\b0\n');assert.equal(finish(g).alternateReturn,false);assert.deepEqual([f.ship.v,f.ship.h],[12,20]);assert.equal(f.input.rawLine,'12 20');assert.equal(f.ship.energy,9840n);assert.ok(f.editor.events.includes('output'));assert.equal(f.low.read('inflag'),0n);
});
test('MOVE hangup during prompted INCHWL retains raw GTKN count and source LOCATE abort',()=>{
  const f=moveRuntimeFixture('MOVE'),g=f.run();g.next();f.low.write('hungup',-1n);assert.equal(finish(g).alternateReturn,true);assert.equal(f.low.read('ntok'),-3670015n);assert.equal(f.input.tokens[0].text,'QUIT');assert.equal(f.ship.docked,true);assert.equal(f.low.read('ptime'),99n);
});

test('Raw INLI zero-index deposit aliases the CHRCNT word before the next input wait',()=>{
  const f=fixture('A'),ichr=f.editor.io.ichr;let calls=0;f.editor.io.ichr=function*(){yield*ichr();if(++calls===2)f.editor.state.chrcnt=-1n;};const g=f.editor.run();assert.equal(g.next().value,'input');f.editor.feed('B');assert.equal(g.next().value,'input');assert.equal(f.r.t1,0n);assert.equal(f.editor.state.chrcnt,66n);assert.equal(f.m.read(f.input.lineAddress-1n),66n);f.editor.feed('\n');finish(g);assert.equal(f.editor.state.chrcnt,67n);assert.equal(f.m.read(f.input.lineAddress+66n),0n);
});
test('Raw INLI failed NUL store retains incremented count and earlier characters',()=>{
  const f=fixture('A\n'),write=f.m.write.bind(f.m),old=f.m.read(f.input.lineAddress+1n);f.m.write=(a,w)=>{if(a===f.input.lineAddress+1n&&w===0n)throw new Error('NUL fault');write(a,w);};assert.throws(()=>finish(f.editor.run()),/NUL fault/);assert.equal(f.editor.state.chrcnt,2n);assert.equal(f.m.read(f.input.lineAddress),65n);assert.equal(f.m.read(f.input.lineAddress+1n),old);assert.ok(!f.editor.events.some(e=>e.startsWith('ochr')));
});
test('Raw ICHR.T early interrupt branch preserves an already-set INWAIT',()=>{
  const f=fixture();f.low.write('inflag',-1n);f.low.write('ccflg',1n);finish(f.editor.character());assert.equal(f.r.c,10n);assert.equal(f.low.read('inflag'),-1n);assert.ok(f.editor.events.includes('clrbfi'));
});
