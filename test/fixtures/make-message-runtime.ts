import assert from 'node:assert/strict';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindGetMessageRuntime } from './get-message-runtime.ts';
import type { bindQueueProducerRuntime } from './queue-producer-runtime.ts';
import { makeMessageRuntime } from '../../src/compat/make-message-runtime.ts';
import type { MakeMessageServices } from '../../src/compat/make-message-runtime.ts';
import { characterBits } from '../../src/generated/character-bits.ts';
import { add36,multiply36,halfWords,rightHalf,signed36,unsigned36 } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{getMessage:ReturnType<typeof bindGetMessageRuntime>;queueProducer:ReturnType<typeof bindQueueProducerRuntime>};
export function bindMakeMessageRuntime(f:Host){
  f.m.map(27800n,Array<bigint>(600).fill(0n));const header=27800n,string=27900n,indirect=27810n;
  const symbols={dbits:f.low.address('dbits'),dispfr:f.low.address('dispfr'),ccflg:f.low.address('ccflg'),lkfail:f.low.address('lkfail'),cbits:f.tokens.symbols.cbits,eol:BigInt(characterBits.flags['cf.eol']),point7:0o440700n,linePointer:signed36(halfWords(0o444400n,f.input.lineAddress)),queuePointer:signed36(halfWords(-32n,f.getMessage.symbols.msgql)),messagePointer:signed36(halfWords(0o440700n,f.getMessage.symbols.msgq+1n)),msglen:17n,capacity:77n,msgflg:f.high.address('msgflg',1),prompt:27820n,notSent:27830n};
  f.h.put(symbols.prompt,'Msg: ');f.h.put(symbols.notSent,'No message sent\r\n');f.h.put(string,'HELLO');f.m.write(indirect,string);const events:string[]=[];
  function pointer(reg:'p1'|'t1',advance:boolean){const w=unsigned36(f.r[reg]),size=(w>>24n)&63n;let pos=(w>>30n)&63n,a=rightHalf(w);assert.ok(size===7n||size===36n);assert.equal((w>>18n)&63n,0n);if(advance){if(pos<size){pos=36n;a=rightHalf(a+1n);}pos-=size;f.r[reg]=signed36((w&~((63n<<30n)|0o777777n))|(pos<<30n)|a);}assert.ok(pos+size<=36n);return {a,pos,mask:(1n<<size)-1n};}
  const io:MakeMessageServices<string>={
    *ildb(){events.push('ildb');const p=pointer('p1',true);f.r.c=signed36((unsigned36(f.m.read(p.a))>>p.pos)&p.mask);},
    *idpb(){events.push('idpb');const p=pointer('t1',true);f.m.write(p.a,(unsigned36(f.m.read(p.a))&~(p.mask<<p.pos))|((f.r.c&p.mask)<<p.pos));},
    *dpb(){events.push('dpb');const p=pointer('t1',false);f.m.write(p.a,(unsigned36(f.m.read(p.a))&~(p.mask<<p.pos))|((f.r.c&p.mask)<<p.pos));},
    *ostr(){events.push('out');yield*f.rt.run('ostr.');},*inli(){events.push('inli');yield*f.editor.run();},
    *reserve(){events.push('reserve');yield*f.queueProducer.run('rsrv');},*remove(){events.push('remove');yield*f.getMessage.call('remv');},*publish(){events.push('publish');yield*f.queueProducer.run('updt');},
    *imuliT1(n){f.r.t1=multiply36(f.r.t1,n);},*addT1(n){f.r.t1=add36(f.r.t1,n);},*movniT2(n){f.r.t2=signed36(-n);},*aojgeT2(){f.r.t2=add36(f.r.t2,1n);return f.r.t2>=0n;},*addiT2(n){f.r.t2=add36(f.r.t2,n);},
    *aosMessage(a){events.push('count:'+a);f.m.write(a,add36(f.m.read(a),1n));},*lshT1(){f.r.t1=unsigned36(f.r.t1)>>1n;},*aojT2(){f.r.t2=add36(f.r.t2,1n);},
  };
  return {symbols,header,string,indirect,events,io,run:(args:readonly bigint[]=[string])=>{loadArgumentBlock(f.m,header,args);selectArgumentBlock(f.r,header);return makeMessageRuntime(f.m,f.r,f.rt.args,symbols,io);}};
}
