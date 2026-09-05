import type { WordMemory } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices,WeaponValueType } from '../game/weapon-damage-statements.ts';
import { roundedFloat36,floatInteger36,fixFloat36 } from '../compat/float-arithmetic36.ts';
import type { FloatArithmeticResult } from '../compat/float-arithmetic36.ts';
import { normalizedFloatDyadic } from '../compat/ran-float36.ts';
import { signed36 } from '../compat/word36.ts';

export type RoundedNumericServices<W>=Pick<WeaponStatementServices<W>,'realLiteral'|'binary'|'convert'|'compare'|'assign'>;
export type RoundedNumericPolicy<W>={
  evaluation:'source-order';
  literal:(text:string)=>bigint;
  integer:(op:'add'|'sub'|'mul'|'div'|'max',left:bigint,right:bigint)=>Generator<W,bigint,void>;
  floatingFault:(result:FloatArithmeticResult)=>Generator<W,bigint,void>;
  fixOverflow:(operand:bigint)=>Generator<W,bigint,void>;
};
// Explicit source-order, rounded-single compiler policy. This is a usable
// composition, not a claim about the unknown compiler's instruction selection
// or reassociation. Literal encoding and exceptional continuation stay required.
export function createRoundedNumeric<W>(m:WordMemory,policy:RoundedNumericPolicy<W>):RoundedNumericServices<W>{
  function* arithmetic(op:'add'|'sub'|'mul'|'div',a:bigint,b:bigint):Generator<W,bigint,void>{
    const result=roundedFloat36(op,a,b);return result.trap1?yield*policy.floatingFault(result):result.word;
  }
  const real=(word:bigint,type:WeaponValueType)=>type==='real'?word:floatInteger36(word);
  function* convert(word:bigint,from:WeaponValueType,to:WeaponValueType):Generator<W,bigint,void>{
    if(from===to)return word;if(to==='real')return floatInteger36(word);
    // A compiler temporary's previous accumulator value is not known here.
    // Never invent it on FIX overflow; require the caller's explicit policy.
    const result=fixFloat36(word,0n);return result.trap1?yield*policy.fixOverflow(word):result.word;
  }
  function* pair(l:WeaponExpression<W>,r:WeaponExpression<W>):Generator<W,[bigint,bigint],void>{return [yield*l.evaluate(),yield*r.evaluate()];}
  return {
    realLiteral:policy.literal,
    *binary(op,l,r){const [a,b]=yield*pair(l,r);
      if(l.type==='integer'&&r.type==='integer')return yield*policy.integer(op,a,b);
      const x=real(a,l.type),y=real(b,r.type);
      if(op==='max'){normalizedFloatDyadic(x);normalizedFloatDyadic(y);return signed36(x)>=signed36(y)?x:y;}
      return yield*arithmetic(op,x,y);
    },
    *convert(type,_reason,value){return yield*convert(yield*value.evaluate(),value.type,type);},
    *compare(op,l,r){let [a,b]=yield*pair(l,r);if(l.type==='real'||r.type==='real'){a=real(a,l.type);b=real(b,r.type);normalizedFloatDyadic(a);normalizedFloatDyadic(b);}
      a=signed36(a);b=signed36(b);return ({lt:a<b,le:a<=b,eq:a===b,ne:a!==b,ge:a>=b,gt:a>b})[op];
    },
    *assign(destination,type,value){const word=yield*convert(yield*value.evaluate(),value.type,type);m.write(destination(),word);},
  };
}
