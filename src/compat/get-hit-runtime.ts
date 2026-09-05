import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';
import { leftHalf,rightHalf,signed36 } from './word36.ts';
export const getHitClearFields=['dispfr','dispto','ihita','critdm','iwhat','critdv','vfrom','hfrom','vto','hto','klflg','shcnfr','shcnto','shstfr','shstto','shjump'] as const;
export type GetHitField=typeof getHitClearFields[number];
export type GetHitSymbols={hitflg:bigint;bits:bigint;hitql:bigint;hitq:bigint;knhit:bigint;dbits:bigint;fields:Record<GetHitField,bigint>};
export type GetHitRegisters={t1:bigint;t2:bigint;x2:bigint;x3:bigint};
export type GetHitPoint={size:string;offset:2|3;end:string};
export type GetHitServices<W>={
  sosl(address:bigint):Generator<W,boolean,void>; // Decrement memory; return the instruction's skip result.
  sojgT1():Generator<W,boolean,void>; // Decrement T1; return the instruction's jump result.
  aojaX2():Generator<W,void,void>;
  imuliT1(word:bigint):Generator<W,void,void>;
  addi(register:'t1'|'t2',word:bigint):Generator<W,void,void>;
  ldbT2(point:GetHitPoint):Generator<W,void,void>; // Original POINT tokens, indexed through live T1.
};
// WARMAC.MAC:3447-3523. POINT size/end spellings are not reinterpreted here;
// the assembler/CPU adapter must resolve their bytes and exceptional behavior.
export function* getHitRuntime<W>(m:WordMemory,r:GetHitRegisters,args:SourceArguments,s:GetHitSymbols,io:GetHitServices<W>):Generator<W,void,void>{
  function clear(){for(const field of getHitClearFields)m.write(s.fields[field],0n);}
  r.t1=args.read(0);if(yield*io.sosl(rightHalf(s.hitflg-1n+r.t1))){clear();return;}
  r.x2=0n;r.x3=m.read(rightHalf(s.bits-1n+r.t1));r.t1=s.knhit;
  for(;;){
    if((r.x3&m.read(rightHalf(s.hitql+r.x2)))!==0n)break;
    if(!(yield*io.sojgT1()))break;
    yield*io.aojaX2();
  }
  if(r.t1<=0n){clear();return;}
  r.t1=rightHalf(r.x2);yield*io.imuliT1(4n);yield*io.addi('t1',s.hitq);
  r.t2=leftHalf(m.read(rightHalf(r.t1)));if(r.t2===0o777777n)r.t2=0n;m.write(s.fields.dispfr,r.t2);
  r.t2=rightHalf(m.read(rightHalf(r.t1)));if(r.t2===0o777777n)r.t2=0n;m.write(s.fields.dispto,r.t2);
  r.t2=leftHalf(m.read(rightHalf(r.t1+1n)));m.write(s.fields.ihita,r.t2);
  r.t2=rightHalf(m.read(rightHalf(r.t1+1n)));m.write(s.fields.critdm,r.t2);
  const bytes:readonly [GetHitField,string,2|3,string][]=[['iwhat','4',2,'3'],['critdv','4',2,'7'],['vfrom','7',2,'14'],['hfrom','7',2,'21'],['vto','7',2,'28'],['hto','7',2,'35'],['klflg','2',3,'1'],['shcnfr','1',3,'2'],['shcnto','1',3,'3'],['shstfr','10',3,'13'],['shstto','10',3,'23'],['shjump','1',3,'24']];
  for(const [field,size,offset,end] of bytes){
    yield*io.ldbT2({size,offset,end});
    if((field==='shcnfr'||field==='shcnto')&&(r.t2&1n)===0n)r.t2=-1n;
    m.write(s.fields[field],r.t2);
  }
  r.t2=rightHalf(r.x2);yield*io.addi('t2',s.hitql);r.t2=rightHalf(m.read(rightHalf(r.t2)));m.write(s.dbits,r.t2);
  const link=rightHalf(s.hitql+r.x2);m.write(link,signed36(m.read(link)&~r.x3));
}
