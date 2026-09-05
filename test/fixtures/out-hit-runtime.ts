import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindGetHitRuntime } from './get-hit-runtime.ts';
import type { bindGetCommandRuntime } from './get-command-runtime.ts';
import type { bindPointsRuntime } from './points-runtime.ts';
import { outHitStatements } from '../../src/game/out-hit-statements.ts';
import type { OutHitMessage,OutHitStatementServices } from '../../src/game/out-hit-statements.ts';
import { prlocStatements } from '../../src/game/prloc-statements.ts';
import { constants as K,messages,outputTables as T } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{getHit:ReturnType<typeof bindGetHitRuntime>;getCommand:ReturnType<typeof bindGetCommandRuntime>;points:ReturnType<typeof bindPointsRuntime>};
export function bindOutHitRuntime(f:Host){
  f.m.map(33000n,Array<bigint>(4000).fill(0n));const locals={nplcf:33000n,nplct:33001n},header=33010n,zero=33030n,n=33031n,temp=33032n,chars=33040n,pr={prcflg:33050n,w:33051n,tw:33052n,short:33053n};f.m.write(locals.nplcf,77n);f.m.write(locals.nplct,77n);f.m.write(pr.short,BigInt(K.SHORT));
  const labels={} as Record<OutHitMessage,bigint>,keys=Object.keys(messages).filter(k=>/^outh\d\d$/.test(k)||['star02','displc','units1','destry','tormis'].includes(k)) as OutHitMessage[];
  for(const [i,key] of keys.entries()){labels[key]=33200n+BigInt(i*32);f.h.put(labels[key],messages[key].text);}
  for(const [j,key] of (['shtdsp','lngdsp'] as const).entries())T[key].forEach((x,i)=>{if(x.text===null)return;const a=35000n+BigInt(j*100+i*8);f.h.put(a,x.text);f.m.write(f.s.object[key]+BigInt(i),a);});
  T.shtdev.forEach((x,i)=>f.h.put(f.s.device.shtdev+BigInt(i),x.text));for(const [j,key] of (['meddev','lngdev'] as const).entries())T[key].forEach((x,i)=>{const a=35400n+BigInt(j*200+i*12);f.h.put(a,x.text);f.m.write(f.s.device[key]+BigInt(i),a);});
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,header,a);selectArgumentBlock(f.r,header);},events:string[]=[],numeric=f.weapon.io;
  const io:OutHitStatementServices<string>={*assign(...a){yield*numeric.assign(...a);},*binary(...a){return yield*numeric.binary(...a);},*and(...p){return yield*numeric.and(...p);},*or(...p){return yield*numeric.or(...p);},
    *bits(op,a,b){const x=yield*a.evaluate(),y=yield*b.evaluate();return op==='and'?x&y:x|y;},
    *blkset(a,z,count){events.push('blkset');const b=f.points.block;f.m.write(b.symbols.value,BigInt(z));f.m.write(b.symbols.count,BigInt(count));yield*b.run('blkset',[a,b.symbols.value,b.symbols.count]);},
    *gethit(a){events.push('gethit');yield*f.getHit.run(a);},*out(key,lines){events.push(key);f.m.write(n,BigInt(lines));prepare([labels[key],n]);yield*f.rt.run('out');},
    *outc(c){events.push('outc:'+c);f.h.put(chars,c);prepare([chars]);yield*f.rt.run('outc');},*out2c(c){events.push('out2c:'+c);f.h.put(chars,c);prepare([chars]);yield*f.rt.run('out2c');},*space(){yield*f.rt.run('space');},*crlf(){events.push('crlf');yield*f.rt.run('crlf');},
    *odisp(a,spaces){events.push('odisp:'+f.m.read(a));f.m.write(n,BigInt(spaces));prepare([a,n]);yield*f.rt.run('odisp');},*odec(a){prepare([a,zero]);yield*f.rt.run('odec');},*oflt(a){prepare([a,zero]);yield*f.rt.run('oflt');},*osflt(v){f.m.write(temp,yield*v.evaluate());prepare([temp,zero]);yield*f.rt.run('osflt');},*odev(a){prepare([a]);yield*f.rt.run('odev');},
    *prloc(v,h,cr,oc,of){events.push('prloc');f.m.write(pr.prcflg,BigInt(cr));f.m.write(pr.w,0n);yield*prlocStatements(f.m,f.high,f.low,{v,h,prcflg:pr.prcflg,w:pr.w,tw:pr.tw,prlflg:oc,proflg:of==='short'?pr.short:of},f.pi);},
  }; // Declared arithmetic, literals and existing PRLOC/CPU/monitor policies.
  const run=()=>outHitStatements(f.high,f.low,locals,io);f.getCommand.io.outhit=function*(){f.getCommand.events.push('outhit');yield*run();};
  return {locals,labels,events,io,run};
}
