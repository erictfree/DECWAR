import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type GetMessageRegisters={t1:bigint;t2:bigint;x1:bigint;x2:bigint;x3:bigint;x4:bigint};
export type GetMessageSymbols={msgflg:bigint;bits:bigint;msgql:bigint;msgq:bigint;msglen:bigint;dispfr:bigint;dbits:bigint};
export type GetMessageServices<W>={
  sosl(address:bigint):Generator<W,boolean,void>;
  search():Generator<W,boolean,void>; // Actual SRCH. skip return, with live registers.
  imuliT1(word:bigint):Generator<W,void,void>;
  addiT1(word:bigint):Generator<W,void,void>;
  blt(last:bigint):Generator<W,void,void>;
  remove():Generator<W,void,void>;
};
// WARMAC.MAC:3621-3652. Miss reloads the current argument before clearing
// its count. Copy destination is captured in X4 before the separate search lock.
export function* getMessageRuntime<W>(m:WordMemory,r:GetMessageRegisters,args:SourceArguments,s:GetMessageSymbols,io:GetMessageServices<W>):Generator<W,void,void>{
  function miss(){r.t1=args.read(0);m.write(rightHalf(s.msgflg-1n+r.t1),0n);m.write(s.dispfr,0n);m.write(s.dbits,0n);}
  r.t1=args.read(0);if(yield*io.sosl(rightHalf(s.msgflg-1n+r.t1))){miss();return;}
  r.x4=args.address(1);r.x1=rightHalf(s.msgql);r.x3=m.read(rightHalf(s.bits-1n+r.t1));
  if(!(yield*io.search())){miss();return;}
  r.t1=rightHalf(r.x2);yield*io.imuliT1(s.msglen);yield*io.addiT1(s.msgq);
  r.t2=leftHalf(m.read(rightHalf(r.t1)));if(r.t2===0o777777n)r.t2=0n;m.write(s.dispfr,r.t2);
  r.t2=rightHalf(m.read(rightHalf(r.t1)));if(r.t2===0o777777n)m.write(2n,0n);m.write(s.dbits,r.t2); // Source SETZM T2 addresses AC2.
  r.t1=signed36(halfWords(rightHalf(r.t1+1n),0n));yield*io.addiT1(rightHalf(r.x4));
  yield*io.blt(rightHalf(s.msglen-2n+r.x4));yield*io.remove();
}
