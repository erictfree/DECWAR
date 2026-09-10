import type { Galaxy, ShipName } from "./model.ts";
import { pointsReport } from "./points-report.ts";
import type { PointsSubject } from "./points-report.ts";

// Tokenized ordinary POINTS selection. Non-word stopping follows the observed
// C-010 path for review; raw input and C-013 zero denominators remain separate.
export function pointsCommand(galaxy: Pick<Galaxy,"ships"|"teams"|"romulan">,
  issuer: ShipName | null, operands: readonly (string | number)[],
  length: "SHORT" | "MEDIUM" | "LONG"): string {
  const ship = issuer === null ? null : galaxy.ships.find(s=>s.name===issuer);
  if (issuer !== null && (!ship || ship.lifecycle.phase === "AVAILABLE"))
    throw new Error("current commission required");
  const selected = new Set<PointsSubject["subject"]>();
  const all = () => {
    if (ship) selected.add("PERSONAL");
    selected.add("FEDERATION"); selected.add("EMPIRE"); selected.add("ROMULANS");
  };
  const fail = () => "\nIncorrect input, POINTS aborted.\n";
  if (!operands.length) { if (ship) selected.add("PERSONAL"); else all(); }
  for (const token of operands) {
    if (typeof token !== "string" || !/^[a-z]+$/i.test(token)) break;
    const word=token.toUpperCase();
    const matches=(...names:string[])=>names.some(n=>n.startsWith(word));
    if (ship && matches("ME","I")) selected.add("PERSONAL");
    else if (matches("FEDERATION","HUMANS")) selected.add("FEDERATION");
    else if (matches("EMPIRE","KLINGONS")) selected.add("EMPIRE");
    else if (matches("ROMULANS")) selected.add("ROMULANS");
    else if (matches("ALL")) all();
    else return fail();
  }
  if (!galaxy.romulan.enabled) selected.delete("ROMULANS");
  if (!selected.size) return fail();
  const subjects: PointsSubject[]=[];
  if (selected.has("PERSONAL") && ship) subjects.push({subject:"PERSONAL",name:ship.name,score:ship.score,turns:ship.stardate});
  for (const team of ["FEDERATION","EMPIRE"] as const) if (selected.has(team)) {
    const state=galaxy.teams[team];
    subjects.push({subject:team,score:state.score,turns:state.completedTurns,admissions:state.admissions});
  }
  if (selected.has("ROMULANS") && galaxy.romulan.enabled) {
    const stats=galaxy.romulan.statistics;
    subjects.push({subject:"ROMULANS",score:stats.score,turns:stats.activityCount,admissions:stats.appearances});
  }
  return pointsReport(subjects,length);
}
