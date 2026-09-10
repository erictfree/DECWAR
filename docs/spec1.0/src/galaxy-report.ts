import { teamOf } from "./model.ts";
import type { Galaxy, PlayerPreferences, ShipName } from "./model.ts";
import { parseAggregateGroups, reportWord } from "./report-groups.ts";
import type { ReportCommand } from "./report-groups.ts";
import { selectReport } from "./report-selection.ts";
import type { AggregateGroup, Qualifiers } from "./report-selection.ts";
import { namedReport, coordinateReport, closestSelection } from "./report-direct.ts";
import { aggregateDetail, reportDetail } from "./report-detail.ts";
import { aggregateReport } from "./report-assembly.ts";
import { reportSummary } from "./report-summary.ts";

function noObjects(group: AggregateGroup, q: Qualifiers, length: "SHORT" | "MEDIUM" | "LONG") {
  const sides = group.sides;
  let allegiance = sides.length === 1 && sides[0] === "NEUTRAL" ? " neutral"
    : sides.length === 1 && sides[0] === "FEDERATION" ? " Federation"
    : sides.length === 1 && sides[0] === "EMPIRE" ? " Empire"
    : sides.length === 2 && sides.includes("FEDERATION") && sides.includes("EMPIRE")
      && group.kinds.length === 1 && group.kinds[0] === "PLANET" ? " captured" : "";
  if (sides.includes("ROMULAN") && !sides.includes("NEUTRAL")) allegiance = " enemy";
  const kind = group.kinds.length === 3 ? "forces" : group.kinds.length === 2 ? "ports"
    : group.kinds[0] === "SHIP" ? "ships" : group.kinds[0] === "BASE" ? "bases" : "planets";
  const scope = q.inGame ? " in game" : q.specifiedRange ? " in specified range" : " in range";
  return (length === "LONG" ? "Captain, there are no" : "No") + (q.known ? " known" : "")
    + allegiance + " " + kind + (length === "SHORT" ? "" : scope) + "\n";
}

// Sequential groups from normalized tokens, preserving direct output on error.
// Unreviewed mixed-within-direct-group forms remain outside this companion.
export function galaxyReport(prior: Galaxy, issuer: ShipName, command: ReportCommand,
  tokens: string[], preferences: Pick<PlayerPreferences, "outputLength" | "coordinateOutput">) {
  const galaxy = structuredClone(prior), team = teamOf(issuer), targets = command === "TARGETS";
  const segments: string[][] = [[]];
  for (const token of tokens) {
    if (reportWord(command, token).kind === "SEPARATOR") segments.push([]);
    else segments[segments.length - 1].push(token);
  }
  let output = "\n";
  const groups: AggregateGroup[] = [];
  const closestQualifiers: Qualifiers = { known: false, inGame: false, specifiedRange: false };
  for (const [index, segment] of segments.entries()) {
    if (index > 0 && !segment.length) return { galaxy, output: output + "Null group illegal\n", aborted: true };
    if (segment.length === 2 && segment.every(t => /^[+-]?\d+$/.test(t))) {
      if (command === "SUMMARY") return { galaxy, output: output + "Syntax error near keyword " + segment[0] + "\n", aborted: true };
      const position = { vertical: Number(segment[0]), horizontal: Number(segment[1]) };
      if (!Object.values(position).every(Number.isSafeInteger)) throw new Error("large-integer companion domain exceeded");
      const direct = coordinateReport(galaxy, issuer, command, position, preferences);
      output += direct.slice(1);
      if (direct.startsWith("\nIllegal coordinate ")) return { galaxy, output, aborted: true };
      continue;
    }
    const words = segment.map(t => reportWord(command, t));
    if (words.length && words.every(w => w.kind === "NAME")) {
      const names = words.map(w => w.value as ShipName | "ROMULAN");
      if (new Set(names).size !== names.length) throw new Error("duplicate named-group acceptance remains under review");
      output += namedReport(galaxy, issuer, names, preferences, targets).slice(1);
      continue;
    }
    const parsed = parseAggregateGroups(command, team, segment);
    if (parsed.error) return { galaxy, output: output + parsed.error, aborted: true };
    const group = parsed.groups[0], selected = selectReport(galaxy, issuer, [group]);
    if (group.closest) {
      const closest = closestSelection(galaxy, issuer, group);
      if (closest.length > 1) throw new Error("CLOSEST tie remains under review (C-004)");
      closestQualifiers.known ||= selected.targetQualifiers.known;
      closestQualifiers.inGame ||= selected.targetQualifiers.inGame;
      closestQualifiers.specifiedRange ||= selected.targetQualifiers.specifiedRange;
      output += closest.length ? reportDetail(galaxy, issuer, closest[0], preferences, targets)
        : noObjects(group, selected.groupQualifiers[0], preferences.outputLength);
      continue;
    }
    groups.push(group);
    if (selected.emptyGroups.length) output += noObjects(group, selected.groupQualifiers[0], preferences.outputLength);
  }
  const result = selectReport(galaxy, issuer, groups);
  result.targetQualifiers.known ||= closestQualifiers.known;
  result.targetQualifiers.inGame ||= closestQualifiers.inGame;
  result.targetQualifiers.specifiedRange ||= closestQualifiers.specifiedRange;
  const summary = (label: string) => reportSummary(result.selected.filter(o => o.category === label && o.summary).length,
    label, result.categoryQualifiers[label] ?? { known: false, inGame: false, specifiedRange: false }, preferences.outputLength === "SHORT");
  const category = (kind: "SHIP" | "BASE" | "PLANET", labels: string[]) => {
    const objects = result.selected.filter(o => o.kind === kind && o.side !== "ROMULAN");
    if (!objects.length) return undefined;
    return { detailRows: objects.filter(o => o.detail).map(o => aggregateDetail(galaxy, issuer, o, preferences, targets)),
      summaryLines: targets ? [] : labels.map(summary) };
  };
  const romulan = result.selected.find(o => o.side === "ROMULAN");
  if (romulan?.summary && groups.filter(group => selectReport(galaxy, issuer, [group]).selected
    .some(o => o.side === "ROMULAN")).length > 1)
    throw new Error("repeated Romulan summary count remains under review (C-010)");
  const aggregate = {
    romulanDetail: romulan?.detail ? aggregateDetail(galaxy, issuer, romulan, preferences, targets) : undefined,
    romulanSummary: romulan?.summary ? summary("Romulan") : undefined,
    ships: category("SHIP", ["Federation ship", "Empire ship"]),
    bases: category("BASE", ["Federation base", "Empire base"]),
    planets: category("PLANET", ["neutral planet", "Federation planet", "Empire planet"]),
    targetSummary: targets ? reportSummary(result.selected.filter(o => o.summary && o.side !== team && o.side !== "NEUTRAL").length,
      "target", result.targetQualifiers, preferences.outputLength === "SHORT") : undefined,
  };
  return { galaxy, output: output + aggregateReport(aggregate, targets), aborted: false };
}
