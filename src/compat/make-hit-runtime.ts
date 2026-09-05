import type { WordMemory } from './memory.ts';
import type { FieldStack } from './field-output.ts';
import { getHitClearFields } from './get-hit-runtime.ts';
import type { GetHitField,GetHitPoint } from './get-hit-runtime.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type MakeHitRegisters={t1:bigint;t2:bigint;t3:bigint;x1:bigint;x2:bigint;x3:bigint;p1:bigint};
export type MakeHitSymbols={who:bigint;dbits:bigint;pasflg:bigint;hitser:bigint;hitql:bigint;hitq:bigint;hitflg:bigint;knhshp:bigint;illegal:bigint;fields:Record<GetHitField,bigint>};
export type MakeHitServices<W>=FieldStack<W>&{
  sosX1():Generator<W,void,void>;imuli(register:'t1'|'x1',word:bigint):Generator<W,void,void>;
  aosX1():Generator<W,void,void>;sojgT1():Generator<W,boolean,void>;
  afterOldestUpdate():Generator<W,void,void>; // Resolve literal-block JRST .+1 at 3346.
  aosSerial(address:bigint):Generator<W,void,void>; // AOS T1,HITSER.
  addiT1(word:bigint):Generator<W,void,void>;dpbT2(point:GetHitPoint):Generator<W,void,void>;
  crlf():Generator<W,void,void>;ostr():Generator<W,void,void>;odec():Generator<W,void,void>;
  aosHit(address:bigint):Generator<W,void,void>;lshT1():Generator<W,void,void>;aojT2():Generator<W,void,void>;
};
// WARMAC.MAC:3330-3434. Slot selection, individual deposits, publication and
// counters remain separate operations. POINT and literal transfer are required policies.
export function* makeHitRuntime<W>(m:WordMemory,r:MakeHitRegisters,s:MakeHitSymbols,io:MakeHitServices<W>):Generator<W,void,void>{
  if(m.read(s.dbits)!==0n){
    r.x1=m.read(s.who);yield*io.sosX1();yield*io.imuli('x1',s.knhshp);r.x2=r.x1;r.t1=s.knhshp;r.t3=m.read(s.hitser);
    for(;;){
      r.t2=m.read(rightHalf(s.hitql+r.x1));if(rightHalf(r.t2)===0n){r.x2=r.x1;break;}
      r.t2=leftHalf(r.t2);if(r.t2<r.t3){r.t3=r.t2;r.x2=r.x1;yield*io.afterOldestUpdate();}
      yield*io.aosX1();if(!(yield*io.sojgT1()))break;
    }
    yield*io.aosSerial(s.hitser);m.write(rightHalf(s.hitql+r.x2),signed36(halfWords(rightHalf(r.t1),0n)));
    r.t1=rightHalf(r.x2);yield*io.imuli('t1',4n);yield*io.addiT1(s.hitq);
    for(const [field,offset,left] of [['dispfr',0,true],['dispto',0,false],['ihita',1,true],['critdm',1,false]] as const){
      r.t2=m.read(s.fields[field]);const a=rightHalf(r.t1+BigInt(offset)),old=m.read(a);m.write(a,signed36(left?halfWords(rightHalf(r.t2),rightHalf(old)):halfWords(leftHalf(old),rightHalf(r.t2))));
    }
    r.t2=m.read(s.fields.iwhat);
    if((r.t2<=0n||r.t2>15n)&&m.read(s.pasflg)!==0n){
      for(const reg of ['t1','t2','x1','x2'] as const)yield*io.pushData(r[reg]);
      yield*io.crlf();r.p1=rightHalf(s.illegal);yield*io.ostr();r.x1=r.t2;r.x2=0n;yield*io.odec();yield*io.crlf();
      for(const reg of ['x2','x1','t2','t1'] as const)r[reg]=signed36(yield*io.popData());
    }
    yield*io.dpbT2({size:'4',offset:2,end:'3'});
    const bytes:readonly [GetHitField,string,2|3,string][]=[['critdv','4',2,'7'],['vfrom','7',2,'14'],['hfrom','7',2,'21'],['vto','7',2,'28'],['hto','7',2,'35'],['klflg','2',3,'1'],['shcnfr','1',3,'2'],['shcnto','1',3,'3'],['shstfr','10',3,'13'],['shstto','10',3,'23'],['shjump','1',3,'24']];
    for(const [field,size,offset,end] of bytes){
      if(field==='shcnto')r.t2=m.read(s.fields.shcnto); // Source's extra MOVE before SKIPG.
      r.t2=m.read(s.fields[field]);if((field==='shcnfr'||field==='shcnto')&&r.t2<=0n)r.t2=0n;
      yield*io.dpbT2({size,offset,end});
    }
    r.x3=m.read(s.dbits);const link=rightHalf(s.hitql+r.x2);m.write(link,signed36(m.read(link)|r.x3));
    r.t1=m.read(s.dbits);r.t2=0n;m.write(s.dbits,0n);
    do{if((r.t1&1n)!==0n)yield*io.aosHit(rightHalf(s.hitflg+r.t2));yield*io.lshT1();yield*io.aojT2();}while(r.t1!==0n);
  }
  for(const field of getHitClearFields)m.write(s.fields[field],0n);
}
