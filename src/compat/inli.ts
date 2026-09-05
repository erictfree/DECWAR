import { MemoryCommandInput } from './input-memory.ts';
import { characterBits } from '../runtime/variant-values.ts';
import { inputLayout } from '../runtime/variant-values.ts';
import { add36, halfWords, leftHalf, rightHalf, signed36 } from './word36.ts';
import type { EditedLine } from './gtkn.ts';

const flags=characterBits.flags;
export type InliState={hungup:bigint;echflg:bigint;iniflg:bigint;blank:bigint};
// Caller-owned registers: INLI does not initialize F's left half.
export type InliRegisters={f:bigint;c:bigint;t1:bigint};
export type OutputEffect<W>=void|Generator<W,void,void>;
function* outputEffect<W>(effect:OutputEffect<W>):Generator<W,void,void>{if(effect!==undefined)yield*effect;}
export type InliServices<W>={
  ichr():Generator<W,bigint,void>;
  flush():OutputEffect<W>;
  ochr(character:bigint):OutputEffect<W>;
  outstr(text:string):OutputEffect<W>;
  outchr(character:bigint):OutputEffect<W>;
  // Required CPU service; no guessed carry behavior at a halfword boundary.
  aobjp(word:bigint):bigint;
};
const has=(r:InliRegisters,flag:number)=>(r.f&BigInt(flag))!==0n;

// WARMAC NXCH:1927-1939. ICHR is the monitor/file boundary, not a socket read.
export function* nxch<W>(state:InliState,r:InliRegisters,io:InliServices<W>):Generator<W,void,void> {
  for(;;){
    r.c=yield*io.ichr();
    if(r.c<0n||r.c>127n)throw new RangeError('NXCH requires original CBITS/out-of-table machine execution');
    r.f=signed36(halfWords(leftHalf(r.f),BigInt(characterBits.entries[Number(r.c)].value)));
    if(has(r,flags['cf.ign']))continue;
    if(state.echflg!==0n)r.f=signed36(r.f&~BigInt(flags['cf.cr']|flags['cf.ff']));
    return;
  }
}

// WARMAC DISP:1942-1968. Direct monitor output bypasses OCHR bookkeeping.
export function* displayInput<W>(input:MemoryCommandInput,state:InliState,r:InliRegisters,io:InliServices<W>):Generator<W,void,void> {
  if(state.hungup===0n)yield*outputEffect(io.outstr('\r\n'));
  // ECHON (1313) immediately returns, including when ECHFLG is negative.
  r.t1=signed36(halfWords(-input.block.read('chrcnt')-1n,input.lineAddress-1n));
  for(;;){
    r.t1=signed36(io.aobjp(r.t1));
    if(r.t1>=0n)return;
    r.c=rightHalf(input.memory.read(rightHalf(r.t1)));
    if(r.c<7n||(r.c>13n&&r.c<32n)){
      if(state.hungup===0n)yield*outputEffect(io.outchr(94n));
      r.c=add36(r.c,64n);
    }
    if(state.hungup===0n)yield*outputEffect(io.outchr(r.c));
  }
}

// WARMAC INLI:1860-1918, ECHG:1970-1973 and ECHON/ECHOFF:1313/1324.
// The caller supplies live state aliases and machine/monitor services. This
// routine owns every buffer write; its result must not reinstall a string.
export function* inli<W>(input:MemoryCommandInput,state:InliState,r:InliRegisters,io:InliServices<W>):Generator<W,EditedLine,void> {
  if(state.hungup===0n)yield*outputEffect(io.flush());
  input.beginLine();
  yield*nxch(state,r,io);
  if(has(r,flags['cf.rpt']))input.low.write('rptflg',-1n);
  else {
    input.low.write('rptflg',0n);input.block.write('chrcnt',0n);
    for(;;){
      if(!has(r,flags['cf.spe'])){
        r.t1=add36(input.block.read('chrcnt'),1n);input.block.write('chrcnt',r.t1);
        input.memory.write(input.lineAddress-1n+rightHalf(r.t1),r.c);
        if(r.t1>=BigInt(inputLayout.maximum))break;
      }else if(has(r,flags['cf.eol']))break;
      else {
        // ECHG selects ECHON/ECHOFF; both immediately POPJ in this source.
        if(has(r,flags['cf.dsp']))yield*displayInput(input,state,r,io);
        if(has(r,flags['cf.bsc'])){
          const count=add36(input.block.read('chrcnt'),-1n);input.block.write('chrcnt',count);
          if(count<0n)input.block.write('chrcnt',0n);
        }
        if(has(r,flags['cf.bsl'])){
          input.block.write('chrcnt',0n);
          if(state.hungup===0n)yield*outputEffect(io.outstr('\r\n'));
        }
      }
      yield*nxch(state,r,io);
    }
    r.t1=add36(input.block.read('chrcnt'),1n);input.block.write('chrcnt',r.t1);
    input.memory.write(input.lineAddress-1n+rightHalf(r.t1),0n);
  }
  r.c=13n;yield*outputEffect(io.ochr(r.c));
  r.c=10n;
  if(state.iniflg<0n||has(r,flags['cf.ff']))state.blank=add36(state.blank,1n);
  else yield*outputEffect(io.ochr(r.c));
  return {stored:input};
}
