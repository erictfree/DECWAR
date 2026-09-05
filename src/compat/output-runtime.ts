import type { WordBlock } from './memory.ts';
import type { FileBlock } from './files.ts';
import type { MachineRegisters } from './registers.ts';
import { dataStack } from './data-stack.ts';
import type { DataStackServices } from './data-stack.ts';
import { sourceArguments } from './fortran-call.ts';
import { fortranText } from './fortran-text.ts';
import type { FortranTextEntry } from './fortran-text.ts';
import { outputPointer,outputString,outputSpaces,outputTab,outputSpace,outputCrLf,skipLines } from './text-output.ts';
import { outputTextField,outputSixbit,outputNumber,outputRadix } from './field-output.ts';
import { outputDecimalArgument,outputTenthsArgument,outputTwoDigits } from './numeric-wrappers.ts';
import type { NumericTargets } from './numeric-wrappers.ts';
import { outputTime,outputTimePair } from './time-output.ts';
import { outputObject,outputDevice,outputCondition } from './table-output.ts';
import type { ConditionSymbols } from './table-output.ts';
import { outputStatus,outputStatusArgument,outputStatusHeader,outputTemporary } from './status-output.ts';
import type { HeaderState,HeaderSymbols,StatusSymbols } from './status-output.ts';
import { setOutput } from './ochr.ts';
import type { CharacterOutputState,OutputMachineConstants } from './ochr.ts';
import { dispatchCharacter,rawOchrBuffered,rawOchrTerminal,rawOchrDeposit } from './raw-ochr.ts';
import { rawGripeCharacter } from './ogch.ts';
import type { GripeOutputJob,GripeBufferSymbols } from './ogch.ts';

export type OutputEntry=FortranTextEntry|'odec'|'osdec'|'oflt'|'osflt'|'otim'|'odisp'|'odev'|'ocond'|'stat'|
  'ostr.'|'ostr.x'|'ostbx.'|'ostb.'|'ostb.x'|'osix.'|'onum.'|'osn1.'|'osn2.'|'osn3.'|'odec.'|'ooct.'|'o2dg.'|'o2db.'|'o2d'|
  'spcs.'|'tab.'|'ospc.'|'ocrl.'|'skip.1'|'stat.x'|'stat.y'|'osts.'|'xfrtmp'|'seto.'|'ochr.'|'ochr.b'|'ochr.t'|'ochr.x'|'ogch.';
export type OutputRuntimeSymbols={point7LeftHalf:bigint;initialStackWord:bigint;numeric:NumericTargets;status:StatusSymbols;header:HeaderSymbols;
  object:{shtdsp:bigint;lngdsp:bigint};device:{shtdev:bigint;meddev:bigint;lngdev:bigint};condition:ConditionSymbols;
  output:OutputMachineConstants;gripe:GripeBufferSymbols};
export type OutputRuntimeServices<W>=DataStackServices<W>&{
  argumentAddress(address:bigint):bigint;
  indirectAddress(address:bigint):Generator<W,bigint,void>;
  indirect(address:bigint):bigint;idpb(character:bigint,address:bigint):void;
  ildb(pointer:'p1'|'x1'):Generator<W,bigint,void>;
  movm(destination:'x4'|'t1',word:bigint):Generator<W,void,void>;movnX4(word:bigint):Generator<W,void,void>;
  aobjnX4():Generator<W,boolean,void>;lshcC():Generator<W,void,void>;
  idivi(pair:'t1'|'x1'|'x2'|'x3',divisor:bigint):Generator<W,void,void>;idivHours():Generator<W,void,void>;
  pushP(word:bigint):Generator<W,void,void>;popP():Generator<W,bigint,void>;
  callAddress(target:bigint):Generator<W,void,void>;jumpAddress(target:bigint):Generator<W,void,void>;
  executeOutput(instruction:bigint):Generator<W,void,void>;outchr(character:bigint):Generator<W,void,void>;
  undat():Generator<W,void,void>;untim():Generator<W,void,void>;
  core():Generator<W,boolean,void>;blt(last:bigint):Generator<W,void,void>;
  outputTTY():Generator<W,void,void>;outstr(text:string):Generator<W,void,void>;
};

// Routine-body registry for WARMAC output:1522-1627,1986-2708,4983-5001.
// One register/memory/argument/data-stack context, with no default CPU, monitor
// or sink. run() executes a body; it does NOT synthesize PUSHJ/POPJ, program
// counters or return addresses for the host. The machine/call adapter owns those.
export function outputRuntime<W>(output:WordBlock,file:FileBlock,r:MachineRegisters,
  state:CharacterOutputState&HeaderState&{oflg:bigint},job:GripeOutputJob,s:OutputRuntimeSymbols,cpu:OutputRuntimeServices<W>){
  if(output.memory!==file.memory)throw new TypeError('Output runtime blocks must share one address space');
  const m=file.memory,stack=dataStack(r,state,s.initialStackWord,cpu),args=sourceArguments(m,r,a=>cpu.argumentAddress(a));
  const text={*ildb(){return yield*cpu.ildb('p1');},*ochr(){yield*run('ochr.');}};
  const number={...stack,*movm(d:'x4'|'t1',w:bigint){yield*cpu.movm(d,w);},*aobjn(){return yield*cpu.aobjnX4();},
    *idivi(d:bigint){yield*cpu.idivi('t1',d);},*space(){yield*run('ospc.');},ochr:text.ochr};
  const numeric={...number,argument:(i:0|1)=>args.read(i),*callNumber(target:bigint){yield*cpu.callAddress(target);},*idiviX1(d:bigint){yield*cpu.idivi('x1',d);}};
  const tables={argument:numeric.argument,*ostr(){yield*run('ostr.');},space:number.space,
    *idiviT1(d:bigint){yield*cpu.idivi('t1',d);},*indirectAddress(a:bigint){return yield*cpu.indirectAddress(a);}};
  const status={...tables,*spaces(){yield*run('spcs.');},*sixbit(){yield*run('osix.');},*decimal(){yield*run('odec.');},*octal(){yield*run('ooct.');},ochr:text.ochr,
    *movnX4(w:bigint){yield*cpu.movnX4(w);}};
  const header={...stack,...status,idiviX1:numeric.idiviX1,*undat(){yield*cpu.undat();},*untim(){yield*cpu.untim();},
    *ildbX1(){return yield*cpu.ildb('x1');},*status(entry:'stat.x'|'stat.y'){yield*run(entry);},*crlf(){yield*run('ocrl.');}};
  const time={argument:()=>args.read(0),*idivHours(){yield*cpu.idivHours();},*idivi(pair:'t1'|'x2'|'x3',d:bigint){yield*cpu.idivi(pair,d);},ochr:text.ochr};
  // Forward service access at call time so changing a monitor/CPU service while
  // suspended does not leave a copied method in a previously built body adapter.
  const low={...stack,indirect:(a:bigint)=>cpu.indirect(a),idpb:(c:bigint,a:bigint)=>cpu.idpb(c,a),
    *executeOutput(i:bigint){yield*cpu.executeOutput(i);},*pushP(w:bigint){yield*cpu.pushP(w);},*popP(){return yield*cpu.popP();},
    *outchr(c:bigint){yield*cpu.outchr(c);},*core(){return yield*cpu.core();},*blt(a:bigint){yield*cpu.blt(a);},
    *outputTTY(){yield*cpu.outputTTY();},*outstr(t:string){yield*cpu.outstr(t);}};
  function* run(entry:OutputEntry):Generator<W,void,void>{
    switch(entry){
      case 'out':case 'skip':case 'tab':case 'spaces':case 'space':case 'crlf':case 'outc':case 'out2c':case 'outw':case 'out2w':
        yield*fortranText(entry,m,file,r,state,s.point7LeftHalf,args,text);return;
      case 'odec':case 'osdec':yield*outputDecimalArgument(r,entry,s.numeric,numeric);return;
      case 'oflt':case 'osflt':yield*outputTenthsArgument(r,state,entry,s.numeric,numeric);return;
      case 'otim':yield*outputTime(r,time);return;
      case 'o2d':yield*outputTimePair(r,time);return;
      case 'ostr.':yield*outputString(r,s.point7LeftHalf,text);return;
      case 'ostr.x':yield*outputPointer(r,text);return;
      case 'ostbx.':case 'ostb.':case 'ostb.x':yield*outputTextField(r,entry==='ostb.x'?entry:entry==='ostb.'?'ostb':'ostbx',s.point7LeftHalf,{...text,...stack});return;
      case 'osix.':yield*outputSixbit(r,{...stack,*lshc(){yield*cpu.lshcC();},ochr:text.ochr});return;
      case 'onum.':case 'osn1.':case 'osn2.':case 'osn3.':yield*outputNumber(r,entry==='onum.'?'onum':entry==='osn1.'?'osn1':entry==='osn2.'?'osn2':'osn3',number);return;
      case 'odec.':case 'ooct.':yield*outputRadix(r,entry==='odec.'?10:8,number);return;
      case 'o2dg.':case 'o2db.':yield*outputTwoDigits(r,entry==='o2dg.'?'o2dg':'o2db',numeric);return;
      case 'spcs.':yield*outputSpaces(r,text);return;
      case 'tab.':yield*outputTab(state,r,text);return;
      case 'ospc.':yield*outputSpace(r,text);return;
      case 'ocrl.':yield*outputCrLf(state,r,text);return;
      case 'skip.1':yield*skipLines(r,text);return;
      case 'odisp':yield*outputObject(r,state,s.object,tables);return;
      case 'odev':yield*outputDevice(m,r,state,s.device,tables);return;
      case 'ocond':yield*outputCondition(m,r,state,s.condition,tables);return;
      case 'stat':yield*outputStatusArgument(m,r,state,s.status,status);return;
      case 'stat.x':case 'stat.y':yield*outputStatus(m,r,state,entry,s.status,status);return;
      case 'osts.':yield*outputStatusHeader(r,state,s.header,header);return;
      case 'xfrtmp':yield*outputTemporary(r,s.header.tmpPointer,header);return;
      case 'seto.':setOutput(output,r,s.output);return;
      case 'ochr.':yield*dispatchCharacter(output,{*indirectAddress(a){return yield*cpu.indirectAddress(a);},*transfer(a){yield*cpu.jumpAddress(a);}});return;
      case 'ochr.b':yield*rawOchrBuffered(output,state,r,low);return;
      case 'ochr.t':yield*rawOchrTerminal(state,r,low);return;
      case 'ochr.x':yield*rawOchrDeposit(output,state,r,low);return;
      case 'ogch.':yield*rawGripeCharacter(output,file,job,state,r,s.gripe,low);return;
      default:throw new RangeError('Unbound output routine body: '+String(entry));
    }
  }
  return {run,args,stack};
}
