import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import assert from 'node:assert/strict';
import { boardRoutine } from '../../src/compat/board-runtime.ts';
import type { BoardEntry,BoardServices } from '../../src/compat/board-runtime.ts';
import { internalBoardRoutine } from '../../src/compat/board-internal.ts';
import type { InternalBoardServices } from '../../src/compat/board-internal.ts';
import { boardDiagnosticsFixture } from './board-diagnostics.ts';
import type { DiagnosticFixtureRuntime } from './board-diagnostics.ts';
import type { CommonBlock } from '../../src/compat/memory.ts';
import { add36,divide36,multiply36,halfWords,rightHalf,unsigned36 } from '../../src/compat/word36.ts';
// Explicit ordinary integer and local, unindexed POINT CPU fixture. CPU flags
// and monitor traps remain required production services.
export function boardRuntimeFixture(f:DiagnosticFixtureRuntime,high:CommonBlock,low:CommonBlock){
  const {m,r}=f,s={ksid:25n,b12tbl:13200n,oldobj:13210n,pasflg:low.address('pasflg')},events:string[]=diagnosticRecords();
  for(let i=-1;i<3;i++)m.write(s.b12tbl+BigInt(i),halfWords((BigInt(24-i*12)<<12n)|(12n<<6n),high.address('board',1)));
  const diagnostic=boardDiagnosticsFixture(f,low);
  const pointer=(word:bigint)=>{
    const w=unsigned36(word),position=(w>>30n)&63n,size=(w>>24n)&63n;
    assert.equal((w>>18n)&63n,0n,'fixture requires local, unindexed, direct pointer');
    assert.ok(position+size<=36n,'fixture requires byte within word');
    return {address:rightHalf(w),position,mask:(1n<<size)-1n};
  };
  const io:BoardServices<string>={
    *subiT0(w){r.t0=add36(r.t0,-w);},
    *idiviT0(w){const d=divide36(r.t0,w);r.t0=d.quotient;r.t1=d.remainder;},
    *imuli(reg,w){r[reg]=multiply36(r[reg],w);},
    *addiT0(w){r.t0=add36(r.t0,w);},*addT0(w){r.t0=add36(r.t0,w);},
    *ldb(dest){const p=pointer(r.t0);r[dest]=(unsigned36(m.read(p.address))>>p.position)&p.mask;},
    *dpb(){const p=pointer(r.t0),w=unsigned36(m.read(p.address));m.write(p.address,(w&~(p.mask<<p.position))|((r.t1&p.mask)<<p.position));},
    *chkc(){events.push('chkc');yield*diagnostic.run('chkc');},
    *chkd(){events.push('chkd');yield*diagnostic.run('chkd');},
  };
  const advance=()=>{
    let position=(unsigned36(r.t2)>>30n)&63n,address=rightHalf(r.t2);
    const size=(unsigned36(r.t2)>>24n)&63n;assert.equal(size,12n);
    if(position<size){position=36n;address=rightHalf(address+1n);}position-=size;
    r.t2=(unsigned36(r.t2)&~((63n<<30n)|262143n))|(position<<30n)|address;
  };
  const internalIO:InternalBoardServices<string>={...f.rt.stack,
    *idiviT2(w){const d=divide36(r.t2,w);r.t2=d.quotient;r.t3=d.remainder;},
    *imuliT1(w){r.t1=multiply36(r.t1,w);},*addiT2(w){r.t2=add36(r.t2,w);},*addT2(w){r.t2=add36(r.t2,w);},
    *ildbT3T2(){advance();const p=pointer(r.t2);r.t3=(unsigned36(m.read(p.address))>>p.position)&p.mask;},
    *idpbT3T2(){advance();const p=pointer(r.t2),w=unsigned36(m.read(p.address));m.write(p.address,(w&~(p.mask<<p.position))|((r.t3&p.mask)<<p.position));},
  };
  return {s,io,events,diagnostic,internalIO,internal:(entry:'gptr'|'gdsp'|'sdsp')=>internalBoardRoutine(entry,m,r,s,internalIO),run:(entry:BoardEntry)=>boardRoutine(entry,m,r,f.rt.args,s,io)};
}
