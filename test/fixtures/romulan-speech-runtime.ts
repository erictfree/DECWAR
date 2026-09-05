import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindTellRuntime } from './tell-runtime.ts';
import { romulanSpeechRuntime } from '../../src/compat/romulan-speech-runtime.ts';
import type { RomulanSpeechServices,RomulanSpeechEntry } from '../../src/compat/romulan-speech-runtime.ts';
import { romulanText as T,constants as K } from '../../src/generated/source-data.ts';
import { add36,halfWords,packSixbit,rightHalf,signed36,unsigned36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{tell:ReturnType<typeof bindTellRuntime>};
export function bindRomulanSpeechRuntime(f:Host){
  f.m.map(30000n,Array<bigint>(2000).fill(0n));const header=30000n,buffer=30050n;
  const s={player:f.low.address('player'),who:f.low.address('who'),team:f.low.address('team'),bits:f.high.address('bits',1),tmp:f.file.address('tmp',0),dbits:f.low.address('dbits'),dispfr:f.low.address('dispfr'),romulan:BigInt(K.DXROM*100),point7:0o440700n,
    iranArgs:{3:30010n,4:30011n,5:30012n},masks:30100n,broadcast:30110n,single:30120n,adjectives:30130n,populations:30140n,objects:30150n,generic:30160n,teams:30170n,nodes:30200n,columbus:30180n,tymnet:30181n,cl:packSixbit('CL ')>>18n,cs:packSixbit('CS ')>>18n,q:packSixbit('Q  ')>>18n};
  for(const [i,n] of ([3,4,5] as const).entries()){const a=30016n+BigInt(i);f.m.write(a,BigInt(n));f.m.write(s.iranArgs[n],a);}
  T.masks.forEach((w,i)=>f.m.write(s.masks+BigInt(i),BigInt(w)));
  let next=30400n;const string=(text:string)=>{const a=next;next+=12n;f.h.put(a,text);return a;};
  for(const key of ['broadcast','single','adjectives','populations','objects','generic','teams'] as const)T[key].forEach((item,i)=>f.m.write(s[key]+BigInt(i),halfWords(s.point7,string(item.text))));
  f.m.write(s.columbus,halfWords(s.point7,string(T.specialNodes[0].text)));f.m.write(s.tymnet,halfWords(s.point7,string(T.specialNodes[1].text)));
  T.nodes.forEach((item,i)=>f.m.write(s.nodes+BigInt(i),halfWords(packSixbit(item.node)>>18n,string(item.text))));f.m.write(s.nodes+BigInt(T.nodes.length),0n);
  const events:string[]=[],nodes:bigint[]=[];
  function byte(reg:'p1'|'p2'){const w=unsigned36(f.r[reg]),size=(w>>24n)&63n;assert.equal(size,7n);assert.equal((w>>18n)&63n,0n);let pos=(w>>30n)&63n,a=rightHalf(w);if(pos<7n){pos=36n;a=rightHalf(a+1n);}pos-=7n;f.r[reg]=signed36((w&~((63n<<30n)|0o777777n))|(pos<<30n)|a);return {a,pos};}
  const io:RomulanSpeechServices<string>={
    *pushData(w){yield*f.rt.stack.pushData(w);},*popData(){return yield*f.rt.stack.popData();},
    *iran(){events.push('iran:'+f.rt.args.read(0));yield*f.cpu.pushP(1000n);yield*f.tell.random.run('iran');assert.equal(yield*f.cpu.popP(),1000n);},
    *copy(){events.push('copy');yield*call('rmcopy');},*playerQuip(){events.push('player-quip');yield*call('rmgply');},
    *ildbP2(){const p=byte('p2');f.r.c=(unsigned36(f.m.read(p.a))>>p.pos)&127n;events.push('read:'+f.r.c);},
    *idpbP1(){const p=byte('p1');events.push('write:'+f.r.c);f.m.write(p.a,(unsigned36(f.m.read(p.a))&~(127n<<p.pos))|((f.r.c&127n)<<p.pos));},
    *sos(reg,a){const w=add36(f.m.read(a),-1n);f.m.write(a,w);f.r[reg]=w;},*soslP2(a){yield*io.sos('p2',a);return f.r.p2<0n;},
    *aojT2(){f.r.t2=add36(f.r.t2,1n);},*getlinT1(){events.push('getlin');assert.ok(nodes.length,'GETLIN requires scheduled monitor node');f.r.t1=nodes.shift()!;},
  }; // Synthetic relocated literals, ordinary 7-bit pointers/CPU, explicit GETLIN.
  function* call(entry:RomulanSpeechEntry):Generator<string,void,void>{yield*f.cpu.pushP(1000n);yield*romulanSpeechRuntime(entry,f.m,f.r,f.rt.args,s,io);assert.equal(yield*f.cpu.popP(),1000n);}
  const run=(destination=buffer)=>{loadArgumentBlock(f.m,header,[destination]);selectArgumentBlock(f.r,header);return call('romspk');};
  f.tell.io.romspk=function*(a){f.tell.events.push('romspk');yield*run(a);};
  return {symbols:s,header,buffer,events,nodes,io,call,run};
}
