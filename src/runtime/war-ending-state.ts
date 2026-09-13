export type WarOutcome = 'FEDERATION' | 'EMPIRE' | 'MUTUAL_DESTRUCTION';

/** One outcome per galaxy, shared by all of its sessions. */
export class WarEndingState {
  outcome: WarOutcome | null = null;
  retired = false;
  readonly listeners = new Set<() => void>();

  detect(planets: bigint, federation: bigint, empire: bigint): WarOutcome | null {
    if (this.outcome !== null) return this.outcome;
    if (planets !== 0n || (federation > 0n && empire > 0n)) return null;
    this.outcome = federation === 0n
      ? (empire === 0n ? 'MUTUAL_DESTRUCTION' : 'EMPIRE') : 'FEDERATION';
    for (const wake of this.listeners) wake();
    return this.outcome;
  }
}
