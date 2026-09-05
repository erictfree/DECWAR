import type { WordMemory } from './memory.ts';
import type { SourceArguments } from './fortran-call.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';
export type JobStatusRegisters={t0:bigint;t1:bigint;t2:bigint;t3:bigint};
export type JobStatusSymbols={who:bigint;hungup:bigint;ccflg:bigint;debflg:bigint;frebie:bigint;jsqwho:bigint;jsqtab:bigint;usppn:bigint;uscbh:bigint;hand:bigint;tmp:bigint;trmopLiteral:bigint;speedTable:bigint;namePrompt:bigint;asciiPointer:bigint;sixbitPointer:bigint;sixbitEnd:bigint};
export type JobStatusServices<W>={
  output():Generator<W,void,void>;
  pjob(register:'t1'|'t2'):Generator<W,void,void>;
  trmop():Generator<W,boolean,void>;
  getppn():Generator<W,boolean,void>; // Updates T1; true skips the following instruction.
  getlin():Generator<W,void,void>;
  afterSequenceStore():Generator<W,void,void>; // Resolve literal JRST .+1.
  ldbProject():Generator<W,void,void>; // LDB T3,[POINT 9,T1,8].
  ldbHandle():Generator<W,void,void>; // LDB T2,[POINT 7,USCBH.,7], not 6.
  outstr(address:bigint):Generator<W,void,void>;
  inchwl():Generator<W,void,void>; // INCHWL T2; this is not ICHR.T.
  idpbName():Generator<W,void,void>; // IDPB T2,T1.
  ildbName():Generator<W,void,void>; // ILDB T3,T1.
  idpbSixbit():Generator<W,void,void>; // IDPB T3,T2.
};
// WARMAC.MAC:3709-3867. Monitor and byte instructions remain explicit. The
// source is in RADIX 8: code >13 octal is replaced with 11 octal before lookup.
export function* jobStatusRuntime<W>(m:WordMemory,r:JobStatusRegisters,args:SourceArguments,s:JobStatusSymbols,io:JobStatusServices<W>):Generator<W,void,void>{
  yield*io.output();yield*io.pjob('t1');m.write(args.address(0),r.t1);
  r.t1=m.read(s.trmopLiteral);if(!(yield*io.trmop()))r.t1=7n;
  if(r.t1>0o13n)r.t1=0o11n;r.t1=m.read(s.speedTable+rightHalf(r.t1));m.write(args.address(5),r.t1);
  r.t1=m.read(s.who);
  if(r.t1!==0n){yield*io.pjob('t2');m.write(s.jsqwho,r.t1);m.write(s.jsqtab-1n+rightHalf(r.t1),r.t2);yield*io.afterSequenceStore();}
  r.t2=0n;yield*io.getppn();if(r.t1===signed36(halfWords(0o337n,0o2030n)))r.t2=-1n;
  yield*io.ldbProject();if(r.t3===0o77n)r.t2=1n;m.write(s.debflg,r.t2);
  if(!(yield*io.getppn()))m.write(s.usppn,r.t1);m.write(args.address(3),r.t1);m.write(s.frebie,0n);
  r.t1=leftHalf(r.t1);if(r.t1<0o70010n)m.write(s.frebie,-1n);
  r.t1^=0o77000n;if((r.t1&0o77000n)===0n)m.write(s.frebie,-1n);r.t1&=7n;if(r.t1===3n)m.write(s.frebie,-1n);
  yield*io.getlin();m.write(args.address(4),r.t1);
  r.t1=s.asciiPointer;yield*io.ldbHandle();let prompt=r.t2===0n;
  for(;;){
    if(prompt){
      if(m.read(s.hungup)===0n)m.write(s.uscbh,0n);
      m.write(s.uscbh+1n,0n);m.write(s.hand,0n);m.write(s.hand+1n,0n);m.write(args.address(1),0n);m.write(args.address(2),0n);
      yield*io.outstr(s.namePrompt);m.write(s.ccflg,0n);
      for(;;){
        yield*io.inchwl();if(r.t2===3n||m.read(s.ccflg)!==0n)return;
        if(r.t2===0n||r.t2===13n)continue;
        if(r.t2===10n||r.t2===27n||r.t2===7n)break;
        yield*io.idpbName();
      }
      r.t2=0n;yield*io.idpbName();r.t1=s.asciiPointer;
    }
    r.t2=s.sixbitPointer;m.write(s.tmp,0n);m.write(s.tmp+1n,0n);
    for(;;){
      yield*io.ildbName();if(r.t3===0n)break;
      if(r.t3<97n||r.t3>122n)r.t3^=0o40n;
      yield*io.idpbSixbit();if(r.t2===s.sixbitEnd)break;
    }
    r.t1=m.read(s.hand);
    if(r.t1===0n){prompt=true;continue;} // Deliberately retains T1=0 before the retry.
    m.write(args.address(1),r.t1);r.t1=m.read(s.hand+1n);m.write(args.address(2),r.t1);return;
  }
}
// USRPRJ, WARMAC.MAC:3662-3665, uses the saved second GETPPN result.
export function userProject(m:WordMemory,r:{t0:bigint},usppn:bigint):void{r.t0=leftHalf(m.read(usppn));if(r.t0===0o337n)r.t0=0o70000n;}
