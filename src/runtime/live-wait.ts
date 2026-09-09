import type { PauseRuntimeServices,WaitRuntimeRegisters } from '../compat/wait-runtime.ts';

// PAUSE: Austin WARMAC:3373-3401; CompuServe WARMAC:4010-4042.
// Its raw absolute deadline cannot survive MSTIME wrapping at midnight.
// Playable sessions use elapsed host time only for this private wait clock;
// DAYTIM/ETIM and historical diagnostic PAUSE retain their UTC clock binding.
export function bindLiveWait(io:Pick<PauseRuntimeServices<string>,'mstime'|'hiber'>,r:WaitRuntimeRegisters,playable:boolean,
  clocks={monotonic:()=>BigInt(Math.floor(performance.now())),daytime:()=>BigInt(Date.now()%86_400_000)}){
  io.mstime=function*(register){r[register]=playable?clocks.monotonic():clocks.daytime();};
  // Live HIBER delivers its operand without retaining fixture event/operand
  // arrays for the lifetime of the connection. Tests can still use the fixture.
  io.hiber=function*(){yield `hiber:${r.t1}`;return true;};
}
