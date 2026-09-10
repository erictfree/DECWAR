import type { Team } from "./model.ts";

// Section 9.4. Counts are derived from a consistent galaxy, not stored counters.
export function warOutcome(planets: number, federationBases: number, empireBases: number): Team | "MUTUAL_DESTRUCTION" | null {
  if (![planets, federationBases, empireBases].every(n => Number.isInteger(n) && n >= 0)) {
    throw new Error("nonnegative counts required");
  }
  if (planets > 0 || (federationBases > 0 && empireBases > 0)) return null;
  if (federationBases === 0 && empireBases === 0) return "MUTUAL_DESTRUCTION";
  return federationBases === 0 ? "EMPIRE" : "FEDERATION";
}

// Single-victor announcement, before POINTS/release; mutual/forced ending open.
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
