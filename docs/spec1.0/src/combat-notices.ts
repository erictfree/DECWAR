type OutputLength = "SHORT" | "MEDIUM" | "LONG";
type TorpedoOutcome = "MISS" | "BLACK_HOLE" | "NEUTRALIZED";

export function torpedoNotice(outcome: TorpedoOutcome, n: number,
  position: string, length: OutputLength): string {
  const long = length === "LONG";
  const verb = {
    MISS: long ? " lost " : " miss ",
    BLACK_HOLE: long ? " swallowed by black hole " : " gulp ",
    NEUTRALIZED: long ? " neutralized by friendly object " : " neutralized ",
  }[outcome];
  return (long ? "\nWeapons Officer:  Captain, torpedo " : "T")
    + n + verb + position + "\n";
}

export function baseNotice(destroyed: boolean, base: string, position: string,
  length: OutputLength, radioEnabled: boolean, radioDamage: number): string {
  const prefix = length === "LONG" ? "\n" : "";
  if (!radioEnabled || radioDamage > 300) return prefix;
  const suffix = length === "LONG"
    ? (destroyed ? " has been destroyed, Captain." : " is under attack, Captain.")
    : length === "MEDIUM" ? (destroyed ? " dead" : " attacked")
    : (destroyed ? " D" : " A");
  return prefix + base + " " + position + suffix + "\n";
}
