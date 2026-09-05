import { CommandInput } from './command-input.ts';
import { TerminalOutput } from './output.ts';
import { add36 } from './word36.ts';
import { reacquire, releaseWaitLock } from './wait.ts';
import type { WaitState, WaitServices } from './wait.ts';

export type TokenReadState = WaitState & { ccflgDot: bigint };
export type EditedLine = { text: string; repeated: boolean } | { stored: CommandInput };
export function installEditedLine(input:CommandInput,line:EditedLine):void {
  if('stored' in line){if(line.stored!==input)throw new Error('INLI returned a different input buffer');}
  else input.acceptEditedLine(line.text,line.repeated);
}
export type TokenReadServices<W> = WaitServices<W> & { inliOwnsMemory?: boolean; inli(): Generator<W, EditedLine, void> };

// WARMAC GTKN:1670-1732. INLI's terminal interaction remains an explicit
// adapter; a buffered command requires neither a new line nor lock release.
export function* gtkn<W>(state: TokenReadState, input: CommandInput, out: TerminalOutput,
  io: TokenReadServices<W>): Generator<W, void, void> {
  if (state.hungup !== 0n) return; // Leaves every token, and NTOK, untouched.
  state.ccflgDot = add36(state.ccflgDot, 1n);
  if (!input.prepareRead(state.ccflgDot === 0n,out)) {
    state.svlock = state.locked;
    yield* releaseWaitLock(state, io);
    if(!io.inliOwnsMemory)input.beginLine();
    const line = yield* io.inli();
    installEditedLine(input,line);
    yield* reacquire(state, io);
    input.startLine();
  }
  if (state.hungup !== 0n) {
    input.forceQuit();
    return; // First VALLST and both pointers retain their previous contents.
  }
  if (!input.acquire(out)) throw new Error('GTKN requires an edited line or a buffered command');
}

// WARMAC CLEAR:3904-3910. Monitor input is cleared unless hung up; LINBUF
// and RPTFLG remain available for repeat/name handling.
export function clearInput(state: Pick<WaitState, 'hungup'>, input: CommandInput,
  clearMonitorInput: () => void): void {
  if (state.hungup === 0n) clearMonitorInput();
  input.discardTail();
}
