import { add36, rightHalf } from './word36.ts';

// WARMAC INPUT:3873-3900, PAUSE:4010-4051. Values are shared with the
// session, not snapshotted across waits. UNLO. does not clear LOCKED.
export type WaitState = { locked: bigint; svlock: bigint; iniflg: bigint; hungup: bigint; ccflg: bigint };
export type Hibernate = { kind: 'hibernate'; milliseconds: bigint; wakeOnInput: boolean };
export type WaitServices<W> = {
  daytime(): bigint;
  inputPending(): boolean;
  unlo(key: bigint): void | Generator<W, void, void>;
  lock(key: bigint): Generator<W, boolean, void>; // true iff LKFAIL is zero
  hibernate(milliseconds: bigint, wakeOnInput: boolean): Generator<W, void, void>;
};

export function* releaseWaitLock<W>(state: WaitState, io: WaitServices<W>): Generator<W, void, void> {
  if(state.svlock!==0n){const effect=io.unlo(state.svlock);if(effect!==undefined)yield*effect;}
}

export function* reacquire<W>(state: WaitState, io: WaitServices<W>): Generator<W, void, void> {
  if (state.svlock !== 0n) while (!(yield* io.lock(state.svlock))) { /* source retry */ }
}

export function* inputReady<W>(state: WaitState, hasCommandTail: () => boolean,
  milliseconds: () => bigint, io: WaitServices<W>): Generator<W, boolean, void> {
  if (hasCommandTail() || state.iniflg < 0n) return true;
  if (milliseconds() > 0n) {
    state.svlock = state.locked;
    yield* releaseWaitLock(state, io);
    // HRLI T1,(HB.RTC) replaces the duration's left half. This component
    // exposes the low-half duration and wake flag separately; raw instruction
    // and monitor behavior live in wait-runtime.ts.
    yield* io.hibernate(rightHalf(milliseconds()), true);
    yield* reacquire(state, io);
  }
  if (state.hungup !== 0n) return true;
  return io.inputPending() || state.ccflg !== 0n;
}

export function* pause<W>(state: WaitState, milliseconds: () => bigint,
  io: WaitServices<W>): Generator<W, void, void> {
  if (milliseconds() <= 0n) return;
  state.svlock = state.locked;
  yield* releaseWaitLock(state, io);
  let duration = milliseconds();
  if (duration > 0n) {
    if (duration > 10000n) duration = 10000n;
    const end = add36(io.daytime(), duration);
    duration = milliseconds();
    if (duration > 10000n) duration = 10000n;
    do {
      yield* io.hibernate(duration, false);
      duration = 1000n;
    } while (io.daytime() < end); // Deliberately not ETIM: source midnight bug.
  }
  yield* reacquire(state, io);
}

// A host supplies wake events and clock readings; this does not sleep the JS
// process or assume that a wake means the requested interval has elapsed.
export function* hibernate(milliseconds: bigint, wakeOnInput: boolean): Generator<Hibernate, void, void> {
  yield { kind: 'hibernate', milliseconds, wakeOnInput };
}
