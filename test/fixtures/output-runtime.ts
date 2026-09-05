import assert from 'node:assert/strict';
import { outputRuntime } from '../../src/compat/output-runtime.ts';
import type { OutputEntry,OutputRuntimeServices } from '../../src/compat/output-runtime.ts';
import { AddressSpace,WordBlock } from '../../src/compat/memory.ts';
import { FileBlock } from '../../src/compat/files.ts';
import { fileLayout } from '../../src/generated/file-layout.ts';
import { inputRuntimeLayout } from '../../src/generated/input-runtime-layout.ts';
import { machineRegisters } from '../../src/compat/registers.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { halfWords,leftHalf,rightHalf,signed36,unsigned36,divide36 } from '../../src/compat/word36.ts';
import { statusOutputFixture } from './status-output.ts';
export function outputRuntimeFixture(){
  const m=new AddressSpace();m.map(0n,Array<bigint>(16).fill(0n));m.map(5000n,Array<bigint>(4000).fill(0n));
  for(const l of [fileLayout,inputRuntimeLayout])m.map(BigInt(l.address),Array<bigint>(l.words).fill(0n));
  const r=machineRegisters(m),file=new FileBlock(m),output=new WordBlock(m,inputRuntimeLayout),events:string[]=[],emitted:{sink:string;c:bigint}[]=[];
  const state={hungup:0n,hcpos:0n,blank:0n,who:0n,oflg:0n,versio:21n,gameno:17n,blhopt:-1n,romopt:-1n},job={jbff:7000n,jbrel:7500n};
  const h=statusOutputFixture({memory:m,registers:r,character:function*(){assert.fail();},hcpos:()=>state.hcpos,blank:()=>state.blank,who:()=>state.who});
  h.hs.tmp=file.address('tmp',0);h.hs.tmpPointer=halfWords(0o440700n,h.hs.tmp);
  const initialStackWord=signed36(halfWords(-40n,5999n));r.s=initialStackWord;r.p=signed36(halfWords(-40n,6099n));
  const s={point7LeftHalf:0o440700n,initialStackWord,numeric:{onum:100n,osn1:101n,osn2:102n,osn3:103n},status:h.s,header:h.hs,
    object:{shtdsp:8000n,lngdsp:8020n},device:{shtdev:8040n,meddev:8060n,lngdev:8080n},
    condition:{docked:8100n,dockedLong:8110n,dockedShort:8112n,lngcnd:8120n,shtcnd:8130n},
    output:{bufferCountOffset:2n,bufferPointerOffset:1n,outputInstructionLeftHalf:5n},
    gripe:{bufferAddressOffset:0n,bufferPointerOffset:1n,bufferCountOffset:2n,point7LeftHalf:0o440700n}};
  m.write(8000n,8200n);h.put(8200n,'.');m.write(8020n,8201n);h.put(8201n,'Empty Space');h.put(8040n,'SH ');
  m.write(8060n,8210n);h.put(8210n,'Shields ');m.write(8080n,8220n);h.put(8220n,'Deflector Shields ');
  h.put(8110n,'Docked+');h.put(8112n,'D+');m.write(8120n,8230n);h.put(8230n,'Green');m.write(8130n,8240n);h.put(8240n,'G');
  const resolve=(a:bigint)=>{for(let i=0;i<8;i++){const w=m.read(a),index=(w>>18n)&15n;a=rightHalf(rightHalf(w)+(index?m.read(index):0n));if((w&(1n<<22n))===0n)return a;}throw new Error('Fixture indirect limit');};
  const cpu:OutputRuntimeServices<string>={
    argumentAddress:resolve,*indirectAddress(a){return resolve(a);},indirect:resolve,idpb(c){emitted.push({sink:'buffer',c});},
    *ildb(pointer){let pos=Number((r[pointer]>>30n)&63n),a=rightHalf(r[pointer]);const size=Number((r[pointer]>>24n)&63n);assert.ok(size===7||size===36);
      if(pos<size){pos=36;a=rightHalf(a+1n);}pos-=size;r[pointer]=signed36((r[pointer]&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|a);
      return signed36((m.read(a)>>BigInt(pos))&((1n<<BigInt(size))-1n));},
    *pushS(word){r.s=signed36(halfWords(leftHalf(r.s)+1n,rightHalf(r.s)+1n));m.write(rightHalf(r.s),word);},
    *popS(){const w=m.read(rightHalf(r.s));r.s=signed36(halfWords(leftHalf(r.s)-1n,rightHalf(r.s)-1n));return w;},
    *pushP(word){r.p=signed36(halfWords(leftHalf(r.p)+1n,rightHalf(r.p)+1n));m.write(rightHalf(r.p),word);},
    *popP(){const w=m.read(rightHalf(r.p));r.p=signed36(halfWords(leftHalf(r.p)-1n,rightHalf(r.p)-1n));return w;},
    *outstrUnderflow(){events.push('underflow');},*haltUnderflow(){throw new Error('Underflow transfer');},
    movm:h.io.movm,*movnX4(w){r.x4=signed36(-w);},aobjnX4:h.io.aobjn,
    *lshcC(){r.c=(unsigned36(r.cNext)>>30n)&63n;r.cNext=signed36(r.cNext<<6n);},
    *idivi(pair,d){const x=divide36(r[pair],d);r[pair]=x.quotient;r[pair==='t1'?'t2':pair==='x1'?'x2':pair==='x2'?'x3':'x4']=x.remainder;},
    *idivHours(){const d=divide36(r.x1,3600000n);r.x1=d.quotient;r.x2=d.remainder;},
    *callAddress(a){events.push(`call:${a}`);const entry=({100:'onum.',101:'osn1.',102:'osn2.',103:'osn3.'} as Record<string,OutputEntry>)[String(a)];if(!entry)throw new Error('External call '+a);yield*rt.run(entry);},
    *jumpAddress(a){events.push(`jump:${a}`);const entry=({200:'ochr.t',201:'ochr.b',202:'ogch.'} as Record<string,OutputEntry>)[String(a)];if(!entry)throw new Error('External jump '+a);yield*rt.run(entry);},
    *outchr(c){emitted.push({sink:'tty',c});},*executeOutput(i){events.push(`output:${i}`);yield 'output';},
    undat:h.io.undat,untim:h.io.untim,*core(){yield 'core';return true;},
    *blt(end){let from=leftHalf(r.t1),to=rightHalf(r.t1);while(to<=end)m.write(to++,m.read(from++));r.t1=signed36(halfWords(from,to));},
    *outputTTY(){events.push('flush');},*outstr(t){events.push(t);},
  }; // All instruction/relocation/monitor behavior above is an explicit fixture.
  const rt=outputRuntime(output,file,r,state,job,s,cpu);output.write('oc',200n);output.write('obfctr',8300n);output.write('obfptr',8301n);m.write(8300n,100n);m.write(8301n,8310n);
  const args=(...values:bigint[])=>{values.forEach((v,i)=>m.write(5500n+BigInt(i),v));loadArgumentBlock(m,5400n,values.map((_,i)=>5500n+BigInt(i)));selectArgumentBlock(r,5400n);};
  const text=()=>emitted.map(x=>String.fromCharCode(Number(unsigned36(x.c)&127n))).join('');
  return {m,r,file,output,state,job,s,cpu,rt,events,emitted,args,text,h};
}
