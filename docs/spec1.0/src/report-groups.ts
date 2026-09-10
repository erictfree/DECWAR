import { FEDERATION_SHIPS, EMPIRE_SHIPS } from "./model.ts";
import type { Team } from "./model.ts";
import type { AggregateGroup, ReportKind } from "./report-selection.ts";

export type ReportCommand = "LIST" | "SUMMARY" | "BASES" | "PLANETS" | "TARGETS";
const allSides: AggregateGroup["sides"] = ["FEDERATION", "EMPIRE", "NEUTRAL", "ROMULAN"];
const keywords = ["SHIPS", "BASES", "PLANETS", "PORTS", "FRIENDLY", "ENEMY", "TARGETS",
  "FEDERATION", "HUMAN", "EMPIRE", "KLINGON", "NEUTRAL", "CAPTURED", "ALL", "CLOSEST", "LIST", "SUMMARY"];
const roster = [...FEDERATION_SHIPS, ...EMPIRE_SHIPS, "ROMULAN"];

export function reportWord(command: ReportCommand, word: string) {
  if (word === "&" || (word && "AND".startsWith(word))) return { kind: "SEPARATOR", value: "AND" };
  if (command === "LIST" || command === "TARGETS") {
    const name = roster.find(name => word && name.startsWith(word));
    if (name) return { kind: "NAME", value: name };
  }
  const value = keywords.find(key => {
    if (!word || !key.startsWith(word)) return false;
    if (["SHIPS", "BASES", "PLANETS", "PORTS"].includes(key)) return !["BASES", "PLANETS"].includes(command);
    if (["FRIENDLY", "ENEMY", "TARGETS", "FEDERATION", "HUMAN", "EMPIRE", "KLINGON"].includes(key)) return command !== "TARGETS";
    if (["NEUTRAL", "CAPTURED"].includes(key)) return command !== "BASES" && command !== "TARGETS";
    if (key === "CLOSEST" || key === "SUMMARY") return command !== "SUMMARY";
    if (key === "LIST") return command !== "SUMMARY" && command !== "LIST";
    return true;
  });
  return { kind: value ? "KEYWORD" : "UNKNOWN", value: value ?? word };
}

function defaults(command: ReportCommand, team: Team): AggregateGroup {
  return { kinds: command === "BASES" ? ["BASE"] : command === "PLANETS" ? ["PLANET"] : ["SHIP", "BASE", "PLANET"],
    sides: command === "BASES" ? [team] : command === "TARGETS"
      ? [team === "FEDERATION" ? "EMPIRE" : "FEDERATION", "ROMULAN"]
      : command === "PLANETS" ? ["FEDERATION", "EMPIRE", "NEUTRAL"] : [...allSides],
    radius: command === "PLANETS" || command === "TARGETS" ? 10 : 100,
    explicitRadius: false, detail: command !== "SUMMARY",
    summary: command === "SUMMARY" || command === "BASES" };
}

// Sections 4.9/7.10: ordered ordinary aggregate groups, from normalized tokens.
// 100 denotes whole-galaxy extent in this companion, not a new game constant.
// Direct names/coordinates are identified but not evaluated here.
export function parseAggregateGroups(command: ReportCommand, team: Team, tokens: string[]) {
  const groups: AggregateGroup[] = [];
  let group = defaults(command, team), seen = new Set<string>(), items = 0;
  const error = (token: string, illegal = false) => ({ groups,
    error: (illegal ? "Illegal keyword " : "Syntax error near keyword ") + token + "\n" });
  const finish = () => { groups.push(group); group = defaults(command, team); seen = new Set(); items = 0; };
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (/^[+-]?\d+$/.test(token)) {
      if (index + 1 < tokens.length && /^[+-]?\d+$/.test(tokens[index + 1]))
        throw new Error("direct coordinate group requires separate evaluation");
      if (!Number.isSafeInteger(Number(token))) throw new Error("large-integer companion domain exceeded; see C-008");
      if (seen.has("RANGE") || Number(token) < 1) return error(token);
      seen.add("RANGE"); group.radius = Number(token); group.explicitRadius = true; items++; continue;
    }
    const lookup = reportWord(command, token);
    if (lookup.kind === "SEPARATOR") {
      if (!items && groups.length) return { groups, error: "Null group illegal\n" };
      finish(); continue;
    }
    if (lookup.kind === "NAME") throw new Error("named group requires separate evaluation");
    if (lookup.kind === "UNKNOWN") return error(token, true);
    const key = lookup.value;
    items++;
    if (key === "CLOSEST") {
      if (seen.has("CLOSEST") || seen.has("OUTPUT")) return error(token);
      seen.add("CLOSEST"); group.closest = true;
      group.detail = true; group.summary = false;
      if (!group.explicitRadius) group.radius = 100;
      continue;
    }
    if (["SHIPS", "BASES", "PLANETS", "PORTS"].includes(key)) {
      if (seen.has("OBJECT") || (["SHIPS", "BASES"].includes(key) && (seen.has("NEUTRAL") || seen.has("CAPTURED")))) return error(token);
      seen.add("OBJECT");
      if (key === "PORTS") {
        if (!seen.has("NEUTRAL")) group.kinds = ["BASE", "PLANET"];
        if (!seen.has("SIDE")) group.sides = [team, "NEUTRAL"];
        group.sides = group.sides.filter(s => s !== "ROMULAN");
      } else {
        const kind: ReportKind = key === "SHIPS" ? "SHIP" : key === "BASES" ? "BASE" : "PLANET";
        group.kinds = [kind];
        group.sides = group.sides.filter(s => s !== (kind === "PLANET" ? "ROMULAN" : "NEUTRAL")
          && !(kind === "BASE" && s === "ROMULAN"));
      }
      seen.add(key); continue;
    }
    if (key === "ALL") {
      if (seen.has("ALL")) return error(token);
      seen.add("ALL");
      if (!seen.has("SIDE") && command !== "TARGETS") group.sides = [...allSides];
      if (!group.explicitRadius) group.radius = 100;
      continue;
    }
    if (key === "LIST" || key === "SUMMARY") {
      if (seen.has("OUTPUT") || seen.has("CLOSEST")) return error(token);
      seen.add("OUTPUT");
      group.detail = key === "LIST" || command === "LIST";
      group.summary = key === "SUMMARY";
      if (key === "SUMMARY" && !group.explicitRadius) group.radius = 100;
      continue;
    }
    if (seen.has("SIDE")) return error(token);
    if ((key === "NEUTRAL" || key === "CAPTURED") && seen.has("OBJECT") && !seen.has("PLANETS")) return error(token);
    seen.add("SIDE"); seen.add(key);
    if (key === "NEUTRAL" || key === "CAPTURED") {
      group.kinds = ["PLANET"];
      group.sides = key === "NEUTRAL" ? ["NEUTRAL"] : ["FEDERATION", "EMPIRE"];
    } else {
      const side = key === "FRIENDLY" ? team : key === "ENEMY" || key === "TARGETS"
        ? team === "FEDERATION" ? "EMPIRE" : "FEDERATION"
        : key === "FEDERATION" || key === "HUMAN" ? "FEDERATION" : "EMPIRE";
      const romulan = key === "ENEMY" || key === "TARGETS" || (key !== "FRIENDLY" && group.sides.includes("ROMULAN"));
      group.sides = romulan ? [side, "ROMULAN"] : [side];
    }
  }
  if (!items && groups.length) return { groups, error: "Null group illegal\n" };
  finish();
  return { groups, error: null };
}
