import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainLoopRuntime } from './main-loop-runtime.ts';
import { initializeDecwarStatements,runDecwarStatements } from '../../src/game/entry-statements.ts';
import type { EntryStatementServices } from '../../src/game/entry-statements.ts';
import { decwarText,messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindEntryRuntime(f:ReturnType<typeof pregameRuntimeFixture>,main:ReturnType<typeof bindMainLoopRuntime>){
  f.m.map(71000n,Array<bigint>(1000).fill(77n));const s={header:71000n,count:71020n,zero:71021n,decver:71100n,BEGINNER:71040n,INTERMEDIATE:71045n,EXPERT:71050n};f.h.put(s.decver,messages.decver.text);for(const key of ['BEGINNER','INTERMEDIATE','EXPERT'] as const)f.h.put(s[key],key);
  const text=decwarText.startup.map((item,i)=>{const address=71200n+BigInt(i*30);f.h.put(address,item.text);return {...item,address};}),events:string[]=diagnosticRecords(),prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  function* out(a:bigint,lines:number){f.m.write(s.count,BigInt(lines));prepare([a,s.count]);yield*f.rt.run('out');}
  const io:EntryStatementServices<string>={
    *clearLow(first,last){events.push('clearLow');f.m.write(s.zero,0n);f.m.write(s.count,last-first+1n);yield*f.points.block.run('blkset',[first,s.zero,s.count]);},
    *startupText(){events.push('startupText');yield*out(s.decver,1);for(const item of text)yield*out(item.address,item.newline);},*gtkn(){yield*f.tokens.run();},and:f.weapon.io.and,
    *equal(token,key){return yield*f.pregameInput.io.equal(token,s[key]);},*type(kind){events.push('type:'+kind);yield*f.type.call(kind);},*summar(){events.push('summar');yield*main.lists.run('summar');},
    *pregam(){events.push('pregam');yield*f.pregame.run();},*ttyon(){events.push('ttyon');yield*f.pregame.io.ttyon();},*setupAndPlace(){events.push('setupAndPlace');yield*main.setupAndPlace();},*commands(){events.push('commands');return yield*main.run();},
  };
  return {s,events,io,initialize:()=>initializeDecwarStatements(f.high,f.low,io),run:()=>runDecwarStatements(f.high,f.low,io)};
}
