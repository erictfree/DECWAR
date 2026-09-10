import { teamOf } from "./model.ts";
import type { Galaxy, PlayerPreferences, Position, ShipName } from "./model.ts";
import { reportDetail } from "./report-detail.ts";
import type { ReportSelection } from "./report-detail.ts";
import { positionField } from "./output.ts";
import { selectReport } from "./report-selection.ts";
import type { AggregateGroup } from "./report-selection.ts";

type Preferences = Pick<PlayerPreferences, "outputLength" | "coordinateOutput">;
const distance = (a: Position, b: Position) => Math.max(Math.abs(a.vertical - b.vertical), Math.abs(a.horizontal - b.horizontal));

// One resolved named group; includes the command's and named group's newlines.
export function namedReport(galaxy: Galaxy, issuer: ShipName, names: (ShipName | "ROMULAN")[],
  preferences: Preferences, targets = false): string {
  let output = "\n\n";
  const group: AggregateGroup = { kinds: ["SHIP"], sides: ["FEDERATION", "EMPIRE", "ROMULAN"],
    radius: 100, explicitRadius: false, detail: true, summary: false };
  const selected = selectReport(galaxy, issuer, [group]).selected;
  if (names.includes("ROMULAN")) {
    if (!galaxy.romulan.enabled) output += "Romulans are NOT in this game.\n";
    else if (!galaxy.romulan.vessel) output += "The Romulan is dead\n";
    else output += reportDetail(galaxy, issuer, selected.find(o => o.side === "ROMULAN")!, preferences, targets);
  }
  for (const [index, ship] of galaxy.ships.entries()) {
    if (!names.includes(ship.name)) continue;
    const row = selected.find(o => o.side !== "ROMULAN" && o.index === index);
    if (row) output += reportDetail(galaxy, issuer, row, preferences, targets);
    else output += (preferences.outputLength === "LONG"
      ? ship.name[0] + ship.name.slice(1).toLowerCase() : ship.name[0]) + " is not in the game\n";
  }
  return output;
}

// One unmodified coordinate group. C-017's historical filter exceptions are
// represented for review, not resolved by this companion. No discoveries.
export function coordinateReport(galaxy: Galaxy, issuer: ShipName,
  command: "LIST" | "BASES" | "PLANETS" | "TARGETS", position: Position,
  preferences: Preferences): string {
  const origin = galaxy.ships.find(s => s.name === issuer)?.position;
  if (!origin) throw new Error("positioned observer required");
  const absolute = positionField(position, origin, "ABSOLUTE", true);
  if (![position.vertical, position.horizontal].every(n => Number.isInteger(n) && n >= 1 && n <= 75))
    return "\nIllegal coordinate " + absolute + "\n";
  const d = distance(origin, position), team = teamOf(issuer);
  const failRange = () => "\nCaptain, our sensors can't scan as far as " + absolute + "\n";
  const noObject = () => "\nNo " + (command === "BASES" ? "base " : command === "PLANETS" ? "planet " : "target ")
    + positionField(position, origin, preferences.coordinateOutput, false) + "\n";
  let object: ReportSelection | undefined;
  let known = false;
  const shipIndex = galaxy.ships.findIndex(s => s.lifecycle.phase === "COMMISSIONED" && s.position && distance(s.position, position) === 0);
  const baseIndex = galaxy.bases.findIndex(b => b.strength > 0 && distance(b.position, position) === 0);
  const planetIndex = galaxy.planets.findIndex(p => distance(p.position, position) === 0);
  if (shipIndex >= 0) object = { kind: "SHIP", index: shipIndex, side: teamOf(galaxy.ships[shipIndex].name),
    position, known: false, category: "", detail: true, summary: false, outOfSensorRange: false };
  else if (baseIndex >= 0) {
    if (command === "PLANETS") return noObject();
    const base = galaxy.bases[baseIndex]; known = base.knownTo.has(team);
    object = { kind: "BASE", index: baseIndex, side: base.team, position, known,
      category: "", detail: true, summary: false, outOfSensorRange: false };
  } else if (planetIndex >= 0) {
    if (command === "BASES") return noObject();
    const planet = galaxy.planets[planetIndex]; known = planet.knownTo.has(team);
    object = { kind: "PLANET", index: planetIndex, side: planet.allegiance, position, known,
      category: "", detail: true, summary: false, outOfSensorRange: false };
  } else if (galaxy.romulan.enabled && galaxy.romulan.vessel && distance(galaxy.romulan.vessel.position, position) === 0) {
    object = { kind: "SHIP", side: "ROMULAN", index: 0, position, known: false,
      category: "Romulan", detail: true, summary: false, outOfSensorRange: false };
  } else {
    if (d > 10) return failRange();
    if (command === "LIST") throw new Error("C-028 empty/star/black-hole LIST coordinate rendering remains under review");
    return noObject();
  }
  object.outOfSensorRange = d > 10 && object.side !== team;
  const radius = command === "PLANETS" || command === "TARGETS" ? 10 : 100;
  if (d > radius || (object.outOfSensorRange && !known)) return failRange();
  return "\n" + reportDetail(galaxy, issuer, object, preferences, command === "TARGETS");
}

// Unique closest selection is defined; tied candidates are returned for review.
// The selected row uses direct-query output and does not discover a port.
export function closestSelection(galaxy: Galaxy, issuer: ShipName, group: AggregateGroup) {
  const origin = galaxy.ships.find(s => s.name === issuer)?.position;
  if (!origin) throw new Error("positioned observer required");
  const candidates = selectReport(galaxy, issuer, [{ ...group, closest: true, detail: true, summary: false }]).selected
    .filter(o => !(o.kind === "SHIP" && (o.outOfSensorRange || (o.side !== "ROMULAN" && galaxy.ships[o.index].name === issuer))));
  const minimum = Math.min(...candidates.map(o => distance(origin, o.position)));
  return candidates.filter(o => distance(origin, o.position) === minimum);
}
