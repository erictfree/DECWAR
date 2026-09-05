import type { WordMemory } from '../compat/memory.ts';
import type { SourceArguments } from '../compat/fortran-call.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../compat/fortran-call.ts';
import { powerRoutine } from '../compat/power-runtime.ts';
import type { PowerRegisters,RawPowerServices } from '../compat/power-runtime.ts';
import { multiplyRoundedFloat36 } from '../compat/float-multiply36.ts';
import type { FloatMultiplyResult } from '../compat/float-multiply36.ts';
import { divide36 } from '../compat/word36.ts';
import type { FieldStack } from '../compat/field-output.ts';

// Public WARMAC PWR with real floating words, preserving its small-power and
// recursive FMPR sequence. Scratch/stack belong to the calling session.
// onArithmeticFault runs AFTER the FMPR destination is stored; it must apply
// the selected monitor policy (resume or transfer). No default suppresses it.
export function createSessionPower<W>(m:WordMemory,r:PowerRegisters&{arg:bigint},args:SourceArguments,
  s:{base:bigint;header:bigint},stack:FieldStack<W>,
  onArithmeticFault:(result:FloatMultiplyResult)=>Generator<W,void,void>){
  const cpu:RawPowerServices<W>={...stack,
    *idiviX3(divisor){
      // This entry is reached only for exponent >=5 with literal divisor 2.
      // Both quotient and remainder fit; no integer trap policy is needed here.
      const result=divide36(r.x3,divisor);r.x3=result.quotient;r.x4=result.remainder;
    },
    *fmpr(destination,source){const result=multiplyRoundedFloat36(r[destination],r[source]);r[destination]=result.word;if(result.trap1)yield*onArithmeticFault(result);},
  };
  return {
    *call(base:bigint,exponentAddress:bigint):Generator<W,bigint,void>{
      m.write(s.base,base);loadArgumentBlock(m,s.header,[s.base,exponentAddress]);selectArgumentBlock(r,s.header);
      // HRLZI T1,(1.0): high half of octal 201400000000, not integer 1.
      yield*powerRoutine('pwr',r,args,{oneImmediate:0o201400n},cpu);return r.t0;
    },
  };
}
