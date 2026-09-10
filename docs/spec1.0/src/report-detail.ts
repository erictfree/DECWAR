import { teamOf } from "./model.ts";
import type { Galaxy, PlayerPreferences, ShipName } from "./model.ts";
import type { selectReport } from "./report-selection.ts";
import { decimalField, integerField, positionField } from "./output.ts";

export type ReportSelection = ReturnType<typeof selectReport>["selected"][number];

// Section 10.4: format one selected row without changing discovery.
// The aggregate wrapper below applies the distinct output-time update.
export function reportDetail(galaxy: Galaxy, issuer: ShipName, object: ReportSelection,
  preferences: Pick<PlayerPreferences, "outputLength" | "coordinateOutput">,
  targets = false): string {
  if (!object.detail) throw new Error("detail-selected object required");
  const observer = galaxy.ships.find(s => s.name === issuer);
  if (!observer?.position) throw new Error("positioned observer required");
  const long = preferences.outputLength === "LONG", short = preferences.outputLength === "SHORT";
  const friendly = object.side === teamOf(issuer);
  let name: string;
  if (object.side === "ROMULAN") name = long ? "Romulan" : "??";
  else if (object.kind === "SHIP") {
    const ship = galaxy.ships[object.index];
    name = long ? ship.name[0] + ship.name.slice(1).toLowerCase() : ship.name[0];
  } else if (object.kind === "BASE") {
    name = object.side === "FEDERATION" ? (long ? "Fed Base" : "<>") : (long ? "Emp Base" : ")(");
  } else {
    name = object.side === "NEUTRAL" ? (long ? "Neu planet" : " @")
      : object.side === "FEDERATION" ? (long ? "Fed planet" : "+@") : (long ? "Emp planet" : "-@");
  }
  let row = ((friendly || object.side === "NEUTRAL" || targets) ? " " : "*") + name;
  row = row.padEnd(long ? 13 : 4, " ");
  if (object.kind === "SHIP" && object.outOfSensorRange) return row + "out of range\n";
  row += positionField(object.position, observer.position, preferences.coordinateOutput, short, 2);
  if (object.side === "ROMULAN") {
    if (!galaxy.romulan.enabled || !galaxy.romulan.vessel) throw new Error("present Romulan required");
    row += decimalField(galaxy.romulan.vessel.energy, 6, short) + (short ? "" : "%");
  } else if (object.kind === "SHIP") {
    const shields = galaxy.ships[object.index].shields;
    row += decimalField(shields.strength * (shields.mode === "UP" ? 1 : -1), 6, short, true) + (short ? "" : "%");
  } else if (object.kind === "BASE") {
    const base = galaxy.bases[object.index];
    if (!object.outOfSensorRange) row += decimalField(base.strength, 6, short) + (short ? "" : "%");
  } else {
    const planet = galaxy.planets[object.index], builds = planet.construction;
    if (builds) row += integerField(builds, 6) + (long ? (builds === 1 ? " build" : " builds") : short ? "" : " b");
  }
  return row + "\n";
}

export function aggregateDetail(galaxy: Galaxy, issuer: ShipName, object: ReportSelection,
  preferences: Pick<PlayerPreferences, "outputLength" | "coordinateOutput">, targets = false): string {
  const row = reportDetail(galaxy, issuer, object, preferences, targets);
  if (object.kind === "BASE") galaxy.bases[object.index].knownTo.add(teamOf(issuer));
  if (object.kind === "PLANET") galaxy.planets[object.index].knownTo.add(teamOf(issuer));
  return row;
}
