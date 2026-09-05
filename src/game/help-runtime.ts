import type { WordMemory } from '../compat/memory.ts';
import type { FieldStack } from '../compat/field-output.ts';
import { add36,halfWords,rightHalf,signed36 } from '../compat/word36.ts';
export type HelpFileRegisters={x1:bigint;x2:bigint;x3:bigint;p1:bigint;p2:bigint;t1:bigint;c:bigint};
export type HelpFileSymbols={jbren:bigint;ccflg:bigint;hungup:bigint;pasflg:bigint;who:bigint;alive:bigint;active:bigint;hl1fil:bigint;hl2fil:bigint;warning:bigint;missing:bigint;point7LeftHalf:bigint};
export type HelpFileServices<W>=FieldStack<W>&{
  open():Generator<W,boolean,void>;
  close():Generator<W,void,void>;
  setInput():Generator<W,void,void>;
  ichr():Generator<W,void,void>; // Writes live C.
  ochr():Generator<W,void,void>;
  ocrl():Generator<W,void,void>;
  ostr():Generator<W,void,void>;
  ostb():Generator<W,void,void>;
  ildbKeyword():Generator<W,void,void>; // ILDB T1,P2: updates both registers.
  output():Generator<W,void,void>;
  outstr(address:bigint):Generator<W,void,void>;
};
// WARMAC.MAC:5109-5185. P1 is the actual keyword address. X2 carries section
// state (-1 search, 0 skip heading, >0 display); lookahead consumes live C.
export function* helpFileRuntime<W>(m:WordMemory,r:HelpFileRegisters,s:HelpFileSymbols,io:HelpFileServices<W>):Generator<W,void,void>{
  yield*io.pushData(r.x2);yield*io.pushData(r.x3);yield*io.pushData(r.p1);yield*io.pushData(r.p2);
  m.write(s.jbren,rightHalf(m.read(s.jbren)));m.write(s.ccflg,0n);yield*io.ocrl();
  let opened=false;
  if(m.read(s.pasflg)<0n){r.x1=rightHalf(s.hl1fil);opened=yield*io.open();}
  if(!opened){r.x1=rightHalf(s.hl2fil);opened=yield*io.open();}
  if(!opened){
    if(m.read(s.hungup)===0n)yield*io.output();
    if(m.read(s.hungup)===0n)yield*io.outstr(s.warning);
  }else{
    yield*io.setInput();r.p1=signed36(halfWords(s.point7LeftHalf,rightHalf(r.p1)));r.x2=-1n;
    let read=true;
    for(;;){
      if(read)yield*io.ichr();read=true;
      if(r.c<0n){
        if(r.x2<=0n){r.p2=rightHalf(r.p1);r.p1=rightHalf(s.missing);yield*io.ostr();r.p1=rightHalf(r.p2);yield*io.ostb();yield*io.ocrl();}
        break;
      }
      if(r.c!==12n){if(r.x2>0n)yield*io.ochr();if(r.c!==10n)continue;}
      if(m.read(s.ccflg)!==0n||m.read(s.jbren)<0n)break;
      r.t1=m.read(s.who);
      if(r.t1!==0n&&m.read(s.alive-1n+rightHalf(r.t1))<0n)m.write(s.active-1n+rightHalf(r.t1),0n);
      if(r.x2===0n){r.x2=add36(r.x2,1n);continue;}
      // ICHR changes C; TypeScript does not invalidate its earlier narrowing.
      yield*io.ichr();if((r.c as bigint)!==46n){read=false;continue;}
      if(r.x2>0n)break;
      r.p2=r.p1;r.x3=5n;
      for(;;){
        yield*io.ichr();if(r.c>0o137n)r.c&=~0o40n;
        yield*io.ildbKeyword();
        if(r.t1===32n||r.t1===0n){r.x2=0n;break;}
        if(r.t1>0o137n)r.t1&=~0o40n;
        if(r.c!==rightHalf(r.t1))break;
        r.x3=add36(r.x3,-1n);if(r.x3>0n)continue;
        r.x2=0n;break;
      }
    }
    yield*io.close();yield*io.setInput();
  }
  r.p2=yield*io.popData();r.p1=yield*io.popData();r.x3=yield*io.popData();r.x2=yield*io.popData();
  m.write(s.jbren,rightHalf(m.read(s.jbren)));m.write(s.ccflg,0n);
}
