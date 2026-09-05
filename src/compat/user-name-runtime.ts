import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type UserNameRegisters={t0:bigint;t1:bigint;t2:bigint;t3:bigint;c:bigint;p1:bigint;p2:bigint};
export type UserNameSymbols={ptrlst:bigint;linbuf:bigint;cbits:bigint;delimiter:bigint;tmp:bigint;sixbitPointer:bigint;who:bigint;name1Base:bigint;name2Base:bigint;bufptr:bigint};
export type UserNameServices<W>={
  idpb():Generator<W,void,void>; // IDPB C,P2, including pointer/memory effects.
  dmove():Generator<W,void,void>; // DMOVE T1,TMP, including T2 and exceptional effects.
};
// WARMAC.MAC:4063-4102. No SAVE/RESTOR, token-count guards, row bounds or
// host string conversion. Indexed addresses use current AC right halves.
export function* userNameRuntime<W>(m:WordMemory,r:UserNameRegisters,args:SourceArguments,s:UserNameSymbols,io:UserNameServices<W>):Generator<W,void,void>{
  r.t0=0n;r.p1=args.read(0);
  if(r.p1!==0n){
    r.p1=m.read(s.ptrlst-1n+rightHalf(r.p1));
    for(;;){
      r.c=m.read(rightHalf(r.p1));if(r.c===0n){m.write(s.bufptr,-1n);return;}
      r.c=signed36(halfWords(rightHalf(m.read(s.cbits+rightHalf(r.c))),rightHalf(r.c)));
      if((leftHalf(r.c)&s.delimiter)!==0n)break;
      r.p1=add36(r.p1,1n);
    }
    r.p1=add36(r.p1,1n); // Exactly one delimiter; AOJA skips the LINBUF reset.
  }else r.p1=rightHalf(s.linbuf);
  r.p2=s.sixbitPointer;m.write(s.tmp,0n);m.write(s.tmp+1n,0n);r.t1=12n;
  for(;;){
    r.c=m.read(rightHalf(r.p1));if(r.c===0n)break;
    if(r.c>0o137n)r.c&=~0o40n;
    r.c=add36(r.c,-0o40n);if(r.c<0n)r.c=add36(r.c,0o100n);
    yield*io.idpb();r.p1=add36(r.p1,1n);r.t1=add36(r.t1,-1n);if(r.t1<=0n)break;
  }
  yield*io.dmove();
  if(r.t1!==0n||r.t2!==0n){
    r.t0=-1n;r.t3=m.read(s.who);
    m.write(s.name1Base+rightHalf(r.t3),r.t1);m.write(s.name2Base+rightHalf(r.t3),r.t2);
  }
  m.write(s.bufptr,-1n);
}
