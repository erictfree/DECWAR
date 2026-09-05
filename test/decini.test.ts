import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { inputRuntime } from '../src/compat/input-runtime.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { fileDescriptors } from '../src/generated/file-descriptors.ts';
import { fileDescriptors as extract } from '../tools/file-descriptors.ts';
import { installFileDescriptors,descriptorAddresses } from '../src/compat/file-descriptors.ts';
import { decini } from '../src/compat/decini.ts';
import type { DeciniServices } from '../src/compat/decini.ts';
import { packAscii,packSixbit,signed36,halfWords,leftHalf,rightHalf } from '../src/compat/word36.ts';

function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
// Explicit fixture symbol assignments; monitor flags/opcodes and private
// routine addresses are not established by these values.
const symbols:Record<string,bigint>={'ochr.b':100n,'ichr.t':101n,'iich.':102n,'ichr.b':103n,
  tobuf:30000n,tobcb:30100n,dibuf:30200n,dbuf:30300n,'.fowrt':1n,'.fored':2n,'.ioasc':3n,'uu.phs':4n,'io.lem':8n,'ogch.':104n,stabuf:30400n,'.fosau':5n,'.iodmp':6n};
function fixture(chars=[49n]){
  const memory=new AddressSpace();memory.map(0o140n,Array<bigint>(128).fill(0n));memory.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));
  const input=new MemoryCommandInput(new CommonBlock(memory,'lowseg'),packAscii),{block,state}=inputRuntime(input);
  const words=Array<bigint>(fileDescriptors.words.length).fill(77n);memory.map(BigInt(fileDescriptors.address),words);
  const r={x1:44n,p1:55n,t1:66n,x2:88n,x3:99n,t2:0n,t3:0n};const events:(string|bigint)[]=[];let read=0;
  const io:DeciniServices<string>={files:descriptorAddresses(),
    *outstr(text){events.push(text);yield 'prompt';},*inchwl(){yield 'read';assert.ok(read<chars.length,'fixture exhausted');return chars[read++];},
    *clearInput(){events.push('clear');},*hibernate(operand){events.push(operand);yield 'hibernate';},
    *open(){events.push(`open:${r.x1}`);yield 'open';return true;},
    *ttyon(){events.push('ttyon');},*ocrl(){events.push('ocrl');},*seti(){events.push('seti');r.x1=999n;yield 'seti';},
  };
  return {memory,input,block,state,words,r,events,io};
}
test('all twelve descriptors and exact DECINI prompt are extracted from the supplied source',()=>{
  assert.deepEqual(fileDescriptors,extract());assert.equal(fileDescriptors.words.length,135);
  assert.deepEqual(Object.values(fileDescriptors.blocks).map(b=>b.words),[8,12,12,12,11,14,11,11,11,11,11,11]);
  assert.equal(fileDescriptors.prompt.text,'\r\nAre you:\r\n1 - Beginner\r\n2 - Intermediate\r\n3 - Expert\r\n\r\nWhich? ');
});
test('descriptor installer preserves explicit octal sizes, channels, SIXBIT and external symbol values',()=>{
  const f=fixture();installFileDescriptors(f.memory,n=>symbols[n]);const a=descriptorAddresses();
  assert.equal(f.memory.read(a.ttyfil),halfWords(100n,101n));assert.equal(f.memory.read(a.ttyfil+3n),15n);
  for(const [name,ext] of [['inibeg','BEG'],['iniint','INT'],['iniexp','EXP']] as const){
    assert.equal(f.memory.read(a[name]+1n),signed36(halfWords(-1n,0o203n)));
    assert.equal(f.memory.read(a[name]+2n),halfWords(4n,2n));assert.equal(f.memory.read(a[name]+8n),signed36(packSixbit(ext)));assert.equal(f.memory.read(a[name]+10n),-1n);
  }
  assert.equal(f.memory.read(a.nwsfil+1n),signed36(halfWords(-1n,0o406n)));assert.equal(f.memory.read(a.hl1fil+11n),signed36(packSixbit('DECWAR')));
});
test('unresolved descriptor symbol fails before any installation writes',()=>{
  const f=fixture();assert.throws(()=>installFileDescriptors(f.memory,n=>n==='iich.'?undefined as unknown as bigint:symbols[n]),/iich/);
  assert.ok(f.words.every(w=>w===77n));
});
test('descriptor addresses and private symbols relocate independently',()=>{
  const memory=new AddressSpace();memory.map(20000n,Array<bigint>(fileDescriptors.words.length).fill(0n));installFileDescriptors(memory,n=>n==='dibuf'?22222n:symbols[n],20000n);
  const a=descriptorAddresses(20000n);assert.equal(a.inibeg,20008n);assert.equal(memory.read(a.inibeg+5n),22222n);assert.equal(a.hl2fil,20069n);
});
for(const [c,name] of [[49n,'inibeg'],[50n,'iniint'],[51n,'iniexp']] as const)test(`DECINI choice ${c} selects ${name} and restores saved registers`,()=>{
  const f=fixture([c]);f.input.acceptLine('OLD');done(decini(f.input,f.state,f.r,f.io));
  assert.equal(f.input.pointer,-1n);assert.equal(f.input.rawLine,'OLD');assert.equal(f.state.iniflg,-1n);assert.equal(f.r.x1,44n);assert.equal(f.r.p1,55n);
  assert.deepEqual(f.events,[fileDescriptors.prompt.text,'clear',8n,`open:${f.io.files[name]}`,'ttyon','ocrl','seti']);
});
test('invalid raw input retries only after clearing and hibernating, preserving the old buffer meanwhile',()=>{
  const f=fixture([13n,52n,50n]);f.input.acceptLine('OLD');const pointer=f.input.pointer;
  f.io.open=function*(){assert.equal(f.input.pointer,-1n);return false;};
  const g=decini(f.input,f.state,f.r,f.io);assert.equal(g.next().value,'prompt');assert.equal(f.input.pointer,pointer);
  assert.equal(g.next().value,'read');assert.equal(g.next().value,'hibernate');assert.equal(f.input.pointer,pointer);done(g);
  assert.equal(f.events.filter(e=>e===fileDescriptors.prompt.text).length,3);assert.equal(f.events.filter(e=>e===8n).length,3);
});
test('DECINI accepts only raw ASCII digits, unlike the FORTRAN token experience prompt',()=>{
  const f=fixture([1n,packAscii('BEGIN'),49n]);done(decini(f.input,f.state,f.r,f.io));
  assert.equal(f.events.filter(e=>e===fileDescriptors.prompt.text).length,3);
});
test('entry hangup selects expert, skips prompt/read/clear, but still hibernates and tries OPEN',()=>{
  const f=fixture([]);f.state.hungup=-1n;done(decini(f.input,f.state,f.r,f.io));
  assert.deepEqual(f.events,[8n,`open:${f.io.files.iniexp}`,'ttyon','ocrl','seti']);assert.equal(f.state.iniflg,-1n);
});
test('hangup during prompt makes expert the selected character',()=>{
  const f=fixture([]),g=decini(f.input,f.state,f.r,f.io);assert.equal(g.next().value,'prompt');f.state.hungup=-1n;
  assert.equal(g.next().value,'hibernate');assert.equal(f.r.p1,51n);done(g);assert.ok(f.events.includes(`open:${f.io.files.iniexp}`));
});
test('hangup during read suppresses clear but retains the returned valid choice',()=>{
  const f=fixture([49n]),g=decini(f.input,f.state,f.r,f.io);g.next();assert.equal(g.next().value,'read');f.state.hungup=-1n;
  assert.equal(g.next().value,'hibernate');assert.equal(f.r.p1,49n);done(g);assert.ok(f.events.includes(`open:${f.io.files.inibeg}`));assert.ok(!f.events.includes('clear'));
});
test('HIBER sees octal 10 and can change P1 before the source validates it',()=>{
  const f=fixture([49n]);f.io.hibernate=function*(operand){assert.equal(operand,8n);assert.equal(f.r.t1,8n);yield 'hibernate';f.r.p1=51n;};
  done(decini(f.input,f.state,f.r,f.io));assert.ok(f.events.includes(`open:${f.io.files.iniexp}`));
});
test('OPEN failure preserves INIFLG and skips TTYON/OCRL/SETI',()=>{
  const f=fixture();f.state.iniflg=71n;f.io.open=function*(){yield 'failed-open';return false;};
  done(decini(f.input,f.state,f.r,f.io));assert.equal(f.state.iniflg,71n);assert.equal(f.r.x1,44n);assert.equal(f.r.p1,55n);
  assert.deepEqual(f.events,[fileDescriptors.prompt.text,'clear',8n]);
});
test('INIFLG and saved registers change only after SETI returns',()=>{
  const f=fixture(),g=decini(f.input,f.state,f.r,f.io);while(g.next().value!=='seti'){}
  assert.equal(f.state.iniflg,0n);assert.equal(f.r.x1,999n);assert.equal(f.r.p1,49n);done(g);assert.equal(f.state.iniflg,-1n);assert.equal(f.r.x1,44n);
});
test('raw read does not synthesize ICHR INWAIT/CCFLG effects',()=>{
  const f=fixture();f.state.inwait=123n;f.state.ccflg=-1n;done(decini(f.input,f.state,f.r,f.io));assert.equal(f.state.inwait,123n);assert.equal(f.state.ccflg,-1n);
});

test('loaded INI descriptor composes DECINI, OPEN, GTKN, EOF/CLOSE and return to terminal input',async()=>{
  const {FileBlock,openFile,closeFile}=await import('../src/compat/files.ts');const {fileLayout}=await import('../src/generated/file-layout.ts');
  const {setInput,ichrBuffered,ichrIni,ichrTerminal,terminalOn}=await import('../src/compat/ichr.ts');
  const {inli}=await import('../src/compat/inli.ts');const {gtkn}=await import('../src/compat/gtkn.ts');const {lowState}=await import('../src/game/common-state.ts');
  const f=fixture();f.memory.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));const file=new FileBlock(f.memory);
  installFileDescriptors(f.memory,n=>n==='dibuf'?file.address('dibuf',0):n==='dbuf'?file.address('dbuf',0):symbols[n]);
  const r=Object.assign(f.r,{c:0n,f:0n}),state=Object.assign(f.state,{jbff:50000n,jbrel:60000n,locked:0n,svlock:0n});
  const out=lowState(f.input.low).output,files=descriptorAddresses();f.block.write('ibflb',files.ttyfil);
  // The archive has no BEG/INT/EXP content. These bytes are solely an explicit
  // composition fixture; they are not shipped as reconstructed startup files.
  const bytes=[84n,73n,77n,69n,10n],tty=[81n,85n,73n,84n,10n];let terminalIndex=0;
  const monitor={lookupOffset:5n,closeInstructionLeftHalf:5n,
    blt(last:bigint){let a=leftHalf(r.t1),b=rightHalf(r.t1);while(b<=last)f.memory.write(b++,f.memory.read(a++));r.t1=signed36(halfWords(a,b));},
    *getppn(){return halfWords(1n,2n);},*core(){return true;},*outputTTY(){},*outstr(){},successReturn(){},
    *filop(){assert.equal(file.read('le.ext'),signed36(packSixbit('BEG')));f.memory.write(file.address('dibuf',0)+1n,0n);f.memory.write(file.address('dibuf',0)+2n,5n);return true;},
    *executeClose(){f.events.push('closed-ini');},
  };
  f.io.open=function*(){return yield*openFile(file,state,r,monitor);};
  f.io.ttyon=function*(){terminalOn(state,{output(){},skpinl(){}});};f.io.ocrl=function*(){out.crlf();};
  f.io.seti=function*(){setInput(f.block,r,{bufferCountOffset:2n,bufferPointerOffset:1n,inInstructionLeftHalf:5n});};
  done(decini(f.input,state,r,f.io));assert.equal(f.block.read('ic'),symbols['iich.']);assert.equal(file.read('fl.ff'),50000n);assert.equal(state.jbff,50131n);
  function* dispatch():Generator<string,bigint,void>{
    const address=f.block.read('ic');
    if(address===symbols['iich.'])return yield*ichrIni(state,r,{
      *buffered(){return yield*ichrBuffered(f.block,r,{indirect:a=>f.memory.read(a),ildb(a){const n=Number(f.memory.read(a));f.memory.write(a,BigInt(n+1));return bytes[n];},*executeInput(){return true;}});},
      ochr:c=>out.character(c),*close(){yield*closeFile(file,state,r,monitor);},output(){},skpinl(){},ttyFileAddress:files.ttyfil,
      *setInput(){yield*f.io.seti();},*dispatch(){return yield*dispatch();},
    });
    assert.equal(address,symbols['ichr.t']);return yield*ichrTerminal(state,r,{*inchwl(){assert.ok(terminalIndex<tty.length);return tty[terminalIndex++];},clearInput(){}});
  }
  const tokenIo={inliOwnsMemory:true,daytime:()=>0n,inputPending:()=>false,unlo(){},*lock(){return true;},*hibernate(){},
    *inli(){return yield*inli(f.input,state,r,{*ichr(){return yield*dispatch();},flush(){},ochr:c=>out.character(c),outstr(){},outchr(){},aobjp(){assert.fail();}});},
  };
  done(gtkn(state,f.input,out,tokenIo));assert.equal(f.input.tokens[0].text,'TIME');assert.equal(state.iniflg,-1n);
  done(gtkn(state,f.input,out,tokenIo));assert.equal(f.input.tokens[0].text,'QUIT');assert.equal(state.iniflg,0n);assert.equal(state.jbff,50000n);
  assert.equal(file.read('fl.ff'),0n);assert.equal(f.block.read('ibflb'),files.ttyfil);assert.ok(f.events.includes('closed-ini'));
});
