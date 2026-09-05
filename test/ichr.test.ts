import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { inputRuntime } from '../src/compat/input-runtime.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { inputRuntimeLayout as extract } from '../tools/input-runtime-layout.ts';
import { ichrTerminal,ichrBuffered,ichrIni,dumpTerminal,terminalOn,setInput } from '../src/compat/ichr.ts';
import type { TerminalInputServices,BufferedInputServices,IniInputServices } from '../src/compat/ichr.ts';
import { inli } from '../src/compat/inli.ts';
import { gtkn } from '../src/compat/gtkn.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { halfWords,leftHalf,rightHalf,signed36,packAscii,MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';

function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(prior=0n,base=BigInt(inputRuntimeLayout.address)){
  const memory=new AddressSpace(),words=Array<bigint>(inputRuntimeLayout.words).fill(prior),lowWords=Array<bigint>(128).fill(prior);
  memory.map(base,words);memory.map(0o140n,lowWords);
  const low=new CommonBlock(memory,'lowseg'),input=new MemoryCommandInput(low,packAscii,base+3n);
  const {state,block}=inputRuntime(input);
  const r={c:77n,f:0n,t1:1n,t2:2n,t3:3n,x1:44n,p1:55n};
  const events:(string|bigint)[]=[];
  function terminal(chars:number[]):TerminalInputServices<string>{let n=0;return{
    *inchwl(){assert.equal(state.inwait,-1n);yield 'terminal';assert.ok(n<chars.length,'fixture exhausted');return BigInt(chars[n++]);},
    clearInput(){events.push('clear');},
  };}
  return {memory,words,lowWords,low,input,block,state,r,events,terminal};
}

test('runtime layout spans 97 words around the independently checked CCFLG anchor',()=>{
  assert.deepEqual(inputRuntimeLayout,extract());assert.equal(inputRuntimeLayout.address,0o4624);
  assert.equal(inputRuntimeLayout.words,97);assert.equal(inputRuntimeLayout.fields.ccflgDot.offset,3);
  assert.equal(inputRuntimeLayout.fields.linbuf.offset,6);assert.equal(inputRuntimeLayout.fields.ic.offset,96);
});
test('runtime construction initializes nothing and keeps LOWSEG INFLAG/INWAIT and input aliases live',()=>{
  const f=fixture(37n);assert.ok(f.words.every(w=>w===37n));assert.ok(f.lowWords.every(w=>w===37n));
  f.state.inwait=-1n;assert.equal(f.low.read('inflag'),-1n);f.low.write('inflag',8n);assert.equal(f.state.inwait,8n);
  f.state.ccflgDot=-1n;assert.equal(f.input.ccflgDot,-1n);f.input.ccflgDot=0n;assert.equal(f.state.ccflgDot,0n);
  for(const key of ['hungup','ccflg','blank'] as const){f.state[key]=99n;assert.equal(f.low.read(key),99n);}
  f.state.echflg=-1n;f.state.iniflg=-1n;assert.equal(f.words[0],-1n);assert.equal(f.words[1],-1n);
});
test('runtime state relocates alongside the input buffer',()=>{
  const f=fixture(0n,20000n);assert.equal(f.block.address('linbuf',0),f.input.lineAddress);
  f.state.echflg=-1n;assert.equal(f.memory.read(20000n),-1n);f.input.acceptLine('A');assert.equal(f.block.read('chrcnt'),2n);
});
test('terminal ICHR drops NUL and CR with a separate INWAIT cycle on every read',()=>{
  const f=fixture();const io=f.terminal([0,13,65]);const g=ichrTerminal(f.state,f.r,io);
  for(let i=0;i<3;i++){assert.equal(g.next().value,'terminal');assert.equal(f.state.inwait,-1n);}
  assert.deepEqual(g.next(),{done:true,value:65n});assert.equal(f.state.inwait,0n);assert.equal(f.r.c,65n);assert.deepEqual(f.events,[]);
});
for(const cc of [-1n,1n])test(`terminal ICHR entry CCFLG ${cc} returns LF, clears monitor input and retains INWAIT/CCFLG`,()=>{
  const f=fixture();f.state.ccflg=cc;f.state.inwait=45n;
  const io=f.terminal([]);io.clearInput=()=>{assert.equal(f.r.c,10n);f.events.push('clear');};
  assert.equal(done(ichrTerminal(f.state,f.r,io)),10n);assert.equal(f.state.inwait,45n);assert.equal(f.state.ccflg,cc);assert.deepEqual(f.events,['clear']);
});
test('entry HUNGUP returns LF without a monitor call or INWAIT write',()=>{
  const f=fixture();f.state.hungup=-1n;f.state.inwait=33n;f.state.ccflg=-1n;
  assert.equal(done(ichrTerminal(f.state,f.r,f.terminal([]))),10n);assert.equal(f.state.inwait,33n);assert.deepEqual(f.events,[]);
});
for(const kind of ['ccflg','hungup'] as const)test(`terminal read observes ${kind} delivered while suspended`,()=>{
  const f=fixture(),g=ichrTerminal(f.state,f.r,f.terminal([65]));assert.equal(g.next().value,'terminal');
  f.state[kind]=-1n;assert.deepEqual(g.next(),{done:true,value:10n});assert.equal(f.state.inwait,0n);
  assert.deepEqual(f.events,kind==='ccflg'?['clear']:[]);
});
test('terminal filters only NUL and CR, retaining a supplied full C word',()=>{
  const f=fixture();assert.equal(done(ichrTerminal(f.state,f.r,f.terminal([128]))),128n);
});
test('a failed monitor read leaves the source INWAIT store visible',()=>{
  const f=fixture();assert.throws(()=>done(ichrTerminal(f.state,f.r,{*inchwl(){throw new Error('monitor unavailable');},clearInput(){assert.fail();}})),/unavailable/);
  assert.equal(f.state.inwait,-1n);assert.equal(f.r.c,77n);
});

function bufferedFixture(values:bigint[]){
  const f=fixture();f.memory.map(30000n,[BigInt(values.length),0n,0n,0n]);f.block.write('ibfctr',30000n);f.block.write('ibfptr',30001n);f.block.write('ibfins',123n);
  const io:BufferedInputServices<string>={
    // Explicit simple-address and byte-array fixture services, not CPU defaults.
    indirect(a){return f.memory.read(a);},
    ildb(a){const n=Number(f.memory.read(a));f.memory.write(a,BigInt(n+1));assert.ok(n<values.length);return values[n];},
    *executeInput(instruction){f.events.push(instruction);yield 'buffer';return true;},
  };
  return {...f,io};
}
test('buffered ICHR consumes NULs and pointer updates, but retains CR',()=>{
  const f=bufferedFixture([0n,0n,13n]);assert.equal(done(ichrBuffered(f.block,f.r,f.io)),13n);
  assert.equal(f.memory.read(30000n),0n);assert.equal(f.memory.read(30001n),3n);assert.deepEqual(f.events,[]);
});
test('buffered ICHR decrements before refill and treats IN skip as EOF',()=>{
  const f=bufferedFixture([]),g=ichrBuffered(f.block,f.r,f.io);assert.equal(g.next().value,'buffer');
  assert.equal(f.memory.read(30000n),-1n);assert.equal(f.r.c,77n);assert.deepEqual(g.next(),{done:true,value:-1n});assert.deepEqual(f.events,[123n]);
});
test('successful refill rereads live count/pointer operands and instruction',()=>{
  const f=bufferedFixture([65n]);f.memory.write(30000n,0n);
  f.io.executeInput=function*(instruction){assert.equal(instruction,123n);yield 'refill';f.block.write('ibfctr',30002n);f.memory.write(30002n,1n);return false;};
  assert.equal(done(ichrBuffered(f.block,f.r,f.io)),65n);assert.equal(f.memory.read(30000n),-1n);assert.equal(f.memory.read(30002n),0n);
});
test('buffer refill can repeat without invented EOF and executes the latest IBFINS each time',()=>{
  const f=bufferedFixture([]);let n=0;
  f.io.executeInput=function*(instruction){f.events.push(instruction);yield 'refill';f.block.write('ibfins',456n);return ++n===2;};
  assert.equal(done(ichrBuffered(f.block,f.r,f.io)),-1n);assert.deepEqual(f.events,[123n,456n]);assert.equal(f.memory.read(30000n),-2n);
});
test('SOSGE count wraps before its sign branch',()=>{
  const f=bufferedFixture([66n]);f.memory.write(30000n,MIN_INTEGER);assert.equal(done(ichrBuffered(f.block,f.r,f.io)),66n);assert.equal(f.memory.read(30000n),MAX_INTEGER);
});
test('buffered ICHR does not replace CPU indirection with right-half addressing',()=>{
  const f=bufferedFixture([67n]);f.block.write('ibfctr',-1n);f.block.write('ibfptr',-2n);
  const seen:bigint[]=[];f.io.indirect=a=>{seen.push(a);return a===f.block.address('ibfctr')?30000n:30001n;};
  assert.equal(done(ichrBuffered(f.block,f.r,f.io)),67n);assert.deepEqual(seen,[f.block.address('ibfctr'),f.block.address('ibfptr')]);
});

test('DMPBUF and TTYON guard separate monitor calls and preserve unrelated state',()=>{
  const f=fixture();const io={output(){f.events.push('output');f.state.hungup=-1n;},skpinl(){f.events.push('skpinl');}};
  terminalOn(f.state,io);dumpTerminal(f.state,io);assert.deepEqual(f.events,['output']);
  f.state.hungup=0n;io.output=()=>{f.events.push('output');};terminalOn(f.state,io);assert.deepEqual(f.events,['output','output','skpinl']);
});
function iniFixture(value:bigint){
  const f=fixture();f.state.iniflg=-1n;
  const io:IniInputServices<string>={
    *buffered(){yield 'file';return value;},ochr(c){f.events.push(c);},
    *close(){f.events.push('close');f.r.x1=900n;f.r.p1=901n;yield 'close';},
    output(){f.events.push('output');},skpinl(){f.events.push('skpinl');},ttyFileAddress:800n,
    *setInput(){assert.equal(f.r.x1,800n);f.events.push('seti');f.r.x1=902n;yield 'seti';},
    *dispatch(){assert.equal(f.r.x1,44n);assert.equal(f.r.p1,55n);assert.equal(f.state.iniflg,0n);assert.equal(f.state.blank,-1n);f.events.push('dispatch');return 68n;},
  };
  return {...f,io};
}
for(const [character,echo,expected] of [[65n,0n,true],[65n,1n,true],[65n,-1n,false],[7n,0n,false],[13n,0n,true]] as const)
  test(`INI character ${character}, ECHFLG ${echo} preserves its source echo branch`,()=>{
    const f=iniFixture(character);f.state.echflg=echo;assert.equal(done(ichrIni(f.state,f.r,f.io)),character);
    assert.deepEqual(f.events,expected?[character]:[]);assert.equal(f.state.iniflg,-1n);assert.equal(f.r.x1,44n);
  });
test('positive CCFLG does not cancel INI input',()=>{
  const f=iniFixture(65n);f.state.ccflg=1n;assert.equal(done(ichrIni(f.state,f.r,f.io)),65n);assert.equal(f.state.ccflg,1n);assert.deepEqual(f.events,[65n]);
});
test('negative CCFLG after a file character clears before close, then switches/restores in source order',()=>{
  const f=iniFixture(65n);f.state.ccflg=-1n;const g=ichrIni(f.state,f.r,f.io);
  assert.equal(g.next().value,'file');assert.equal(g.next().value,'close');assert.equal(f.state.ccflg,0n);assert.equal(f.state.iniflg,-1n);
  assert.equal(g.next().value,'seti');assert.equal(f.state.iniflg,-1n);assert.equal(f.r.x1,902n);assert.deepEqual(g.next(),{done:true,value:68n});
  assert.deepEqual(f.events,['close','output','skpinl','output','seti','dispatch']);assert.equal(f.r.x1,44n);assert.equal(f.r.p1,55n);
});
test('INI EOF leaves negative CCFLG for the terminal path to handle',()=>{
  const f=iniFixture(-1n);f.state.ccflg=-1n;f.io.dispatch=function*(){return yield*ichrTerminal(f.state,f.r,f.terminal([]));};
  assert.equal(done(ichrIni(f.state,f.r,f.io)),10n);assert.equal(f.state.ccflg,-1n);assert.equal(f.state.iniflg,0n);
  assert.deepEqual(f.events,['close','output','skpinl','output','seti','clear']);
});
test('INI handoff under hangup still closes/selects input but skips both flushes and SKPINL',()=>{
  const f=iniFixture(-1n);f.state.hungup=-1n;assert.equal(done(ichrIni(f.state,f.r,f.io)),68n);assert.deepEqual(f.events,['close','seti','dispatch']);
});

test('SETI swaps only X1/IBFLB right halves and updates live IC, buffer addresses and IN channel',()=>{
  const f=fixture();f.memory.map(31000n,[halfWords(999n,456n),0n,halfWords(0o123n,7n),0n,0n,halfWords(888n,32000n)]);
  f.r.x1=signed36(halfWords(0o765432n,31000n));f.block.write('ibflb',signed36(halfWords(0o654321n,111n)));
  // Explicit fixture definitions for absent monitor constants and opcode.
  const machine={bufferCountOffset:2n,bufferPointerOffset:1n,inInstructionLeftHalf:0o567000n};
  setInput(f.block,f.r,machine);
  assert.equal(f.r.x1,signed36(halfWords(0o765432n,111n)));assert.equal(f.block.read('ibflb'),signed36(halfWords(0o654321n,31000n)));
  assert.equal(f.block.read('ic'),456n);assert.equal(f.block.read('ibfctr'),32002n);assert.equal(f.block.read('ibfptr'),32001n);
  assert.equal(f.block.read('ibfins'),signed36((halfWords(machine.inInstructionLeftHalf,0n)&~(15n<<23n))|(3n<<23n)));
  assert.equal(f.r.t1,31000n);assert.equal(f.r.t2,0o123n);assert.equal(f.r.t3,32001n);
});
test('SETI reads aliasing file words after prior state writes rather than snapshotting the descriptor',()=>{
  const f=fixture();f.r.x1=f.block.address('ibflb');f.block.write('ibflb',99n);
  // New .FBCIO aliases IBFLB, changed by SETI before the .FBCIO read.
  f.memory.map(f.block.address('ic')+1n,[halfWords(7n,123n)]);
  setInput(f.block,f.r,{bufferCountOffset:0n,bufferPointerOffset:1n,inInstructionLeftHalf:0n});
  assert.equal(f.block.read('ic'),f.block.address('ibflb'));assert.equal(f.r.x1,99n);
});

test('terminal ICHR, NXCH, INLI and GTKN compose over the same live source words',()=>{
  const f=fixture();f.input.pointer=-1n;
  const terminal=f.terminal([0,13,84,73,77,69,13,10]);const out=new TerminalOutput();
  const editor={*ichr(){return yield*ichrTerminal(f.state,f.r,terminal);},flush(){f.events.push('flush');},
    ochr(c:bigint){out.character(c);},outstr(s:string){f.events.push(s);},outchr(c:bigint){f.events.push(c);},aobjp(){assert.fail();}};
  const state=Object.assign(f.state,{locked:0n,svlock:0n});
  done(gtkn(state,f.input,out,{inliOwnsMemory:true,*inli(){return yield*inli(f.input,state,f.r,editor);},
    daytime:()=>0n,inputPending:()=>false,unlo(){},*lock(){return true;},*hibernate(){}}));
  assert.equal(f.input.tokens[0].text,'TIME');assert.equal(f.state.inwait,0n);assert.equal(f.state.blank,1n);
  assert.equal(f.input.rawLine,'TIME');assert.deepEqual(f.events,['flush']);
});
test('hangup during composed terminal input terminates INLI and makes GTKN force QUIT',()=>{
  const f=fixture();f.input.pointer=-1n;const terminal=f.terminal([65]);
  const state=Object.assign(f.state,{locked:0n,svlock:0n});
  const g=gtkn(state,f.input,new TerminalOutput(),{inliOwnsMemory:true,
    *inli(){return yield*inli(f.input,state,f.r,{*ichr(){return yield*ichrTerminal(state,f.r,terminal);},flush(){},ochr(){},outstr(){},outchr(){},aobjp(){assert.fail();}});},
    daytime:()=>0n,inputPending:()=>false,unlo(){},*lock(){return true;},*hibernate(){}});
  assert.equal(g.next().value,'terminal');state.hungup=-1n;done(g);
  assert.equal(f.input.tokens[0].text,'QUIT');assert.equal(f.input.rawLine,'');assert.equal(f.state.inwait,0n);
});

test('INI EOF mid-line composes buffered reads, SETI, terminal ICHR and INLI on live words',async()=>{
  const {lowState}=await import('../src/game/common-state.ts');
  const f=bufferedFixture([65n,0n]);f.state.iniflg=-1n;f.block.write('ic',100n);
  // Explicit fixture routine addresses and monitor constants. The dispatch
  // fixture recognizes only these two addresses; it is not a machine loader.
  f.memory.map(31000n,[halfWords(0n,200n),0n,halfWords(3n,0n),0n,0n,32000n]);
  const terminal=f.terminal([66,27]),out=lowState(f.low).output;
  const iniIo:IniInputServices<string>={
    *buffered(){return yield*ichrBuffered(f.block,f.r,f.io);},ochr:c=>out.character(c),
    *close(){f.events.push('close');},output(){f.events.push('output');},skpinl(){f.events.push('skpinl');},ttyFileAddress:31000n,
    *setInput(){setInput(f.block,f.r,{bufferCountOffset:2n,bufferPointerOffset:1n,inInstructionLeftHalf:33n});},
    *dispatch(){return yield*dispatch();},
  };
  function* dispatch():Generator<string,bigint,void>{
    const address=f.block.read('ic');
    if(address===100n)return yield*ichrIni(f.state,f.r,iniIo);
    assert.equal(address,200n);return yield*ichrTerminal(f.state,f.r,terminal);
  }
  done(inli(f.input,f.state,f.r,{*ichr(){return yield*dispatch();},flush(){f.events.push('flush');},
    ochr:c=>out.character(c),outstr(){assert.fail();},outchr(){assert.fail();},aobjp(){assert.fail();}}));
  assert.equal(f.input.rawLine,'AB');assert.equal(f.input.block.read('chrcnt'),3n);assert.equal(f.input.pointer,-1n);
  assert.equal(f.state.iniflg,0n);assert.equal(f.state.blank,0n);assert.equal(f.block.read('ic'),200n);
  assert.equal(f.block.read('ibfctr'),32002n);assert.equal(f.block.read('ibfptr'),32001n);
  assert.equal(f.r.x1,44n);assert.equal(f.r.p1,55n);assert.equal(out.drain(),'A\r\n');
  assert.deepEqual(f.events,['flush',123n,'close','output','skpinl','output']);
});
