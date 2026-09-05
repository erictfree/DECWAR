import type { WordMemory } from '../compat/memory.ts';
import { rightHalf } from '../compat/word36.ts';
export type HelpCommandRegisters={t0:bigint;t1:bigint;t3:bigint;x1:bigint;x2:bigint;x3:bigint;p1:bigint;p2:bigint};
export type HelpCommandSymbols={who:bigint;condition:bigint;red:bigint;ccflg:bigint;pasflg:bigint;types:bigint;tokens:bigint;star:bigint;redWarning:bigint;unknown:bigint;publicPointer:bigint;allPointer:bigint;extraPointer:bigint};
export type HelpCommandServices<W>={
  outstr(address:bigint):Generator<W,void,void>;
  afterAlertCheck():Generator<W,void,void>; // Resolve the literal JRST .+1 to ESHP; no inferred fallthrough.
  eshp():Generator<W,void,void>;
  pshp():Generator<W,void,void>;
  addiX3():Generator<W,void,void>; // ADDI X3,1, including CPU effects.
  equal():Generator<W,void,void>;
  summary(entry:'hlpxtr'|'hlpall'):Generator<W,void,void>;
  search():Generator<W,boolean,void>; // SLST return skip: true is unique.
  show():Generator<W,void,void>; // SHLP reads current P1.
};
// WARMAC.MAC:5013-5062. No NTOK bound, token-type normalization or implicit
// finally cleanup. HELP's explicit TTYON is unreachable in this source.
export function* helpCommandRuntime<W>(m:WordMemory,r:HelpCommandRegisters,s:HelpCommandSymbols,io:HelpCommandServices<W>):Generator<W,void,void>{
  r.t3=m.read(s.who);
  if(r.t3!==0n){
    r.t1=m.read(s.condition-1n+rightHalf(r.t3));
    if(r.t1===s.red){yield*io.outstr(s.redWarning);return;}
    yield*io.afterAlertCheck();
  }
  yield*io.eshp();r.x3=0n;
  if(m.read(s.types+1n)<0n)yield*io.summary('hlpxtr');
  else for(;;){
    yield*io.addiX3();
    if(m.read(s.types+rightHalf(r.x3))<0n||m.read(s.ccflg)!==0n)break;
    r.p1=rightHalf(s.tokens+rightHalf(r.x3));r.p2=rightHalf(s.star);yield*io.equal();
    if(r.t0<0n){yield*io.summary('hlpall');continue;}
    r.x1=m.read(s.pasflg)<0n?s.allPointer:s.publicPointer;r.x2=0n;
    if(!(yield*io.search())){
      if(r.x1>=0n)continue;
      r.x1=s.extraPointer;r.x2=rightHalf(s.unknown);
      if(!(yield*io.search()))continue;
    }
    r.p1=rightHalf(r.p2);yield*io.show();
  }
  m.write(s.ccflg,0n);yield*io.pshp();
}
