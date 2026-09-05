import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
export type ListEntry='list'|'summar'|'bases'|'planet'|'target';
export type ListDriverServices<W>={
  clear(from:bigint,last:bigint):Generator<W,void,void>; // BLKSET(from,0,LOCF(last)-LOCF(from)+1).
  crlf():Generator<W,void,void>;scan():Generator<W,boolean,void>;flags():Generator<W,boolean,void>;output():Generator<W,void,void>;
};
// LIST.FOR:31-63. Alternate LSTFLG return skips N increment and tries the
// next group; alternate LSTSCN return leaves the whole command.
export function* listDriverStatements<W>(entry:ListEntry,high:CommonBlock,low:CommonBlock,list:WordBlock,n:bigint,io:ListDriverServices<W>):Generator<W,void,void>{
  const m=low.memory;list.write('cmd',BigInt(({list:K.LSTCMD,summar:K.SUMCMD,bases:K.BASCMD,planet:K.PLNCMD,target:K.TARCMD})[entry]));
  yield*io.clear(list.address('lstfz'),list.address('lstlz'));list.write('svpos',high.read('shpcon',low.read('who'),K.KVPOS));list.write('shpos',high.read('shpcon',low.read('who'),K.KHPOS));yield*io.crlf();list.write('p',1n);m.write(n,0n);
  for(;;){if(list.read('p')>BigInt(K.KMAXTK))return;if(low.read('typlst',list.read('p'))===BigInt(K.KEOL)){if(m.read(n)!==0n)yield*io.output();return;}
    if(yield*io.scan())return;if(yield*io.flags())continue;m.write(n,add36(m.read(n),1n));
  }
}
