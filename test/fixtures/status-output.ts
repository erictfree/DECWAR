import assert from 'node:assert/strict';
import { outputStatus } from '../../src/compat/status-output.ts';
import type { StatusSymbols,StatusServices,HeaderServices,StatusRegisters } from '../../src/compat/status-output.ts';
import { outputString,outputSpace,outputSpaces,outputCrLf } from '../../src/compat/text-output.ts';
import { outputSixbit,outputRadix } from '../../src/compat/field-output.ts';
import type { NumberServices } from '../../src/compat/field-output.ts';
import { AddressSpace } from '../../src/compat/memory.ts';
import { TerminalOutput } from '../../src/compat/output.ts';
import { halfWords,leftHalf,rightHalf,signed36,unsigned36,packAscii,packSixbit,divide36,MIN_INTEGER } from '../../src/compat/word36.ts';
export function statusOutputFixture(options?:{memory:AddressSpace;registers:StatusRegisters;character:()=>Generator<string,void,void>;hcpos:()=>bigint;blank:()=>bigint;who:()=>bigint}){
  const a=(n:number)=>BigInt(n)+(options?50000n:0n);
  const m=options?.memory??new AddressSpace();m.map(a(1000),Array<bigint>(1500).fill(0n));
  const out=new TerminalOutput(),r=options?.registers??{x1:91n,x2:92n,x3:1n,x4:-6n,t1:95n,t2:96n,p1:97n,c:98n},stack:bigint[]=[];
  const state={versio:21n,who:1n,gameno:17n,blhopt:-1n,romopt:-1n,get hcpos(){return options?options.hcpos():BigInt(out.hcpos);}};
  if(options)Object.defineProperty(state,'who',{get:options.who});
  const s:StatusSymbols={lngshp:a(1100),pregameLabel:a(1210),point7LeftHalf:0o440700n,
    player:{name1:a(1300),name2:a(1320),speed:a(1340),ppn:a(1360),tty:a(1380),job:a(1400)},
    pregame:{name1:a(1500),name2:a(1501),speed:a(1502),ppn:a(1503),tty:a(1504),job:a(1505)}};
  const hs={tmp:a(1600),tmpPointer:halfWords(0o440700n,a(1600)),blackHoleLabel:a(1620),romulanLabel:a(1621)};
  const put=(address:bigint,text:string)=>{for(let i=0;i<=text.length;i+=5)m.write(address+BigInt(i/5),packAscii(text.slice(i,i+5)));};
  m.write(s.lngshp,a(1200));put(a(1200),'Lexington');m.write(s.lngshp+1n,a(1205));put(a(1205),'Nimitz');put(s.pregameLabel,'Pre-game');
  put(hs.blackHoleLabel,' B');put(hs.romulanLabel,' R');
  const values={name1:packSixbit('ERIC  '),name2:packSixbit('TEST  '),speed:1200n,ppn:halfWords(1n,0o27n),tty:packSixbit('TTY12 '),job:7n};
  for(const key of Object.keys(values) as (keyof typeof values)[]){m.write(s.player[key],values[key]);m.write(s.player[key]+1n,values[key]);m.write(s.pregame[key],values[key]);}
  // Required machine/address/stack behavior uses explicit fixtures. Routines compose below.
  function* ildb(key:'p1'|'x1'):Generator<string,bigint,void>{let pos=Number((r[key]>>30n)&63n),address=rightHalf(r[key]);assert.equal((r[key]>>24n)&63n,7n);
    if(pos<7){pos=36;address=rightHalf(address+1n);}pos-=7;r[key]=signed36((r[key]&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|address);return(m.read(address)>>BigInt(pos))&127n;}
  const io:StatusServices<string>&HeaderServices<string>&NumberServices<string>={
    *pushData(word){stack.push(word);},*popData(){assert.ok(stack.length);return stack.pop()!;},
    *movm(destination,word){assert.notEqual(word,MIN_INTEGER);r[destination]=word<0n?-word:word;},
    *aobjn(){r.x4=signed36(halfWords(leftHalf(r.x4)+1n,rightHalf(r.x4)+1n));return r.x4<0n;},
    *idivi(d){const x=divide36(r.t1,d);r.t1=x.quotient;r.t2=x.remainder;},
    *idiviX1(d){const x=divide36(r.x1,d);r.x1=x.quotient;r.x2=x.remainder;},
    *ochr(){if(options)yield*options.character();else out.character(r.c);},*space(){yield*outputSpace(r,io);},*spaces(){yield*outputSpaces(r,io);},
    *ostr(){yield*outputString(r,s.point7LeftHalf,{*ildb(){return yield*ildb('p1');},*ochr(){yield*io.ochr();}});},
    *sixbit(){yield*outputSixbit({get x1(){return r.x1;},set x1(v){r.x1=v;},get c(){return r.c;},set c(v){r.c=v;},get cNext(){return r.p1;},set cNext(v){r.p1=v;}},
      {...io,*lshc(){r.c=(unsigned36(r.p1)>>30n)&63n;r.p1=signed36(r.p1<<6n);}});},
    *decimal(){yield*outputRadix(r,10,io);},*octal(){yield*outputRadix(r,8,io);},
    *undat(){assert.equal(r.x1,hs.tmp);put(hs.tmp,'05-SEP-78');},*untim(){assert.equal(r.x1,hs.tmp);put(hs.tmp,'12:34');},
    *ildbX1(){return yield*ildb('x1');},*status(entry){yield*outputStatus(m,r,state,entry,s,io);},
    *crlf(){yield*outputCrLf({get blank(){return options?options.blank():BigInt(out.blank);},get hcpos(){return options?options.hcpos():BigInt(out.hcpos);}},r,io);},
  };
  return {m,r,state,s,hs,io,out,stack,put};
}
