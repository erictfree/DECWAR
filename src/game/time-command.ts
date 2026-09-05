import { messages as M } from '../generated/source-data.ts';
import { TerminalOutput } from '../compat/output.ts';
import { etim, otim } from '../compat/time.ts';
import type { MonitorClock } from '../compat/time.ts';
import { add36 } from '../compat/word36.ts';
import type { CommonBlock } from '../compat/memory.ts';
import { constants as K } from '../generated/source-data.ts';

export type TimeContext = { who: number; gameStarted: bigint; shipStarted: bigint; shipRunStarted: bigint };

// TIME.FOR:30-46. Each clock call happens at its source position, after its
// heading. Two RUNTIM calls must not be folded into one cached reading.
export function timeCommand(context: TimeContext, out: TerminalOutput, clock: MonitorClock): void {
  out.out(M.time01.text); otim(out, etim(context.gameStarted, clock.daytime()));
  if (context.who !== 0) {
    out.out(M.time02.text); otim(out, etim(context.shipStarted, clock.daytime()));
    out.out(M.time03.text); otim(out, add36(clock.runtime(), -context.shipRunStarted));
  }
  out.out(M.time04.text); otim(out, clock.runtime());
  out.out(M.time05.text); otim(out, clock.daytime());
  out.crlf();
}

export type TimeHeading='time01'|'time02'|'time03'|'time04'|'time05';
export type TimeStatementServices<W>={
  out(heading:TimeHeading):Generator<W,void,void>; // CALL OUT(heading,0), including compiled arguments.
  otim(value:bigint):Generator<W,void,void>;crlf():Generator<W,void,void>;
  etim(startAddress:bigint):Generator<W,bigint,void>;runtim():Generator<W,bigint,void>;daytim():Generator<W,bigint,void>;
  // Required compiler ordering/arithmetic for RUNTIM(D)-JOB(WHO,KRUNTM).
  // The function can write D and suspend; WHO/JOB must be read when the chosen
  // evaluation policy evaluates that operand, not cached at command entry.
  runtimeDifference(runtime:()=>Generator<W,bigint,void>,started:()=>bigint):Generator<W,bigint,void>;
};
// TIME.FOR:30-46, resumable statement path over live COMMON. The component
// timeCommand above remains synchronous and is not the monitor/call adapter.
export function* timeStatements<W>(high:CommonBlock,low:CommonBlock,io:TimeStatementServices<W>):Generator<W,void,void>{
  yield*io.out('time01');yield*io.otim(yield*io.etim(high.address('tim0')));
  if(low.read('who')!==0n){
    yield*io.out('time02');yield*io.otim(yield*io.etim(high.address('job',low.read('who'),K.KJOBTM)));
    yield*io.out('time03');yield*io.otim(yield*io.runtimeDifference(()=>io.runtim(),()=>high.read('job',low.read('who'),K.KRUNTM)));
  }
  yield*io.out('time04');yield*io.otim(yield*io.runtim());
  yield*io.out('time05');yield*io.otim(yield*io.daytim());yield*io.crlf();
}
