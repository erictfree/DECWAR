import type { WordMemory } from './memory.ts';
export type KillHighSymbols={dead:bigint;hungup:bigint;device:bigint;name:bigint;ppn:bigint;shr:bigint;success:bigint;warning:bigint};
export type KillHighServices<W>={
  openREN():Generator<W,boolean,void>;lookupREN():Generator<W,boolean,void>;renameREN():Generator<W,boolean,void>;
  setzbT3ZeroAddress():Generator<W,void,void>; // SETZB T3, includes its omitted-EA memory effect.
  ostr():Generator<W,void,void>;outputTTY():Generator<W,void,void>;outstr(address:bigint):Generator<W,void,void>;
};
// WARMAC.MAC:4217-4243 and WARN:59-67. Boolean monitor results denote success
// skips. P.DEV/P.NAM/P.PPN and literal words/addresses are supplied loader state.
export function* killHighRuntime<W>(m:WordMemory,r:{t1:bigint;t2:bigint;t3:bigint;t4:bigint;p1:bigint},s:KillHighSymbols,io:KillHighServices<W>):Generator<W,void,void>{
  if(m.read(s.dead)!==0n)return;
  r.t1=0n;r.t2=m.read(s.device);r.t3=0n;
  if(!(yield*io.openREN())){yield*warning();return;}
  r.t1=m.read(s.name);r.t2=s.shr;yield*io.setzbT3ZeroAddress();r.t4=m.read(s.ppn);
  if(!(yield*io.lookupREN())){yield*warning();return;}
  r.t4=m.read(s.ppn);
  if(!(yield*io.renameREN())){yield*warning();return;}
  r.p1=s.success;yield*io.ostr();m.write(s.dead,-1n);
  if(m.read(s.hungup)===0n)yield*io.outputTTY();
  function* warning(){if(m.read(s.hungup)===0n)yield*io.outputTTY();if(m.read(s.hungup)===0n)yield*io.outstr(s.warning);}
}
