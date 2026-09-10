// Modern host policy, separate from the source editor and command syntax.
// Admission is measured when the editor completes a submission. ESC remains
// exempt by policy; '/' stays inside the source's token stream.
export class InputAdmission {
  private last = -Infinity;
  readonly intervalMs: number;
  constructor(intervalMs: number, privateClock?: () => number) {
    if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new RangeError('Invalid input interval');
    this.intervalMs = intervalMs;
    this.clock = privateClock ?? (() => performance.now());
  }
  private clock: () => number;
  accept(terminator: number): boolean {
    if (terminator === 27 || this.intervalMs === 0) return true;
    const now = this.clock();
    if (now - this.last < this.intervalMs) return false;
    this.last = now;
    return true;
  }
}
