import type { Team, WarOutcome } from "./model.ts";

// Section 9.4. Counts are derived from a consistent galaxy, not stored counters.
export function warOutcome(planets: number, federationBases: number, empireBases: number): WarOutcome | null {
  if (![planets, federationBases, empireBases].every(n => Number.isInteger(n) && n >= 0)) {
    throw new Error("nonnegative counts required");
  }
  if (planets > 0 || (federationBases > 0 && empireBases > 0)) return null;
  if (federationBases === 0 && empireBases === 0) return "MUTUAL_DESTRUCTION";
  return federationBases === 0 ? "EMPIRE" : "FEDERATION";
}

/** Preserve the first terminal result; later galaxy changes cannot replace it. */
export function latchWarOutcome(current: WarOutcome | null,
  planets: number, federationBases: number, empireBases: number): WarOutcome | null {
  return current ?? warOutcome(planets, federationBases, empireBases);
}

/**
 * Defer player-facing finalization until an accepted command has completed.
 * A null result means no finalization at this boundary; a non-null result requires the
 * command's player to receive the ending report and be released.
 */
export function completionOutcome(outcome: WarOutcome | null,
  commandCompleted: boolean): WarOutcome | null {
  return commandCompleted ? outcome : null;
}

// Single-victor announcement text, before final POINTS/release processing.
export function victoryAnnouncement(victor: Team, receiver: Team): string {
  const announcement = victor === "FEDERATION"
    ? "The Federation has successfully repelled the Klingon hordes!\n\n"
    : "The Klingon Empire is VICTORIOUS!!\n\n";
  const personal = receiver === "FEDERATION"
    ? (victor === "FEDERATION" ? "Congratulations.  Freedom again reigns the galaxy.\n"
      : "Please proceed to the nearest Klingon slave planet.\n")
    : (victor === "EMPIRE" ? "The Empire salutes you.  Begin slave operations immediately.\n"
      : "The Empire has fallen.  Initiate self-destruction procedure.\n");
  return "THE WAR IS OVER!!\n\n" + announcement + personal;
}

export function warAnnouncement(outcome: WarOutcome, receiver: Team): string {
  if (outcome !== "MUTUAL_DESTRUCTION") return victoryAnnouncement(outcome, receiver);
  return "THE WAR IS OVER!!\n\nThe entire known galaxy has been depopulated.\n\nBOTH sides lose!!\n";
}
