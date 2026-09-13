import type { pregameRuntimeFixture } from '../../test/fixtures/pregame-runtime.ts';
import type { bindMainLoopRuntime } from '../../test/fixtures/main-loop-runtime.ts';
import { WarEndingState } from './war-ending-state.ts';
import { rightHalf } from '../compat/word36.ts';

// Austin DECWAR.FOR ENDGAM:961–1005, PLNRMV:2861–2892, BUILD:534–594.
// Playable policy: latch synchronously at count removal, finish accepted work,
// and report once per session at its command boundary. Diagnostic code is intact.
export function bindPlayableEnding(f: ReturnType<typeof pregameRuntimeFixture>,
  main: ReturnType<typeof bindMainLoopRuntime>, state: WarEndingState) {
  let armed = false, active = false, finishing = false;
  const counts = new Set([f.high.address('nplnet'), f.high.address('nbase', 1), f.high.address('nbase', 2)]);
  function detect() {
    const outcome = state.detect(f.high.read('nplnet'), f.high.read('nbase', 1), f.high.read('nbase', 2));
    if (outcome !== null) f.high.write('endflg', outcome === 'MUTUAL_DESTRUCTION' ? -2n : -1n);
    return outcome;
  }
  // Observe the actual count stores, including weapons and autonomous calls.
  // BUILD reserves its replacement base before decrementing the planet count.
  const write = f.m.write.bind(f.m);
  f.m.write = (address, value) => {
    const watched = armed && counts.has(rightHalf(address));
    const previous = watched ? f.m.read(address) : 0n;
    write(address, value);
    if (watched && f.m.read(address) < previous) detect();
  };

  function* finalize(): Generator<string, void, void> {
    if (finishing || state.outcome === null) return;
    finishing = true;
    const outcome = state.outcome, team = f.low.read('team');
    if (!state.retired) {
      state.retired = true;
      yield* f.endgame.io.kilhgh();
    }
    yield* f.endgame.io.out('endgm0', 1);
    if (outcome === 'MUTUAL_DESTRUCTION') yield* f.endgame.io.out('endgm1', 1);
    else {
      yield* f.endgame.io.out(outcome === 'FEDERATION' ? 'endgm4' : 'endgm3', 1);
      yield* f.endgame.io.out(team === 1n
        ? (outcome === 'FEDERATION' ? 'endgm6' : 'endgm5')
        : (outcome === 'EMPIRE' ? 'endgm7' : 'endgm8'), 1);
    }
    if (f.low.read('who') !== 0n) {
      yield* f.endgame.io.points(true);
      yield* f.endgame.io.free(f.low.address('who'));
      f.low.write('who', 0n);
    }
    yield* f.endgame.io.exit();
  }
  const historicalEnd = f.endgame.run;
  f.endgame.run = function* () {
    if (armed) detect();
    if (state.outcome !== null) {
      if (!active) yield* finalize();
      return;
    }
    // Administrative SET ENDFLG retains its separate historical behavior.
    yield* historicalEnd();
  };
  const getcmd = main.io.getcmd;
  main.io.getcmd = function* (a) {
    active = false; armed = true;
    detect();
    yield* finalize();
    yield* getcmd(a);
    // Input arriving after another session latches cannot start a command.
    yield* finalize();
    active = f.low.read('who') !== 0n;
  };
  const leave = f.apr.leave;
  f.apr.leave = function* (entry='fatal') {
    active = false;
    yield* finalize();
    return yield* leave(entry);
  };
  return {
    shouldFinish: () => armed && !active && !finishing && state.outcome !== null,
    finalize,
  };
}
