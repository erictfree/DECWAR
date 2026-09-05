import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { inputLayout } from '../src/generated/input-layout.ts';
import { characterBits } from '../src/generated/character-bits.ts';
import { characterBits as extract } from '../tools/character-bits.ts';
import { inli,nxch,displayInput } from '../src/compat/inli.ts';
import type { InliState,InliRegisters,InliServices } from '../src/compat/inli.ts';
import { gtkn,installEditedLine } from '../src/compat/gtkn.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { halfWords,leftHalf,rightHalf,signed36,packAscii,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';

function fixture(chars:number[],old='OLD'){
  const memory=new AddressSpace();memory.map(0o140n,Array<bigint>(128).fill(0n));
  memory.map(BigInt(inputLayout.address),Array<bigint>(inputLayout.words).fill(99n));
  const low=new CommonBlock(memory,'lowseg'),input=new MemoryCommandInput(low,packAscii);
  input.acceptLine(old);
  const state:InliState={hungup:0n,echflg:0n,iniflg:0n,blank:4n};
  const r:InliRegisters={f:signed36(halfWords(0o654321n,77n)),c:77n,t1:88n};
  const events:(string|bigint)[]=[];
  let index=0;
  const io:InliServices<string>={
    *ichr(){yield 'read';assert.ok(index<chars.length,'fixture exhausted');return BigInt(chars[index++]);},
    flush(){events.push('flush');},ochr(c){events.push(c);},outstr(s){events.push(s);},outchr(c){events.push(`direct:${c}`);},
    // Explicit fixture policy, not production CPU semantics. These fixtures
    // never cross a halfword boundary; the service is required in production.
    aobjp(word){return signed36(halfWords(leftHalf(word)+1n,rightHalf(word)+1n));},
  };
  return {memory,low,input,state,r,events,io,count:()=>index};
}
function complete<T>(g:Generator<string,T,void>):T{for(;;){const next=g.next();if(next.done)return next.value;}}
function run(f:ReturnType<typeof fixture>){return complete(inli(f.input,f.state,f.r,f.io));}

test('CBITS extracts every character and flag from source',()=>{
  assert.deepEqual(characterBits,extract());assert.equal(characterBits.entries.length,128);
  assert.equal(characterBits.flags['cf.pnt'],65536);
  assert.equal(characterBits.entries[27].value,64|128|256);
});
test('INLI flushes before BUFPTR reset and retains old buffer until first accepted character',()=>{
  const f=fixture([13,65,10]);f.low.write('rptflg',17n);
  f.io.flush=()=>assert.equal(f.input.pointer,f.input.lineAddress);
  const g=inli(f.input,f.state,f.r,f.io);
  assert.equal(g.next().value,'read');assert.equal(f.input.pointer,-1n);assert.equal(f.input.rawLine,'OLD');
  assert.equal(g.next().value,'read');assert.equal(f.low.read('rptflg'),17n);assert.equal(f.input.rawLine,'OLD');
  assert.equal(g.next().value,'read');assert.equal(f.low.read('rptflg'),0n);assert.equal(f.input.block.read('chrcnt'),1n);
  assert.equal(f.input.rawLine,'ALD');assert.deepEqual(g.next(),{done:true,value:{stored:f.input}});
  assert.equal(f.input.rawLine,'A');assert.equal(f.input.pointer,-1n);
});
test('ESC after ignored CR repeats untouched line/count; F left half survives',()=>{
  const f=fixture([13,27]);const oldF=leftHalf(f.r.f);run(f);
  assert.equal(f.input.rawLine,'OLD');assert.equal(f.input.block.read('chrcnt'),4n);assert.equal(f.low.read('rptflg'),-1n);
  assert.equal(leftHalf(f.r.f),oldF);assert.deepEqual(f.events,['flush',13n,10n]);assert.equal(f.state.blank,4n);
});
for(const first of [8,21,18,7])test(`ESC after initial control ${first} terminates new empty line`,()=>{
  const f=fixture([first,27]);run(f);assert.equal(f.input.rawLine,'');assert.equal(f.input.block.read('chrcnt'),1n);assert.equal(f.low.read('rptflg'),0n);
});
test('backspace and DEL decrement without clearing stale words; below zero clamps',()=>{
  const f=fixture([8,65,66,127,10]);const g=inli(f.input,f.state,f.r,f.io);
  g.next();g.next();assert.equal(f.input.block.read('chrcnt'),0n);
  g.next();g.next();g.next();assert.equal(f.input.block.read('chrcnt'),1n);assert.equal(f.input.characterAt(1),66);
  complete(g);assert.equal(f.input.rawLine,'A');assert.equal(f.input.characterAt(2),68);assert.deepEqual(f.events,['flush',13n]);
});
test('kill resets count and uses direct CRLF; old tail remains beyond new terminator',()=>{
  const f=fixture([65,66,21,67,10]);run(f);assert.equal(f.input.rawLine,'C');assert.equal(f.input.characterAt(2),68);
  assert.deepEqual(f.events,['flush','\r\n',13n]);assert.equal(f.state.blank,5n);
});
for(const end of [0,3,10,11,12,26,27])test(`INLI terminator ${end} has source CR/LF behavior`,()=>{
  const f=fixture([65,end]);run(f);assert.equal(f.input.rawLine,'A');assert.equal(f.input.block.read('chrcnt'),2n);
  const feeds=[3,10,11,12,26].includes(end);
  assert.deepEqual(f.events,feeds?['flush',13n]:['flush',13n,10n]);assert.equal(f.state.blank,feeds?5n:4n);
});
for(const echo of [-1n,1n])test(`nonzero ECHFLG ${echo} strips feed flags but echo routines do not change it`,()=>{
  const f=fixture([7,65,10]);f.state.echflg=echo;run(f);
  assert.equal(f.state.echflg,echo);assert.deepEqual(f.events,['flush',13n,10n]);assert.equal(f.state.blank,4n);
});
test('INI negative suppresses LF even for ESC and wraps BLANK as a word',()=>{
  const f=fixture([27]);f.state.iniflg=-1n;f.state.blank=MAX_INTEGER;run(f);
  assert.deepEqual(f.events,['flush',13n]);assert.equal(f.state.blank,MIN_INTEGER);
});
test('capacity ends input immediately after character 80 without another read',()=>{
  const f=fixture(Array(81).fill(65));run(f);assert.equal(f.count(),80);assert.equal(f.input.rawLine,'A'.repeat(80));
  assert.equal(f.input.block.read('chrcnt'),81n);assert.equal(f.input.characterAt(80),0);assert.deepEqual(f.events,['flush',13n,10n]);
});
test('display echoes control ranges through direct monitor calls and keeps F/count',()=>{
  const f=fixture([]);const codes=[0,6,7,8,9,10,11,12,13,14,31,32,127];
  codes.forEach((c,i)=>f.memory.write(f.input.lineAddress+BigInt(i),BigInt(c)));
  f.input.block.write('chrcnt',BigInt(codes.length));const oldF=f.r.f;
  complete(displayInput(f.input,f.state,f.r,f.io));
  assert.deepEqual(f.events,['\r\n',...codes.flatMap(c=>(c<7||(c>13&&c<32))?[`direct:94`,`direct:${c+64}`]:[`direct:${c}`])]);
  assert.equal(f.r.f,oldF);assert.equal(f.input.block.read('chrcnt'),BigInt(codes.length));assert.equal(leftHalf(f.r.t1),0n);
  assert.equal(rightHalf(f.r.t1),f.input.lineAddress+BigInt(codes.length));assert.equal(f.state.blank,4n);
});
test('redisplay reads whole right half, observes hangup between caret and character',()=>{
  const f=fixture([]);f.input.block.write('chrcnt',2n);f.memory.write(f.input.lineAddress,1n);f.memory.write(f.input.lineAddress+1n,halfWords(3n,128n));
  f.io.outchr=c=>{f.events.push(c);f.state.hungup=1n;};complete(displayInput(f.input,f.state,f.r,f.io));
  assert.deepEqual(f.events,['\r\n',94n]);assert.equal(f.r.c,128n);
});
test('hungup skips flush/direct editing output but still invokes OCHR adapter',()=>{
  const f=fixture([65,18,21,27]);f.state.hungup=1n;run(f);
  assert.deepEqual(f.events,[13n,10n]);assert.equal(f.input.rawLine,'');
});
test('NXCH rejects unknown CBITS address after receiving C and before changing F',()=>{
  const f=fixture([128]);const oldF=f.r.f;assert.throws(()=>complete(nxch(f.state,f.r,f.io)),/CBITS/);
  assert.equal(f.r.c,128n);assert.equal(f.r.f,oldF);
});
test('INLI and GTKN share storage across lock reacquisition without string reinstall',()=>{
  const f=fixture([84,73,77,69,27]);f.input.pointer=-1n;f.input.ccflgDot=0n;
  const state={...f.state,locked:2n,svlock:0n,ccflg:0n,get ccflgDot(){return f.input.ccflgDot;},set ccflgDot(v){f.input.ccflgDot=v;}};
  f.io.flush=()=>assert.equal(f.input.pointer,0n);
  f.input.acceptEditedLine=()=>assert.fail('must not reinstall');
  const io={inliOwnsMemory:true,daytime:()=>0n,inputPending:()=>false,unlo(){},*lock(){
    assert.equal(f.input.pointer,-1n);f.memory.write(f.input.lineAddress,68n);return true;
  },*hibernate(){},*inli(){return yield*inli(f.input,f.state,f.r,f.io);}};
  complete(gtkn(state,f.input,new TerminalOutput(),io));assert.equal(f.input.tokens[0].text,'DIME');
});
test('stored line cannot silently target a different buffer',()=>{
  const f=fixture([]),other=fixture([]);assert.throws(()=>installEditedLine(f.input,{stored:other.input}),/different/);
});

test('MAKMSG consumes per-keystroke edited storage without a second buffer write',async()=>{
  const {MessageQueue,makeMessageFromInput,messageText}=await import('../src/game/message-queue.ts');
  const f=fixture([72,105,88,8,27],'TELL ALL'),queue=new MessageQueue();
  const players=Array.from({length:19},()=>({msgflg:0n}));
  f.input.acceptEditedLine=()=>assert.fail('must not reinstall');
  f.io.flush=()=>assert.equal(f.input.pointer,f.input.lineAddress);
  complete(makeMessageFromInput(queue,players,{dbits:1n,dispfr:101n,ccflg:0n},f.input,new TerminalOutput(),{
    inliOwnsMemory:true,*inli(){return yield*inli(f.input,f.state,f.r,f.io);},
    *lock(){return true;},unlo(){},*cancelUnreserved(){assert.fail();},
  }));
  assert.equal(f.input.pointer,-1n);assert.equal(f.input.rawLine,'Hi');assert.equal(messageText(queue.data[0].slice(1)),'Hi\r\n');
  assert.equal(players[1].msgflg,1n);
});

test('redisplay uses the required CPU service result, without choosing index carry semantics',()=>{
  const f=fixture([]);let seen=0n;f.io.aobjp=word=>{seen=word;return 17n;};
  complete(displayInput(f.input,f.state,f.r,f.io));
  assert.equal(seen,signed36(halfWords(-5n,f.input.lineAddress-1n)));assert.equal(f.r.t1,17n);
  assert.deepEqual(f.events,['\r\n']);
});
