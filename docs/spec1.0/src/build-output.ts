import type { PlayerPreferences, Position, ShipName, Team } from "./model.ts";
import { positionField } from "./output.ts";

type BuildOutcome = { kind: "STAGE"; stage: number }
  | { kind: "CONVERTED"; position: Position }
  | { kind: "NOT_ADJACENT" | "NO_PLANET" | "NOT_FRIENDLY" | "BASE_LIMIT" };

// Section 7.16: formats an already determined result, without state mutation.
export function buildOutput(outcome: BuildOutcome, ship: ShipName, team: Team,
  observer: Position, preferences: PlayerPreferences): string {
  const long = preferences.outputLength === "LONG";
  const name = long ? ship[0] + ship.slice(1).toLowerCase() : ship[0];
  const base = team === "FEDERATION" ? (long ? "Fed Base" : "<>") : (long ? "Emp Base" : ")(");
  switch (outcome.kind) {
    case "NOT_ADJACENT": return name + " not adjacent to planet.\n";
    case "NO_PLANET": return "\nNo planet at those coordinates, Captain.\n";
    case "NOT_FRIENDLY": return "\nPlanet not yet captured.";
    case "BASE_LIMIT": return `\nAll ${base}s still functional, captain.\n`;
    case "STAGE":
      if (!Number.isInteger(outcome.stage) || outcome.stage < 1 || outcome.stage > 4) throw new Error("ordinary stage 1–4 required");
      return `${outcome.stage} build${outcome.stage > 1 ? "s" : ""}\n`;
    case "CONVERTED":
      return `\n${name} builds planet ${positionField(outcome.position, observer,
        preferences.coordinateOutput, preferences.outputLength === "SHORT")} into a ${base}\n`;
  }
}
