import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindJobStatusRuntime } from './job-status-runtime.ts';
import { passwordStatements } from '../../src/game/password-statements.ts';
import type { PasswordStatementServices } from '../../src/game/password-statements.ts';
import { rawEqual } from '../../src/compat/equal.ts';
import { constants as K } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';

export function bindPasswordRuntime(f:ReturnType<typeof pregameInputRuntimeFixture>,job:ReturnType<typeof bindJobStatusRuntime>){
  f.m.map(21600n,Array<bigint>(100).fill(0n));
  const symbols={header:21600n,kpass:21610n,one:21612n,zero:21613n},events:string[]=diagnosticRecords();
  f.h.put(symbols.kpass,K.KPASS);f.m.write(symbols.one,1n);f.m.write(symbols.zero,0n);
  const numeric=f.weapon.io;
  const io:PasswordStatementServices<string>={logical:numeric.logical,
    *and(...p){return yield*numeric.and(...p);},*compare(...a){return yield*numeric.compare(...a);},*assign(...a){yield*numeric.assign(...a);},
    *equal(token,password,one){events.push(`equal:${password}:${one}`);loadArgumentBlock(f.m,symbols.header,[token,symbols.kpass,symbols.one]);selectArgumentBlock(f.r,symbols.header);yield*rawEqual(f.r,f.rt.args,f.s.point7LeftHalf,f.eq);return f.r.f;},
    *usrprj(zero){events.push(`usrprj:${zero}`);loadArgumentBlock(f.m,symbols.header,[symbols.zero]);selectArgumentBlock(f.r,symbols.header);job.project();return f.r.t0;},
    *out(message,lines){events.push(`out:${message}:${lines}`);yield*f.pregameInput.io.out(message,lines);},
  };
  return {symbols,events,io,run:()=>passwordStatements(f.low,io)};
}
