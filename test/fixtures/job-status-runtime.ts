import assert from 'node:assert/strict';
import { jobStatusRuntime,userProject } from '../../src/compat/job-status-runtime.ts';
import type { JobStatusServices } from '../../src/compat/job-status-runtime.ts';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import { halfWords,rightHalf,signed36,unsigned36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>;
export function bindJobStatusRuntime(f:Host){
  f.m.map(21200n,Array<bigint>(400).fill(0n));
  const symbols={who:f.low.address('who'),hungup:f.low.address('hungup'),ccflg:f.low.address('ccflg'),debflg:f.file.address('debflg'),frebie:f.locks.address('frebie'),jsqwho:f.locks.address('jsqwho'),jsqtab:21280n,usppn:21200n,uscbh:21210n,hand:21220n,tmp:f.file.address('tmp',0),trmopLiteral:21230n,speedTable:21240n,namePrompt:21260n,
    asciiPointer:signed36(halfWords(0o440700n,21210n)),sixbitPointer:signed36(halfWords(0o440600n,21220n)),sixbitEnd:signed36(halfWords(0o000600n,21221n))};
  const header=21300n,args=Array.from({length:6},(_,i)=>21310n+BigInt(i));
  f.m.write(symbols.trmopLiteral,halfWords(2n,21232n));f.m.write(21232n,12345n);f.m.write(21233n,-1n); // Synthetic .TORSP value.
  for(const [i,n] of [300,50,75,110,134,150,200,300,0,0,600,1200,1800,2400].entries())f.m.write(symbols.speedTable+BigInt(i),BigInt(n)); // WARMAC:3747-3760.
  f.h.put(symbols.namePrompt,'\r\nYour name please: ');f.h.put(symbols.uscbh,'PLAYER');
  const events:string[]=[],ppns=[9n,9n],bytes:bigint[]=[],monitor={speed:11n,trmopSkip:true,job:7n,sequenceJob:7n,tty:10n,getppnSkip:false};
  function pointer(reg:'t1'|'t2'){
    const word=unsigned36(f.r[reg]);let pos=(word>>30n)&63n,address=rightHalf(word);const size=(word>>24n)&63n;
    assert.ok(size===6n||size===7n,'fixture requires a six/seven-bit pointer');if(pos<size){pos=36n;address=rightHalf(address+1n);}pos-=size;f.r[reg]=signed36((word&~((63n<<30n)|0o777777n))|(pos<<30n)|address);return {pos,address,mask:(1n<<size)-1n};
  }
  const io:JobStatusServices<string>={
    *output(){events.push('output');yield*f.ini.controlIO.output();},*pjob(reg){events.push(`pjob:${reg}`);f.r[reg]=reg==='t1'?monitor.job:monitor.sequenceJob;},
    *trmop(){events.push('trmop');f.r.t1=monitor.speed;return monitor.trmopSkip;},
    *getppn(){events.push('getppn');assert.ok(ppns.length,'unscheduled GETPPN');f.r.t1=ppns.shift()!;return monitor.getppnSkip;},
    *getlin(){events.push('getlin');f.r.t1=monitor.tty;},*afterSequenceStore(){events.push('sequence-return');},
    *ldbProject(){f.r.t3=(unsigned36(f.r.t1)>>27n)&511n;},*ldbHandle(){f.r.t2=(unsigned36(f.m.read(symbols.uscbh))>>28n)&127n;},
    *outstr(a){events.push('name-prompt');yield*f.editor.io.outstr(a);},
    *inchwl(){events.push('inchwl');if(!bytes.length)yield 'name-input';assert.ok(bytes.length,'unscheduled name input');f.r.t2=bytes.shift()!;},
    *idpbName(){events.push(`idpb-name:${f.r.t2}`);const p=pointer('t1');f.m.write(p.address,(unsigned36(f.m.read(p.address))&~(p.mask<<p.pos))|((f.r.t2&p.mask)<<p.pos));},
    *ildbName(){const p=pointer('t1');f.r.t3=(unsigned36(f.m.read(p.address))>>p.pos)&p.mask;},
    *idpbSixbit(){events.push(`idpb-sixbit:${f.r.t3}`);const p=pointer('t2');f.m.write(p.address,(unsigned36(f.m.read(p.address))&~(p.mask<<p.pos))|((f.r.t3&p.mask)<<p.pos));},
  };
  return {symbols,header,args,events,io,monitor,ppns,bytes,feed:(text:string)=>bytes.push(...[...text].map(c=>BigInt(c.charCodeAt(0)))),
    run:(actual:readonly bigint[]=args)=>{loadArgumentBlock(f.m,header,actual);selectArgumentBlock(f.r,header);return jobStatusRuntime(f.m,f.r,f.rt.args,symbols,io);},project:()=>userProject(f.m,f.r,symbols.usppn)};
}
