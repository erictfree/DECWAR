import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { inputRuntime } from '../src/compat/input-runtime.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { FileBlock } from '../src/compat/files.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { resetRuntime,reloadRuntime } from '../src/compat/reset.ts';
import type { ResetServices } from '../src/compat/reset.ts';
import { discardSetup } from '../src/compat/killow.ts';
import { halfWords,leftHalf,rightHalf,signed36,packAscii,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const memory=new AddressSpace();memory.map(0o140n,Array<bigint>(128).fill(77n));memory.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(77n));
  memory.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(77n));memory.map(20000n,[1n,2n,3n,4n]);
  const input=new MemoryCommandInput(new CommonBlock(memory,'lowseg'),packAscii),file=new FileBlock(memory),{block,state}=inputRuntime(input);
  const job={jbff:50000n,jbint:77n,jbapr:signed36(halfWords(0o654321n,77n)),jbver:halfWords(123n,456n)};
  const symbols={setup:20003n,z:30000n,programName:20000n,programPpn:20001n,programDevice:20002n,
    pushdownInitial:signed36(halfWords(-10n,21000n)),dataStackInitial:signed36(halfWords(-20n,22000n)),aprtrp:23000n,ttyfil:24000n,banner:25000n};
  const r={sgnam:11n,sgppn:12n,sgdev:13n,t0:14n,t1:15n,x1:16n,x2:17n,p1:18n,p:19n,s:20n,ac16:21n};
  const events:(string|bigint)[]=[];
  const io:ResetServices<string>={
    *reset(){events.push('reset');yield 'reset';},*start(){events.push('start');},
    *popReturn(){},
    pushReturn(){events.push('push');assert.equal(r.ac16,22n);assert.equal(r.p,symbols.pushdownInitial);assert.equal(r.s,symbols.dataStackInitial);},
    *gettab(){assert.equal(r.t0,signed36(halfWords(-1n,0o30n)));events.push('gettab');r.t0=33n;return true;},
    *setuwp(){events.push('setuwp');assert.equal(r.t1,0n);return true;},*halt(reason){events.push(reason);yield 'halt';},
    *aprenb(){events.push('aprenb');yield 'aprenb';},*open(){events.push('open');yield 'open';return true;},
    *seto(){events.push('seto');},*seti(){events.push('seti');},*ostr(){events.push('ostr');},*odec(){events.push('odec');},*crlf(){events.push('crlf');},*outputTTY(){events.push('output');},
  };
  return {memory,input,file,block,state,job,symbols,r,events,io};
}
test('RESET monitor operation precedes saving program-register words',()=>{
  const f=fixture(),g=resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io);
  assert.equal(g.next().value,'reset');assert.equal(f.memory.read(20000n),1n);f.r.sgnam=99n;
  assert.equal(g.next().value,'aprenb');assert.deepEqual([0n,1n,2n].map(n=>f.memory.read(20000n+n)),[99n,12n,13n]);done(g);
});
test('low JBFF transfers to START without reading unloaded SETUP or initializing stacks',()=>{
  const f=fixture();f.job.jbff=1n;f.symbols.setup=26000n;
  done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));assert.deepEqual(f.events,['reset','start']);assert.equal(f.r.p,19n);assert.equal(f.state.hungup,77n);
});
test('zero SETUP transfers to START even when JBFF is sufficient',()=>{
  const f=fixture();f.memory.write(20003n,0n);done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));assert.deepEqual(f.events,['reset','start']);
});
test('JBFF equal to Z with nonzero SETUP enters initialization',()=>{
  const f=fixture();f.job.jbff=f.symbols.z;done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));assert.ok(f.events.includes('push'));assert.ok(!f.events.includes('start'));
});
test('RESET initializes stacks/width and preserves unrelated memory before enabling interrupts',()=>{
  const f=fixture(),g=resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io);g.next();assert.equal(g.next().value,'aprenb');
  assert.equal(f.input.low.read('terwid'),80n);assert.equal(f.r.t1,73728n);assert.equal(f.state.ccflg,0n);assert.equal(f.state.ccflgDot,0n);
  assert.equal(f.file.read('trpadr'),0n);assert.equal(f.file.read('intflg'),-1n);assert.equal(f.state.inwait,0n);assert.equal(f.state.hungup,0n);assert.equal(f.input.low.read('addrck'),0n);
  assert.equal(f.job.jbint,f.file.address('intblk',0));assert.equal(f.file.read('intblk',2),0n);assert.equal(f.file.read('intblk',0),77n);assert.equal(f.file.read('intblk',3),77n);
  assert.equal(leftHalf(f.job.jbapr),0o654321n);assert.equal(rightHalf(f.job.jbapr),23000n);
  assert.equal(f.input.pointer,77n);assert.equal(f.state.echflg,77n);assert.equal(f.input.block.read('chrcnt'),77n);done(g);
});
test('AC16 increments as a 36-bit word before the required PUSH operation',()=>{
  const f=fixture();f.r.ac16=MAX_INTEGER;f.io.pushReturn=()=>assert.equal(f.r.ac16,MIN_INTEGER);done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));
});
test('GETTAB failure zeroes T0 while success preserves its result',()=>{
  const f=fixture();f.io.gettab=function*(){f.r.t0=99n;return false;};done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));assert.equal(f.r.t0,0n);
});
test('SETUWP failure suspends at HALT before flags change, then follows explicit continuation',()=>{
  const f=fixture();f.io.setuwp=function*(){return false;};const g=resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io);
  g.next();assert.equal(g.next().value,'halt');assert.equal(f.state.ccflg,77n);assert.equal(f.input.pointer,77n);done(g);assert.equal(f.state.ccflg,0n);
});
test('TTY OPEN observes discarded buffer and echo-on flag but old INIFLG',()=>{
  const f=fixture();f.io.open=function*(){assert.equal(f.input.pointer,-1n);assert.equal(f.state.echflg,0n);assert.equal(f.state.iniflg,77n);assert.equal(f.r.x1,halfWords(24000n,24000n));return true;};
  done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));assert.equal(f.state.iniflg,0n);
});
test('TTY OPEN failure halts before SETO, with continuation controlled by the monitor service',()=>{
  const f=fixture();f.io.open=function*(){return false;};const g=resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io);
  g.next();g.next();assert.equal(g.next().value,'halt');assert.ok(!f.events.includes('seto'));assert.equal(f.state.iniflg,77n);done(g);assert.ok(f.events.includes('seto'));
});
test('SETO and SETI operate on the same changing X1 before banner output',()=>{
  const f=fixture();f.io.seto=function*(){f.r.x1=123n;yield 'seto';};f.io.seti=function*(){assert.equal(f.r.x1,123n);yield 'seti';};
  const g=resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io);while(g.next().value!=='seti'){}
  assert.equal(f.state.iniflg,77n);done(g);assert.equal(f.state.iniflg,0n);assert.equal(f.r.p1,25000n);
});
test('banner reads current JBVER after OSTR and prints its right half at width five',()=>{
  const f=fixture();f.io.ostr=function*(){assert.equal(f.r.p1,25000n);f.job.jbver=halfWords(999n,654n);};
  f.io.odec=function*(){assert.equal(f.r.x1,654n);assert.equal(f.r.x2,5n);};done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));
  assert.deepEqual(f.events.slice(-2),['crlf','output']);
});
test('hangup during CRLF suppresses the final OUTPUT',()=>{
  const f=fixture();f.io.crlf=function*(){f.state.hungup=-1n;};done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));assert.ok(!f.events.includes('output'));
});
test('START builds six RUN words from saved program state and routes returning RUN to MONIT',()=>{
  const f=fixture();done(reloadRuntime(f.input,f.file,f.r,f.symbols,{*run(){
    assert.equal(f.r.t1,f.file.address('tmp',0));assert.deepEqual([0,1,2,3,4,5].map(n=>f.file.read('tmp',n)),[3n,1n,0n,0n,2n,0n]);f.events.push('run');yield 'run';
  },*monit(){f.events.push('monit');}}));assert.deepEqual(f.events,['run','monit']);
});
test('RESET missing setup composes START using the freshly saved program registers',()=>{
  const f=fixture();f.job.jbff=0n;f.io.start=function*(){yield*reloadRuntime(f.input,f.file,f.r,f.symbols,{*run(){assert.equal(f.file.read('tmp',0),13n);assert.equal(f.file.read('tmp',1),11n);assert.equal(f.file.read('tmp',4),12n);yield 'run';},*monit(){f.events.push('monit');}});};
  done(resetRuntime(f.input,f.file,f.job,f.r,f.symbols,f.io));assert.deepEqual(f.events,['reset','monit']);
});
for(const ddt of [-1n,1n])test(`KILLOW DDT=${ddt} preserves all job words and T1`,()=>{
  const state={jbddt:ddt,jbsa:77n,jbff:88n,jbrel:99n,hungup:0n},r={t1:22n};
  done(discardSetup(state,r,{start:100n,a:200n},{*core(){assert.fail();},*outputTTY(){assert.fail();},*outstr(){assert.fail();}}));
  assert.equal(state.jbsa,77n);assert.equal(state.jbff,88n);assert.equal(r.t1,22n);
});
test('KILLOW sets restart address and JBFF before CORE and retains both on failure',()=>{
  const state={jbddt:0n,jbsa:signed36(halfWords(0o654321n,77n)),jbff:88n,jbrel:99n,hungup:0n},r={t1:22n};const text:string[]=[];
  done(discardSetup(state,r,{start:100n,a:200n},{*core(value){assert.equal(value,200n);assert.equal(state.jbff,200n);assert.equal(rightHalf(state.jbsa),100n);return false;},*outputTTY(){text.push('flush');},*outstr(s){text.push(s);}}));
  assert.equal(leftHalf(state.jbsa),0o654321n);assert.equal(state.jbff,200n);assert.deepEqual(text,['flush',"%Can't remove once only code\r\n"]);
});

test('RESET loads TTY through actual OPEN/SETO/SETI, prints its banner, and enters FORTRAN initialization',async()=>{
  const {fileDescriptors}=await import('../src/generated/file-descriptors.ts');const {installFileDescriptors,descriptorAddresses}=await import('../src/compat/file-descriptors.ts');
  const {openFile}=await import('../src/compat/files.ts');const {setInput,ichrTerminal}=await import('../src/compat/ichr.ts');const {setOutput}=await import('../src/compat/ochr.ts');
  const {lowState}=await import('../src/game/common-state.ts');const {initializeDecwar}=await import('../src/game/entry.ts');const {inli}=await import('../src/compat/inli.ts');const {gtkn}=await import('../src/compat/gtkn.ts');
  const {constants:K}=await import('../src/generated/source-data.ts');const {unpackAscii}=await import('../src/compat/word36.ts');
  const f=fixture();f.memory.map(BigInt(fileDescriptors.address),Array<bigint>(fileDescriptors.words.length).fill(0n));
  const symbols:Record<string,bigint>={'ochr.b':100n,'ichr.t':101n,'iich.':102n,'ichr.b':103n,tobuf:30000n,tobcb:30100n,dibuf:f.file.address('dibuf',0),dbuf:f.file.address('dbuf',0),'.fowrt':1n,'.fored':2n,'.ioasc':3n,'uu.phs':4n,'io.lem':8n,'ogch.':104n,stabuf:f.file.address('stabuf',0),'.fosau':5n,'.iodmp':6n};
  installFileDescriptors(f.memory,n=>symbols[n]);f.symbols.ttyfil=descriptorAddresses().ttyfil;
  const banner='DECWAR, Edit ';f.memory.map(25000n,[packAscii(banner.slice(0,5)),packAscii(banner.slice(5,10)),packAscii(banner.slice(10))]);
  const r=Object.assign(f.r,{x3:0n,t2:0n,t3:0n,c:0n,f:0n}),job=Object.assign(f.job,{jbrel:60000n,hungup:0n}),out=lowState(f.input.low).output;
  Object.defineProperty(job,'hungup',{get:()=>f.state.hungup,set:(v:bigint)=>{f.state.hungup=v;}});
  f.io.open=function*(){return yield*openFile(f.file,job,r,{lookupOffset:5n,
    blt(last){let a=leftHalf(r.t1),b=rightHalf(r.t1);while(b<=last)f.memory.write(b++,f.memory.read(a++));r.t1=signed36(halfWords(a,b));},
    *core(){return true;},*getppn(){assert.fail();},*filop(){return true;},successReturn(){},*outputTTY(){},*outstr(){}});};
  f.io.seto=function*(){setOutput(f.block,r,{bufferCountOffset:2n,bufferPointerOffset:1n,outputInstructionLeftHalf:5n});};
  f.io.seti=function*(){setInput(f.block,r,{bufferCountOffset:2n,bufferPointerOffset:1n,inInstructionLeftHalf:6n});};
  f.io.ostr=function*(){let text='';for(let a=r.p1;;a++){const word=unpackAscii(f.memory.read(a));text+=word.split('\0',1)[0];if(word.includes('\0'))break;}out.write(text);};
  f.io.odec=function*(){out.odec(r.x1,Number(r.x2));};f.io.crlf=function*(){out.crlf();};let returned=false;f.io.popReturn=function*(){returned=true;};
  done(resetRuntime(f.input,f.file,job,r,f.symbols,f.io));assert.equal(out.drain(),'DECWAR, Edit   456\r\n');assert.equal(returned,true);
  assert.equal(f.block.read('oc'),100n);assert.equal(f.block.read('ic'),101n);assert.equal(f.input.low.read('terwid'),80n);
  const settings={oflg:0,prtype:0,scnflg:0,icflg:0,ocflg:0,ttytyp:0};
  for(const key of Object.keys(settings))Object.defineProperty(settings,key,{get:()=>Number(f.input.low.read(key)),set:(value:number)=>f.input.low.write(key,BigInt(value))});
  const shared={versio:0n},state=Object.assign(f.state,{locked:0n,svlock:0n}),chars=[51n,10n];let n=0;const entryEvents:string[]=[];
  done(initializeDecwar(settings,shared,f.input,out,{zeroLowSegment(){f.input.low.clear('lfz','llz');},literal:item=>item.text,
    *gtkn(){yield*gtkn(state,f.input,out,{inliOwnsMemory:true,daytime:()=>0n,inputPending:()=>true,unlo(){},*lock(){return true;},*hibernate(){},
      *inli(){return yield*inli(f.input,state,r,{*ichr(){return yield*ichrTerminal(state,r,{*inchwl(){return chars[n++];},clearInput(){}});},flush(){},ochr:c=>out.character(c),outstr(){},outchr(){},aobjp(){assert.fail();}});}});},
    *type(kind){entryEvents.push(`type:${kind}`);},*summar(){entryEvents.push('summar');},
  }));
  assert.equal(shared.versio,24n);assert.equal(settings.oflg,K.SHORT);assert.equal(settings.icflg,K.KREL);assert.equal(settings.prtype,-1);
  assert.equal(f.input.tokens[0].value,3n);assert.deepEqual(entryEvents,['type:1','type:2','summar']);assert.equal(f.block.read('ic'),101n);
});
