import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';
import type { MachineRegisters } from './registers.ts';
import type { FieldStack } from './field-output.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type RomulanSpeechEntry='romspk'|'rmcopy'|'rmgply';
export type RomulanSpeechSymbols={player:bigint;who:bigint;team:bigint;bits:bigint;tmp:bigint;dbits:bigint;dispfr:bigint;romulan:bigint;point7:bigint;
  iranArgs:Record<3|4|5,bigint>;masks:bigint;broadcast:bigint;single:bigint;adjectives:bigint;populations:bigint;objects:bigint;nodes:bigint;generic:bigint;teams:bigint;
  columbus:bigint;tymnet:bigint;cl:bigint;cs:bigint;q:bigint;};
export type RomulanSpeechServices<W>=FieldStack<W>&{
  iran():Generator<W,void,void>; // Actual ARG points to a relocated [[n]] literal.
  copy():Generator<W,void,void>;playerQuip():Generator<W,void,void>;
  ildbP2():Generator<W,void,void>;idpbP1():Generator<W,void,void>;
  sos(register:'t1'|'p2',address:bigint):Generator<W,void,void>;
  soslP2(address:bigint):Generator<W,boolean,void>;
  aojT2():Generator<W,void,void>;getlinT1():Generator<W,void,void>;
};
// WARMAC.MAC:6228-6348; NODNAM data at 6350-6396. Each table/literal is
// relocated memory, and TMP is the shared assembler scratch word. No table
// bounds, destination length, logical-sign or exceptional-index guard is added.
export function* romulanSpeechRuntime<W>(entry:RomulanSpeechEntry,m:WordMemory,r:MachineRegisters,args:SourceArguments,s:RomulanSpeechSymbols,io:RomulanSpeechServices<W>,broadcastOnly=false):Generator<W,void,void>{
  // Austin WARMAC:4676-4794 removes player-specific routing and RMGPLY,
  // preserving the shared byte-copy instructions and four random draws.
  const indexed=(base:bigint,index:bigint)=>m.read(rightHalf(base+index));
  const random=function*(n:3|4|5){r.arg=rightHalf(s.iranArgs[n]);yield*io.iran();};
  if(entry==='rmcopy'){
    for(;;){yield*io.ildbP2();if(r.c===0n)return;yield*io.idpbP1();}
  }
  if(entry==='rmgply'){
    if(broadcastOnly)throw new Error('Austin has no RMGPLY entry');
    yield*random(3);
    if(r.t0===1n){
      yield*io.getlinT1();r.t1=signed36(halfWords(rightHalf(r.t1),0n));r.t2=0n;
      for(;;){
        r.t3=signed36(halfWords(leftHalf(indexed(s.nodes,r.t2)),0n));if(r.t3===0n)break;
        if(r.t1===r.t3){r.p2=rightHalf(indexed(s.nodes,r.t2));r.p2=signed36(halfWords(s.point7,rightHalf(r.p2)));return;}
        yield*io.aojT2();
      }
      r.t1=leftHalf(r.t1);r.t1&=0o77n;
      if(r.t1===s.cl||r.t1===s.cs){r.p2=m.read(s.columbus);return;}
      r.t1&=0o7777n;
      if(r.t1===s.q){r.p2=m.read(s.tymnet);return;}
    }
    yield*random(5);
    if(r.t0===5n){r.t1=m.read(s.team);r.p2=indexed(s.teams-1n,r.t1);return;}
    yield*io.sos('t1',0n);r.p2=indexed(s.generic,r.t1);return;
  }
  yield*io.pushData(r.arg);
  if(broadcastOnly||m.read(s.player)===0n){yield*random(3);r.t1=r.t0;m.write(s.tmp,r.t1);r.t1=indexed(s.masks-1n,r.t1);}
  else{r.t1=m.read(s.who);r.t1=indexed(s.bits-1n,r.t1);m.write(s.tmp,0n);}
  m.write(s.dbits,r.t1);r.t1=rightHalf(s.romulan);m.write(s.dispfr,r.t1);
  r.arg=signed36(yield*io.popData());r.p1=args.address(0);r.p1=signed36(halfWords(s.point7,rightHalf(r.p1)));
  yield*random(4);yield*io.sos('t1',0n);r.p2=indexed(s.broadcast,r.t1);
  if(m.read(s.tmp)===0n)r.p2=indexed(s.single,r.t1);yield*io.copy();
  yield*random(5);yield*io.sos('p2',0n);r.p2=indexed(s.adjectives,r.p2);yield*io.copy();
  if(yield*io.soslP2(s.tmp)){if(!broadcastOnly)yield*io.playerQuip();}else r.p2=indexed(s.populations,r.p2);
  yield*io.copy();yield*random(5);yield*io.sos('p2',0n);r.p2=indexed(s.objects,r.p2);yield*io.copy();
  r.c=115n;if(m.read(s.tmp)>=0n)yield*io.idpbP1();r.c=33n;yield*io.idpbP1();r.c=0n;yield*io.idpbP1();
}
