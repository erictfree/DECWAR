import type { ShipStatus } from './observations.ts';

// Strategic observation, independent of socket responsiveness. Do not count
// timestamps or repeated successful STATUS responses as changed game state.
export class ProgressWatch {
  private signature = '';
  private since = 0;
  private stalled = false;
  observe(status: ShipStatus, now: number): 'stalled' | 'resumed' | undefined {
    const signature = JSON.stringify([status.position, status.energy, status.shieldPercent, status.shieldsUp, status.hullDamage, status.torpedoes, status.stardate]);
    if (signature !== this.signature) {
      const resumed = this.stalled;
      this.signature = signature; this.since = now; this.stalled = false;
      return resumed ? 'resumed' : undefined;
    }
    if (!this.stalled && now - this.since >= 30000) { this.stalled = true; return 'stalled'; }
    return undefined;
  }
}
