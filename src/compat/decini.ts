import type { MemoryCommandInput } from './input-memory.ts';
import { fileDescriptors } from '../runtime/variant-values.ts';
import { rightHalf } from './word36.ts';

export type DeciniRegisters={x1:bigint;p1:bigint;t1:bigint};
export type DeciniState={hungup:bigint;iniflg:bigint};
export type DeciniServices<W>={
  outstr(text:string):Generator<W,void,void>;
  inchwl():Generator<W,bigint,void>;
  clearInput():Generator<W,void,void>;
  hibernate(operand:bigint):Generator<W,void,void>; // raw HIBER T1, not inferred host time.
  files:{inibeg:bigint;iniint:bigint;iniexp:bigint};
  open():Generator<W,boolean,void>;
  ttyon():Generator<W,void,void>;
  ocrl():Generator<W,void,void>;
  seti():Generator<W,void,void>;
};
// WARMAC DECINI:1239-1277. No selected source caller was found; this entry
// must not replace DECWAR.FOR:30-67's independent experience-selection flow.
export function* decini<W>(input:MemoryCommandInput,state:DeciniState,r:DeciniRegisters,io:DeciniServices<W>):Generator<W,void,void>{
  const x1=r.x1,p1=r.p1;
  for(;;){
    if(state.hungup===0n)yield*io.outstr(fileDescriptors.prompt.text);
    if(state.hungup!==0n)r.p1=51n;
    else r.p1=yield*io.inchwl();
    if(state.hungup===0n)yield*io.clearInput();
    r.t1=0o10n;yield*io.hibernate(r.t1);
    if(r.p1>=49n&&r.p1<=51n)break;
  }
  input.beginLine();
  r.x1=rightHalf(io.files.iniexp);
  if(r.p1!==51n){r.x1=rightHalf(io.files.iniint);if(r.p1!==50n)r.x1=rightHalf(io.files.inibeg);}
  if(yield*io.open()){
    yield*io.ttyon();yield*io.ocrl();yield*io.seti();state.iniflg=-1n;
  }
  r.p1=p1;r.x1=x1;
}
