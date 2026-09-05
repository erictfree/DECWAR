import type { WordMemory } from './memory.ts';
import { MIN_INTEGER,MAX_INTEGER,signed36 } from './word36.ts';

// FORTRAN-10 V5, January 1977, pp. 9-6 and C-2. This named policy is
// restricted to non-overflowing INTEGER loop arithmetic. It does not infer
// private counter storage for an illegal jump into an uninitialized loop.
// See docs/platform-manuals.md for the unknown archived compiler version.
export type Fortran5DoFrame={index:bigint;increment:bigint;counter:bigint};
function checked(value:bigint):bigint{
  if(value<MIN_INTEGER||value>MAX_INTEGER)throw new RangeError('FORTRAN V5 DO arithmetic requires overflow policy');
  return value;
}
export function beginFortran5Do(m:WordMemory,index:bigint,start:bigint,limit:bigint,increment=1n):Fortran5DoFrame{
  start=signed36(start);limit=signed36(limit);increment=signed36(increment);
  if(increment===0n)throw new RangeError('FORTRAN V5 DO zero increment requires divide-check policy');
  const count=checked(checked(checked(limit-start)/increment)+1n);
  const frame={index,increment,counter:-(count>1n?count:1n)};
  m.write(index,start);return frame; // Always execute the body at least once.
}
export function continueFortran5Do(m:WordMemory,frame:Fortran5DoFrame):boolean{
  // The live index can be changed by an aliased dummy argument. Its new value
  // is incremented, but the independently saved trip count still controls DO.
  m.write(frame.index,checked(m.read(frame.index)+frame.increment));
  frame.counter++;return frame.counter<0n;
}
