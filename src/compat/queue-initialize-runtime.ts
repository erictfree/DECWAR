import type { WordMemory } from './memory.ts';
import { rightHalf } from './word36.ts';
export type QueueInitializeSymbols={hitql:bigint;msgql:bigint;knhit:bigint;knmsg:bigint;hitLiteral:bigint;messageLiteral:bigint};
// WARMAC.MAC:3036-3051. These entries reset links only. The first link is
// written before loading the BLT literal; serial, payload and player flags remain.
export function* queueInitializeRuntime<W>(entry:'setqh'|'setqm',m:WordMemory,r:{t1:bigint},s:QueueInitializeSymbols,io:{blt(last:bigint):Generator<W,void,void>}):Generator<W,void,void>{
  const hit=entry==='setqh',links=hit?s.hitql:s.msgql;
  m.write(rightHalf(links-1n),-1n);m.write(links,0n);
  r.t1=m.read(hit?s.hitLiteral:s.messageLiteral);
  yield*io.blt(rightHalf(links+(hit?s.knhit:s.knmsg)-1n));
}
