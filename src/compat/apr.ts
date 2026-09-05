import type { FileBlock } from './files.ts';
import type { LockBlock } from './unlock.ts';
import { halfWords,rightHalf,signed36 } from './word36.ts';

export type AprSymbols={
  emergencyPushdownInitial:bigint; // [IOWD PDLSIZ,STABUF+decimal 128]
  dataStackInitial:bigint; // [IOWD STKSIZ,STK]
  normalPushdownInitial:bigint; // [IOWD PDLSIZ,PDL]
  fallbackArgument:bigint; // Address of [[5]], not a message index or IRAN call.
};
export type AprServices<W>={
  blt(ac:bigint,lastAddress:bigint):Generator<W,void,void>;
  gripe():Generator<W,void,void>;
  jump(address:bigint):Generator<W,never,void>; // JRST 0(T1), machine transfer.
  outstrIndirect(address:bigint):Generator<W,void,void>; // OUTSTR @0(1), full CPU indirection.
  monit():Generator<W,never,void>;
};

// WARMAC APRSET:6179-6182. Resolve the caller's argument rather than interpreting
// its FORTRAN label as a machine address. AC0 and FTLERR both receive the address.
export function setAprTrap(locks:LockBlock,resolveArgumentAddress:()=>bigint):void{
  locks.memory.write(0n,rightHalf(resolveArgumentAddress()));
  locks.write('ftlerr',locks.memory.read(0n));
}

// WARMAC APRTRP:6106-6126. CPU ACs live at addresses 0..octal 17 in the
// supplied machine memory. An ordinary JS exception does not enter this handler.
export function* interceptApr<W>(file:FileBlock,locks:LockBlock,state:{addrck:bigint},job:{jbtpc:bigint},
  symbols:AprSymbols,io:AprServices<W>):Generator<W,never,void>{
  const memory=file.memory;
  state.addrck=-1n;
  file.write('stabuf',memory.read(0n),2);
  memory.write(0n,signed36(halfWords(1n,file.address('stabuf',3))));
  yield*io.blt(0n,file.address('stabuf',0o21));
  memory.write(1n,rightHalf(job.jbtpc));
  file.write('stabuf',rightHalf(memory.read(1n)),0); // HRRZM clears the left half.
  memory.write(1n,memory.read(rightHalf(memory.read(1n))));
  file.write('stabuf',memory.read(1n),1);
  memory.write(1n,locks.read('locked'));
  file.write('stabuf',signed36(halfWords(memory.read(1n),rightHalf(file.read('stabuf',0)))),0);
  memory.write(0o17n,signed36(symbols.emergencyPushdownInitial));
  memory.write(0o15n,signed36(symbols.dataStackInitial));
  yield*io.gripe();
  memory.write(0o17n,signed36(symbols.normalPushdownInitial));
  memory.write(1n,locks.read('ftlerr'));
  if(memory.read(1n)!==0n)return yield*io.jump(rightHalf(memory.read(1n)));
  memory.write(0o16n,rightHalf(symbols.fallbackArgument));
  memory.write(1n,memory.read(0n));
  yield*io.outstrIndirect(rightHalf(memory.read(1n)));
  return yield*io.monit();
}
