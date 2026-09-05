import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace } from '../src/compat/memory.ts';
import { FileBlock,openFile,closeFile,fileWarning } from '../src/compat/files.ts';
import type { OpenServices,CloseServices } from '../src/compat/files.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { fileLayout as extract } from '../tools/file-layout.ts';
import { halfWords,leftHalf,rightHalf,signed36,packSixbit,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';

function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const memory=new AddressSpace(),words=Array<bigint>(fileLayout.words).fill(0n);memory.map(BigInt(fileLayout.address),words);
  const block=new FileBlock(memory),descriptor=[0n,40000n,halfWords(3n,1n),4n,packSixbit('SYS'),halfWords(42000n,42100n),halfWords(1n,2n),packSixbit('DECWAR'),packSixbit('TXT'),6n,7n,0n];
  memory.map(41000n,descriptor);
  const state={jbff:50000n,jbrel:51000n,hungup:0n},r={x1:41000n,x2:88n,x3:99n,t1:1n,t2:2n};
  const events:(string|bigint)[]=[];let skips=0;
  const io:OpenServices<string>={lookupOffset:5n,
    // Explicit sequential, non-boundary BLT fixture. CPU updates and carry at
    // arbitrary addresses remain the caller's required production service.
    blt(last){let source=leftHalf(r.t1),target=rightHalf(r.t1);while(target<=last){memory.write(target,memory.read(source));source++;target++;}r.t1=signed36(halfWords(source,target));},
    *core(value){events.push(`core:${value}`);yield 'core';return true;},
    *getppn(){events.push('getppn');yield 'getppn';return halfWords(1n,2n);},
    *filop(){events.push('filop');yield 'filop';return true;},
    successReturn(){skips++;events.push('skip');},
    *outputTTY(){events.push('output');yield 'warning-output';},*outstr(text){events.push(text);},
  };
  const closeIo:CloseServices<string>={...io,closeInstructionLeftHalf:5n,*executeClose(){events.push('close');yield 'close';}};
  return {memory,words,block,descriptor,state,r,events,io,closeIo,skips:()=>skips};
}
test('file-state layout derives 700 words from the STABUF map anchor',()=>{
  assert.deepEqual(fileLayout,extract());assert.equal(fileLayout.address,0o5243);assert.equal(fileLayout.words,700);assert.equal(fileLayout.mapLine,743);
  assert.equal(fileLayout.fields['fo.fnc'].offset,fileLayout.fields.foblk.offset);assert.equal(fileLayout.fields['le.nam'].offset,fileLayout.fields.leblk.offset);
});
test('file block construction retains supplied storage and supports relocation/aliases',()=>{
  const memory=new AddressSpace(),words=Array<bigint>(700).fill(77n);memory.map(20000n,words);const block=new FileBlock(memory,20000n);
  assert.ok(words.every(w=>w===77n));block.write('foblk',12n,2);assert.equal(block.read('fo.dev'),12n);
  block.write('le.ext',34n);assert.equal(block.read('leblk',1),34n);assert.equal(block.address('stabuf',0),20000n);
});
test('static named OPEN copies blocks, selects long FILOP and restores X2/X3 and real JBFF',()=>{
  const f=fixture();f.block.write('fl.ff',777n);const g=openFile(f.block,f.state,f.r,f.io);
  assert.equal(g.next().value,'filop');assert.equal(f.state.jbff,40000n);assert.equal(f.block.read('fl.ff'),0n);
  assert.equal(f.r.t1,halfWords(6n,f.block.address('foblk',0)));
  assert.deepEqual([0,1,2,3,4].map(i=>f.block.read('foblk',i)),f.descriptor.slice(2,7).map(signed36));
  assert.equal(f.block.read('fo.leb'),f.block.address('leblk',0));assert.deepEqual([0,1,2,3].map(i=>f.block.read('leblk',i)),f.descriptor.slice(7,11).map(signed36));
  assert.deepEqual(g.next(),{done:true,value:true});assert.equal(f.state.jbff,50000n);assert.equal(f.r.x2,88n);assert.equal(f.r.x3,99n);assert.equal(f.skips(),1);
});
test('device-only OPEN leaves lookup block and sixth FILOP word stale and uses five words',()=>{
  const f=fixture();f.descriptor[7]=0n;f.block.write('fo.leb',777n);f.block.write('le.ext',888n);
  f.io.filop=function*(){assert.equal(leftHalf(f.r.t1),5n);assert.equal(f.block.read('fo.leb'),777n);assert.equal(f.block.read('le.ext'),888n);return true;};
  assert.equal(done(openFile(f.block,f.state,f.r,f.io)),true);
});
test('negative PPN uses GETPPN result after suspension and ignores SFD words',()=>{
  const f=fixture();f.descriptor[10]=-1n;f.descriptor[11]=999n;
  const g=openFile(f.block,f.state,f.r,f.io);assert.equal(g.next().value,'getppn');assert.equal(f.block.read('le.ppn'),-1n);
  assert.equal(g.next().value,'filop');assert.equal(f.block.read('le.ppn'),halfWords(1n,2n));done(g);
});
test('dynamic OPEN within allocated core records old JBFF, reserves words, and performs no CORE',()=>{
  const f=fixture();f.descriptor[1]=signed36(halfWords(-1n,100n));
  assert.equal(done(openFile(f.block,f.state,f.r,f.io)),true);assert.equal(f.block.read('fl.ff'),50000n);assert.equal(f.state.jbff,50100n);
  assert.deepEqual(f.events,['filop','skip']);
});
test('dynamic OPEN grows to the last needed word before assigning the FILOP buffer base',()=>{
  const f=fixture();f.descriptor[1]=signed36(halfWords(-1n,2000n));const g=openFile(f.block,f.state,f.r,f.io);
  assert.equal(g.next().value,'core');assert.equal(f.r.t1,51999n);assert.equal(f.state.jbff,50000n);assert.equal(f.block.read('fl.ff'),50000n);
  assert.equal(g.next().value,'filop');assert.equal(f.state.jbff,50000n);done(g);assert.equal(f.state.jbff,52000n);
});
test('CORE allocation failure warns and preserves FL.FF without restoring a monitor-modified JBFF',()=>{
  const f=fixture();f.descriptor[1]=signed36(halfWords(-1n,2000n));f.io.core=function*(){f.state.jbff=12345n;return false;};
  assert.equal(done(openFile(f.block,f.state,f.r,f.io)),false);assert.equal(f.state.jbff,12345n);assert.equal(f.block.read('fl.ff'),50000n);
  assert.equal(f.r.x2,88n);assert.equal(f.r.x3,99n);assert.deepEqual(f.events,['output','%Not enough core\r\n']);assert.equal(f.skips(),0);
});
test('success return skip occurs before restoring JBFF and saved registers',()=>{
  const f=fixture();f.io.successReturn=()=>{assert.equal(f.state.jbff,40000n);assert.equal(f.r.x2,40000n);assert.equal(f.r.x3,50000n);};
  done(openFile(f.block,f.state,f.r,f.io));assert.equal(f.state.jbff,50000n);
});
test('FILOP failure without X3/JBFF equality does not shrink core',()=>{
  const f=fixture();f.io.filop=function*(){return false;};assert.equal(done(openFile(f.block,f.state,f.r,f.io)),false);
  assert.equal(f.state.jbff,50000n);assert.deepEqual(f.events,[]);assert.equal(f.skips(),0);
});
test('FILOP failure with equality rolls back to X2 and ignores CORE failure',()=>{
  const f=fixture();f.descriptor[1]=signed36(halfWords(-1n,100n));
  f.io.filop=function*(){f.state.jbff=f.r.x3;return false;};f.io.core=function*(value){f.events.push(value);yield 'shrink';return false;};
  const g=openFile(f.block,f.state,f.r,f.io);assert.equal(g.next().value,'shrink');assert.equal(f.r.x3,50000n);done(g);
  assert.equal(f.state.jbff,50000n);assert.equal(f.block.read('fl.ff'),50000n);assert.deepEqual(f.events,[50000n]);
});
test('FILOP failure equality test can shrink a static buffer; do not infer allocation from FL.FF',()=>{
  const f=fixture();f.io.filop=function*(){f.state.jbff=f.r.x3;return false;};
  assert.equal(done(openFile(f.block,f.state,f.r,f.io)),false);assert.deepEqual(f.events,['core:40000']);assert.equal(f.state.jbff,40000n);assert.equal(f.block.read('fl.ff'),0n);
});
for(const [flag,ext,expectedExt,expectedPpn,device] of [
  [-1n,'GRP','GRP',0n,'DSK'],[1n,'STA','STA',0n,'SYS'],[1n,'GRP','MPH',7n,'SYS'],[1n,'TXT','TXT',7n,'SYS'],[0n,'GRP','GRP',7n,'SYS'],
] as const)test(`development file handling flag=${flag} extension=${ext}`,()=>{
  const f=fixture();f.block.write('debflg',flag);f.descriptor[8]=signed36(packSixbit(ext)|123n);
  done(openFile(f.block,f.state,f.r,f.io));assert.equal(leftHalf(f.block.read('le.ext')),leftHalf(packSixbit(expectedExt)));
  assert.equal(rightHalf(f.block.read('le.ext')),123n);assert.equal(f.block.read('le.ppn'),expectedPpn);assert.equal(f.block.read('fo.dev'),signed36(packSixbit(device)));
});
test('device-only development OPEN acts on retained lookup extension/PPN',()=>{
  const f=fixture();f.descriptor[7]=0n;f.block.write('debflg',1n);f.block.write('le.ext',packSixbit('GRP'));f.block.write('le.ppn',91n);
  done(openFile(f.block,f.state,f.r,f.io));assert.equal(f.block.read('le.ext'),signed36(packSixbit('MPH')));assert.equal(f.block.read('le.ppn'),91n);
});
test('second OPEN overwrites the shared descriptor and FL.FF rather than creating a hidden stack',()=>{
  const f=fixture();f.descriptor[1]=signed36(halfWords(-1n,100n));done(openFile(f.block,f.state,f.r,f.io));
  f.descriptor[1]=40000n;f.descriptor[7]=packSixbit('OTHER');done(openFile(f.block,f.state,f.r,f.io));
  assert.equal(f.block.read('fl.ff'),0n);assert.equal(f.block.read('le.nam'),signed36(packSixbit('OTHER')));assert.equal(f.state.jbff,50100n);
});
test('OPEN passes live BLT pointers to the required CPU service instead of snapshotting data',()=>{
  const f=fixture();let calls=0;const copy=f.io.blt;
  f.io.blt=last=>{calls++;assert.equal(rightHalf(f.r.t1),calls===1?f.block.address('foblk',0):f.block.address('leblk',0));if(calls===1)f.descriptor[7]=0n;copy(last);};
  done(openFile(f.block,f.state,f.r,f.io));assert.equal(calls,1);
});
test('OPEN buffer arithmetic wraps X3 as a word and masks the last-word address',()=>{
  const f=fixture();f.state.jbff=MAX_INTEGER;f.state.jbrel=262143n;f.descriptor[1]=signed36(halfWords(-1n,1n));
  done(openFile(f.block,f.state,f.r,f.io));assert.equal(f.state.jbff,MIN_INTEGER);assert.equal(f.block.read('fl.ff'),MAX_INTEGER);
});

test('CLOSE executes the constructed channel instruction before examining FL.FF',()=>{
  const f=fixture();f.block.write('fo.fnc',halfWords(0o123n,7n));f.block.write('fl.ff',0n);
  const g=closeFile(f.block,f.state,f.r,f.closeIo);assert.equal(g.next().value,'close');
  assert.equal(f.r.t1,signed36((halfWords(5n,0n)&~(15n<<23n))|(3n<<23n)));f.block.write('fl.ff',50000n);
  assert.equal(g.next().value,'core');assert.equal(f.block.read('fl.ff'),0n);assert.equal(f.state.jbff,50000n);done(g);
});
for(const saved of [0n,-1n])test(`CLOSE saved FL.FF=${saved} returns without changing JBFF`,()=>{
  const f=fixture();f.block.write('fl.ff',saved);done(closeFile(f.block,f.state,f.r,f.closeIo));
  assert.equal(f.state.jbff,50000n);assert.equal(f.block.read('fl.ff'),saved);assert.equal(f.r.t1,saved);assert.deepEqual(f.events,['close']);
});
test('same-page CLOSE clears FL.FF and restores JBFF without CORE',()=>{
  const f=fixture();f.block.write('fl.ff',50000n);f.state.jbrel=50100n;f.state.jbff=50999n;
  done(closeFile(f.block,f.state,f.r,f.closeIo));assert.equal(f.block.read('fl.ff'),0n);assert.equal(f.state.jbff,50000n);
  assert.equal(f.r.t1,49664n);assert.equal(f.r.t2,49664n);assert.deepEqual(f.events,['close']);
});
test('different-page CLOSE uses the 18-bit page mask and preserves reset state after CORE failure',()=>{
  const f=fixture();f.block.write('fl.ff',(1n<<18n)+50000n);f.state.jbrel=51000n;
  f.closeIo.core=function*(value){assert.equal(value,49664n);return false;};done(closeFile(f.block,f.state,f.r,f.closeIo));
  assert.equal(f.state.jbff,(1n<<18n)+50000n);assert.equal(f.block.read('fl.ff'),0n);assert.deepEqual(f.events,['close','output',"%Can't reduce core\r\n"]);
});
test('CLOSE is still executed while hung up, but its warning output is suppressed',()=>{
  const f=fixture();f.state.hungup=-1n;f.block.write('fl.ff',50000n);f.closeIo.core=function*(){return false;};
  done(closeFile(f.block,f.state,f.r,f.closeIo));assert.deepEqual(f.events,['close']);
});
test('warning rereads HUNGUP after a suspended flush',()=>{
  const f=fixture();const g=fileWarning(f.state,'Not enough core',f.io);assert.equal(g.next().value,'warning-output');f.state.hungup=-1n;done(g);assert.deepEqual(f.events,['output']);
});
test('actual OPEN then CLOSE reserves and releases the recorded dynamic buffer region',()=>{
  const f=fixture();f.descriptor[1]=signed36(halfWords(-1n,2000n));
  f.io.core=function*(value){f.state.jbrel=value;return true;};done(openFile(f.block,f.state,f.r,f.io));assert.equal(f.state.jbff,52000n);
  f.closeIo.core=function*(value){f.state.jbrel=value;return true;};done(closeFile(f.block,f.state,f.r,f.closeIo));
  assert.equal(f.state.jbff,50000n);assert.equal(f.state.jbrel,49664n);assert.equal(f.block.read('fl.ff'),0n);
});

test('NEWS composes OPEN, SETI, buffered ICHR, CLOSE and restoration of the prior input file',async()=>{
  const {CommonBlock}=await import('../src/compat/memory.ts');
  const {MemoryCommandInput}=await import('../src/compat/input-memory.ts');
  const {inputRuntime}=await import('../src/compat/input-runtime.ts');
  const {inputRuntimeLayout}=await import('../src/generated/input-runtime-layout.ts');
  const {setInput,ichrBuffered}=await import('../src/compat/ichr.ts');
  const {TerminalOutput}=await import('../src/compat/output.ts');
  const {news}=await import('../src/game/text-files.ts');
  const {packAscii}=await import('../src/compat/word36.ts');
  const f=fixture();f.memory.map(0o140n,Array<bigint>(128).fill(0n));f.memory.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));
  const input=new MemoryCommandInput(new CommonBlock(f.memory,'lowseg'),packAscii),runtime=inputRuntime(input);
  // Explicit fixture descriptor addresses, monitor offsets, byte reader and
  // FILOP buffer population; production monitor behavior is still required.
  const r=Object.assign(f.r,{t3:0n,c:0n});const bytes=[72n,105n,13n,10n];
  f.memory.map(45000n,[0n,0n,0n]);f.memory.map(43000n,[200n,0n,0n,0n,0n,46000n,0n,0n]);
  f.descriptor[0]=789n;f.descriptor[5]=45000n;runtime.block.write('ibflb',43000n);
  f.io.filop=function*(){f.events.push('filop');f.memory.write(45002n,4n);return true;};
  const out=new TerminalOutput();
  done(news({who:0,ccflg:0n,jbren:0n,players:[]},input,out,{
    *open(name){assert.equal(name,'nwsfil');return yield*openFile(f.block,f.state,r,f.io);},
    *close(){yield*closeFile(f.block,f.state,r,f.closeIo);},
    seti(){setInput(runtime.block,r,{bufferCountOffset:2n,bufferPointerOffset:1n,inInstructionLeftHalf:5n});},
    *ichr(){return yield*ichrBuffered(runtime.block,r,{
      indirect:a=>f.memory.read(a),ildb(a){const n=Number(f.memory.read(a));f.memory.write(a,BigInt(n+1));return bytes[n];},
      *executeInput(){return true;},
    });},warn(){assert.fail();},ttyon(){assert.fail();},*gtkn(){assert.fail();},
  }));
  assert.equal(out.drain(),'Hi\r\n');assert.equal(runtime.block.read('ic'),200n);assert.equal(runtime.block.read('ibflb'),43000n);
  assert.equal(r.x1,41000n);assert.equal(f.memory.read(45001n),4n);assert.equal(f.memory.read(45002n),-1n);
  assert.deepEqual(f.events,['filop','skip','close']);
});
