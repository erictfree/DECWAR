import test from 'node:test';
import assert from 'node:assert/strict';
import { outputMemory } from '../src/compat/output-memory.ts';
import { machineRegisters } from '../src/compat/registers.ts';
import { AddressSpace,CommonBlock,WordBlock } from '../src/compat/memory.ts';
import { FileBlock } from '../src/compat/files.ts';
import { commonLayout } from '../src/generated/common-layout.ts';
import { localLayout } from '../src/generated/local-layout.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { halfWords,packSixbit,unsigned36 } from '../src/compat/word36.ts';
import { accountCharacter } from '../src/compat/ochr.ts';
import { outputStatus,outputStatusHeader } from '../src/compat/status-output.ts';
import { statusOutputFixture } from './fixtures/status-output.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const m=new AddressSpace();m.map(0n,Array<bigint>(16).fill(77n));
  for(const l of [commonLayout.lowseg,commonLayout.hiseg,localLayout.identity,fileLayout])m.map(BigInt(l.address),Array<bigint>(l.words).fill(0n));
  const low=new CommonBlock(m,'lowseg'),high=new CommonBlock(m,'hiseg'),identity=new WordBlock(m,localLayout.identity),file=new FileBlock(m);
  return {m,low,high,identity,file};
}
const literals={lngshp:5100n,pregameLabel:5200n,point7LeftHalf:0o440700n,blackHoleLabel:5300n,romulanLabel:5301n};
test('output binding uses actual COMMON dimensions, identity overlay and FileBlock TMP without writes',()=>{
  const f=fixture();f.low.write('hcpos',8n);f.identity.write('nam1',123n);f.high.write('gameno',91n);f.file.write('tmp',88n,0);
  const b=outputMemory(f.low,f.high,f.identity,f.file,literals);
  assert.equal(b.state.hcpos,8n);assert.equal(b.state.gameno,91n);assert.equal(f.file.read('tmp',0),88n);assert.equal(b.registers.x1,77n);
  assert.equal(b.status.player.name2,f.high.address('job',1,K.KNAM2));assert.equal(b.status.player.name2-b.status.player.name1,BigInt(K.KNPLAY));
  assert.equal(b.status.pregame.name1,f.identity.address('nam1'));assert.equal(f.m.read(b.status.pregame.name1),123n);
  assert.equal(b.header.tmp,f.file.address('tmp',0));assert.equal(unsigned36(b.header.tmpPointer),halfWords(literals.point7LeftHalf,b.header.tmp));
});
test('output state is live in both directions across private and shared words',()=>{
  const f=fixture(),b=outputMemory(f.low,f.high,f.identity,f.file,literals);b.state.who=3n;b.state.blank=4n;b.state.romopt=-1n;
  assert.equal(f.low.read('who'),3n);assert.equal(f.low.read('blank'),4n);assert.equal(f.high.read('romopt'),-1n);
  f.low.write('oflg',-1n);f.high.write('versio',21n);assert.equal(b.state.oflg,-1n);assert.equal(b.state.versio,21n);
});
test('output binding rejects incompatible view roles and mixed address spaces',()=>{
  const f=fixture();assert.throws(()=>outputMemory(f.high,f.low,f.identity,f.file,literals),/LOWSEG/);
  assert.throws(()=>outputMemory(f.low,f.high,f.identity,new FileBlock(new AddressSpace()),literals),/one address space/);
});
for(const who of [0n,1n])test(`OSTS/STAT binds real ACs, LOCAL identity and shared JOB for WHO ${who}`,()=>{
  const f=fixture(),r=machineRegisters(f.m);let text='';
  const h=statusOutputFixture({memory:f.m,registers:r,character:function*(){text+=String.fromCharCode(Number(unsigned36(r.c)&127n));accountCharacter(b.state,r);},
    hcpos:()=>b.state.hcpos,blank:()=>b.state.blank,who:()=>b.state.who});
  const b=outputMemory(f.low,f.high,f.identity,f.file,{lngshp:h.s.lngshp,pregameLabel:h.s.pregameLabel,point7LeftHalf:h.s.point7LeftHalf,
    blackHoleLabel:h.hs.blackHoleLabel,romulanLabel:h.hs.romulanLabel});
  Object.assign(h.hs,b.header);h.io.status=function*(entry){yield*outputStatus(f.m,r,b.state,entry,b.status,h.io);};
  b.state.who=who;b.state.versio=21n;b.state.gameno=17n;b.state.blhopt=-1n;b.state.romopt=-1n;
  const values={name1:packSixbit('ERIC  '),name2:packSixbit('TEST  '),speed:1200n,ppn:halfWords(1n,0o27n),tty:packSixbit('TTY12 '),job:7n};
  for(const key of Object.keys(values) as (keyof typeof values)[]){f.m.write(b.status.pregame[key],values[key]);f.m.write(b.status.player[key],values[key]);}
  const saved=[r.x1,r.x2,r.x3,r.x4];done(outputStatusHeader(r,b.state,b.header,h.io));
  assert.equal(text,'[V2.1  05-SEP-78 12:34  '+(who===0n?'Pre-game   ERIC  TEST   1200       1,27    TTY12    7':'Lexington  ERIC  TEST   1200       1,27    TTY12     7')+'    17 B R]\r\n');
  // A nonblank CR sets BLANK=-1; the following LF increments it to zero.
  assert.deepEqual([r.x1,r.x2,r.x3,r.x4],saved);assert.equal(b.state.hcpos,0n);assert.equal(b.state.blank,0n);assert.deepEqual(h.stack,[]);
  assert.equal(f.m.read(0o12n),r.cNext);assert.notEqual(f.file.read('tmp',0),0n);
});
