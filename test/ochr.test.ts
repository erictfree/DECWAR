import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { inputRuntime } from '../src/compat/input-runtime.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { accountCharacter,ochrBuffered,ochrDeposit,ochrTerminal,setOutput } from '../src/compat/ochr.ts';
import type { BufferedOutputServices } from '../src/compat/ochr.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { lowState } from '../src/game/common-state.ts';
import { setInput } from '../src/compat/ichr.ts';
import { halfWords,leftHalf,rightHalf,signed36,packAscii,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';

function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(count=5n){
  const memory=new AddressSpace();memory.map(0o140n,Array<bigint>(128).fill(0n));
  memory.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));
  memory.map(30000n,[count,0n,9n,0n]);
  const low=new CommonBlock(memory,'lowseg'),input=new MemoryCommandInput(low,packAscii);
  const {block,state}=inputRuntime(input);block.write('obfctr',30000n);block.write('obfptr',30001n);block.write('obfins',123n);
  const r={c:65n,f:0n,ac0:71n,x1:44n,t1:1n,t2:2n,t3:3n};
  const events:(string|bigint)[]=[];
  const io:BufferedOutputServices<string>={
    // Explicit fixture policy: simple indirect addresses and 7-bit deposition.
    // These methods do not implement a production CPU byte pointer.
    indirect(address){return memory.read(address);},
    idpb(c,address){events.push(`byte:${c&127n}`);memory.write(address,memory.read(address)+1n);},
    *executeOutput(instruction){events.push(instruction);yield 'output';},
  };
  return {memory,low,input,block,state,r,events,io};
}

test('buffered OCHR decrements the live count, deposits, then updates LOWSEG cursor',()=>{
  const f=fixture(1n);f.io.idpb=(c,a)=>{assert.equal(f.memory.read(30000n),0n);assert.equal(f.state.hcpos,0n);assert.equal(c,65n);assert.equal(a,30001n);f.events.push('idpb');};
  done(ochrBuffered(f.block,f.state,f.r,f.io));assert.equal(f.state.hcpos,1n);assert.equal(f.low.read('hcpos'),1n);assert.equal(f.r.c,65n);assert.deepEqual(f.events,['idpb']);
});
test('buffered hungup entry changes no count, pointer, registers or accounting',()=>{
  const f=fixture();f.state.hungup=-1n;f.state.hcpos=10n;f.state.blank=2n;
  done(ochrBuffered(f.block,f.state,f.r,f.io));assert.equal(f.memory.read(30000n),5n);assert.equal(f.memory.read(30001n),0n);
  assert.equal(f.state.hcpos,10n);assert.equal(f.state.blank,2n);assert.equal(f.r.ac0,71n);assert.deepEqual(f.events,[]);
});
test('OUTPUT suspension exposes decremented count and no deposition; completion forces 80 then retry consumes one',()=>{
  const f=fixture(0n),g=ochrBuffered(f.block,f.state,f.r,f.io);
  assert.equal(g.next().value,'output');assert.equal(f.memory.read(30000n),-1n);assert.equal(f.r.ac0,71n);assert.equal(f.state.hcpos,0n);
  f.memory.write(30000n,999n);assert.equal(g.next().done,true);assert.equal(f.memory.read(30000n),79n);assert.equal(f.memory.read(30001n),1n);
  assert.equal(f.r.ac0,71n);assert.deepEqual(f.events,[123n,'byte:65']);
});
test('hangup during OUTPUT still writes forced 80 and restores AC0 before retry returns',()=>{
  const f=fixture(0n),g=ochrBuffered(f.block,f.state,f.r,f.io);g.next();f.state.hungup=-1n;
  assert.equal(g.next().done,true);assert.equal(f.memory.read(30000n),80n);assert.equal(f.r.ac0,71n);assert.equal(f.state.hcpos,0n);assert.deepEqual(f.events,[123n]);
});
test('AC0 is saved after OUTPUT, and forced-count indirection sees the temporary 80',()=>{
  const f=fixture(0n);let resolutions=0;
  f.io.indirect=a=>{if(a===f.block.address('obfctr')){resolutions++;if(resolutions===2)assert.equal(f.r.ac0,80n);}return f.memory.read(a);};
  f.io.executeOutput=function*(){f.r.ac0=72n;yield 'output';};
  done(ochrBuffered(f.block,f.state,f.r,f.io));assert.equal(f.r.ac0,72n);assert.equal(resolutions,3);
});
test('OUTPUT can change the selected counter and pointer before the retry',()=>{
  const f=fixture(0n);f.io.executeOutput=function*(){yield 'output';f.block.write('obfctr',30002n);f.block.write('obfptr',30003n);};
  done(ochrBuffered(f.block,f.state,f.r,f.io));assert.equal(f.memory.read(30000n),-1n);assert.equal(f.memory.read(30001n),0n);
  assert.equal(f.memory.read(30002n),79n);assert.equal(f.memory.read(30003n),1n);
});
test('count wrap at minimum signed word takes the deposit path',()=>{
  const f=fixture(MIN_INTEGER);done(ochrBuffered(f.block,f.state,f.r,f.io));assert.equal(f.memory.read(30000n),MAX_INTEGER);assert.deepEqual(f.events,['byte:65']);
});
test('failed output leaves the decremented count and register storage without forced reset',()=>{
  const f=fixture(0n);f.io.executeOutput=function*(){throw new Error('monitor unavailable');};
  assert.throws(()=>done(ochrBuffered(f.block,f.state,f.r,f.io)),/unavailable/);assert.equal(f.memory.read(30000n),-1n);assert.equal(f.r.ac0,71n);
});
test('IDPB failure does not perform cursor accounting or undo the consumed count',()=>{
  const f=fixture();f.io.idpb=()=>{throw new Error('unresolved pointer');};
  assert.throws(()=>done(ochrBuffered(f.block,f.state,f.r,f.io)),/pointer/);assert.equal(f.memory.read(30000n),4n);assert.equal(f.state.hcpos,0n);
});
test('direct OCHR.X bypasses the count and HUNGUP checks',()=>{
  const f=fixture();f.state.hungup=-1n;ochrDeposit(f.block,f.state,f.r,f.io);assert.equal(f.memory.read(30000n),5n);assert.equal(f.state.hcpos,1n);assert.deepEqual(f.events,['byte:65']);
});
test('deposition aliases are visible to subsequent accounting',()=>{
  const f=fixture();f.io.idpb=()=>{f.low.write('hcpos',40n);};ochrDeposit(f.block,f.state,f.r,f.io);assert.equal(f.state.hcpos,41n);
});
test('counter may alias HCPOS without losing source decrement/deposit/increment order',()=>{
  const f=fixture();f.state.hcpos=5n;f.block.write('obfctr',f.low.address('hcpos'));
  done(ochrBuffered(f.block,f.state,f.r,f.io));assert.equal(f.state.hcpos,5n);
});
test('direct terminal output accounts after the monitor resumes',()=>{
  const f=fixture();const g=ochrTerminal(f.state,f.r,function*(c){assert.equal(c,65n);yield 'direct';});
  assert.equal(g.next().value,'direct');assert.equal(f.state.hcpos,0n);f.state.hcpos=20n;f.state.hungup=-1n;
  assert.equal(g.next().done,true);assert.equal(f.state.hcpos,21n);
});
test('direct terminal hangup skips OUTCHR but still accounts for a printing character',()=>{
  const f=fixture();f.state.hungup=-1n;done(ochrTerminal(f.state,f.r,function*(){assert.fail();}));assert.equal(f.state.hcpos,1n);
});
for(const [c,h,b,expectedH,expectedB] of [
  [0n,7n,3n,7n,3n],[7n,7n,3n,7n,3n],[8n,0n,3n,-1n,3n],[10n,7n,3n,7n,4n],
  [13n,7n,3n,0n,-1n],[13n,0n,3n,0n,3n],[127n,7n,3n,8n,3n],
] as const)test(`OCHR control/print accounting C=${c} HCPOS=${h}`,()=>{
  const f=fixture();f.r.c=c;f.state.hcpos=h;f.state.blank=b;accountCharacter(f.state,f.r);
  assert.equal(f.state.hcpos,expectedH);assert.equal(f.state.blank,expectedB);assert.equal(f.r.c,c);
});
for(const [position,expected] of [[24n,32n],[-9n,262112n],[262168n,32n],[MAX_INTEGER,0n]] as const)
  test(`TAB uses ADDI 10 then an 18-bit ANDI mask at HCPOS ${position}`,()=>{
    const f=fixture();f.r.c=signed36(halfWords(0o765432n,9n));f.state.hcpos=position;const saved=f.r.c;
    accountCharacter(f.state,f.r);assert.equal(f.state.hcpos,expected);assert.equal(f.r.c,saved);
  });
test('word counters wrap and control bookkeeping exposes both AOS and SOS writes',()=>{
  const writes:bigint[]=[];let h=MAX_INTEGER;
  const state={get hcpos(){return h;},set hcpos(v){writes.push(v);h=v;},blank:MAX_INTEGER};
  accountCharacter(state,{c:10n});assert.deepEqual(writes,[MIN_INTEGER,MAX_INTEGER]);assert.equal(state.blank,MIN_INTEGER);
  accountCharacter(state,{c:65n});assert.equal(state.hcpos,MIN_INTEGER);
});
test('emitted low seven bits and full right-half control classification remain distinct',()=>{
  const f=fixture();f.r.c=138n;f.state.blank=5n;done(ochrBuffered(f.block,f.state,f.r,f.io));
  assert.deepEqual(f.events,['byte:10']);assert.equal(f.state.hcpos,0n);assert.equal(f.state.blank,5n);assert.equal(f.r.c,138n);
});
test('TerminalOutput uses the shared word accounting for overflow, masked TAB and raw C',()=>{
  const out=new TerminalOutput();out.hcpos=Number(MAX_INTEGER);out.write('A');assert.equal(out.hcpos,Number(MIN_INTEGER));
  out.hcpos=-9;out.write('\t');assert.equal(out.hcpos,262112);
  out.blank=Number(MAX_INTEGER);out.character(10n);assert.equal(out.blank,Number(MIN_INTEGER));
  out.character(138n);assert.equal(out.blank,Number(MIN_INTEGER));assert.equal(out.drain(),'A\t\n\n');
});
test('formatting on LOWSEG and raw OCHR observe the same cursor/blank words',()=>{
  const f=fixture(),out=lowState(f.low).output;out.write('AB');assert.equal(f.state.hcpos,2n);
  f.r.c=13n;done(ochrBuffered(f.block,f.state,f.r,f.io));assert.equal(out.hcpos,0);assert.equal(out.blank,-1);
  out.write('\n');assert.equal(f.state.blank,0n);assert.equal(f.low.read('hcpos'),0n);
});

test('SETO swaps the source halves and builds output dispatch, buffer addresses and channel',()=>{
  const f=fixture();f.memory.map(31000n,[halfWords(456n,999n),0n,halfWords(0o123n,7n),0n,0n,halfWords(32000n,888n)]);
  f.r.x1=signed36(halfWords(31000n,0o765432n));f.block.write('obflb',signed36(halfWords(0o654321n,111n)));
  // Explicit fixture monitor offsets and assembler left half.
  const machine={bufferCountOffset:2n,bufferPointerOffset:1n,outputInstructionLeftHalf:0o567000n};
  setOutput(f.block,f.r,machine);
  assert.equal(f.r.x1,signed36(halfWords(111n,0o765432n)));assert.equal(f.block.read('obflb'),signed36(halfWords(0o654321n,31000n)));
  assert.equal(f.block.read('oc'),456n);assert.equal(f.block.read('obfctr'),32002n);assert.equal(f.block.read('obfptr'),32001n);
  assert.equal(f.block.read('obfins'),signed36((halfWords(machine.outputInstructionLeftHalf,0n)&~(15n<<23n))|(3n<<23n)));
  assert.equal(f.r.t1,31000n);assert.equal(f.r.t2,0o123n);assert.equal(f.r.t3,32001n);
});
test('SETO observes descriptor aliases after writing OBFLB/OC',()=>{
  const f=fixture();f.r.x1=halfWords(f.block.address('obflb'),44n);f.block.write('obflb',halfWords(77n,99n));
  setOutput(f.block,f.r,{bufferCountOffset:0n,bufferPointerOffset:1n,outputInstructionLeftHalf:0n});
  assert.equal(f.block.read('oc'),77n);assert.equal(leftHalf(f.r.x1),99n);assert.equal(rightHalf(f.r.x1),44n);
});
test('SETO and SETI select different halves of a shared descriptor without changing its buffer counters',()=>{
  const f=fixture();f.memory.map(31000n,[halfWords(456n,789n),0n,halfWords(3n,0n),0n,0n,halfWords(32000n,32100n)]);
  f.memory.map(32000n,[1n,2n,3n]);f.memory.map(32100n,[4n,5n,6n]);
  f.r.x1=halfWords(31000n,31000n);setOutput(f.block,f.r,{bufferCountOffset:2n,bufferPointerOffset:1n,outputInstructionLeftHalf:5n});
  setInput(f.block,f.r,{bufferCountOffset:2n,bufferPointerOffset:1n,inInstructionLeftHalf:6n});
  assert.equal(f.block.read('oc'),456n);assert.equal(f.block.read('ic'),789n);assert.equal(f.block.read('obfctr'),32002n);assert.equal(f.block.read('ibfctr'),32102n);
  assert.equal(f.memory.read(32002n),3n);assert.equal(f.memory.read(32102n),6n);
});
test('SETO followed by OCHR uses the selected buffer and monitor output instruction',()=>{
  const f=fixture();f.memory.map(31000n,[halfWords(456n,789n),0n,halfWords(3n,0n),0n,0n,halfWords(30000n,999n)]);
  f.r.x1=halfWords(31000n,44n);f.memory.write(30002n,0n);
  setOutput(f.block,f.r,{bufferCountOffset:2n,bufferPointerOffset:1n,outputInstructionLeftHalf:5n});
  done(ochrBuffered(f.block,f.state,f.r,f.io));assert.equal(f.memory.read(30002n),79n);assert.equal(f.memory.read(30001n),1n);
  assert.equal(f.events[0],f.block.read('obfins'));assert.equal(f.state.hcpos,1n);
});

test('INLI waits for initial output before clearing BUFPTR',async()=>{
  const {inli}=await import('../src/compat/inli.ts');const f=fixture();f.input.acceptLine('OLD');
  const g=inli(f.input,f.state,f.r,{*flush(){yield 'initial-output';},*ichr(){return 27n;},
    *ochr(){},outstr(){},outchr(){},aobjp(){assert.fail();}});
  assert.equal(g.next().value,'initial-output');assert.equal(f.input.pointer,f.input.lineAddress);assert.equal(f.input.rawLine,'OLD');
  done(g);assert.equal(f.input.pointer,-1n);assert.equal(f.input.rawLine,'OLD');assert.equal(f.input.repeated,true);
});
test('INLI completion composes buffered OCHR suspension, then source CR/LF accounting',async()=>{
  const {inli}=await import('../src/compat/inli.ts');const f=fixture(0n);const chars=[65n,27n];let index=0;f.state.hcpos=5n;
  const g=inli(f.input,f.state,f.r,{flush(){},*ichr(){return chars[index++];},
    *ochr(){yield*ochrBuffered(f.block,f.state,f.r,f.io);},outstr(){},outchr(){},aobjp(){assert.fail();}});
  assert.equal(g.next().value,'output');assert.equal(f.input.rawLine,'A');assert.equal(f.input.block.read('chrcnt'),2n);assert.equal(f.r.c,13n);
  assert.equal(f.input.pointer,-1n);assert.equal(f.state.hcpos,5n);done(g);
  assert.equal(f.state.hcpos,0n);assert.equal(f.state.blank,0n);assert.equal(f.memory.read(30000n),78n);
  assert.deepEqual(f.events,[123n,'byte:13','byte:10']);assert.equal(f.r.c,10n);
});
test('INLI redisplay rereads HUNGUP after a suspended direct caret output',async()=>{
  const {inli}=await import('../src/compat/inli.ts');const f=fixture();const chars=[1n,18n,27n];let index=0;
  const g=inli(f.input,f.state,f.r,{flush(){},*ichr(){return chars[index++];},ochr(){},outstr(){},
    *outchr(c){f.events.push(c);yield 'caret';},aobjp(word){return signed36(halfWords(leftHalf(word)+1n,rightHalf(word)+1n));}});
  assert.equal(g.next().value,'caret');assert.equal(f.r.c,1n);f.state.hungup=-1n;done(g);
  assert.deepEqual(f.events,[94n]);assert.equal(f.input.characterAt(0),1);assert.equal(f.input.block.read('chrcnt'),2n);
});
