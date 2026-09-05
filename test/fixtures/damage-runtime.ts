import { damageStatements } from '../../src/game/damage-statements.ts';
import type { DamageServices } from '../../src/game/damage-statements.ts';
import { rawEqual } from '../../src/compat/equal.ts';
import { CommonBlock } from '../../src/compat/memory.ts';
import { PackedBoard } from '../../src/compat/board.ts';
import { commonLayout } from '../../src/runtime/variant-values.ts';
import { constants as K,messages as M,outputTables as T,deviceKeys } from '../../src/runtime/variant-values.ts';
import { packAscii,rightHalf } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { outputRuntimeFixture } from './output-runtime.ts';
import { boardRuntimeFixture } from './board-runtime.ts';
import { equalServices } from './equal.ts';
export function damageRuntimeFixture(format:number=K.SHORT){
  const f=outputRuntimeFixture();for(const l of [commonLayout.lowseg,commonLayout.hiseg])f.m.map(BigInt(l.address),Array<bigint>(l.words).fill(0n));f.m.map(10000n,Array<bigint>(4000).fill(0n));
  const high=new CommonBlock(f.m,'hiseg'),low=new CommonBlock(f.m,'lowseg'),board=new PackedBoard(high.array('board',K.BRDSIZ,[1]));
  for(const key of ['who','hcpos','blank','hungup','oflg'] as const)Object.defineProperty(f.state,key,{get:()=>low.read(key),set:(v:bigint)=>low.write(key,v)});
  low.write('who',1n);low.write('oflg',BigInt(format));high.write('shpdam',3000n,1,1);
  high.write('shpcon',12n,1,K.KVPOS);high.write('shpcon',34n,1,K.KHPOS);board.setdsp(12,34,101);
  for(let i=1;i<=K.KMAXTK;i++)low.write('typlst',BigInt(K.KEOL),i);
  deviceKeys.forEach((key,i)=>high.write('device',packAscii(key),i+1)); // Explicit test compiler Hollerith/alpha encoding.
  T.shtdev.forEach((x,i)=>f.h.put(f.s.device.shtdev+BigInt(i),x.text));
  for(const [name,base] of [['meddev',12000n],['lngdev',12100n]] as const)T[name].forEach((x,i)=>{const a=base+BigInt(i*6);f.m.write(f.s.device[name]+BigInt(i),a);f.h.put(a,x.text);});
  T.lngshp.forEach((x,i)=>{const a=12300n+BigInt(i*4);f.m.write(f.s.status.lngshp+BigInt(i),a);f.h.put(a,x.text);});
  f.m.write(f.s.object.lngdsp+1n,(1n<<22n)|(2n<<18n)|rightHalf(f.s.status.lngshp-1n));
  f.m.write(f.s.object.shtdsp+1n,(2n<<18n)|12399n);T.shtshp.forEach((x,i)=>f.h.put(12400n+BigInt(i),x.text));
  const labels={alldok:10000n,units1:10100n,damrep:10200n,dmhdr1:10300n,dmhdr2:10400n};for(const name of Object.keys(labels) as (keyof typeof labels)[])f.h.put(labels[name],M[name].text);
  const locals={i:11000n,j:11001n,ia:11003n,ja:11004n},stoken=11002n;f.m.write(stoken,2n);
  const prepare=(words:bigint[])=>{loadArgumentBlock(f.m,10600n,words);selectArgumentBlock(f.r,10600n);};
  const events:string[]=[],eq=equalServices(f),rawBoard=boardRuntimeFixture(f,high,low);
  const io:DamageServices<string>={logical:w=>w<0n,enterTokenLoop:(start,limit)=>start<=limit,
    *equal(t,d){events.push(`equal:${t}:${d}`);prepare([t,d]);yield*rawEqual(f.r,f.rt.args,f.s.point7LeftHalf,eq);return f.r.f;},
    *out(name,lines){events.push(name);f.m.write(11100n,BigInt(lines));prepare([labels[name],11100n]);yield*f.rt.run('out');},
    *crlf(){yield*f.rt.run('crlf');},*space(){events.push('space');yield*f.rt.run('space');},
    *tab(n){events.push(`tab:${n}`);f.m.write(11101n,BigInt(n));prepare([11101n]);yield*f.rt.run('tab');},
    *spaces(n){f.m.write(11101n,BigInt(n));prepare([11101n]);yield*f.rt.run('spaces');},
    *skip(n){f.m.write(11101n,BigInt(n));prepare([11101n]);yield*f.rt.run('skip');},
    *odev(a){events.push(`odev:${f.m.read(a)}`);prepare([a]);yield*f.rt.run('odev');},
    *oflt(a,w){events.push(`oflt:${a}`);f.m.write(11102n,BigInt(w));prepare([a,11102n]);yield*f.rt.run('oflt');},
    *disp(v,h){events.push('disp');prepare([v,h]);yield*rawBoard.run('disp');return f.r.t0;},
    *odisp(v,space){f.m.write(11103n,v);f.m.write(11104n,BigInt(space));prepare([11103n,11104n]);yield*f.rt.run('odisp');},
  }; // Local/literal/temporary addresses, ordinary DO and LOGICAL interpretation are explicit compiler fixtures.
  const token=(i:number,text:string,type:number=K.KALF)=>{low.write('tknlst',packAscii(text),i);low.write('typlst',BigInt(type),i);};
  return {...f,high,low,board,locals,stoken,io,eq,events,token,run:()=>damageStatements(high,low,stoken,locals,io)};
}
