import type { WordMemory } from './memory.ts';
import type { MachineRegisters } from './registers.ts';
import type { FieldStack } from './field-output.ts';
import { rightHalf,signed36 } from './word36.ts';
export type InternalBoardServices<W>=FieldStack<W>&{
  idiviT2(word:bigint):Generator<W,void,void>;
  imuliT1(word:bigint):Generator<W,void,void>;
  addiT2(word:bigint):Generator<W,void,void>;
  addT2(word:bigint):Generator<W,void,void>;
  ildbT3T2():Generator<W,void,void>;
  idpbT3T2():Generator<W,void,void>;
};
// WARMAC.MAC:5439-5471. GPTR uses MOVEI (18-bit H-1) and a pointer
// preceding the selected byte. GDSP/SDSP increment it; no debug/sentinel path.
export function* internalBoardRoutine<W>(entry:'gdsp'|'sdsp'|'gptr',m:WordMemory,
  r:Pick<MachineRegisters,'t1'|'t2'|'t3'>,s:{ksid:bigint;b12tbl:bigint},io:InternalBoardServices<W>):Generator<W,void,void>{
  if(entry==='sdsp')yield*io.pushData(r.t3);
  r.t2=rightHalf(r.t2-1n);yield*io.idiviT2(3n);yield*io.imuliT1(s.ksid);
  yield*io.addiT2(rightHalf(r.t1-s.ksid));
  yield*io.addT2(m.read(rightHalf(s.b12tbl-1n+r.t3)));
  if(entry==='gdsp')yield*io.ildbT3T2();
  if(entry==='sdsp'){r.t3=signed36(yield*io.popData());yield*io.idpbT3T2();}
}
