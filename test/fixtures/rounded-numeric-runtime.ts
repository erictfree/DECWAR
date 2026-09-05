import type { basePhaserRuntimeFixture } from './base-phaser-runtime.ts';
import { createRoundedNumeric } from '../../src/runtime/rounded-numeric.ts';
import { createSessionPower } from '../../src/runtime/power.ts';
import { nearestDecimalFloat36,floatInteger36 } from '../../src/compat/float-arithmetic36.ts';
// Explicit test selection: source-order expressions, nearest decimal literals,
// rounded single CPU operations, wrapped integer add/multiply, checked divide,
// and explicit arithmetic fault transfer.
// This does not choose a production compiler version or monitor exception policy.
export function bindRoundedNumericRuntime(f:Pick<ReturnType<typeof basePhaserRuntimeFixture>,'m'|'r'|'rt'|'weapon'>){
  f.m.map(72000n,Array<bigint>(32).fill(0n));
  const oldInteger=f.weapon.arithmetic.binary;
  const literal=(text:string)=>{const r=nearestDecimalFloat36(text);if(r.trap1)throw new Error('literal exponent fault');return r.word;};
  const expression=(word:bigint)=>({type:'integer' as const,evaluate:function*(){return word;}});
  const numeric=createRoundedNumeric(f.m,{evaluation:'source-order',literal,
    *integer(op,a,b){return yield*oldInteger(op,expression(a),expression(b));},
    *floatingFault(){throw new Error('selected floating fault transfer');},
    *fixOverflow(){throw new Error('selected FIX overflow transfer');},
  });
  const power=createSessionPower(f.m,f.r,f.rt.args,{base:72000n,header:72010n},f.rt.stack,function*(){throw new Error('selected PWR fault transfer');});
  Object.assign(f.weapon.arithmetic,numeric);
  f.weapon.powerBinding.call=function*(base,exponent){const word=yield*base.evaluate();return yield*power.call(base.type==='real'?word:floatInteger36(word),exponent);};
  for(const [name,address] of Object.entries(f.weapon.locals))if(name!=='powfac')f.m.write(address,literal('99'));
  return {numeric,power,literal};
}
