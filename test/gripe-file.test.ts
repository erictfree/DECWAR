import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace } from '../src/compat/memory.ts';
import { FileBlock } from '../src/compat/files.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { finishGripeInput,writeGripeFile,cleanupGripe } from '../src/compat/gripe-file.ts';
import type { GripeFileServices } from '../src/compat/gripe-file.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const m=new AddressSpace();m.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));m.map(30000n,[0n]);
  const file=new FileBlock(m),state={hungup:0n,ccflg:0n},job={jbrel:50000n},r={x1:7n,x2:19n,t1:8n,t4:9n,p1:10n};
  const s={grpfil:31000n,ttyfil:32000n,separator:33000n,linbuf:30000n,bufferAddressOffset:0n,bufferPointerOffset:1n,fileBusyCode:23n};
  file.write('dbuf',40000n,0);file.write('dbuf',halfWords(123n,40002n),1);
  const events:string[]=[],input:bigint[]=[],output:bigint[]=[];
  const io:GripeFileServices<string>={
    *ostr(){events.push('separator');},*ocrl(){events.push('ocrl');},*open(){events.push('open');yield 'open';return true;},
    *hibernate(){events.push(`hiber:${r.t1}`);yield 'hiber';return true;},*halt(){events.push('halt');yield 'halt';},*core(){events.push(`core:${r.t1}`);yield 'core';return true;},
    *input(address){assert.equal(address,file.address('tmp',0));assert.equal(file.read('tmp',1),0n);input.push(file.read('tmp',0));events.push('input');yield 'input';return false;},
    *output(address){assert.equal(address,file.address('tmp',0));assert.equal(file.read('tmp',1),0n);output.push(file.read('tmp',0));events.push('output');yield 'output';return false;},
    *useto(n){events.push(`useto:${n}`);},*close(){events.push(`close:${file.read('fl.ff')}`);yield 'close';},
    *seto(){events.push(`seto:${r.x1}`);yield 'seto';},*pshp(){events.push('pshp');yield 'pshp';},
    *outputTTY(){events.push('flush');},*outstr(text){events.push(text);},
  };
  return {m,file,state,job,r,s,events,input,output,io,run:()=>writeGripeFile(file,state,job,r,s,io)};
}
test('GRIP.2 discards only the first empty EOF line and otherwise keeps prior lines',()=>{
  const f=fixture();done(finishGripeInput(f.file,f.state,f.job,f.r,f.s,f.io));assert.ok(!f.events.includes('open'));assert.ok(!f.events.includes('separator'));
  const later=fixture();later.r.x2=18n;done(finishGripeInput(later.file,later.state,later.job,later.r,later.s,later.io));assert.deepEqual(later.events.slice(0,3),['separator','ocrl','open']);
});
test('nonempty final line gets OCRL before separator and current pointer is captured afterward',()=>{
  const f=fixture();f.m.write(f.s.linbuf,65n);f.io.ocrl=function*(){f.events.push('ocrl');f.file.write('dbuf',halfWords(1n,40007n),1);};
  const g=finishGripeInput(f.file,f.state,f.job,f.r,f.s,f.io);assert.equal(g.next().value,'open');
  assert.deepEqual(f.events,['ocrl','separator','ocrl','open']);assert.equal(f.r.p1,33000n);assert.equal(f.r.x2,halfWords(40007n,40007n));done(g);
});
for(const length of [0n,1n,halfWords(7n,8n)])test(`nonnegative file length ${length} clears LE+3, skips IN and writes current buffer`,()=>{
  const f=fixture();f.file.write('leblk',length,3);done(f.run());assert.equal(f.file.read('leblk',3),0n);assert.equal(f.r.t4,length);
  assert.deepEqual(f.input,[]);assert.deepEqual(f.output,[signed36(halfWords(-3n,39999n))]);assert.ok(!f.events.some(e=>e.startsWith('core:')));
});
test('negative old length builds input and output descriptors in low-memory TMP with zero sentinel',()=>{
  const f=fixture();f.file.write('leblk',signed36(halfWords(-2n,77n)),3);f.file.write('tmp',999n,1);done(f.run());
  assert.deepEqual(f.input,[signed36(halfWords(-2n,40002n))]);assert.deepEqual(f.output,[signed36(halfWords(-5n,39999n))]);
  assert.equal(f.r.x2,halfWords(40002n,40004n));assert.equal(f.file.read('leblk',3),signed36(halfWords(-2n,77n)));
});
test('X2 full-word addition carries into the old-buffer half used for input addressing',()=>{
  const f=fixture();f.file.write('dbuf',halfWords(0n,0o777777n),1);f.file.write('leblk',signed36(halfWords(-1n,0n)),3);
  done(f.run());assert.deepEqual(f.input,[signed36(halfWords(-1n,0n))]);assert.equal(f.r.x2,0n);
});
test('busy OPEN retries after guarded warning and HIBER with live Ctrl-C check',()=>{
  const f=fixture();let opens=0;f.file.write('leblk',halfWords(77n,23n),1);f.io.open=function*(){f.events.push('open');return opens++>0;};
  const g=f.run();assert.equal(g.next().value,'hiber');assert.equal(f.r.t1,3000n);done(g);assert.equal(opens,2);
  assert.ok(f.events.includes('%DECWAR.GRP being modified; trying again\r\n'));assert.equal(f.output.length,1);
});
test('Ctrl-C during retry hibernate takes cleanup without another OPEN',()=>{
  const f=fixture();f.file.write('leblk',23n,1);f.io.open=function*(){f.events.push('open');return false;};
  const g=f.run();assert.equal(g.next().value,'hiber');f.state.ccflg=-1n;done(g);assert.equal(f.events.filter(e=>e==='open').length,1);assert.equal(f.output.length,0);assert.equal(f.state.ccflg,0n);
});
test('HIBER failure enters required HALT; returning continuation checks Ctrl-C before retry',()=>{
  const f=fixture();f.file.write('leblk',23n,1);f.io.open=function*(){return false;};f.io.hibernate=function*(){return false;};
  const g=f.run();assert.equal(g.next().value,'halt');assert.ok(!f.events.some(e=>e.startsWith('close:')));f.state.ccflg=1n;done(g);assert.equal(f.output.length,0);
});
test('nonbusy OPEN failure warns and cleans up even while no file was opened',()=>{
  const f=fixture();f.file.write('leblk',24n,1);f.io.open=function*(){return false;};done(f.run());
  assert.ok(f.events.includes("%Can't write DECWAR.GRP\r\n"));assert.ok(f.events.includes('close:40000'));assert.deepEqual(f.output,[]);
});
test('failed old-file CORE does not construct TMP or enter IN, then cleans up',()=>{
  const f=fixture();f.job.jbrel=40002n;f.file.write('leblk',signed36(halfWords(-5n,0n)),3);f.file.write('tmp',555n,0);f.io.core=function*(){return false;};
  done(f.run());assert.equal(f.file.read('tmp',0),555n);assert.ok(f.events.includes("%Can't get core to read DECWAR.GRP\r\n"));assert.deepEqual(f.input,[]);assert.deepEqual(f.output,[]);
});
test('successful CORE can change T4 and X2 before descriptor construction',()=>{
  const f=fixture();f.job.jbrel=40000n;f.file.write('leblk',signed36(halfWords(-2n,0n)),3);const g=f.run();g.next();assert.equal(g.next().value,'core');
  f.r.t4=signed36(halfWords(-7n,99n));f.r.x2=halfWords(40100n,40110n);done(g);assert.deepEqual(f.input,[signed36(halfWords(-7n,40100n))]);
  assert.deepEqual(f.output,[signed36(halfWords(-111n,39999n))]);
});
test('IN monitor skip is the warning path and prevents OUT',()=>{
  const f=fixture();f.file.write('leblk',signed36(halfWords(-2n,0n)),3);f.io.input=function*(){return true;};done(f.run());
  assert.ok(f.events.includes("%Can't read DECWAR.GRP\r\n"));assert.equal(f.output.length,0);assert.ok(f.events.includes('pshp'));
});
test('OUT monitor skip warns but still closes, restores output and clears Ctrl-C',()=>{
  const f=fixture();f.io.output=function*(){return true;};f.state.ccflg=-1n;done(f.run());assert.ok(f.events.includes("%Can't write DECWAR.GRP\r\n"));assert.equal(f.state.ccflg,0n);
});
test('USETO may modify TMP before actual output reads it',()=>{
  const f=fixture();f.io.useto=function*(){f.file.write('tmp',123n,0);};done(f.run());assert.deepEqual(f.output,[123n]);
});
test('output descriptor preserves source halfword borrow when DBUF address right half is zero',()=>{
  const f=fixture();f.file.write('dbuf',halfWords(3n,0n),0);done(f.run());
  assert.deepEqual(f.output,[signed36(halfWords(rightHalf(-40003n),0o777777n))]);assert.ok(f.events.includes(`close:${halfWords(3n,0n)}`));
});
test('cleanup reads changed DBUF after output, then waits for CLOSE/SETO/PSHP before flag clear',()=>{
  const f=fixture();f.state.ccflg=7n;const g=f.run();g.next();assert.equal(g.next().value,'output');f.file.write('dbuf',40099n,0);
  assert.equal(g.next().value,'close');assert.equal(f.file.read('fl.ff'),40099n);assert.equal(f.state.ccflg,7n);
  assert.equal(g.next().value,'seto');assert.equal(f.r.x1,halfWords(32000n,32000n));assert.equal(f.state.ccflg,7n);
  assert.equal(g.next().value,'pshp');assert.equal(f.state.ccflg,7n);done(g);assert.equal(f.state.ccflg,0n);
});
test('a nonreturning CLOSE retains FL.FF, destination registers and Ctrl-C',()=>{
  const f=fixture();f.state.ccflg=7n;f.io.close=function*(){throw new Error('Transfer');};
  assert.throws(()=>done(cleanupGripe(f.file,f.state,f.r,f.s,f.io)),/Transfer/);assert.equal(f.file.read('fl.ff'),40000n);assert.equal(f.r.x1,7n);assert.equal(f.state.ccflg,7n);
});
