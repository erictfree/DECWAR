import { signed36 } from './word36.ts';
import type { FieldStack } from './field-output.ts';

export type DataStackServices<W>={
  pushS(word:bigint):Generator<W,void,void>; // Actual PUSH S,operand, including CPU writes/overflow.
  popS():Generator<W,bigint,void>; // Actual POP S,operand and CPU failure effects.
  outstrUnderflow():Generator<W,void,void>; // Source ASCIZ literal at WARMAC:95-97; actual assembled bytes/address required.
  haltUnderflow():Generator<W,never,void>; // HALT .+1 and resolved continuation transfer; no inferred return to POP.
};
// WARMAC SAVE/RESTOR:82-103. Compare the full S word before each POP.
// Underflow takes the literal block, not an exception recovery or implicit POP.
export function dataStack<W>(r:{s:bigint},state:{hungup:bigint},initialStackWord:bigint,io:DataStackServices<W>):FieldStack<W>{
  return {
    *pushData(word){yield*io.pushS(word);},
    *popData(){
      if(r.s===signed36(initialStackWord)){
        if(state.hungup===0n)yield*io.outstrUnderflow();
        return yield*io.haltUnderflow();
      }
      return signed36(yield*io.popS());
    },
  };
}
