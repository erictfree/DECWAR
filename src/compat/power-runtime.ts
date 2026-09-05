import type { MachineRegisters } from './registers.ts';
import type { SourceArguments } from './fortran-call.ts';
import type { FieldStack } from './field-output.ts';
import { halfWords,rightHalf,signed36 } from './word36.ts';

export type RawPowerServices<W>=FieldStack<W>&{
  idiviX3(divisor:bigint):Generator<W,void,void>;
  fmpr(destination:'t1'|'x1',source:'x1'|'x2'):Generator<W,void,void>;
};
export type PowerRegisters=Pick<MachineRegisters,'t0'|'t1'|'x1'|'x2'|'x3'|'x4'>;
// WARMAC.MAC:2762-2794. oneImmediate is the resolved 18-bit operand of
// HRLZI T1,(1.0), not a host floating value. FMPR/IDIVI and SAVE/RESTOR are
// required machine services; the body does not supply rounding or call frames.
export function* powerRoutine<W>(entry:'pwr'|'pwr.',r:PowerRegisters,args:SourceArguments,
  s:{oneImmediate:bigint},io:RawPowerServices<W>):Generator<W,void,void>{
  if(entry==='pwr'){
    for(const k of ['x1','x2','x3'] as const)yield*io.pushData(r[k]);
    r.x2=args.read(0);r.x3=args.read(1);yield*internal();r.t0=r.x1;
    for(const k of ['x3','x2','x1'] as const)r[k]=signed36(yield*io.popData());
  }else yield*internal();
  function* internal():Generator<W,void,void>{
    yield*io.pushData(r.x3);yield*io.pushData(r.x4);
    if(r.x3<5n){
      r.t1=signed36(halfWords(rightHalf(s.oneImmediate),0n));
      if(r.x3>=1n)r.t1=r.x2;
      if(r.x3>=2n)yield*io.fmpr('t1','x2');
      if(r.x3>=3n)yield*io.fmpr('t1','x2');
      if(r.x3>=4n)yield*io.fmpr('t1','x2');
      r.x1=r.t1;
    }else{
      yield*io.idiviX3(2n);yield*internal();yield*io.fmpr('x1','x1');
      if(r.x4!==0n)yield*io.fmpr('x1','x2');
    }
    r.x4=signed36(yield*io.popData());r.x3=signed36(yield*io.popData());
  }
}
