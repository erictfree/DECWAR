import type { Team } from "./model.ts";

// Section 7.10: resolved PORTS/ALL/allegiance modifiers only, not the full parser.
type Modifier = "PORTS" | "ALL" | "FRIENDLY" | "ENEMY" | "FEDERATION" | "EMPIRE" | "NEUTRAL" | "CAPTURED";
export function portSelection(command: "LIST" | "SUMMARY" | "TARGETS", team: Team,
  modifiers: Modifier[]) {
  let sides = new Set<Team | "NEUTRAL">(command === "TARGETS"
    ? [team === "FEDERATION" ? "EMPIRE" : "FEDERATION"] : ["FEDERATION", "EMPIRE", "NEUTRAL"]);
  let planetsOnly = false, explicitSide: Modifier | null = null, ports = false, all = false;
  let wholeGalaxy = command !== "TARGETS";
  for (const modifier of modifiers) {
    if (modifier === "PORTS") {
      if (ports) throw new Error("duplicate PORTS");
      ports = true;
      planetsOnly = explicitSide === "NEUTRAL";
      if (explicitSide === null) sides = new Set([team, "NEUTRAL"]);
    } else if (modifier === "ALL") {
      if (all) throw new Error("duplicate ALL");
      all = true; wholeGalaxy = true;
      if (explicitSide === null && command !== "TARGETS") sides = new Set(["FEDERATION", "EMPIRE", "NEUTRAL"]);
    } else {
      if (command === "TARGETS" || explicitSide !== null) throw new Error("allegiance selector not permitted");
      if (ports && (modifier === "NEUTRAL" || modifier === "CAPTURED")) throw new Error("allegiance after PORTS");
      explicitSide = modifier;
      if (modifier === "NEUTRAL" || modifier === "CAPTURED") planetsOnly = true;
      sides = modifier === "NEUTRAL" ? new Set(["NEUTRAL"])
        : modifier === "CAPTURED" ? new Set(["FEDERATION", "EMPIRE"])
        : new Set([modifier === "FRIENDLY" ? team : modifier === "ENEMY"
          ? (team === "FEDERATION" ? "EMPIRE" : "FEDERATION") : modifier]);
    }
  }
  if (!ports) throw new Error("this companion requires a PORTS group");
  return { kinds: planetsOnly ? ["PLANET"] : ["BASE", "PLANET"], sides, wholeGalaxy };
}
