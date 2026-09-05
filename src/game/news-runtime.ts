import type { WordMemory } from '../compat/memory.ts';
import type { FieldStack } from '../compat/field-output.ts';
import { rightHalf } from '../compat/word36.ts';
export type NewsRegisters={x1:bigint;x2:bigint;x3:bigint;c:bigint;t0:bigint;t1:bigint;p1:bigint;p2:bigint};
export type NewsSymbols={jbren:bigint;ccflg:bigint;hungup:bigint;who:bigint;alive:bigint;active:bigint;nwsfil:bigint;prompt:bigint;yes:bigint;token:bigint;warning:bigint};
export type NewsServices<W>=FieldStack<W>&{
  open():Generator<W,boolean,void>; // OPEN skip success; live X1 descriptor.
  close():Generator<W,void,void>;
  setInput():Generator<W,void,void>;
  ichr():Generator<W,void,void>; // Writes C through current IC.
  ochr():Generator<W,void,void>;
  ttyon():Generator<W,void,void>;
  ostr():Generator<W,void,void>; // Reads P1.
  gtkn():Generator<W,void,void>;
  equal():Generator<W,void,void>; // EQUAL. reads P1/P2, writes T0.
  output():Generator<W,void,void>;
  outstr(address:bigint):Generator<W,void,void>;
};
// WARMAC.MAC:4661-4705, WARN:59-66. No detached page state or saved-register
// snapshots: X1 carries the old descriptor and X3 the preceding EOL flag.
export function* newsRuntime<W>(m:WordMemory,r:NewsRegisters,s:NewsSymbols,io:NewsServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.x1);yield*io.pushData(r.x2);yield*io.pushData(r.x3);
  m.write(s.jbren,rightHalf(m.read(s.jbren)));r.x1=rightHalf(s.nwsfil);
  if(!(yield*io.open())){
    if(m.read(s.hungup)===0n)yield*io.output();
    if(m.read(s.hungup)===0n)yield*io.outstr(s.warning);
  }else{
    yield*io.setInput();r.x3=0n;
    for(;;){
      yield*io.ichr();if(r.c<0n)break;
      if(r.x3!==0n&&r.c===46n){
        yield*io.ttyon();r.p1=rightHalf(s.prompt);yield*io.ostr();
        yield*io.setInput();yield*io.gtkn();yield*io.setInput();
        r.p1=rightHalf(s.token);r.p2=rightHalf(s.yes);yield*io.equal();
        if(r.t0>=0n)break;r.x3=0n;continue;
      }
      yield*io.ochr();
      if(r.c<10n||r.c>12n){r.x3=0n;continue;}
      r.x3=-1n;
      if(m.read(s.ccflg)!==0n||m.read(s.jbren)<0n)break;
      r.t1=m.read(s.who);
      if(r.t1!==0n&&m.read(s.alive-1n+rightHalf(r.t1))<0n)m.write(s.active-1n+rightHalf(r.t1),0n);
    }
    m.write(s.ccflg,0n);m.write(s.jbren,rightHalf(m.read(s.jbren)));
    yield*io.close();yield*io.setInput();
  }
  r.x3=yield*io.popData();r.x2=yield*io.popData();r.x1=yield*io.popData();
}
