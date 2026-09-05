import assert from 'node:assert/strict';
import { checkRuntimeFixture } from './check-runtime.ts';
import { locateStatements } from '../../src/game/locate-statements.ts';
import type { LocateStatementServices,LocateMessage } from '../../src/game/locate-statements.ts';
import { rawEqual } from '../../src/compat/equal.ts';
import { TerminalOutput } from '../../src/compat/output.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { constants as K,messages as M } from '../../src/generated/source-data.ts';
import { packAscii } from '../../src/compat/word36.ts';
// Shared-memory adapter; numeric/DO policies and GTKN/PAUSE remain explicit
// fixtures. EQUAL, INGAL, DISP and each OUT use their raw routine bodies.
export function bindLocateRuntime(f:ReturnType<typeof checkRuntimeFixture>){
  f.m.map(15400n,Array<bigint>(800).fill(0n));
  const locals={p:15400n,sign:15401n,max:15402n,k:15403n,i:15404n,j:15405n,index:15406n,dv:15407n,dh:15408n,locate:15409n,reloc:15410n};
  for(const a of Object.values(locals))f.m.write(a,77n);
  f.m.write(locals.dv,f.realWord('99'));f.m.write(locals.dh,f.realWord('99'));
  const n=15430n;f.m.write(n,2n);
  const symbols={absolute:15440n,relative:15450n,computed:15460n,romulan:15470n};
  f.h.put(symbols.absolute,M.absfrm.text);f.h.put(symbols.relative,M.relfrm.text);f.h.put(symbols.computed,'COMPUTED');f.h.put(symbols.romulan,'ROMULAN');
  const labels={} as Record<LocateMessage,bigint>;
  for(const [i,name] of (['coord1','damcom','erloc1','erloc2','erloc3','erloc4','noship','erloc7','erloc8','erloc9'] as const).entries()){labels[name]=15500n+BigInt(i*32);f.h.put(labels[name],M[name].text);}
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,15420n,a);selectArgumentBlock(f.r,15420n);};
  const numeric=f.weapon.io,check=f.io,events:string[]=[];
  const io:LocateStatementServices<string>={
    *binary(...a){return yield*numeric.binary(...a);},*convert(...a){return yield*numeric.convert(...a);},*compare(...a){return yield*numeric.compare(...a);},*assign(...a){yield*numeric.assign(...a);},realLiteral:t=>numeric.realLiteral(t),logical:w=>numeric.logical(w),
    *and(...a){return yield*numeric.and(...a);},*or(...a){return yield*numeric.or(...a);},
    *iabs(v){return yield*check.iabs(v);},*isign(...a){return yield*check.isign(...a);},*mod(...a){return yield*check.mod(...a);},
    *bounds(s,l,step){const start=yield*s.evaluate(),limit=yield*l.evaluate();events.push(`bounds:${start},${limit},${step}`);return {start,limit};},enterLoop:(s,l,step)=>step===1?s<=l:s>=l,
    *ingal(...a){events.push('ingal');return yield*check.ingal(...a);},*disp(...a){events.push('disp');return yield*check.disp(...a);},
    *equal(t,s){events.push(`equal:${t}:${s}`);prepare([t,s]);yield*rawEqual(f.r,f.rt.args,f.s.point7LeftHalf,f.eq);return f.r.f;},
    *out(message,lines){events.push(message);f.m.write(15431n,BigInt(lines));prepare([labels[message],15431n]);yield*f.rt.run('out');},
    *gtkn(){events.push('gtkn');yield 'input';const pending=new TerminalOutput();assert.ok(f.input.acquire(pending));assert.equal(pending.drain(),'','fixture requires raw GTKN output binding');},
    *pause(ms){const n=yield*ms.evaluate();events.push(`pause:${n}`);yield `pause:${n}`;},
  };
  return {locals,n,symbols,labels,io,events,run:(entry:'locate'|'reloc'='locate',actual=n)=>locateStatements(entry,actual,f.high,f.low,locals,symbols,io)};
}
export function locateRuntimeFixture(line='MOVE 12 20',count=2n){
  const f=checkRuntimeFixture(),locate=bindLocateRuntime(f);f.parse(line);f.m.write(locate.n,count);f.low.write('icflg',BigInt(K.KABS));
  f.high.write('job',300n,1,K.KTTYSP);f.high.write('rom',-1n);f.high.write('locr',50n,K.KVPOS);f.high.write('locr',60n,K.KHPOS);
  f.high.write('names',packAscii('NIMIT'),2,1);f.high.write('alive',-1n,2);f.high.write('shpcon',30n,2,K.KVPOS);f.high.write('shpcon',40n,2,K.KHPOS);f.views.high.board.setdsp(30,40,102);
  return {...f,checkIO:f.io,checkEvents:f.events,...locate,values:(n=Number(f.m.read(locate.locals.locate)))=>Array.from({length:n},(_,i)=>f.low.read('vallst',i+1))};
}
