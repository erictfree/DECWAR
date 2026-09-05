import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { inputRuntime } from '../src/compat/input-runtime.ts';
import { FileBlock } from '../src/compat/files.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { fileDescriptors } from '../src/generated/file-descriptors.ts';
import { installFileDescriptors,descriptorAddresses } from '../src/compat/file-descriptors.ts';
import { initializeGripeBuffer,rawGripeCharacter } from '../src/compat/ogch.ts';
import type { GripeOutputServices } from '../src/compat/ogch.ts';
import { setOutput } from '../src/compat/ochr.ts';
import { halfWords,leftHalf,rightHalf,signed36,packAscii,packSixbit,MIN_INTEGER,MAX_INTEGER,divide36 } from '../src/compat/word36.ts';
import { octalStackOutput } from '../src/compat/gripe-diagnostic.ts';
import { writeGripeFile } from '../src/compat/gripe-file.ts';
import type { GripeFileServices } from '../src/compat/gripe-file.ts';
import { openFile,closeFile } from '../src/compat/files.ts';
import { messageText } from '../src/game/message-queue.ts';
import { rawGripe,eraseTextShip,restoreTextShip } from '../src/compat/gripe.ts';
import type { GripeServices,GripeSymbols } from '../src/compat/gripe.ts';
import { inli } from '../src/compat/inli.ts';
import { outputString,outputPointer,outputCrLf,outputSpace } from '../src/compat/text-output.ts';
import { outputNumber } from '../src/compat/field-output.ts';
import type { NumberServices } from '../src/compat/field-output.ts';
import { outputTenthsArgument } from '../src/compat/numeric-wrappers.ts';
import { outputCondition } from '../src/compat/table-output.ts';
import { outputStatusHeader } from '../src/compat/status-output.ts';
import { statusOutputFixture } from './fixtures/status-output.ts';
import { machineRegisters } from '../src/compat/registers.ts';
import { dataStack } from '../src/compat/data-stack.ts';
import type { TextOutputServices } from '../src/compat/text-output.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const m=new AddressSpace();m.map(0n,Array<bigint>(16).fill(0n));m.map(0o140n,Array<bigint>(128).fill(0n));m.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));
  m.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));m.map(40000n,Array<bigint>(250).fill(-1n));
  m.map(58000n,Array<bigint>(128).fill(0n));
  const input=new MemoryCommandInput(new CommonBlock(m,'lowseg'),packAscii),{block,state}=inputRuntime(input),file=new FileBlock(m);
  const s={bufferAddressOffset:0n,bufferPointerOffset:1n,bufferCountOffset:2n,point7LeftHalf:0o440700n}; // Explicit monitor/CPU fixture.
  const r=Object.assign(machineRegisters(m),{t1:9n,t2:8n,t3:7n,c:65n,x1:0n}),job={jbff:40000n,jbrel:40249n},events:string[]=[];
  const stackInitial=signed36(halfWords(-0o50n,57999n));r.s=stackInitial;
  const stack=dataStack<string>(r,state,stackInitial,{
    *pushS(word){r.s=signed36(halfWords(leftHalf(r.s)+1n,rightHalf(r.s)+1n));m.write(rightHalf(r.s),word);},
    *popS(){const word=m.read(rightHalf(r.s));r.s=signed36(halfWords(leftHalf(r.s)-1n,rightHalf(r.s)-1n));return word;},
    *outstrUnderflow(){assert.fail('Unexpected data-stack underflow');},*haltUnderflow(){assert.fail('Unexpected underflow transfer');},
  }); // Explicit PUSH/POP CPU fixture; RESTOR checks and shared S are real.
  initializeGripeBuffer(file,job,r,s);block.write('obfctr',file.address('dbuf',2));block.write('obfptr',file.address('dbuf',1));
  const io:GripeOutputServices<string>={
    indirect(address){return rightHalf(m.read(address));},
    idpb(c,address){events.push('idpb');let word=m.read(address),pos=Number((word>>30n)&63n),target=rightHalf(word);const size=Number((word>>24n)&63n);assert.equal(size,7);
      if(pos<size){pos=36;target=rightHalf(target+1n);}pos-=size;
      word=signed36((word&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|target);m.write(address,word);
      const mask=127n<<BigInt(pos);m.write(target,(m.read(target)&~mask)|((c&127n)<<BigInt(pos)));},
    *core(){events.push(`core:${r.t3}`);yield 'core';return true;},
    *blt(end){events.push(`blt:${end}`);let from=leftHalf(r.t1),to=rightHalf(r.t1);while(to<=end)m.write(to++,m.read(from++));r.t1=signed36(halfWords(from,to));},
    *outputTTY(){events.push('flush');yield 'flush';},*outstr(text){events.push(text);},
  };
  return {m,input,block,state,file,s,r,job,events,io,stack,stackInitial,run:()=>rawGripeCharacter(block,file,job,state,r,s,{...io,...stack})};
}
test('GRIPE initialization stores full JBFF before replacing only pointer left half and clearing count',()=>{
  const f=fixture();f.job.jbff=halfWords(3n,40000n);f.state.hcpos=17n;initializeGripeBuffer(f.file,f.job,f.r,f.s);
  assert.equal(f.file.read('dbuf',0),f.job.jbff);assert.equal(f.file.read('dbuf',1),signed36(halfWords(0o440700n,40000n)));assert.equal(f.file.read('dbuf',2),0n);
  assert.equal(f.m.read(40000n),-1n);assert.equal(f.state.hcpos,17n);assert.equal(f.r.t1,f.file.read('dbuf',1));
});
test('OGCH grows by twenty words, preserves pointer word data and deposits through OCHR.X accounting',()=>{
  const f=fixture();f.m.write(40021n,123n);done(f.run());
  assert.equal(f.job.jbff,40020n);assert.equal(f.file.read('dbuf',2),99n);assert.equal(f.file.read('dbuf',0),40000n);
  assert.equal(f.m.read(40000n),signed36((-1n&~(127n<<29n))|(65n<<29n)));assert.equal(f.m.read(40020n),0n);assert.equal(f.m.read(40021n),123n);
  assert.equal(f.state.hcpos,1n);assert.equal(f.r.t1,100n);assert.deepEqual(f.events,['blt:40020','idpb']);
});
test('OGCH positive count bypasses allocation and has no HUNGUP guard',()=>{
  const f=fixture();f.file.write('dbuf',1n,2);f.state.hungup=-1n;done(f.run());assert.deepEqual(f.events,['idpb']);
  assert.equal(f.file.read('dbuf',2),0n);assert.equal(f.state.hcpos,1n);assert.equal(f.job.jbff,40000n);
});
test('OGCH SOSL count underflow wraps as a signed word and can take the deposit branch',()=>{
  const f=fixture();f.file.write('dbuf',MIN_INTEGER,2);done(f.run());assert.equal(f.file.read('dbuf',2),MAX_INTEGER);assert.deepEqual(f.events,['idpb']);
});
test('OGCH CORE suspension occurs after decrement and before JBFF or clearing writes',()=>{
  const f=fixture();f.job.jbrel=40000n;const g=f.run();assert.equal(g.next().value,'core');
  assert.equal(f.file.read('dbuf',2),-1n);assert.equal(f.job.jbff,40000n);assert.equal(f.m.read(40001n),-1n);assert.equal(f.r.t3,40020n);
  done(g);assert.equal(f.job.jbff,40020n);assert.equal(f.state.hcpos,1n);
});
test('failed CORE warns then returns without depositing, resetting count or accounting',()=>{
  const f=fixture();f.job.jbrel=40000n;f.io.core=function*(){return false;};const g=f.run();assert.equal(g.next().value,'flush');
  assert.equal(f.file.read('dbuf',2),-1n);done(g);assert.deepEqual(f.events,['flush',"%Can't get more core\r\n"]);
  assert.equal(f.job.jbff,40000n);assert.equal(f.m.read(40001n),-1n);assert.equal(f.state.hcpos,0n);
});
test('hangup during failed-growth warning suppresses its later direct text only',()=>{
  const f=fixture();f.job.jbrel=40000n;f.io.core=function*(){return false;};const g=f.run();g.next();f.state.hungup=-1n;done(g);
  assert.deepEqual(f.events,['flush']);assert.equal(f.state.hcpos,0n);
});
test('OGCH uses live T1/T2 after CORE rather than a cached growth range',()=>{
  const f=fixture();f.job.jbrel=40000n;const g=f.run();g.next();f.r.t1=40010n;f.r.t2=40030n;done(g);
  assert.equal(f.job.jbff,40030n);assert.equal(f.m.read(40001n),-1n);assert.equal(f.m.read(40011n),0n);assert.equal(f.m.read(40030n),0n);
});
test('growth resets DBUF count but retries through a possibly changed indirect output count',()=>{
  const f=fixture();f.m.write(40200n,1n);const blt=f.io.blt;f.io.blt=function*(end){yield*blt(end);f.block.write('obfctr',40200n);};
  done(f.run());assert.equal(f.file.read('dbuf',2),100n);assert.equal(f.m.read(40200n),0n);assert.equal(f.state.hcpos,1n);
});
test('OGCH computes growth endpoint as an eighteen-bit address before comparison',()=>{
  const f=fixture();f.file.write('dbuf',halfWords(0o440700n,0o777770n),1);f.job.jbrel=20n;
  const read=f.m.write.bind(f.m);f.m.write=(address,word)=>{if(rightHalf(address)===0o777771n)throw new Error('Expected first clear');read(address,word);};
  assert.throws(()=>done(f.run()),/Expected first clear/);assert.equal(f.r.t2,12n);assert.equal(f.job.jbff,12n);assert.deepEqual(f.events,[]);
});
test('next growth uses the last occupied byte-pointer word and count transitions at one hundred characters',()=>{
  const f=fixture();for(let i=0;i<100;i++)done(f.run());assert.equal(f.file.read('dbuf',2),0n);assert.equal(rightHalf(f.file.read('dbuf',1)),40019n);
  done(f.run());assert.equal(f.job.jbff,40039n);assert.equal(f.file.read('dbuf',2),99n);assert.equal(rightHalf(f.file.read('dbuf',1)),40020n);
  assert.deepEqual(f.events.filter(e=>e.startsWith('blt:')),['blt:40020','blt:40039']);
});
const symbols=(f:ReturnType<typeof fixture>):Record<string,bigint>=>({'ochr.b':100n,'ichr.t':101n,'iich.':102n,'ichr.b':103n,'ogch.':104n,
  tobuf:35000n,tobcb:35100n,dibuf:f.file.address('dibuf',0),dbuf:f.file.address('dbuf',0),stabuf:f.file.address('stabuf',0),
  '.fowrt':1n,'.fored':2n,'.ioasc':3n,'uu.phs':4n,'io.lem':8n,'.fosau':5n,'.iodmp':6n});
test('GRPFIL and all four statistics descriptors retain source channels, protection bytes, PPN and names',()=>{
  const f=fixture();f.m.map(BigInt(fileDescriptors.address),Array<bigint>(fileDescriptors.words.length).fill(0n));const sy=symbols(f);
  installFileDescriptors(f.m,n=>sy[n]);const a=descriptorAddresses();
  assert.equal(f.m.read(a.grpfil),halfWords(104n,0n));assert.equal(f.m.read(a.grpfil+2n),halfWords(3n,5n));assert.equal(f.m.read(a.grpfil+5n),halfWords(f.file.address('dbuf',0),0n));
  for(const name of ['grpfil','stared','staupd','stfred','stfupd'] as const){assert.equal(f.m.read(a[name]+10n),halfWords(1n,0o27n));assert.equal(f.m.read(a[name]+9n),name==='stared'||name==='stfred'?0n:0o10n<<27n);}
  for(const name of ['stared','staupd','stfred','stfupd'] as const){
    assert.equal(f.m.read(a[name]+2n),halfWords(6n,name.endsWith('red')?2n:1n));
    assert.equal(f.m.read(a[name]+5n),halfWords(f.file.address('stabuf',0),0n));assert.equal(f.m.read(a[name]+7n),signed36(packSixbit(name.startsWith('stf')?'DECWAF':'DECWAR')));
  }
});
test('missing newly required descriptor symbols still fail before any installation writes',()=>{
  const f=fixture();const words=Array<bigint>(fileDescriptors.words.length).fill(77n);f.m.map(BigInt(fileDescriptors.address),words);const sy=symbols(f);
  assert.throws(()=>installFileDescriptors(f.m,n=>n==='ogch.'?undefined as unknown as bigint:sy[n]),/ogch/);assert.ok(words.every(w=>w===77n));
});
test('extracted GRPFIL SETO selects live DBUF; OCT.O composes through yielding OGCH and OCHR.X',()=>{
  const f=fixture();f.m.map(BigInt(fileDescriptors.address),Array<bigint>(fileDescriptors.words.length).fill(0n));const sy=symbols(f);
  installFileDescriptors(f.m,n=>sy[n]);f.r.x1=halfWords(descriptorAddresses().grpfil,descriptorAddresses().grpfil);
  setOutput(f.block,f.r,{bufferCountOffset:2n,bufferPointerOffset:1n,outputInstructionLeftHalf:5n});assert.equal(f.block.read('oc'),104n);
  assert.equal(f.block.read('obfctr'),f.file.address('dbuf',2));assert.equal(f.block.read('obfptr'),f.file.address('dbuf',1));
  // Shared machine-register view and explicit argument-stack fixture; the output path is real.
  const stack:bigint[]=[];f.m.write(5n,0o765432n);f.m.write(6n,6n);f.job.jbrel=40000n;
  const g=octalStackOutput(f.m,{*pushData(word){stack.push(word);},*popData(){return stack.pop()!;},*ochr(){yield*f.run();}});
  assert.equal(g.next().value,'core');assert.equal(stack.length,6);done(g);
  assert.equal(f.m.read(40000n)>>1n&((1n<<35n)-1n),packAscii('76543')>>1n);
  assert.equal((f.m.read(40001n)>>29n)&127n,50n);assert.equal(f.file.read('dbuf',2),94n);assert.equal(f.state.hcpos,6n);assert.deepEqual(stack,[]);
});

for(const wrapper of [false,true])test(`${wrapper?'OFLT/ONUM':'ONUM'} padding and digit stack survive OGCH CORE suspension and shared cursor accounting`,()=>{
  const f=fixture(),r=Object.assign(f.r,{x1:-123n,x2:6n,x3:10n,x4:77n}),stack:bigint[]=[];
  // Explicit CPU/stack fixture; SPACE, OGCH and OCHR.X execute their source paths.
  const io:NumberServices<string>={*pushData(word){stack.push(word);},*popData(){assert.ok(stack.length);return stack.pop()!;},
    *movm(destination,value){assert.notEqual(value,MIN_INTEGER);r[destination]=value<0n?-value:value;},
    *aobjn(){r.x4=signed36(halfWords(leftHalf(r.x4)+1n,rightHalf(r.x4)+1n));return r.x4<0n;},
    *idivi(divisor){const d=divide36(r.t1,divisor);r.t1=d.quotient;r.t2=d.remainder;},
    *space(){yield*outputSpace(r,io);},*ochr(){yield*f.run();},
  };
  f.m.map(45000n,[-1234n,6n]);
  const wrappers={...io,argument:(index:0|1)=>f.m.read(45000n+BigInt(index)),
    *idiviX1(divisor:bigint){const d=divide36(r.x1,divisor);r.x1=d.quotient;r.x2=d.remainder;},
    *callNumber(target:bigint){assert.equal(target,1001n);yield*outputNumber(r,'onum',io);}};
  f.job.jbrel=40000n;const g=wrapper?outputTenthsArgument(r,{oflg:0n},'oflt',{onum:1001n,osn1:1002n,osn2:1003n,osn3:1004n},wrappers):outputNumber(r,'onum',io);
  assert.equal(g.next().value,'core');
  assert.deepEqual(stack,wrapper?[-123n,6n,10n,77n,-123n,4n,-1n,3n,2n,1n]:[-123n,77n,-1n,3n,2n,1n]);assert.equal(r.x1,45n);assert.equal(f.state.hcpos,0n);
  done(g);assert.equal(messageText([f.m.read(40000n),f.m.read(40001n)]),wrapper?'  -123.4':'  -123');
  assert.equal(r.x1,-123n);assert.equal(r.x4,77n);assert.equal(r.x2,6n);assert.equal(f.state.hcpos,wrapper?8n:6n);assert.deepEqual(stack,[]);
});

test('OCOND/OSTR preserves deferred condition reads across live OGCH growth',()=>{
  const f=fixture(),r=Object.assign(f.r,{p1:0n});f.m.map(45000n,Array<bigint>(50).fill(0n));
  // Explicit relocated data and POINT 7 fixture; LOWSEG, OSTR and output buffer are real views.
  const s={docked:45000n,dockedLong:45010n,dockedShort:45012n,lngcnd:45020n,shtcnd:45023n};
  f.m.write(s.docked,-1n);f.m.write(45001n,1n);f.m.write(45010n,packAscii('Docke'));f.m.write(45011n,packAscii('d+'));f.m.write(45012n,packAscii('D+'));
  f.m.write(s.lngcnd,45030n);f.m.write(45030n,packAscii('Green'));f.m.write(s.lngcnd+2n,45032n);f.m.write(45032n,packAscii('Red'));
  f.m.write(s.shtcnd+2n,45034n);f.m.write(45034n,packAscii('R'));
  f.input.low.write('who',1n);f.input.low.write('oflg',0n);
  const state={get who(){return f.input.low.read('who');},get oflg(){return f.input.low.read('oflg');}};
  const textIO:TextOutputServices<string>={*ildb(){let pos=Number((r.p1>>30n)&63n),address=rightHalf(r.p1);assert.equal((r.p1>>24n)&63n,7n);
    if(pos<7){pos=36;address=rightHalf(address+1n);}pos-=7;r.p1=signed36((r.p1&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|address);
    return(f.m.read(address)>>BigInt(pos))&127n;},*ochr(){yield*f.run();}};
  const reads:number[]=[],io={argument(index:0|1){reads.push(index);return f.m.read(45001n);},
    *ostr(){yield*outputString(r,0o440700n,textIO);},*space(){yield*outputSpace(r,textIO);}};
  f.job.jbrel=40000n;const g=outputCondition(f.m,r,state,s,io);assert.equal(g.next().value,'core');assert.deepEqual(reads,[]);
  f.input.low.write('oflg',-1n);f.m.write(45001n,3n);done(g);
  assert.equal(messageText([f.m.read(40000n),f.m.read(40001n)]),'Docked+R');assert.equal(f.state.hcpos,8n);assert.deepEqual(reads,[0]);
});

for(const [driver,realHeader] of [[false,false],[true,false],[true,true]])test(`${driver?'raw GRIPE/INLI':'live OGCH buffer'}${realHeader?'/OSTS/STAT.Y':''} composes with GRPFIL OPEN, old-file prepend, CLOSE and TTY SETO`,()=>{
  const f=fixture();f.m.map(BigInt(fileDescriptors.address),Array<bigint>(fileDescriptors.words.length).fill(0n));const sy=symbols(f);
  installFileDescriptors(f.m,n=>sy[n]);const a=descriptorAddresses(),r=Object.assign(f.r,{x2:0n,x3:0n,x4:0n,t4:0n,p1:0n,f:0n,arg:0n});
  f.m.map(35000n,[packAscii('-----'),packAscii('-----'),0n]);
  const outputMachine={bufferCountOffset:2n,bufferPointerOffset:1n,outputInstructionLeftHalf:5n};
  r.x1=driver?halfWords(a.ttyfil,a.ttyfil):halfWords(a.grpfil,a.grpfil);setOutput(f.block,r,outputMachine);
  function* text(value:string):Generator<string,void,void>{for(const c of value){r.c=BigInt(c.charCodeAt(0));yield*f.run();}}
  const textIO:TextOutputServices<string>={*ildb(){let pointer=r.p1,pos=Number((pointer>>30n)&63n),address=rightHalf(pointer);const size=Number((pointer>>24n)&63n);
    assert.ok(size===7||size===36);if(pos<size){address=rightHalf(address+1n);pos=36;}pos-=size;
    r.p1=signed36((pointer&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|address);
    return signed36((f.m.read(address)>>BigInt(pos))&((1n<<BigInt(size))-1n));},*ochr(){yield*f.run();}};
  if(!driver)done(text('NEW\r\n'));const old=[packAscii('OLD\r\n'),packAscii('MORE')];let disk:bigint[]=[];const calls:string[]=[];
  const fileJob={get jbff(){return f.job.jbff;},set jbff(v){f.job.jbff=v;},get jbrel(){return f.job.jbrel;},set jbrel(v){f.job.jbrel=v;},get hungup(){return f.state.hungup;}};
  const monitor={*core(n:bigint){calls.push(`core:${n}`);return true;},*outputTTY(){assert.fail('Unexpected warning');},*outstr(){assert.fail('Unexpected warning');}};
  const io:GripeFileServices<string>={
    *ostr(){if(driver&&r.p1===34000n){assert.equal(f.block.read('oc'),100n);return;}assert.equal(r.p1,35000n);yield*outputString(r,0o440700n,textIO);},*ocrl(){yield*outputCrLf(f.state,r,textIO);},
    *open(){return yield*openFile(f.file,fileJob,r,{...monitor,lookupOffset:5n,
      blt(last){let from=leftHalf(r.t1),to=rightHalf(r.t1);while(to<=last)f.m.write(to++,f.m.read(from++));r.t1=signed36(halfWords(from,to));},
      *getppn(){assert.fail('SYSPPN is explicit');},*filop(){calls.push('filop');assert.equal(f.file.read('le.nam'),signed36(packSixbit('DECWAR')));
        assert.equal(f.file.read('le.ppn'),halfWords(1n,0o27n));f.file.write('leblk',signed36(halfWords(-2n,0n)),3);yield 'filop';return true;},successReturn(){}});},
    *hibernate(){assert.fail();},*halt(){assert.fail();},*core(){assert.fail('Buffer plus old file fits allocated memory');},
    *input(address){calls.push('input');const word=f.m.read(address);assert.equal(leftHalf(word),rightHalf(-2n));assert.equal(f.m.read(address+1n),0n);
      yield 'input';const start=rightHalf(word)+1n;old.forEach((w,i)=>f.m.write(start+BigInt(i),w));return false;},
    *useto(n){assert.equal(n,1n);calls.push('useto');},
    *output(address){calls.push('output');const word=f.m.read(address),start=rightHalf(word)+1n,count=-BigInt.asIntN(18,leftHalf(word));
      disk=Array.from({length:Number(count)},(_,i)=>f.m.read(start+BigInt(i)));f.state.ccflg=-1n;yield 'output';return false;},
    *close(){yield*closeFile(f.file,fileJob,r,{...monitor,closeInstructionLeftHalf:5n,*executeClose(){calls.push('close');assert.equal((r.t1>>23n)&15n,3n);yield 'close';}});},
    *seto(){calls.push('seto');setOutput(f.block,r,outputMachine);},*pshp(){calls.push('pshp');assert.equal(f.state.ccflg,-1n);},
    outputTTY:monitor.outputTTY,outstr:monitor.outstr,
  };
  const fs={grpfil:a.grpfil,ttyfil:a.ttyfil,separator:35000n,linbuf:f.input.lineAddress,bufferAddressOffset:0n,bufferPointerOffset:1n,fileBusyCode:23n};
  const state=Object.assign(f.state,{who:0n,addrck:0n});
  for(const key of ['who','addrck'] as const)Object.defineProperty(state,key,{get:()=>f.input.low.read(key),set:(v:bigint)=>f.input.low.write(key,v)});
  const gs:GripeSymbols={...fs,...f.s,shpcon:0n,alive:0n,active:0n,prompt:34000n,onlyTwo:34001n,tooMany:34002n,
    statisticsArgument:34003n,linePointer:halfWords(0o444400n,f.input.lineAddress)};
  const chars=[78n,69n,87n,26n];
  const gi:GripeServices<string>={...io,*afterAlertCheck(){assert.fail('Pre-game skips literal');},
    *eshp(){yield*eraseTextShip(f.file,state,r,gs,function*(){assert.fail();});},
    *pshp(){yield*io.pshp();yield*restoreTextShip(f.file,state,r,gs,function*(){assert.fail();});},
    *osts(){yield*text('HEADER\r\n');},*diagnostic(){assert.fail();},*shosta(){assert.fail();},
    *inli(){yield*inli(f.input,state,r,{*ichr(){yield 'key';assert.ok(chars.length);return chars.shift()!;},flush(){},
      *ochr(c){r.c=c;yield*f.run();},outstr(){assert.fail();},outchr(){assert.fail();},aobjp(){assert.fail();}});},
    *ostrx(){assert.equal(r.p1,signed36(gs.linePointer));yield*outputPointer(r,textIO);},
  };
  let header='HEADER\r\n';let headerStack:bigint[]=[];
  if(realHeader){
    const h=statusOutputFixture({memory:f.m,registers:r,character:()=>f.run(),hcpos:()=>state.hcpos,blank:()=>state.blank,who:()=>state.who});
    Object.assign(h.io,f.stack); // Header, numeric/SIXBIT fields and OCHR.X share actual S storage.
    // Use actual FileBlock TMP while CPU, monitor date/time and identity data remain explicit fixtures.
    h.hs.tmp=f.file.address('tmp',0);h.hs.tmpPointer=halfWords(0o440700n,h.hs.tmp);headerStack=h.stack;
    gi.osts=function*(){yield*outputStatusHeader(r,h.state,h.hs,h.io);};
    header='[V2.1  05-SEP-78 12:34  Pre-game   ERIC  TEST   1200       1,27    TTY12    7    17 B R]\r\n';
    f.job.jbrel=40000n;const core=f.io.core;f.io.core=function*(){const result=yield*core();f.job.jbrel=40249n;return result;};
  }
  f.state.ccflg=driver?0n:-1n;
  const g=driver?rawGripe(f.file,state,f.job,r,gs,gi):writeGripeFile(f.file,state,f.job,r,fs,io);
  if(realHeader){assert.equal(g.next().value,'core');assert.equal(rightHalf(r.s),rightHalf(f.stackInitial)+4n);}
  if(driver)for(let i=0;i<4;i++)assert.equal(g.next().value,'key');
  assert.equal(g.next().value,'filop');assert.equal(f.block.read('oc'),104n);
  assert.equal(g.next().value,'input');assert.equal(g.next().value,'output');assert.equal(g.next().value,'close');
  assert.equal(f.file.read('fl.ff'),40000n);assert.equal(f.state.ccflg,-1n);done(g);
  // Ctrl-Z carries CF.FF: INLI emits CR into the selected gripe sink but
  // increments BLANK without LF before OSTR.X copies the line.
  assert.equal(messageText(disk.slice(0,-2)),(driver?header+'\r':'')+'NEW\r\n----------\r\n');assert.deepEqual(disk.slice(-2),old.map(signed36));assert.deepEqual(headerStack,[]);assert.equal(r.s,f.stackInitial);
  assert.equal(f.job.jbff,40000n);assert.equal(f.file.read('fl.ff'),0n);assert.equal(f.block.read('oc'),100n);assert.equal(f.state.ccflg,0n);
  assert.deepEqual(calls,[...(driver?['seto']:[]),'filop','input','useto','output','close','seto','pshp']);
});
