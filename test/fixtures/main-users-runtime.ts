import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { usersStatements } from '../../src/game/users.ts';
import type { UsersStatementServices } from '../../src/game/users.ts';
import { prlocStatements } from '../../src/game/prloc-statements.ts';
import { constants as K,messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainUsersRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(50500n,Array<bigint>(500).fill(77n));const locals={i:50500n,num:50501n},s={header:50510n,count:50520n,player:50521n,prcflg:50522n,w:50523n,proflg:50524n,tw:50525n},labels={users1:50600n,users2:50700n,users5:50800n};
  for(const key of ['users1','users2','users5'] as const)f.h.put(labels[key],messages[key].text);
  const events:string[]=diagnosticRecords(),prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const io:UsersStatementServices<string>={logical:f.weapon.io.logical,
    *out(key,n){events.push(key);f.m.write(s.count,BigInt(n));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *crlf(){yield*f.rt.run('crlf');},*spaces(n){f.m.write(s.count,n);prepare([s.count]);yield*f.rt.run('spaces');},
    *stat(count,player){events.push('stat:'+player);f.m.write(s.player,player);prepare([count,s.player]);yield*f.rt.run('stat');},
    *prloc(v,h,mode){events.push('prloc');f.m.write(s.prcflg,0n);f.m.write(s.w,2n);f.m.write(s.proflg,BigInt(K.SHORT));yield*prlocStatements(f.m,f.high,f.low,{v,h,prcflg:s.prcflg,w:s.w,proflg:s.proflg,tw:s.tw,prlflg:mode},f.pi);},
  };
  return {locals,s,labels,events,io,run:()=>usersStatements(f.high,f.low,locals,io)};
}
