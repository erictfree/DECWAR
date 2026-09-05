import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import { pointsStatements,pointsMessages,pointsSwitches } from '../../src/game/points-statements.ts';
import type { PointsStatementServices,PointsSymbols,PointsMessage } from '../../src/game/points-statements.ts';
import { WordBlock } from '../../src/compat/memory.ts';
import { localLayout } from '../../src/generated/local-layout.ts';
import { messages } from '../../src/generated/source-data.ts';
import { beginFortran5Do,continueFortran5Do } from '../../src/compat/fortran5-do.ts';
import type { Fortran5DoFrame } from '../../src/compat/fortran5-do.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { bindBlockRuntime } from './block-runtime.ts';
export function bindPointsRuntime(f:ReturnType<typeof pregameInputRuntimeFixture>){
  f.m.map(23800n,Array<bigint>(1200).fill(0n));const po=new WordBlock(f.m,localLayout.points);
  const i=23800n,dflg=23801n,header=23810n,number=23820n,width=23821n,temp=23822n,lines=23823n,two=23824n;
  f.m.write(i,77n);f.h.put(two,'  ');
  const labels={} as Record<PointsMessage,bigint>;for(const [n,key] of pointsMessages.entries()){labels[key]=23900n+32n*BigInt(n);f.h.put(labels[key],messages[key].text);}
  const symbols={federa:labels.federa} as PointsSymbols;for(const [n,key] of pointsSwitches.entries()){symbols[key]=23840n+8n*BigInt(n);f.h.put(symbols[key],key);}
  const events:string[]=[],frames=new Map<'switches'|'rows',Fortran5DoFrame>(),numeric=f.weapon.io,prepare=(a:bigint[])=>{loadArgumentBlock(f.m,header,a);selectArgumentBlock(f.r,header);};
  const final:{continuation?: (index:bigint)=>Generator<string,boolean,void>}={};
  const block=bindBlockRuntime(f);
  const io:PointsStatementServices<string>={logical:numeric.logical,not:w=>!numeric.logical(w),
    *and(...p){return yield*numeric.and(...p);},*or(...p){return yield*numeric.or(...p);},*binary(...a){return yield*numeric.binary(...a);},*assign(...a){yield*numeric.assign(...a);},
    *assignBoolean(d,v){f.m.write(d(),v?-1n:0n);},
    *blkset(a,z,n){events.push('blkset');f.m.write(block.symbols.value,BigInt(z));f.m.write(block.symbols.count,BigInt(n));yield*block.run('blkset',[a,block.symbols.value,block.symbols.count]);},
    *beginLoop(site,index,start,limit){events.push(`loop:${start}:${limit}`);frames.set(site,beginFortran5Do(f.m,index,BigInt(start),BigInt(limit)));return true;},
    *continueLoop(site,index){const frame=frames.get(site);if(!frame){if(site==='switches'&&final.continuation)return yield*final.continuation(index);throw new Error('fixture requires uninitialized POINTS DO continuation');}if(continueFortran5Do(f.m,frame))return true;frames.delete(site);return false;},
    *equal(a,b){return yield*f.pregameInput.io.equal(a,b);},
    *out(key,n){events.push(key);f.m.write(lines,BigInt(n));prepare([labels[key],lines]);yield*f.rt.run('out');},
    *crlf(){events.push('crlf');yield*f.rt.run('crlf');},*space(){yield*f.rt.run('space');},
    *tab(n){f.m.write(number,BigInt(n));prepare([number]);yield*f.rt.run('tab');},
    *out2c(){prepare([two]);yield*f.rt.run('out2c');},*out2w(a,b){prepare([a(),b()]);yield*f.rt.run('out2w');},
    *oflt(v,w){let a:bigint;if(typeof v==='bigint')a=v;else{f.m.write(temp,yield*v.evaluate());a=temp;}f.m.write(width,BigInt(w));events.push('oflt:'+a);prepare([a,width]);yield*f.rt.run('oflt');},
    *odec(a,w){prepare([a,w]);yield*f.rt.run('odec');},*spaces(a){prepare([a]);yield*f.rt.run('spaces');},
  };
  return {po,i,dflg,labels,symbols,events,frames,final,io,block,
    *run(actual=dflg){frames.clear();yield*pointsStatements(f.high,f.low,po,actual,i,symbols,io);}};
}
