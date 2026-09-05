import type { MemoryCommandInput } from './input-memory.ts';
import type { FileBlock } from './files.ts';
import { inputRuntime } from './input-runtime.ts';
import { add36,halfWords,leftHalf,rightHalf,signed36 } from './word36.ts';

export type ResetRegisters={sgnam:bigint;sgppn:bigint;sgdev:bigint;t0:bigint;t1:bigint;x1:bigint;x2:bigint;p1:bigint;p:bigint;s:bigint;ac16:bigint};
export type ResetJob={jbff:bigint;jbint:bigint;jbapr:bigint;jbver:bigint};
export type ResetSymbols={setup:bigint;z:bigint;programName:bigint;programPpn:bigint;programDevice:bigint;
  pushdownInitial:bigint;dataStackInitial:bigint;aprtrp:bigint;ttyfil:bigint;banner:bigint};
export type ResetServices<W>={
  reset():Generator<W,void,void>;
  start():Generator<W,void,void>; // transfer to the source reload path; not a new initializer.
  popReturn():Generator<W,void,void>; // POPJ P at normal RESET return.
  pushReturn():void; // PUSH P,16 using live caller registers and actual stack memory.
  gettab():Generator<W,boolean,void>; // T0 result; true if the monitor skips failure.
  setuwp():Generator<W,boolean,void>;
  halt(reason:'setuwp'|'tty-open'):Generator<W,void,void>; // Return only on monitor-approved continuation.
  aprenb():Generator<W,void,void>;
  open():Generator<W,boolean,void>;
  seto():Generator<W,void,void>;
  seti():Generator<W,void,void>;
  ostr():Generator<W,void,void>; // P1 points at the assembled "DECWAR, Edit " ASCIZ.
  odec():Generator<W,void,void>;
  crlf():Generator<W,void,void>;
  outputTTY():Generator<W,void,void>;
};

// WARMAC RESET:1118-1182. Required symbols/register aliases and monitor/stack
// services retain unresolved compiler/monitor state rather than synthesizing it.
export function* resetRuntime<W>(input:MemoryCommandInput,file:FileBlock,job:ResetJob,r:ResetRegisters,
  symbols:ResetSymbols,io:ResetServices<W>):Generator<W,void,void>{
  const {block,state}=inputRuntime(input),memory=input.memory,low=input.low;
  yield*io.reset();
  memory.write(symbols.programName,r.sgnam);memory.write(symbols.programPpn,r.sgppn);memory.write(symbols.programDevice,r.sgdev);
  r.t1=job.jbff;
  if(r.t1<symbols.z||memory.read(symbols.setup)===0n){yield*io.start();return;}
  r.p=signed36(symbols.pushdownInitial);r.s=signed36(symbols.dataStackInitial);
  r.ac16=add36(r.ac16,1n);io.pushReturn();
  r.t1=80n;low.write('terwid',r.t1);
  r.t0=signed36(halfWords(-1n,0o30n));if(!(yield*io.gettab()))r.t0=0n;
  r.t1=0n;if(!(yield*io.setuwp()))yield*io.halt('setuwp');
  state.ccflg=0n;state.ccflgDot=0n;file.write('trpadr',0n);file.write('intflg',-1n);
  state.inwait=0n;state.hungup=0n;low.write('addrck',0n);
  r.t1=file.address('intblk',0);file.write('intblk',0n,2);job.jbint=r.t1;
  r.t1=rightHalf(symbols.aprtrp);job.jbapr=signed36(halfWords(leftHalf(job.jbapr),r.t1));
  r.t1=(1n<<(35n-19n))+(1n<<(35n-22n));yield*io.aprenb();
  input.beginLine();block.write('echflg',0n);
  r.x1=signed36(halfWords(symbols.ttyfil,symbols.ttyfil));
  if(!(yield*io.open()))yield*io.halt('tty-open');
  yield*io.seto();yield*io.seti();state.iniflg=0n;
  r.p1=rightHalf(symbols.banner);yield*io.ostr();
  r.x1=rightHalf(job.jbver);r.x2=5n;yield*io.odec();yield*io.crlf();
  if(state.hungup===0n)yield*io.outputTTY();
  yield*io.popReturn();
}

export type ReloadServices<W>={
  run():Generator<W,void,void>; // RUN T1; only the failure path returns.
  monit():Generator<W,void,void>;
};
// WARMAC START:4263-4273 and low-segment RUNDEC:747-748. A successful RUN
// transfers execution; a returning RUN takes the source MONIT failure path.
export function* reloadRuntime<W>(input:MemoryCommandInput,file:FileBlock,r:Pick<ResetRegisters,'t1'>,
  symbols:Pick<ResetSymbols,'programName'|'programPpn'|'programDevice'>,io:ReloadServices<W>):Generator<W,void,void>{
  r.t1=input.memory.read(symbols.programDevice);file.write('tmp',r.t1,0);
  r.t1=input.memory.read(symbols.programName);file.write('tmp',r.t1,1);
  file.write('tmp',0n,2);file.write('tmp',0n,3);
  r.t1=input.memory.read(symbols.programPpn);file.write('tmp',r.t1,4);file.write('tmp',0n,5);
  r.t1=file.address('tmp',0);yield*io.run();yield*io.monit();
}
