import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import { endgameStatements,endgameMessages } from '../../src/game/endgame-statements.ts';
import type { EndgameLocals,EndgameStatementServices } from '../../src/game/endgame-statements.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindEndgameRuntime(f:ReturnType<typeof pregameInputRuntimeFixture>){
  f.m.map(23300n,Array<bigint>(500).fill(0n));f.m.map(BigInt(localLayout.points.address),Array<bigint>(localLayout.points.words).fill(0n));
  const locals={} as EndgameLocals;for(const [i,key] of (['txppn','txnm1','txnm2','txsh1','txsh2','whowon','txwhy','txtim','txtem','txtot'] as const).entries()){locals[key]=23300n+BigInt(i);f.m.write(locals[key],77n);}
  const total=BigInt(localLayout.points.address),header=23320n,lines=23340n,labels={} as Record<typeof endgameMessages[number],bigint>;
  for(const [i,key] of endgameMessages.entries()){labels[key]=23400n+BigInt(i*40);f.h.put(labels[key],messages[key].text);}
  const events:string[]=diagnosticRecords(),numeric=f.weapon.io,io:EndgameStatementServices<string>={logical:numeric.logical,
    *and(...a){return yield*numeric.and(...a);},*compare(...a){return yield*numeric.compare(...a);},*assign(...a){yield*numeric.assign(...a);},*binary(...a){return yield*numeric.binary(...a);},
    *minmax(op,values){const words:bigint[]=[];for(const v of values)words.push(yield*v.evaluate());return words.reduce((a,b)=>op==='min0'?(a<b?a:b):(a>b?a:b));}, // Explicit left-to-right compiler fixture.
    *assignTrue(d){f.m.write(d(),-1n);},*kilhgh(){throw new Error('fixture requires KILHGH');},
    *out(key,n){events.push(key);f.m.write(lines,BigInt(n));loadArgumentBlock(f.m,header,[labels[key],lines]);selectArgumentBlock(f.r,header);yield*f.rt.run('out');},
    *etim(start){events.push('etim');return yield*f.io.etim(start());},
    *points(){throw new Error('fixture requires final POINTS');},*updsta(){throw new Error('fixture requires UPDSTA');},*free(){throw new Error('fixture requires FREE');},
    *exit(){events.push('exit');throw new Error('fixture EXIT transfer');},
  };
  return {locals,total,labels,events,io,run:()=>endgameStatements(f.high,f.low,locals,total,io)};
}
