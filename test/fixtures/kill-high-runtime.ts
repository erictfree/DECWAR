import { currentVariant } from '../../src/runtime/variant-execution.ts';
import assert from 'node:assert/strict';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { killHighRuntime } from '../../src/compat/kill-high-runtime.ts';
import type { KillHighServices } from '../../src/compat/kill-high-runtime.ts';
import { packSixbit,signed36 } from '../../src/compat/word36.ts';
export function bindKillHighRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(47400n,Array<bigint>(400).fill(77n));
  const s={dead:f.high.address('dead'),hungup:f.low.address('hungup'),device:47400n,name:47401n,ppn:47402n,shr:signed36(packSixbit('SHR')),success:47500n,warning:47540n};
  f.h.put(s.success,'[DECWAR high segment removed from swapper]'+currentVariant().definition.ascilSuffix);f.h.put(s.warning,"%Can't remove DECWAR high segment from swapper"+currentVariant().definition.ascilSuffix);
  const policy:{open?:boolean;lookup?:boolean;rename?:boolean}={},events:string[]=[];
  const io:KillHighServices<string>={
    *openREN(){events.push('open');assert.notEqual(policy.open,undefined,'KILHGH OPEN monitor result required');return policy.open!;},
    *lookupREN(){events.push('lookup');assert.notEqual(policy.lookup,undefined,'KILHGH LOOKUP monitor result required');return policy.lookup!;},
    *renameREN(){events.push('rename');assert.notEqual(policy.rename,undefined,'KILHGH RENAME monitor result required');return policy.rename!;},
    *setzbT3ZeroAddress(){f.r.t3=0n;f.m.write(0n,0n);}, // Explicit ordinary zero effective address, with mapped AC0.
    *ostr(){events.push('ostr');yield*f.rt.run('ostr.');},
    *outputTTY(){events.push('flush');yield*f.ini.controlIO.output();},*outstr(a){events.push('warning');yield*f.editor.io.outstr(a);},
  };
  const run=()=>killHighRuntime(f.m,f.r,s,io);f.endgame.io.kilhgh=run;
  return {s,policy,events,io,run};
}
