import type { Position, Ship } from "./model.ts";

// Section 7.20, supplied count and resolved positions. This does not read
// prompts, launch a torpedo, or decide C-010 self-target turn completion.
export function torpedoPreflight(ship: Ship, count: number, targets: readonly Position[],
  length: "SHORT" | "MEDIUM" | "LONG") {
  if (ship.lifecycle.phase !== "COMMISSIONED" || !ship.position)
    throw new Error("commissioned positioned issuer required");
  const rejected = (output: string) => ({ kind: "REJECTED" as const, output });
  if (ship.deviceDamage.TORPEDO_TUBES >= 300)
    return rejected("Torpedo tubes critically damaged.\n");
  if (ship.torpedoes === 0) return rejected(length === "SHORT"
    ? "\n0 torpedoes left.\n" : "You have already used your supply of torpedoes!\n");
  if (!Number.isInteger(count)) throw new Error("resolved integer count required");
  if (count <= 0) return { kind: "CANCELLED" as const, output: "" };
  if (count > ship.torpedoes || count > 3)
    return rejected((count > ship.torpedoes ? "Insufficient torpedoes for burst!\n" : "")
      + `\n${ship.torpedoes} torpedoes left.\n`);
  if (!targets.length || targets.length > count)
    throw new Error("missing or surplus targets require input handling/review");
  if (targets.some(p => ![p.vertical, p.horizontal].every(n => Number.isInteger(n) && n >= 1 && n <= 75)))
    throw new Error("resolved galaxy positions required");
  const assigned = Array.from({ length: count }, (_, i) => ({ ...targets[Math.min(i, targets.length - 1)] }));
  for (const target of assigned) {
    const distance = Math.max(Math.abs(target.vertical - ship.position.vertical),
      Math.abs(target.horizontal - ship.position.horizontal));
    if (distance === 0) return { kind: "SELF_TARGET_REVIEW" as const, output: length === "LONG"
      ? "ERROR detected by computer!!  You have attempted\nto use your present location.\n"
      : "ERROR!  Own location used!\n" };
    if (distance > 10) return rejected("Target out of range.\n");
  }
  return { kind: "READY" as const, output: "", targets: assigned };
}
