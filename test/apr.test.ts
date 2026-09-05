import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { FileBlock } from '../src/compat/files.ts';
import { LockBlock } from '../src/compat/unlock.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { lockLayout } from '../src/generated/lock-layout.ts';
import { interceptApr,setAprTrap } from '../src/compat/apr.ts';
import type { AprServices } from '../src/compat/apr.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from '../src/compat/word36.ts';
import { fatalDecwar,FatalLocals } from '../src/game/entry.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { decwarText } from '../src/generated/source-data.ts';
class Transfer extends Error{readonly address:bigint;constructor(address:bigint){super(`Transfer ${address}`);this.address=address;}}
class Exit extends Error{}
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const memory=new AddressSpace();memory.map(0n,Array.from({length:16},(_,i)=>BigInt(100+i)));
  memory.map(0o140n,Array<bigint>(128).fill(0n));memory.map(BigInt(lockLayout.address),Array<bigint>(lockLayout.words).fill(0n));
  memory.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));memory.map(30000n,[signed36(halfWords(0o765432n,12345n))]);
  const file=new FileBlock(memory),locks=new LockBlock(memory),low=new CommonBlock(memory,'lowseg');
  const state={get addrck(){return low.read('addrck');},set addrck(v){low.write('addrck',v);}};
  const job={jbtpc:halfWords(0o765432n,30000n)};
  const symbols={emergencyPushdownInitial:signed36(halfWords(-40n,file.address('stabuf',128)-1n)),
    dataStackInitial:signed36(halfWords(-40n,31000n)),normalPushdownInitial:signed36(halfWords(-40n,32000n)),fallbackArgument:33000n};
  locks.write('locked',halfWords(77n,444n));locks.write('ftlerr',500n);const events:string[]=[];
  // Explicit sequential-transfer fixture: production BLT, including AC effects,
  // stack faults and interrupt delivery, remains a required machine operation.
  const io:AprServices<string>={
    *blt(ac,end){events.push(`blt:${ac}:${end}`);let from=leftHalf(memory.read(ac)),to=rightHalf(memory.read(ac));while(to<=end)memory.write(to++,memory.read(from++));},
    *gripe(){events.push('gripe');yield 'gripe';},
    *jump(address){events.push(`jump:${address}`);throw new Transfer(address);},
    *outstrIndirect(address){events.push(`outstr:${address}`);yield 'outstr';},
    *monit(){events.push('monit');throw new Exit();},
  };
  return {memory,file,locks,low,state,job,symbols,events,io,run:()=>interceptApr(file,locks,state,job,symbols,io)};
}
test('APRSET resolves and masks the caller address into AC0 and FTLERR without changing flags',()=>{
  const f=fixture();f.state.addrck=7n;setAprTrap(f.locks,()=>halfWords(55n,900n));assert.equal(f.memory.read(0n),900n);
  assert.equal(f.locks.read('ftlerr'),900n);assert.equal(f.state.addrck,7n);
});
test('APRSET resolution failure leaves previous fatal address and AC0 intact',()=>{
  const f=fixture();assert.throws(()=>setAprTrap(f.locks,()=>{throw new Error('Unknown label');}),/Unknown label/);
  assert.equal(f.memory.read(0n),100n);assert.equal(f.locks.read('ftlerr'),500n);
});
test('APRTRP sets ADDRCK before register capture and saves all sixteen ACs, including P',()=>{
  const f=fixture(),before=Array.from({length:16},(_,i)=>f.memory.read(BigInt(i)));f.file.write('stabuf',999n,18);
  const blt=f.io.blt;f.io.blt=function*(ac,end){assert.equal(f.state.addrck,-1n);assert.equal(f.file.read('stabuf',2),100n);
    assert.equal(f.memory.read(0n),halfWords(1n,f.file.address('stabuf',3)));yield*blt(ac,end);};
  const g=f.run();assert.equal(g.next().value,'gripe');assert.deepEqual(Array.from({length:16},(_,i)=>f.file.read('stabuf',i+2)),before);
  assert.equal(f.file.read('stabuf',18),999n);assert.equal(f.file.read('stabuf',0),halfWords(444n,30000n));
  assert.equal(f.file.read('stabuf',1),f.memory.read(30000n));assert.throws(()=>done(g),Transfer);
});
test('Gripe runs with replacement stacks; afterward only P is reset, with no register restoration',()=>{
  const f=fixture(),g=f.run();assert.equal(g.next().value,'gripe');
  assert.equal(f.memory.read(0o17n),f.symbols.emergencyPushdownInitial);assert.equal(f.memory.read(0o15n),f.symbols.dataStackInitial);
  f.memory.write(2n,991n);f.memory.write(0o15n,992n);f.memory.write(0o17n,993n);
  assert.throws(()=>done(g),Transfer);assert.equal(f.memory.read(0o17n),f.symbols.normalPushdownInitial);
  assert.equal(f.memory.read(0o15n),992n);assert.equal(f.memory.read(2n),991n);assert.equal(f.memory.read(1n),500n);
});
test('FTLERR is read after GRIPE and full-word nonzero can branch to address zero',()=>{
  const f=fixture(),g=f.run();g.next();f.locks.write('ftlerr',halfWords(7n,0n));
  assert.throws(()=>done(g),(error)=>error instanceof Transfer&&error.address===0n);
  assert.equal(f.memory.read(1n),halfWords(7n,0n));assert.ok(!f.events.some(e=>e.startsWith('outstr:')));
});
test('Gripe can install the actual fatal address through APRSET before transfer',()=>{
  const f=fixture();f.io.gripe=function*(){setAprTrap(f.locks,()=>900n);};assert.throws(()=>done(f.run()),(error)=>error instanceof Transfer&&error.address===900n);
  assert.equal(f.memory.read(0n),900n);assert.equal(f.locks.read('ftlerr'),900n);
});
test('zero FTLERR uses post-GRIPE AC0 indirection and the separate [[5]] argument, without a random call',()=>{
  const f=fixture();f.low.write('hungup',-1n);f.io.gripe=function*(){f.locks.write('ftlerr',0n);f.memory.write(0n,halfWords(7n,345n));};
  f.symbols.fallbackArgument=halfWords(8n,444n);const g=f.run();assert.equal(g.next().value,'outstr');
  assert.equal(f.memory.read(0o16n),444n);assert.equal(f.memory.read(1n),halfWords(7n,345n));assert.ok(f.events.includes('outstr:345'));
  assert.throws(()=>done(g),Exit);assert.equal(f.events.at(-1),'monit');
});
test('a nonreturning GRIPE leaves the emergency stack and does not jump or print fallback',()=>{
  const f=fixture();f.io.gripe=function*(){throw new Exit();};assert.throws(()=>done(f.run()),Exit);
  assert.equal(f.memory.read(0o17n),f.symbols.emergencyPushdownInitial);assert.ok(!f.events.some(e=>e.startsWith('jump:')||e.startsWith('outstr:')));
});
test('a fault reading the faulting instruction retains prior capture and header stores',()=>{
  const f=fixture();f.job.jbtpc=halfWords(123n,31000n);
  assert.throws(()=>done(f.run()),/Unmapped source address/);assert.equal(f.state.addrck,-1n);
  assert.equal(f.file.read('stabuf',0),31000n);assert.equal(f.file.read('stabuf',1),0n);assert.equal(f.file.read('stabuf',17),115n);
  assert.equal(f.memory.read(1n),31000n);assert.equal(f.memory.read(0o17n),115n);assert.ok(!f.events.includes('gripe'));
});
test('JBTPC pointing at AC1 reads its newly installed address, not a snapshotted register',()=>{
  const f=fixture();f.job.jbtpc=1n;const g=f.run();g.next();assert.equal(f.file.read('stabuf',1),1n);
  assert.equal(f.file.read('stabuf',3),101n);assert.throws(()=>done(g),Transfer);
});
test('post-GRIPE path leaves changes in shared STABUF and LOCKED untouched',()=>{
  const f=fixture();f.io.gripe=function*(){f.file.write('stabuf',999n,0);f.locks.write('locked',123n);};
  assert.throws(()=>done(f.run()),Transfer);assert.equal(f.file.read('stabuf',0),999n);assert.equal(f.locks.read('locked'),123n);
});
test('APR target composes with DECWAR fatal output only after capture and GRIPE return',()=>{
  const f=fixture(),out=new TerminalOutput(),local=new FatalLocals();let randomCalls=0,leaves=0;
  setAprTrap(f.locks,()=>900n);
  f.io.jump=function*(address){assert.equal(address,900n);assert.equal(f.state.addrck,-1n);assert.ok(f.events.includes('gripe'));
    yield*fatalDecwar(local,out,{iran(n){assert.equal(n,5n);randomCalls++;return 4n;},literal:item=>item.text,
      *leave(){leaves++;yield 'leave';throw new Exit();}});throw new Error('Unexpected fatal return');};
  const g=f.run();assert.equal(g.next().value,'gripe');assert.equal(randomCalls,0);assert.equal(g.next().value,'leave');
  assert.equal(randomCalls,1);assert.equal(local.i,4n);assert.equal(leaves,1);
  assert.ok(out.drain().includes(decwarText.fatal[3][4].text));assert.throws(()=>done(g),Exit);
});
