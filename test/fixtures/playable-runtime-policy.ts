import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindMainLoopRuntime } from './main-loop-runtime.ts';

// Explicitly authorized playable repairs, not recovered compiler behavior.
// See docs/playable-decisions.md. Historical diagnostic compositions omit this.
export function bindPlayablePolicy(f:ReturnType<typeof pregameRuntimeFixture>,main:ReturnType<typeof bindMainLoopRuntime>){
  // POINTS label 500 sets ALL flags; continue to its report, without entering
  // the uninitialized switch-parser DO. Initialized loops are unchanged.
  f.points.final.continuation=function*(){return false;};
  const binary=f.points.io.binary;
  f.points.io.binary=function*(op,left,right){
    if(op!=='div')return yield*binary(op,left,right);
    const a=yield*left.evaluate(),b=yield*right.evaluate();
    // Only scoring averages: zero ships/turns means a displayed zero average.
    if(b===0n)return 0n;
    return yield*binary(op,{type:left.type,evaluate:function*(){return a;}},{type:right.type,evaluate:function*(){return b;}});
  };
  main.tractor.policy.ip=main.tractor.s.ip; // Writable private dummy; source assigns WHO.
  main.lists.scanIO.implicitShip=()=>main.lists.list.read('ships'); // LSTSCN SHIP typo → accumulated SHIPS mask.
  f.getCommand.io.pendingControl='handle';
  // ENDGAM and SETUP use the same already-bound shared-image removal service.
  f.endgame.io.kilhgh=()=>main.romulan.torpedoes.removal.killHigh.run();
}
