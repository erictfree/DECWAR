import type { TokenServices } from '../compat/token-runtime.ts';
import { floatInteger36,unroundedPositiveFloat36,roundedFloat36 } from '../compat/float-arithmetic36.ts';
import type { FloatArithmeticResult } from '../compat/float-arithmetic36.ts';

// WARMAC.MAC:1824-1844, ANUM: FLTR then FDV/FAD, but FMPRI for SCALE.
// The caller installs tenLeftHalf for HRLZI X3,(10.0). This is a native word,
// not decimal parseFloat or the compiler's separately selected literal policy.
export const tokenTenLeftHalf=0o204500n;
export function createTokenFloating<W>(r:{x2:bigint;t1:bigint;t2:bigint},
  onFault:(result:FloatArithmeticResult)=>Generator<W,void,void>):Pick<TokenServices<W>,'fltr'|'fdv'|'fad'|'fmpri'>{
  function* store(register:'x2'|'t1'|'t2',result:FloatArithmeticResult):Generator<W,void,void>{r[register]=result.word;if(result.trap1)yield*onFault(result);}
  return {
    *fltr(register){r[register]=floatInteger36(r[register]);},
    *fdv(){yield*store('t1',unroundedPositiveFloat36('div',r.t1,r.t2));},
    *fad(){yield*store('x2',unroundedPositiveFloat36('add',r.x2,r.t1));},
    *fmpri(){yield*store('t2',roundedFloat36('mul',r.t2,0o204500000000n));},
  };
}
