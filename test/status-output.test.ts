import test from 'node:test';
import assert from 'node:assert/strict';
import { outputStatus,outputStatusArgument,outputStatusHeader,outputTemporary } from '../src/compat/status-output.ts';
import { halfWords,signed36,packSixbit,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
import { statusOutputFixture as fixture } from './fixtures/status-output.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
const row='Lexington  ERIC  TEST   1200       1,27    TTY12     7';
test('STAT.X composes all six fields with raw text, SIXBIT and decimal/octal output',()=>{
  const f=fixture();done(outputStatus(f.m,f.r,f.state,'stat.x',f.s,f.io));assert.equal(f.out.drain(),row);assert.deepEqual(f.stack,[]);assert.equal(f.r.x4,0n);assert.equal(f.r.x3,1n);
});
test('STAT.Y reads local identity and uses a two-column job field',()=>{
  const f=fixture();f.r.x3=0n;done(outputStatus(f.m,f.r,f.state,'stat.y',f.s,f.io));assert.equal(f.out.drain(),'Pre-game   ERIC  TEST   1200       1,27    TTY12    7');assert.equal(f.r.x3,0n);
});
for(const [count,text] of [[0n,''],[1n,'Lexington '],[2n,'Lexington  ERIC  TEST  '],[3n,'Lexington  ERIC  TEST   1200']] as const)
test(`STAT raw item count ${count} stops at its source boundary`,()=>{
  const f=fixture();f.r.x4=-count;done(outputStatus(f.m,f.r,f.state,'stat.x',f.s,f.io));assert.equal(f.out.drain(),text);assert.equal(f.r.x4,1n);
});
test('STAT positive counter returns before touching ship memory',()=>{
  const f=fixture();f.r.x4=7n;f.r.x3=99999n;done(outputStatus(f.m,f.r,f.state,'stat.x',f.s,f.io));assert.equal(f.out.drain(),'');assert.equal(f.r.x4,8n);
});
test('STAT field counter wraps as a signed word',()=>{
  const f=fixture();f.r.x4=MAX_INTEGER;done(outputStatus(f.m,f.r,f.state,'stat.x',f.s,f.io));assert.equal(f.out.drain(),row);assert.equal(f.r.x4,MIN_INTEGER+5n);
});
test('STAT argument wrapper reads player before count and delegates MOVN effects',()=>{
  const f=fixture(),reads:number[]=[];done(outputStatusArgument(f.m,f.r,f.state,f.s,{...f.io,argument(index){reads.push(index);return index===1?2n:f.r.x3;},*movnX4(word){f.r.x4=signed36(-word);}}));
  assert.deepEqual(reads,[1,0]);assert.equal(f.out.drain(),'Nimitz     ERIC  TEST  ');assert.equal(f.r.x3,2n);
});
test('STAT MOVN failure preserves the already assigned player and prior X4',()=>{
  const f=fixture();assert.throws(()=>done(outputStatusArgument(f.m,f.r,f.state,f.s,{...f.io,argument(index){return index===1?2n:MIN_INTEGER;},*movnX4(){throw new Error('MOVN trap');}})),/MOVN trap/);
  assert.equal(f.r.x3,2n);assert.equal(f.r.x4,-6n);assert.equal(f.out.drain(),'');
});
test('STAT rereads player index between the two captain-name words',()=>{
  const f=fixture();f.r.x4=-2n;f.m.write(f.s.player.name2+1n,packSixbit('OTHER '));const sixbit=f.io.sixbit;let first=true;
  f.io.sixbit=function*(){yield*sixbit();if(first){first=false;f.r.x3=2n;}};done(outputStatus(f.m,f.r,f.state,'stat.x',f.s,f.io));assert.equal(f.out.drain(),'Lexington  ERIC  OTHER ');
});
test('STAT uses live X1 and cursor after ship output for padding',()=>{
  const f=fixture();f.r.x4=-1n;const ostr=f.io.ostr;f.io.ostr=function*(){yield*ostr();f.r.x1=2n;};done(outputStatus(f.m,f.r,f.state,'stat.x',f.s,f.io));assert.equal(f.out.drain(),'Lexington   ');
});
test('STAT PPN halves are separate reads around comma output',()=>{
  const f=fixture();f.r.x4=-4n;const ochr=f.io.ochr;f.io.ochr=function*(){yield*ochr();if(f.r.c===44n)f.m.write(f.s.player.ppn,halfWords(7n,0o123n));};
  done(outputStatus(f.m,f.r,f.state,'stat.x',f.s,f.io));assert.equal(f.out.drain(),'Lexington  ERIC  TEST   1200       1,123  ');
});
test('STAT has no ship-index guard and follows neighboring pointer words',()=>{
  const f=fixture();f.r.x3=0n;f.r.x4=-1n;f.m.write(f.s.lngshp-1n,1205n);done(outputStatus(f.m,f.r,f.state,'stat.x',f.s,f.io));assert.equal(f.out.drain(),'Nimitz    ');
});
test('OSTS composes status row, version, date/time, game and option fields with register restoration',()=>{
  const f=fixture();const saved=[f.r.x1,f.r.x2,f.r.x3,f.r.x4];done(outputStatusHeader(f.r,f.state,f.hs,f.io));
  assert.equal(f.out.drain(),'[V2.1  05-SEP-78 12:34  '+row+'    17 B R]\r\n');assert.deepEqual([f.r.x1,f.r.x2,f.r.x3,f.r.x4],saved);assert.deepEqual(f.stack,[]);
});
test('OSTS pre-game uses actual STAT.Y and MOVNI immediate width',()=>{
  const f=fixture();f.state.who=0n;const status=f.io.status;let counter=0n;f.io.status=function*(entry){assert.equal(entry,'stat.y');counter=f.r.x4;yield*status(entry);};
  done(outputStatusHeader(f.r,f.state,f.hs,f.io));assert.equal(counter,-262080n);assert.ok(f.out.drain().includes('Pre-game   ERIC  TEST   1200       1,27    TTY12    7'));
});
test('OSTS returning UNTIM failure emits retained date bytes from the same TMP',()=>{
  const f=fixture();f.io.untim=function*(){};done(outputStatusHeader(f.r,f.state,f.hs,f.io));assert.ok(f.out.drain().startsWith('[V2.1  05-SEP-78 05-SEP-78  '));
});
test('OSTS date suspension retains saves and reads WHO/game only later',()=>{
  const f=fixture(),undat=f.io.undat;f.io.undat=function*(){yield 'date';yield*undat();};const g=outputStatusHeader(f.r,f.state,f.hs,f.io);
  assert.equal(g.next().value,'date');assert.deepEqual(f.stack,[91n,92n,1n,-6n]);f.state.who=0n;f.state.gameno=23n;done(g);
  const text=f.out.drain();assert.ok(text.includes('Pre-game'));assert.ok(text.endsWith('   23 B R]\r\n'));assert.deepEqual(f.stack,[]);
});
test('OSTS tests WHO again after loading X3',()=>{
  const f=fixture();let reads=0;Object.defineProperty(f.state,'who',{get:()=>reads++===0?1n:0n});
  f.io.status=function*(entry){assert.equal(entry,'stat.y');assert.equal(f.r.x3,1n);};done(outputStatusHeader(f.r,f.state,f.hs,f.io));assert.equal(reads,2);
});
test('OSTS rereads version remainder after decimal point output',()=>{
  const f=fixture(),ochr=f.io.ochr;f.io.ochr=function*(){yield*ochr();if(f.r.c===46n)f.r.x2=9n;};done(outputStatusHeader(f.r,f.state,f.hs,f.io));assert.ok(f.out.drain().startsWith('[V2.9'));
});
test('OSTS loads option P1 even when skipped and rereads Romulan option after black-hole output',()=>{
  const f=fixture(),ostr=f.io.ostr;f.state.romopt=0n;f.io.ostr=function*(){const p=f.r.p1;yield*ostr();if(p===f.hs.blackHoleLabel)f.state.romopt=-1n;};
  done(outputStatusHeader(f.r,f.state,f.hs,f.io));assert.ok(f.out.drain().endsWith(' B R]\r\n'));
  f.state.blhopt=0n;f.state.romopt=0n;done(outputStatusHeader(f.r,f.state,f.hs,f.io));assert.equal(f.r.p1,f.hs.romulanLabel);
});
test('OSTS nonreturning monitor call leaves saved registers on the stack',()=>{
  const f=fixture();f.io.undat=function*(){throw new Error('Monitor transfer');};assert.throws(()=>done(outputStatusHeader(f.r,f.state,f.hs,f.io)),/Monitor transfer/);
  assert.deepEqual(f.stack,[91n,92n,1n,-6n]);assert.equal(f.r.x1,f.hs.tmp);assert.equal(f.out.drain(),'[V2.1  ');
});
test('XFRTMP uses X1 independently of P1 and sees live scratch bytes after output suspension',()=>{
  const f=fixture();f.put(f.hs.tmp,'ABC');f.io.ochr=function*(){f.out.character(f.r.c);yield 'char';};const g=outputTemporary(f.r,f.hs.tmpPointer,f.io);
  assert.equal(g.next().value,'char');assert.equal(f.r.p1,97n);f.put(f.hs.tmp,'AXY');done(g);assert.equal(f.out.drain(),'AXY');assert.equal(f.r.c,0n);
});
