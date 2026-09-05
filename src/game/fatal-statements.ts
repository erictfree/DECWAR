import { currentVariant } from '../runtime/variant-execution.ts';
import type { CommonBlock } from '../compat/memory.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
import { constants as K,decwarText } from '../runtime/variant-values.ts';
import type { DecwarLiteral } from './entry.ts';

export type DecwarExitLocals=Record<'i'|'txppn'|'txnm1'|'txnm2'|'txsh1'|'txsh2'|'txtim'|'txwhy'|'txtem'|'txtot',bigint>;
export type DecwarExitServices<W>=Pick<WeaponStatementServices<W>,'assign'|'binary'|'logical'>&{
  crlf():Generator<W,void,void>;
  iran(n:5):Generator<W,bigint,void>;
  out(item:DecwarLiteral):Generator<W,void,void>;
  cctrap():Generator<W,void,void>;
  etim(start:()=>bigint):Generator<W,bigint,void>;
  points(final:true):Generator<W,void,void>;
  updsta(addresses:readonly bigint[]):Generator<W,void,void>;
  free(who:bigint):Generator<W,void,void>;
  exit():Generator<W,void,void>;
};

// DECWAR.FOR:291-353. Entry 9999 prints the FORTRAN messages, then joins
// 3810/3800. Entry 3800 also serves ordinary quitting. Compiler assignment,
// logical interpretation, argument emission and monitor transfers are services.
export function* decwarExitStatements<W>(entry:'fatal'|'leave',high:CommonBlock,low:CommonBlock,
  l:DecwarExitLocals,total:bigint,io:DecwarExitServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}}),integer=(n:number)=>v(()=>BigInt(n));
  const write=(a:()=>bigint,e:WeaponExpression<W>)=>io.assign(a,'integer',e);
  if(entry==='fatal'){
    yield*io.crlf();yield*io.crlf();yield*write(()=>l.i,{type:'integer',evaluate:()=>io.iran(5)});
    const i=m.read(l.i),index=i>=1n&&i<=5n?Number(i)-1:0; // Computed GOTO fallthrough to 5001.
    for(const item of decwarText.fatal[index])yield*io.out(item);
  }
  yield*io.cctrap();
  for(const [key,col] of [['txppn',K.KPPN],['txnm1',K.KNAM1],['txnm2',K.KNAM2]] as const)
    yield*write(()=>l[key],v(()=>high.read('job',low.read('who'),col)));
  yield*write(()=>l.txsh1,v(()=>high.read('names',low.read('who'),1)));
  yield*write(()=>l.txsh2,v(()=>high.read('names',low.read('who'),2)));
  yield*write(()=>l.txtim,{type:'integer',evaluate:()=>io.etim(()=>high.address('job',low.read('who'),K.KJOBTM))});
  yield*write(()=>l.txwhy,integer(-1));if(io.logical(low.read('addrck')))yield*write(()=>l.txwhy,integer(0));
  yield*write(()=>l.txtem,{type:'integer',evaluate:()=>io.binary('sub',v(()=>low.read('team')),integer(1))});
  yield*io.points(true);yield*write(()=>l.txtot,v(()=>m.read(total)));
  if(currentVariant().definition.id!=='austin')yield*io.updsta([l.txppn,l.txnm1,l.txnm2,l.txsh1,l.txsh2,l.txtot,l.txtim,l.txwhy,l.txtem,low.address('who')]);
  yield*io.free(low.address('who'));yield*write(()=>low.address('who'),integer(0));yield*io.exit();
}
