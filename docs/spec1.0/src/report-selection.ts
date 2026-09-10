import { teamOf } from "./model.ts";
import type { Galaxy, Position, ShipName, Team } from "./model.ts";

export type ReportKind = "SHIP" | "BASE" | "PLANET";
type Side = Team | "NEUTRAL" | "ROMULAN";
export interface AggregateGroup {
  kinds: ReportKind[];
  sides: Side[];
  radius: number;
  explicitRadius: boolean;
  detail: boolean;
  summary: boolean;
  closest?: boolean;
}
export interface Qualifiers { known: boolean; inGame: boolean; specifiedRange: boolean }
interface Candidate {
  kind: ReportKind;
  side: Side;
  // Index refers to the corresponding Galaxy array, not persistent game identity.
  index: number;
  position: Position;
  known: boolean;
  category: string;
}
const qualifiers = (): Qualifiers => ({ known: false, inGame: false, specifiedRange: false });
const merge = (a: Qualifiers, b: Qualifiers) => {
  a.known ||= b.known; a.inGame ||= b.inGame; a.specifiedRange ||= b.specifiedRange;
};

// Sections 7.10 and 10.9. Resolved ordinary aggregate groups only: direct
// queries, CLOSEST, parser errors and privileged visibility are separate.
// Selection precedes output; this operation does not make discoveries.
export function selectReport(galaxy: Galaxy, issuer: ShipName, groups: AggregateGroup[]) {
  const observer = galaxy.ships.find(s => s.name === issuer);
  if (!observer?.position || observer.lifecycle.phase !== "COMMISSIONED")
    throw new Error("commissioned positioned observer required");
  const team = teamOf(issuer), origin = observer.position;
  const candidates: Candidate[] = [];
  if (galaxy.romulan.enabled && galaxy.romulan.vessel) candidates.push({ kind: "SHIP",
    side: "ROMULAN", index: 0, position: galaxy.romulan.vessel.position,
    known: false, category: "Romulan" });
  galaxy.ships.forEach((ship, index) => {
    if (ship.lifecycle.phase === "COMMISSIONED" && ship.position) {
      const side = teamOf(ship.name);
      candidates.push({ kind: "SHIP", side, index, position: ship.position,
        known: false, category: side === "FEDERATION" ? "Federation ship" : "Empire ship" });
    }
  });
  for (const side of ["FEDERATION", "EMPIRE"] as const) galaxy.bases.forEach((base, index) => {
    if (base.team === side && base.strength > 0) candidates.push({ kind: "BASE", side,
      index, position: base.position, known: base.knownTo.has(team),
      category: side === "FEDERATION" ? "Federation base" : "Empire base" });
  });
  galaxy.planets.forEach((planet, index) => candidates.push({ kind: "PLANET",
    side: planet.allegiance, index, position: planet.position, known: planet.knownTo.has(team),
    category: planet.allegiance === "NEUTRAL" ? "neutral planet"
      : planet.allegiance === "FEDERATION" ? "Federation planet" : "Empire planet" }));
  const selected = candidates.map(candidate => ({ ...candidate, detail: false, summary: false,
    outOfSensorRange: candidate.side !== team && Math.max(
      Math.abs(candidate.position.vertical - origin.vertical),
      Math.abs(candidate.position.horizontal - origin.horizontal)) > 10 }));
  const categoryQualifiers: Record<string, Qualifiers> = {};
  const targetQualifiers = qualifiers();
  const emptyGroups: number[] = [];
  const groupQualifiers: Qualifiers[] = [];
  for (const [groupIndex, group] of groups.entries()) {
    if (!(group.radius > 0) || !Number.isInteger(group.radius) || (!group.detail && !group.summary))
      throw new Error("valid resolved aggregate group required");
    const inGame = !group.explicitRadius && group.radius > 75;
    const groupQ = { known: group.radius > 10 && !inGame && !(group.sides.length === 1 && group.sides[0] === team),
      inGame: false, specifiedRange: false };
    let examined = false;
    let any = false;
    for (const object of selected) {
      if (!group.kinds.includes(object.kind) || !group.sides.includes(object.side)) continue;
      if (group.closest && object.kind === "SHIP" && object.side !== "ROMULAN"
        && galaxy.ships[object.index].name === issuer) continue;
      examined = true;
      groupQ.inGame ||= inGame;
      groupQ.specifiedRange ||= group.explicitRadius;
      groupQ.known ||= object.outOfSensorRange && group.radius > 10;
      const q = { known: object.outOfSensorRange && group.radius > 10 && !inGame,
        inGame, specifiedRange: group.explicitRadius };
      const category = categoryQualifiers[object.category] ??= qualifiers();
      merge(category, q); // Examined but excluded candidates still contribute.
      if (object.outOfSensorRange) merge(targetQualifiers, q);
      const distance = Math.max(Math.abs(object.position.vertical - origin.vertical),
        Math.abs(object.position.horizontal - origin.horizontal));
      const known = object.known || (object.kind === "SHIP" && inGame && !group.closest);
      let detail = group.detail, summary = group.summary;
      if (object.outOfSensorRange && !known) {
        if (!summary || !inGame) continue;
        detail = false;
      } else if (distance > group.radius) continue;
      object.detail ||= detail; object.summary ||= summary;
      any = true;
    }
    if (!any) emptyGroups.push(groupIndex);
    if (!examined) groupQ.inGame = true; // LSTFLG's no-object suffix default.
    groupQualifiers.push(groupQ);
  }
  return { selected: selected.filter(o => o.detail || o.summary), categoryQualifiers,
    targetQualifiers, emptyGroups, groupQualifiers };
}
