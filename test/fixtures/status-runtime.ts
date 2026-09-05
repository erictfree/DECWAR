import assert from 'node:assert/strict';
import { statusStatements } from '../../src/game/status-statements.ts';
import type { StatusServices,StatusSymbols,StatusMessage } from '../../src/game/status-statements.ts';
import { prlocStatements } from '../../src/game/prloc-statements.ts';
import type { PrlocServices } from '../../src/game/prloc-statements.ts';
import { rawEqual } from '../../src/compat/equal.ts';
import { rawPdist } from '../../src/compat/pdist.ts';
import { CommonBlock } from '../../src/compat/memory.ts';
import { MemoryCommandInput } from '../../src/compat/input-memory.ts';
import { TerminalOutput } from '../../src/compat/output.ts';
import { commonLayout } from '../../src/generated/common-layout.ts';
import { constants as K,messages as M,outputTables as T } from '../../src/generated/source-data.ts';
import { add36,multiply36,packAscii,MIN_INTEGER } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { outputRuntimeFixture } from './output-runtime.ts';
import { equalServices } from './equal.ts';

export function statusRuntimeFixture(format:number=K.SHORT){
  const f=outputRuntimeFixture();for(const l of [commonLayout.lowseg,commonLayout.hiseg])f.m.map(BigInt(l.address),Array<bigint>(l.words).fill(0n));f.m.map(10000n,Array<bigint>(4000).fill(0n));
  const high=new CommonBlock(f.m,'hiseg'),low=new CommonBlock(f.m,'lowseg');
  for(const key of ['who','hcpos','blank','hungup','oflg'] as const)Object.defineProperty(f.state,key,{get:()=>low.read(key),set:(v:bigint)=>low.write(key,v)});
  low.write('who',1n);low.write('oflg',BigInt(format));
  for(const [col,value] of [[K.KVPOS,12n],[K.KHPOS,34n],[K.KNTURN,17n],[K.KSPCON,BigInt(K.GREEN)],[K.KNTORP,10n],[K.KSHCON,1n],[K.KSSHPC,1000n],[K.KSNRGY,50000n]] as const)high.write('shpcon',value,1,col);
  high.write('bits',1n,1);high.write('bits',2n,2);
  f.s.condition.docked=high.address('docked',1);
  for(const [table,base] of [['lngcnd',11400n],['shtcnd',11420n]] as const)T[table].forEach((x,i)=>{const a=base+BigInt(i*4);f.m.write(f.s.condition[table]+BigInt(i),a);f.h.put(a,x.text);});
  const labels={} as Record<StatusMessage,bigint>;
  for(const [i,name] of (['stat2m','stat2l','stat3m','stat3l','stat6m','stat6l','stat7m','stat7l','stat8m','stat8l','stat9m','stat9l','sta10m','sta10l','stat05','stat11','radio3','radio1','syntax'] as const).entries()){
    labels[name]=10000n+BigInt(i*16);f.h.put(labels[name],M[name].text);
  }
  const symbols:StatusSymbols={switches:{shields:12000n,location:12004n,condition:12008n,torpedo:12012n,energy:12016n,damage:12020n,radio:labels.radio3},tokens:{C:packAscii('C'),L:packAscii('L'),T:packAscii('T'),E:packAscii('E'),D:packAscii('D'),S:packAscii('S'),R:packAscii('R')}};
  for(const [key,value] of Object.entries(symbols.switches))if(key!=='radio')f.h.put(value,key.toUpperCase());
  const locals={i:11000n,obit:11001n},stoken=11002n;f.m.write(stoken,2n);
  const a={prcflg:11200n,w:11201n,prlflg:11202n,proflg:11203n,tw:11204n};
  const events:string[]=[],eq=equalServices(f),prepare=(words:bigint[],header=10600n)=>{loadArgumentBlock(f.m,header,words);selectArgumentBlock(f.r,header);};
  const input=new MemoryCommandInput(low,packAscii),parse=(line:string)=>{input.acceptLine(line);assert.equal(input.acquire(new TerminalOutput()),true);};parse('STATUS');
  const distanceCPU={*sub(reg:'f'|'t1',w:bigint):Generator<string,void,void>{f.r[reg]=add36(f.r[reg],-w);},*movm(reg:'f'|'t1'):Generator<string,void,void>{assert.notEqual(f.r[reg],MIN_INTEGER);if(f.r[reg]<0n)f.r[reg]=-f.r[reg];}};
  const pi:PrlocServices<string>={
    *outc(c){f.h.put(11100n,c);prepare([11100n]);yield*f.rt.run('outc');},*space(){yield*f.rt.run('space');},*crlf(){yield*f.rt.run('crlf');},
    *odec(v,w){prepare([v,w]);yield*f.rt.run('odec');},*osdec(v,w){f.m.write(11101n,v);prepare([11101n,w]);yield*f.rt.run('osdec');},
    *pdist(v,h,ov,oh){prepare([v,h,ov,oh],10620n);yield*rawPdist(f.r,f.rt.args,distanceCPU);return f.r.f;},
    *difference(v,o){return add36(f.m.read(v),-f.m.read(o));},*omitRelative(d,w){return(yield*d())===0n&&w()===0n;},
  };
  const io:StatusServices<string>={logical:w=>w<0n,enterLoop:(start,limit)=>start<=limit,
    *newlinePredicate(n,s){return n()&&s();},*product(l,r){events.push('product');return multiply36(l(),r());},*integerAnd(l,r){events.push('mask');return l()&r();},
    *equal(t,s){events.push(`equal:${s}`);prepare([t,s]);yield*rawEqual(f.r,f.rt.args,f.s.point7LeftHalf,eq);return f.r.f;},
    *out(name,lines){events.push(name);f.m.write(11102n,BigInt(lines));prepare([labels[name],11102n]);yield*f.rt.run('out');},
    *outc(c){events.push(c);f.h.put(11100n,c);prepare([11100n]);yield*f.rt.run('outc');},
    *out2c(c){events.push(c);f.h.put(11100n,c);prepare([11100n]);yield*f.rt.run('out2c');},
    *crlf(){events.push('crlf');yield*f.rt.run('crlf');},*space(){events.push('space');yield*f.rt.run('space');},
    *odec(v,w){events.push(`odec:${v}`);prepare([v,w]);yield*f.rt.run('odec');},
    *oflt(v,w){events.push(`oflt:${v}`);prepare([v,w]);yield*f.rt.run('oflt');},
    *osfltValue(v,w){f.m.write(11103n,v);prepare([11103n,w]);yield*f.rt.run('osflt');},
    *ofltValue(v,w){f.m.write(11104n,v);prepare([11104n,w]);yield*f.rt.run('oflt');},
    *ocond(v){prepare([v]);yield*f.rt.run('ocond');},
    *prloc(v,h){f.m.write(a.prcflg,0n);f.m.write(a.w,0n);f.m.write(a.prlflg,BigInt(K.KABS));f.m.write(a.proflg,BigInt(K.SHORT));yield*prlocStatements(f.m,high,low,{...a,v,h},pi);},
  }; // Explicit compiler calls/locals/literals, arithmetic, LOGICAL/.AND./DO and CPU fixtures; no production defaults.
  const token=(i:number,text:string,type:number=K.KALF)=>{low.write('tknlst',packAscii(text),i);low.write('typlst',BigInt(type),i);};
  const statusReport={locals,stoken,symbols,labels,io,run:(actual=stoken)=>statusStatements(high,low,actual,locals,symbols,io)};
  return {...f,high,low,locals,stoken,symbols,labels,io,eq,events,pi,parse,input,token,statusReport,run:()=>statusReport.run()};
}
