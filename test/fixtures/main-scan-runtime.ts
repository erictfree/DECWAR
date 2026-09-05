import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { RepairServices } from '../../src/game/repair-statements.ts';
import { scanStatements } from '../../src/game/scan-statements.ts';
import type { ScanStatementServices,ScanWords } from '../../src/game/scan-statements.ts';
import { scanMachine } from '../../src/compat/scan-runtime.ts';
import type { ScanMachineServices } from '../../src/compat/scan-runtime.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { scanObjects,messages,outputTables } from '../../src/runtime/variant-values.ts';
import { rawLdis } from '../../src/compat/ldis.ts';
import { signed36,unsigned36,rightHalf,halfWords } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainScanRuntime(f:ReturnType<typeof pregameRuntimeFixture>,numeric:Pick<RepairServices<string>,'logical'|'integer'|'assign'|'equal'>){
  f.m.map(53000n,Array<bigint>(1000).fill(77n));const locals={} as ScanWords;
  for(const [i,key] of (['dist','warn','k','mod','n','p','d','i','hpos','vpos','vmax','vmin','hmax','hmin','enemy'] as const).entries())locals[key]=53000n+BigInt(i*4);
  const symbols={warning:53100n,up:53104n,down:53108n,right:53112n,left:53116n,corner:53120n},s={header:53140n,count:53150n,syntax:53200n,b7tbl:53300n,objectPairs:53400n,shtshp:53500n};
  for(const [key,a] of Object.entries(symbols))f.h.put(a,key.toUpperCase());f.h.put(s.syntax,messages.syntax.text);
  const base=BigInt(localLayout.local.address),screen={hmin:base,hmax:base+1n,vmin:base+2n,vmax:base+3n,dh:base+4n,dv:base+5n,screen:base+6n,b12tbl:f.rawBoard.s.b12tbl,b7tbl:s.b7tbl,ksid:f.rawBoard.s.ksid,scnflg:f.low.address('scnflg'),ccflg:f.low.address('ccflg')};
  for(let i=-1;i<5;i++)f.m.write(s.b7tbl+BigInt(i),halfWords((BigInt(29-i*7)<<12n)|(7n<<6n),screen.screen));
  for(const [i,pair] of scanObjects.entries()){if(pair.text===null)continue;f.m.write(s.objectPairs+BigInt(i*2),BigInt(pair.text.charCodeAt(0)));f.m.write(s.objectPairs+BigInt(i*2+1),BigInt(pair.text.charCodeAt(1)));}
  outputTables.shtshp.forEach((x,i)=>f.h.put(s.shtshp+BigInt(i),x.text));
  const events:string[]=[],prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const advance=(register:'p1'|'p2')=>{let p=unsigned36(f.r[register]),position=(p>>30n)&63n,address=rightHalf(p);const size=(p>>24n)&63n;if(size!==7n&&size!==12n)throw new Error('scan fixture byte size');if(position<size){position=36n;address=rightHalf(address+1n);}position-=size;p=(p&~((63n<<30n)|262143n))|(position<<30n)|address;f.r[register]=signed36(p);return {position,address,mask:(1n<<size)-1n};};
  const machineIO:ScanMachineServices<string>={...f.rt.stack,
    *ildb(){const p=advance('p1');f.r.t1=(unsigned36(f.m.read(p.address))>>p.position)&p.mask;},
    *idpb(reg){const p=advance('p2'),w=unsigned36(f.m.read(p.address));f.m.write(p.address,(w&~(p.mask<<p.position))|((f.r[reg]&p.mask)<<p.position));},
    *object(){if(f.r.t1===1n||f.r.t1===2n){f.r.t2=signed36(f.r.t2+halfWords(0o350700n,s.shtshp-1n));f.r.t1=32n;f.r.t2=(unsigned36(f.m.read(rightHalf(f.r.t2)))>>29n)&127n;}else{const a=s.objectPairs+(f.r.t1+1n)*2n;f.r.t1=f.m.read(a);f.r.t2=f.m.read(a+1n);}},
    *output(entry){events.push(entry);yield*f.rt.run(entry);},
  }; // Explicit direct local byte pointers and relocated OBJTBL/GETSHP fixture.
  const machine=(entry:'setscn'|'mark'|'shwscn')=>scanMachine(entry,f.m,f.r,f.rt.args,screen,machineIO);
  const io:ScanStatementServices<string>={...numeric,trueWord:-1n,falseWord:0n,
    *negate(e){return signed36(-(yield*e()));},*integerOr(a,b){return signed36((yield*a())|(yield*b()));},
    *setscn(...a){events.push('setscn');prepare(a);yield*machine('setscn');},
    *ldis(v,h,ov,oh,range){f.m.write(s.count,BigInt(range));prepare([v,h,ov,oh,s.count]);yield*rawLdis(f.r,f.rt.args,f.ldisCPU);return f.r.f;},
    *dispc(v,h){prepare([v,h]);yield*f.rawBoard.run('dispc');return f.r.f;},
    *mark(v,h,radius){events.push('mark:'+radius);f.m.write(s.count,BigInt(radius));prepare([v,h,s.count]);yield*machine('mark');},
    *shwscn(){events.push('shwscn');yield*machine('shwscn');},
    *syntax(){f.m.write(s.count,1n);prepare([s.syntax,s.count]);yield*f.rt.run('out');},
  };
  return {locals,s,symbols,screen,events,machineIO,machine,io,run:(entry:'scan'|'srscan'='scan')=>scanStatements(entry,f.high,f.low,locals,symbols,io)};
}
